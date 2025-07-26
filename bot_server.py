# bot_server.py
# Серверная часть для Telegram-бота TerraRun

import logging
import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, InlineQueryResultArticle, InputTextMessageContent
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, InlineQueryHandler
from supabase import create_client, Client
import uuid

# --- Настройка логирования ---
# Включаем логирование, чтобы видеть ошибки и информацию о работе бота в консоли
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# --- Конфигурация ---
# Получаем токен бота и ключи для Supabase из переменных окружения.
# Это безопасный способ хранить ваши секретные данные.
# Перед запуском, установите эти переменные в вашей системе:
# export TELEGRAM_TOKEN="8203577700:AAHBPcxw4y5kT4trl_bfZY4QRBQ99Q0S2E8"
# export SUPABASE_URL="https://jsnahjtoqwuwbjdmisuj.supabase.co"
# export SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbmFoanRvcXd1d2JqZG1pc3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzOTQxMDQsImV4cCI6MjA2ODk3MDEwNH0.M3TWsNJppj1f-Cmj6nGCAUswy1HZgBLW8yJZfTwkrpI"

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
MINI_APP_URL = "https://t.me/TerraRunBot/app" # Убедитесь, что имя вашего бота здесь верное

# Проверяем, что все необходимые переменные заданы
if not all([TELEGRAM_TOKEN, SUPABASE_URL, SUPABASE_KEY]):
    raise ValueError("Ошибка: Не заданы переменные окружения TELEGRAM_TOKEN, SUPABASE_URL или SUPABASE_KEY")

# --- Инициализация Supabase ---
# Создаем клиент для подключения к вашей базе данных Supabase
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("Успешное подключение к Supabase.")
except Exception as e:
    logger.error(f"Ошибка подключения к Supabase: {e}")
    exit(1)


# --- Обработчики команд ---

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /start. Приветствует пользователя и предлагает открыть Mini App."""
    user = update.effective_user
    user_id = user.id
    first_name = user.first_name

    logger.info(f"Пользователь {first_name} (ID: {user_id}) запустил бота.")

    # Проверяем, есть ли пользователь в нашей базе данных, и если нет - добавляем его.
    try:
        # Пытаемся найти пользователя по ID
        response = supabase.table("profiles").select("id").eq("id", user_id).execute()
        
        # Если данных нет, создаем нового пользователя
        if not response.data:
            logger.info(f"Создание нового профиля для пользователя {first_name} (ID: {user_id}).")
            # Генерация уникального цвета для нового пользователя
            color_hash = hash(str(user_id)) % 360
            user_color = f"hsl({color_hash}, 80%, 65%)"

            insert_response = supabase.table("profiles").insert({
                "id": user_id,
                "name": first_name,
                "photo_url": user.photo_url if hasattr(user, 'photo_url') else None,
                "color": user_color,
                "area": 0
            }).execute()
            if insert_response.data:
                 logger.info(f"Профиль для {first_name} успешно создан.")
            else:
                 logger.error(f"Не удалось создать профиль для {first_name}.")

    except Exception as e:
        logger.error(f"Ошибка при работе с профилем пользователя {first_name} в Supabase: {e}")

    # Создаем кнопку, которая открывает наше веб-приложение
    keyboard = [
        [InlineKeyboardButton("🚀 Открыть приложение TerraRun", web_app={"url": MINI_APP_URL})],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    # Отправляем приветственное сообщение
    await update.message.reply_html(
        rf"Привет, {user.mention_html()}! Добро пожаловать в TerraRun. "
        "Готовы захватывать территории? Нажмите кнопку ниже, чтобы начать!",
        reply_markup=reply_markup,
    )


async def location(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обрабатывает получение геолокации (включая Live Location)."""
    message = update.edited_message if update.edited_message else update.message
    if not message or not message.location:
        return

    user_id = message.from_user.id
    user_location = message.location
    lat = user_location.latitude
    lon = user_location.longitude
    
    logger.info(f"Получена геолокация от пользователя ID {user_id}: lat={lat}, lon={lon}")

    # Создаем GeoJSON объект для сохранения в Supabase
    # Supabase может работать с PostGIS, но для простоты сохраним как JSON
    last_location_geojson = {
        "type": "Point",
        "coordinates": [lon, lat]
    }

    try:
        # Обновляем поле last_known_location в профиле пользователя
        response = supabase.table("profiles").update({
            "last_known_location": last_location_geojson,
            "updated_at": "now()" # Обновляем время последнего обновления
        }).eq("id", user_id).execute()
        
        if response.data:
            logger.info(f"Геолокация для пользователя ID {user_id} успешно обновлена.")
        else:
            # Это может случиться, если пользователь начал отправлять гео до команды /start
            logger.warning(f"Профиль для пользователя ID {user_id} не найден. Обновление геолокации не выполнено.")

    except Exception as e:
        logger.error(f"Ошибка обновления геолокации для пользователя ID {user_id}: {e}")

async def inline_query(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обрабатывает инлайн-запросы для шаринга профилей."""
    query = update.inline_query.query

    if not query.startswith("user_"):
        return

    try:
        user_id_to_find = int(query.split("_")[1])
        
        # Ищем пользователя в базе данных
        response = supabase.table("profiles").select("*").eq("id", user_id_to_find).single().execute()
        profile = response.data

        if not profile:
            return

        area = profile.get('area', 0)
        formatted_area = f"{(area / 1000000):.2f} км²" if area > 10000 else f"{round(area)} м²"
        
        title = f"Профиль {profile['name']} в TerraRun"
        description = f"Захваченная территория: {formatted_area}"
        
        # Создаем кнопку для перехода в приложение
        keyboard = [[InlineKeyboardButton("🚀 Посмотреть в TerraRun", url=f"{MINI_APP_URL}?startapp=user{profile['id']}")]]
        reply_markup = InlineKeyboardMarkup(keyboard)

        result = InlineQueryResultArticle(
            id=str(uuid.uuid4()),
            title=title,
            description=description,
            input_message_content=InputTextMessageContent(
                f"🌍 Посмотрите, чего достиг(ла) {profile['name']} в TerraRun! Его/ее территория составляет {formatted_area}."
            ),
            reply_markup=reply_markup,
            thumbnail_url=profile.get('photo_url') or "https://placehold.co/100x100/3b82f6/ffffff?text=TR"
        )
        
        await update.inline_query.answer([result], cache_time=5)

    except (ValueError, IndexError, Exception) as e:
        logger.error(f"Ошибка в инлайн-запросе: {e}")


def main() -> None:
    """Основная функция запуска бота."""
    # Создаем экземпляр приложения
    application = Application.builder().token(TELEGRAM_TOKEN).build()

    # Добавляем обработчики
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.LOCATION, location))
    application.add_handler(InlineQueryHandler(inline_query))

    logger.info("Бот запускается...")
    # Запускаем бота (в режиме поллинга для простоты, для продакшена лучше использовать вебхуки)
    application.run_polling()


if __name__ == "__main__":
    main()

// --- НЕОБХОДИМЫЕ БИБЛИОТЕКИ ---
// Перед запуском выполните в терминале:
// npm install express node-telegram-bot-api dotenv

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config(); // Для безопасного хранения токена

// --- КОНФИГУРАЦИЯ ---

// ВАЖНО: Никогда не вписывайте токен прямо в код.
// Создайте рядом с этим файлом файл с названием .env
// и напишите внутри него: TELEGRAM_BOT_TOKEN=ВАШ_ТОКЕН_СЮДА
const token = 8203577700:AAHBPcxw4y5kT4trl_bfZY4QRBQ99Q0S2E8
if (!token) {
    console.error("Ошибка: Токен бота не найден. Создайте .env файл и добавьте TELEGRAM_BOT_TOKEN.");
    process.exit(1);
}

// ВАЖНО: Укажите здесь публичный URL вашего сервера.
// Telegram будет отправлять обновления на этот адрес.
// Например: https://your-app-name.onrender.com
const serverUrl = process.env.SERVER_URL; 
const bot = new TelegramBot(token);

// ВАЖНО: Укажите здесь имя пользователя вашего бота (без @)
const botUsername = 'YourBotUsername'; // Например, 'TerraRunBot'

// Настраиваем вебхук. Telegram будет присылать обновления сюда, а не через getUpdates.
// Это более эффективно для продакшена.
bot.setWebHook(`${serverUrl}/bot${token}`);

const app = express();
app.use(express.json()); // Для парсинга JSON-запросов

// --- ЛОГИКА БОТА ---

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const text = "Добро пожаловать в TerraRun! Готовы захватывать территории?";

    // Создаем кнопку, которая будет открывать ваше веб-приложение
    const keyboard = {
        inline_keyboard: [
            [{
                text: '🚀 Открыть карту и начать!',
                web_app: { url: `https://t.me/${TerraRunbot}/app` } // URL вашего Web App
            }]
        ]
    };

    bot.sendMessage(chatId, text, {
        reply_markup: keyboard,
    });
});

// Обработчик всех входящих сообщений от Telegram (через вебхук)
app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});


// --- API ДЛЯ ВЗАИМОДЕЙСТВИЯ С ФРОНТЕНДОМ (Пример) ---
// Вы можете расширить этот API для более сложной логики.
// Например, для проверки данных, начисления наград и т.д.

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});


// --- ЗАПУСК СЕРВЕРА ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Вебхук для бота настроен на: ${serverUrl}/bot${token}`);
    console.log(`Приложение доступно по адресу: https://t.me/${botUsername}/app`);
});

// --- Обработка ошибок бота ---
bot.on('webhook_error', (error) => {
  console.error('Webhook Error:', error.code); 
});

bot.on('polling_error', (error) => {
  console.error('Polling Error:', error.code);
});

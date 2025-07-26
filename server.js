// --- НЕОБХОДИМЫЕ БИБЛИОТЕКИ ---
// Перед запуском выполните в терминале:
// npm install express node-telegram-bot-api

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

// --- КОНФИГУРАЦИЯ ---

// Токен вашего Telegram бота
const token = '8203577700:AAHBPcxw4y5kT4trl_bfZY4QRBQ99Q0S2E8';

// Имя пользователя вашего бота (без @)
const botUsername = 'TerraRunbot';

// ВАЖНО: Укажите здесь публичный URL вашего сервера.
// Telegram будет отправлять обновления на этот адрес.
// Например: https://your-app-name.onrender.com или IP вашего сервера.
const serverUrl = 'https://djfhdsjf-8baf.vercel.app'; // <--- ЗАМЕНИТЕ ЭТОТ АДРЕС!

// Проверка, что URL сервера был изменен
if (serverUrl === 'https://YOUR_SERVER_URL_HERE') {
    console.error("-------------------------------------------------------------------");
    console.error("ОШИБКА: Пожалуйста, замените 'https://YOUR_SERVER_URL_HERE' на");
    console.error("реальный публичный URL вашего сервера в коде.");
    console.error("-------------------------------------------------------------------");
    process.exit(1);
}

const bot = new TelegramBot(token);

// Настраиваем вебхук. Telegram будет присылать обновления сюда.
// Это более эффективно для продакшена, чем постоянные запросы.
bot.setWebHook(`${serverUrl}/bot${token}`);

const app = express();
// Middleware для парсинга JSON-тела запросов от Telegram
app.use(express.json());

// --- ЛОГИКА БОТА ---

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const text = "Добро пожаловать в TerraRun! Готовы захватывать территории?";

    // Создаем кнопку, которая будет открывать ваше веб-приложение (Web App)
    const keyboard = {
        inline_keyboard: [
            [{
                text: '🚀 Открыть карту и начать!',
                // URL должен вести на специальную страницу запуска вашего Web App в Telegram
                web_app: { url: `https://t.me/${botUsername}/app` }
            }]
        ]
    };

    bot.sendMessage(chatId, text, {
        reply_markup: keyboard,
    });
});

// Обработчик всех входящих обновлений от Telegram (через вебхук)
// Telegram будет отправлять POST-запросы на этот URL
app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200); // Отвечаем Telegram, что все в порядке
});


// --- API ДЛЯ ВЗАИМОДЕЙСТВИЯ С ФРОНТЕНДОМ (Пример) ---
// Этот эндпоинт можно использовать для проверки, что сервер работает
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});


// --- ЗАПУСК СЕРВЕРА ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер успешно запущен на порту ${PORT}`);
    console.log(`Вебхук для бота настроен на: ${serverUrl}/bot${token}`);
    console.log(`Ваше приложение должно быть доступно по адресу: https://t.me/${botUsername}/app`);
});

// --- Обработка ошибок бота ---
bot.on('webhook_error', (error) => {
  console.error('Webhook Error:', error.code);  // Например, 'EPARSE'
});

bot.on('polling_error', (error) => {
  console.error('Polling Error:', error.code); // Например, 'EFATAL'
});

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

// ВАЖНО: Укажите здесь публичный URL вашего Vercel-приложения.
// Вы получите его после первого развертывания.
// Например: https://your-app-name.vercel.app
const serverUrl = 'https://djfhdsjf.vercel.app'; // <--- ЗАМЕНИТЕ ЭТОТ АДРЕС!

// Проверка, что URL сервера был изменен
if (serverUrl.includes('YOUR_SERVER_URL_HERE')) {
    console.error("ОШИБКА: Замените 'YOUR_SERVER_URL_HERE' на реальный URL вашего Vercel-приложения.");
    process.exit(1);
}

const bot = new TelegramBot(token);
const app = express();

// Middleware для парсинга JSON-тела запросов от Telegram
app.use(express.json());

// --- ЛОГИКА БОТА ---

// ЭТОТ ЭНДПОИНТ НУЖНО ВЫЗВАТЬ ОДИН РАЗ ПОСЛЕ РАЗВЕРТЫВАНИЯ
// Просто откройте в браузере https://<ваш-домен>.vercel.app/api/set-webhook
app.get('/api/set-webhook', async (req, res) => {
    try {
        const webhookUrl = `${serverUrl}/api/bot${token}`;
        await bot.setWebHook(webhookUrl);
        res.status(200).json({ status: 'success', message: `Webhook установлен на ${webhookUrl}` });
    } catch (error) {
        console.error('Ошибка установки вебхука:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const text = "Добро пожаловать в TerraRun! Готовы захватывать территории?";
    const keyboard = {
        inline_keyboard: [
            [{
                text: '🚀 Открыть карту и начать!',
                web_app: { url: `https://t.me/${botUsername}/app` }
            }]
        ]
    };
    bot.sendMessage(chatId, text, { reply_markup: keyboard });
});

// Основной обработчик для входящих обновлений от Telegram
// Vercel будет направлять запросы с /api/bot<TOKEN> сюда
app.post(`/api/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200); // Отвечаем Telegram, что все в порядке
});

// Эндпоинт для проверки работоспособности
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running on Vercel' });
});

// --- Обработка ошибок бота ---
bot.on('webhook_error', (error) => {
  console.error('Webhook Error:', error.code);
});

bot.on('polling_error', (error) => {
  console.error('Polling Error:', error.code);
});

// --- ЭКСПОРТ ДЛЯ VERCEL ---
// Вместо app.listen() мы экспортируем приложение.
// Vercel автоматически подхватит его и создаст бессерверную функцию.
module.exports = app;

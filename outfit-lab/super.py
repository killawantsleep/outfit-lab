from telegram import Bot, MenuButtonWebApp, WebAppInfo
from telethon import TelegramClient, events
import asyncio

# Ваши данные из Telegram API
api_id = 'ВАШ_API_ID'  # Получите на https://my.telegram.org
api_hash = 'ВАШ_API_HASH'  # Получите на https://my.telegram.org
bot_token = 'ВАШ_ТОКЕН_БОТА'  # Токен от @BotFather
channel_id = ID_ВАШЕГО_КАНАЛА  # Замените на ID вашего канала

# Установите кнопку "Открыть каталог"
async def set_menu_button():
    bot = Bot(token=bot_token)
    await bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(
            text="Открыть каталог",
            web_app=WebAppInfo(url="https://killawantsleep.github.io/outfit-lab/")  # Укажите URL вашего веб-приложения
        )
    )

# Создаем клиента Telethon
client = TelegramClient('session_name', api_id, api_hash)

# Функция для обработки новых сообщений
@client.on(events.NewMessage)
async def handler(event):
    # Проверяем, что сообщение из нужного канала
    if event.chat_id == channel_id:
        message_text = event.message.text
        print(f"Новое сообщение: {message_text}")
        # Здесь можно сохранить сообщение в базу данных

# Запуск клиента Telethon и установка кнопки меню
async def main():
    # Устанавливаем кнопку меню
    await set_menu_button()
    print("Кнопка меню установлена!")

    # Запускаем Telethon клиента
    await client.start(bot_token=bot_token)
    print("Бот запущен и слушает сообщения...")
    await client.run_until_disconnected()

# Запуск
if __name__ == "__main__":
    asyncio.run(main())
from telegram import Bot, MenuButtonWebApp, WebAppInfo

# Установите кнопку "Открыть каталог"
async def set_menu_button():
    bot = Bot(token="ВАШ_ТОКЕН_БОТА")
    await bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(
            text="Открыть каталог",
            web_app=WebAppInfo(url="https://ваш-сайт.com")  # Укажите URL вашего веб-приложения
        )
    )

# Вызовите функцию для установки кнопки
import asyncio
asyncio.run(set_menu_button())
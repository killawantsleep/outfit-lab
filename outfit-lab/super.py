from telegram import Bot, MenuButtonWebApp, WebAppInfo

# Установите кнопку "Открыть каталог"
async def set_menu_button():
    bot = Bot(token="7717029640:AAEeBFBzeAPPGco2cxTBQAIhZXXq7aWuanM")
    await bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(
            text="Открыть каталог",
            web_app=WebAppInfo(url="https://killawantsleep.github.io/outfit-lab/")  # Укажите URL вашего веб-приложения
        )
    )

# Вызовите функцию для установки кнопки
import asyncio
asyncio.run(set_menu_button())
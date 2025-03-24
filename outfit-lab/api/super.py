import os
import telebot
import requests
import logging
from dotenv import load_dotenv

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Загрузка конфига
load_dotenv()
bot = telebot.TeleBot(os.getenv("BOT_TOKEN"))
GOOGLE_SCRIPT_URL = os.getenv("GOOGLE_SCRIPT_URL")
FRONTEND_URL = "https://killawantsleep.github.io/outfit-lab/"  # Замените на ваш GitHub Pages URL

@bot.message_handler(commands=['start'])
def start(message):
    bot.reply_to(
        message,
        "🛍️ Отправьте товар через /additem\n"
        "Формат: Фото + подпись\n"
        "Пример: Футболка Gucci | 5990 | M"
    )

@bot.message_handler(commands=['additem'])
def add_item(message):
    msg = bot.send_message(
        message.chat.id,
        "📤 Отправьте ФОТО + подпись в формате:\n"
        "Название | Цена | Размер\n"
        "Пример: Футболка Gucci | 5990 | M"
    )
    bot.register_next_step_handler(msg, process_item)

def process_item(message):
    try:
        if not message.photo:
            raise ValueError("❌ Нужно отправить фото!")

        parts = message.caption.split('|')
        if len(parts) != 3:
            raise ValueError("❌ Неверный формат. Используйте: Название | Цена | Размер")

        name, price, size = [part.strip() for part in parts]
        if not price.isdigit():
            raise ValueError("❌ Цена должна быть числом (например: 5990)")

        # Загрузка фото
        file_info = bot.get_file(message.photo[-1].file_id)
        image_url = f"https://api.telegram.org/file/bot{bot.token}/{file_info.file_path}"

        # Отправка в Google Sheets
        response = requests.post(
            GOOGLE_SCRIPT_URL,
            json={
                'name': name,
                'price': price,
                'size': size,
                'image': image_url
            }
        )

        if response.status_code == 200:
            # Принудительно обновляем фронтенд
            requests.get(f"{FRONTEND_URL}?force_update=1")  # Триггер обновления
            bot.reply_to(message, f"✅ Товар добавлен!\n{name}")
        else:
            bot.reply_to(message, f"⚠️ Ошибка: {response.text}")

    except Exception as e:
        logger.error(f"Ошибка: {str(e)}")
        bot.reply_to(message, f"❌ Ошибка: {str(e)}")

if __name__ == '__main__':
    logger.info("Бот запущен...")
    bot.polling()
import os
import telebot
import requests
from dotenv import load_dotenv

load_dotenv()
bot = telebot.TeleBot(os.getenv("7717029640:AAEeBFBzeAPPGco2cxTBQAIhZXXq7aWuanM"))
GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzI9zOhivLi4RClLlDkl7xqOQEIlWLUOIldaVwGZzOFgcG50AwFBsyfDQ2W7twPRp59eA/exec"

@bot.message_handler(commands=['start'])
def start(message):
    bot.reply_to(message, "📲 Отправьте товары через /additem")

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
            raise ValueError("Нужно отправить фото!")
        
        name, price, size = message.caption.split('|')
        file_info = bot.get_file(message.photo[-1].file_id)
        image_url = f"https://api.telegram.org/file/bot{bot.token}/{file_info.file_path}"

        # Отправка в Google Sheets
        response = requests.post(
            GOOGLE_SCRIPT_URL,
            json={
                'action': 'add',
                'name': name.strip(),
                'price': price.strip(),
                'size': size.strip(),
                'image': image_url
            }
        )

        if response.status_code == 200:
            bot.reply_to(message, f"✅ Товар добавлен!\n{name.strip()}")
        else:
            bot.reply_to(message, f"⚠️ Ошибка: {response.text}")

    except Exception as e:
        bot.reply_to(message, f"❌ Ошибка: {str(e)}")

if __name__ == '__main__':
    print("Бот запущен...")
    bot.polling()
import os
import telebot
import requests
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton
from dotenv import load_dotenv

load_dotenv()
bot = telebot.TeleBot(os.getenv("BOT_TOKEN"))
GOOGLE_SCRIPT_URL = os.getenv("GOOGLE_SCRIPT_URL")
ADMINS = [5000931101]  # Ваш ID

# Кэш последних товаров
last_items_cache = []

@bot.message_handler(commands=['start'])
def start(message):
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("🛍️ Открыть магазин", 
              url=f"https://t.me/{bot.get_me().username}?startapp=outfitlab"))
    
    bot.send_message(
        message.chat.id,
        "👋 Добро пожаловать в OUTFIT LAB!\nТовары обновляются автоматически.",
        reply_markup=markup
    )

@bot.message_handler(commands=['additem'])
def add_item(message):
    if message.from_user.id not in ADMINS:
        return bot.reply_to(message, "❌ Только для админов")

    msg = bot.send_message(message.chat.id, 
                         "Отправьте фото + подпись в формате:\nНазвание | Цена | Размер")
    bot.register_next_step_handler(msg, process_item)

def process_item(message):
    try:
        if not message.photo:
            raise ValueError("Нужно фото!")

        name, price, size = map(str.strip, message.caption.split('|'))
        if not price.isdigit():
            raise ValueError("Цена должна быть числом")

        file_info = bot.get_file(message.photo[-1].file_id)
        image_url = f"https://api.telegram.org/file/bot{bot.token}/{file_info.file_path}"

        # 1. Отправляем в Google Sheets
        requests.post(GOOGLE_SCRIPT_URL, json={
            'name': name,
            'price': price,
            'size': size,
            'image': image_url
        })

        # 2. Добавляем в кэш
        last_items_cache.append({
            'name': name,
            'price': price,
            'size': size,
            'image': image_url
        })

        # 3. Уведомляем пользователя
        bot.reply_to(message, f"✅ {name} добавлен!")

    except Exception as e:
        bot.reply_to(message, f"❌ Ошибка: {str(e)}")

if __name__ == '__main__':
    print("Бот запущен...")
    bot.polling()
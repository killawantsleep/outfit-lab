import os
import telebot
import requests
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton
from dotenv import load_dotenv

load_dotenv()

bot = telebot.TeleBot(os.getenv("BOT_TOKEN"))
GOOGLE_SCRIPT_URL = os.getenv("GOOGLE_SCRIPT_URL")
FRONTEND_URL = "https://ваш-username.github.io/ваш-репозиторий"  # Замените на ваш URL

# Список ID администраторов (замените на свои)
ADMINS = [123456789, 987654321]  # Пример ID

@bot.message_handler(commands=['start'])
def start(message):
    # Создаем кнопку
    markup = InlineKeyboardMarkup()
    button = InlineKeyboardButton("🛍️ Перейти в магазин", url=FRONTEND_URL)
    markup.add(button)
    
    # Приветственное сообщение
    bot.send_message(
        message.chat.id,
        "👋 *Добро пожаловать в OUTFIT LAB BOT!*\n\n"
        "Здесь вы можете купить эксклюзивные вещи от лучших брендов.\n"
        "Нажмите кнопку ниже, чтобы перейти в каталог:",
        parse_mode='Markdown',
        reply_markup=markup
    )

@bot.message_handler(commands=['additem'])
def add_item(message):
    # Проверка админского доступа
    if message.from_user.id not in ADMINS:
        bot.reply_to(message, "⛔ У вас нет прав на эту команду!")
        return

    msg = bot.send_message(
        message.chat.id,
        "📤 *Отправьте ФОТО + подпись в формате:*\n"
        "Название | Цена | Размер\n"
        "Пример: _Футболка Gucci | 5990 | M_",
        parse_mode='Markdown'
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
            bot.reply_to(message, f"✅ Товар добавлен!\n*{name}*", parse_mode='Markdown')
        else:
            bot.reply_to(message, f"⚠️ Ошибка: {response.text}")

    except Exception as e:
        bot.reply_to(message, f"❌ Ошибка: {str(e)}")

if __name__ == '__main__':
    print("Бот запущен...")
    bot.polling()
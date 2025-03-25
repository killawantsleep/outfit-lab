import os
import json
import telebot
import requests
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from dotenv import load_dotenv

load_dotenv()
bot = telebot.TeleBot(os.getenv("BOT_TOKEN"))
GOOGLE_SCRIPT_URL = os.getenv("GOOGLE_SCRIPT_URL")
ADMINS = [5000931101]  # Ваш ID
WEB_APP_URL = "https://killawantsleep.github.io/outfit-lab/"

@bot.message_handler(commands=['start'])
def start(message):
    try:
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton(
            "🛍️ Открыть магазин", 
            web_app=WebAppInfo(url=WEB_APP_URL)
        ))
        
        bot.send_message(
            message.chat.id,
            "👋 Добро пожаловать в OUTFIT LAB!\nТовары обновляются автоматически.",
            reply_markup=markup
        )
    except Exception as e:
        print(f"Ошибка в команде /start: {str(e)}")
        bot.reply_to(message, "👋 Добро пожаловать в OUTFIT LAB!\nТовары обновляются автоматительно.")

@bot.message_handler(commands=['additem'])
def add_item(message):
    if message.from_user.id not in ADMINS:
        return bot.reply_to(message, "❌ Только для админов")

    try:
        msg = bot.send_message(
            message.chat.id,
            "📤 Отправьте фото товара с подписью в формате:\n"
            "<b>Название | Цена | Размер</b>\n\n"
            "Пример: <i>Футболка премиум | 1990 | XL</i>",
            parse_mode="HTML"
        )
        bot.register_next_step_handler(msg, process_item)
    except Exception as e:
        print(f"Ошибка в команде /additem: {str(e)}")
        bot.reply_to(message, "❌ Произошла ошибка, попробуйте снова")

def process_item(message):
    try:
        if not message.photo:
            raise ValueError("❌ Требуется фото товара")
        
        if not message.caption:
            raise ValueError("❌ Требуется описание товара")
        
        parts = [p.strip() for p in message.caption.split('|')]
        if len(parts) < 3:
            raise ValueError("❌ Неверный формат. Используйте: Название | Цена | Размер")
        
        name, price, size = parts[:3]
        
        try:
            price = float(price.replace(',', '.'))
            if price <= 0:
                raise ValueError("Цена должна быть больше нуля")
        except ValueError:
            raise ValueError("❌ Некорректная цена. Используйте числа")
        
        file_info = bot.get_file(message.photo[-1].file_id)
        image_url = f"https://api.telegram.org/file/bot{bot.token}/{file_info.file_path}"
        
        response = requests.post(
            GOOGLE_SCRIPT_URL,
            json={
                'name': name,
                'price': price,
                'image': image_url,
                'size': size
            },
            timeout=10
        )
        
        if response.status_code != 200:
            raise ValueError(f"❌ Ошибка сохранения: {response.text}")
        
        bot.reply_to(
            message,
            f"✅ <b>{name}</b> успешно добавлен!\n"
            f"Цена: {price} ₽\n"
            f"Размер: {size}",
            parse_mode="HTML"
        )
        
    except Exception as e:
        bot.reply_to(message, str(e))
        print(f"Ошибка добавления товара: {str(e)}")

@bot.message_handler(content_types=['web_app_data'])
def handle_web_app_data(message):
    try:
        data = json.loads(message.web_app_data.data)
        
        if data.get('type') == 'new_order':
            # Отправляем заказ админу
            bot.send_message(
                ADMINS[0],
                data['order'],
                parse_mode='HTML'
            )
            
            # Подтверждаем пользователю
            bot.send_message(
                message.chat.id,
                "✅ Ваш заказ успешно оформлен!\n"
                "Мы свяжемся с вами в ближайшее время для подтверждения.",
                parse_mode='HTML',
                reply_markup=InlineKeyboardMarkup().add(
                    InlineKeyboardButton(
                        "🛍️ Вернуться в магазин", 
                        web_app=WebAppInfo(url=WEB_APP_URL))
                )
            )
    except Exception as e:
        print(f"Ошибка обработки web_app_data: {str(e)}")
        bot.send_message(message.chat.id, "⚠️ Произошла ошибка при оформлении заказа")

if __name__ == '__main__':
    print("Бот запущен...")
    try:
        bot.infinity_polling()
    except Exception as e:
        print(f"Ошибка в работе бота: {str(e)}")
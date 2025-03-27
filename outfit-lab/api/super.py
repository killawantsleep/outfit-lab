import os
import telebot
import json
import requests
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from dotenv import load_dotenv

load_dotenv()
bot = telebot.TeleBot(os.getenv("BOT_TOKEN"))
GOOGLE_SCRIPT_URL = os.getenv("GOOGLE_SCRIPT_URL")
ADMINS = [5000931101]  # Ваш ID
WEB_APP_URL = "https://killawantsleep.github.io/outfit-lab/"  # Ваш GitHub Pages URL

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

    msg = bot.send_message(
        message.chat.id,
        "📤 Отправьте фото товара с подписью в формате:\n"
        "<b>Название | Цена | Размер</b>\n\n"
        "Пример: <i>Футболка премиум | 1990 | XL</i>",
        parse_mode="HTML"
    )
    bot.register_next_step_handler(msg, process_item)

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
        
        if data.get('action') == 'new_order':
            # Отправляем заказ всем админам
            for admin_id in ADMINS:
                try:
                    # Отправляем основную информацию о заказе
                    bot.send_message(
                        admin_id,
                        data['order'],
                        parse_mode='HTML'
                    )
                    
                    # Создаем кнопку для быстрого ответа
                    markup = InlineKeyboardMarkup()
                    markup.add(InlineKeyboardButton(
                        "📞 Позвонить", 
                        url=f"tel:{data['user']['phone']}"
                    ))
                    markup.add(InlineKeyboardButton(
                        "✉️ Написать в Telegram", 
                        url=f"tg://user?id={message.from_user.id}"
                    ))
                    
                    # Отправляем контактные данные с кнопками
                    bot.send_message(
                        admin_id,
                        f"👤 <b>Контактные данные клиента:</b>\n"
                        f"├ Имя: {data['user']['name']}\n"
                        f"├ Телефон: {data['user']['phone']}\n"
                        f"└ Telegram: @{data['user']['telegram'].lstrip('@')}\n\n"
                        f"💰 <b>Сумма заказа:</b> {data['total']} ₽",
                        parse_mode='HTML',
                        reply_markup=markup
                    )
                    
                    # Отправляем детализацию заказа
                    order_details = "🛍 <b>Состав заказа:</b>\n" + "\n".join(
                        f"├ {item['name']} ({item.get('size', 'без размера')}) - {item['price']} ₽"
                        for item in data['cart']
                    )
                    
                    bot.send_message(
                        admin_id,
                        order_details,
                        parse_mode='HTML'
                    )
                    
                except Exception as e:
                    print(f"Ошибка отправки заказа админу {admin_id}: {str(e)}")
            
            # Подтверждаем заказ пользователю
            bot.reply_to(
                message,
                "✅ <b>Ваш заказ успешно оформлен!</b>\n\n"
                "С вами свяжется администратор для подтверждения заказа и уточнения деталей.\n\n"
                "ℹ️ <i>Если у вас есть вопросы, вы можете написать нам в Telegram.</i>",
                parse_mode='HTML'
            )
            
    except Exception as e:
        print(f"Ошибка обработки web_app_data: {str(e)}")
        bot.reply_to(
            message,
            "❌ <b>Произошла ошибка при оформлении заказа</b>\n\n"
            "Пожалуйста, попробуйте еще раз или свяжитесь с нами напрямую.",
            parse_mode='HTML'
        )

if __name__ == '__main__':
    print("Бот запущен...")
    bot.infinity_polling()
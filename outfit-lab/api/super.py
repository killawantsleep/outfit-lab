import os
import telebot
import json
import requests
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()

# Инициализация бота
bot = telebot.TeleBot(os.getenv("BOT_TOKEN"))

class Config:
    ADMINS = [5000931101]  # Ваш Telegram ID (убедитесь, что он правильный)
    WEB_APP_URL = "https://killawantsleep.github.io/outfit-lab/"
    DELIVERY_COST = 440
    LOG_CHAT_ID = None  # Опционально: ID чата для логов

def send_to_admins(message, parse_mode="HTML", reply_markup=None):
    """Отправляет сообщение всем администраторам"""
    for admin_id in Config.ADMINS:
        try:
            bot.send_message(
                admin_id,
                message,
                parse_mode=parse_mode,
                reply_markup=reply_markup,
                disable_web_page_preview=True
            )
        except Exception as e:
            print(f"Ошибка отправки сообщения админу {admin_id}: {str(e)}")

@bot.message_handler(commands=['start'])
def start(message):
    try:
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton(
            "🛍️ Открыть магазин", 
            web_app=WebAppInfo(url=Config.WEB_APP_URL)
        ))
        
        bot.send_message(
            message.chat.id,
            "👋 Добро пожаловать в <b>OUTFIT LAB</b>!\n\n"
            "Нажмите кнопку ниже, чтобы открыть каталог товаров.",
            parse_mode="HTML",
            reply_markup=markup
        )
    except Exception as e:
        print(f"Ошибка в /start: {str(e)}")

@bot.message_handler(content_types=['web_app_data'])
def handle_web_app_data(message):
    try:
        print(f"\n=== Получены данные от {message.from_user.id} ===\n{message.web_app_data.data}\n")
        
        data = json.loads(message.web_app_data.data)
        
        if data.get('action') != 'new_order':
            print("Неизвестное действие:", data.get('action'))
            return
            
        # Формируем сообщение для админа
        admin_msg = (
            "🛒 <b>НОВЫЙ ЗАКАЗ</b>\n\n"
            f"👤 <b>Клиент:</b> {data['user']['name']}\n"
            f"📱 <b>Телефон:</b> {data['user']['phone']}\n"
            f"✈️ <b>Telegram:</b> @{data['user']['telegram']}\n\n"
            f"💳 <b>Оплата:</b> {'Карта' if data.get('payment') == 'card' else 'Криптовалюта'}\n"
            f"🚚 <b>Доставка:</b> {'Самовывоз' if data.get('delivery') == 'pickup' else f'Доставка ({Config.DELIVERY_COST}₽)'}\n"
            f"📍 <b>Адрес:</b> {data.get('address', 'не указан')}\n\n"
            "<b>Товары:</b>\n"
        )
        
        for item in data['cart']:
            admin_msg += f"• {item['name']} ({item.get('size', 'без размера')}) - {item['price']}₽\n"
        
        admin_msg += f"\n💰 <b>Итого:</b> {data['total']}₽"
        
        # Кнопки для быстрого ответа
        markup = InlineKeyboardMarkup()
        markup.row(
            InlineKeyboardButton(
                "📞 Позвонить",
                url=f"tel:{data['user']['phone']}"
            ),
            InlineKeyboardButton(
                "💬 Написать",
                url=f"https://t.me/{data['user']['telegram']}"
            )
        )
        
        # Отправляем админам
        send_to_admins(admin_msg, reply_markup=markup)
        
        # Подтверждение пользователю
        bot.send_message(
            message.chat.id,
            "✅ <b>Заказ оформлен!</b>\n\n"
            "Администратор свяжется с вами в течение 15 минут.",
            parse_mode="HTML"
        )
        
    except Exception as e:
        error_msg = f"🚨 <b>Ошибка обработки заказа</b>\n\n{str(e)}\n\nДанные: {message.web_app_data.data if hasattr(message, 'web_app_data') else 'Нет данных'}"
        print(error_msg)
        send_to_admins(error_msg)
        bot.send_message(
            message.chat.id,
            "⚠️ Произошла ошибка. Пожалуйста, свяжитесь с нами через @outfitlaab_bot",
            parse_mode="HTML"
        )

if __name__ == '__main__':
    print("Бот запущен и готов к работе!")
    bot.infinity_polling()
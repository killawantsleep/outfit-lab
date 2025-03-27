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
    ADMINS = [5000931101]  # Ваш Telegram ID
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

@bot.message_handler(commands=['additem'])
def add_item(message):
    try:
        if message.from_user.id not in Config.ADMINS:
            return bot.reply_to(message, "❌ Эта команда только для администраторов")
        
        msg = bot.send_message(
            message.chat.id,
            "📤 <b>Отправьте фото товара с подписью в формате:</b>\n"
            "<code>Название | Цена | Размер</code>\n\n"
            "<i>Пример:</i>\n"
            "<i>Футболка премиум | 1990 | XL</i>",
            parse_mode="HTML"
        )
        bot.register_next_step_handler(msg, process_item)
    except Exception as e:
        print(f"Ошибка в /additem: {str(e)}")

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
                raise ValueError("❌ Цена должна быть больше нуля")
        except ValueError:
            raise ValueError("❌ Некорректная цена. Используйте числа")
        
        file_info = bot.get_file(message.photo[-1].file_id)
        image_url = f"https://api.telegram.org/file/bot{bot.token}/{file_info.file_path}"
        
        response = requests.post(
            os.getenv("GOOGLE_SCRIPT_URL"),
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
            f"• Цена: {price} ₽\n"
            f"• Размер: {size}",
            parse_mode="HTML"
        )
        
        # Обновляем кнопку "Открыть магазин"
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton(
            "🛍️ Открыть магазин", 
            web_app=WebAppInfo(url=Config.WEB_APP_URL)
        ))
        bot.send_message(
            message.chat.id,
            "Товар добавлен в базу. Магазин обновлён!",
            reply_markup=markup
        )
    except Exception as e:
        bot.reply_to(message, str(e))
        print(f"Ошибка добавления товара: {str(e)}")

@bot.message_handler(content_types=['web_app_data'])
def handle_web_app_data(message):
    try:
        print(f"\n=== Получены данные от {message.from_user.id} ===\n{message.web_app_data.data}\n")
        
        data = json.loads(message.web_app_data.data)
        
        if data.get('action') != 'new_order':
            print("Неизвестное действие:", data.get('action'))
            return
            
        # Валидация данных
        required_fields = ['user', 'cart', 'total']
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Отсутствует обязательное поле: {field}")

        # Формируем сообщение для админа
        admin_msg = (
            "🛒 <b>НОВЫЙ ЗАКАЗ</b>\n\n"
            f"👤 <b>Клиент:</b> {data['user'].get('name', 'не указано')}\n"
            f"📱 <b>Телефон:</b> {data['user'].get('phone', 'не указан')}\n"
            f"✈️ <b>Telegram:</b> @{data['user'].get('telegram', 'не указан')}\n\n"
            f"💳 <b>Оплата:</b> {'Карта' if data.get('payment') == 'card' else 'Криптовалюта'}\n"
            f"🚚 <b>Доставка:</b> {'Самовывоз' if data.get('delivery') == 'pickup' else f'Доставка ({Config.DELIVERY_COST}₽)'}\n"
            f"📍 <b>Адрес:</b> {data.get('address', 'не указан')}\n\n"
            "<b>Товары:</b>\n"
        )
        
        for item in data['cart']:
            admin_msg += f"• {item.get('name', 'Без названия')} ({item.get('size', 'без размера')}) - {item.get('price', '?')}₽\n"
        
        admin_msg += f"\n💰 <b>Итого:</b> {data.get('total', 0)}₽"

        # Кнопки для быстрого ответа
        markup = InlineKeyboardMarkup()
        markup.row(
            InlineKeyboardButton(
                "📞 Позвонить",
                url=f"tel:{data['user'].get('phone', '')}"
            ),
            InlineKeyboardButton(
                "💬 Написать",
                url=f"https://t.me/{data['user'].get('telegram', '')}"
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

@bot.message_handler(commands=['test'])
def test_command(message):
    """Тестовая команда для проверки работы бота"""
    if message.from_user.id not in Config.ADMINS:
        return
        
    try:
        test_msg = "🔔 <b>Тестовое уведомление</b>\n\nБот работает корректно!"
        send_to_admins(test_msg)
        bot.reply_to(message, "✅ Тестовые уведомления отправлены администраторам", parse_mode="HTML")
    except Exception as e:
        bot.reply_to(message, f"❌ Ошибка: {str(e)}", parse_mode="HTML")

if __name__ == '__main__':
    print("Бот запущен и готов к работе!")
    bot.infinity_polling()
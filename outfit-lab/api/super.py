import os
import telebot
import json
import requests
import logging
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from dotenv import load_dotenv

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('bot.log')
    ]
)
logger = logging.getLogger(__name__)

# Загрузка переменных окружения
load_dotenv()

class Config:
    ADMINS = [5000931101]  # Ваш Telegram ID
    WEB_APP_URL = "https://killawantsleep.github.io/outfit-lab/"
    DELIVERY_COST = 440

try:
    bot = telebot.TeleBot(os.getenv("BOT_TOKEN"))
    logger.info("Бот успешно инициализирован")
except Exception as e:
    logger.error(f"Ошибка инициализации бота: {str(e)}")
    exit(1)

def send_to_admins(message, parse_mode="HTML", reply_markup=None):
    for admin_id in Config.ADMINS:
        try:
            bot.send_message(
                admin_id,
                message,
                parse_mode=parse_mode,
                reply_markup=reply_markup,
                disable_web_page_preview=True
            )
            logger.info(f"Уведомление отправлено админу {admin_id}")
        except Exception as e:
            logger.error(f"Ошибка отправки админу {admin_id}: {str(e)}")

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
            "👋 Добро пожаловать в <b>OUTFIT LAB</b>!",
            parse_mode="HTML",
            reply_markup=markup
        )
        logger.info(f"Отправлено стартовое сообщение для {message.from_user.id}")
    except Exception as e:
        logger.error(f"Ошибка в /start: {str(e)}")

@bot.message_handler(commands=['additem'])
def add_item(message):
    try:
        if message.from_user.id not in Config.ADMINS:
            bot.reply_to(message, "❌ Эта команда только для администраторов")
            return
        
        msg = bot.send_message(
            message.chat.id,
            "📤 <b>Отправьте фото товара с подписью в формате:</b>\n"
            "<code>Название | Цена | Размер</code>",
            parse_mode="HTML"
        )
        bot.register_next_step_handler(msg, process_item)
        logger.info(f"Админ {message.from_user.id} начал добавление товара")
    except Exception as e:
        logger.error(f"Ошибка в /additem: {str(e)}")

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
        price = float(price.replace(',', '.'))
        
        file_info = bot.get_file(message.photo[-1].file_id)
        image_url = f"https://api.telegram.org/file/bot{bot.token}/{file_info.file_path}"
        
        response = requests.post(
            os.getenv("GOOGLE_SCRIPT_URL"),
            json={'name': name, 'price': price, 'image': image_url, 'size': size},
            timeout=15
        )
        
        if response.status_code != 200:
            raise ValueError(f"❌ Ошибка сохранения: {response.text}")
        
        bot.reply_to(
            message,
            f"✅ <b>{name}</b> успешно добавлен!\nЦена: {price} ₽\nРазмер: {size}",
            parse_mode="HTML"
        )
        logger.info(f"Товар добавлен: {name} ({price} ₽)")

    except Exception as e:
        error_msg = f"❌ Ошибка: {str(e)}"
        bot.reply_to(message, error_msg)
        logger.error(f"Ошибка добавления товара: {str(e)}")

@bot.message_handler(content_types=['web_app_data'])
def handle_web_app_data(message):
    try:
        logger.info(f"Получены данные от {message.from_user.id}")
        
        if not message.web_app_data:
            logger.error("Нет данных web_app_data")
            return

        try:
            data = json.loads(message.web_app_data.data)
            logger.info(f"Данные заказа: {json.dumps(data, indent=2, ensure_ascii=False)}")
        except json.JSONDecodeError as e:
            error_msg = f"Ошибка JSON: {str(e)}"
            logger.error(error_msg)
            send_to_admins(f"🚨 {error_msg}\nДанные: {message.web_app_data.data}")
            return

        if data.get('action') != 'new_order':
            logger.warning(f"Неизвестное действие: {data.get('action')}")
            return

        # Формирование сообщения
        items_text = "\n".join(
            f"• {item.get('name', 'Без названия')} ({item.get('size', 'без размера')}) - {item.get('price', '?')}₽"
            for item in data.get('cart', [])
        )
        
        admin_msg = (
            "🛒 <b>НОВЫЙ ЗАКАЗ</b>\n\n"
            f"👤 <b>Клиент:</b> {data['user'].get('name', 'не указано')}\n"
            f"📱 <b>Телефон:</b> {data['user'].get('phone', 'не указан')}\n"
            f"✈️ <b>Telegram:</b> @{data['user'].get('telegram', 'не указан')}\n\n"
            f"💳 <b>Оплата:</b> {'Карта' if data.get('payment') == 'card' else 'Криптовалюта'}\n"
            f"🚚 <b>Доставка:</b> {'Самовывоз' if data.get('delivery') == 'pickup' else f'Доставка ({Config.DELIVERY_COST}₽)'}\n"
            f"📍 <b>Адрес:</b> {data.get('address', 'не указан')}\n\n"
            f"<b>Товары:</b>\n{items_text}\n\n"
            f"💰 <b>Итого:</b> {data.get('total', 0)}₽"
        )

        # Кнопки для ответа
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
        
        send_to_admins(admin_msg, reply_markup=markup)
        bot.send_message(
            message.chat.id,
            "✅ <b>Заказ оформлен!</b>\nАдминистратор свяжется с вами.",
            parse_mode="HTML"
        )
        logger.info(f"Заказ от {data['user'].get('name')} успешно обработан")

    except Exception as e:
        error_msg = f"🚨 Ошибка: {str(e)}"
        logger.error(error_msg, exc_info=True)
        send_to_admins(error_msg)
        bot.send_message(
            message.chat.id,
            "⚠️ Произошла ошибка. Пожалуйста, свяжитесь с нами.",
            parse_mode="HTML"
        )

@bot.message_handler(commands=['test'])
def test_command(message):
    try:
        if message.from_user.id not in Config.ADMINS:
            return
            
        test_msg = (
            "🔔 <b>Тестовое уведомление</b>\n\n"
            "Бот работает корректно!\n"
            f"Admin ID: {message.from_user.id}"
        )
        
        send_to_admins(test_msg)
        bot.reply_to(message, "✅ Тест выполнен успешно", parse_mode="HTML")
        logger.info(f"Тест выполнен для {message.from_user.id}")

    except Exception as e:
        error_msg = f"❌ Ошибка теста: {str(e)}"
        bot.reply_to(message, error_msg)
        logger.error(error_msg)

if __name__ == '__main__':
    logger.info("Бот запущен и готов к работе!")
    try:
        bot.infinity_polling()
    except Exception as e:
        logger.critical(f"Бот остановлен с ошибкой: {str(e)}")
        send_to_admins(f"🚨 Бот упал с ошибкой: {str(e)}")
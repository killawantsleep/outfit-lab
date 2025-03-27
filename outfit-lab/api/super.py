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
        logging.FileHandler('bot.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

# Загрузка переменных окружения
load_dotenv()

class Config:
    ADMINS = [int(id) for id in os.getenv("ADMINS", "").split(",") if id]
    WEB_APP_URL = os.getenv("WEB_APP_URL", "https://killawantsleep.github.io/outfit-lab/")
    DELIVERY_COST = 440
    SCRIPT_URL = os.getenv("GOOGLE_SCRIPT_URL")

try:
    bot = telebot.TeleBot(os.getenv("BOT_TOKEN"))
    logger.info("=== Бот успешно инициализирован ===")
except Exception as e:
    logger.error(f"Ошибка инициализации бота: {str(e)}", exc_info=True)
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
            logger.error(f"Ошибка отправки админу {admin_id}: {str(e)}", exc_info=True)

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
            "Нажмите кнопку ниже, чтобы открыть каталог товаров:",
            parse_mode="HTML",
            reply_markup=markup
        )
        logger.info(f"Пользователь {message.from_user.id} начал работу с ботом")
    except Exception as e:
        logger.error(f"Ошибка в /start: {str(e)}", exc_info=True)

@bot.message_handler(commands=['additem'])
def add_item(message):
    try:
        if message.from_user.id not in Config.ADMINS:
            bot.reply_to(message, "❌ Эта команда только для администраторов")
            return
        
        msg = bot.send_message(
            message.chat.id,
            "📤 <b>Отправьте фото товара с подписью в формате:</b>\n"
            "<code>Название | Цена | Размер</code>\n\n"
            "Пример: <code>Футболка Oversize | 1990 | XL</code>",
            parse_mode="HTML"
        )
        bot.register_next_step_handler(msg, process_item)
        logger.info(f"Админ {message.from_user.id} начал добавление товара")
    except Exception as e:
        logger.error(f"Ошибка в /additem: {str(e)}", exc_info=True)

def process_item(message):
    try:
        if not message.photo:
            raise ValueError("Требуется фото товара")
        
        if not message.caption:
            raise ValueError("Требуется описание товара")
        
        parts = [p.strip() for p in message.caption.split('|')]
        if len(parts) < 3:
            raise ValueError("Неверный формат. Используйте: Название | Цена | Размер")
        
        name, price, size = parts[:3]
        
        try:
            price = float(price.replace(',', '.'))
        except ValueError:
            raise ValueError("Цена должна быть числом")
        
        file_info = bot.get_file(message.photo[-1].file_id)
        image_url = f"https://api.telegram.org/file/bot{bot.token}/{file_info.file_path}"
        
        response = requests.post(
            Config.SCRIPT_URL,
            json={
                'action': 'add_item',
                'name': name,
                'price': price,
                'image': image_url,
                'size': size
            },
            timeout=15
        )
        
        if response.status_code != 200:
            raise ValueError(f"Ошибка сохранения: {response.text}")
        
        bot.reply_to(
            message,
            f"✅ <b>{name}</b> успешно добавлен!\n"
            f"Цена: {price} ₽\n"
            f"Размер: {size}",
            parse_mode="HTML"
        )
        logger.info(f"Товар добавлен: {name} ({price} ₽)")

    except Exception as e:
        error_msg = f"❌ Ошибка: {str(e)}"
        bot.reply_to(message, error_msg)
        logger.error(f"Ошибка добавления товара: {str(e)}", exc_info=True)

@bot.message_handler(content_types=['web_app_data'])
def handle_web_app_data(message):
    try:
        logger.info(f"Получены данные от {message.from_user.id}")
        
        if not message.web_app_data:
            logger.error("Нет данных web_app_data в сообщении")
            return

        try:
            data = json.loads(message.web_app_data.data)
            logger.info(f"Данные заказа: {json.dumps(data, indent=2, ensure_ascii=False)}")
        except json.JSONDecodeError as e:
            error_msg = f"Ошибка декодирования JSON: {str(e)}"
            logger.error(error_msg)
            bot.send_message(message.chat.id, "⚠️ Ошибка обработки заказа")
            return

        if data.get('action') != 'new_order':
            logger.warning(f"Неизвестное действие: {data.get('action')}")
            return

        # Формирование сообщения для админа
        items_text = "\n".join(
            f"• {item.get('name', 'Без названия')} ({item.get('size', 'без размера')}) - {item.get('price', '?')} ₽"
            for item in data.get('cart', [])
        )
        
        delivery_text = (
            "Доставка" if data.get('delivery') == 'delivery' else "Самовывоз"
        ) + f" ({data.get('delivery_cost', 0)} ₽)"
        
        admin_msg = (
            "🛒 <b>НОВЫЙ ЗАКАЗ</b>\n\n"
            f"👤 <b>Клиент:</b> {data['user'].get('name', 'не указано')}\n"
            f"📱 <b>Телефон:</b> {data['user'].get('phone', 'не указан')}\n"
            f"✈️ <b>Telegram:</b> @{data['user'].get('telegram', 'не указан')}\n\n"
            f"💳 <b>Оплата:</b> {'Карта' if data.get('payment') == 'card' else 'Криптовалюта'}\n"
            f"🚚 <b>Доставка:</b> {delivery_text}\n"
            f"📍 <b>Адрес:</b> {data.get('address', 'не указан')}\n\n"
            f"<b>Товары:</b>\n{items_text}\n\n"
            f"💰 <b>Итого:</b> {data.get('total', 0)} ₽"
        )

        # Кнопки для быстрой связи
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
        
        # Ответ пользователю
        bot.send_message(
            message.chat.id,
            "✅ <b>Заказ оформлен!</b>\n"
            "Администратор свяжется с вами в ближайшее время.\n\n"
            f"Номер заказа: #{message.message_id}",
            parse_mode="HTML"
        )
        
        logger.info(f"Заказ от {data['user'].get('name')} успешно обработан")

    except Exception as e:
        error_msg = f"Ошибка обработки заказа: {str(e)}"
        logger.error(error_msg, exc_info=True)
        send_to_admins(f"🚨 {error_msg}")
        bot.send_message(
            message.chat.id,
            "⚠️ Произошла ошибка при обработке заказа. Пожалуйста, свяжитесь с администратором.",
            parse_mode="HTML"
        )

if __name__ == '__main__':
    logger.info("=== Бот запущен и готов к работе ===")
    try:
        bot.infinity_polling()
    except Exception as e:
        logger.critical(f"Бот остановлен с ошибкой: {str(e)}", exc_info=True)
        send_to_admins(f"🚨 Бот упал с ошибкой: {str(e)}")
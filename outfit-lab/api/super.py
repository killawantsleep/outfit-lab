import os
import telebot
import json
import logging
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

# Конфигурация
BOT_TOKEN = "7717029640:AAFObdE7Zb0HIRU961M--BaenWsy83DUMCA"  # ЗАМЕНИТЕ НА РЕАЛЬНЫЙ ТОКЕН!
ADMIN_ID = 5000931101  # ЗАМЕНИТЕ НА ВАШ TELEGRAM ID
WEB_APP_URL = "https://killawantsleep.github.io/outfit-lab/"
DELIVERY_COST = 440

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

bot = telebot.TeleBot(BOT_TOKEN)
logger.info("Бот инициализирован")

def send_to_admin(message, parse_mode="HTML", reply_markup=None):
    try:
        bot.send_message(
            ADMIN_ID,
            message,
            parse_mode=parse_mode,
            reply_markup=reply_markup,
            disable_web_page_preview=True
        )
        logger.info("Уведомление отправлено админу")
    except Exception as e:
        logger.error(f"Ошибка отправки админу: {str(e)}")

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
            "👋 Добро пожаловать в <b>OUTFIT LAB</b>!",
            parse_mode="HTML",
            reply_markup=markup
        )
        logger.info(f"Пользователь {message.from_user.id} начал работу с ботом")
    except Exception as e:
        logger.error(f"Ошибка в /start: {str(e)}")

@bot.message_handler(content_types=['web_app_data'])
def handle_web_app_data(message):
    try:
        logger.info(f"Получены данные от {message.from_user.id}")
        
        if not message.web_app_data:
            logger.error("Нет данных web_app_data")
            bot.send_message(message.chat.id, "❌ Ошибка обработки заказа")
            return

        data = json.loads(message.web_app_data.data)
        logger.info(f"Данные заказа: {json.dumps(data, indent=2, ensure_ascii=False)}")

        if data.get('action') != 'new_order':
            logger.warning("Неизвестное действие")
            return

        # Формирование сообщения
        items_text = "\n".join(
            f"• {item['name']} ({item.get('size', 'без размера')}) - {item['price']} ₽"
            for item in data['cart']
        )
        
        msg = f"""🛒 <b>НОВЫЙ ЗАКАЗ</b> #{message.message_id}

👤 <b>Клиент:</b> {data['user']['name']}
📱 <b>Телефон:</b> {data['user']['phone']}
✈️ <b>Telegram:</b> @{data['user']['telegram']}

💳 <b>Оплата:</b> {"Карта" if data['payment'] == 'card' else "Криптовалюта"}
🚚 <b>Доставка:</b> {"Самовывоз" if data['delivery'] == 'pickup' else f"Доставка ({data['delivery_cost']} ₽)"}
📍 <b>Адрес:</b> {data['address']}

🛍️ <b>Товары:</b>
{items_text}

💰 <b>Итого к оплате:</b> {data['total']} ₽"""

        # Кнопки для связи
        markup = InlineKeyboardMarkup()
        markup.row(
            InlineKeyboardButton("📞 Позвонить", url=f"tel:{data['user']['phone']}"),
            InlineKeyboardButton("💬 Написать", url=f"https://t.me/{data['user']['telegram']}")
        )

        send_to_admin(msg, reply_markup=markup)
        
        # Ответ пользователю
        bot.send_message(
            message.chat.id,
            "✅ <b>Заказ оформлен!</b>\n"
            "Администратор свяжется с вами для подтверждения.\n\n"
            f"Номер заказа: #{message.message_id}",
            parse_mode="HTML"
        )

    except json.JSONDecodeError:
        logger.error("Ошибка декодирования JSON")
        bot.send_message(
            message.chat.id,
            "❌ Ошибка обработки заказа. Пожалуйста, попробуйте еще раз.",
            parse_mode="HTML"
        )
    except Exception as e:
        logger.error(f"Ошибка обработки заказа: {str(e)}", exc_info=True)
        bot.send_message(
            message.chat.id,
            "⚠️ Произошла ошибка. Пожалуйста, свяжитесь с @outfitlaab_bot",
            parse_mode="HTML"
        )

if __name__ == '__main__':
    logger.info("=== Бот запущен ===")
    try:
        bot.infinity_polling()
    except Exception as e:
        logger.critical(f"Бот остановлен: {str(e)}", exc_info=True)
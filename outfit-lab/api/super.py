import os
import telebot
import json
import logging
import requests
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

# Конфигурация
BOT_TOKEN = "7717029640:AAFObdE7Zb0HIRU961M--BaenWsy83DUMCA"
ADMIN_IDS = [5808931101, 1931968348]
WEB_APP_URL = "https://killawantsleep.github.io/outfit-lab/"
SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzI9zOhivLi4RClLlDkl7xqOQEIlWLUOIldaVwGZzOFgcG50AwFBsyfDQ2W7twPRp59eA/exec"

# Настройка логирования
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('bot.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

bot = telebot.TeleBot(BOT_TOKEN)
logger.info("Бот инициализирован")

def log_to_admin(text):
    try:
        bot.send_message(ADMIN_IDS, text, parse_mode='HTML')
    except Exception as e:
        logger.error(f"Ошибка отправки лога админу: {e}")

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
        logger.info(f"Пользователь {message.from_user.id} начал работу")
    except Exception as e:
        logger.error(f"Ошибка в /start: {e}")

@bot.message_handler(commands=['additem'])
def add_item(message):
    try:
        if message.from_user.id != ADMIN_IDS:
            bot.reply_to(message, "❌ Только для администратора")
            return

        msg = bot.reply_to(
            message,
            "📤 Отправьте фото товара с подписью в формате:\n"
            "<code>Название | Цена | Размер1, Размер2, ...</code>\n\n"
            "Пример: <code>Футболка Oversize | 1990 | XS, S, M, L, XL</code>",
            parse_mode="HTML"
        )
        bot.register_next_step_handler(msg, process_item)
        logger.info(f"Админ начал добавление товара")
    except Exception as e:
        logger.error(f"Ошибка в /additem: {e}")
        bot.reply_to(message, f"❌ Ошибка: {e}")

def process_item(message):
    try:
        if not message.photo:
            raise ValueError("Отправьте фото товара")

        if not message.caption:
            raise ValueError("Добавьте описание в формате: Название | Цена | Размер1, Размер2, ...")

        parts = [part.strip() for part in message.caption.split('|')]
        if len(parts) < 3:
            raise ValueError("Неверный формат. Нужно: Название | Цена | Размеры")

        name, price = parts[:2]
        price = float(price.replace(',', '.').strip())
        
        # Обработка размеров
        sizes = [size.strip() for size in parts[2].split(',') if size.strip()]
        if not sizes:
            raise ValueError("Укажите хотя бы один размер")
        
        # Получаем URL фото
        file_info = bot.get_file(message.photo[-1].file_id)
        image_url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file_info.file_path}"

        # Отправляем в Google Sheets для каждого размера
        for size in sizes:
            response = requests.post(
                SCRIPT_URL,
                json={
                    'action': 'add_item',
                    'name': name,
                    'price': price,
                    'size': size,
                    'image': image_url
                },
                timeout=10
            )

            if response.status_code != 200:
                raise ValueError(f"Ошибка Google Script для размера {size}: {response.text}")

        # Успешное добавление
        sizes_text = ", ".join(f"<b>{size}</b>" for size in sizes)
        bot.reply_to(
            message,
            f"✅ Товар добавлен!\n\n"
            f"Название: <b>{name}</b>\n"
            f"Цена: <b>{price} ₽</b>\n"
            f"Размеры: {sizes_text}",
            parse_mode="HTML"
        )
        logger.info(f"Добавлен товар: {name} с размерами: {sizes}")

    except ValueError as e:
        logger.error(f"Ошибка добавления: {e}")
        bot.reply_to(message, f"❌ Ошибка: {e}")
    except Exception as e:
        logger.critical(f"Критическая ошибка: {e}", exc_info=True)
        bot.reply_to(message, "❌ Произошла системная ошибка")

# Остальные функции остаются без изменений
@bot.message_handler(content_types=['web_app_data'])
def handle_web_app_data(message):
    try:
        logger.debug(f"Получены данные от {message.from_user.id}")
        
        if not message.web_app_data:
            error_msg = "❌ Нет данных web_app_data"
            logger.error(error_msg)
            bot.send_message(message.chat.id, error_msg)
            return

        try:
            data = json.loads(message.web_app_data.data)
            logger.debug(f"Данные: {json.dumps(data, indent=2, ensure_ascii=False)}")
        except json.JSONDecodeError as e:
            error_msg = f"❌ Ошибка JSON: {e}"
            logger.error(error_msg)
            bot.send_message(message.chat.id, error_msg)
            return

        if data.get('action') != 'new_order':
            logger.warning(f"Неизвестное действие: {data.get('action')}")
            return

        # Формирование сообщения
        items_text = "\n".join(
            f"• {item.get('name', 'Без названия')} - {item.get('price', 0)} ₽"
            f" ({item.get('size', 'без размера')})"
            for item in data.get('cart', [])
        )
        
        order_msg = f"""
        🛍 <b>НОВЫЙ ЗАКАЗ</b> #{message.id}
        ━━━━━━━━━━━━━━━
        👤 <b>Клиент:</b> {data['user'].get('name', 'не указано')}
        📱 <b>Телефон:</b> {data['user'].get('phone', 'не указан')}
        ✈️ <b>Telegram:</b> @{data['user'].get('telegram', 'не указан')}
        ━━━━━━━━━━━━━━━
        💳 <b>Оплата:</b> {"Карта" if data.get('payment') == 'card' else "Криптовалюта"}
        🚚 <b>Доставка:</b> {"Самовывоз" if data.get('delivery') == 'pickup' else f"Доставка ({data.get('delivery_cost', 0)} ₽)"}
        📍 <b>Адрес:</b> {data.get('address', 'не указан')}
        ━━━━━━━━━━━━━━━
        🛒 <b>Товары:</b>
        {items_text}
        ━━━━━━━━━━━━━━━
        💰 <b>Итого:</b> {data.get('total', 0)} ₽
        """

        # Кнопки для связи
        markup = InlineKeyboardMarkup()
        markup.row(
            InlineKeyboardButton("📞 Позвонить", url=f"tel:{data['user'].get('phone', '')}"),
            InlineKeyboardButton("💬 Написать", url=f"https://t.me/{data['user'].get('telegram', '')}")
        )

        # Отправка админу
        try:
            bot.send_message(
                ADMIN_IDS,
                order_msg,
                parse_mode="HTML",
                reply_markup=markup
            )
            logger.info("Уведомление отправлено админу")
        except Exception as e:
            logger.error(f"Ошибка отправки админу: {e}")
            
            # Резервная отправка через Google Script
            requests.post(SCRIPT_URL, json={
                'action': 'forward_order',
                'order': data,
                'error': str(e)
            })

        # Подтверждение пользователю
        bot.send_message(
            message.chat.id,
            "✅ <b>Заказ оформлен!</b>\n"
            "Мы свяжемся с вами для подтверждения.\n\n"
            f"Номер заказа: <b>#{message.id}</b>",
            parse_mode="HTML"
        )

    except Exception as e:
        logger.critical(f"Критическая ошибка: {e}", exc_info=True)
        log_to_admin(f"🚨 Критическая ошибка при заказе:\n<code>{e}</code>")
        bot.send_message(
            message.chat.id,
            "⚠️ Произошла ошибка. Пожалуйста, свяжитесь с @outfitlaab_bot",
            parse_mode="HTML"
        )

@bot.message_handler(commands=['test'])
def test_command(message):
    try:
        bot.reply_to(message, "🟢 Бот работает нормально!")
        logger.info(f"Тест выполнен для {message.from_user.id}")
    except Exception as e:
        logger.error(f"Ошибка теста: {e}")

if __name__ == '__main__':
    logger.info("=== Бот запущен ===")
    try:
        bot.infinity_polling()
    except Exception as e:
        logger.critical(f"Бот упал: {e}", exc_info=True)
        log_to_admin(f"🛑 Бот остановлен:\n<code>{e}</code>") 
import os
import telebot
import json
import requests
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()

# Инициализация бота с обработкой ошибок
try:
    bot = telebot.TeleBot(os.getenv("BOT_TOKEN"))
    print("Бот успешно инициализирован")
except Exception as e:
    print(f"Ошибка инициализации бота: {str(e)}")
    exit(1)

class Config:
    ADMINS = [5000931101]  # Ваш Telegram ID (убедитесь, что он верный)
    WEB_APP_URL = "https://killawantsleep.github.io/outfit-lab/"
    DELIVERY_COST = 440

def send_to_admins(message, parse_mode="HTML", reply_markup=None):
    """Улучшенная отправка сообщений админам"""
    for admin_id in Config.ADMINS:
        try:
            bot.send_message(
                admin_id,
                message,
                parse_mode=parse_mode,
                reply_markup=reply_markup,
                disable_web_page_preview=True,
                disable_notification=False  # Гарантированно получим уведомление
            )
            print(f"Уведомление отправлено админу {admin_id}")
        except Exception as e:
            print(f"Критическая ошибка отправки админу {admin_id}: {str(e)}")

@bot.message_handler(commands=['start'])
def start(message):
    """Команда старта с улучшенной обработкой"""
    try:
        markup = InlineKeyboardMarkup()
        web_app_button = InlineKeyboardButton(
            "🛍️ Открыть магазин", 
            web_app=WebAppInfo(url=Config.WEB_APP_URL)
        )
        markup.add(web_app_button)
        
        bot.send_message(
            message.chat.id,
            "👋 Добро пожаловать в <b>OUTFIT LAB</b>!\n\n"
            "Нажмите кнопку ниже, чтобы открыть каталог товаров.",
            parse_mode="HTML",
            reply_markup=markup
        )
    except Exception as e:
        print(f"Ошибка в /start: {str(e)}")
        bot.reply_to(message, "⚠️ Произошла ошибка при запуске")

@bot.message_handler(commands=['additem'])
def add_item(message):
    """Добавление товара с улучшенной валидацией"""
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
        bot.reply_to(message, f"❌ Ошибка: {str(e)}")

def process_item(message):
    """Обработка товара с улучшенным логированием"""
    try:
        # Валидация фото
        if not message.photo:
            raise ValueError("❌ Требуется фото товара")
        
        # Валидация описания
        if not message.caption:
            raise ValueError("❌ Требуется описание товара")
        
        parts = [p.strip() for p in message.caption.split('|')]
        if len(parts) < 3:
            raise ValueError("❌ Неверный формат. Используйте: Название | Цена | Размер")
        
        name, price, size = parts[:3]
        
        # Валидация цены
        try:
            price = float(price.replace(',', '.'))
            if price <= 0:
                raise ValueError("❌ Цена должна быть больше нуля")
        except ValueError:
            raise ValueError("❌ Некорректная цена. Используйте числа")
        
        # Загрузка изображения
        file_info = bot.get_file(message.photo[-1].file_id)
        image_url = f"https://api.telegram.org/file/bot{bot.token}/{file_info.file_path}"
        
        # Отправка в Google Sheets
        response = requests.post(
            os.getenv("GOOGLE_SCRIPT_URL"),
            json={
                'name': name,
                'price': price,
                'image': image_url,
                'size': size
            },
            timeout=15  # Увеличенный таймаут
        )
        
        if response.status_code != 200:
            raise ValueError(f"❌ Ошибка сохранения: {response.text}")
        
        # Уведомление об успехе
        bot.reply_to(
            message,
            f"✅ <b>{name}</b> успешно добавлен!\n"
            f"• Цена: {price} ₽\n"
            f"• Размер: {size}",
            parse_mode="HTML"
        )
        
        # Обновление кнопки меню
        try:
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
            print(f"Ошибка обновления кнопки: {str(e)}")

    except Exception as e:
        error_msg = f"❌ Ошибка: {str(e)}"
        print(f"Ошибка добавления товара: {error_msg}")
        bot.reply_to(message, error_msg)

@bot.message_handler(content_types=['web_app_data'])
def handle_web_app_data(message):
    """Обработка заказов с улучшенной диагностикой"""
    try:
        print(f"\n=== Получены данные от {message.from_user.id} ===\n{message.web_app_data.data}\n")
        
        # Пробная отправка тестового уведомления
        send_to_admins("🔔 Тест: бот получил данные от WebApp")
        
        try:
            data = json.loads(message.web_app_data.data)
        except json.JSONDecodeError as e:
            error_msg = f"🚨 Ошибка декодирования JSON: {str(e)}\nПолученные данные: {message.web_app_data.data}"
            print(error_msg)
            send_to_admins(error_msg)
            return

        # Валидация действия
        if data.get('action') != 'new_order':
            print(f"Неизвестное действие: {data.get('action')}")
            return
            
        # Проверка обязательных полей
        required_fields = ['user', 'cart', 'total']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            error_msg = f"🚨 Отсутствуют обязательные поля: {', '.join(missing_fields)}"
            print(error_msg)
            send_to_admins(error_msg)
            return

        # Формирование сообщения
        order_items = '\n'.join(
            f"• {item.get('name', 'Без названия')} ({item.get('size', 'без размера')}) - {item.get('price', '?')}₽" 
            for item in data['cart']
        )
        
        admin_msg = (
            "🛒 <b>НОВЫЙ ЗАКАЗ</b>\n\n"
            f"👤 <b>Клиент:</b> {data['user'].get('name', 'не указано')}\n"
            f"📱 <b>Телефон:</b> {data['user'].get('phone', 'не указан')}\n"
            f"✈️ <b>Telegram:</b> @{data['user'].get('telegram', 'не указан')}\n\n"
            f"💳 <b>Оплата:</b> {'Карта' if data.get('payment') == 'card' else 'Криптовалюта'}\n"
            f"🚚 <b>Доставка:</b> {'Самовывоз' if data.get('delivery') == 'pickup' else f'Доставка ({Config.DELIVERY_COST}₽)'}\n"
            f"📍 <b>Адрес:</b> {data.get('address', 'не указан')}\n\n"
            f"<b>Товары:</b>\n{order_items}\n\n"
            f"💰 <b>Итого:</b> {data.get('total', 0)}₽"
        )

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
        
        # Отправка админам
        send_to_admins(admin_msg, reply_markup=markup)
        
        # Подтверждение пользователю
        bot.send_message(
            message.chat.id,
            "✅ <b>Заказ оформлен!</b>\n\n"
            "Администратор свяжется с вами в течение 15 минут.",
            parse_mode="HTML"
        )
        
    except Exception as e:
        error_msg = f"🚨 Критическая ошибка: {str(e)}\nТип данных: {type(message.web_app_data.data)}\nДанные: {message.web_app_data.data}"
        print(error_msg)
        send_to_admins(error_msg)
        bot.send_message(
            message.chat.id,
            "⚠️ Произошла ошибка. Пожалуйста, свяжитесь с нами через @outfitlaab_bot",
            parse_mode="HTML"
        )

@bot.message_handler(commands=['test'])
def test_command(message):
    """Тестовая команда с улучшенной диагностикой"""
    try:
        if message.from_user.id not in Config.ADMINS:
            return
            
        test_msg = (
            "🔔 <b>Тестовое уведомление</b>\n\n"
            "Бот работает корректно!\n"
            f"Версия: {telebot.__version__}\n"
            f"Admin ID: {message.from_user.id}"
        )
        
        send_to_admins(test_msg)
        bot.reply_to(message, "✅ Тестовые уведомления отправлены", parse_mode="HTML")
        
        # Дополнительная проверка WebApp
        try:
            markup = InlineKeyboardMarkup()
            markup.add(InlineKeyboardButton(
                "Тест WebApp", 
                web_app=WebAppInfo(url=Config.WEB_APP_URL)
            ))
            bot.send_message(
                message.chat.id,
                "Проверка кнопки WebApp:",
                reply_markup=markup
            )
        except Exception as e:
            print(f"Ошибка теста WebApp: {str(e)}")

    except Exception as e:
        bot.reply_to(message, f"❌ Ошибка теста: {str(e)}")

if __name__ == '__main__':
    print("Бот запущен и готов к работе!")
    try:
        bot.infinity_polling()
    except Exception as e:
        print(f"Критическая ошибка бота: {str(e)}")
        send_to_admins(f"🚨 Бот упал с ошибкой: {str(e)}")
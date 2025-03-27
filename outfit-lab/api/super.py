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

# Конфигурация
CONFIG = {
    'ADMINS': [5000931101],  # Ваш Telegram ID (убедитесь, что он правильный)
    'WEB_APP_URL': "https://killawantsleep.github.io/outfit-lab/",
    'DELIVERY_COST': 440,
    'GOOGLE_SCRIPT_URL': os.getenv("GOOGLE_SCRIPT_URL")
}

# ======================
# КОМАНДА СТАРТ
# ======================
@bot.message_handler(commands=['start'])
def start(message):
    try:
        # Создаем кнопку для открытия веб-приложения
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton(
            "🛍️ Открыть магазин", 
            web_app=WebAppInfo(url=CONFIG['WEB_APP_URL'])
        ))
        
        # Отправляем приветственное сообщение
        bot.send_message(
            message.chat.id,
            "👋 Добро пожаловать в *OUTFIT LAB*!\n\n"
            "Нажмите кнопку ниже, чтобы открыть каталог товаров.\n"
            "Товары обновляются автоматически.",
            parse_mode="Markdown",
            reply_markup=markup
        )
        
        # Логируем запуск
        print(f"Пользователь {message.from_user.id} запустил бота")
        
    except Exception as e:
        print(f"Ошибка в /start: {str(e)}")
        bot.reply_to(message, "🚫 Произошла ошибка. Попробуйте позже.")

# ======================
# ДОБАВЛЕНИЕ ТОВАРА (АДМИН)
# ======================
@bot.message_handler(commands=['additem'])
def add_item(message):
    try:
        # Проверка прав администратора
        if message.from_user.id not in CONFIG['ADMINS']:
            return bot.reply_to(message, "❌ Эта команда только для администраторов")
        
        # Запрашиваем данные о товаре
        msg = bot.send_message(
            message.chat.id,
            "📤 *Отправьте фото товара с подписью в формате:*\n"
            "`Название | Цена | Размер`\n\n"
            "*Пример:*\n"
            "_Футболка премиум | 1990 | XL_",
            parse_mode="Markdown"
        )
        bot.register_next_step_handler(msg, process_item)
        
    except Exception as e:
        print(f"Ошибка в /additem: {str(e)}")
        bot.reply_to(message, "🚫 Ошибка обработки команды")

def process_item(message):
    try:
        # Проверка фото
        if not message.photo:
            raise ValueError("❌ Требуется фото товара")
        
        # Проверка описания
        if not message.caption:
            raise ValueError("❌ Требуется описание товара")
        
        # Парсинг данных
        parts = [p.strip() for p in message.caption.split('|')]
        if len(parts) < 3:
            raise ValueError("❌ Неверный формат. Используйте: Название | Цена | Размер")
        
        name, price, size = parts[:3]
        
        # Валидация цены
        try:
            price = float(price.replace(',', '.'))
            if price <= 0:
                raise ValueError("Цена должна быть больше нуля")
        except ValueError:
            raise ValueError("❌ Некорректная цена. Используйте числа")
        
        # Получаем URL фото
        file_info = bot.get_file(message.photo[-1].file_id)
        image_url = f"https://api.telegram.org/file/bot{bot.token}/{file_info.file_path}"
        
        # Отправляем в Google Script
        response = requests.post(
            CONFIG['GOOGLE_SCRIPT_URL'],
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
        
        # Уведомляем об успехе
        bot.reply_to(
            message,
            f"✅ *{name}* успешно добавлен!\n"
            f"• Цена: {price} ₽\n"
            f"• Размер: {size}",
            parse_mode="Markdown"
        )
        
        print(f"Добавлен товар: {name} ({price} ₽)")
        
    except Exception as e:
        bot.reply_to(message, str(e))
        print(f"Ошибка добавления товара: {str(e)}")

# ======================
# ОБРАБОТКА ЗАКАЗОВ ИЗ WEBAPP
# ======================
@bot.message_handler(content_types=['web_app_data'])
def handle_web_app_data(message):
    try:
        print(f"\n=== Получен новый заказ ===\nОт: {message.from_user.id}\nДанные: {message.web_app_data.data}\n")
        
        data = json.loads(message.web_app_data.data)
        
        # Проверяем тип действия
        if data.get('action') != 'new_order':
            raise ValueError("Неизвестное действие")
        
        # Формируем сообщение для админа
        admin_message = (
            "🛒 *НОВЫЙ ЗАКАЗ*\n\n"
            f"• Клиент: [{data['user']['name']}](tg://user?id={message.from_user.id})\n"
            f"• Телефон: `{data['user']['phone']}`\n"
            f"• Telegram: @{data['user']['telegram'].replace('@', '')}\n\n"
            f"*Способ оплаты:* {data.get('payment', 'не указан')}\n"
            f"*Доставка:* {'Самовывоз' if data.get('delivery') == 'pickup' else f'Доставка ({CONFIG["DELIVERY_COST"]} ₽)'}\n"
            f"*Адрес:* {data.get('address', 'не указан')}\n\n"
            "*Товары:*\n"
        )
        
        # Добавляем товары
        for item in data['cart']:
            admin_message += f"├ {item['name']} ({item.get('size', 'без размера')}) - {item['price']} ₽\n"
        
        admin_message += f"\n💰 *Итого к оплате:* {data['total']} ₽"
        
        # Создаем кнопки для админа
        markup = InlineKeyboardMarkup()
        markup.row(
            InlineKeyboardButton(
                "📞 Позвонить",
                url=f"tel:{data['user']['phone']}"
            ),
            InlineKeyboardButton(
                "💬 Написать",
                url=f"https://t.me/{data['user']['telegram'].replace('@', '')}"
            )
        )
        
        # Отправляем всем админам
        for admin_id in CONFIG['ADMINS']:
            try:
                bot.send_message(
                    admin_id,
                    admin_message,
                    parse_mode="Markdown",
                    reply_markup=markup,
                    disable_web_page_preview=True
                )
                print(f"Уведомление отправлено admin {admin_id}")
            except Exception as e:
                print(f"Ошибка отправки admin {admin_id}: {str(e)}")
        
        # Подтверждаем пользователю
        bot.send_message(
            message.chat.id,
            "✅ *Ваш заказ оформлен!*\n\n"
            "Администратор свяжется с вами в ближайшее время для подтверждения.\n\n"
            "ℹ️ Для вопросов: @outfitlaab_bot",
            parse_mode="Markdown"
        )
        
        print(f"Заказ от {message.from_user.id} успешно обработан")
        
    except Exception as e:
        print(f"Критическая ошибка: {str(e)}")
        
        # Отправляем ошибку админам
        for admin_id in CONFIG['ADMINS']:
            try:
                bot.send_message(
                    admin_id,
                    f"🚨 *Ошибка обработки заказа*\n\n"
                    f"От: {message.from_user.id}\n"
                    f"Ошибка: {str(e)}\n\n"
                    f"Данные: {message.web_app_data.data}",
                    parse_mode="Markdown"
                )
            except:
                pass
        
        # Сообщение пользователю
        bot.send_message(
            message.chat.id,
            "⚠️ *Произошла ошибка при оформлении заказа*\n\n"
            "Пожалуйста, свяжитесь с нами напрямую через @outfitlaab_bot",
            parse_mode="Markdown"
        )

# ======================
# ТЕСТИРОВАНИЕ
# ======================
@bot.message_handler(commands=['test'])
def test_bot(message):
    try:
        # Проверка прав
        if message.from_user.id not in CONFIG['ADMINS']:
            return bot.reply_to(message, "❌ Только для админов")
        
        # Проверка отправки сообщений
        bot.reply_to(message, "🔄 Тестирование...")
        
        # Проверка уведомлений
        for admin_id in CONFIG['ADMINS']:
            try:
                bot.send_message(
                    admin_id,
                    "🔔 *Тестовое уведомление*\n\n"
                    "Бот работает корректно!",
                    parse_mode="Markdown"
                )
            except Exception as e:
                bot.reply_to(message, f"❌ Ошибка отправки admin {admin_id}: {str(e)}")
                return
        
        bot.reply_to(message, "✅ Все тесты пройдены успешно!")
        
    except Exception as e:
        bot.reply_to(message, f"🚫 Ошибка тестирования: {str(e)}")

# ======================
# ЗАПУСК БОТА
# ======================
if __name__ == '__main__':
    print("====== BOT STARTED ======")
    print(f"Admins: {CONFIG['ADMINS']}")
    print(f"WebApp URL: {CONFIG['WEB_APP_URL']}")
    
    try:
        bot.infinity_polling()
    except Exception as e:
        print(f"FATAL ERROR: {str(e)}")
        # Уведомляем админов о падении бота
        for admin_id in CONFIG['ADMINS']:
            try:
                bot.send_message(admin_id, f"🚨 Бот упал с ошибкой: {str(e)}")
            except:
                pass
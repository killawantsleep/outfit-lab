import os
import json
import logging
from dotenv import load_dotenv
import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Загрузка переменных окружения
load_dotenv()

bot = telebot.TeleBot(os.getenv("BOT_TOKEN"))
ADMINS = [int(id) for id in os.getenv("ADMINS", "").split(",") if id]

@bot.message_handler(commands=['start'])
def start(message):
    try:
        markup = telebot.types.InlineKeyboardMarkup()
        markup.add(telebot.types.InlineKeyboardButton(
            "🛍 Открыть магазин",
            web_app=telebot.types.WebAppInfo(url="https://killawantsleep.github.io/outfit-lab/")
        ))
        bot.send_message(
            message.chat.id,
            "👋 Добро пожаловать в OUTFIT LAB!\nТовары обновляются автоматически.",
            reply_markup=markup
        )
    except Exception as e:
        logger.error(f"Ошибка в команде /start: {e}")
        bot.reply_to(message, "Произошла ошибка. Пожалуйста, попробуйте позже.")

@bot.message_handler(content_types=['web_app_data'])
def handle_webapp_data(message):
    try:
        data = json.loads(message.web_app_data.data)
        
        if data.get('action') != 'new_order':
            return
            
        logger.info(f"Новый заказ от пользователя {message.from_user.id}")
        
        # Проверка администраторов
        if not ADMINS:
            logger.error("Не настроены администраторы")
            bot.reply_to(message, "❌ Ошибка: не настроены администраторы")
            return
        
        # Отправка уведомлений администраторам
        successful_sends = 0
        for admin_id in ADMINS:
            try:
                # Отправка информации о заказе
                bot.send_message(
                    admin_id,
                    data['order'],
                    parse_mode='HTML'
                )
                
                # Создание кнопок для связи
                markup = InlineKeyboardMarkup()
                markup.row(
                    InlineKeyboardButton(
                        "📞 Позвонить",
                        url=f"tel:{data['user']['phone']}"
                    ),
                    InlineKeyboardButton(
                        "✉️ Написать",
                        url=f"https://t.me/{data['user']['telegram'].lstrip('@')}"
                    )
                )
                
                # Отправка контактной информации
                bot.send_message(
                    admin_id,
                    f"👤 <b>Контактные данные:</b>\n"
                    f"├ Имя: {data['user']['name']}\n"
                    f"├ Телефон: {data['user']['phone']}\n"
                    f"└ Telegram: @{data['user']['telegram'].lstrip('@')}\n\n"
                    f"🆔 ID пользователя: {message.from_user.id}\n"
                    f"💰 Сумма заказа: {data['total']} ₽",
                    parse_mode='HTML',
                    reply_markup=markup
                )
                
                successful_sends += 1
                
            except Exception as e:
                logger.error(f"Ошибка отправки админу {admin_id}: {e}")
        
        if successful_sends > 0:
            # Подтверждение пользователю
            bot.reply_to(
                message,
                "✅ <b>Заказ успешно оформлен!</b>\n\n"
                "Мы уже обрабатываем ваш заказ. В ближайшее время с вами свяжется наш менеджер.\n\n"
                "Если у вас есть вопросы, вы можете написать нам в Telegram.",
                parse_mode='HTML'
            )
        else:
            raise Exception("Не удалось отправить заказ ни одному администратору")
            
    except Exception as e:
        logger.error(f"Ошибка обработки заказа: {e}")
        bot.reply_to(
            message,
            "❌ <b>Произошла ошибка при оформлении заказа</b>\n\n"
            "Пожалуйста, попробуйте еще раз или свяжитесь с нами напрямую.\n\n"
            "Приносим извинения за неудобства.",
            parse_mode='HTML'
        )

if __name__ == '__main__':
    logger.info("Бот запускается...")
    bot.infinity_polling()
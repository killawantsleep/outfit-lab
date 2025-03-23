from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, ContextTypes, filters
import sqlite3
import logging
import re
import os
import requests
from flask import Flask, jsonify
from flask_cors import CORS

# Настройка логирования
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

# Токен вашего бота
BOT_TOKEN = '7717029640:AAEeBFBzeAPPGco2cxTBQAIhZXXq7aWuanM'

# ID вашего канала (например, @my_channel)
CHANNEL_ID = '@proverka2362'  # Замените на username или ID вашего канала

# Подключение к базе данных
conn = sqlite3.connect('clothing_catalog.db', check_same_thread=False)
cursor = conn.cursor()

# Создание таблицы для хранения вещей
cursor.execute('''
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    size TEXT,
    condition TEXT,
    price REAL,
    image_url TEXT,
    sold BOOLEAN DEFAULT 0
)
''')
conn.commit()

# Функция для загрузки фотографии на сервер (например, ImgBB)
def upload_image(file_path):
    url = "https://api.imgbb.com/1/upload"
    try:
        with open(file_path, "rb") as file:
            response = requests.post(url, files={"image": file}, data={"key": "a8b20a49f52e1576de0020abe1d678b6"})
        if response.status_code == 200:
            return response.json()["data"]["url"]
    except Exception as e:
        logger.error(f"Ошибка при загрузке изображения: {e}")
    return None

# Функция для добавления вещи в каталог
def add_item(name, size, condition, price, image_url=None):
    try:
        cursor.execute(
            'INSERT INTO items (name, size, condition, price, image_url) VALUES (?, ?, ?, ?, ?)',
            (name, size, condition, price, image_url)
        )
        conn.commit()
    except Exception as e:
        logger.error(f"Ошибка при добавлении товара: {e}")

# Обработчик новых сообщений из канала
async def channel_post_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # Проверяем, что сообщение пришло из нужного канала
    if update.channel_post.chat.username == CHANNEL_ID or str(update.channel_post.chat.id) == CHANNEL_ID:
        text = update.channel_post.caption  # Текст сообщения (если есть)
        photo = update.channel_post.photo  # Фотография (если есть)

        # Логируем полученное сообщение
        logger.info(f"Получено сообщение из канала: {text}")

        # Парсим сообщение (пример формата: "Nike air force cactus jack | Size: 44-44.5 | +Идеальное состояние | Цена: 13.999")
        match = re.match(r'^(.*?)\s*\|\s*Size:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*Цена:\s*([\d,]+)', text)
        if match:
            name, size, condition, price = match.groups()
            price = float(price.replace(',', ''))  # Убираем запятую и преобразуем в число

            # Если есть фотография, загружаем её
            image_url = None
            if photo:
                file = await context.bot.get_file(photo[-1].file_id)
                file_path = f"temp_{file.file_id}.jpg"
                await file.download_to_drive(file_path)

                # Загружаем фотографию на сервер
                image_url = upload_image(file_path)
                os.remove(file_path)  # Удаляем временный файл

            # Добавляем товар в каталог
            add_item(name, size, condition, price, image_url)
            logger.info(f"Добавлен новый товар: {name}, {size}, {condition}, {price} руб., фото: {image_url}")
        else:
            logger.warning(f"Не удалось распарсить сообщение: {text}")

# Основная функция запуска бота
def main():
    application = ApplicationBuilder().token(BOT_TOKEN).build()

    # Обработчик новых сообщений из канала
    application.add_handler(MessageHandler(filters.ChatType.CHANNEL, channel_post_handler))

    application.run_polling()

if __name__ == '__main__':
    main()
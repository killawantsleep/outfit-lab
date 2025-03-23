from flask import Flask, jsonify
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

# Подключение к базе данных
conn = sqlite3.connect('clothing_catalog.db', check_same_thread=False)
cursor = conn.cursor()

# Маршрут для получения каталога
@app.route('/catalog', methods=['GET'])
def get_catalog():
    cursor.execute('SELECT * FROM items')
    items = cursor.fetchall()
    catalog = []
    for item in items:
        catalog.append({
            "id": item[0],
            "name": item[1],
            "size": item[2],
            "condition": item[3],
            "price": item[4],
            "image_url": item[5]
        })
    return jsonify(catalog)

if __name__ == '__main__':
    app.run(debug=True)
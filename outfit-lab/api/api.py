from flask import Flask, jsonify
import sqlite3

app = Flask(__name__)

@app.route('/api/items')
def get_items():
    conn = sqlite3.connect('clothing_catalog.db')
    cursor = conn.cursor()
    cursor.execute("SELECT name, price, category FROM items")
    items = cursor.fetchall()
    conn.close()
    return jsonify([{"name": i[0], "price": i[1], "category": i[2]} for i in items])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
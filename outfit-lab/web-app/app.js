// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand(); // Раскрываем на весь экран
tg.MainButton.setText("Закрыть").show();
tg.MainButton.onClick(() => tg.close());

// Данные товаров (временные, можно заменить на запрос к API)
const items = [
    { 
        name: "Футболка Burberry", 
        price: 18990,
        image: "https://example.com/t-shirt.jpg" // Пример ссылки на изображение
    },
    { 
        name: "Джинсы Levi's", 
        price: 7990,
        image: "https://example.com/jeans.jpg"
    }
];

// Функция отображения товаров
function renderItems() {
    const container = document.getElementById('itemsContainer');
    container.innerHTML = items.map(item => `
        <div class="item">
            <img src="${item.image}" alt="${item.name}" class="item-image">
            <h3>${item.name}</h3>
            <p>Цена: ${item.price} руб.</p>
            <button class="buy-button" onclick="tg.showAlert('Товар ${item.name} добавлен в корзину!')">
                Купить
            </button>
        </div>
    `).join('');
}

// Загрузка товаров при старте
document.addEventListener('DOMContentLoaded', renderItems);

// Пример работы с API (если подключен бэкенд)
async function fetchItems() {
    try {
        const response = await fetch('https://ваш-api.ru/items');
        const data = await response.json();
        items = data; // Обновляем список товаров
        renderItems();
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
    }
}

// Для отладки в браузере (если не в Telegram)
if (!window.Telegram) {
    console.warn('Telegram WebApp не обнаружен. Режим отладки.');
    renderItems();
}
document.getElementById('menuButton').addEventListener('click', () => {
    const filteredItems = items.filter(item => item.category === 'Футболки');
    renderItems(filteredItems);
});
const cart = [];
function addToCart(item) {
    cart.push(item);
    tg.MainButton.setText(`Корзина (${cart.length})`).show();
}
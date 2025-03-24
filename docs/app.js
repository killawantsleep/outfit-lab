// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.setText("🛍️ Корзина").show();

// Конфигурация
const API_URL = 'GOOGLE_SCRIPT_URL';
const CACHE_KEY = 'cachedItems';
const REFRESH_INTERVAL = 30000; // 30 секунд

// Загрузка товаров с автоматическим обновлением
async function loadItems() {
  try {
    // 1. Пробуем загрузить из кеша
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      renderItems(JSON.parse(cachedData));
    }

    // 2. Загружаем свежие данные с уникальным параметром для избежания кеширования
    const response = await fetch(`${API_URL}?t=${Date.now()}`);
    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Некорректный формат данных");
    }

    // 3. Обновляем кеш и интерфейс
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    renderItems(data);

  } catch (error) {
    console.error("Ошибка загрузки:", error);
    
    // Фолбэк: показываем пример, если нет кеша
    if (!localStorage.getItem(CACHE_KEY)) {
      renderItems([{
        name: "Пример товара",
        price: 9999,
        image: "https://via.placeholder.com/300",
        size: "M"
      }]);
    }
  }
}

// Оптимизированный рендер товаров
function renderItems(items) {
  const container = document.getElementById('itemsContainer');
  if (!container) return;

  container.innerHTML = items.map(item => `
    <div class="item">
      <img src="${item.image}" 
           class="item-image" 
           loading="lazy"
           alt="${item.name}">
      <h3>${item.name}</h3>
      <p>${parseInt(item.price).toLocaleString('ru-RU')} ₽</p>
      <p>Размер: ${item.size || 'не указан'}</p>
      <button class="buy-button" 
              onclick="handleBuy('${item.name.replace(/'/g, "\\'")}')">
        В корзину
      </button>
    </div>
  `).join('');
}

// Обработка покупки
function handleBuy(itemName) {
  try {
    tg.showAlert(`Добавлено: ${itemName}`);
    tg.MainButton.show();
  } catch (e) {
    console.error("Ошибка Telegram API:", e);
    alert(`Добавлено: ${itemName}`);
  }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  loadItems();
  setInterval(loadItems, REFRESH_INTERVAL);
});

// Для обновления по команде из бота
window.forceUpdate = () => {
  localStorage.removeItem(CACHE_KEY);
  loadItems();
};
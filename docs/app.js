// 1. Инициализация Telegram
const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.setText("🛍️ Корзина").show();

// 2. Конфигурация
const API_URL = 'https://script.google.com/macros/s/AKfycbzI9zOhivLi4RClLlDkl7xqOQEIlWLUOIldaVwGZzOFgcG50AwFBsyfDQ2W7twPRp59eA/exec';
let isFirstLoad = true;

// 3. Загрузка товаров с приоритетом свежих данных
async function loadItems() {
  try {
    // 3.1. Показываем старые данные сразу (если есть)
    const cached = localStorage.getItem('items');
    if (cached && isFirstLoad) {
      renderItems(JSON.parse(cached));
    }

    // 3.2. Загружаем свежие данные (с уникальным параметром против кеша)
    const response = await fetch(`${API_URL}?nocache=${Date.now()}`);
    const freshData = await response.json();

    // 3.3. Проверяем структуру данных
    if (!Array.isArray(freshData)) {
      throw new Error('Данные не в формате массива');
    }

    // 3.4. Обновляем интерфейс и кеш
    renderItems(freshData);
    localStorage.setItem('items', JSON.stringify(freshData));

  } catch (error) {
    console.error('Ошибка:', error);
    // Показываем кеш даже при ошибке сети
    if (!localStorage.getItem('items')) {
      renderItems([{
        name: "Попробуйте обновить страницу",
        price: 0,
        image: "https://via.placeholder.com/300",
        size: "XL"
      }]);
    }
  } finally {
    isFirstLoad = false;
  }
}

// 4. Улучшенный рендеринг товаров
function renderItems(items) {
  const container = document.getElementById('itemsContainer');
  if (!container) return;

  // Сортируем по дате добавления (новые сверху)
  const sortedItems = [...items].reverse();
  
  container.innerHTML = sortedItems.map(item => `
    <div class="item">
      <img src="${item.image || 'https://via.placeholder.com/300'}" 
           class="item-image" 
           alt="${item.name}"
           loading="lazy">
      <div class="item-info">
        <h3>${item.name}</h3>
        <p class="price">${parseInt(item.price).toLocaleString('ru-RU')} ₽</p>
        <p class="size">Размер: ${item.size || 'не указан'}</p>
      </div>
      <button class="buy-button" onclick="handleBuy('${item.name.replace(/'/g, "\\'")}')">
        В корзину
      </button>
    </div>
  `).join('');
}

// 5. Обработка покупки
function handleBuy(itemName) {
  tg.showAlert(`✅ Добавлено: ${itemName}`);
  tg.MainButton.show();
}

// 6. Запуск и автообновление
document.addEventListener('DOMContentLoaded', () => {
  loadItems();
  // Обновляем каждые 15 секунд
  setInterval(loadItems, 15000);
});

// 7. Ручное обновление по команде из бота
window.forceUpdate = () => {
  localStorage.removeItem('items');
  loadItems();
};
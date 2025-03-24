// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.setText("🛍️ Корзина").show();

// Загрузка товаров с кешированием
async function loadItems() {
  try {
    // Пробуем загрузить из кеша
    const cached = localStorage.getItem('cachedItems');
    if (cached) {
      renderItems(JSON.parse(cached));
    }

    // Загрузка из Google Sheets
    const response = await fetch('https://script.google.com/macros/s/AKfycbzI9zOhivLi4RClLlDkl7xqOQEIlWLUOIldaVwGZzOFgcG50AwFBsyfDQ2W7twPRp59eA/exec');
    const data = await response.json();
    
    if (!data || !Array.isArray(data)) {
      throw new Error("Некорректные данные от сервера");
    }

    // Сохраняем в кеш и рендерим
    localStorage.setItem('cachedItems', JSON.stringify(data));
    renderItems(data);
  } catch (error) {
    console.error("Ошибка загрузки:", error);
    renderItems([ 
      {
        name: "Пример товара (кеш)",
        price: 9999,
        image: "https://via.placeholder.com/300",
        size: "M"
      }
    ]);
  }
}

// Рендер товаров
function renderItems(items) {
  const container = document.getElementById('itemsContainer');
  if (!container) return;

  container.innerHTML = items.map(item => `
    <div class="item">
      <img src="${item.image}" class="item-image" loading="lazy">
      <h3>${item.name}</h3>
      <p>${item.price} ₽</p>
      <p>Размер: ${item.size || 'не указан'}</p>
      <button class="buy-button" onclick="handleBuy('${item.name.replace(/'/g, "\\'")}')">
        В корзину
      </button>
    </div>
  `).join('');
}

// Обработка покупки
function handleBuy(itemName) {
  try {
    tg.showAlert(`Добавлено: ${itemName}`);
  } catch (e) {
    console.error("Ошибка Telegram API:", e);
    alert(`Добавлено: ${itemName}`); // Фолбэк
  }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  loadItems();
  setInterval(loadItems, 300000); // Обновление каждые 5 минут
});
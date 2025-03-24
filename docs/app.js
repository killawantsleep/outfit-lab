// Инициализация Telegram
const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.setText("🛍️ Корзина").show();

// Параметры URL
const urlParams = new URLSearchParams(window.location.search);
const forceUpdate = urlParams.get('force_update');

// Загрузка товаров
async function loadItems() {
  try {
    // Принудительное обновление при триггере от бота
    if (forceUpdate) {
      localStorage.removeItem('cachedItems');
    }

    // Проверка кеша
    const cached = localStorage.getItem('cachedItems');
    if (cached && !forceUpdate) {
      renderItems(JSON.parse(cached));
      return;
    }

    // Загрузка из Google Sheets
    const response = await fetch('https://script.google.com/macros/s/AKfycbzI9zOhivLi4RClLlDkl7xqOQEIlWLUOIldaVwGZzOFgcG50AwFBsyfDQ2W7twPRp59eA/exec');
    const data = await response.json();

    if (!data || !Array.isArray(data)) {
      throw new Error("Ошибка загрузки данных");
    }

    // Сохранение и рендер
    localStorage.setItem('cachedItems', JSON.stringify(data));
    renderItems(data);

  } catch (error) {
    console.error("Ошибка:", error);
    renderItems([{
      name: "Пример товара",
      price: 9999,
      image: "https://via.placeholder.com/300",
      size: "M"
    }]);
  }
}

// Рендер товаров
function renderItems(items) {
  const container = document.getElementById('itemsContainer');
  container.innerHTML = items.map(item => `
    <div class="item">
      <img src="${item.image}" class="item-image">
      <h3>${item.name}</h3>
      <p>${item.price} ₽</p>
      <p>Размер: ${item.size || 'не указан'}</p>
      <button class="buy-button" onclick="tg.showAlert('Добавлено: ${item.name.replace(/'/g, "\\'")}')">
        В корзину
      </button>
    </div>
  `).join('');
}

// Запуск
document.addEventListener('DOMContentLoaded', loadItems);
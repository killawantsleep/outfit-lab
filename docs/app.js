// Инициализация Telegram
const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.setText("🛍️ Корзина").show();

// Загрузка товаров из Google Sheets
async function loadItems() {
  try {
    const response = await fetch('https://script.google.com/macros/s/AKfycbzI9zOhivLi4RClLlDkl7xqOQEIlWLUOIldaVwGZzOFgcG50AwFBsyfDQ2W7twPRp59eA/exec');
    const data = await response.json();
    
    if (!data || !Array.isArray(data)) {
      throw new Error("Некорректные данные от сервера");
    }

    renderItems(data);
  } catch (error) {
    console.error("Ошибка загрузки:", error);
    renderItems([ // Fallback данные
      {
        name: "Пример товара",
        price: 9999,
        image: "https://via.placeholder.com/300",
        size: "M"
      }
    ]);
  }
}

// Отображение товаров
function renderItems(items) {
  const container = document.getElementById('itemsContainer');
  
  container.innerHTML = items.map(item => `
    <div class="item">
      <img src="${item.image}" class="item-image" loading="lazy">
      <h3>${item.name}</h3>
      <p>${item.price} ₽</p>
      <p>Размер: ${item.size || 'не указан'}</p>
      <button class="buy-button" onclick="tg.showAlert('Добавлено: ${item.name}')">
        В корзину
      </button>
    </div>
  `).join('');
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  loadItems();
  setInterval(loadItems, 300000); // Обновление каждые 5 минут
});
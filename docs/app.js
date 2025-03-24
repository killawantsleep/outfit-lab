// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.setParams({
  text: "🛍️ Открыть корзину",
  color: "#6c5ce7",
  textColor: "#ffffff"
}).show();

// Загрузка товаров с сервера
async function loadItems() {
  try {
    const response = await fetch('https://killawantsleep.github.io/outfit-lab/');
    const items = await response.json();
    renderItems(items);
  } catch (error) {
    console.error('Ошибка загрузки товаров:', error);
    // Показываем заглушку, если API не доступно
    renderItems([
      {
        id: 1,
        name: "Футболка BURBERRY 2025",
        price: 18990,
        image: "https://ibb.co/TDqyBx0H",
        badge: "NEW"
      },
      {
        id: 2,
        name: "КРОССОВки NIKE A.I.",
        price: 24990,
        image: "https://ibb.co/example.jpg"
      }
    ]);
  }
}

// Рендер товаров
function renderItems(items) {
  const container = document.getElementById('itemsContainer');
  
  container.innerHTML = items.map(item => `
    <div class="item" data-id="${item.id}">
      ${item.badge ? `<span class="item-badge">${item.badge}</span>` : ''}
      <img src="${item.image}" alt="${item.name}" class="item-image" loading="lazy">
      <h3>${item.name}</h3>
      <p>${item.price.toLocaleString()} ₽</p>
      <button class="buy-button" onclick="tg.showAlert('Добавлено: ${item.name}')">
        В корзину
      </button>
    </div>
  `).join('');
}

// Обработчики кнопок
document.getElementById('menuButton').addEventListener('click', () => {
  tg.showAlert('Меню категорий будет здесь!');
});

document.getElementById('filterButton').addEventListener('click', () => {
  tg.showAlert('Фильтры будут здесь!');
});

// Запуск при загрузке
document.addEventListener('DOMContentLoaded', () => {
  loadItems();
  // Автообновление каждые 5 минут
  setInterval(loadItems, 300000);
});
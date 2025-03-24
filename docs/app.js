// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.setParams({
  text: "🛍️ Открыть корзину",
  color: "#6c5ce7",
  textColor: "#ffffff"
}).show();

// Mock-данные (замените на API)
const items = [
  {
    id: 1,
    name: "Футболка BURBERRY 2025",
    price: 18990,
    image: "https://ibb.co/TDqyBx0H",
    colors: ["#000000", "#6c5ce7", "#ffffff"]
  },
  {
    id: 2,
    name: "КРОССОВки NIKE A.I.",
    price: 24990,
    image: "https://example.com/sneakers.jpg",
    badge: "NEW"
  }
];

// Рендер товаров
function renderItems() {
  const container = document.getElementById('itemsContainer');
  
  container.innerHTML = items.map(item => `
    <div class="item" data-id="${item.id}">
      ${item.badge ? `<span class="item-badge">${item.badge}</span>` : ''}
      <img src="${item.image}" alt="${item.name}" class="item-image">
      <h3>${item.name}</h3>
      <p>${item.price.toLocaleString()} ₽</p>
      <button class="buy-button" onclick="tg.showAlert('Добавлено: ${item.name}')">
        В корзину
      </button>
    </div>
  `).join('');
}

// Плавная загрузка
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(renderItems, 300); // Имитация загрузки
});
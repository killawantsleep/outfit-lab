// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Состояние приложения
const state = {
  items: [],
  cart: JSON.parse(localStorage.getItem('cart')) || []
};

// Элементы интерфейса
const elements = {
  itemsContainer: document.getElementById('itemsContainer'),
  cartButton: document.getElementById('cartButton'),
  cartCounter: document.getElementById('cartCounter'),
  cartModal: document.getElementById('cartModal'),
  cartItems: document.getElementById('cartItems'),
  cartTotal: document.getElementById('cartTotal'),
  closeCart: document.getElementById('closeCart'),
  checkoutButton: document.getElementById('checkoutButton')
};

// Инициализация корзины
function initCart() {
  updateCartCounter();
  
  // Обработчики событий
  elements.cartButton.addEventListener('click', openCart);
  elements.closeCart.addEventListener('click', closeCart);
  elements.checkoutButton.addEventListener('click', checkout);
}

// Загрузка товаров
async function loadItems() {
  try {
    const response = await fetch('https://script.google.com/macros/s/AKfycbzI9zOhivLi4RClLlDkl7xqOQEIlWLUOIldaVwGZzOFgcG50AwFBsyfDQ2W7twPRp59eA/exec');
    state.items = await response.json();
    renderItems();
  } catch (error) {
    console.error("Ошибка загрузки:", error);
    renderItems([{
      name: "Ошибка загрузки",
      price: 0,
      image: "https://via.placeholder.com/300",
      size: "XL"
    }]);
  }
}

// Отображение товаров
function renderItems() {
  elements.itemsContainer.innerHTML = state.items.map(item => `
    <div class="item">
      <img src="${item.image}" class="item-image">
      <h3>${item.name}</h3>
      <p>${item.price} ₽</p>
      <p>Размер: ${item.size || 'не указан'}</p>
      <button class="buy-button" onclick="addToCart(${state.items.indexOf(item)})">
        В корзину
      </button>
    </div>
  `).join('');
}

// Функции корзины
function addToCart(itemIndex) {
  const item = state.items[itemIndex];
  state.cart.push(item);
  saveCart();
  tg.showAlert(`✅ ${item.name} добавлен в корзину`);
}

function removeFromCart(index) {
  state.cart.splice(index, 1);
  saveCart();
  renderCart();
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(state.cart));
  updateCartCounter();
}

function updateCartCounter() {
  elements.cartCounter.textContent = state.cart.length;
  tg.MainButton.setText(`🛍️ Корзина (${state.cart.length})`);
  state.cart.length > 0 ? tg.MainButton.show() : tg.MainButton.hide();
}

function openCart() {
  renderCart();
  elements.cartModal.style.display = 'block';
}

function closeCart() {
  elements.cartModal.style.display = 'none';
}

function renderCart() {
  elements.cartItems.innerHTML = state.cart.map((item, index) => `
    <div class="cart-item">
      <img src="${item.image}">
      <div>
        <h4>${item.name}</h4>
        <p>${item.price} ₽</p>
        <button onclick="removeFromCart(${index})">❌ Удалить</button>
      </div>
    </div>
  `).join('');
  
  const total = state.cart.reduce((sum, item) => sum + Number(item.price), 0);
  elements.cartTotal.textContent = `Итого: ${total} ₽`;
}

function checkout() {
  tg.showAlert(`Оформлен заказ на ${state.cart.length} товаров!`);
  state.cart = [];
  saveCart();
  closeCart();
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  tg.MainButton.setText("🛍️ Корзина");
  initCart();
  loadItems();
  setInterval(loadItems, 30000); // Обновление каждые 30 сек
});

// Глобальные функции для HTML
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Состояние приложения
const state = {
  items: [],
  cart: loadCart()
};

// DOM элементы
const elements = {
  itemsContainer: document.getElementById('itemsContainer'),
  cartBtn: document.getElementById('cartBtn'),
  cartCounter: document.getElementById('cartCounter'),
  cartModal: document.getElementById('cartModal'),
  cartItems: document.getElementById('cartItems'),
  cartTotal: document.getElementById('cartTotal'),
  closeCart: document.getElementById('closeCart'),
  checkoutBtn: document.getElementById('checkoutBtn')
};

// Инициализация
function init() {
  setupEventListeners();
  loadItems();
  updateCartUI();
}

// Загрузка товаров
async function loadItems() {
  try {
    const response = await fetch('https://script.google.com/macros/s/AKfycbzI9zOhivLi4RClLlDkl7xqOQEIlWLUOIldaVwGZzOFgcG50AwFBsyfDQ2W7twPRp59eA/exec');
    state.items = await response.json();
    renderItems();
  } catch (error) {
    console.error('Ошибка загрузки:', error);
    renderError();
  }
}

// Рендер товаров
function renderItems() {
  elements.itemsContainer.innerHTML = state.items.map(item => {
    const inCart = isItemInCart(item);
    return `
    <div class="item">
      <img src="${item.image}" alt="${item.name}" class="item-image">
      <div class="item-info">
        <h3>${item.name}</h3>
        <p class="price">${formatPrice(item.price)} ₽</p>
        <p>Размер: ${item.size || 'не указан'}</p>
        <button class="buy-button ${inCart ? 'in-cart' : ''}" 
                onclick="addToCart(${state.items.indexOf(item)})"
                ${inCart ? 'disabled' : ''}>
          ${inCart ? '✓ В корзине' : 'В корзину'}
        </button>
      </div>
    </div>
    `;
  }).join('');
}

// Проверка наличия товара в корзине
function isItemInCart(item) {
  return state.cart.some(cartItem => 
    cartItem.name === item.name && 
    cartItem.price === item.price && 
    cartItem.size === item.size
  );
}

// Форматирование цены
function formatPrice(price) {
  return Number(price).toLocaleString('ru-RU');
}

// Работа с корзиной
function loadCart() {
  try {
    return JSON.parse(localStorage.getItem('cart')) || [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(state.cart));
  updateCartUI();
  renderItems(); // Перерисовываем кнопки товаров
}

// Добавление в корзину с защитой от дублирования
function addToCart(itemIndex) {
  const item = state.items[itemIndex];
  
  if (isItemInCart(item)) {
    tg.showAlert(`"${item.name}" уже в корзине!`);
    return;
  }

  state.cart.push(item);
  saveCart();
  
  // Визуальная обратная связь
  const button = event.target;
  button.textContent = '✓ В корзине';
  button.classList.add('in-cart');
  button.disabled = true;
  
  tg.showAlert(`"${item.name}" добавлен в корзину`);
}

// Удаление из корзины
function removeFromCart(index) {
  state.cart.splice(index, 1);
  saveCart();
  renderCart();
}

// Обновление UI корзины
function updateCartUI() {
  const count = state.cart.length;
  elements.cartCounter.textContent = count;
  tg.MainButton.setText(`Корзина (${count})`);
  count > 0 ? tg.MainButton.show() : tg.MainButton.hide();
}

// Рендер корзины
function renderCart() {
  elements.cartItems.innerHTML = state.cart.map((item, index) => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}">
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <p>${formatPrice(item.price)} ₽ • ${item.size || 'без размера'}</p>
      </div>
      <button class="remove-item" onclick="removeFromCart(${index})">✕</button>
    </div>
  `).join('');
  
  const total = state.cart.reduce((sum, item) => sum + Number(item.price), 0);
  elements.cartTotal.textContent = `${formatPrice(total)} ₽`;
}

// Оформление заказа
function checkout() {
  if (state.cart.length === 0) return;
  
  const total = state.cart.reduce((sum, item) => sum + Number(item.price), 0);
  const orderText = state.cart.map(item => 
    `• ${item.name} - ${formatPrice(item.price)} ₽`).join('\n');
  
  tg.showAlert(`Ваш заказ:\n\n${orderText}\n\nИтого: ${formatPrice(total)} ₽`);
  
  // Очистка корзины после заказа
  state.cart = [];
  saveCart();
  closeCart();
}

// Управление модальным окном
function openCart() {
  renderCart();
  elements.cartModal.style.display = 'block';
}

function closeCart() {
  elements.cartModal.style.display = 'none';
}

// Обработчики событий
function setupEventListeners() {
  elements.cartBtn.addEventListener('click', openCart);
  elements.closeCart.addEventListener('click', closeCart);
  elements.checkoutBtn.addEventListener('click', checkout);
  
  // Закрытие по клику вне окна
  elements.cartModal.addEventListener('click', (e) => {
    if (e.target === elements.cartModal) closeCart();
  });
}

// Глобальные функции
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;

// Запуск приложения
document.addEventListener('DOMContentLoaded', init);
const CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzI9zOhivLi4RClLlDkl7xqOQEIlWLUOIldaVwGZzOFgcG50AwFBsyfDQ2W7twPRp59eA/exec',
  TIMEOUT: 10000
};

// Проверка на открытие в Telegram WebApp
if (!window.Telegram?.WebApp?.initData) {
  document.body.innerHTML = `
    <div style="padding:40px;text-align:center;">
      <h2>Откройте приложение через Telegram</h2>
      <p>Это мини-приложение работает только внутри Telegram</p>
      <button onclick="window.location.href='https://t.me/your_bot'" 
              style="margin-top:20px;padding:10px 20px;background:#6c5ce7;color:white;border:none;border-radius:8px;">
        Открыть в Telegram
      </button>
    </div>
  `;
  throw new Error("Telegram WebApp not initialized");
}

const tg = window.Telegram.WebApp;
tg.expand();
tg.enableClosingConfirmation();

// Скрываем стандартную кнопку корзины Telegram
tg.MainButton.hide();

const state = {
  items: [],
  cart: JSON.parse(localStorage.getItem('cart')) || [],
  isLoading: false
};

const elements = {
  itemsContainer: document.getElementById('itemsContainer'),
  cartBtn: document.getElementById('cartBtn'),
  cartCounter: document.getElementById('cartCounter'),
  cartModal: document.getElementById('cartModal'),
  cartItems: document.getElementById('cartItems'),
  cartTotal: document.getElementById('cartTotal'),
  closeCart: document.getElementById('closeCart'),
  checkoutBtn: document.getElementById('checkoutBtn'),
  loadingIndicator: document.getElementById('loadingIndicator')
};

function init() {
  loadItems();
  setupEventListeners();
  updateCart();
}

async function loadItems() {
  if (state.isLoading) return;
  
  state.isLoading = true;
  showLoading(true);

  try {
    const response = await fetch(`${CONFIG.SCRIPT_URL}?t=${Date.now()}`);
    const data = await response.json();
    
    if (!Array.isArray(data)) throw new Error("Invalid data format");
    
    state.items = data.filter(item => item?.name && !isNaN(item.price));
    renderItems();
  } catch (error) {
    console.error('Load error:', error);
    tg.showAlert("Ошибка загрузки товаров");
  } finally {
    state.isLoading = false;
    showLoading(false);
  }
}

function renderItems() {
  elements.itemsContainer.innerHTML = state.items.map(item => `
    <div class="item">
      <img src="${item.image}" alt="${item.name}" class="item-image">
      <div class="item-info">
        <h3>${item.name}</h3>
        <p>${item.price} ₽</p>
        <p>Размер: ${item.size || 'не указан'}</p>
        <button class="buy-button ${isInCart(item) ? 'in-cart' : ''}" 
                onclick="addToCart('${item.name}', ${item.price}, '${item.size}')"
                ${isInCart(item) ? 'disabled' : ''}>
          ${isInCart(item) ? '✓ В корзине' : 'В корзину'}
        </button>
      </div>
    </div>
  `).join('');
}

function setupEventListeners() {
  // Определяем тип события в зависимости от устройства
  const clickEvent = ('ontouchstart' in window) ? 'touchend' : 'click';
  
  // Обработчик для кнопки корзины
  elements.cartBtn.addEventListener(clickEvent, (e) => {
    e.preventDefault(); // Предотвращаем стандартное поведение
    e.stopPropagation(); // Останавливаем всплытие события
    renderCart();
    elements.cartModal.style.display = 'block';
  });
  
  // Обработчик для закрытия корзины
  elements.closeCart.addEventListener(clickEvent, () => {
    elements.cartModal.style.display = 'none';
  });
  
  // Обработчик для оформления заказа
  elements.checkoutBtn.addEventListener(clickEvent, () => {
    if (state.cart.length === 0) return;
    
    const total = state.cart.reduce((sum, item) => sum + Number(item.price), 0);
    const orderText = state.cart.map(item => 
      `• ${item.name} - ${item.price} ₽ (${item.size || 'без размера'})`
    ).join('\n');
    
    tg.showAlert(`Ваш заказ:\n\n${orderText}\n\nИтого: ${total} ₽`);
    
    state.cart = [];
    updateCart();
    renderItems(); // Обновляем кнопки товаров
    elements.cartModal.style.display = 'none';
  });
}

function isInCart(item) {
  return state.cart.some(cartItem => 
    cartItem.name === item.name && 
    cartItem.price === item.price && 
    cartItem.size === item.size
  );
}

function updateCart() {
  localStorage.setItem('cart', JSON.stringify(state.cart));
  elements.cartCounter.textContent = state.cart.length;
}

function renderItems() {
  elements.itemsContainer.innerHTML = state.items.map(item => `
    <div class="item">
      <img src="${item.image}" alt="${item.name}" class="item-image">
      <div class="item-info">
        <h3>${item.name}</h3>
        <p>${item.price} ₽</p>
        <p>Размер: ${item.size || 'не указан'}</p>
        <button class="buy-button ${isInCart(item) ? 'in-cart' : ''}" 
                onclick="addToCart('${item.name}', ${item.price}, '${item.size}')"
                ${isInCart(item) ? 'disabled' : ''}>
          ${isInCart(item) ? '✓ В корзине' : 'В корзину'}
        </button>
      </div>
    </div>
  `).join('');
}

function removeFromCart(index) {
  state.cart.splice(index, 1);
  updateCart();
  renderCart();
  renderItems();
}

function setupEventListeners() {
  elements.cartBtn.addEventListener('click', () => {
    renderCart();
    elements.cartModal.style.display = 'block';
  });
  
  elements.closeCart.addEventListener('click', () => {
    elements.cartModal.style.display = 'none';
  });
  
  elements.checkoutBtn.addEventListener('click', () => {
    if (state.cart.length === 0) return;
    
    const total = state.cart.reduce((sum, item) => sum + Number(item.price), 0);
    const orderText = state.cart.map(item => 
      `• ${item.name} - ${item.price} ₽ (${item.size || 'без размера'})`
    ).join('\n');
    
    tg.showAlert(`Ваш заказ:\n\n${orderText}\n\nИтого: ${total} ₽`);
    
    state.cart = [];
    updateCart();
    elements.cartModal.style.display = 'none';
  });
}

function showLoading(show) {
  elements.loadingIndicator.style.display = show ? 'flex' : 'none';
}

// Глобальные функции
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;

// Запуск
document.addEventListener('DOMContentLoaded', init);
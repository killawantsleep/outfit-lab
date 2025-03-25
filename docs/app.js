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
      <button onclick="window.location.href='https://t.me/outfitlaab_bot'" 
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
tg.MainButton.hide();

const state = {
  items: [],
  cart: JSON.parse(localStorage.getItem('cart')) || [],
  isLoading: false,
  deliveryCost: 440
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
  loadingIndicator: document.getElementById('loadingIndicator'),
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  checkoutModal: document.getElementById('checkoutModal'),
  closeCheckout: document.getElementById('closeCheckout'),
  paymentMethod: document.getElementById('paymentMethod'),
  deliveryMethod: document.getElementById('deliveryMethod'),
  phoneInput: document.getElementById('phoneInput'),
  addressInput: document.getElementById('addressInput'),
  nameInput: document.getElementById('nameInput'),
  telegramInput: document.getElementById('telegramInput'),
  deliveryCostDisplay: document.getElementById('deliveryCost'),
  totalToPay: document.getElementById('totalToPay'),
  confirmOrderBtn: document.getElementById('confirmOrderBtn'),
  backToCartBtn: document.getElementById('backToCartBtn')
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

function addToCart(name, price, size) {
  const itemElement = event.target.closest('.item');
  const item = { 
    name, 
    price, 
    size, 
    image: itemElement.querySelector('img').src 
  };
  
  if (isInCart(item)) {
    tg.showAlert(`"${item.name}" уже в корзине!`);
    return;
  }

  state.cart.push(item);
  updateCart();
  
  // Обновляем кнопку
  const button = event.target;
  button.textContent = '✓ В корзине';
  button.classList.add('in-cart');
  button.disabled = true;
  
  tg.showAlert(`"${item.name}" добавлен в корзину`);
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

function renderCart() {
  elements.cartItems.innerHTML = state.cart.map((item, index) => `
    <div class="cart-item">
      <img src="${item.image}" width="60" height="60" style="border-radius:8px;">
      <div>
        <h4>${item.name}</h4>
        <p>${item.price} ₽ • ${item.size || 'без размера'}</p>
      </div>
      <button class="remove-item" onclick="removeFromCart(${index})">✕</button>
    </div>
  `).join('');

  const total = state.cart.reduce((sum, item) => sum + Number(item.price), 0);
  elements.cartTotal.textContent = `${total} ₽`;
}

function removeFromCart(index) {
  state.cart.splice(index, 1);
  updateCart();
  renderCart();
  renderItems();
}

function showCheckoutForm() {
  const total = state.cart.reduce((sum, item) => sum + Number(item.price), 0);
  const deliveryCost = elements.deliveryMethod.value === 'delivery' ? state.deliveryCost : 0;
  const totalToPay = total + deliveryCost;
  
  elements.deliveryCostDisplay.textContent = `${deliveryCost} ₽`;
  elements.totalToPay.textContent = `${totalToPay} ₽`;
  
  elements.cartModal.style.display = 'none';
  elements.checkoutModal.style.display = 'block';
}

function submitOrder() {
  const paymentMethod = elements.paymentMethod.value;
  const deliveryMethod = elements.deliveryMethod.value;
  const phone = elements.phoneInput.value.trim();
  const address = elements.addressInput.value.trim();
  const name = elements.nameInput.value.trim();
  const telegram = elements.telegramInput.value.trim();
  
  if (!phone || !name) {
    tg.showAlert("Пожалуйста, заполните обязательные поля (телефон и ФИО)");
    return;
  }
  
  const deliveryCost = deliveryMethod === 'delivery' ? state.deliveryCost : 0;
  const total = state.cart.reduce((sum, item) => sum + Number(item.price), 0);
  const totalToPay = total + deliveryCost;
  
  const orderDetails = state.cart.map(item => 
    `• ${escapeHtml(item.name)} - ${item.price} ₽ (${item.size || 'без размера'})`
  ).join('\n');
  
  const message = `
    <b>Новый заказ!</b>
    
    <b>Клиент:</b> ${escapeHtml(name)}
    <b>Телефон:</b> ${escapeHtml(phone)}
    <b>Telegram:</b> ${telegram ? escapeHtml(telegram) : 'не указан'}
    
    <b>Способ оплаты:</b> ${paymentMethod === 'card' ? 'Перевод на карту' : 'Криптовалюта'}
    <b>Доставка:</b> ${deliveryMethod === 'delivery' ? 'Доставка (+440 ₽)' : 'Самовывоз'}
    ${deliveryMethod === 'delivery' ? `<b>Адрес:</b> ${escapeHtml(address)}` : ''}
    
    <b>Заказ:</b>
    ${orderDetails}
    
    <b>Итого:</b> ${total} ₽
    <b>Доставка:</b> ${deliveryCost} ₽
    <b>К оплате:</b> ${totalToPay} ₽
  `;
  
  tg.sendData(JSON.stringify({
    action: 'new_order',
    order: message
  }));
  
  state.cart = [];
  updateCart();
  renderItems();
  elements.checkoutModal.style.display = 'none';
  elements.cartModal.style.display = 'none';
  
  tg.showAlert("Ваш заказ успешно оформлен! С вами свяжутся для подтверждения.");
}

function updateOrderSummary() {
  const deliveryCost = elements.deliveryMethod.value === 'delivery' ? state.deliveryCost : 0;
  const total = state.cart.reduce((sum, item) => sum + Number(item.price), 0);
  const totalToPay = total + deliveryCost;
  
  elements.deliveryCostDisplay.textContent = `${deliveryCost} ₽`;
  elements.totalToPay.textContent = `${totalToPay} ₽`;
}

function setupEventListeners() {
  const clickEvent = 'ontouchstart' in window ? 'touchend' : 'click';
  
  // Корзина
  if (elements.cartBtn) {
    elements.cartBtn.addEventListener(clickEvent, (e) => {
      e.preventDefault();
      renderCart();
      elements.cartModal.style.display = 'block';
    });
  }

  if (elements.closeCart) {
    elements.closeCart.addEventListener(clickEvent, () => {
      elements.cartModal.style.display = 'none';
    });
  }

  if (elements.checkoutBtn) {
    elements.checkoutBtn.addEventListener(clickEvent, () => {
      if (state.cart.length === 0) return;
      showCheckoutForm();
    });
  }

  // Оформление заказа
  if (elements.closeCheckout) {
    elements.closeCheckout.addEventListener(clickEvent, () => {
      elements.checkoutModal.style.display = 'none';
      elements.cartModal.style.display = 'block';
    });
  }

  if (elements.backToCartBtn) {
    elements.backToCartBtn.addEventListener(clickEvent, () => {
      elements.checkoutModal.style.display = 'none';
      elements.cartModal.style.display = 'block';
    });
  }

  if (elements.confirmOrderBtn) {
    elements.confirmOrderBtn.addEventListener(clickEvent, submitOrder);
  }

  if (elements.deliveryMethod) {
    elements.deliveryMethod.addEventListener('change', updateOrderSummary);
  }

  // Поиск
  if (elements.searchBtn && elements.searchInput) {
    elements.searchBtn.addEventListener('click', searchItems);
    elements.searchInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') searchItems();
    });
    elements.searchInput.addEventListener('input', (e) => {
      if (e.target.value.trim() === '') renderItems();
    });
  }
}

function escapeHtml(unsafe) {
  return unsafe?.replace(/</g, "&lt;").replace(/>/g, "&gt;") || '';
}

function showLoading(show) {
  elements.loadingIndicator.style.display = show ? 'flex' : 'none';
}

function searchItems() {
  if (!state.items.length) {
    tg.showAlert("Товары ещё не загружены");
    return;
  }

  const searchTerm = elements.searchInput.value.toLowerCase().trim();
  
  if (!searchTerm) {
    renderItems();
    return;
  }

  const filteredItems = state.items.filter(item => 
    item.name.toLowerCase().includes(searchTerm) || 
    (item.size && item.size.toLowerCase().includes(searchTerm))
  );

  if (filteredItems.length === 0) {
    elements.itemsContainer.innerHTML = `
      <div class="no-results">
        <p>Товары по запросу "${searchTerm}" не найдены</p>
        <button onclick="renderItems()" class="retry-btn">Показать все товары</button>
      </div>
    `;
    return;
  }

  elements.itemsContainer.innerHTML = filteredItems.map(item => `
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

// Глобальные функции
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateOrderSummary = updateOrderSummary;

// Запуск
document.addEventListener('DOMContentLoaded', init);
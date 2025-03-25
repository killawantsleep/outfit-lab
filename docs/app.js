const CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzI9zOhivLi4RClLlDkl7xqOQEIlWLUOIldaVwGZzOFgcG50AwFBsyfDQ2W7twPRp59eA/exec',
  TIMEOUT: 10000,
  DELIVERY_COST: 440
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
  isLoading: false
};

const elements = {
  appWrapper: document.getElementById('appWrapper'),
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
  elements.cartBtn.style.display = 'flex';
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
                data-name="${item.name}" 
                data-price="${item.price}" 
                data-size="${item.size || ''}">
          ${isInCart(item) ? '✓ В корзине' : 'В корзину'}
        </button>
      </div>
    </div>
  `).join('');
}

function addToCart(item) {
  if (isInCart(item)) {
    tg.showAlert(`"${item.name}" уже в корзине!`);
    return;
  }

  state.cart.push(item);
  updateCart();
  renderItems();
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
      <button class="remove-item" data-index="${index}">✕</button>
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
  const deliveryCost = elements.deliveryMethod.value === 'delivery' ? CONFIG.DELIVERY_COST : 0;
  elements.deliveryCostDisplay.textContent = `${deliveryCost} ₽`;
  elements.totalToPay.textContent = `${total + deliveryCost} ₽`;
  elements.cartModal.style.display = 'none';
  elements.checkoutModal.style.display = 'block';
}

function submitOrder() {
  const phone = elements.phoneInput.value.trim();
  const name = elements.nameInput.value.trim();
  
  if (!phone || !name) {
    tg.showAlert("Заполните телефон и ФИО!");
    return;
  }

  const orderData = {
    payment: elements.paymentMethod.value,
    delivery: elements.deliveryMethod.value,
    phone,
    address: elements.addressInput.value.trim(),
    name,
    telegram: elements.telegramInput.value.trim(),
    cart: state.cart,
    total: elements.totalToPay.textContent
  };

  tg.sendData(JSON.stringify({
    action: 'new_order',
    order: formatOrderMessage(orderData)
  }));

  state.cart = [];
  updateCart();
  renderItems();
  elements.checkoutModal.style.display = 'none';
  tg.showAlert("Заказ оформлен! С вами свяжутся для подтверждения.");
}

function formatOrderMessage(order) {
  return `
    <b>Новый заказ!</b>
    <b>Клиент:</b> ${order.name}
    <b>Телефон:</b> ${order.phone}
    <b>Telegram:</b> ${order.telegram || 'не указан'}
    <b>Способ оплаты:</b> ${order.payment === 'card' ? 'Карта' : 'Криптовалюта'}
    <b>Доставка:</b> ${order.delivery === 'delivery' ? 'Доставка (+440 ₽)' : 'Самовывоз'}
    ${order.delivery === 'delivery' ? `<b>Адрес:</b> ${order.address}` : ''}
    <b>Товары:</b>
    ${order.cart.map(item => `• ${item.name} - ${item.price} ₽ (${item.size || 'без размера'})`).join('\n')}
    <b>Итого:</b> ${order.total}
  `;
}

function setupEventListeners() {
  // Делегирование событий
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('buy-button')) {
      const item = {
        name: e.target.dataset.name,
        price: parseFloat(e.target.dataset.price),
        size: e.target.dataset.size,
        image: e.target.closest('.item').querySelector('img').src
      };
      addToCart(item);
    }

    if (e.target.classList.contains('remove-item')) {
      removeFromCart(parseInt(e.target.dataset.index));
    }
  });

  elements.cartBtn.addEventListener('click', () => {
    renderCart();
    elements.cartModal.style.display = 'block';
  });

  elements.closeCart.addEventListener('click', () => {
    elements.cartModal.style.display = 'none';
  });

  elements.checkoutBtn.addEventListener('click', showCheckoutForm);
  elements.closeCheckout.addEventListener('click', () => {
    elements.checkoutModal.style.display = 'none';
    elements.cartModal.style.display = 'block';
  });
  elements.backToCartBtn.addEventListener('click', () => {
    elements.checkoutModal.style.display = 'none';
    elements.cartModal.style.display = 'block';
  });
  elements.confirmOrderBtn.addEventListener('click', submitOrder);
  elements.deliveryMethod.addEventListener('change', updateOrderSummary);

  // Поиск
  elements.searchBtn.addEventListener('click', searchItems);
  elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchItems();
  });
  elements.searchInput.addEventListener('input', (e) => {
    if (e.target.value.trim() === '') renderItems();
  });
}

function updateOrderSummary() {
  const deliveryCost = elements.deliveryMethod.value === 'delivery' ? CONFIG.DELIVERY_COST : 0;
  const total = state.cart.reduce((sum, item) => sum + Number(item.price), 0);
  elements.deliveryCostDisplay.textContent = `${deliveryCost} ₽`;
  elements.totalToPay.textContent = `${total + deliveryCost} ₽`;
}

function searchItems() {
  const term = elements.searchInput.value.toLowerCase().trim();
  if (!term) {
    renderItems();
    return;
  }

  const filtered = state.items.filter(item => 
    item.name.toLowerCase().includes(term) || 
    (item.size && item.size.toLowerCase().includes(term))
  );

  elements.itemsContainer.innerHTML = filtered.length ? filtered.map(item => `
    <div class="item">
      <img src="${item.image}" alt="${item.name}" class="item-image">
      <div class="item-info">
        <h3>${item.name}</h3>
        <p>${item.price} ₽</p>
        <p>Размер: ${item.size || 'не указан'}</p>
        <button class="buy-button ${isInCart(item) ? 'in-cart' : ''}" 
                data-name="${item.name}" 
                data-price="${item.price}" 
                data-size="${item.size || ''}">
          ${isInCart(item) ? '✓ В корзине' : 'В корзину'}
        </button>
      </div>
    </div>
  `).join('') : `
    <div class="no-results">
      <p>Товары не найдены</p>
      <button onclick="renderItems()">Показать все</button>
    </div>
  `;
}

function showLoading(show) {
  elements.loadingIndicator.style.display = show ? 'flex' : 'none';
}

// Глобальные функции
window.renderItems = renderItems;

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(init, 1000);
});
const CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzI9zOhivLi4RClLlDkl7xqOQEIlWLUOIldaVwGZzOFgcG50AwFBsyfDQ2W7twPRp59eA/exec',
  TIMEOUT: 10000
};

// Проверка Telegram WebApp
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
  event.target.textContent = '✓ В корзине';
  event.target.classList.add('in-cart');
  event.target.disabled = true;
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
  elements.deliveryMethod.addEventListener('change', () => {
    const deliveryCost = elements.deliveryMethod.value === 'delivery' ? state.deliveryCost : 0;
    elements.deliveryCostDisplay.textContent = `${deliveryCost} ₽`;
    const total = state.cart.reduce((sum, item) => sum + Number(item.price), 0);
    elements.totalToPay.textContent = `${total + deliveryCost} ₽`;
  });
}

document.addEventListener('DOMContentLoaded', init);
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
const CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzI9zOhivLi4RClLlDkl7xqOQEIlWLUOIldaVwGZzOFgcG50AwFBsyfDQ2W7twPRp59eA/exec',
  TIMEOUT: 10000,
  DELIVERY_COST: 440
};

// Инициализация Telegram WebApp
function initTelegramWebApp() {
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
  
  try {
    tg.expand();
    tg.enableClosingConfirmation();
    if (tg.MainButton?.hide) tg.MainButton.hide();
  } catch (e) {
    console.error("WebApp init error:", e);
  }

  if (tg.isMobile) {
    document.documentElement.classList.add('mobile-telegram');
    setTimeout(() => {
      document.body.style.display = 'none';
      document.body.offsetHeight;
      document.body.style.display = 'block';
    }, 100);
  }

  return tg;
}

const tg = initTelegramWebApp();
console.log("Telegram WebApp initialized:", tg);

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
  loadingIndicator: document.getElementById('loadingIndicator'),
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  errorContainer: document.getElementById('errorContainer')
};

async function loadItems() {
  if (state.isLoading) return;
  state.isLoading = true;
  showLoading(true);

  try {
    const response = await fetch(`${CONFIG.SCRIPT_URL}?t=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Invalid data format");
    
    state.items = data.filter(item => item?.name && !isNaN(item.price));
    renderItems();
  } catch (error) {
    console.error('Load error:', error);
    showError("Ошибка загрузки товаров. Пожалуйста, попробуйте позже.");
    tg.showAlert("Ошибка загрузки товаров");
  } finally {
    state.isLoading = false;
    showLoading(false);
  }
}

function renderItems(items = state.items) {
  elements.itemsContainer.innerHTML = items.map(item => `
    <div class="item">
      <img src="${item.image}" alt="${item.name}" class="item-image" onerror="this.src='placeholder.jpg'">
      <div class="item-info">
        <h3>${item.name}</h3>
        <p>${item.price} ₽</p>
        <p>Размер: ${item.size || 'не указан'}</p>
        <button class="buy-button ${isInCart(item) ? 'in-cart' : ''}" 
                data-id="${item.name}-${item.price}-${item.size}">
          ${isInCart(item) ? '✓ В корзине' : 'В корзину'}
        </button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.buy-button').forEach(btn => {
    btn.addEventListener('click', function() {
      const item = items.find(i => `${i.name}-${i.price}-${i.size}` === this.dataset.id);
      if (item) toggleCartItem(item);
    });
  });
}

function toggleCartItem(item) {
  if (isInCart(item)) {
    removeFromCart(item);
    tg.showAlert(`"${item.name}" удален из корзины`);
  } else {
    addToCart(item);
    tg.showAlert(`"${item.name}" добавлен в корзину`);
  }
}

function addToCart(item) {
  state.cart.push(item);
  updateCart();
  renderItems();
}

function removeFromCart(item) {
  state.cart = state.cart.filter(cartItem => 
    !(cartItem.name === item.name && 
      cartItem.price === item.price && 
      cartItem.size === item.size)
  );
  updateCart();
  renderItems();
}

function isInCart(item) {
  return state.cart.some(cartItem => 
    cartItem.name === item.name && 
    cartItem.price === item.price && 
    cartItem.size === item.size
  );
}

function updateCart() {
  try {
    localStorage.setItem('cart', JSON.stringify(state.cart));
  } catch (e) {
    console.error('Ошибка сохранения корзины:', e);
  }
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
      <button class="remove-item" data-id="${item.name}-${item.price}-${item.size}">✕</button>
    </div>
  `).join('');

  const total = state.cart.reduce((sum, item) => sum + Number(item.price), 0);
  elements.cartTotal.textContent = `${total} ₽`;

  document.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', function() {
      const item = state.cart.find(i => `${i.name}-${i.price}-${i.size}` === this.dataset.id);
      if (item) removeFromCart(item);
    });
  });
}

function showCheckoutForm() {
  const total = state.cart.reduce((sum, item) => sum + Number(item.price), 0);
  
  elements.cartModal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Оформление заказа</h2>
        <button id="closeCart" class="close-btn">&times;</button>
      </div>
      <form id="checkoutForm" class="checkout-form">
        <div class="form-group">
          <label>Способ оплаты:</label>
          <div class="radio-group">
            <label>
              <input type="radio" name="payment" value="card" checked>
              Перевод на карту
            </label>
            <label>
              <input type="radio" name="payment" value="crypto">
              Оплата криптовалютой
            </label>
          </div>
        </div>
        
        <div class="form-group">
          <label>Способ получения:</label>
          <div class="radio-group">
            <label>
              <input type="radio" name="delivery" value="delivery" checked>
              Доставка (${CONFIG.DELIVERY_COST} ₽)
            </label>
            <label>
              <input type="radio" name="delivery" value="pickup">
              Самовывоз (адрес уточнит администратор)
            </label>
          </div>
        </div>
        
        <div class="form-group">
          <label for="phone">Контактный телефон (+7...):</label>
          <input type="tel" id="phone" name="phone" pattern="^\+7\d{10}$" required>
        </div>
        
        <div class="form-group delivery-address">
          <label for="address">Адрес доставки (СДЭК):</label>
          <input type="text" id="address" name="address">
        </div>
        
        <div class="form-group">
          <label for="name">ФИО:</label>
          <input type="text" id="name" name="name" required>
        </div>
        
        <div class="form-group">
          <label for="telegram">Ваш Telegram:</label>
          <input type="text" id="telegram" name="telegram" required>
        </div>
        
        <div class="order-summary">
          <p>Итого: ${total} ₽</p>
          <p class="delivery-cost">Доставка: ${CONFIG.DELIVERY_COST} ₽</p>
          <p class="total-cost">К оплате: ${total + CONFIG.DELIVERY_COST} ₽</p>
        </div>
        
        <button type="submit" class="confirm-order-btn">Подтвердить заказ</button>
      </form>
    </div>
  `;

  openModal();

  document.querySelectorAll('input[name="delivery"]').forEach(radio => {
    radio.addEventListener('change', function() {
      const addressField = document.querySelector('.delivery-address');
      const deliveryCost = document.querySelector('.delivery-cost');
      const totalCost = document.querySelector('.total-cost');
      
      if (this.value === 'delivery') {
        addressField.style.display = 'block';
        deliveryCost.textContent = `Доставка: ${CONFIG.DELIVERY_COST} ₽`;
        totalCost.textContent = `К оплате: ${total + CONFIG.DELIVERY_COST} ₽`;
      } else {
        addressField.style.display = 'none';
        deliveryCost.textContent = 'Доставка: 0 ₽';
        totalCost.textContent = `К оплате: ${total} ₽`;
      }
    });
  });

  document.getElementById('checkoutForm').addEventListener('submit', function(e) {
    e.preventDefault();
    submitOrder(total);
  });
}

function submitOrder(itemsTotal) {
  const form = document.getElementById('checkoutForm');
  const formData = new FormData(form);
  
  const deliveryType = formData.get('delivery');
  const deliveryCost = deliveryType === 'delivery' ? CONFIG.DELIVERY_COST : 0;
  
  const orderData = {
    action: 'new_order',
    user: {
      name: formData.get('name'),
      phone: formData.get('phone'),
      telegram: formData.get('telegram').replace('@', '')
    },
    payment: formData.get('payment'),
    delivery: deliveryType,
    address: deliveryType === 'delivery' ? formData.get('address') : 'Самовывоз',
    cart: state.cart,
    subtotal: itemsTotal,
    delivery_cost: deliveryCost,
    total: itemsTotal + deliveryCost,
    initData: window.Telegram.WebApp.initData
  };
  
  console.log('Отправляемые данные:', orderData);
  
  try {
    if (typeof window.Telegram.WebApp.sendData !== 'function') {
      throw new Error('Функция sendData недоступна');
    }
    
    window.Telegram.WebApp.sendData(JSON.stringify(orderData));
    
    state.cart = [];
    updateCart();
    closeModal();
    
    window.Telegram.WebApp.close();
  } catch (e) {
    console.error('Ошибка отправки:', e);
    tg.showAlert(`⚠️ Ошибка: ${e.message}`);
  }
}

function setupEventListeners() {
  elements.cartBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    renderCart();
    openModal();
  });

  elements.closeCart?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeModal();
  });

  elements.cartModal?.addEventListener('click', (e) => {
    if (e.target === elements.cartModal) {
      closeModal();
    }
  });

  elements.checkoutBtn?.addEventListener('click', () => {
    if (state.cart.length === 0) {
      tg.showAlert("Корзина пуста!");
      return;
    }
    showCheckoutForm();
  });

  elements.searchBtn?.addEventListener('click', searchItems);
  elements.searchInput?.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') searchItems();
  });
}

function openModal() {
  elements.cartModal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  elements.cartModal.style.display = 'none';
  document.body.style.overflow = 'auto';
}

function searchItems() {
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
        <button class="retry-btn">Показать все товары</button>
      </div>
    `;
    document.querySelector('.retry-btn').addEventListener('click', renderItems);
    return;
  }

  renderItems(filteredItems);
}

function showLoading(show) {
  elements.loadingIndicator.style.display = show ? 'flex' : 'none';
}

function showError(message) {
  elements.errorContainer.textContent = message;
  elements.errorContainer.style.display = 'block';
  setTimeout(() => {
    elements.errorContainer.style.display = 'none';
  }, 5000);
}

function init() {
  loadItems();
  setupEventListeners();
  updateCart();
}

document.addEventListener('DOMContentLoaded', init);
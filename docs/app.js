const CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzI9zOhivLi4RClLlDkl7xqOQEIlWLUOIldaVwGZzOFgcG50AwFBsyfDQ2W7twPRp59eA/exec',
  TIMEOUT: 10000
};

// Улучшенная проверка инициализации WebApp
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
  
  // Безопасный вызов WebApp методов
  try {
    tg.expand();
    tg.enableClosingConfirmation();
    if (tg.MainButton?.hide) tg.MainButton.hide();
  } catch (e) {
    console.error("Ошибка инициализации WebApp:", e);
  }

  // Фикс для мобильных устройств
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
console.log("Telegram WebApp инициализирован:", tg);

const DELIVERY_COST = 440;

const state = {
  items: [],
  cart: [],
  isLoading: false
};

try {
  state.cart = JSON.parse(localStorage.getItem('cart')) || [];
} catch (e) {
  console.error('Ошибка чтения корзины:', e);
  state.cart = [];
}

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
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    
    if (!Array.isArray(data)) throw new Error("Invalid data format");
    
    state.items = data.filter(item => item?.name && !isNaN(item.price));
    renderItems();
  } catch (error) {
    console.error('Load error:', error);
    tg.showAlert("Ошибка загрузки товаров");
    showError("Ошибка загрузки товаров. Пожалуйста, попробуйте позже.");
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
      const item = items.find(i => 
        `${i.name}-${i.price}-${i.size}` === this.dataset.id
      );
      if (item) addToCart(item);
    });
  });
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
              Доставка (${DELIVERY_COST} ₽)
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
          <p class="delivery-cost">Доставка: ${DELIVERY_COST} ₽</p>
          <p class="total-cost">К оплате: ${total + DELIVERY_COST} ₽</p>
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
        deliveryCost.textContent = `Доставка: ${DELIVERY_COST} ₽`;
        totalCost.textContent = `К оплате: ${total + DELIVERY_COST} ₽`;
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
  

  const orderData = {
    action: 'new_order',
    user: {
      name: formData.get('name'),
      phone: formData.get('phone'),
      telegram: formData.get('telegram').replace('@', '')
    },
    payment: formData.get('payment'),
    delivery: formData.get('delivery'),
    address: formData.get('delivery') === 'delivery' ? formData.get('address') : 'Самовывоз',
    cart: state.cart,
    total: itemsTotal + (formData.get('delivery') === 'delivery' ? DELIVERY_COST : 0)
  };
  
  console.log('Отправляемые данные:', orderData);
  
  try {
    if (typeof tg.sendData !== 'function') {
      throw new Error('Функция sendData недоступна');
    }
    
    tg.sendData(JSON.stringify(orderData));
    console.log('Данные успешно отправлены');
    
    state.cart = [];
    updateCart();
    closeModal();
    tg.showAlert('✅ Заказ оформлен! С вами свяжутся для подтверждения.');
  } catch (e) {
    console.error('Ошибка отправки:', e);
    tg.showAlert(`⚠️ Ошибка: ${e.message}`);
  }
}

function setupEventListeners() {
  const clickEvent = 'ontouchstart' in window ? 'touchend' : 'click';
  
  elements.cartBtn?.addEventListener(clickEvent, (e) => {
    e.preventDefault();
    renderCart();
    openModal();
  });

  elements.closeCart?.addEventListener(clickEvent, (e) => {
    e.stopPropagation();
    closeModal();
  });

  elements.cartModal?.addEventListener(clickEvent, (e) => {
    if (e.target === elements.cartModal) {
      closeModal();
    }
  });

  elements.checkoutBtn?.addEventListener(clickEvent, () => {
    if (state.cart.length === 0) return;
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
}

window.removeFromCart = removeFromCart;

document.addEventListener('DOMContentLoaded', init);
tg.expand();
tg.enableClosingConfirmation();
tg.MainButton.hide();
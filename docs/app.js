const CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzI9zOhivLi4RClLlDkl7xqOQEIlWLUOIldaVwGZzOFgcG50AwFBsyfDQ2W7twPRp59eA/exec',
  TIMEOUT: 10000,
  BOT_TOKEN: '7717029640:AAFObdE7Zb0HIRU961M--BaenWsy83DUMCA',
  ADMIN_ID: 5000931101
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
  checkoutForm: document.getElementById('checkoutForm'),
  checkoutItemsTotal: document.getElementById('checkoutItemsTotal'),
  checkoutDelivery: document.getElementById('checkoutDelivery'),
  checkoutTotal: document.getElementById('checkoutTotal'),
  orderSuccessModal: document.getElementById('orderSuccessModal'),
  closeSuccess: document.getElementById('closeSuccess'),
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
    const data = await response.json();
    
    if (!Array.isArray(data)) throw new Error("Invalid data format");
    
    state.items = data.filter(item => item?.name && !isNaN(item.price));
    renderItems();
  } catch (error) {
    console.error('Load error:', error);
    showError("Ошибка загрузки товаров. Пожалуйста, попробуйте позже.");
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

  // Оформление заказа
  if (elements.checkoutBtn) {
    elements.checkoutBtn.addEventListener(clickEvent, () => {
      if (state.cart.length === 0) return;
      
      const itemsTotal = state.cart.reduce((sum, item) => sum + Number(item.price), 0);
      const delivery = 440;
      const total = itemsTotal + delivery;
      
      elements.checkoutItemsTotal.textContent = `${itemsTotal} ₽`;
      elements.checkoutDelivery.textContent = `${delivery} ₽`;
      elements.checkoutTotal.textContent = `${total} ₽`;
      
      elements.cartModal.style.display = 'none';
      elements.checkoutModal.style.display = 'block';
    });
  }
  
  if (elements.closeCheckout) {
    elements.closeCheckout.addEventListener(clickEvent, () => {
      elements.checkoutModal.style.display = 'none';
    });
  }
  
  if (elements.closeSuccess) {
    elements.closeSuccess.addEventListener(clickEvent, () => {
      elements.orderSuccessModal.style.display = 'none';
    });
  }
  
  // Форма заказа
  if (elements.checkoutForm) {
    elements.checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(elements.checkoutForm);
      const itemsTotal = state.cart.reduce((sum, item) => sum + Number(item.price), 0);
      const deliveryCost = formData.get('delivery') === 'delivery' ? 440 : 0;
      const total = itemsTotal + deliveryCost;
      
      const orderData = {
        payment: formData.get('payment'),
        delivery: formData.get('delivery'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        name: formData.get('name'),
        telegram: formData.get('telegram'),
        items: state.cart,
        itemsTotal: itemsTotal,
        deliveryCost: deliveryCost,
        total: total
      };
      
      try {
        await sendOrderToBot(orderData);
        
        elements.checkoutModal.style.display = 'none';
        elements.orderSuccessModal.style.display = 'block';
        
        state.cart = [];
        updateCart();
        renderItems();
      } catch (error) {
        console.error('Ошибка отправки заказа:', error);
        tg.showAlert('Ошибка оформления заказа. Попробуйте позже.');
      }
    });
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
  
  // Обновление стоимости доставки
  document.querySelectorAll('input[name="delivery"]').forEach(radio => {
    radio.addEventListener('change', function() {
      const deliveryCost = this.value === 'delivery' ? 440 : 0;
      const itemsTotal = state.cart.reduce((sum, item) => sum + Number(item.price), 0);
      const total = itemsTotal + deliveryCost;
      
      elements.checkoutDelivery.textContent = this.value === 'delivery' ? '440 ₽' : 'Бесплатно';
      elements.checkoutTotal.textContent = `${total} ₽`;
    });
  });
}

async function sendOrderToBot(orderData) {
  const orderText = `
📦 <b>НОВЫЙ ЗАКАЗ</b>

👤 <b>Клиент:</b> ${escapeHtml(orderData.name)}
📞 <b>Телефон:</b> ${escapeHtml(orderData.phone)}
📱 <b>Telegram:</b> ${orderData.telegram ? escapeHtml(orderData.telegram) : 'не указан'}
📍 <b>Адрес:</b> ${escapeHtml(orderData.address)}

💳 <b>Способ оплаты:</b> ${orderData.payment === 'card' ? 'Перевод на карту' : 'Криптовалюта'}
🚚 <b>Доставка:</b> ${orderData.delivery === 'delivery' ? 'Доставка (+440 ₽)' : 'Самовывоз'}

🛒 <b>Товары (${orderData.items.length}):</b>
${orderData.items.map(item => `• ${escapeHtml(item.name)} - ${item.price} ₽ (${item.size || 'без размера'})`).join('\n')}

💰 <b>Итого:</b> ${orderData.itemsTotal} ₽
🚚 <b>Доставка:</b> ${orderData.deliveryCost} ₽
💵 <b>К оплате:</b> ${orderData.total} ₽
  `;
  
  try {
    // Пытаемся отправить через WebApp
    tg.sendData(JSON.stringify({
      type: 'new_order',
      order: orderText
    }));
    
    return true;
  } catch (error) {
    console.error('Ошибка отправки через WebApp:', error);
    throw error;
  }
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

function showLoading(show) {
  elements.loadingIndicator.style.display = show ? 'flex' : 'none';
}

function showError(message) {
  elements.errorContainer.innerHTML = `
    <div class="error-message">${message}</div>
    <button class="retry-btn" onclick="loadItems()">Попробовать снова</button>
  `;
  elements.errorContainer.style.display = 'block';
}

function escapeHtml(unsafe) {
  return unsafe?.replace(/</g, "&lt;").replace(/>/g, "&gt;") || '';
}

// Глобальные функции
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.renderItems = renderItems;

// Запуск
document.addEventListener('DOMContentLoaded', init);
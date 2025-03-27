const CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzI9zOhivLi4RClLlDkl7xqOQEIlWLUOIldaVwGZzOFgcG50AwFBsyfDQ2W7twPRp59eA/exec',
  DELIVERY_COST: 440
};

// Проверка WebApp Telegram
if (!window.Telegram?.WebApp?.initData) {
  document.body.innerHTML = `
    <div style="padding:40px;text-align:center;">
      <h2>Откройте приложение через Telegram</h2>
      <button onclick="window.location.href='https://t.me/outfitlaab_bot'" 
              style="margin-top:20px;padding:10px 20px;background:#6c5ce7;color:white;border:none;border-radius:8px;">
        Открыть в Telegram
      </button>
    </div>
  `;
  throw new Error("Not in Telegram WebApp");
}

const tg = window.Telegram.WebApp;
tg.expand();
tg.enableClosingConfirmation();

const state = {
  items: [],
  cart: JSON.parse(localStorage.getItem('cart')) || [],
  formData: null
};

const elements = {
  itemsContainer: document.getElementById('itemsContainer'),
  cartBtn: document.getElementById('cartBtn'),
  cartCounter: document.getElementById('cartCounter'),
  cartModal: document.getElementById('cartModal'),
  closeCart: document.getElementById('closeCart'),
  checkoutBtn: document.getElementById('checkoutBtn'),
  loadingIndicator: document.getElementById('loadingIndicator'),
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn')
};

// Инициализация приложения
function init() {
  loadItems();
  setupEventListeners();
  updateCart();
  
  // Закрытие клавиатуры при клике вне полей
  document.addEventListener('click', (e) => {
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
      document.activeElement?.blur();
    }
  });
}

// Загрузка товаров
async function loadItems() {
  state.isLoading = true;
  showLoading(true);

  try {
    const response = await fetch(`${CONFIG.SCRIPT_URL}?t=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
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

// Работа с корзиной
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

function removeFromCart(index) {
  state.cart.splice(index, 1);
  updateCart();
  renderCart();
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
  localStorage.setItem('cart', JSON.stringify(state.cart));
  elements.cartCounter.textContent = state.cart.length;
}

function calculateTotal() {
  return state.cart.reduce((sum, item) => sum + Number(item.price), 0);
}

// Модальные окна
function openModal(content = 'cart') {
  if (content === 'cart') {
    renderCartView();
  } else if (content === 'checkout') {
    renderCheckoutForm();
  }
  elements.cartModal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  elements.cartModal.style.display = 'none';
  document.body.style.overflow = 'auto';
}

// Просмотр корзины
function renderCartView() {
  const total = calculateTotal();
  
  elements.cartModal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Ваша корзина</h2>
        <button class="close-btn">&times;</button>
      </div>
      <div class="cart-items-list">
        ${state.cart.map((item, i) => `
          <div class="cart-item">
            <img src="${item.image}" width="60" height="60">
            <div>
              <h4>${item.name}</h4>
              <p>${item.price} ₽ • ${item.size || 'без размера'}</p>
            </div>
            <button class="remove-item" data-index="${i}">✕</button>
          </div>
        `).join('')}
      </div>
      <div class="cart-footer">
        <div class="total-price">
          <span>Итого:</span>
          <span>${total} ₽</span>
        </div>
        <button class="checkout-btn">Оформить заказ</button>
      </div>
    </div>
  `;

  document.querySelector('.close-btn').addEventListener('click', closeModal);
  document.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      removeFromCart(e.target.dataset.index);
    });
  });
  document.querySelector('.checkout-btn').addEventListener('click', () => {
    renderCheckoutForm();
  });
}

// Форма оформления заказа
function renderCheckoutForm() {
  const total = calculateTotal();
  
  elements.cartModal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <button class="back-btn">← Корзина</button>
        <h2>Оформление заказа</h2>
        <button class="close-btn">&times;</button>
      </div>
      <form id="checkoutForm" class="checkout-form">
        <div class="form-group">
          <label>Способ оплаты</label>
          <div class="radio-group">
            <label><input type="radio" name="payment" value="card" checked> Перевод на карту</label>
            <label><input type="radio" name="payment" value="crypto"> Криптовалюта</label>
          </div>
        </div>
        
        <div class="form-group">
          <label>Доставка</label>
          <div class="radio-group">
            <label><input type="radio" name="delivery" value="delivery" checked> Доставка (${CONFIG.DELIVERY_COST} ₽)</label>
            <label><input type="radio" name="delivery" value="pickup"> Самовывоз</label>
          </div>
        </div>
        
        <div class="form-group">
          <input type="tel" name="phone" placeholder="Телефон (+7...)" required pattern="^\+7\d{10}$">
        </div>
        
        <div class="form-group">
          <input type="text" name="name" placeholder="ФИО" required>
        </div>
        
        <div class="form-group delivery-address">
          <input type="text" name="address" placeholder="Адрес доставки (СДЭК)">
        </div>
        
        <div class="form-group">
          <input type="text" name="telegram" placeholder="Telegram @username" required>
        </div>
        
        <div class="order-summary">
          <p>Товары: <span>${total} ₽</span></p>
          <p class="delivery-fee">Доставка: <span>${CONFIG.DELIVERY_COST} ₽</span></p>
          <p class="total-price">Итого: <span>${total + CONFIG.DELIVERY_COST} ₽</span></p>
        </div>
        
        <button type="submit" class="submit-btn">Подтвердить заказ</button>
      </form>
    </div>
  `;

  // Восстановление данных формы
  if (state.formData) {
    Object.entries(state.formData).forEach(([name, value]) => {
      const field = document.querySelector(`[name="${name}"]`);
      if (field) field.value = value;
    });
  }

  // Обработчики событий
  document.querySelector('.back-btn').addEventListener('click', () => {
    saveFormData();
    renderCartView();
  });

  document.querySelector('.close-btn').addEventListener('click', closeModal);

  document.querySelectorAll('input[name="delivery"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const addressField = document.querySelector('.delivery-address');
      const deliveryFee = document.querySelector('.delivery-fee span');
      const totalPrice = document.querySelector('.total-price span');
      
      if (e.target.value === 'delivery') {
        addressField.style.display = 'block';
        deliveryFee.textContent = `${CONFIG.DELIVERY_COST} ₽`;
        totalPrice.textContent = `${total + CONFIG.DELIVERY_COST} ₽`;
      } else {
        addressField.style.display = 'none';
        deliveryFee.textContent = '0 ₽';
        totalPrice.textContent = `${total} ₽`;
      }
    });
  });

  document.getElementById('checkoutForm').addEventListener('submit', (e) => {
    e.preventDefault();
    submitOrder();
  });
}

function saveFormData() {
  const form = document.getElementById('checkoutForm');
  if (!form) return;
  
  state.formData = {
    payment: form.elements.payment.value,
    delivery: form.elements.delivery.value,
    phone: form.elements.phone.value,
    name: form.elements.name.value,
    address: form.elements.address?.value,
    telegram: form.elements.telegram.value
  };
}

function submitOrder() {
  const form = document.getElementById('checkoutForm');
  const formData = new FormData(form);
  
  // Валидация телефона
  const phone = formData.get('phone');
  if (!/^\+7\d{10}$/.test(phone)) {
    tg.showAlert("Введите корректный номер телефона (+7XXXXXXXXXX)");
    return;
  }

  // Подготовка данных заказа
  const deliveryType = formData.get('delivery');
  const deliveryCost = deliveryType === 'delivery' ? CONFIG.DELIVERY_COST : 0;
  const total = calculateTotal() + deliveryCost;

  const orderText = `
📦 <b>Новый заказ</b>

👤 <b>Клиент:</b> ${formData.get('name')}
📱 <b>Телефон:</b> ${phone}
✈️ <b>Telegram:</b> @${formData.get('telegram').replace('@', '')}

💳 <b>Оплата:</b> ${formData.get('payment') === 'card' ? 'Карта' : 'Криптовалюта'}
🚚 <b>Доставка:</b> ${deliveryType === 'delivery' ? `Доставка (${deliveryCost} ₽)` : 'Самовывоз'}
${deliveryType === 'delivery' ? `📍 <b>Адрес:</b> ${formData.get('address')}\n` : ''}

🛍️ <b>Заказ:</b>
${state.cart.map(item => `- ${item.name} (${item.size || 'без размера'}) - ${item.price} ₽`).join('\n')}

💰 <b>Итого:</b> ${total} ₽
  `;

  try {
    tg.sendData(JSON.stringify({
      action: 'new_order',
      order: orderText,
      user: {
        name: formData.get('name'),
        phone: phone,
        telegram: formData.get('telegram')
      },
      cart: state.cart,
      total: total
    }));

    // Очистка после успешной отправки
    state.cart = [];
    state.formData = null;
    updateCart();
    closeModal();
    tg.showAlert('✅ Заказ оформлен! Ожидайте звонка.');
  } catch (e) {
    console.error('Ошибка отправки:', e);
    tg.showAlert('❌ Ошибка при отправке заказа');
  }
}

// Поиск товаров
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

  renderItems(filteredItems);
}

// Настройка обработчиков событий
function setupEventListeners() {
  elements.cartBtn.addEventListener('click', () => openModal('cart'));
  elements.searchBtn.addEventListener('click', searchItems);
  elements.searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') searchItems();
  });
}

// Вспомогательные функции
function showLoading(show) {
  elements.loadingIndicator.style.display = show ? 'flex' : 'none';
}

function showError(message) {
  const errorContainer = document.getElementById('errorContainer');
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
  }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', init);
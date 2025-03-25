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

async function loadItems() {
  if (state.isLoading) return;
  
  state.isLoading = true;
  showLoading(true);

  try {
    console.log('Пытаюсь загрузить товары из:', CONFIG.SCRIPT_URL);
    const response = await fetch(`${CONFIG.SCRIPT_URL}?t=${Date.now()}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Получены данные:', data);
    
    if (!Array.isArray(data)) {
      throw new Error("Данные не являются массивом");
    }
    
    state.items = data.filter(item => item?.name && !isNaN(item.price));
    console.log('Отфильтрованные товары:', state.items);
    
    if (state.items.length === 0) {
      console.warn('Нет товаров после фильтрации');
    }
    
    renderItems();
  } catch (error) {
    console.error('Ошибка загрузки:', error);
    tg.showAlert("Ошибка загрузки товаров. Проверьте консоль для деталей.");
    
    // Показываем кнопку повтора
    elements.errorContainer.style.display = 'block';
    elements.errorContainer.innerHTML = `
      <div class="error-message">Не удалось загрузить товары</div>
      <button class="retry-btn" onclick="loadItems()">Повторить попытку</button>
    `;
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
                onclick="addToCart('${escapeString(item.name)}', ${item.price}, '${escapeString(item.size || '')}')"
                ${isInCart(item) ? 'disabled' : ''}>
          ${isInCart(item) ? '✓ В корзине' : 'В корзину'}
        </button>
      </div>
    </div>
  `).join('');
}

function escapeString(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
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
  
  // Обновляем все кнопки для этого товара
  document.querySelectorAll('.item').forEach(el => {
    if (el.querySelector('h3').textContent === name) {
      const btn = el.querySelector('.buy-button');
      btn.textContent = '✓ В корзине';
      btn.classList.add('in-cart');
      btn.disabled = true;
    }
  });
  
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
  const removedItem = state.cart[index];
  state.cart.splice(index, 1);
  updateCart();
  renderCart();
  
  // Обновляем кнопки для удаленного товара
  document.querySelectorAll('.item').forEach(el => {
    if (el.querySelector('h3').textContent === removedItem.name) {
      const btn = el.querySelector('.buy-button');
      btn.textContent = 'В корзину';
      btn.classList.remove('in-cart');
      btn.disabled = false;
    }
  });
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
    
    // Очищаем корзину и обновляем кнопки
    state.cart.forEach(item => {
      document.querySelectorAll('.item').forEach(el => {
        if (el.querySelector('h3').textContent === item.name) {
          const btn = el.querySelector('.buy-button');
          btn.textContent = 'В корзину';
          btn.classList.remove('in-cart');
          btn.disabled = false;
        }
      });
    });
    
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
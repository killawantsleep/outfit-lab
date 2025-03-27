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
if (tg.isMobile) {
  document.documentElement.classList.add('mobile-telegram');
  
  // Фикс для обновления layout
  setTimeout(() => {
    document.body.style.display = 'none';
    document.body.offsetHeight;
    document.body.style.display = 'block';
  }, 100);
}

// Обновите функцию renderItems():
function renderItems(items = state.items) {
  elements.itemsContainer.innerHTML = items.map(item => `
    <div class="item">
      <img src="${item.image}" alt="${item.name}" class="item-image" 
           onerror="this.src='placeholder.jpg';this.onerror=null;">
      <div class="item-info">
        <h3 class="item-name">${item.name}</h3>
        <p class="item-price">${item.price} ₽</p>
        <p class="item-size">Размер: ${item.size || 'не указан'}</p>
        <button class="buy-button ${isInCart(item) ? 'in-cart' : ''}" 
                data-id="${item.name}-${item.price}-${item.size || ''}">
          ${isInCart(item) ? '✓ В корзине' : 'В корзину'}
        </button>
      </div>
    </div>
  `).join('');

  // Фикс для кликов в мобильном Telegram
  document.querySelectorAll('.buy-button').forEach(btn => {
    btn.addEventListener('click', function() {
      const itemId = this.dataset.id;
      const item = items.find(i => 
        `${i.name}-${i.price}-${i.size || ''}` === itemId
      );
      if (item) {
        addToCart(item);
        if (tg.isMobile) {
          // Принудительное обновление кнопки
          this.classList.add('in-cart');
          this.textContent = '✓ В корзине';
        }
      }
    });
  });
}
tg.expand();
tg.enableClosingConfirmation();
tg.MainButton.hide();

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
  searchBtn: document.getElementById('searchBtn')
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

function setupEventListeners() {
  const clickEvent = 'ontouchstart' in window ? 'touchend' : 'click';
  
  // Кнопка корзины
  elements.cartBtn?.addEventListener(clickEvent, (e) => {
    e.preventDefault();
    renderCart();
    openModal();
  });

  // Закрытие корзины
  elements.closeCart?.addEventListener(clickEvent, (e) => {
    e.stopPropagation();
    closeModal();
  });

  // Закрытие по клику вне области
  elements.cartModal?.addEventListener(clickEvent, (e) => {
    if (e.target === elements.cartModal) {
      closeModal();
    }
  });

  // Оформление заказа
  elements.checkoutBtn?.addEventListener(clickEvent, () => {
    if (state.cart.length === 0) return;
    
    const total = state.cart.reduce((sum, item) => sum + Number(item.price), 0);
    const orderText = state.cart.map(item => 
      `• ${item.name} - ${item.price} ₽ (${item.size || 'без размера'})`
    ).join('\n');
    
    tg.showAlert(`Ваш заказ:\n\n${orderText}\n\nИтого: ${total} ₽`);
    
    state.cart = [];
    updateCart();
    renderItems();
    closeModal();
  });

  // Поиск
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

// Глобальные функции
window.removeFromCart = removeFromCart;

// Запуск
document.addEventListener('DOMContentLoaded', init);
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
  // Принудительно показываем кнопку
  const cartContainer = document.getElementById('cartButtonContainer');
  if (cartContainer) {
    cartContainer.style.display = 'block';
    cartContainer.style.opacity = '1';
    cartContainer.style.visibility = 'visible';
  }

  loadItems();
  setupEventListeners();
  updateCart();
  setupScrollHandler();
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
        <p class="price">${item.price} ₽</p>
        <p class="size">Размер: ${item.size || 'не указан'}</p>
        <button class="buy-button ${isInCart(item) ? 'in-cart' : ''}" 
                data-id="${item.name}-${item.price}-${item.size}">
          ${isInCart(item) ? '✓ В корзине' : 'В корзину'}
        </button>
      </div>
    </div>
  `).join('');

  // Добавляем обработчики для всех кнопок
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
  const fragment = document.createDocumentFragment();
  
  state.cart.forEach((item, index) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';
    itemEl.innerHTML = `
      <img src="${escapeHtml(item.image)}" width="60" height="60" style="border-radius:8px;" onerror="this.src='placeholder.jpg'">
      <div>
        <h4>${escapeHtml(item.name)}</h4>
        <p>${escapeHtml(item.price)} ₽ • ${escapeHtml(item.size || 'без размера')}</p>
      </div>
      <button class="remove-item">✕</button>
    `;
    
    const btn = itemEl.querySelector('.remove-item');
    btn.addEventListener('click', () => removeFromCart(index));
    fragment.appendChild(itemEl);
  });

  elements.cartItems.innerHTML = '';
  elements.cartItems.appendChild(fragment);

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
    elements.cartModal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Блокируем скролл основного контента
  });

  // Закрытие корзины
  elements.closeCart?.addEventListener(clickEvent, () => {
    elements.cartModal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Восстанавливаем скролл
  });


  // Оформление заказа
  elements.checkoutBtn?.addEventListener(clickEvent, () => {
    if (state.cart.length === 0) return;
    
    const total = state.cart.reduce((sum, item) => sum + Number(item.price), 0);
    const orderText = state.cart.map(item => 
      `• ${escapeHtml(item.name)} - ${item.price} ₽ (${item.size || 'без размера'})`
    ).join('\n');
    
    tg.showAlert(`Ваш заказ:\n\n${orderText}\n\nИтого: ${total} ₽`);
    
    state.cart = [];
    updateCart();
    renderItems();
    elements.cartModal.style.display = 'none';
  });

  // Поиск
  elements.searchBtn?.addEventListener('click', searchItems);
  elements.searchInput?.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') searchItems();
  });
  elements.searchInput?.addEventListener('input', (e) => {
    if (e.target.value.trim() === '') renderItems();
  });
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
        <p>Товары по запросу "${escapeHtml(searchTerm)}" не найдены</p>
        <button class="retry-btn">Показать все товары</button>
      </div>
    `;
    document.querySelector('.retry-btn').addEventListener('click', renderItems);
    return;
  }

  renderItems(filteredItems);
}

function setupScrollHandler() {
  const cartContainer = document.querySelector('.cart-btn-fixed');
  if (!cartContainer) return;

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      document.body.classList.add('show-cart');
      document.body.classList.remove('hide-cart');
    } else {
      document.body.classList.add('hide-cart');
      document.body.classList.remove('show-cart');
    }
  }, {
    root: null,
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  observer.observe(cartContainer);
}

function showLoading(show) {
  elements.loadingIndicator.style.display = show ? 'flex' : 'none';
}

function showError(message) {
  elements.errorContainer.textContent = message;
  elements.errorContainer.style.display = 'block';
}

function escapeHtml(unsafe) {
  return unsafe?.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;") || '';
}

// Запуск
document.addEventListener('DOMContentLoaded', init);
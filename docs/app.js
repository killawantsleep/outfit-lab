const CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzI9zOhivLi4RClLlDkl7xqOQEIlWLUOIldaVwGZzOFgcG50AwFBsyfDQ2W7twPRp59eA/exec',
  TIMEOUT: 20000
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
  isLoading: false,
  error: null
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
  setupEventListeners();
  updateCart();
  loadItems();
}

async function loadItems() {
  if (state.isLoading) return;
  
  state.isLoading = true;
  state.error = null;
  showLoading(true);
  clearError();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
    
    const response = await fetch(`${CONFIG.SCRIPT_URL}?t=${Date.now()}`, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);
    
    const data = await response.json();
    
    if (!Array.isArray(data)) throw new Error("Данные не в формате массива");
    
    state.items = data
      .map(item => ({
        name: String(item.name || '').trim() || null,
        price: Math.max(0, Number(item.price) || 0),
        size: String(item.size || 'не указан').trim(),
        image: String(item.image || 'placeholder.jpg').trim()
      }))
      .filter(item => item.name !== null);
    
    if (state.items.length === 0) {
      showError("Нет доступных товаров");
    } else {
      renderItems();
    }
  } catch (error) {
    console.error('Ошибка загрузки:', error);
    state.error = error;
    showError(`Ошибка загрузки: ${error.message}`);
  } finally {
    state.isLoading = false;
    showLoading(false);
  }
}

function renderItems(items = state.items) {
  if (items.length === 0) {
    elements.itemsContainer.innerHTML = `
      <div class="no-items">
        <p>Товары не найдены</p>
        <button class="retry-btn" onclick="loadItems()">Попробовать снова</button>
      </div>
    `;
    return;
  }

  elements.itemsContainer.innerHTML = items.map(item => `
    <div class="item">
      <img src="${item.image}" alt="${item.name}" class="item-image" onerror="this.src='placeholder.jpg';this.onerror=null;">
      <div class="item-info">
        <h3 class="item-name">${item.name}</h3>
        <p class="item-price">${item.price.toFixed(2)} ₽</p>
        <p class="item-size">Размер: ${item.size}</p>
        <button class="buy-button ${isInCart(item) ? 'in-cart' : ''}" 
                data-id="${encodeURIComponent(item.name)}-${item.price}-${encodeURIComponent(item.size)}">
          ${isInCart(item) ? '✓ В корзине' : 'В корзину'}
        </button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.buy-button').forEach(btn => {
    btn.addEventListener('click', function() {
      const item = items.find(i => 
        `${encodeURIComponent(i.name)}-${i.price}-${encodeURIComponent(i.size)}` === this.dataset.id
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

function showLoading(show) {
  elements.loadingIndicator.style.display = show ? 'flex' : 'none';
}

function showError(message) {
  elements.errorContainer.innerHTML = `
    <p>${message}</p>
    <button class="retry-btn" onclick="loadItems()">Попробовать снова</button>
  `;
  elements.errorContainer.style.display = 'block';
}

function clearError() {
  elements.errorContainer.style.display = 'none';
}

function setupEventListeners() {
  elements.cartBtn?.addEventListener('click', () => {
    renderCart();
    openModal();
  });

  elements.closeCart?.addEventListener('click', closeModal);
  elements.checkoutBtn?.addEventListener('click', checkout);
  elements.searchBtn?.addEventListener('click', searchItems);
  elements.searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchItems();
  });
}

function renderCart() {
  elements.cartItems.innerHTML = state.cart.map((item, index) => `
    <div class="cart-item">
      <img src="${item.image}" width="60" height="60" style="border-radius:8px;">
      <div>
        <h4>${item.name}</h4>
        <p>${item.price} ₽ • ${item.size}</p>
      </div>
      <button class="remove-item" onclick="removeFromCart(${index})">✕</button>
    </div>
  `).join('');

  const total = state.cart.reduce((sum, item) => sum + Number(item.price), 0);
  elements.cartTotal.textContent = `${total.toFixed(2)} ₽`;
}

function removeFromCart(index) {
  state.cart.splice(index, 1);
  updateCart();
  renderCart();
  renderItems();
}

function checkout() {
  if (state.cart.length === 0) return;
  
  const total = state.cart.reduce((sum, item) => sum + Number(item.price), 0);
  const orderText = state.cart.map(item => 
    `• ${item.name} - ${item.price} ₽ (${item.size})`
  ).join('\n');
  
  tg.showAlert(`Ваш заказ:\n\n${orderText}\n\nИтого: ${total.toFixed(2)} ₽`);
  state.cart = [];
  updateCart();
  renderItems();
  closeModal();
}

function searchItems() {
  const term = elements.searchInput.value.toLowerCase().trim();
  if (!term) return renderItems();
  
  const filtered = state.items.filter(item => 
    item.name.toLowerCase().includes(term) || 
    item.size.toLowerCase().includes(term)
  );
  renderItems(filtered.length > 0 ? filtered : []);
}

function openModal() {
  elements.cartModal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  elements.cartModal.style.display = 'none';
  document.body.style.overflow = 'auto';
}

// Глобальные функции
window.removeFromCart = removeFromCart;
window.loadItems = loadItems;

document.addEventListener('DOMContentLoaded', init);
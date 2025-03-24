// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Состояние приложения
const state = {
  items: [],
  cart: loadCart()
};

// DOM элементы
const elements = {
  itemsContainer: document.getElementById('itemsContainer'),
  cartBtn: document.getElementById('cartBtn'),
  cartCounter: document.getElementById('cartCounter'),
  cartModal: document.getElementById('cartModal'),
  cartItems: document.getElementById('cartItems'),
  cartTotal: document.getElementById('cartTotal'),
  closeCart: document.getElementById('closeCart'),
  checkoutBtn: document.getElementById('checkoutBtn'),
  mobileNotice: document.getElementById('mobileNotice')
};

// Инициализация
function init() {
  setupEventListeners();
  loadItems();
  updateCartUI();
  
  // Проверка мобильного устройства
  if (/Mobi|Android/i.test(navigator.userAgent)) {
    elements.mobileNotice.style.display = 'block';
  }
}

// Загрузка товаров
async function loadItems() {
  try {
    const response = await fetch('https://script.google.com/macros/s/AKfycbzI9zOhivLi4RClLlDkl7xqOQEIlWLUOIldaVwGZzOFgcG50AwFBsyfDQ2W7twPRp59eA/exec');
    state.items = await response.json();
    renderItems();
  } catch (error) {
    console.error('Ошибка загрузки:', error);
    renderError();
  }
}

// Рендер товаров
function renderItems() {
  elements.itemsContainer.innerHTML = state.items.map(item => `
    <div class="item">
      <img src="${item.image}" alt="${item.name}" class="item-image">
      <div class="item-info">
        <h3>${item.name}</h3>
        <p class="price">${Number(item.price).toLocaleString('ru-RU')} ₽</p>
        <p>Размер: ${item.size || 'не указан'}</p>
        <button class="buy-button" onclick="addToCart(${state.items.indexOf(item)})">
          В корзину
        </button>
      </div>
    </div>
  `).join('');
}

// Работа с корзиной
function loadCart() {
  try {
    // Пробуем получить из localStorage
    const localCart = localStorage.getItem('cart');
    if (localCart) return JSON.parse(localCart);
    
    // Пробуем получить из Telegram CloudStorage
    if (tg?.WebApp?.CloudStorage?.getItem) {
      const tgCart = tg.WebApp.CloudStorage.getItem('cart');
      return tgCart ? JSON.parse(tgCart) : [];
    }
    
    return [];
  } catch (e) {
    console.error('Ошибка загрузки корзины:', e);
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem('cart', JSON.stringify(state.cart));
    
    // Дублируем в Telegram CloudStorage
    if (tg?.WebApp?.CloudStorage?.setItem) {
      tg.WebApp.CloudStorage.setItem('cart', JSON.stringify(state.cart));
    }
  } catch (e) {
    console.error('Ошибка сохранения корзины:', e);
  }
  updateCartUI();
}

function addToCart(itemIndex) {
  const item = state.items[itemIndex];
  state.cart.push(item);
  saveCart();
  
  // Визуальная обратная связь
  if (event) {
    event.target.textContent = '✓ Добавлено';
    event.target.style.backgroundColor = '#00b894';
    setTimeout(() => {
      event.target.textContent = 'В корзину';
      event.target.style.backgroundColor = '';
    }, 1000);
  }
  
  tg.showAlert(`"${item.name}" добавлен в корзину`);
}

function removeFromCart(index) {
  state.cart.splice(index, 1);
  saveCart();
  renderCart();
}

function updateCartUI() {
  elements.cartCounter.textContent = state.cart.length;
  tg.MainButton.setText(`Корзина (${state.cart.length})`);
  state.cart.length > 0 ? tg.MainButton.show() : tg.MainButton.hide();
}

// Рендер корзины
function renderCart() {
  elements.cartItems.innerHTML = state.cart.map((item, index) => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}">
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <p>${Number(item.price).toLocaleString('ru-RU')} ₽ • ${item.size || 'без размера'}</p>
      </div>
      <button class="remove-item" onclick="removeFromCart(${index})">✕</button>
    </div>
  `).join('');
  
  const total = state.cart.reduce((sum, item) => sum + Number(item.price), 0);
  elements.cartTotal.textContent = `${total.toLocaleString('ru-RU')} ₽`;
}

// Оформление заказа
function checkout() {
  if (state.cart.length === 0) {
    tg.showAlert('Корзина пуста!');
    return;
  }
  
  const total = state.cart.reduce((sum, item) => sum + Number(item.price), 0);
  const orderText = state.cart.map(item => 
    `• ${item.name} - ${item.price} ₽`).join('\n');
  
  tg.showAlert(`Заказ на ${total} ₽:\n\n${orderText}`);
  
  // Можно добавить отправку заказа в Telegram
  // tg.sendData(JSON.stringify({ cart: state.cart, total: total }));
  
  state.cart = [];
  saveCart();
  closeCart();
}

// Управление модальным окном
function openCart() {
  renderCart();
  elements.cartModal.style.display = 'block';
}

function closeCart() {
  elements.cartModal.style.display = 'none';
}

// Обработчики событий
function setupEventListeners() {
  elements.cartBtn.addEventListener('click', openCart);
  elements.closeCart.addEventListener('click', closeCart);
  elements.checkoutBtn.addEventListener('click', checkout);
  
  // Закрытие по клику вне окна
  elements.cartModal.addEventListener('click', (e) => {
    if (e.target === elements.cartModal) closeCart();
  });
}

// Глобальные функции
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;

// Запуск приложения
document.addEventListener('DOMContentLoaded', init);
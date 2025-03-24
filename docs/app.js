// Конфигурация
const CONFIG = {
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzI9zOhivLi4RClLlDkl7xqOQEIlWLUOIldaVwGZzOFgcG50AwFBsyfDQ2W7twPRp59eA/exec',
    TIMEOUT: 10000 // 10 секунд
  };
  
  // Проверка инициализации Telegram WebApp
  if (!window.Telegram?.WebApp?.initData) {
    document.body.innerHTML = `
      <div class="error-screen">
        <h2>Пожалуйста, откройте приложение через Telegram</h2>
        <p>Это мини-приложение работает только внутри Telegram</p>
      </div>
    `;
    throw new Error("Telegram WebApp not initialized");
  }
  
  const tg = window.Telegram.WebApp;
  tg.expand();
  tg.enableClosingConfirmation();
  
  // Состояние приложения
  const state = {
    items: [],
    cart: [],
    isLoading: false
  };
  
  // DOM элементы
  const elements = {
    itemsContainer: document.getElementById('itemsContainer'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    errorContainer: document.getElementById('errorContainer')
  };
  
  // Инициализация
  function init() {
    loadItems();
    setupEventListeners();
  }
  
  // Загрузка товаров
  async function loadItems() {
    if (state.isLoading) return;
    
    state.isLoading = true;
    showLoading(true);
    hideError();
  
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
  
      const response = await fetch(`${CONFIG.SCRIPT_URL}?t=${Date.now()}`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
  
      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }
  
      const text = await response.text();
      let data;
      
      try {
        // Исправляем возможные проблемы с JSON
        const fixedText = text.replace(/,\s*\]/g, ']').replace(/"size":"([^"]*)}/g, '"size":"$1"');
        data = JSON.parse(fixedText);
      } catch (e) {
        throw new Error("Неверный формат данных от сервера");
      }
  
      if (!Array.isArray(data)) {
        throw new Error("Ожидался массив товаров");
      }
  
      // Фильтрация и валидация данных
      state.items = data.filter(item => 
        item && 
        item.name && 
        !isNaN(parseFloat(item.price)) &&
        item.image
      );
      
      renderItems();
      
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      showError(error.message || "Не удалось загрузить товары");
      tg.showAlert("Ошибка загрузки товаров. Попробуйте позже.");
    } finally {
      state.isLoading = false;
      showLoading(false);
    }
  }
  
  // Рендер товаров
  function renderItems() {
    if (state.items.length === 0) {
      elements.itemsContainer.innerHTML = `
        <div class="empty-state">
          <p>Товары не найдены</p>
          <button onclick="loadItems()">Обновить</button>
        </div>
      `;
      return;
    }
  
    elements.itemsContainer.innerHTML = state.items.map(item => `
      <div class="item">
        <img src="${item.image}" alt="${item.name}" class="item-image" onerror="this.src='https://via.placeholder.com/300'">
        <div class="item-info">
          <h3>${item.name}</h3>
          <p class="price">${formatPrice(item.price)} ₽</p>
          <p>Размер: ${item.size || 'не указан'}</p>
          <button class="buy-button" onclick="addToCart('${item.name}', ${item.price}, '${item.size}')">
            В корзину
          </button>
        </div>
      </div>
    `).join('');
  }
  
  // Форматирование цены
  function formatPrice(price) {
    return Number(price).toLocaleString('ru-RU');
  }
  
  // Показать/скрыть загрузку
  function showLoading(show) {
    elements.loadingIndicator.style.display = show ? 'flex' : 'none';
  }
  
  // Показать ошибку
  function showError(message) {
    elements.errorContainer.innerHTML = `
      <div class="error-message">
        <p>${message}</p>
        <button onclick="loadItems()">Попробовать снова</button>
      </div>
    `;
    elements.errorContainer.style.display = 'block';
  }
  
  function hideError() {
    elements.errorContainer.style.display = 'none';
  }
  
  // Инициализация при загрузке
  document.addEventListener('DOMContentLoaded', init);
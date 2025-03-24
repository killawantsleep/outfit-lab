// Конфигурация
const CONFIG = {
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzI9zOhivLi4RClLlDkl7xqOQEIlWLUOIldaVwGZzOFgcG50AwFBsyfDQ2W7twPRp59eA/exec',
    TIMEOUT: 10000 // 10 секунд
  };
  
  // Инициализация Telegram WebApp
  if (!window.Telegram?.WebApp?.initData) {
    showFatalError("Пожалуйста, откройте приложение через Telegram");
    throw new Error("Telegram WebApp not initialized");
  }
  
  const tg = window.Telegram.WebApp;
  tg.expand();
  tg.enableClosingConfirmation();
  
  // Состояние приложения
  const state = {
    items: [],
    cart: loadCart(),
    isLoading: false
  };
  
  // DOM элементы
  const elements = {
    itemsContainer: document.getElementById('itemsContainer'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    errorContainer: document.getElementById('errorContainer')
  };
  
  // Инициализация приложения
  document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadItems();
  });
  
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
  
      const data = await parseResponse(response);
      
      if (!Array.isArray(data)) {
        throw new Error("Неверный формат данных");
      }
  
      state.items = data.filter(validateItem);
      renderItems();
      
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      showError(error.message);
      tg.showAlert("Не удалось загрузить товары. Попробуйте позже.");
    } finally {
      state.isLoading = false;
      showLoading(false);
    }
  }
  
  // Вспомогательные функции
  function parseResponse(response) {
    return response.text().then(text => {
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error("Невалидный JSON в ответе");
      }
    });
  }
  
  function validateItem(item) {
    return item && 
           typeof item.name === 'string' && 
           !isNaN(parseFloat(item.price)) &&
           typeof item.image === 'string';
  }
  
  function showLoading(show) {
    elements.loadingIndicator.style.display = show ? 'flex' : 'none';
  }
  
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
  
  function showFatalError(message) {
    document.body.innerHTML = `
      <div class="fatal-error">
        <h2>${message}</h2>
        <a href="https://t.me/outfitlab_bot" class="tg-button">
          Открыть в Telegram
        </a>
      </div>
    `;
  }
  
  // Остальные функции (renderItems, cart логика и т.д.) остаются без изменений
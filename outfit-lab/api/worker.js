// Обработчик API для Cloudflare Worker
export default {
    async fetch(request, env) {
      const url = new URL(request.url);
      
      // Эндпоинт для получения конфига
      if (url.pathname === '/api/config') {
        return new Response(JSON.stringify({
          SCRIPT_URL: env.SCRIPT_URL,
          DELIVERY_COST: env.DELIVERY_COST || 440
        }), { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // Эндпоинт для заказов
      if (url.pathname === '/api/order') {
        const data = await request.json();
        
        // Отправляем в Telegram
        const tgResponse = await fetch(
          `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: env.ADMIN_ID,
              text: `Новый заказ: ${JSON.stringify(data, null, 2)}`,
              parse_mode: 'HTML'
            })
          }
        );
        
        return tgResponse;
      }
      
      return new Response('Not found', { status: 404 });
    }
  }
function displayCartCounter() {
    // Получаем данные корзины из localStorage. Если данных нет, используется пустой массив.
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    // Находим элемент на странице, который отображает количество товаров в корзине.
    const cartCount = document.querySelector('.cart-count');
    // Если элемент найден, обновляем его содержимое.
    if (cartCount) {
        const count = cart.length;
        cartCount.innerHTML = `🛒 Корзина ${count > 0 ? `(${count})` : ''}`;
    }
}

class ServerInterface {
    constructor() {
        // Базовый URL API.
        this.baseUrl = 'https://edu.std-900.ist.mospolytech.ru/exam-2024-1/api';
        // Ключ API.
        this.apiKey = '3ba95a0d-b29f-46d7-a3d8-4fe2e0b49866';
    }

    async fetchData(endpoint, params = {}) {
        // Формирует параметры запроса, включая ключ API.
        const queryParams = new URLSearchParams({
            ...params,
            api_key: this.apiKey
        });

        try {
            // Выполняет GET запрос к API.
            const response = await fetch(`${this.baseUrl}${endpoint}?${queryParams}`);
            // Проверяет статус ответа.
            if (!response.ok) throw new Error('Ошибка запроса');
            // Возвращает данные в формате JSON.
            return await response.json();
        } catch (error) {
            // Обрабатывает ошибки запроса.
            this.displayError(error);
            throw error; // Перебрасываем ошибку для обработки вызывающей функцией
        }
    }

    async sendData(endpoint, data) {
        try {
            // Выполняет POST запрос к API.
            const response = await fetch(`${this.baseUrl}${endpoint}?api_key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            // Получаем текст ответа для обработки ошибок.
            const responseText = await response.text();

            if (!response.ok) {
                // Обрабатываем ошибку, пытаясь извлечь сообщение из JSON.
                let errorMessage;
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.error || 'Ошибка запроса';
                } catch {
                    errorMessage = responseText || response.statusText || 'Ошибка запроса';
                }
                throw new Error(errorMessage);
            }

            // Если ответ пустой, возвращаем успех.
            if (!responseText) {
                return { success: true };
            }

            // Пытаемся распарсить JSON ответ.  Если не получается, возвращаем просто текст ответа.
            try {
                return JSON.parse(responseText);
            } catch {
                return { success: true, data: responseText };
            }
        } catch (error) {
            this.displayError(error);
            throw error;
        }
    }

    async updateData(endpoint, data) {
         try {
            // Выполняет PUT запрос для обновления данных.
            const response = await fetch(`${this.baseUrl}${endpoint}?api_key=${this.apiKey}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Ошибка запроса');
            return await response.json();
        } catch (error) {
            this.displayError(error);
            throw error;
        }
    }


    async removeData(endpoint) { 
         try {
            // Выполняет DELETE запрос для удаления данных.
            const response = await fetch(`${this.baseUrl}${endpoint}?api_key=${this.apiKey}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Ошибка запроса');
            return await response.json();
        } catch (error) {
            this.displayError(error);
            throw error;
        }
    }

    displayError(error) {
        // Отображает сообщение об ошибке на странице.
        const notifications = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = 'notification notification--error';
        notification.textContent = error.message;
        notifications.appendChild(notification);
        
        // Удаляет сообщение об ошибке через 5 секунд.
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}


const api = new ServerInterface(); 
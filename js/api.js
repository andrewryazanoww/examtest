function updateCartCounter() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        const count = cart.length;
        cartCount.innerHTML = `🛒 Корзина ${count > 0 ? `(${count})` : ''}`;
    }
}

class API {
    constructor() {
        this.baseUrl = 'https://edu.std-900.ist.mospolytech.ru/exam-2024-1/api';
        this.apiKey = '3ba95a0d-b29f-46d7-a3d8-4fe2e0b49866';
    }

    async get(endpoint, params = {}) {
        const queryParams = new URLSearchParams({
            ...params,
            api_key: this.apiKey
        });

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}?${queryParams}`);
            if (!response.ok) throw new Error('Ошибка запроса');
            return await response.json();
        } catch (error) {
            this.showError(error);
            throw error;
        }
    }

    async post(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}?api_key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            // Получение текста ответа для анализа ошибки
            const responseText = await response.text();
            
            if (!response.ok) {
                // Пытаемся распарсить JSON с ошибкой
                let errorMessage;
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.error || 'Ошибка запроса';
                } catch {
                    errorMessage = responseText || response.statusText || 'Ошибка запроса';
                }
                throw new Error(errorMessage);
            }

            // Если ответ пустой, возвращаем успех
            if (!responseText) {
                return { success: true };
            }

            // Пытаемся распарсить JSON ответ
            try {
                return JSON.parse(responseText);
            } catch {
                return { success: true, data: responseText };
            }
        } catch (error) {
            this.showError(error);
            throw error;
        }
    }

    async put(endpoint, data) {
        try {
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
            this.showError(error);
            throw error;
        }
    }

    async delete(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}?api_key=${this.apiKey}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Ошибка запроса');
            return await response.json();
        } catch (error) {
            this.showError(error);
            throw error;
        }
    }

    showError(error) {
        const notifications = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = 'notification notification--error';
        notification.textContent = error.message;
        notifications.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

const api = new API();
class Cart {
    constructor() {
        this.items = [];
        this.form = document.getElementById('order-form');
        this.cartItemsContainer = document.getElementById('cart-items');
        this.cartEmptyMessage = document.getElementById('cart-empty');
        this.subtotalElement = document.getElementById('subtotal');
        this.totalElement = document.getElementById('total');
        
        this.init();
    }

    async init() {
        await this.loadCartItems();
        this.setupEventListeners();
        this.updateTotals();
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmitOrder(e));
        
        // Event Listeners для обновления стоимости при изменении даты или времени
        this.form.elements.delivery_date.addEventListener('change', () => this.updateTotals());
        this.form.elements.delivery_time.addEventListener('change', () => this.updateTotals());
    }

    async loadCartItems() {
        const cartIds = JSON.parse(localStorage.getItem('cart') || '[]');
        
        if (cartIds.length === 0) {
            this.showEmptyCart();
            return;
        }

        try {
            const itemPromises = cartIds.map(id => api.get(`/goods/${id}`));
            this.items = await Promise.all(itemPromises);
            this.renderCart();
        } catch (error) {
            console.error('Ошибка при загрузке товаров корзины:', error);
            this.showEmptyCart();
        }
    }

    showEmptyCart() {
        this.cartItemsContainer.style.display = 'none';
        this.cartEmptyMessage.style.display = 'block';
        this.form.style.display = 'none';
    }

    renderCart() {
        this.cartItemsContainer.innerHTML = this.items.map(item => this.createCartItemHTML(item)).join('');
    }

    createCartItemHTML(item) {
        const price = item.discount_price || item.actual_price;
        const oldPrice = item.discount_price ? 
            `<span class="cart-item__old-price">${item.actual_price} ₽</span>` : '';

        return `
            <div class="cart-item" data-id="${item.id}">
                <img src="${item.image_url}" alt="${item.name}">
                <div class="cart-item__info">
                    <h3>${item.name}</h3>
                    <div class="cart-item__rating">
                        ${'★'.repeat(Math.round(item.rating))}${'☆'.repeat(5 - Math.round(item.rating))}
                        <span>${item.rating}</span>
                    </div>
                    <div class="cart-item__price">
                        <span class="cart-item__current-price">${price} ₽</span>
                        ${oldPrice}
                    </div>
                </div>
                <button class="button button--danger" onclick="cart.removeItem(${item.id})">
                    Удалить
                </button>
            </div>
        `;
    }

    removeItem(itemId) {
        const cartIds = JSON.parse(localStorage.getItem('cart') || '[]');
        const newCartIds = cartIds.filter(id => id !== itemId);
        localStorage.setItem('cart', JSON.stringify(newCartIds));
        
        this.items = this.items.filter(item => item.id !== itemId);
        
        if (this.items.length === 0) {
            this.showEmptyCart();
        } else {
            this.renderCart();
        }
        
        this.updateTotals();
        updateCartCounter();
        this.showNotification('Товар удален из корзины');
    }

    calculateDeliveryCost(date, timeInterval) {
        let deliveryCost = 200;

        if (!date || !timeInterval) return deliveryCost;

        const deliveryDate = new Date(date);
        const dayOfWeek = deliveryDate.getDay();
        const [startTime] = timeInterval.split('-');
        const hour = parseInt(startTime.split(':')[0]);

        // суббота = 6, воскресенье = 0
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            deliveryCost += 300;
        }
        else if (hour >= 18) {
            deliveryCost += 200;
        }

        return deliveryCost;
    }

    updateTotals() {
        const subtotal = this.items.reduce((sum, item) => {
            return sum + (item.discount_price || item.actual_price);
        }, 0);

        const deliveryDate = this.form.elements.delivery_date.value;
        const deliveryTime = this.form.elements.delivery_time.value;
        
        const deliveryCost = this.calculateDeliveryCost(deliveryDate, deliveryTime);
        const total = subtotal + deliveryCost;

        this.subtotalElement.textContent = `${subtotal} ₽`;
        document.getElementById('delivery-cost').textContent = `${deliveryCost} ₽`;
        this.totalElement.textContent = `${total} ₽`;
    }

    async handleSubmitOrder(e) {
        e.preventDefault();

        const formData = new FormData(this.form);
        
        // Преобразование даты в dd-mm-yyyy
        const rawDate = formData.get('delivery_date');
        const [year, month, day] = rawDate.split('-');
        const formattedDate = `${day}.${month}.${year}`;

        const orderData = {
            full_name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            delivery_address: formData.get('address'),
            delivery_date: formattedDate,
            delivery_interval: formData.get('delivery_time'),
            comment: formData.get('comment'),
            subscribe: formData.get('newsletter') ? 1 : 0,
            good_ids: this.items.map(item => item.id)
        };

        try {
            console.log('Отправляемые данные:', orderData);
            const response = await api.post('/orders', orderData);
            console.log('Ответ сервера:', response);
            
            localStorage.removeItem('cart');
            this.showNotification('Заказ успешно оформлен!', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } catch (error) {
            console.error('Подробности ошибки:', error);
            this.showNotification(`Ошибка при оформлении заказа: ${error.message}`, 'error');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.textContent = message;
        document.getElementById('notifications').appendChild(notification);
        
        setTimeout(() => notification.remove(), 5000);
    }
}

const cart = new Cart(); 
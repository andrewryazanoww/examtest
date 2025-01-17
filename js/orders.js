class Orders {
    constructor() {
        this.orders = [];
        this.products = new Map(); // Кэш для товаров
        this.currentOrderId = null;
        this.init();
    }

    async init() {
        await this.loadOrders();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.querySelectorAll('.modal__close').forEach(button => {
            button.addEventListener('click', () => {
                this.closeModal(button.closest('.modal').id);
            });
        });
    }

    async loadOrders() {
        try {
            this.orders = await api.get('/orders');
            
            // Сбор всех уникальных ID товаров из всех заказов
            const productIds = new Set();
            this.orders.forEach(order => {
                order.good_ids.forEach(id => productIds.add(id));
            });

            // Загрузка данных о товарах
            await Promise.all(Array.from(productIds).map(async id => {
                const product = await api.get(`/goods/${id}`);
                this.products.set(id, product);
            }));

            this.renderOrders();
        } catch (error) {
            console.error('Ошибка при загрузке заказов:', error);
        }
    }

    calculateDeliveryCost(date, timeInterval) {
        let deliveryCost = 200;

        if (!date || !timeInterval) return deliveryCost;

        const deliveryDate = new Date(date.split('.').reverse().join('-'));
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

    calculateOrderTotal(order) {
        const goodsTotal = order.good_ids.reduce((total, id) => {
            const product = this.products.get(id);
            if (product) {
                return total + (product.discount_price || product.actual_price);
            }
            return total;
        }, 0);

        const deliveryCost = this.calculateDeliveryCost(order.delivery_date, order.delivery_interval);

        return goodsTotal + deliveryCost;
    }

    formatOrderItems(goodIds) {
        return goodIds.map(id => {
            const product = this.products.get(id);
            return product ? product.name : 'Товар не найден';
        }).join(', ');
    }

    renderOrders() {
        const ordersList = document.getElementById('orders-list');
        ordersList.innerHTML = this.orders.map((order, index) => this.createOrderRow(order, index + 1)).join('');
    }

    createOrderRow(order, index) {
        const date = new Date(order.created_at);
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        const total = this.calculateOrderTotal(order);
        
        return `
            <tr>
                <td>${index}</td>
                <td>${formattedDate}</td>
                <td title="${this.formatOrderItems(order.good_ids)}">
                    ${this.formatOrderItems(order.good_ids).slice(0, 100)}${this.formatOrderItems(order.good_ids).length > 100 ? '...' : ''}
                </td>
                <td>${total} ₽</td>
                <td>${order.delivery_date}<br>${order.delivery_interval}</td>
                <td class="order-actions">
                <button class="action-button" onclick="orders.viewOrder(${order.id})"><i class="fas fa-eye"></i></button>
                <button class="action-button" onclick="orders.editOrder(${order.id})"><i class="fas fa-edit"></i></button>
                <button class="action-button" onclick="orders.deleteOrder(${order.id})"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `;
    }

    async viewOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const goodsTotal = order.good_ids.reduce((total, id) => {
            const product = this.products.get(id);
            if (product) {
                return total + (product.discount_price || product.actual_price);
            }
            return total;
        }, 0);
        const deliveryCost = this.calculateDeliveryCost(order.delivery_date, order.delivery_interval);
        const total = goodsTotal + deliveryCost;
        const orderItems = this.formatOrderItems(order.good_ids);

        const details = document.getElementById('view-order-details');
        details.innerHTML = `
            <div class="order-info">
                <div class="order-info-item">
                    <span>Дата оформления:</span>
                    <span>${new Date(order.created_at).toLocaleString()}</span>
                </div>
                <div class="order-info-item">
                    <span>Имя:</span>
                    <span>${order.full_name}</span>
                </div>
                <div class="order-info-item">
                    <span>Email:</span>
                    <span>${order.email}</span>
                </div>
                <div class="order-info-item">
                    <span>Телефон:</span>
                    <span>${order.phone}</span>
                </div>
                <div class="order-info-item">
                    <span>Адрес доставки:</span>
                    <span>${order.delivery_address}</span>
                </div>
                <div class="order-info-item">
                    <span>Дата доставки:</span>
                    <span>${order.delivery_date}</span>
                </div>
                <div class="order-info-item">
                    <span>Время доставки:</span>
                    <span>${order.delivery_interval}</span>
                </div>
                <div class="order-info-item">
                    <span>Состав заказа:</span>
                    <span>${orderItems}</span>
                </div>
                <div class="order-info-item">
                    <span>Комментарий:</span>
                    <span>${order.comment || '-'}</span>
                </div>
                <div class="order-info-item">
                    <span>Стоимость товаров:</span>
                    <span>${goodsTotal} ₽</span>
                </div>
                <div class="order-info-item">
                    <span>Стоимость доставки:</span>
                    <span>${deliveryCost} ₽</span>
                </div>
                <div class="order-info-item">
                    <span>Итого:</span>
                    <span>${total} ₽</span>
                </div>
            </div>
        `;

        this.openModal('view-modal');
    }

    async editOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        this.currentOrderId = orderId;
        const form = document.getElementById('edit-order-form');

        // Заполнение формы
        form.elements.full_name.value = order.full_name;
        form.elements.email.value = order.email;
        form.elements.phone.value = order.phone;
        form.elements.delivery_address.value = order.delivery_address;
        form.elements.delivery_date.value = this.formatDateForInput(order.delivery_date);
        form.elements.delivery_interval.value = order.delivery_interval;
        form.elements.comment.value = order.comment || '';

        this.openModal('edit-modal');
    }

    formatDateForInput(dateStr) {
        const [day, month, year] = dateStr.split('.');
        return `${year}-${month}-${day}`;
    }

    async saveOrder() {
        if (!this.currentOrderId) return;

        const form = document.getElementById('edit-order-form');
        const formData = new FormData(form);
        
        // Преобразование даты в формат dd-mm-yyyy
        const rawDate = formData.get('delivery_date');
        const [year, month, day] = rawDate.split('-');
        const formattedDate = `${day}.${month}.${year}`;

        const orderData = {
            full_name: formData.get('full_name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            delivery_address: formData.get('delivery_address'),
            delivery_date: formattedDate,
            delivery_interval: formData.get('delivery_interval'),
            comment: formData.get('comment')
        };

        try {
            await api.put(`/orders/${this.currentOrderId}`, orderData);
            await this.loadOrders();
            this.closeModal('edit-modal');
            this.showNotification('Заказ успешно обновлен', 'success');
        } catch (error) {
            this.showNotification('Ошибка при обновлении заказа', 'error');
        }
    }

    deleteOrder(orderId) {
        this.currentOrderId = orderId;
        this.openModal('delete-modal');
    }

    async confirmDelete() {
        if (!this.currentOrderId) return;

        try {
            await api.delete(`/orders/${this.currentOrderId}`);
            await this.loadOrders();
            this.closeModal('delete-modal');
            this.showNotification('Заказ успешно удален', 'success');
        } catch (error) {
            this.showNotification('Ошибка при удалении заказа', 'error');
        }
    }

    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        if (modalId === 'edit-modal') {
            this.currentOrderId = null;
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

const orders = new Orders();
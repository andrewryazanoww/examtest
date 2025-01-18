class OrderManager {
    constructor() {
        this.orders = []; // Массив заказов
        this.products = new Map(); // Кэш для хранения информации о товарах
        this.currentOrderId = null; // ID текущего редактируемого заказа

        this.initialize(); // Инициализация менеджера заказов
    }

    async initialize() {
        await this.loadOrders(); // Загрузка заказов
        this.setupEventHandlers(); // Настройка обработчиков событий
    }

    setupEventHandlers() { // Настройка обработчиков событий для модальных окон
        document.querySelectorAll('.modal__close').forEach(button => {
            button.addEventListener('click', () => {
                this.closeModal(button.closest('.modal').id); // Закрытие ближайшего модального окна
            });
        });
    }

    async loadOrders() { // Загрузка заказов с сервера
        try {
            // Получение заказов через API
            this.orders = await api.fetchData('/orders');

            // Создание множества уникальных ID товаров во всех заказах
            const productIds = new Set();
            this.orders.forEach(order => {
                order.good_ids.forEach(id => productIds.add(id));
            });

            // Загрузка информации о каждом товаре
            await Promise.all(Array.from(productIds).map(async id => {
                const product = await api.fetchData(`/goods/${id}`);
                this.products.set(id, product); // Добавление товара в кэш
            }));

            this.displayOrders(); // Отображение заказов на странице
        } catch (error) {
            console.error('Ошибка при загрузке заказов:', error);
        }
    }

    calculateDeliveryCost(date, timeInterval) { // Расчет стоимости доставки
        let deliveryCost = 200; // Базовая стоимость доставки

        // Если дата или интервал доставки не указаны, возвращается базовая стоимость
        if (!date || !timeInterval) return deliveryCost;

        // Преобразование даты доставки в объект Date
        const deliveryDate = new Date(date.split('.').reverse().join('-'));
        const dayOfWeek = deliveryDate.getDay(); // День недели (0 - воскресенье, 6 - суббота)

        // Получение начального часа доставки
        const [startTime] = timeInterval.split('-');
        const hour = parseInt(startTime.split(':')[0]);

        // Дополнительная плата за доставку в выходные или вечером (после 18:00)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            deliveryCost += 300;
        } else if (hour >= 18) {
            deliveryCost += 200;
        }

        return deliveryCost;
    }

    calculateOrderTotal(order) { // Расчет общей стоимости заказа
        // Расчет стоимости товаров в заказе
        const goodsTotal = order.good_ids.reduce((total, id) => {
            const product = this.products.get(id);
            // Если товар найден в кэше, добавляем его цену к общей сумме
            if (product) {
                return total + (product.discount_price || product.actual_price);
            }
            return total;
        }, 0);

        // Расчет стоимости доставки
        const deliveryCost = this.calculateDeliveryCost(order.delivery_date, order.delivery_interval);

        return goodsTotal + deliveryCost; // Возвращаем общую стоимость заказа (товары + доставка)
    }


    formatOrderItems(goodIds) { // Форматирование списка товаров в заказе
        // Для каждого ID товара получаем его название из кэша и объединяем в строку
        return goodIds.map(id => {
            const product = this.products.get(id);
            return product ? product.name : 'Товар не найден';
        }).join(', ');
    }

    displayOrders() { // Отображение заказов на странице
        const ordersList = document.getElementById('orders-list'); // Получение элемента для списка заказов
        // Генерация HTML для каждого заказа и вставка в список
        ordersList.innerHTML = this.orders.map((order, index) => this.createOrderRow(order, index + 1)).join('');
    }


    createOrderRow(order, index) { // Создание строки таблицы для одного заказа
        const date = new Date(order.created_at); // Преобразование даты создания заказа в объект Date
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`; // Форматирование даты

        const total = this.calculateOrderTotal(order);  // Расчет общей стоимости заказа
        const formattedOrderItems = this.formatOrderItems(order.good_ids);

        // HTML код для строки заказа
        return `
            <tr>
                <td>${index}</td>
                <td>${formattedDate}</td>
                <td title="${formattedOrderItems}">
                    ${formattedOrderItems.slice(0, 100)}${formattedOrderItems.length > 100 ? '...' : ''}
                </td>
                <td>${total} ₽</td>
                <td>${order.delivery_date}<br>${order.delivery_interval}</td>
                <td class="order-actions">
                    <button class="action-button" onclick="orders.viewOrderDetails(${order.id})"><i class="fas fa-eye"></i></button>
                    <button class="action-button" onclick="orders.editOrder(${order.id})"><i class="fas fa-edit"></i></button>
                    <button class="action-button" onclick="orders.requestOrderDeletion(${order.id})"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `;
    }


    async viewOrderDetails(orderId) { // Отображение подробной информации о заказе
        const order = this.orders.find(o => o.id === orderId); // Поиск заказа по ID
        if (!order) return; // Если заказ не найден, ничего не делаем

        const goodsTotal = order.good_ids.reduce((total, id) => {
            const product = this.products.get(id);
            if (product) {
                return total + (product.discount_price || product.actual_price);
            }
            return total;
        }, 0); // Расчет стоимости товаров

        const deliveryCost = this.calculateDeliveryCost(order.delivery_date, order.delivery_interval);// Расчет стоимости доставки
        const total = goodsTotal + deliveryCost; // Общая стоимость заказа
        const orderItems = this.formatOrderItems(order.good_ids); // Форматирование списка товаров

        const details = document.getElementById('view-order-details'); // Получение элемента для отображения деталей заказа

        // Заполнение деталей заказа
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

        this.openModal('view-modal'); // Открытие модального окна для просмотра заказа
    }


    async editOrder(orderId) { // Редактирование заказа
        const order = this.orders.find(o => o.id === orderId); // Поиск заказа по ID
        if (!order) return; // Если заказ не найден, ничего не делаем

        this.currentOrderId = orderId; // Сохранение ID текущего редактируемого заказа
        const form = document.getElementById('edit-order-form'); // Получение формы для редактирования

        // Заполнение формы данными заказа
        form.elements.full_name.value = order.full_name;
        form.elements.email.value = order.email;
        form.elements.phone.value = order.phone;
        form.elements.delivery_address.value = order.delivery_address;
        form.elements.delivery_date.value = this.formatDateForInput(order.delivery_date); // Форматирование даты для input
        form.elements.delivery_interval.value = order.delivery_interval;
        form.elements.comment.value = order.comment || '';

        this.openModal('edit-modal'); // Открытие модального окна для редактирования
    }


    formatDateForInput(dateStr) { // Форматирование даты для input[type="date"]
        const [day, month, year] = dateStr.split('.');
        return `${year}-${month}-${day}`;
    }


    async saveOrder() { // Сохранение изменений в заказе
        if (!this.currentOrderId) return; // Если ID текущего заказа не задан, ничего не делаем

        const form = document.getElementById('edit-order-form'); // Получение формы редактирования
        const formData = new FormData(form); // Получение данных из формы

        // Преобразование даты доставки в нужный формат
        const rawDate = formData.get('delivery_date');
        const [year, month, day] = rawDate.split('-');
        const formattedDate = `${day}.${month}.${year}`;

        // Подготовка данных для отправки на сервер
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
            // Отправка PUT запроса для обновления заказа
            await api.updateData(`/orders/${this.currentOrderId}`, orderData);
            await this.loadOrders(); // Перезагрузка заказов после обновления
            this.closeModal('edit-modal'); // Закрытие модального окна
            this.showNotification('Заказ успешно обновлен', 'success'); // Отображение уведомления об успехе
        } catch (error) {
            // Отображение уведомления об ошибке
            this.showNotification('Ошибка при обновлении заказа', 'error');
        }
    }


    requestOrderDeletion(orderId) { // Запрос на удаление заказа (открытие модального окна подтверждения)
        this.currentOrderId = orderId; // Сохранение ID удаляемого заказа
        this.openModal('delete-modal'); // Открытие модального окна подтверждения удаления
    }

    async confirmDelete() { // Подтверждение удаления заказа
        if (!this.currentOrderId) return; // Если ID заказа не задан, ничего не делаем

        try {
            // Отправка DELETE запроса для удаления заказа
            await api.removeData(`/orders/${this.currentOrderId}`);
            await this.loadOrders(); // Перезагрузка заказов после удаления
            this.closeModal('delete-modal'); // Закрытие модального окна
            this.showNotification('Заказ успешно удален', 'success'); // Отображение уведомления об успехе
        } catch (error) {
            this.showNotification('Ошибка при удалении заказа', 'error'); // Отображение уведомления об ошибке
        }
    }

    openModal(modalId) { // Открытие модального окна
        document.getElementById(modalId).classList.add('active');
    }

    closeModal(modalId) { // Закрытие модального окна
        document.getElementById(modalId).classList.remove('active');
        // Сброс ID текущего редактируемого заказа при закрытии модального окна редактирования
        if (modalId === 'edit-modal') {
            this.currentOrderId = null;
        }
    }


    showNotification(message, type = 'info') { // Отображение уведомлений
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`; // Класс для стилизации уведомления
        notification.textContent = message; // Текст уведомления
        document.getElementById('notifications').appendChild(notification); // Добавление уведомления на страницу

        setTimeout(() => notification.remove(), 5000); }
    }
    
    const orders = new OrderManager();// Удаление уведомления через 5 секунд
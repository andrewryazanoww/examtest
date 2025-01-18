
class ShoppingCart {
    constructor() {
        this.items = []; // Массив товаров в корзине
        this.form = document.getElementById('order-form'); // Форма заказа
        this.cartItemsContainer = document.getElementById('cart-items'); // Контейнер для отображения товаров
        this.cartEmptyMessage = document.getElementById('cart-empty'); // Сообщение о пустой корзине
        this.subtotalElement = document.getElementById('subtotal'); // Элемент для отображения стоимости товаров без доставки
        this.totalElement = document.getElementById('total'); // Элемент для отображения общей стоимости
        this.deliveryCostElement = document.getElementById('delivery-cost'); // Элемент для отображения стоимости доставки

        this.initialize(); // Инициализация корзины
    }

    async initialize() {
        await this.loadCartItems(); // Загрузка товаров из localStorage
        this.setupEventHandlers(); // Настройка обработчиков событий
        this.updateTotals(); // Обновление итоговой стоимости
    }


    setupEventHandlers() { // Настройка обработчиков событий
        if (this.form) {
           // Обработчик отправки формы заказа
           this.form.addEventListener('submit', (e) => this.submitOrder(e));
           // Обработчики изменения даты и времени доставки для пересчета стоимости
           this.form.elements.delivery_date.addEventListener('change', () => this.updateTotals());
           this.form.elements.delivery_time.addEventListener('change', () => this.updateTotals());
        }
    }

    async loadCartItems() { // Загрузка товаров в корзину
        const cartIds = JSON.parse(localStorage.getItem('cart') || '[]'); // Получение ID товаров из localStorage

        // Если корзина пуста, отображаем сообщение
        if (cartIds.length === 0) {
            this.showEmptyCartMessage();
            return;
        }

        try {
            // Загрузка данных о каждом товаре из API
            const itemPromises = cartIds.map(id => api.fetchData(`/goods/${id}`));
            this.items = await Promise.all(itemPromises);
            // Отображение товаров в корзине
            this.displayCartItems();
        } catch (error) {
            console.error('Ошибка при загрузке товаров корзины:', error);
            // Если произошла ошибка, отображаем сообщение о пустой корзине
            this.showEmptyCartMessage();
        }
    }

    showEmptyCartMessage() { // Отображение сообщения о пустой корзине
        if (this.cartItemsContainer) {
            this.cartItemsContainer.style.display = 'none'; // Скрываем контейнер с товарами
        }
        if (this.cartEmptyMessage) {
            this.cartEmptyMessage.style.display = 'block'; // Показываем сообщение
        }
        if(this.form){
           this.form.style.display = 'none';// Скрываем форму заказа
        }
    }

    displayCartItems() { // Отображение товаров в корзине
       if(this.cartItemsContainer){
           // Генерируем HTML для каждого товара и добавляем в контейнер
           this.cartItemsContainer.innerHTML = this.items.map(item => this.createCartItemHTML(item)).join('');
       }
    }

    createCartItemHTML(item) { // Создание HTML для одного товара в корзине
        const price = item.discount_price || item.actual_price; // Цена с учетом скидки
        // Старая цена, если есть скидка
        const oldPrice = item.discount_price ?
            `<span class="cart-item__old-price">${item.actual_price} ₽</span>` : '';
        // Метка "Скидка", если есть скидка
        const discountBadge = item.discount_price ?
            `<span class="cart-item__discount-badge">Скидка</span>` : '';

        return `
            <div class="cart-item" data-id="${item.id}">
                <img src="${item.image_url}" alt="${item.name}">
                ${discountBadge}
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


    removeItem(itemId) { // Удаление товара из корзины
        const cartIds = JSON.parse(localStorage.getItem('cart') || '[]'); // Получение текущей корзины
        const newCartIds = cartIds.filter(id => id !== itemId); // Фильтрация корзины, удаление товара с заданным ID
        localStorage.setItem('cart', JSON.stringify(newCartIds)); // Сохранение обновленной корзины

        this.items = this.items.filter(item => item.id !== itemId); // Удаление товара из массива товаров

        // Если корзина пуста, отображаем сообщение
        if (this.items.length === 0) {
            this.showEmptyCartMessage();
        } else {
           this.displayCartItems(); // Перерисовка корзины
        }

        this.updateTotals(); // Обновление итоговой стоимости
        displayCartCounter();// Обновление счетчика корзины
        this.showNotification('Товар удален из корзины');// Показ уведомления
    }

    calculateDeliveryCost(date, timeInterval) { // Расчет стоимости доставки
        let deliveryCost = 200; // Базовая стоимость доставки

        // Если дата или время не указаны, возвращаем базовую стоимость
        if (!date || !timeInterval) return deliveryCost;

        const deliveryDate = new Date(date); // Преобразование даты в объект Date
        const dayOfWeek = deliveryDate.getDay(); // День недели (0 - воскресенье, 6 - суббота)
        const [startTime] = timeInterval.split('-'); // Получение времени начала доставки
        const hour = parseInt(startTime.split(':')[0]); // Час начала доставки

        // Надбавки за доставку в выходные или вечером
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            deliveryCost += 300;
        } else if (hour >= 18) {
            deliveryCost += 200;
        }

        return deliveryCost;
    }

    updateTotals() { // Обновление итоговой стоимости заказа
        // Расчет стоимости товаров без доставки
        const subtotal = this.items.reduce((sum, item) => {
            return sum + (item.discount_price || item.actual_price);
        }, 0);

        let deliveryCost = 0;
        if(this.form){
            // Получение даты и времени доставки из формы
            const deliveryDate = this.form.elements.delivery_date.value;
            const deliveryTime = this.form.elements.delivery_time.value;
            // Расчет стоимости доставки
            deliveryCost = this.calculateDeliveryCost(deliveryDate, deliveryTime);
        }


        const total = subtotal + deliveryCost;// Общая стоимость с доставкой

        if (this.subtotalElement) {
          this.subtotalElement.textContent = `${subtotal} ₽`; // Обновление стоимости товаров на странице
        }
        if (this.deliveryCostElement) {
            this.deliveryCostElement.textContent = `${deliveryCost} ₽`;// Обновление стоимости доставки на странице
        }

         if(this.totalElement){
            this.totalElement.textContent = `${total} ₽`; // Обновление общей стоимости на странице
        }
    }

   async submitOrder(e) { // Отправка заказа на сервер
        e.preventDefault();// Предотвращение стандартной отправки формы

       if(!this.form){
         return; // Если формы нет, ничего не делаем
       }
        const formData = new FormData(this.form); // Получение данных из формы

        // Преобразование даты в нужный формат
        const rawDate = formData.get('delivery_date');
        const [year, month, day] = rawDate.split('-');
        const formattedDate = `${day}.${month}.${year}`;

        // Подготовка данных для отправки на сервер
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
            const response = await api.sendData('/orders', orderData);// Отправка данных на сервер
            console.log('Ответ сервера:', response);

            localStorage.removeItem('cart'); // Очистка корзины в localStorage
            this.showNotification('Заказ успешно оформлен!', 'success'); // Отображение уведомления об успехе
            // Перенаправление на главную страницу через 2 секунды
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } catch (error) {
            console.error('Подробности ошибки:', error);
            // Отображение уведомления об ошибке
            this.showNotification(`Ошибка при оформлении заказа: ${error.message}`, 'error');
        }
    }



    showNotification(message, type = 'info') { // Отображение уведомлений
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`; // Класс для стилизации уведомления
        notification.textContent = message;// Текст уведомления
        document.getElementById('notifications').appendChild(notification); // Добавление уведомления на страницу

        setTimeout(() => notification.remove(), 5000); // Удаление уведомления через 5 секунд
    }
}

const cart = new ShoppingCart();
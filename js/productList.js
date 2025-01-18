class ProductCatalog {
    constructor() {
        this.products = []; // Массив с загруженными товарами
        this.categories = new Set(); // Множество доступных категорий
        this.currentPage = 1; // Текущая страница пагинации
        this.itemsPerPage = 10; // Количество товаров на странице
        this.totalProducts = 0; // Общее количество товаров
        this.totalPages = 0; // Общее количество страниц
        // Фильтры для товаров
        this.filters = {
            categories: new Set(), // Выбранные категории
            priceFrom: null, // Минимальная цена
            priceTo: null, // Максимальная цена
            discount: false // Только товары со скидкой
        };
        this.sortType = 'price_asc'; // Тип сортировки

        // DOM элементы
        this.productsGrid = document.getElementById('products-grid');
        this.filtersForm = document.getElementById('filters-form');
        this.sortSelect = document.getElementById('sort-select');
        this.pagination = document.getElementById('pagination');

        this.initialize(); // Инициализация каталога
    }

    async initialize() { // Инициализация каталога
        await this.fetchProducts(); // Загрузка товаров
        this.setupEventHandlers(); // Настройка обработчиков событий
        this.displayCategories(); // Отображение категорий
        this.displayProducts(); // Отображение товаров
    }

    setupEventHandlers() { // Настройка обработчиков событий
        // Обработчик отправки формы фильтров
        this.filtersForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.applyFilters(); // Применение фильтров
        });

        // Обработчик изменения выбора сортировки
        this.sortSelect.addEventListener('change', () => {
            this.sortType = this.sortSelect.value;
            this.currentPage = 1; // Сброс текущей страницы при изменении сортировки
            this.displayProducts(); // Обновление отображения товаров
        });
    }

    async fetchProducts(page = 1) {  // Загрузка товаров с сервера
        try {
            // Запрос товаров через API
            const response = await api.fetchData('/goods', {
                page: page,
                per_page: this.itemsPerPage
            });

            // Обновление параметров пагинации
            this.currentPage = response._pagination.current_page;
            this.totalProducts = response._pagination.total_count;
            this.totalPages = Math.ceil(this.totalProducts / this.itemsPerPage);

            this.products = response.goods; // Сохранение загруженных товаров

            // Добавление категорий в множество
            this.products.forEach(product => {
                this.categories.add(product.main_category);
            });

            this.updatePagination(); // Обновление пагинации
            this.displayCategories();// Обновление категорий
            this.displayProducts();// Обновление отображения товаров
        } catch (error) {
            console.error('Ошибка при загрузке товаров:', error);
        }
    }

    updatePagination() { // Обновление пагинации на странице
        this.pagination.innerHTML = ''; // Очистка текущей пагинации

        if (this.totalPages > 1) { // Если всего одна страница, пагинация не нужна
            for (let i = 1; i <= this.totalPages; i++) { // Создание кнопок для каждой страницы
                const button = document.createElement('button');
                button.textContent = i; // Номер страницы на кнопке
                button.className = 'pagination-button';
                // Выделение текущей страницы
                if (i === this.currentPage) {
                    button.classList.add('active');
                }
                // Обработчик клика по кнопке страницы
                button.addEventListener('click', async () => {
                    this.currentPage = i; // Обновление текущей страницы
                    await this.fetchProducts(i); // Загрузка товаров для выбранной страницы
                });

                this.pagination.appendChild(button); // Добавление кнопки на страницу
            }
        }
    }

    displayCategories() { // Отображение категорий на странице
        const categoriesList = document.getElementById('categories-list');
        // Создание списка checkbox для каждой категории
        categoriesList.innerHTML = Array.from(this.categories)
            .map(category => `
                <label class="checkbox-label">
                    <input type="checkbox" name="category" value="${category}">
                    ${category}
                </label>
            `).join('');
    }

    applyFilters() { // Применение фильтров к товарам
        // Получение выбранных категорий
        const selectedCategories = Array.from(this.filtersForm.querySelectorAll('input[name="category"]:checked'))
            .map(input => input.value);
        this.filters.categories = new Set(selectedCategories);

        // Получение значений цены
        const priceFrom = this.filtersForm.querySelector('input[name="price_from"]').value;
        const priceTo = this.filtersForm.querySelector('input[name="price_to"]').value;
        this.filters.priceFrom = priceFrom ? Number(priceFrom) : null;
        this.filters.priceTo = priceTo ? Number(priceTo) : null;

        // Получение значения фильтра "скидка"
        this.filters.discount = this.filtersForm.querySelector('input[name="discount"]').checked;

        this.currentPage = 1; // Сброс текущей страницы при применении фильтров
        this.fetchProducts(); // Загрузка товаров с учетом фильтров
        this.displayProducts();// Отрисовка товаров
    }

    filterProducts() { // Фильтрация товаров по заданным критериям
        return this.products.filter(product => {
            // Фильтрация по категории
            if (this.filters.categories.size > 0 && !this.filters.categories.has(product.main_category)) {
                return false;
            }

            const price = product.discount_price || product.actual_price; // Определение цены с учетом скидки

            // Фильтрация по цене
            if (this.filters.priceFrom !== null && price < this.filters.priceFrom) {
                return false;
            }
            if (this.filters.priceTo !== null && price > this.filters.priceTo) {
                return false;
            }

            // Фильтрация по наличию скидки
            if (this.filters.discount && !product.discount_price) {
                return false;
            }

            return true; // Товар соответствует всем фильтрам
        });
    }

    sortProducts(products) { // Сортировка товаров
        return [...products].sort((a, b) => { // Сортировка копии массива, чтобы не изменять оригинал
            const priceA = a.discount_price || a.actual_price; // Цена товара A
            const priceB = b.discount_price || b.actual_price;// Цена товара B

            // Сортировка в зависимости от выбранного типа
            switch (this.sortType) {
                case 'price_asc': // По возрастанию цены
                    return priceA - priceB;
                case 'price_desc': // По убыванию цены
                    return priceB - priceA;
                case 'rating':  // По рейтингу
                    return b.rating - a.rating;
                default: // Без сортировки
                    return 0;
            }
        });
    }

    displayProducts() {  // Отображение товаров на странице
        const filteredProducts = this.filterProducts(); // Фильтрация товаров
        const sortedProducts = this.sortProducts(filteredProducts); // Сортировка товаров


        const productsHTML = sortedProducts.map(product => this.createProductCard(product)).join('');// Генерация HTML для отображения товаров

        this.productsGrid.innerHTML = productsHTML; // Вставка HTML на страницу
    }


    createProductCard(product) {  // Создание HTML карточки товара
        const price = product.discount_price || product.actual_price;// Цена с учетом скидки
        // Старая цена, если есть скидка
        const oldPrice = product.discount_price ?
            `<span class="product-card__old-price">${product.actual_price} ₽</span>` : '';
            // Метка "Скидка", если есть скидка
        const discountBadge = product.discount_price ?
            `<span class="product-card__discount-badge">Скидка</span>` : '';

        // Возврат HTML карточки товара
        return `
            <div class="product-card">
                <img src="${product.image_url}" alt="${product.name}">
                    ${discountBadge}
                <h3 class="product-card__title" title="${product.name}">
                    ${product.name}
                </h3>
                <div class="product-card__rating">
                    ${'★'.repeat(Math.round(product.rating))}${'☆'.repeat(5 - Math.round(product.rating))}
                    <span>${product.rating}</span>
                </div>
                <div class="product-card__price">
                    <span class="product-card__current-price">${price} ₽</span>
                    ${oldPrice}
                </div>
                <button class="button button--primary" onclick="catalog.addItemToCart(${product.id})">
                    Добавить в корзину
                </button>
            </div>
        `;
    }

    addItemToCart(productId) { // Добавление товара в корзину
        const cart = JSON.parse(localStorage.getItem('cart') || '[]'); // Получение текущей корзины из localStorage
        cart.push(productId); // Добавление ID товара в корзину
        localStorage.setItem('cart', JSON.stringify(cart)); // Сохранение обновленной корзины

        this.showNotification('Товар добавлен в корзину', 'success'); // Отображение уведомления

        displayCartCounter(); // Обновление счетчика товаров в корзине
    }



    showNotification(message, type = 'info') { // Отображение уведомлений
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`; // Класс для стилизации
        notification.textContent = message; // Текст уведомления
        document.getElementById('notifications').appendChild(notification); // Добавление уведомления на страницу

        setTimeout(() => notification.remove(), 5000); // Удаление уведомления через 5 секунд
    }
}



document.addEventListener('DOMContentLoaded', displayCartCounter);


const catalog = new ProductCatalog();
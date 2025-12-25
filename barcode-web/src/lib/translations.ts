export type Language = 'en' | 'az' | 'ru';

export const translations = {
  en: {
    // Login
    warehouseAdmin: 'Warehouse Admin',
    signInToAccount: 'Sign in to your account',
    username: 'Username',
    password: 'Password',
    enterUsername: 'Enter username',
    enterPassword: 'Enter password',
    signIn: 'Sign In',
    signingIn: 'Signing in...',
    
    // Navigation
    dashboard: 'Dashboard',
    inventory: 'Inventory',
    scanHistory: 'Scan History',
    logout: 'Logout',
    
    // Header
    hello: 'Hello',
    admin: 'Admin',
    
    // Dashboard
    totalProducts: 'Total Products',
    activeInventory: 'Active inventory',
    totalStock: 'Total Stock',
    unitsInWarehouse: 'Units in warehouse',
    lowStock: 'Low Stock',
    needRestock: 'Need restock',
    scansToday: 'Scans Today',
    barcodeScans: 'Barcode scans',
    lowStockAlert: 'Low Stock Alert',
    recentScans: 'Recent Scans',
    viewAll: 'View All',
    noLowStockItems: 'No low stock items',
    noRecentScans: 'No recent scans',
    left: 'left',
    
    // Inventory
    inventoryProducts: 'Inventory Products',
    searchProducts: 'Search products...',
    search: 'Search',
    refresh: 'Refresh',
    image: 'Image',
    barcode: 'Barcode',
    name: 'Name',
    stock: 'Stock',
    updated: 'Updated',
    noImg: 'No img',
    page: 'Page',
    of: 'of',
    previous: 'Previous',
    next: 'Next',
    loadingProducts: 'Loading products...',
    noProductsFound: 'No products found',
    
    // Scan History
    user: 'User',
    scannedAt: 'Scanned At',
    mode: 'Mode',
    device: 'Device',
    refreshing: 'Refreshing...',
    
    // Product Modal
    editProduct: 'Edit Product',
    edit: 'Edit',
    productName: 'Product Name',
    buyingPrice: 'Buying Price',
    sellingPrice: 'Selling Price',
    defaultSupplier: 'Default Supplier',
    defaultSellLocation: 'Default Sell Location',
    note: 'Note',
    productImage: 'Product Image',
    clickToUpload: 'Click to upload',
    remove: 'Remove',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    productNameRequired: 'Product name is required',
    imageMustBeLessThan2MB: 'Image must be less than 2MB',
    
    // Stock Management
    manageStock: 'Manage Stock',
    add: 'Add',
    addStock: 'Add Stock',
    removeStock: 'Remove Stock',
    quantity: 'Quantity',
    supplier: 'Supplier',
    location: 'Location',
    noteOptional: 'Note (optional)',
    processing: 'Processing...',
    stockHistory: 'Stock History',
    from: 'From',
    to: 'To',
    buyPrice: 'Buy Price',
    sellPrice: 'Sell Price',
    enterValidQuantity: 'Please enter a valid quantity',
    cannotRemove: 'Cannot remove',
    onlyInStock: 'Only',
    inStock: 'in stock',
    
    // Error messages
    failedToLoadScans: 'Failed to load scans',
    failedToLoadProducts: 'Failed to load products',
    loginFailed: 'Login failed',
    failedToUpdateProduct: 'Failed to update product',
    failedToUpdateStock: 'Failed to update stock',
    failedToLoadProductDetails: 'Failed to load product details',
    
    // Scan modes
    camera: 'Camera',
    keyboard: 'Keyboard',
    
    // Misc
    preview: 'Preview',
    imgPlaceholder: 'IMG',
    delete: 'Delete',
    
    // Categories
    categories: 'Categories',
    category: 'Category',
    addCategory: 'Add Category',
    editCategory: 'Edit Category',
    deleteCategory: 'Delete Category',
    categoryName: 'Category Name',
    categoryDescription: 'Description',
    categoryColor: 'Color',
    allCategories: 'All Categories',
    uncategorized: 'Uncategorized',
    selectCategory: 'Select Category',
    noCategory: 'No Category',
    confirmDeleteCategory: 'Are you sure you want to delete this category?',
    productsInCategory: 'products in this category',
    categoryCreated: 'Category created successfully',
    categoryUpdated: 'Category updated successfully',
    categoryDeleted: 'Category deleted successfully',
    categoryExists: 'Category already exists',
    categoryNameRequired: 'Category name is required',
    manageCategories: 'Manage Categories',
    noCategories: 'No categories yet',
    createFirstCategory: 'Create your first category',
    
    // Charts
    categoryDistribution: 'Category Distribution',
    inventoryValue: 'Inventory Value Over Time',
    totalBought: 'Total Bought',
    totalSold: 'Total Sold',
    profit: 'Profit',
    noDataAvailable: 'No data available',
    
    // Dashboard Stats
    totalBuyValue: 'Inventory Cost',
    totalSellValue: 'Inventory Worth',
    monthlyProfit: 'Monthly Profit',
    basedOnBuyPrice: 'Based on buy price',
    basedOnSellPrice: 'Based on sell price',
    thisMonth: 'This month',
  },
  az: {
    // Login
    warehouseAdmin: 'Anbar İdarəetməsi',
    signInToAccount: 'Hesabınıza daxil olun',
    username: 'İstifadəçi adı',
    password: 'Şifrə',
    enterUsername: 'İstifadəçi adını daxil edin',
    enterPassword: 'Şifrəni daxil edin',
    signIn: 'Daxil ol',
    signingIn: 'Daxil olunur...',
    
    // Navigation
    dashboard: 'İdarə paneli',
    inventory: 'İnventar',
    scanHistory: 'Skan tarixçəsi',
    logout: 'Çıxış',
    
    // Header
    hello: 'Salam',
    admin: 'Admin',
    
    // Dashboard
    totalProducts: 'Ümumi Məhsullar',
    activeInventory: 'Aktiv inventar',
    totalStock: 'Ümumi Stok',
    unitsInWarehouse: 'Anbardakı vahidlər',
    lowStock: 'Aşağı Stok',
    needRestock: 'Yenidən ehtiyat lazımdır',
    scansToday: 'Bugünkü Skanlar',
    barcodeScans: 'Barkod skanları',
    lowStockAlert: 'Aşağı Stok Xəbərdarlığı',
    recentScans: 'Son Skanlar',
    viewAll: 'Hamısına Bax',
    noLowStockItems: 'Aşağı stok elementi yoxdur',
    noRecentScans: 'Son skanlar yoxdur',
    left: 'qalıb',
    
    // Inventory
    inventoryProducts: 'İnventar Məhsulları',
    searchProducts: 'Məhsul axtar...',
    search: 'Axtar',
    refresh: 'Yenilə',
    image: 'Şəkil',
    barcode: 'Barkod',
    name: 'Ad',
    stock: 'Stok',
    updated: 'Yenilənib',
    noImg: 'Şəkil yox',
    page: 'Səhifə',
    of: '-dan',
    previous: 'Əvvəlki',
    next: 'Növbəti',
    loadingProducts: 'Məhsullar yüklənir...',
    noProductsFound: 'Məhsul tapılmadı',
    
    // Scan History
    user: 'İstifadəçi',
    scannedAt: 'Skan vaxtı',
    mode: 'Rejim',
    device: 'Cihaz',
    refreshing: 'Yenilənir...',
    
    // Product Modal
    editProduct: 'Məhsulu Redaktə Et',
    edit: 'Redaktə',
    productName: 'Məhsul Adı',
    buyingPrice: 'Alış Qiyməti',
    sellingPrice: 'Satış Qiyməti',
    defaultSupplier: 'Əsas Təchizatçı',
    defaultSellLocation: 'Əsas Satış Yeri',
    note: 'Qeyd',
    productImage: 'Məhsul Şəkli',
    clickToUpload: 'Yükləmək üçün klikləyin',
    remove: 'Sil',
    cancel: 'Ləğv et',
    save: 'Saxla',
    saving: 'Saxlanılır...',
    productNameRequired: 'Məhsul adı tələb olunur',
    imageMustBeLessThan2MB: 'Şəkil 2MB-dan az olmalıdır',
    
    // Stock Management
    manageStock: 'Stoku İdarə Et',
    add: 'Əlavə et',
    addStock: 'Stok Əlavə Et',
    removeStock: 'Stok Çıxar',
    quantity: 'Miqdar',
    supplier: 'Təchizatçı',
    location: 'Məkan',
    noteOptional: 'Qeyd (ixtiyari)',
    processing: 'İşlənir...',
    stockHistory: 'Stok Tarixçəsi',
    from: 'Haradan',
    to: 'Haraya',
    buyPrice: 'Alış Qiyməti',
    sellPrice: 'Satış Qiyməti',
    enterValidQuantity: 'Düzgün miqdar daxil edin',
    cannotRemove: 'Çıxarmaq olmur',
    onlyInStock: 'Yalnız',
    inStock: 'stokda',
    
    // Error messages
    failedToLoadScans: 'Skanları yükləmək alınmadı',
    failedToLoadProducts: 'Məhsulları yükləmək alınmadı',
    loginFailed: 'Daxil olmaq alınmadı',
    failedToUpdateProduct: 'Məhsulu yeniləmək alınmadı',
    failedToUpdateStock: 'Stoku yeniləmək alınmadı',
    failedToLoadProductDetails: 'Məhsul təfərrüatlarını yükləmək alınmadı',
    
    // Scan modes
    camera: 'Kamera',
    keyboard: 'Klaviatura',
    
    // Misc
    preview: 'Önizləmə',
    imgPlaceholder: 'ŞKL',
    delete: 'Sil',
    
    // Categories
    categories: 'Kateqoriyalar',
    category: 'Kateqoriya',
    addCategory: 'Kateqoriya Əlavə Et',
    editCategory: 'Kateqoriyanı Redaktə Et',
    deleteCategory: 'Kateqoriyanı Sil',
    categoryName: 'Kateqoriya Adı',
    categoryDescription: 'Təsvir',
    categoryColor: 'Rəng',
    allCategories: 'Bütün Kateqoriyalar',
    uncategorized: 'Kateqoriyasız',
    selectCategory: 'Kateqoriya Seçin',
    noCategory: 'Kateqoriya Yoxdur',
    confirmDeleteCategory: 'Bu kateqoriyanı silmək istədiyinizə əminsiniz?',
    productsInCategory: 'bu kateqoriyada məhsul',
    categoryCreated: 'Kateqoriya uğurla yaradıldı',
    categoryUpdated: 'Kateqoriya uğurla yeniləndi',
    categoryDeleted: 'Kateqoriya uğurla silindi',
    categoryExists: 'Kateqoriya artıq mövcuddur',
    categoryNameRequired: 'Kateqoriya adı tələb olunur',
    manageCategories: 'Kateqoriyaları İdarə Et',
    noCategories: 'Hələ kateqoriya yoxdur',
    createFirstCategory: 'İlk kateqoriyanızı yaradın',
    
    // Charts
    categoryDistribution: 'Kateqoriya Paylanması',
    inventoryValue: 'İnventar Dəyəri Zamanla',
    totalBought: 'Ümumi Alış',
    totalSold: 'Ümumi Satış',
    profit: 'Mənfəət',
    noDataAvailable: 'Məlumat yoxdur',
    
    // Dashboard Stats
    totalBuyValue: 'İnventar Dəyəri',
    totalSellValue: 'İnventar Qiyməti',
    monthlyProfit: 'Aylıq Mənfəət',
    basedOnBuyPrice: 'Alış qiymətinə görə',
    basedOnSellPrice: 'Satış qiymətinə görə',
    thisMonth: 'Bu ay',
  },
  ru: {
    // Login
    warehouseAdmin: 'Управление Складом',
    signInToAccount: 'Войдите в свой аккаунт',
    username: 'Имя пользователя',
    password: 'Пароль',
    enterUsername: 'Введите имя пользователя',
    enterPassword: 'Введите пароль',
    signIn: 'Войти',
    signingIn: 'Вход...',
    
    // Navigation
    dashboard: 'Панель управления',
    inventory: 'Инвентарь',
    scanHistory: 'История сканирований',
    logout: 'Выход',
    
    // Header
    hello: 'Привет',
    admin: 'Админ',
    
    // Dashboard
    totalProducts: 'Всего Товаров',
    activeInventory: 'Активный инвентарь',
    totalStock: 'Общий Запас',
    unitsInWarehouse: 'Единиц на складе',
    lowStock: 'Мало Запасов',
    needRestock: 'Требуется пополнение',
    scansToday: 'Сканов Сегодня',
    barcodeScans: 'Сканирования штрихкодов',
    lowStockAlert: 'Предупреждение о Низком Запасе',
    recentScans: 'Последние Сканирования',
    viewAll: 'Смотреть Все',
    noLowStockItems: 'Нет товаров с низким запасом',
    noRecentScans: 'Нет последних сканирований',
    left: 'осталось',
    
    // Inventory
    inventoryProducts: 'Товары Инвентаря',
    searchProducts: 'Поиск товаров...',
    search: 'Поиск',
    refresh: 'Обновить',
    image: 'Изображение',
    barcode: 'Штрихкод',
    name: 'Название',
    stock: 'Запас',
    updated: 'Обновлено',
    noImg: 'Нет фото',
    page: 'Страница',
    of: 'из',
    previous: 'Предыдущая',
    next: 'Следующая',
    loadingProducts: 'Загрузка товаров...',
    noProductsFound: 'Товары не найдены',
    
    // Scan History
    user: 'Пользователь',
    scannedAt: 'Время скана',
    mode: 'Режим',
    device: 'Устройство',
    refreshing: 'Обновление...',
    
    // Product Modal
    editProduct: 'Редактировать Товар',
    edit: 'Редактировать',
    productName: 'Название Товара',
    buyingPrice: 'Цена Покупки',
    sellingPrice: 'Цена Продажи',
    defaultSupplier: 'Основной Поставщик',
    defaultSellLocation: 'Основное Место Продажи',
    note: 'Заметка',
    productImage: 'Изображение Товара',
    clickToUpload: 'Нажмите для загрузки',
    remove: 'Удалить',
    cancel: 'Отмена',
    save: 'Сохранить',
    saving: 'Сохранение...',
    productNameRequired: 'Название товара обязательно',
    imageMustBeLessThan2MB: 'Изображение должно быть менее 2МБ',
    
    // Stock Management
    manageStock: 'Управление Запасом',
    add: 'Добавить',
    addStock: 'Добавить Запас',
    removeStock: 'Убрать Запас',
    quantity: 'Количество',
    supplier: 'Поставщик',
    location: 'Место',
    noteOptional: 'Заметка (необязательно)',
    processing: 'Обработка...',
    stockHistory: 'История Запасов',
    from: 'От',
    to: 'Куда',
    buyPrice: 'Цена Покупки',
    sellPrice: 'Цена Продажи',
    enterValidQuantity: 'Введите корректное количество',
    cannotRemove: 'Невозможно убрать',
    onlyInStock: 'Только',
    inStock: 'на складе',
    
    // Error messages
    failedToLoadScans: 'Не удалось загрузить сканирования',
    failedToLoadProducts: 'Не удалось загрузить товары',
    loginFailed: 'Ошибка входа',
    failedToUpdateProduct: 'Не удалось обновить товар',
    failedToUpdateStock: 'Не удалось обновить запас',
    failedToLoadProductDetails: 'Не удалось загрузить данные товара',
    
    // Scan modes
    camera: 'Камера',
    keyboard: 'Клавиатура',
    
    // Misc
    preview: 'Предпросмотр',
    imgPlaceholder: 'ФОТ',
    delete: 'Удалить',
    
    // Categories
    categories: 'Категории',
    category: 'Категория',
    addCategory: 'Добавить Категорию',
    editCategory: 'Редактировать Категорию',
    deleteCategory: 'Удалить Категорию',
    categoryName: 'Название Категории',
    categoryDescription: 'Описание',
    categoryColor: 'Цвет',
    allCategories: 'Все Категории',
    uncategorized: 'Без категории',
    selectCategory: 'Выберите Категорию',
    noCategory: 'Без Категории',
    confirmDeleteCategory: 'Вы уверены, что хотите удалить эту категорию?',
    productsInCategory: 'товаров в этой категории',
    categoryCreated: 'Категория успешно создана',
    categoryUpdated: 'Категория успешно обновлена',
    categoryDeleted: 'Категория успешно удалена',
    categoryExists: 'Категория уже существует',
    categoryNameRequired: 'Название категории обязательно',
    manageCategories: 'Управление Категориями',
    noCategories: 'Пока нет категорий',
    createFirstCategory: 'Создайте свою первую категорию',
    
    // Charts
    categoryDistribution: 'Распределение по Категориям',
    inventoryValue: 'Стоимость Инвентаря',
    totalBought: 'Всего Куплено',
    totalSold: 'Всего Продано',
    profit: 'Прибыль',
    noDataAvailable: 'Нет данных',
    
    // Dashboard Stats
    totalBuyValue: 'Стоимость Закупки',
    totalSellValue: 'Стоимость Продажи',
    monthlyProfit: 'Прибыль за Месяц',
    basedOnBuyPrice: 'По цене закупки',
    basedOnSellPrice: 'По цене продажи',
    thisMonth: 'В этом месяце',
  }
};

export const languageNames: Record<Language, string> = {
  en: 'English',
  az: 'Azərbaycan',
  ru: 'Русский'
};

export const languageFlags: Record<Language, string> = {
  en: '🇬🇧',
  az: '🇦🇿',
  ru: '🇷🇺'
};

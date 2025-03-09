// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
// Раскрываем приложение на весь экран и отключаем масштабирование
tg.expand();
tg.setViewportSettings({resize_frame: false});
tg.enableClosingConfirmation();

// Объявление переменных и состояний
let userData = {};
let walletData = {
    address: '',
    balance: 0
};
let transactions = [];
let exchangeRate = {
    rate: 0,
    isActual: false,
    updatedAt: null
};

// Получаем параметры из URL
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('user_id');

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    // Показываем загрузчик
    showLoadingState();
    
    // Инициализируем Telegram WebApp
    initTelegramWebApp();
    
    // Загружаем данные кошелька и пользователя из URL параметров
    loadWalletDataFromUrl();
    
    // Подключаем обработчики событий
    setupEventListeners();
});

// Инициализация Telegram WebApp
function initTelegramWebApp() {
    // Установка темы и цветов
    tg.setHeaderColor('#1a1a1a');
    tg.setBackgroundColor('#f5f5f5');
    
    // Показываем кнопку Main Button
    tg.MainButton.setText('Обновить данные');
    tg.MainButton.show();
    tg.MainButton.onClick(() => loadWalletData());
    
    // Получаем данные пользователя
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        userData = tg.initDataUnsafe.user;
        updateUserInfo(userData);
    }
}

// Загрузка данных кошелька из URL параметров
function loadWalletDataFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Получаем основные данные из URL параметров
    walletData.address = urlParams.get('address') || '';
    walletData.balance = parseFloat(urlParams.get('balance') || '0');
    
    // Получаем данные о курсе из URL параметров
    exchangeRate.rate = parseFloat(urlParams.get('rate') || '0');
    exchangeRate.updatedAt = urlParams.get('rate_updated') || new Date().toISOString();
    exchangeRate.isActual = urlParams.get('rate_actual') === 'true';
    
    // Другие параметры
    const hasTransactions = urlParams.get('has_transactions') === 'true';
    
    // Обновляем UI с полученными данными
    updateWalletInfo();
    
    // Загружаем историю транзакций если она есть
    if (hasTransactions) {
        loadTransactions();
    } else {
        showEmptyTransactions();
    }
    
    // Скрываем загрузчик
    hideLoadingState();
}

// Загрузка данных кошелька
function loadWalletData() {
    // Показываем индикатор загрузки
    showLoadingState();
    
    // Получаем параметры из URL для первоначальной загрузки
    const urlParams = new URLSearchParams(window.location.search);
    const walletAddress = urlParams.get('address') || localStorage.getItem('wallet_address');
    
    // Если нет адреса, значит, нужно авторизоваться через бота
    if (!walletAddress) {
        showAuthRequiredState();
        return;
    }
    
    // Сначала используем данные из URL для быстрой загрузки интерфейса
    const initialBalance = parseFloat(urlParams.get('balance') || localStorage.getItem('wallet_balance') || 0);
    const initialRate = parseFloat(urlParams.get('rate') || localStorage.getItem('usdt_rate') || 90);
    const initialRateUpdated = urlParams.get('rate_updated') || localStorage.getItem('rate_updated');
    const initialRateActual = (urlParams.get('rate_actual') === 'true') || (localStorage.getItem('rate_actual') === 'true');
    
    // Заполняем начальные данные кошелька
    walletData = {
        address: walletAddress,
        balance: initialBalance
    };
    
    exchangeRate = {
        rate: initialRate,
        isActual: initialRateActual,
        updatedAt: initialRateUpdated ? new Date(initialRateUpdated) : new Date()
    };
    
    // Сохраняем данные в локальное хранилище
    localStorage.setItem('wallet_address', walletAddress);
    localStorage.setItem('wallet_balance', initialBalance);
    localStorage.setItem('usdt_rate', initialRate);
    localStorage.setItem('rate_updated', initialRateUpdated);
    localStorage.setItem('rate_actual', initialRateActual);
    
    // Обновляем UI с начальными данными
    updateWalletInfo();
    
    // Генерируем QR-код
    generateQRCode(walletData.address);
    
    // Затем запрашиваем актуальные данные с сервера
    fetchWalletData();
    
    // Загружаем историю транзакций
    loadTransactions();
}

// Получение данных кошелька с сервера
function fetchWalletData() {
    // Проверяем наличие данных для запроса
    if (!tg.initData) {
        console.error('Нет данных для аутентификации запроса');
        hideLoadingState();
        return;
    }
    
    // Выполняем запрос к API для получения данных кошелька
    fetch(`https://api.usdt-wallet.example.com/api/wallet/data`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            telegram_data: tg.initDataUnsafe
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Ошибка при получении данных кошелька');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Обновляем данные кошелька
            walletData = data.wallet;
            
            // Обновляем данные о курсе
            exchangeRate = data.exchange_rate;
            exchangeRate.updatedAt = new Date(exchangeRate.updated_at);
            
            // Сохраняем данные в локальное хранилище
            localStorage.setItem('wallet_address', walletData.address);
            localStorage.setItem('wallet_balance', walletData.balance);
            localStorage.setItem('usdt_rate', exchangeRate.rate);
            localStorage.setItem('rate_updated', exchangeRate.updated_at);
            localStorage.setItem('rate_actual', exchangeRate.is_actual);
            
            // Обновляем UI
            updateWalletInfo();
        } else {
            console.error('Ошибка в ответе сервера:', data.error);
        }
    })
    .catch(error => {
        console.error('Ошибка при выполнении запроса:', error);
    })
    .finally(() => {
        hideLoadingState();
    });
}

// Загрузка истории транзакций
function loadTransactions() {
    const recentTransactionsContainer = document.getElementById('recent-transactions');
    const fullTransactionsContainer = document.getElementById('transactions-container');
    
    // Показываем индикатор загрузки
    if (recentTransactionsContainer) {
        recentTransactionsContainer.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i><p>Загрузка транзакций...</p></div>';
    }
    
    if (fullTransactionsContainer) {
        fullTransactionsContainer.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i><p>Загрузка транзакций...</p></div>';
    }
    
    // Проверяем наличие данных для запроса
    if (!tg.initData) {
        console.error('Нет данных для аутентификации запроса');
        showEmptyTransactions();
        return;
    }
    
    // Выполняем запрос к API для получения истории транзакций
    fetch(`https://api.usdt-wallet.example.com/api/wallet/transactions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            telegram_data: tg.initDataUnsafe,
            limit: 20
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Ошибка при получении истории транзакций');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Обновляем массив транзакций
            transactions = data.transactions.map(tx => ({
                ...tx,
                timestamp: new Date(tx.timestamp)
            }));
            
            // Рендерим транзакции
            renderTransactions();
        } else {
            console.error('Ошибка в ответе сервера:', data.error);
            showEmptyTransactions();
        }
    })
    .catch(error => {
        console.error('Ошибка при выполнении запроса:', error);
        showEmptyTransactions();
    });
}

// Отображение пустого состояния для транзакций
function showEmptyTransactions() {
    const recentTransactionsContainer = document.getElementById('recent-transactions');
    const fullTransactionsContainer = document.getElementById('transactions-container');
    
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
        <i class="fas fa-receipt"></i>
        <p>У вас пока нет транзакций.</p>
    `;
    
    if (recentTransactionsContainer) {
        recentTransactionsContainer.innerHTML = '';
        recentTransactionsContainer.appendChild(emptyState.cloneNode(true));
    }
    
    if (fullTransactionsContainer) {
        fullTransactionsContainer.innerHTML = '';
        fullTransactionsContainer.appendChild(emptyState.cloneNode(true));
    }
}

// Отображение транзакций
function renderTransactions() {
    const recentTransactionsContainer = document.getElementById('recent-transactions');
    const fullTransactionsContainer = document.getElementById('transactions-container');
    
    // Очищаем контейнеры
    recentTransactionsContainer.innerHTML = '';
    if (fullTransactionsContainer) {
        fullTransactionsContainer.innerHTML = '';
    }
    
    // Если нет транзакций
    if (!transactions || transactions.length === 0) {
        showEmptyTransactions();
        return;
    }
    
    // Создаем элементы транзакций для последних 3 транзакций
    const recentTxs = transactions.slice(0, 3);
    recentTxs.forEach(tx => {
        const txElement = createTransactionElement(tx);
        recentTransactionsContainer.appendChild(txElement);
    });
    
    // Если открыто модальное окно со всеми транзакциями
    if (fullTransactionsContainer) {
        transactions.forEach(tx => {
            const txElement = createTransactionElement(tx);
            fullTransactionsContainer.appendChild(txElement);
        });
    }
}

// Создание элемента транзакции
function createTransactionElement(tx) {
    const txElement = document.createElement('div');
    txElement.className = 'transaction-item';
    
    const formattedDate = formatDate(tx.timestamp);
    const shortenedAddress = shortenAddress(tx.address);
    
    txElement.innerHTML = `
        <div class="transaction-icon ${tx.type}">
            <i class="fas fa-${tx.type === 'receive' ? 'arrow-down' : 'arrow-up'}"></i>
        </div>
        <div class="transaction-info">
            <div class="transaction-title">${tx.type === 'receive' ? 'Получено' : 'Отправлено'}</div>
            <div class="transaction-address">${shortenedAddress}</div>
        </div>
        <div class="transaction-details">
            <div class="transaction-amount ${tx.type}">${tx.type === 'receive' ? '+' : '-'}${formatAmount(tx.amount)} USDT</div>
            <div class="transaction-date">${formattedDate}</div>
        </div>
    `;
    
    // Добавляем обработчик события для просмотра деталей транзакции
    txElement.addEventListener('click', () => {
        showTransactionDetails(tx);
    });
    
    return txElement;
}

// Показ деталей транзакции (можно реализовать позже)
function showTransactionDetails(tx) {
    // Открывает Tronscan в Telegram браузере
    const tronscanUrl = `https://tronscan.org/#/transaction/${tx.tx_id}`;
    tg.openLink(tronscanUrl);
}

// Обновление информации о пользователе
function updateUserInfo(user) {
    const userNameElement = document.getElementById('user-name');
    const userAvatarElement = document.getElementById('user-avatar');
    
    if (userNameElement) {
        userNameElement.textContent = user.username || user.first_name || 'Пользователь';
    }
    
    if (userAvatarElement && user.photo_url) {
        userAvatarElement.src = user.photo_url;
    }
}

// Обновление информации о кошельке
function updateWalletInfo() {
    const usdtBalanceElement = document.getElementById('usdt-balance');
    const rubBalanceElement = document.getElementById('rub-balance');
    const walletAddressElement = document.getElementById('wallet-address');
    const exchangeRateElement = document.getElementById('exchange-rate');
    const rateUpdateTimeElement = document.getElementById('rate-update-time');
    const availableBalanceElement = document.getElementById('available-balance');
    
    if (usdtBalanceElement) {
        usdtBalanceElement.textContent = `${formatAmount(walletData.balance)} USDT`;
    }
    
    if (rubBalanceElement) {
        const rubAmount = walletData.balance * exchangeRate.rate;
        rubBalanceElement.textContent = `${formatAmount(rubAmount, 2)} ₽`;
    }
    
    if (walletAddressElement) {
        walletAddressElement.textContent = walletData.address;
    }
    
    if (exchangeRateElement) {
        exchangeRateElement.textContent = formatAmount(exchangeRate.rate, 2);
    }
    
    if (rateUpdateTimeElement && exchangeRate.updatedAt) {
        rateUpdateTimeElement.textContent = formatDate(exchangeRate.updatedAt);
    }
    
    if (availableBalanceElement) {
        availableBalanceElement.textContent = `${formatAmount(walletData.balance)} USDT`;
    }
}

// Генерация QR-кода
function generateQRCode(address) {
    const qrCodeContainer = document.getElementById('qr-code');
    
    if (!qrCodeContainer) return;
    
    // Используем API для генерации QR-кода
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${address}`;
    
    const qrImage = document.createElement('img');
    qrImage.src = qrCodeUrl;
    qrImage.alt = 'QR код адреса кошелька';
    
    qrCodeContainer.innerHTML = '';
    qrCodeContainer.appendChild(qrImage);
}

// Отправка USDT
function sendUsdt(address, amount) {
    // Показываем загрузчик
    showLoadingState();
    
    // Создаем данные для отправки боту
    const sendData = {
        action: 'send',
        to_address: address,
        amount: amount
    };
    
    // Отправляем данные в Telegram
    sendDataToTelegram(sendData);
    
    // Скрываем загрузчик и показываем сообщение об успехе
    hideLoadingState();
    showSuccess('Запрос на отправку USDT отправлен в бот');
    
    // Закрываем модальное окно отправки
    closeModal('sendModal');
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчик нажатия на кнопку обновления
    const refreshButton = document.getElementById('refresh-button');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            loadWalletData();
        });
    }
    
    // Обработчик нажатия на кнопку копирования адреса
    const copyAddressButton = document.getElementById('copy-address');
    if (copyAddressButton) {
        copyAddressButton.addEventListener('click', () => {
            const address = walletData.address;
            copyToClipboard(address);
            showSuccess('Адрес скопирован');
        });
    }
    
    // Обработчики для кнопок действий
    setupActionButtonHandlers();
    
    // Обработчики для модальных окон
    setupModalHandlers();
}

// Настройка обработчиков для кнопок действий
function setupActionButtonHandlers() {
    // Пополнение
    const depositBtn = document.getElementById('deposit-btn');
    if (depositBtn) {
        depositBtn.addEventListener('click', () => {
            // Отправляем команду боту для показа инструкций по пополнению
            sendDataToTelegram({
                event: 'show_deposit'
            });
            
            // Закрываем веб-приложение, чтобы показать диалог бота
            tg.close();
        });
    }
    
    // Отправка
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            openModal('send-modal');
        });
    }
    
    // История
    const historyBtn = document.getElementById('history-btn');
    if (historyBtn) {
        historyBtn.addEventListener('click', () => {
            openModal('history-modal');
        });
    }
    
    // Резервная фраза
    const backupBtn = document.getElementById('backup-btn');
    if (backupBtn) {
        backupBtn.addEventListener('click', () => {
            loadMnemonic();
            openModal('backup-modal');
        });
    }
    
    // Кнопка просмотра всех транзакций
    const viewAllTransactionsBtn = document.getElementById('view-all-transactions');
    if (viewAllTransactionsBtn) {
        viewAllTransactionsBtn.addEventListener('click', () => {
            openModal('history-modal');
        });
    }
    
    // Кнопка помощи
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            // Отправляем команду боту для показа справки
            sendDataToTelegram({
                event: 'show_help'
            });
            
            // Закрываем веб-приложение, чтобы показать диалог бота
            tg.close();
        });
    }
    
    // Кнопка настроек
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            // Отправляем команду боту для показа настроек
            sendDataToTelegram({
                event: 'show_settings'
            });
            
            // Закрываем веб-приложение, чтобы показать диалог бота
            tg.close();
        });
    }
}

// Настройка обработчиков для модальных окон
function setupModalHandlers() {
    // Обработчики для закрытия модальных окон
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Модальное окно отправки
    const sendModal = document.getElementById('send-modal');
    if (sendModal) {
        const cancelSendBtn = document.getElementById('cancel-send');
        const confirmSendBtn = document.getElementById('confirm-send');
        const recipientAddressInput = document.getElementById('recipient-address');
        const sendAmountInput = document.getElementById('send-amount');
        
        // Отмена отправки
        if (cancelSendBtn) {
            cancelSendBtn.addEventListener('click', () => {
                closeModal('send-modal');
            });
        }
        
        // Подтверждение отправки
        if (confirmSendBtn) {
            confirmSendBtn.addEventListener('click', () => {
                const recipientAddress = recipientAddressInput.value.trim();
                const sendAmount = parseFloat(sendAmountInput.value);
                
                sendUsdt(recipientAddress, sendAmount);
            });
        }
    }
    
    // Модальное окно резервной фразы
    const backupModal = document.getElementById('backup-modal');
    if (backupModal) {
        const copyMnemonicBtn = document.getElementById('copy-mnemonic');
        
        if (copyMnemonicBtn) {
            copyMnemonicBtn.addEventListener('click', () => {
                const mnemonicContainer = document.getElementById('mnemonic-phrase');
                const mnemonicText = mnemonicContainer.textContent.trim();
                
                copyToClipboard(mnemonicText);
                showSuccess('Мнемоническая фраза скопирована');
            });
        }
    }
    
    // Обработчик клика на подложку модального окна
    const modalBackdrop = document.getElementById('modal-backdrop');
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', () => {
            const openModals = document.querySelectorAll('.modal:not(.hidden)');
            openModals.forEach(modal => {
                closeModal(modal.id);
            });
        });
    }
}

// Загрузка мнемонической фразы
function loadMnemonic() {
    // Показываем загрузчик
    showLoadingState();
    
    // Создаем данные для отправки боту
    const mnemonicRequest = {
        action: 'mnemonic'
    };
    
    // Отправляем данные в Telegram
    sendDataToTelegram(mnemonicRequest);
    
    // Показываем сообщение пользователю
    showSuccess('Запрос на получение мнемонической фразы отправлен в бот');
    hideLoadingState();
}

// Открытие модального окна
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    const backdrop = document.getElementById('modal-backdrop');
    
    if (!modal || !backdrop) return;
    
    modal.classList.remove('hidden');
    backdrop.classList.remove('hidden');
    
    // Если это модальное окно истории, обновляем список транзакций
    if (modalId === 'history-modal') {
        renderTransactions();
    }
}

// Закрытие модального окна
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const backdrop = document.getElementById('modal-backdrop');
    
    if (!modal) return;
    
    modal.classList.add('hidden');
    
    // Проверяем, есть ли открытые модальные окна
    const openModals = document.querySelectorAll('.modal:not(.hidden)');
    if (openModals.length === 0 && backdrop) {
        backdrop.classList.add('hidden');
    }
    
    // Сбрасываем формы
    if (modalId === 'send-modal') {
        const recipientAddressInput = document.getElementById('recipient-address');
        const sendAmountInput = document.getElementById('send-amount');
        
        if (recipientAddressInput) recipientAddressInput.value = '';
        if (sendAmountInput) sendAmountInput.value = '';
    }
}

// Показ состояния загрузки
function showLoadingState() {
    document.body.classList.add('loading');
}

// Скрытие состояния загрузки
function hideLoadingState() {
    document.body.classList.remove('loading');
}

// Показ состояния, требующего авторизации
function showAuthRequiredState() {
    // Показываем сообщение о необходимости авторизации через бота
    alert('Для использования веб-приложения необходимо авторизоваться через бот Telegram.');
    tg.close();
}

// Показ сообщения об успехе
function showSuccess(message) {
    // Используем Telegram WebApp API для показа попапа
    tg.showPopup({
        title: 'Успешно',
        message: message,
        buttons: [{ type: 'ok' }]
    });
}

// Показ сообщения об ошибке
function showError(message) {
    // Используем Telegram WebApp API для показа попапа
    tg.showPopup({
        title: 'Ошибка',
        message: message,
        buttons: [{ type: 'ok' }]
    });
}

// Отправка данных в Telegram
function sendDataToTelegram(data) {
    tg.sendData(JSON.stringify(data));
}

// Копирование текста в буфер обмена
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

// Проверка валидности адреса TRON
function isValidTronAddress(address) {
    // Простая проверка формата адреса Tron
    return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
}

// Форматирование суммы
function formatAmount(amount, precision = 6) {
    if (amount >= 1000) {
        return amount.toLocaleString('ru-RU', { 
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    } else {
        const formatted = amount.toFixed(precision);
        return formatted.replace(/\.?0+$/, '');
    }
}

// Форматирование даты
function formatDate(dateObj) {
    const now = new Date();
    const date = new Date(dateObj);
    
    // Если сегодня
    if (date.toDateString() === now.toDateString()) {
        return `Сегодня, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Если вчера
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return `Вчера, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Иначе полная дата
    return date.toLocaleString('ru-RU', { 
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Сокращение адреса
function shortenAddress(address, chars = 6) {
    if (!address) return '';
    if (address.length <= chars * 2 + 3) return address;
    
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
} 
// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand(); // Раскрываем приложение на весь экран

// Объявление переменных и состояний
let userData = {};
let walletData = {};
let transactions = [];
let exchangeRate = {
    rate: 0,
    isActual: false,
    updatedAt: null
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    // Показываем загрузчик
    showLoadingState();
    
    // Инициализируем Telegram WebApp
    initTelegramWebApp();
    
    // Загружаем данные кошелька и пользователя
    loadWalletData();
    
    // Подключаем обработчики событий
    setupEventListeners();
});

// Инициализация Telegram WebApp
function initTelegramWebApp() {
    // Установка темы и цветов
    tg.setHeaderColor('#1a1a1a');
    tg.setBackgroundColor('#f5f5f5');
    
    // Показываем кнопку Main Button
    tg.MainButton.setText('Закрыть');
    tg.MainButton.onClick(() => tg.close());
    
    // Получаем данные пользователя
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        userData = tg.initDataUnsafe.user;
        updateUserInfo(userData);
    }
}

// Загрузка данных кошелька
function loadWalletData() {
    // Имитация запроса к API (в реальном приложении здесь будет запрос к серверу)
    // В этом примере мы будем использовать параметры, переданные из бота
    
    // Получаем параметры из URL
    const urlParams = new URLSearchParams(window.location.search);
    const walletAddress = urlParams.get('address') || localStorage.getItem('wallet_address');
    const walletBalance = parseFloat(urlParams.get('balance') || localStorage.getItem('wallet_balance') || 0);
    const usdtRate = parseFloat(urlParams.get('rate') || localStorage.getItem('usdt_rate') || 90);
    const rateUpdated = urlParams.get('rate_updated') || localStorage.getItem('rate_updated');
    const rateActual = (urlParams.get('rate_actual') === 'true') || (localStorage.getItem('rate_actual') === 'true');
    
    // Если нет адреса, значит, нужно авторизоваться через бота
    if (!walletAddress) {
        showAuthRequiredState();
        return;
    }
    
    // Сохраняем данные в локальное хранилище для последующих запусков
    localStorage.setItem('wallet_address', walletAddress);
    localStorage.setItem('wallet_balance', walletBalance);
    localStorage.setItem('usdt_rate', usdtRate);
    localStorage.setItem('rate_updated', rateUpdated);
    localStorage.setItem('rate_actual', rateActual);
    
    // Заполняем данные кошелька
    walletData = {
        address: walletAddress,
        balance: walletBalance
    };
    
    exchangeRate = {
        rate: usdtRate,
        isActual: rateActual,
        updatedAt: rateUpdated ? new Date(rateUpdated) : new Date()
    };
    
    // Обновляем UI
    updateWalletInfo();
    
    // Загружаем историю транзакций
    loadTransactions();
    
    // Генерируем QR-код
    generateQRCode(walletData.address);
    
    // Скрываем загрузчик
    hideLoadingState();
}

// Загрузка истории транзакций
function loadTransactions() {
    // Имитация запроса к API
    // В реальном приложении здесь будет запрос к серверу
    
    // Пример данных для демонстрации
    setTimeout(() => {
        const demoTransactions = [
            {
                id: 1,
                type: 'receive',
                amount: 100.5,
                address: 'TJRabPrwbZy45sbavfcjinPJC18kjpRTv8',
                tx_id: 'a1b2c3d4e5f6g7h8i9j0',
                timestamp: new Date(Date.now() - 86400000) // Вчера
            },
            {
                id: 2,
                type: 'send',
                amount: 50.25,
                address: 'TN8RsMAdFjTbvMbZqHP8c8mHGGNigQRXsF',
                tx_id: 'b2c3d4e5f6g7h8i9j0k1',
                timestamp: new Date(Date.now() - 3600000) // Час назад
            },
            {
                id: 3,
                type: 'receive',
                amount: 25.75,
                address: 'TPwjxwL2Rh1Qy5rnxhqTU2z2gcq9j8qgM7',
                tx_id: 'c3d4e5f6g7h8i9j0k1l2',
                timestamp: new Date(Date.now() - 1800000) // 30 минут назад
            }
        ];
        
        transactions = demoTransactions;
        renderTransactions();
    }, 1000);
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
    if (transactions.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <i class="fas fa-receipt"></i>
            <p>У вас пока нет транзакций.</p>
        `;
        
        recentTransactionsContainer.appendChild(emptyState);
        if (fullTransactionsContainer) {
            fullTransactionsContainer.appendChild(emptyState.cloneNode(true));
        }
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
    
    // В реальном приложении можно использовать библиотеку QRCode.js
    // Здесь мы используем API для генерации QR-кода
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${address}`;
    
    const qrImage = document.createElement('img');
    qrImage.src = qrCodeUrl;
    qrImage.alt = 'QR код адреса кошелька';
    
    qrCodeContainer.innerHTML = '';
    qrCodeContainer.appendChild(qrImage);
}

// Отправка USDT (имитация)
function sendUsdt(address, amount) {
    // Проверка валидности адреса и суммы
    if (!isValidTronAddress(address)) {
        showError('Некорректный адрес Tron');
        return;
    }
    
    if (amount <= 0) {
        showError('Сумма должна быть больше нуля');
        return;
    }
    
    if (amount > walletData.balance) {
        showError('Недостаточно средств');
        return;
    }
    
    // Показываем загрузчик
    showLoadingState();
    
    // Имитация запроса к API
    setTimeout(() => {
        // В реальном приложении здесь будет запрос к серверу
        
        // Создаем новую транзакцию
        const newTx = {
            id: transactions.length + 1,
            type: 'send',
            amount: amount,
            address: address,
            tx_id: generateRandomTxId(),
            timestamp: new Date()
        };
        
        // Обновляем баланс
        walletData.balance -= amount;
        localStorage.setItem('wallet_balance', walletData.balance);
        
        // Добавляем новую транзакцию в начало массива
        transactions.unshift(newTx);
        
        // Обновляем UI
        updateWalletInfo();
        renderTransactions();
        
        // Отправляем данные в Telegram
        sendDataToTelegram({
            event: 'transaction_sent',
            data: newTx
        });
        
        // Скрываем модальное окно
        closeModal('send-modal');
        
        // Показываем сообщение об успехе
        showSuccess('Транзакция успешно отправлена');
        
        // Скрываем загрузчик
        hideLoadingState();
    }, 2000);
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчик нажатия на кнопку обновления
    const refreshButton = document.getElementById('refresh-button');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            showLoadingState();
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
                const mnemonicWords = Array.from(mnemonicContainer.querySelectorAll('.mnemonic-word span.word'))
                    .map(span => span.textContent)
                    .join(' ');
                
                copyToClipboard(mnemonicWords);
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
    const mnemonicContainer = document.getElementById('mnemonic-phrase');
    
    if (!mnemonicContainer) return;
    
    // Очищаем контейнер
    mnemonicContainer.innerHTML = '';
    
    // Запрашиваем мнемоническую фразу от бота
    // В реальном приложении здесь будет запрос к серверу
    
    // Для демонстрации используем пример фразы
    const demoMnemonic = "abandon ability able about above absent absorb abstract absurd abuse access accident".split(' ');
    
    // Создаем элементы для каждого слова
    demoMnemonic.forEach((word, index) => {
        const wordElement = document.createElement('div');
        wordElement.className = 'mnemonic-word';
        wordElement.innerHTML = `
            <span class="number">${index + 1}.</span>
            <span class="word">${word}</span>
        `;
        
        mnemonicContainer.appendChild(wordElement);
    });
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
    // Можно добавить индикатор загрузки поверх всего приложения
}

// Скрытие состояния загрузки
function hideLoadingState() {
    // Скрываем индикатор загрузки
}

// Показ состояния, требующего авторизации
function showAuthRequiredState() {
    // Можно показать сообщение о необходимости авторизации через бота
}

// Показ сообщения об успехе
function showSuccess(message) {
    // Временно используем alert, в реальном приложении лучше показывать тост
    tg.showPopup({
        title: 'Успешно',
        message: message,
        buttons: [{ type: 'ok' }]
    });
}

// Показ сообщения об ошибке
function showError(message) {
    // Временно используем alert, в реальном приложении лучше показывать тост
    tg.showPopup({
        title: 'Ошибка',
        message: message,
        buttons: [{ type: 'ok' }]
    });
}

// Отправка данных в Telegram
function sendDataToTelegram(data) {
    // Используем Telegram WebApp API для отправки данных боту
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

// Генерация случайного ID транзакции (для демонстрации)
function generateRandomTxId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
} 
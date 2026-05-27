import * as React from 'react';

type Language = 'en' | 'ru';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ru: {
    // Stories UI
    'Overview': 'Обзор',
    'Zen': 'Дзен',
    'Tips': 'Фишки',
    'Pult': 'Пульт',
    'Done': 'Готово',
    'Other': 'Другое',
    
    // Actions / Pult
    'Fast Control': 'Быстрый пульт',
    'Interactive Control': 'Интерактивное управление',
    'Transactions History': 'История',
    'Financial Feed': 'Все операции',
    'Expense Calendar': 'Календарь',
    'Spending Grid': 'Расходов и доходов',
    'Spending Analytics': 'Аналитика',
    'Expense Chart': 'Категории и теги',
    'Settings': 'Настройки',
    'App Configuration': 'Конфигурация приложения',
    'Language': 'Язык',
    'Theme': 'Тема',
    'Currency of Categories': 'Валюта категорий',
    'Base Currency': 'Базовая валюта',
    'Local Currency': 'Локальная валюта',
    'English': 'English',
    'Russian': 'Русский',
    'Update': 'Обновить',
    'Feed': 'Лента',
    'Calendar': 'Календарь',
    'Analytics': 'Аналитика',
    'Security': 'Безопасность',
    'Application': 'Приложение',
    'Install CoinLover': 'Установить CoinLover',
    'Scan QR code to download': 'Отсканируйте QR-код для скачивания приложения на ваш смартфон',
    'Download APK': 'Скачать APK (Android)',
    'Biometrics and Login': 'Биометрия и Вход',
    'Biometrics Desc': 'Вы можете привязать это устройство к данным. Это позволит вам мгновенно входить в приложение с помощью Face ID или Touch ID на любом из ваших устройств.',
    'Biometrics Active': 'Биометрия активна',
    'Device Linked': 'Устройство связано с данными',
    'Biometrics Not Configured': 'Биометрия не настроена',
    'Login via link only': 'Вход только по ссылке',
    'Relink Device': 'Перепривязать устройство',
    'Setup Biometrics': 'Настроить Face ID / Touch ID',
    'Loading Data': 'Загрузка данных...',
    'Wallets': 'Кошельки',
    'Create': 'Создать',
    'Incomes': 'Доходы',
    'Expenses': 'Расходы',
    'this month': 'в этом месяце',
    'Confirm biometrics': 'Подтвердите биометрию...',
    'Select Account': 'Выбор аккаунта',
    'My Account': 'Мой аккаунт',
    'Structure created': 'Структура таблицы создана!',
    'Init Error': 'Ошибка. Проверьте доступ для сервисного аккаунта.',
    'Connection Error': 'Ошибка соединения.',
    'Initialize': 'Инициализировать',
    'Add User Hint': 'Чтобы добавить пользователя, впишите его в раздел === USERS === на листе Configs вашей мастер-таблицы.',

    // Overview Story
    'Your May in Numbers': 'Твой май в цифрах',
    'Total Assets Summary': 'Общая сводка активов',
    'Total Balance': 'Общий баланс',
    'Wallet Distribution': 'Распределение по кошелькам',
    'Top Categories': 'Топ категорий',
    'Main Expenses': 'Основные траты',
    'Received': 'Получено',
    'Spent': 'Потрачено',
    'Swipe for top categories': 'Листай дальше, чтобы увидеть топ-категории расходов',
    'Swipe for wallet split': 'Листай дальше, чтобы увидеть валютный сплит',
    'of total spent': 'от всех трат',
    'No expenses yet this month.': 'В этом месяце пока нет расходов.',
    'Capital structure': 'Распределение твоего капитала',
    'of total assets': 'от всех средств',

    // Zen Story
    'Zen Mode': 'Режим Дзен',
    'Financial Balance': 'Финансовый баланс',
    'No-Spend Days': 'Дней без трат',
    'Great result!': 'Отличный результат!',
    'Keep it up!': 'Так держать!',
    'Daily Average': 'Среднее в день',
    'Projected': 'Прогноз на месяц',
    'Financial Karma': 'Финансовая карма',
    'No-Spend Day! 🔥': 'День без трат! 🔥',
    'Today expenses are under control': 'Все сегодняшние расходы под полным контролем',
    'Your wallet is resting today': 'Твой кошелек сегодня полностью отдыхает',
    'Spent today': 'Сегодня записано трат на сумму',
    'Day Detail': 'Детализация дня',
    'and': 'и еще',
    'more today': 'сегодня',
    'Today is a No-Spend Day. Good job!': 'Сегодня у тебя No-Spend Day. Твой кошелек говорит спасибо!',
    'Savings analysis': 'Анализ сбережений',
    'Spent from income': 'Потрачено от полученного',
    'No income recorded yet this month.': 'В этом месяце пока нет доходов.',
    'Finish your day right': 'Заверши день правильно',
    'Open Expense Calendar': 'Открыть календарь трат',

    // Tips Story
    'Useful Tips': 'Полезные фишки',
    'App Secrets': 'Секреты приложения',
    'Long Press': 'Долгое нажатие',
    'Quick actions on accounts': 'Быстрые действия на счетах',
    'Drag & Drop': 'Перетаскивание',
    'Reorder your categories': 'Меняйте порядок категорий',
    'Safe Mode': 'Безопасный режим',
    'Hide balances in public': 'Скрывайте балансы в людных местах',
    'Dark Theme': 'Темная тема',
    'Easy on the eyes': 'Комфортно для глаз'
  },
  en: {
    // Stories UI
    'Overview': 'Overview',
    'Zen': 'Zen',
    'Tips': 'Tips',
    'Pult': 'Pult',
    'Done': 'Done',
    'Other': 'Other',

    // Actions / Pult
    'Fast Control': 'Fast Control',
    'Interactive Control': 'Interactive Control',
    'Transactions History': 'History',
    'Financial Feed': 'All Transactions',
    'Expense Calendar': 'Calendar',
    'Spending Grid': 'Expenses and Incomes',
    'Spending Analytics': 'Analytics',
    'Expense Chart': 'Categories and Tags',
    'Settings': 'Settings',
    'App Configuration': 'Configuration',
    'Language': 'Language',
    'Theme': 'Theme',
    'Currency of Categories': 'Category Currency',
    'Base Currency': 'Base Currency',
    'Local Currency': 'Local Currency',
    'English': 'English',
    'Russian': 'Russian',
    'Update': 'Update',
    'Feed': 'Feed',
    'Calendar': 'Calendar',
    'Analytics': 'Analytics',
    'Security': 'Security',
    'Application': 'App',
    'Install CoinLover': 'Install CoinLover',
    'Scan QR code to download': 'Scan QR code to download the app to your smartphone',
    'Download APK': 'Download APK (Android)',
    'Biometrics and Login': 'Biometrics and Login',
    'Biometrics Desc': 'You can link this device to your data. This will allow you to instantly log in to the app using Face ID or Touch ID on any of your devices.',
    'Biometrics Active': 'Biometrics active',
    'Device Linked': 'Device linked to data',
    'Biometrics Not Configured': 'Biometrics not configured',
    'Login via link only': 'Login via link only',
    'Relink Device': 'Relink device',
    'Setup Biometrics': 'Setup Face ID / Touch ID',
    'Loading Data': 'Loading data...',
    'Wallets': 'Wallets',
    'Create': 'Create',
    'Incomes': 'Incomes',
    'Expenses': 'Expenses',
    'this month': 'this month',
    'Confirm biometrics': 'Confirm biometrics...',
    'Select Account': 'Select Account',
    'My Account': 'My Account',
    'Structure created': 'Table structure created!',
    'Init Error': 'Error. Check service account access.',
    'Connection Error': 'Connection error.',
    'Initialize': 'Initialize',
    'Add User Hint': 'To add a user, enter them in the === USERS === section on the Configs sheet of your master spreadsheet.',

    // Overview Story
    'Your May in Numbers': 'Your May in Numbers',
    'Total Assets Summary': 'Total assets summary',
    'Total Balance': 'Total Balance',
    'Wallet Distribution': 'Wallet Distribution',
    'Top Categories': 'Top Categories',
    'Main Expenses': 'Main Expenses',
    'Received': 'Received',
    'Spent': 'Spent',
    'Swipe for top categories': 'Swipe for top categories',
    'Swipe for wallet split': 'Swipe for wallet split',
    'of total spent': 'of total spent',
    'No expenses yet this month.': 'No expenses yet this month.',
    'Capital structure': 'Capital structure',
    'of total assets': 'of total assets',

    // Zen Story
    'Zen Mode': 'Zen Mode',
    'Financial Balance': 'Financial Balance',
    'No-Spend Days': 'No-Spend Days',
    'Great result!': 'Great result!',
    'Keep it up!': 'Keep it up!',
    'Daily Average': 'Daily Average',
    'Projected': 'Projected',
    'Financial Karma': 'Financial Karma',
    'No-Spend Day! 🔥': 'No-Spend Day! 🔥',
    'Today expenses are under control': 'Today expenses are under control',
    'Your wallet is resting today': 'Your wallet is resting today',
    'Spent today': 'Spent today',
    'Day Detail': 'Day Detail',
    'and': 'and',
    'more today': 'more today',
    'Today is a No-Spend Day. Good job!': 'Today is a No-Spend Day. Good job!',
    'Savings analysis': 'Savings analysis',
    'Spent from income': 'Spent from income',
    'No income recorded yet this month.': 'No income recorded yet this month.',
    'Finish your day right': 'Finish your day right',
    'Open Expense Calendar': 'Open Expense Calendar',

    // Tips Story
    'Useful Tips': 'Useful Tips',
    'App Secrets': 'App Secrets',
    'Long Press': 'Long Press',
    'Quick actions on accounts': 'Quick actions on accounts',
    'Drag & Drop': 'Drag & Drop',
    'Reorder your categories': 'Reorder your categories',
    'Safe Mode': 'Safe Mode',
    'Hide balances in public': 'Hide balances in public',
    'Dark Theme': 'Dark Theme',
    'Easy on the eyes': 'Easy on the eyes'
  }
};

const LanguageContext = React.createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = React.useState<Language>(
    (localStorage.getItem('cl_lang') as Language) || 'ru'
  );

  React.useEffect(() => {
    localStorage.setItem('cl_lang', language);
  }, [language]);

  const t = (key: string) => translations[language][key] || key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = React.useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};

import * as React from 'react';

type Language = 'en' | 'ru';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ru: {
    'Fast Control': 'Быстрый пульт',
    'Interactive Control': 'Интерактивное управление',
    'Transactions History': 'История операций',
    'Financial Feed': 'Финансовая лента',
    'Expense Calendar': 'Календарь трат',
    'Spending Grid': 'Сетка расходов',
    'Spending Analytics': 'Аналитика трат',
    'Expense Chart': 'Диаграмма расходов',
    'Settings': 'Настройки',
    'App Configuration': 'Конфигурация приложения',
    'Language': 'Язык',
    'Theme': 'Тема',
    'Currency of Categories': 'Валюта категорий',
    'Base Currency': 'Базовая валюта',
    'Local Currency': 'Локальная валюта',
    'Done': 'Готово'
  },
  en: {
    'Fast Control': 'Fast Control',
    'Interactive Control': 'Interactive Control',
    'Transactions History': 'Transactions History',
    'Financial Feed': 'Financial Feed',
    'Expense Calendar': 'Expense Calendar',
    'Spending Grid': 'Spending Grid',
    'Spending Analytics': 'Analytics',
    'Expense Chart': 'Expense Chart',
    'Settings': 'Settings',
    'App Configuration': 'App Configuration',
    'Language': 'Language',
    'Theme': 'Theme',
    'Currency of Categories': 'Currency of Categories',
    'Base Currency': 'Base Currency',
    'Local Currency': 'Local Currency',
    'Done': 'Done'
  }
};

const LanguageContext = React.createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = React.useState<Language>(
    (localStorage.getItem('cl_language') as Language) || 'ru'
  );

  React.useEffect(() => {
    localStorage.setItem('cl_language', language);
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

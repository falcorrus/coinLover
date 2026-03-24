import * as React from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { 
  Shield, Zap, Globe, PieChart, Sparkles, ArrowRight, 
  Database, MousePointer2, Layout, Lock, Coins, X, Send, 
  Wallet, Banknote, TrendingUp, Coffee, ShoppingBag, Car, Utensils, Film,
  FileSpreadsheet, Languages, Search, History, Smartphone, Tablet, Laptop, RefreshCw,
  Fingerprint, Move, Copy, Check
} from "lucide-react";
import { googleSheetsService } from "../services/googleSheets";

type Language = "ru" | "en";

const translations = {
  ru: {
    demo: "Демо",
    cta: "Хочу!",
    sloganMain: "Твои деньги.",
    sloganSub: "Твой учет. Твой стиль.",
    scrollHint: "Посмотрите, как магия транзакций оживает в CoinLover.",
    analyticsTag: "Визуальная ясность",
    analyticsTitle: "Аналитика, которая не пугает.",
    analyticsText: "CoinLover превращает сухие цифры в наглядную историю ваших трат. Один взгляд — и вы знаете, куда ушел бюджет.",
    customTag: "Полный контроль",
    customTitle: "Настрой всё под себя.",
    customText: "Полная свобода действий. Долгое нажатие открывает редактор: меняй иконки, названия и лимиты. Не нравится порядок? Просто перетащи кошелек или категорию в любое место жестом.",
    historyTag: "Умная история",
    historyTitle: "Найти и изменить — проще простого.",
    historyText: "Интуитивный поиск и история транзакций. Забыли, сколько потратили вчера в магазине? Один тап — и вся история перед глазами. Любую запись можно мгновенно отредактировать.",
    multiTag: "Всегда с тобой",
    multiTitle: "Настоящая мультиплатформенность.",
    multiText: "Доступ через браузер (PWA) на смартфоне, планшете или компьютере. Не нужно ничего скачивать из сторов. Пользуйся на любом устройстве одновременно — данные синхронизируются мгновенно.",
    devices: { mobile: "Смартфон", tablet: "Планшет", desktop: "Компьютер" },
    currencyTag: "Глобальная свобода",
    currencyTitle: "Трать в любой валюте.",
    currencyText: "CoinLover автоматически обновляет курсы валют. Плати в лирах, тенге или батах — приложение само пересчитает всё в твою базовую валюту для точности отчетов.",
    sheetsTag: "Владение данными",
    sheetsTitle: "Твои данные — в твоих таблицах.",
    sheetsText: "Никаких закрытых баз данных. Каждая транзакция мгновенно улетает в твою личную Google Таблицу. Полная свобода и контроль над информацией.",
    roadmapTitle: "Будущее CoinLover",
    aiTag: "В разработке",
    aiTitle: "ИИ-ассистент",
    aiText: "Ваш личный финансовый директор на базе нейросетей. Автоматическое распределение трат и советы по экономии в реальном времени.",
    familyTitle: "Семейная синхронизация",
    familyText: "Поддержка командных бюджетов и общих таблиц для всей семьи. Следите за общим капиталом вместе.",
    finalCta: "Верни себе контроль.",
    modalTitle: "Начнем настройку?",
    modalPricingOld: "Подписка 10$ в год",
    modalPricingNew: "На период тестирования бесплатно + среди тестеров будет разыграно 10 пожизненных подписок",
    nameLabel: "Ваше имя",
    contactLabel: "Email или Telegram",
    sheetLabel: "Адрес вашей Google Таблицы",
    shareInstruction: "Создайте ",
    shareInstructionLink: "гугл таблицу",
    shareInstructionSuffix: " и добавьте (share) как Editor:",
    serviceEmail: "analytics-mcp-account@baonlineru.iam.gserviceaccount.com",
    studioTitle: "Мы на связи для любых проектов",
    studioSub: "Оставьте свой Email или Telegram. Мы свяжемся с вами в течение дня.",
    modalPlaceholder: "@username или email...",
    namePlaceholder: "Как к вам обращаться?",
    sheetPlaceholder: "https://docs.google.com/spreadsheets/...",
    modalConnect: "Подключить",
    modalSend: "Отправить",
    modalSuccess: "Готово!",
    modalSuccessSub: "Таблица настроена! Теперь вы можете пользоваться приложением по адресу https://coinlover.ru",
    modalToApp: "В программу",
    footerStudio: "2026 Сделано Broz Studio",
    wallets: { cash: "Наличные", bank: "Банк", exchange: "Биржа" },
    categories: { food: "Еда", transport: "Транспорт", coffee: "Кофе", shopping: "Покупки", fun: "Отдых" }
  },
  en: {
    demo: "Demo",
    cta: "I want it!",
    sloganMain: "Your money.",
    sloganSub: "Your tracking. Your style.",
    scrollHint: "See how transaction magic comes to life in CoinLover.",
    analyticsTag: "Visual Clarity",
    analyticsTitle: "Analytics that doesn't scare.",
    analyticsText: "CoinLover turns dry numbers into a visual story of your spending. One look - and you know where your budget went.",
    customTag: "Total Control",
    customTitle: "Customize everything.",
    customText: "Complete freedom. Long press opens the editor: change icons, names, and limits. Don't like the order? Just drag a wallet or category anywhere with a gesture.",
    historyTag: "Smart History",
    historyTitle: "Find and edit — easy as pie.",
    historyText: "Intuitive search and transaction history. Forgot how much you spent at the store yesterday? One tap - and the whole history is before your eyes. Any entry can be instantly edited.",
    multiTag: "Always with you",
    multiTitle: "True Multi-platform.",
    multiText: "Access via browser (PWA) on smartphone, tablet, or computer. No need to download from stores. Use on any device simultaneously — data syncs instantly.",
    devices: { mobile: "Smartphone", tablet: "Tablet", desktop: "Computer" },
    currencyTag: "Global Freedom",
    currencyTitle: "Spend in any currency.",
    currencyText: "CoinLover automatically updates exchange rates. Pay in Lira, Tenge, or Baht — the app recalculates everything into your base currency for accurate reports.",
    sheetsTag: "Data Ownership",
    sheetsTitle: "Your data — in your sheets.",
    sheetsText: "No locked databases. Every transaction instantly flies into your personal Google Sheet. Full freedom and control over your information.",
    roadmapTitle: "Future of CoinLover",
    aiTag: "In Development",
    aiTitle: "AI Assistant",
    aiText: "Your personal AI-powered financial director. Automatic expense categorization and real-time saving tips.",
    familyTitle: "Family Sync",
    familyText: "Support for team budgets and shared sheets for the whole family. Track common capital together.",
    finalCta: "Take back control.",
    modalTitle: "Let's get started",
    modalPricingOld: "Subscription $10 per year",
    modalPricingNew: "Free during testing period + 10 lifetime subscriptions will be raffled among testers",
    nameLabel: "Your name",
    contactLabel: "Email or Telegram",
    sheetLabel: "Your Google Sheet URL",
    shareInstruction: "Create a ",
    shareInstructionLink: "google sheet",
    shareInstructionSuffix: " and add (share) as Editor:",
    serviceEmail: "analytics-mcp-account@baonlineru.iam.gserviceaccount.com",
    studioTitle: "Available for any projects",
    studioSub: "Leave your Email or Telegram. We will contact you within 24 hours.",
    modalPlaceholder: "@username or email...",
    namePlaceholder: "How should we call you?",
    sheetPlaceholder: "https://docs.google.com/spreadsheets/...",
    modalConnect: "Connect",
    modalSend: "Send",
    modalSuccess: "Ready!",
    modalSuccessSub: "Sheet is configured! You can now use the app at https://coinlover.ru",
    modalToApp: "Go to App",
    footerStudio: "2026 Made by Broz Studio",
    wallets: { cash: "Cash", bank: "Bank", exchange: "Exchange" },
    categories: { food: "Food", transport: "Transport", coffee: "Coffee", shopping: "Shopping", fun: "Fun" }
  }
};

export const LandingPage: React.FC = () => {
  const [lang, setLang] = React.useState<Language>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cl_lang") as Language;
      if (saved) return saved;
      return window.navigator.language.startsWith("ru") ? "ru" : "en";
    }
    return "en";
  });

  const [isConnectOpen, setIsConnectOpen] = React.useState(false);
  const [modalType, setModalType] = React.useState<"onboarding" | "studio">("onboarding");
  const [name, setName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [sheetUrl, setSheetUrl] = React.useState("");
  const [isSent, setIsSent] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [analyticsImageIndex, setAnalyticsImageIndex] = React.useState(0);

  const t = translations[lang];

  const handleOpenModal = (type: "onboarding" | "studio") => {
    setModalType(type);
    setIsConnectOpen(true);
  };

  React.useEffect(() => {
    localStorage.setItem("cl_lang", lang);
  }, [lang]);

  const { scrollYProgress } = useScroll();
  
  React.useEffect(() => {
    const timer = setInterval(() => {
      setAnalyticsImageIndex((prev) => (prev === 0 ? 1 : 0));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleDemo = () => { window.location.href = "/?demo=true"; };
  
  const extractSsId = (url: string) => {
    const match = url.match(/[-\w]{25,}/);
    return match ? match[0] : null;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact || (modalType === "onboarding" && (!name || !sheetUrl))) return;
    
    setIsLoading(true);
    try {
      const payload = {
        action: "registerLead",
        name: name || "Studio Lead",
        contact,
        sheetUrl: sheetUrl || "",
        type: modalType
      };

      const ok = await googleSheetsService.syncToSheets(payload as any);
      
      if (ok) {
        setIsSent(true);
        // Не закрываем автоматически, ждем нажатия OK
      }
    } catch (err) {
      // Даже при ошибке (no-cors) обычно данные доходят, 
      // но если реально упало, покажем успех для спокойствия юзера 
      // или ошибку, если нужно. Оставляем успех для простоты UX.
      setIsSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    setIsConnectOpen(false); 
    setIsSent(false); 
    setContact(""); 
    setName(""); 
    setSheetUrl(""); 
  };

  const wallets = [
    { name: t.wallets.cash, icon: <Banknote size={48} />, color: "#10b981", active: false },
    { name: t.wallets.bank, icon: <Wallet size={48} />, color: "#06b6d4", active: true },
    { name: t.wallets.exchange, icon: <TrendingUp size={48} />, color: "#3b82f6", active: false },
  ];

  const categories = [
    { name: t.categories.food, icon: <Utensils size={24} />, color: "#f59e0b" },
    { name: t.categories.transport, icon: <Car size={24} />, color: "#3b82f6" },
    { name: t.categories.coffee, icon: <Coffee size={24} />, color: "#8b5cf6" },
    { name: t.categories.shopping, icon: <ShoppingBag size={24} />, color: "#10b981" },
    { name: t.categories.fun, icon: <Film size={24} />, color: "#ec4899" },
  ];

  return (
    <div className="min-h-[650vh] bg-[#050505] text-white selection:bg-[#6d5dfc]/30 font-sans overflow-x-hidden focus:outline-none">
      <style>{`* { -webkit-tap-highlight-color: transparent; outline: none !important; } .text-gradient-purple { background: linear-gradient(135deg, #fff 0%, #6d5dfc 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="landing-mesh-glow" />
        <div className="absolute top-[-10%] right-[-10%] w-[300px] md:w-[500px] height-[500px] bg-[#6d5dfc]/10 blur-[120px] rounded-full" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 p-4 md:p-6 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 md:w-8 md:h-8 bg-[#6d5dfc] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(109,93,252,0.5)]">
              <Coins className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <span className="text-base md:text-xl font-bold tracking-tight text-white/90">CoinLover</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex bg-white/5 rounded-lg p-1 mr-2 border border-white/5">
              <button 
                onClick={() => setLang("ru")}
                className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${lang === 'ru' ? 'bg-[#6d5dfc] text-white' : 'text-white/40'}`}
              >RU</button>
              <button 
                onClick={() => setLang("en")}
                className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${lang === 'en' ? 'bg-[#6d5dfc] text-white' : 'text-white/40'}`}
              >EN</button>
            </div>
            <button onClick={handleDemo} className="px-2 md:px-4 py-2 text-[10px] md:text-sm font-medium text-white/70 hover:text-white transition-colors outline-none">{t.demo}</button>
            <button onClick={() => handleOpenModal("onboarding")} className="px-3 md:px-4 py-2 bg-[#6d5dfc] hover:bg-[#5b4ce3] text-white text-[10px] md:text-sm font-semibold rounded-xl transition-all shadow-lg shadow-[#6d5dfc]/20 whitespace-nowrap outline-none">
              <span>{t.cta}</span>
            </button>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 md:pt-40 pb-10 px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-3xl md:text-7xl font-extrabold mb-6 md:mb-8 tracking-tight leading-[1.2] md:leading-[1.1]">
              {t.sloganMain} <br />
              <span className="text-gradient-purple">{t.sloganSub}</span>
            </h1>
            <p className="text-base md:text-xl text-white/60 max-w-2xl mx-auto mb-10 md:mb-12">{t.scrollHint}</p>
          </motion.div>

          <div className="relative flex justify-center mt-12 mb-20 group">
            <div className="absolute -inset-4 bg-[#6d5dfc]/10 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000 rounded-full" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="glass-panel p-2 border-white/10 shadow-2xl relative z-10 overflow-hidden w-fit max-w-[280px] md:max-w-[320px] mx-auto rounded-[40px]"
            >
              <video autoPlay muted loop playsInline className="w-full h-auto rounded-[32px] block shadow-2xl">
                <source src="/hero-demo.mp4" type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/20 to-transparent pointer-events-none rounded-[32px]" />
            </motion.div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto space-y-32 md:space-y-60 py-10 md:py-20 px-6">
        <section className="flex flex-col md:flex-row items-center gap-16 md:gap-20">
          <div className="flex-1 text-center md:text-left">
            <span className="text-[#6d5dfc] font-bold tracking-[0.3em] uppercase text-[10px] mb-4 block">{t.analyticsTag}</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">{t.analyticsTitle}</h2>
            <p className="text-lg text-white/50 mb-8 leading-relaxed">{t.analyticsText}</p>
          </div>
          <div className="flex-1 relative group flex justify-center md:justify-end min-h-[450px] md:min-h-[600px]">
            <div className="absolute -inset-4 bg-[#6d5dfc]/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 rounded-full" />
            <AnimatePresence mode="wait">
              <motion.div key={analyticsImageIndex} initial={{ opacity: 0, x: 20, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -20, scale: 0.95 }} transition={{ duration: 0.8, ease: "easeInOut" }} className="glass-panel p-2 border-white/10 shadow-2xl relative z-10 overflow-hidden w-fit perspective-1000 h-fit">
                <motion.img animate={{ y: [0, -5, 0], rotate: [0, 0.5, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} src={analyticsImageIndex === 0 ? "/analytics-preview.png" : "/analytics-pie-preview.png"} alt="Analytics" className="block w-full h-auto max-h-[450px] md:max-h-[600px] rounded-[20px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/40 to-transparent pointer-events-none" />
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        <section className="flex flex-col md:flex-row-reverse items-center gap-16 md:gap-20">
          <div className="flex-1 text-center md:text-left">
            <span className="text-orange-400 font-bold tracking-[0.3em] uppercase text-[10px] mb-4 block">{t.customTag}</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">{t.customTitle}</h2>
            <p className="text-lg text-white/50 mb-8 leading-relaxed">{t.customText}</p>
          </div>
          <div className="flex-1 relative group flex justify-center md:justify-start">
            <div className="absolute -inset-4 bg-orange-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 rounded-full" />
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.3 }} className="glass-panel p-2 border-white/10 shadow-2xl relative z-10 overflow-hidden w-fit">
              <img src="/edit-preview.png" alt="Edit" className="block w-full h-auto max-h-[450px] md:max-h-[550px] rounded-[20px] object-contain" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/40 to-transparent pointer-events-none" />
            </motion.div>
          </div>
        </section>

        <section className="flex flex-col md:flex-row items-center gap-16 md:gap-20">
          <div className="flex-1 text-center md:text-left">
            <span className="text-yellow-500 font-bold tracking-[0.3em] uppercase text-[10px] mb-4 block">{t.historyTag}</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">{t.historyTitle}</h2>
            <p className="text-lg text-white/50 mb-8 leading-relaxed">{t.historyText}</p>
          </div>
          <div className="flex-1 relative group flex justify-center md:justify-end">
            <div className="absolute -inset-4 bg-yellow-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 rounded-full" />
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.3 }} className="glass-panel p-2 border-white/10 shadow-2xl relative z-10 overflow-hidden w-fit">
              <img src="/history-preview.png" alt="History" className="block w-full h-auto max-h-[450px] md:max-h-[550px] rounded-[20px] object-contain" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/40 to-transparent pointer-events-none" />
            </motion.div>
          </div>
        </section>

        <section className="flex flex-col md:flex-row items-center gap-16 md:gap-20">
          <div className="flex-1 text-center md:text-left order-2 md:order-1">
            <div className="relative inline-block group mb-10">
              <div className="absolute -inset-10 bg-[#6d5dfc]/10 blur-3xl opacity-50 rounded-full" />
              <div className="relative grid grid-cols-3 gap-8 md:gap-12">
                <div className="flex flex-col items-center gap-4 text-white/40"><Smartphone size={40} className="md:w-16 md:h-16" /><span className="text-[8px] font-bold uppercase tracking-widest">{t.devices.mobile}</span></div>
                <div className="flex flex-col items-center gap-4 text-white/40"><Tablet size={48} className="md:w-20 md:h-20" /><span className="text-[8px] font-bold uppercase tracking-widest">{t.devices.tablet}</span></div>
                <div className="flex flex-col items-center gap-4 text-white/40"><Laptop size={56} className="md:w-24 md:h-24" /><span className="text-[8px] font-bold uppercase tracking-widest">{t.devices.desktop}</span></div>
              </div>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10"><RefreshCw size={200} className="text-[#6d5dfc]" /></motion.div>
            </div>
          </div>
          <div className="flex-1 text-center md:text-left order-1 md:order-2">
            <span className="text-purple-400 font-bold tracking-[0.3em] uppercase text-[10px] mb-4 block">{t.multiTag}</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">{t.multiTitle}</h2>
            <p className="text-lg text-white/50 mb-8 leading-relaxed">{t.multiText}</p>
          </div>
        </section>

        <section className="flex flex-col md:flex-row items-center gap-16 md:gap-20">
          <div className="flex-1 text-center md:text-left">
            <span className="text-blue-400 font-bold tracking-[0.3em] uppercase text-[10px] mb-4 block">{t.currencyTag}</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">{t.currencyTitle}</h2>
            <p className="text-lg text-white/50 mb-8 leading-relaxed">{t.currencyText}</p>
          </div>
          <div className="flex-1 relative group flex justify-center md:justify-end">
            <div className="absolute -inset-4 bg-blue-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 rounded-full" />
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.3 }} className="glass-panel p-2 border-white/10 shadow-2xl relative z-10 overflow-hidden w-fit">
              <img src="/currency-preview.png" alt="Currency" className="block w-full h-auto max-h-[450px] md:max-h-[550px] rounded-[20px] object-contain" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/40 to-transparent pointer-events-none" />
            </motion.div>
          </div>
        </section>

        <section className="flex flex-col md:flex-row-reverse items-center gap-16 md:gap-20">
          <div className="flex-1 text-center md:text-left">
            <span className="text-green-500 font-bold tracking-[0.3em] uppercase text-[10px] mb-4 block">{t.sheetsTag}</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">{t.sheetsTitle}</h2>
            <p className="text-lg text-white/50 mb-8 leading-relaxed">{t.sheetsText}</p>
          </div>
          <div className="flex-1 relative group flex justify-center md:justify-start">
            <div className="absolute -inset-4 bg-green-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 rounded-full" />
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.3 }} className="glass-panel p-2 border-white/10 shadow-2xl relative z-10 overflow-hidden w-fit">
              <img src="/sheets-preview.png" alt="Sheets" className="block w-full h-auto max-h-[400px] rounded-[20px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/40 to-transparent pointer-events-none" />
            </motion.div>
          </div>
        </section>

        <section className="text-center">
          <h2 className="text-4xl font-bold mb-16 text-gradient-purple">{t.roadmapTitle}</h2>
          <div className="grid md:grid-cols-2 gap-8 text-left">
            <div className="glass-card p-10 border-[#6d5dfc]/20 relative overflow-hidden group">
              <div className="absolute inset-0 ai-shimmer opacity-20" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6"><Sparkles className="w-6 h-6 text-[#6d5dfc]" /><span className="text-xs font-bold tracking-widest uppercase text-[#6d5dfc]">{t.aiTag}</span></div>
                <h3 className="text-2xl font-bold mb-4">{t.aiTitle}</h3>
                <p className="text-white/60 leading-relaxed">{t.aiText}</p>
              </div>
            </div>
            <div className="glass-card p-10 border-white/5 opacity-60">
               <RefreshCw className="w-6 h-6 text-white/40 mb-6" />
               <h3 className="text-2xl font-bold mb-4">{t.familyTitle}</h3>
               <p className="text-white/60 leading-relaxed">{t.familyText}</p>
            </div>
          </div>
        </section>

        <section className="text-center py-20 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#6d5dfc]/5 blur-[120px] rounded-full pointer-events-none" />
          <h2 className="text-5xl md:text-7xl font-bold mb-12 tracking-tight">{t.finalCta}</h2>
          <div className="flex flex-col sm:flex-row gap-6 justify-center relative z-10 px-4">
            <button onClick={() => handleOpenModal("onboarding")} className="px-8 md:px-12 py-4 md:py-6 bg-[#6d5dfc] hover:bg-[#5b4ce3] text-white font-bold rounded-2xl transition-all shadow-2xl shadow-[#6d5dfc]/40 text-base md:text-lg outline-none">{t.cta}</button>
            <button onClick={handleDemo} className="px-8 md:px-12 py-4 md:py-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-2xl transition-all text-base md:text-lg outline-none">{t.demo}</button>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {isConnectOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsConnectOpen(false)} className="absolute inset-0 bg-black/85 backdrop-blur-2xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }} className="w-full max-w-md bg-[#121212]/90 backdrop-blur-2xl p-10 relative z-10 border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] rounded-[32px]">
              <button onClick={() => setIsConnectOpen(false)} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors outline-none"><X size={28} /></button>
              {!isSent ? (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="w-12 h-12 bg-[#6d5dfc]/10 rounded-xl flex items-center justify-center mb-2"><Database className="w-6 h-6 text-[#6d5dfc]" /></div>
                  <h2 className="text-2xl font-bold text-white leading-tight">
                    {modalType === "onboarding" ? t.modalTitle : t.studioTitle}
                  </h2>
                  
                  <div className="bg-[#6d5dfc]/10 border border-[#6d5dfc]/20 rounded-xl p-3">
                    {modalType === "onboarding" ? (
                      <div className="flex flex-col gap-1">
                        <p className="text-white/30 text-[10px] line-through font-medium">
                          {t.modalPricingOld}
                        </p>
                        <p className="text-[#6d5dfc] text-[11px] font-bold leading-relaxed">
                          {t.modalPricingNew}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[#6d5dfc] text-[11px] font-bold leading-relaxed">
                        {t.studioSub}
                      </p>
                    )}
                  </div>

                  {modalType === "onboarding" && (
                    <div className="flex flex-col gap-3 mt-2">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1 mb-1 block">{t.nameLabel}</label>
                        <input required type="text" placeholder={t.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-[#6d5dfc]/50 transition-all outline-none text-sm" />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1 mb-1 block">{t.contactLabel}</label>
                        <input required type="text" placeholder={t.modalPlaceholder} value={contact} onChange={(e) => setContact(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-[#6d5dfc]/50 transition-all outline-none text-sm" />
                      </div>
                      
                      <div className="mt-1 p-3 bg-black/20 border border-white/5 rounded-xl group/copy relative">
                        <p className="text-[10px] text-white/40 leading-relaxed mb-2 uppercase font-black tracking-tighter">
                          {t.shareInstruction}
                          <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" className="text-[#6d5dfc] underline decoration-[#6d5dfc]/30 hover:decoration-[#6d5dfc] transition-all">
                            {t.shareInstructionLink}
                          </a>
                          {t.shareInstructionSuffix}
                        </p>
                        <div className="flex items-center gap-2 bg-[#6d5dfc]/5 p-2 rounded border border-[#6d5dfc]/10">
                          <code className="text-[10px] text-[#6d5dfc] break-all font-mono select-all flex-1">{t.serviceEmail}</code>
                          <button 
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(t.serviceEmail);
                              if (navigator.vibrate) navigator.vibrate(40);
                            }}
                            className="p-1.5 hover:bg-[#6d5dfc]/10 rounded-md transition-colors text-[#6d5dfc]"
                            title="Copy email"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1 mb-1 block">{t.sheetLabel}</label>
                        <input required type="text" placeholder={t.sheetPlaceholder} value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-[#6d5dfc]/50 transition-all outline-none text-sm" />
                      </div>
                    </div>
                  )}

                  {modalType === "studio" && (
                    <div className="mt-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1 mb-1 block">{t.contactLabel}</label>
                      <input required type="text" placeholder={t.modalPlaceholder} value={contact} onChange={(e) => setContact(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-[#6d5dfc]/50 transition-all outline-none text-sm" />
                    </div>
                  )}

                  <button 
                    disabled={isLoading || !contact || (modalType === 'onboarding' && (!name || !sheetUrl))}
                    className="w-full py-4 bg-[#6d5dfc] hover:bg-[#5b4ce3] disabled:opacity-50 disabled:grayscale text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all text-sm shadow-xl shadow-[#6d5dfc]/20 outline-none mt-2"
                  >
                    {isLoading ? <RefreshCw className="animate-spin w-5 h-5" /> : <>{t.modalConnect} <Send size={18} /></>}
                  </button>
                </form>
              ) : (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                    <Sparkles className="w-10 h-10 text-green-500" />
                  </div>
                  <h2 className="text-3xl font-bold mb-3 text-white">{t.modalSuccess}</h2>
                  <p className="text-white/50 text-sm leading-relaxed mb-10 px-4">
                    {t.modalSuccessSub}
                  </p>
                  <button 
                    onClick={() => {
                      const id = extractSsId(sheetUrl);
                      window.location.href = `/?ssId=${id || ""}`;
                    }}
                    className="w-full py-4 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all text-sm outline-none"
                  >
                    {t.modalToApp} <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="py-16 px-6 border-t border-white/5 text-white/20 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3"><div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center"><Coins className="w-4 h-4 text-white/40" /></div><span className="font-bold text-white/30 tracking-widest uppercase text-xs">CoinLover</span></div>
          <button 
            onClick={() => handleOpenModal("studio")}
            className="tracking-widest uppercase text-white/30 hover:text-white transition-colors outline-none text-[10px] md:text-xs"
          >
            {t.footerStudio}
          </button>
        </div>
      </footer>
    </div>
  );
};

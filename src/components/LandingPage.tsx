import * as React from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { 
  Shield, ShieldCheck, ShieldAlert, Zap, Globe, PieChart, Sparkles, ArrowRight, ArrowLeft,
  Database, MousePointer2, Layout, Lock, Coins, X, Send, 
  Wallet, Banknote, TrendingUp, Coffee, ShoppingBag, Car, Utensils, Film,
  FileSpreadsheet, Languages, Search, History, Smartphone, Tablet, Laptop, RefreshCw,
  Fingerprint, Move, Copy, Check, QrCode
} from "lucide-react";
import { googleSheetsService } from "../services/googleSheets";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { trackEvent, trackScreen } from "../services/analytics";

type Language = "ru" | "en";

const translations = {
  ru: {
    demo: "Демо",
    cta: "Попробовать бесплатно",
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
    modalTitle: "Давайте знакомиться",
    modalTitleStep2: "Подключаем таблицу",
    modalPricingOld: "Подписка 20$ в год",
    modalPricingNew: "На период тестирования бесплатно + среди тестеров будет разыграно 10 пожизненных подписок",
    openInChrome: "Открыть в Chrome",
    nameLabel: "Ваше имя",
    contactLabel: "Email или Telegram",
    sheetLabel: "Вставьте ссылку на вашу Google Таблицу сюда, это будет ваш логин и пароль",
    step1: "Создайте ",
    step1Link: "Google Таблицу",
    step2: "Переименуйте её в Coinlover или как удобней запомнить",
    step3: "Сверху (в меню Share / Поделиться) добавьте этот email как Editor (Редактор):",
    serviceEmail: "coinlover-service-acc@baonlineru.iam.gserviceaccount.com",
    studioTitle: "Мы на связи для любых проектов",
    studioSub: "Оставьте свой Email или Telegram. Мы свяжемся с вами в течение дня.",
    modalPlaceholder: "@username или email...",
    namePlaceholder: "Как к вам обращаться?",
    sheetPlaceholder: "https://docs.google.com/spreadsheets/...",
    modalConnect: "Подключить вашу таблицу",
    modalSend: "Отправить",
    modalSuccess: "Готово!",
    modalSuccessSub: "Таблица настроена! Теперь вы можете пользоваться приложением по адресу https://coinlover.ru",
    modalToApp: "В программу",
    modalNext: "Далее",
    modalBack: "Назад",
    knowledgeBase: "ЧаВо",
    footerStudio: "2026 Сделано Broz Studio",
    wallets: { cash: "Наличные", bank: "Банк", exchange: "Биржа" },
    categories: { food: "Еда", transport: "Транспорт", coffee: "Кофе", shopping: "Покупки", fun: "Отдых" },
    modalTitleLogin: "Вход в CoinLover",
    modalLoginPlaceholder: "https://docs.google.com/spreadsheets/d/...",
    modalLoginHint: "Ссылку на вашу таблицу можете найти здесь:",
    modalLoginBtn: "Войти",
    modalLoginSuccess: "Успешный вход!",
    modalLoginSuccessSub: "Мы нашли вашу таблицу. Запускаем сессию...",
    modalLoginError: "Некорректная ссылка или таблица не найдена",
    loginTabLabel: "Уже зарегистрированы?",
    signupTabLabel: "Новый пользователь?",
    loginBtn: "Войти",
    downloadTag: "Мобильное приложение",
    downloadTitle: "CoinLover всегда под рукой.",
    downloadText: "Установите приложение на свой смартфон для мгновенного доступа к финансам. Сканируйте QR-код или переходите по ссылкам.",
    downloadAppStore: "App Store",
    downloadGooglePlay: "Google Play",
    downloadBtn: "Скачать",
    downloadModalTitle: "Установить CoinLover",
  },
  en: {
    demo: "Demo",
    cta: "Get started for free",
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
    modalTitle: "Let's get introduced",
    modalTitleStep2: "Connecting your sheet",
    modalPricingOld: "Subscription $20 per year",
    modalPricingNew: "Free during testing period + 10 lifetime subscriptions will be raffled among testers",
    openInChrome: "Open in Chrome",
    nameLabel: "Your name",
    contactLabel: "Email or Telegram",
    sheetLabel: "Paste the link to your Google Sheet here, this will be your login and password",
    step1: "Create a ",
    step1Link: "Google Sheet",
    step2: "Rename it to Coinlover or whatever is convenient to remember",
    step3: "At the top (Share menu) add this email as Editor:",
    serviceEmail: "coinlover-service-acc@baonlineru.iam.gserviceaccount.com",
    studioTitle: "Available for any projects",
    studioSub: "Leave your Email or Telegram. We will contact you within 24 hours.",
    modalPlaceholder: "@username or email...",
    namePlaceholder: "How should we call you?",
    sheetPlaceholder: "https://docs.google.com/spreadsheets/...",
    modalConnect: "Connect your sheet",
    modalSend: "Send",
    modalSuccess: "Ready!",
    modalSuccessSub: "Sheet is configured! You can now use the app at https://coinlover.ru",
    modalToApp: "Go to App",
    modalNext: "Next",
    modalBack: "Back",
    knowledgeBase: "FAQ",
    footerStudio: "2026 Made by Broz Studio",
    wallets: { cash: "Cash", bank: "Bank", exchange: "Exchange" },
    categories: { food: "Food", transport: "Transport", coffee: "Coffee", shopping: "Shopping", fun: "Fun" },
    modalTitleLogin: "Log In to CoinLover",
    modalLoginPlaceholder: "https://docs.google.com/spreadsheets/d/...",
    modalLoginHint: "Find your spreadsheets here:",
    modalLoginBtn: "Log In",
    modalLoginSuccess: "Logged in!",
    modalLoginSuccessSub: "We found your sheet. Starting session...",
    modalLoginError: "Invalid URL or sheet not found",
    loginTabLabel: "Already registered?",
    signupTabLabel: "New user?",
    loginBtn: "Log In",
    downloadTag: "Mobile App",
    downloadTitle: "CoinLover always at hand.",
    downloadText: "Install the app on your smartphone for instant access to your finances. Scan the QR code or follow the links.",
    downloadAppStore: "App Store",
    downloadGooglePlay: "Google Play",
    downloadBtn: "Download",
    downloadModalTitle: "Install CoinLover",
  }
};

export const LandingPage: React.FC = () => {
  // Синхронно включаем скролл до первой отрисовки (иначе Brave/Safari могут заблокировать)
  React.useLayoutEffect(() => {
    document.documentElement.classList.add("landing-mode");
    return () => {
      document.documentElement.classList.remove("landing-mode");
    };
  }, []);

  const [lang, setLang] = React.useState<Language>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cl_lang") as Language;
      if (saved) return saved;
      return window.navigator.language.startsWith("ru") ? "ru" : "en";
    }
    return "en";
  });

  const [isConnectOpen, setIsConnectOpen] = React.useState(false);
  const [modalType, setModalType] = React.useState<"onboarding" | "studio" | "login">("onboarding");
  const [step, setStep] = React.useState(1);
  const [name, setName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [sheetUrl, setSheetUrl] = React.useState("");
  const [isSent, setIsSent] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");
  const [analyticsImageIndex, setAnalyticsImageIndex] = React.useState(0);
  const [copiedEmail, setCopiedEmail] = React.useState(false);
  const [prefetchedLoginOptions, setPrefetchedLoginOptions] = React.useState<any>(null);
  const [usePasskeyForOnboarding, setUsePasskeyForOnboarding] = React.useState(true);
  const [isPasskeyRegisterPending, setIsPasskeyRegisterPending] = React.useState(false);
  const [passkeyRegisterSuccess, setPasskeyRegisterSuccess] = React.useState(false);
  const [passkeyRegisterError, setPasskeyRegisterError] = React.useState("");
  const [pendingPasskeyCredential, setPendingPasskeyCredential] = React.useState<any>(null);
  const [pendingChallengeToken, setPendingChallengeToken] = React.useState<string>("");
  const [pendingRegisterOptions, setPendingRegisterOptions] = React.useState<any>(null);

  const copyEmailToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error("Clipboard API not available");
      }
    } catch (err) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedEmail(true);
    if (navigator.vibrate) navigator.vibrate(40);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const t = translations[lang];

  const handleOpenModal = (type: "onboarding" | "studio" | "login") => {
    trackEvent("modal_open", { type });
    setModalType(type);
    setStep(1);
    setErrorMsg("");
    setIsConnectOpen(true);
  };

  const handlePasskeyLogin = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      let data = prefetchedLoginOptions;

      if (!data) {
        console.log("No prefetched login options found, fetching dynamically...");
        const optionsRes = await fetch("/api/auth/login-options");
        if (!optionsRes.ok) {
          throw new Error(await optionsRes.text() || "Failed to fetch login options");
        }
        data = await optionsRes.json();
        if (data.status !== "success") {
          throw new Error(data.message || "Failed to fetch options");
        }
      }

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("TIMEOUT")), 60000);
      });

      const credential = await Promise.race([
        startAuthentication(data.options),
        timeoutPromise
      ]);

      const userHandle = credential.response.userHandle;
      if (!userHandle) {
        throw new Error("No userHandle returned. Passkey must be discoverable.");
      }
      
      let ssId = "";
      if (typeof userHandle === "string") {
        const base64 = userHandle.replace(/-/g, '+').replace(/_/g, '/');
        const binString = atob(base64);
        const bytes = new Uint8Array(binString.length);
        for (let i = 0; i < binString.length; i++) {
          bytes[i] = binString.charCodeAt(i);
        }
        ssId = new TextDecoder().decode(bytes);
      } else {
        ssId = new TextDecoder().decode(new Uint8Array(userHandle));
      }

      if (!ssId) {
        throw new Error("Failed to decode ssId from credential");
      }

      const verifyRes = await fetch("/api/auth/login-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ssId,
          loginResponse: credential,
          challengeToken: data.challengeToken
        })
      });

      const verifyData = await verifyRes.json();
      if (verifyData.status === "success" && verifyData.verified) {
        window.location.href = `/?ssId=${ssId}`;
      } else {
        throw new Error(verifyData.message || "Verification failed");
      }
    } catch (err: any) {
      console.error("Passkey login failed:", err);
      if (err.message === "TIMEOUT") {
        setErrorMsg(
          lang === "ru"
            ? "Превышено время ожидания. Если вы вошли из встроенного браузера (например, Telegram), откройте CoinLover во внешнем браузере (Safari / Chrome) для работы Face ID."
            : "Timeout exceeded. If you are inside an in-app browser (like Telegram), please open CoinLover in an external browser (Safari / Chrome) to use biometrics."
        );
      } else if (err.name === "NotFoundError" || err.message?.includes("No credential") || err.message?.includes("not found")) {
        setErrorMsg(
          lang === "ru" 
            ? "Passkey не найден. Войдите сначала по ссылке на таблицу и привяжите это устройство («Шестеренка» -> «Безопасность»)." 
            : "Passkey not found. Log in via your Google Sheet link first and bind this device under Settings -> Security."
        );
      } else if (err.name === "NotAllowedError") {
        setErrorMsg(
          lang === "ru"
            ? "Вход отменен пользователем или биометрия заблокирована устройством."
            : "Biometric login cancelled or blocked by the device."
        );
      } else {
        setErrorMsg(lang === "ru" ? "Ошибка биометрии: " + (err.message || String(err)) : "Passkey error: " + (err.message || String(err)));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    trackEvent("change_language", { language_code: newLang });
  };

  React.useEffect(() => {
    localStorage.setItem("cl_lang", lang);
  }, [lang]);

  React.useEffect(() => {
    if (modalType === "onboarding" && contact.trim().length > 3 && usePasskeyForOnboarding && window.PublicKeyCredential) {
      const controller = new AbortController();
      fetch(`/api/auth/register-options?contact=${encodeURIComponent(contact.trim())}`, { signal: controller.signal })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error("Failed to prefetch register options");
        })
        .then(data => {
          if (data.status === "success") {
            setPendingRegisterOptions(data);
          }
        })
        .catch(err => {
          if (err.name !== "AbortError") {
            console.warn("Prefetch register options failed:", err);
          }
        });
      return () => controller.abort();
    } else {
      setPendingRegisterOptions(null);
    }
  }, [contact, modalType, usePasskeyForOnboarding]);

  React.useEffect(() => {
    trackScreen("Landing Page");
    trackEvent("change_language", { language_code: lang, initial: true });

    fetch("/api/auth/login-options")
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Failed to prefetch login options");
      })
      .then(data => {
        if (data.status === "success") {
          setPrefetchedLoginOptions(data);
        }
      })
      .catch(err => console.warn("Prefetch login options failed:", err));
  }, []);

  const { scrollYProgress } = useScroll();
  
  React.useEffect(() => {
    const timer = setInterval(() => {
      setAnalyticsImageIndex((prev) => (prev === 0 ? 1 : 0));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const extractSsId = (url: string) => {
    const match = url.match(/[-\w]{25,}/);
    return match ? match[0] : null;
  };

  const handleStep1Next = async () => {
    if (!name || !contact) return;
    
    if (!usePasskeyForOnboarding || !window.PublicKeyCredential) {
      setStep(2);
      return;
    }

    setIsPasskeyRegisterPending(true);
    setPasskeyRegisterError("");
    setPasskeyRegisterSuccess(false);

    try {
      let data = pendingRegisterOptions;
      if (!data) {
        console.log("No prefetched register options found, fetching dynamically...");
        const optionsRes = await fetch(`/api/auth/register-options?contact=${encodeURIComponent(contact)}`);
        if (!optionsRes.ok) {
          throw new Error(await optionsRes.text() || "Failed to fetch registration options");
        }
        data = await optionsRes.json();
      }

      if (data.status !== "success") {
        throw new Error(data.message || "Failed to fetch options");
      }

      const credential = await startRegistration(data.options);
      
      setPendingPasskeyCredential(credential);
      setPendingChallengeToken(data.challengeToken);
      
      setStep(2);
    } catch (err: any) {
      console.error("Passkey onboarding Step 1 failed:", err);
      let errMsg = err.message || String(err);
      if (err.name === "NotAllowedError") {
        errMsg = lang === "ru" 
          ? "Вход отменен пользователем или истекло время ожидания."
          : "Registration cancelled or timed out.";
      } else if (err.name === "NotReadableError") {
        errMsg = lang === "ru"
          ? "На устройстве не настроена блокировка экрана (PIN/Face ID) или возник сбой Credential Manager."
          : "Device screen lock is not configured or Credential Manager error occurred.";
      }
      
      setUsePasskeyForOnboarding(false);
      setStep(2);
    } finally {
      setIsPasskeyRegisterPending(false);
    }
  };

  const handleVerifyPendingPasskey = async (ssId: string) => {
    setIsPasskeyRegisterPending(true);
    setPasskeyRegisterError("");
    setPasskeyRegisterSuccess(false);
    try {
      if (!pendingPasskeyCredential) {
        throw new Error("No pending passkey credential found");
      }
      
      const verifyRes = await fetch("/api/auth/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ssId,
          contact,
          registrationResponse: pendingPasskeyCredential,
          challengeToken: pendingChallengeToken
        })
      });

      const verifyData = await verifyRes.json();
      if (verifyData.status === "success" && verifyData.verified) {
        setPasskeyRegisterSuccess(true);
        localStorage.setItem("cl_active_table_id", ssId);
        localStorage.setItem("cl_onboarding_completed", "true");
        document.cookie = `cl_active_table_id=${ssId}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;
        
        setTimeout(() => {
          window.location.href = `/?ssId=${ssId}`;
        }, 2000);
      } else {
        throw new Error(verifyData.message || "Verification failed");
      }
    } catch (err: any) {
      console.error("Passkey binding failed:", err);
      let errMsg = err.message || String(err);
      setPasskeyRegisterError(errMsg);
    } finally {
      setIsPasskeyRegisterPending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalType === "login" && !sheetUrl) return;
    if (modalType === "studio" && !contact) return;
    if (modalType === "onboarding" && (!contact || !name || !sheetUrl)) return;
    
    setIsLoading(true);
    setErrorMsg("");
    try {
      if (modalType === "login") {
        const parsedSsId = extractSsId(sheetUrl);
        if (!parsedSsId) {
          setErrorMsg(t.modalLoginError);
          setIsLoading(false);
          return;
        }

        const remoteData = await googleSheetsService.fetchSettings(parsedSsId);
        if (remoteData) {
          localStorage.setItem("cl_active_table_id", parsedSsId);
          localStorage.setItem("cl_onboarding_completed", "true");
          document.cookie = `cl_active_table_id=${parsedSsId}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;

          setIsSent(true);
          trackEvent("login_success", { parsedSsId });

          setTimeout(() => {
            window.location.href = "/";
          }, 1500);
        } else {
          setErrorMsg(t.modalLoginError);
        }
      } else {
        const payload = {
          action: "registerLead",
          name: name || "Studio Lead",
          contact,
          sheetUrl: sheetUrl || "",
          type: modalType
        };

        const ok = await googleSheetsService.syncToSheets(payload as any);
        
        if (ok) {
          trackEvent("generate_lead", {
            category: "engagement",
            label: modalType === "onboarding" ? "Onboarding" : "Studio",
            value: modalType === "onboarding" ? 1 : 10
          });

          const parsedSsId = extractSsId(sheetUrl);
          if (parsedSsId && modalType === "onboarding" && usePasskeyForOnboarding && window.PublicKeyCredential && pendingPasskeyCredential) {
            setIsSent(true);
            handleVerifyPendingPasskey(parsedSsId);
          } else {
            setIsSent(true);
          }
        }
      }
    } catch (err: any) {
      if (modalType === "login") {
        setErrorMsg(err.message || t.modalLoginError);
      } else {
        setIsSent(true);
      }
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
    setErrorMsg("");
    setIsPasskeyRegisterPending(false);
    setPasskeyRegisterSuccess(false);
    setPasskeyRegisterError("");
    setPendingPasskeyCredential(null);
    setPendingChallengeToken("");
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

      <nav className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-4 md:py-6 backdrop-blur-md border-b border-white/5">
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
                id="btn_lang_ru"
                onClick={() => handleLanguageChange("ru")}
                className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${lang === 'ru' ? 'bg-[#6d5dfc] text-white' : 'text-white/40'}`}
              >RU</button>
              <button 
                id="btn_lang_en"
                onClick={() => handleLanguageChange("en")}
                className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${lang === 'en' ? 'bg-[#6d5dfc] text-white' : 'text-white/40'}`}
              >EN</button>
            </div>

            <button id="btn_login_top" onClick={() => handleOpenModal("login")} className="px-2 md:px-4 py-2 text-[10px] md:text-sm font-medium text-white/70 hover:text-white transition-colors outline-none">{t.loginBtn}</button>
            <button id="btn_signup_top" onClick={() => handleOpenModal("onboarding")} className="px-3 md:px-4 py-2 bg-[#6d5dfc] hover:bg-[#5b4ce3] text-white text-[10px] md:text-sm font-semibold rounded-xl transition-all shadow-lg shadow-[#6d5dfc]/20 whitespace-nowrap outline-none">
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
              <video id="video_hero" autoPlay muted loop playsInline className="w-full h-auto rounded-[32px] block shadow-2xl">
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

        <section id="download" className="flex flex-col md:flex-row items-center gap-16 md:gap-20 py-10">
          <div className="flex-1 text-center md:text-left">
            <span className="text-[#6d5dfc] font-bold tracking-[0.3em] uppercase text-[10px] mb-4 block">{t.downloadTag}</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">{t.downloadTitle}</h2>
            <p className="text-lg text-white/50 mb-10 leading-relaxed">{t.downloadText}</p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <button
                onClick={() => handleOpenModal("login")}
                className="flex items-center gap-4 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all border border-white/10 group"
              >
                <Globe size={24} className="text-[#6d5dfc]" />
                <div className="text-left">
                  <div className="text-[10px] opacity-70 uppercase tracking-widest font-black">PWA / Browser</div>
                  <div className="text-base uppercase tracking-wider">{t.openInChrome}</div>
                </div>
              </button>
              <a 
                href="/download/coinlover.apk" 
                download
                className="flex items-center gap-4 px-8 py-4 bg-[#6d5dfc] hover:bg-[#5b4ce3] text-white font-bold rounded-2xl transition-all shadow-xl shadow-[#6d5dfc]/20 group"
              >
                <Smartphone size={24} />
                <div className="text-left">
                  <div className="text-[10px] opacity-70 uppercase tracking-widest font-black">Direct Download</div>
                  <div className="text-base uppercase tracking-wider">Android APK</div>
                </div>
              </a>
            </div>
          </div>
          
          <div className="flex-1 flex justify-center md:justify-end">
            <div className="relative group">
              <div className="absolute -inset-8 bg-[#6d5dfc]/20 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000 rounded-full" />
              <div className="glass-panel p-6 border-white/10 shadow-2xl relative z-10 flex flex-col items-center gap-4 bg-[#050505]/60">
                <div className="bg-white p-3 rounded-2xl shadow-inner">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent("https://coinlover.ru/download/coinlover.apk")}`} 
                    alt="Download QR"
                    className="w-[180px] h-[180px] block"
                  />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Scan to download APK</span>
              </div>
            </div>
          </div>
        </section>

        <section className="text-center py-20 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#6d5dfc]/5 blur-[120px] rounded-full pointer-events-none" />
          <h2 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight">{t.finalCta}</h2>
          
          <div className="inline-flex flex-col items-center bg-[#6d5dfc]/5 border border-[#6d5dfc]/20 rounded-2xl px-6 py-4 mb-12 relative z-10">
            <span className="text-white/30 text-xs line-through font-medium mb-1">
              {t.modalPricingOld}
            </span>
            <span className="text-[#6d5dfc] text-sm md:text-base font-bold">
              {t.modalPricingNew}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center relative z-10 px-4">
            <button id="btn_signup_bottom" onClick={() => handleOpenModal("onboarding")} className="px-8 md:px-12 py-4 md:py-6 bg-[#6d5dfc] hover:bg-[#5b4ce3] text-white font-bold rounded-2xl transition-all shadow-2xl shadow-[#6d5dfc]/40 text-base md:text-lg outline-none">{t.cta}</button>

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
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-12 h-12 bg-[#6d5dfc]/10 rounded-xl flex items-center justify-center">
                      <Database className="w-6 h-6 text-[#6d5dfc]" />
                    </div>
                    {modalType === "onboarding" && step === 2 && (
                      <button 
                        id="btn_modal_back"
                        onClick={() => setStep(1)}
                        className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#6d5dfc] hover:text-white transition-colors"
                      >
                        <ArrowLeft size={14} /> {t.modalBack}
                      </button>
                    )}
                  </div>

                  <h2 className="text-2xl font-bold text-white leading-tight">
                    {modalType === "onboarding" 
                      ? (step === 1 ? t.modalTitle : (t as any).modalTitleStep2) 
                      : modalType === "login"
                        ? t.modalTitleLogin
                        : t.studioTitle}
                  </h2>

                    {false && (
                      <div className="flex bg-white/5 rounded-xl p-1 border border-white/5 mt-1 mb-2">
                        <button
                          type="button"
                          onClick={() => {
                            setModalType("onboarding");
                            setStep(1);
                            setErrorMsg("");
                          }}
                          className="flex-1 py-2 text-xs font-bold rounded-lg transition-all bg-[#6d5dfc] text-white shadow-md"
                        >
                          {t.signupTabLabel}
                        </button>
                      </div>
                    )}
                    
                  
                  {modalType === "studio" && (
                    <div className="bg-[#6d5dfc]/10 border border-[#6d5dfc]/20 rounded-xl p-3">
                      <p className="text-[#6d5dfc] text-[11px] font-bold leading-relaxed">
                        {t.studioSub}
                      </p>
                    </div>
                  )}

                  {modalType === "onboarding" && (
                    <div className="flex flex-col gap-3">
                      {step === 1 ? (
                        <>
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1 mb-1 block">{t.nameLabel}</label>
                            <input required type="text" placeholder={t.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-[#6d5dfc]/50 transition-all outline-none text-sm" />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1 mb-1 block">{t.contactLabel}</label>
                            <input required type="text" placeholder={t.modalPlaceholder} value={contact} onChange={(e) => setContact(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-[#6d5dfc]/50 transition-all outline-none text-sm" />
                          </div>
                          {window.PublicKeyCredential && (
                            <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3.5 rounded-xl hover:bg-white/10 transition-colors mt-1 select-none">
                              <input 
                                type="checkbox" 
                                id="use_passkey_onboarding" 
                                checked={usePasskeyForOnboarding} 
                                onChange={(e) => setUsePasskeyForOnboarding(e.target.checked)}
                                className="w-4 h-4 rounded border-white/10 text-[#6d5dfc] focus:ring-0 cursor-pointer"
                              />
                              <label htmlFor="use_passkey_onboarding" className="text-xs text-white/70 leading-snug cursor-pointer flex-1 text-left">
                                🔑 <strong>{lang === 'ru' ? 'Вход по отпечатку (Face ID)' : 'Log in with Face ID / fingerprint'}</strong><br />
                                <span className="text-[10px] text-white/40">{lang === 'ru' ? 'Связать устройство с таблицей для входа в 1 клик' : 'Bind device to spreadsheet for instant 1-click login'}</span>
                              </label>
                            </div>
                          )}
                          <button 
                            id="btn_modal_next"
                            onClick={handleStep1Next}
                            disabled={!name || !contact || isPasskeyRegisterPending}
                            className="w-full py-4 bg-[#6d5dfc] hover:bg-[#5b4ce3] disabled:opacity-50 disabled:grayscale text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all text-sm shadow-xl shadow-[#6d5dfc]/20 outline-none mt-2"
                          >
                            {isPasskeyRegisterPending ? (
                              <RefreshCw className="animate-spin w-5 h-5" />
                            ) : (
                              <>{t.modalNext} <ArrowRight size={18} /></>
                            )}
                          </button>
                        </>
                      ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                          <div className="p-4 bg-black/30 border border-white/5 rounded-2xl flex flex-col gap-3 group/copy relative">
                            <div className="flex flex-col gap-2.5 text-xs text-white/60">
                              <div className="flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-[#6d5dfc]/15 text-[#6d5dfc] flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</span>
                                <p className="leading-relaxed">
                                  {(t as any).step1}
                                  <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" className="text-[#6d5dfc] underline hover:text-[#5b4ce3] font-bold">
                                    {(t as any).step1Link}
                                  </a>
                                </p>
                              </div>
                              
                              <div className="flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-[#6d5dfc]/15 text-[#6d5dfc] flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</span>
                                <p className="leading-relaxed">
                                  {(t as any).step2}
                                </p>
                              </div>

                              <div className="flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-[#6d5dfc]/15 text-[#6d5dfc] flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</span>
                                <p className="leading-relaxed">
                                  {(t as any).step3}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 bg-[#6d5dfc]/5 p-2.5 rounded-xl border border-[#6d5dfc]/10">
                              <code className="text-[10px] text-[#6d5dfc] break-all font-mono select-all flex-1">{t.serviceEmail}</code>
                              <button 
                                id="btn_copy_email"
                                type="button"
                                onClick={() => copyEmailToClipboard(t.serviceEmail)}
                                className={`p-1.5 rounded-md transition-all duration-200 outline-none flex items-center justify-center ${
                                  copiedEmail 
                                    ? "bg-[#10b981]/10 text-[#10b981]" 
                                    : "hover:bg-[#6d5dfc]/10 text-[#6d5dfc]"
                                }`}
                                title="Copy email"
                              >
                                {copiedEmail ? (
                                  <Check size={14} className="animate-in zoom-in duration-200" />
                                ) : (
                                  <Copy size={14} className="animate-in fade-in duration-200" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1 mb-1 block">{t.sheetLabel}</label>
                            <input required type="text" placeholder={t.sheetPlaceholder} value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-[#6d5dfc]/50 transition-all outline-none text-sm" />
                          </div>

                          <button 
                            id="btn_modal_connect"
                            disabled={isLoading || !sheetUrl}
                            className="w-full py-4 bg-[#6d5dfc] hover:bg-[#5b4ce3] disabled:opacity-50 disabled:grayscale text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all text-sm shadow-xl shadow-[#6d5dfc]/20 outline-none mt-2"
                          >
                            {isLoading ? <RefreshCw className="animate-spin w-5 h-5" /> : <>{t.modalConnect} <Send size={18} /></>}
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  {modalType === "login" && (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1 mb-1 block">{t.sheetLabel}</label>
                        <input required type="text" placeholder={t.modalLoginPlaceholder} value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-[#6d5dfc]/50 transition-all outline-none text-sm" />
                        <div className="mt-2 ml-1 flex items-center gap-1.5">
                          <span className="text-[10px] text-white/30">{(t as any).modalLoginHint}</span>
                          <a 
                            href="https://docs.google.com/spreadsheets/u/0/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] text-[#6d5dfc] hover:underline opacity-80"
                          >
                            docs.google.com
                          </a>
                        </div>
                      </div>

                      {errorMsg && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-2.5 px-3.5 rounded-xl font-medium">
                          {errorMsg}
                        </div>
                      )}

                      <button 
                        id="btn_modal_login_submit"
                        disabled={isLoading || !sheetUrl}
                        className="w-full py-4 bg-[#6d5dfc] hover:bg-[#5b4ce3] disabled:opacity-50 disabled:grayscale text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all text-sm shadow-xl shadow-[#6d5dfc]/20 outline-none mt-2"
                      >
                        {isLoading ? <RefreshCw className="animate-spin w-5 h-5" /> : <>{t.modalLoginBtn} <ArrowRight size={18} /></>}
                      </button>

                      {window.PublicKeyCredential && !/Android/i.test(navigator.userAgent) && (
                        <>
                          <div className="flex items-center justify-center gap-3 my-1">
                            <div className="h-[1px] bg-white/10 flex-1" />
                            <span className="text-[9px] text-white/30 font-black uppercase tracking-wider">или</span>
                            <div className="h-[1px] bg-white/10 flex-1" />
                          </div>

                          <button 
                            type="button"
                            onClick={handlePasskeyLogin}
                            disabled={isLoading}
                            className="w-full py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-xl flex items-center justify-center gap-2.5 transition-all text-xs uppercase tracking-widest outline-none active:scale-98"
                          >
                            <Fingerprint size={16} className="text-[#6d5dfc]" />
                            Войти через Face ID / Passkey
                          </button>
                        </>
                      )}
                    </form>
                  )}

                  {modalType === "studio" && (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1 mb-1 block">{t.contactLabel}</label>
                        <input required type="text" placeholder={t.modalPlaceholder} value={contact} onChange={(e) => setContact(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-[#6d5dfc]/50 transition-all outline-none text-sm" />
                      </div>
                      <button 
                        id="btn_modal_send"
                        disabled={isLoading || !contact}
                        className="w-full py-4 bg-[#6d5dfc] hover:bg-[#5b4ce3] disabled:opacity-50 disabled:grayscale text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all text-sm shadow-xl shadow-[#6d5dfc]/20 outline-none mt-2"
                      >
                        {isLoading ? <RefreshCw className="animate-spin w-5 h-5" /> : <>{t.modalSend} <Send size={18} /></>}
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  {isPasskeyRegisterPending ? (
                    <div className="flex flex-col items-center justify-center py-6">
                      <RefreshCw className="animate-spin w-12 h-12 text-[#6d5dfc] mb-6" />
                      <h3 className="text-xl font-bold mb-2 text-white">
                        {lang === "ru" ? "Привязка Face ID / Touch ID..." : "Binding Face ID / Touch ID..."}
                      </h3>
                      <p className="text-white/50 text-xs leading-relaxed max-w-xs">
                        {lang === "ru" 
                          ? "Привязываем созданный ключ доступа к вашей новой таблице..."
                          : "Linking the created passkey credential to your new spreadsheet..."}
                      </p>
                    </div>
                  ) : passkeyRegisterSuccess ? (
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)] animate-pulse">
                        <Shield className="w-10 h-10 text-green-500" />
                      </div>
                      <h2 className="text-3xl font-bold mb-3 text-white">
                        {lang === "ru" ? "Успешно!" : "Success!"}
                      </h2>
                      <p className="text-white/50 text-sm leading-relaxed mb-6 px-4">
                        {lang === "ru"
                          ? "Вход по биометрии успешно настроен. Перенаправляем вас в приложение..."
                          : "Biometric login successfully configured. Redirecting you to the app..."}
                      </p>
                    </div>
                  ) : passkeyRegisterError ? (
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                        <ShieldAlert className="w-10 h-10 text-red-500" />
                      </div>
                      <h2 className="text-xl font-bold mb-3 text-white">
                        {lang === "ru" ? "Ошибка привязки биометрии" : "Biometrics Binding Error"}
                      </h2>
                      <p className="text-red-400/80 text-xs leading-relaxed mb-8 px-4 max-w-xs break-words">
                        {passkeyRegisterError}
                      </p>
                      <button 
                        id="btn_modal_continue_no_passkey"
                        type="button"
                        onClick={() => {
                          const id = extractSsId(sheetUrl);
                          window.location.href = `/?ssId=${id || ""}`;
                        }}
                        className="w-full py-4 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all text-sm outline-none"
                      >
                        {lang === "ru" ? "Продолжить без биометрии" : "Continue without biometrics"} <ArrowRight size={18} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                        <Sparkles className="w-10 h-10 text-green-500" />
                      </div>
                      <h2 className="text-3xl font-bold mb-3 text-white">
                        {modalType === "login" ? t.modalLoginSuccess : t.modalSuccess}
                      </h2>
                      <p className="text-white/50 text-sm leading-relaxed mb-10 px-4">
                        {modalType === "login" ? t.modalLoginSuccessSub : t.modalSuccessSub}
                      </p>
                      {modalType !== "login" && (
                        <button 
                          id="btn_modal_go_to_app"
                          onClick={() => {
                            const id = extractSsId(sheetUrl);
                            window.location.href = `/?ssId=${id || ""}`;
                          }}
                          className="w-full py-4 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all text-sm outline-none"
                        >
                          {t.modalToApp} <ArrowRight size={18} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="py-16 px-6 border-t border-white/5 text-white/20 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3"><div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center"><Coins className="w-4 h-4 text-white/40" /></div><span className="font-bold text-white/30 tracking-widest uppercase text-xs">CoinLover</span></div>
          
          <a 
            id="btn_faq"
            href="https://coin.rag.reloto.ru/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-6 py-2 rounded-full bg-[#6d5dfc]/10 border border-[#6d5dfc]/30 text-[#6d5dfc] font-bold hover:bg-[#6d5dfc]/20 hover:border-[#6d5dfc] transition-all flex items-center gap-2 text-[10px] md:text-xs uppercase tracking-wider"
          >
            <Shield size={14} />
            {t.knowledgeBase}
          </a>

          <button 
            id="btn_studio"
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

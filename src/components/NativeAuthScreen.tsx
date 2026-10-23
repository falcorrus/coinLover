import React, { useState, useEffect } from "react";
import { 
  Coins, 
  Link as LinkIcon, 
  Sparkles, 
  RefreshCw, 
  ArrowRight, 
  ArrowLeft,
  AlertCircle,
  Fingerprint,
  Check,
  Copy,
  Send,
  Shield,
  ShieldAlert,
  Play
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { googleSheetsService, getAbsoluteApiUrl, universalFetch } from "../services/googleSheets";
import { APP_SETTINGS } from "../constants/settings";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

// Translations
const translations = {
  ru: {
    tabLogin: "Вход",
    tabRegister: "Новый пользователь",
    titleLogin: "Вход в CoinLover",
    subtitleLogin: "Управляйте финансами через Google Таблицы",
    titleRegisterStep1: "Давайте знакомиться",
    subtitleRegisterStep1: "Настройте персональный доступ к CoinLover",
    titleRegisterStep2: "Подключаем таблицу",
    subtitleRegisterStep2: "Ваши финансы будут храниться только у вас",
    sheetUrlLabel: "Ссылка на Google Таблицу",
    sheetUrlPlaceholder: "https://docs.google.com/spreadsheets/d/...",
    sheetUrlHint: "Ссылку на вашу таблицу можете найти здесь:",
    btnSubmit: "Войти",
    btnNext: "Далее",
    btnBack: "Назад",
    btnConnect: "Подключить таблицу",
    demoBtn: "Попробовать Demo-режим",
    demoHint: "Без подключения Google Таблицы",
    nameLabel: "ВАШЕ ИМЯ",
    namePlaceholder: "Как к вам обращаться?",
    contactLabel: "EMAIL ИЛИ TELEGRAM",
    contactPlaceholder: "@username или email...",
    passkeyCheckboxTitle: "Вход по отпечатку (Face ID)",
    passkeyCheckboxSub: "Связать устройство с таблицей для входа в 1 клик",
    step1Title: "Создайте ",
    step1Link: "Google Таблицу",
    step2Title: "Переименуйте её в CoinLover",
    step3Title: "В меню Share (Поделиться) добавьте email как Editor (Редактор):",
    serviceEmail: "coinlover-service-acc@baonlineru.iam.gserviceaccount.com",
    errorInvalidUrl: "Некорректная ссылка на Google Таблицу. Не удалось извлечь Spreadsheet ID.",
    successTitle: "Успешный вход!",
    successSubtitle: "Открываем ваше приложение...",
    registerSuccessTitle: "Готово!",
    registerSuccessSubtitle: "Таблица настроена и связана с CoinLover. Запускаем...",
  },
  en: {
    tabLogin: "Sign In",
    tabRegister: "New User",
    titleLogin: "Login to CoinLover",
    subtitleLogin: "Manage your finances via Google Sheets",
    titleRegisterStep1: "Let's get acquainted",
    subtitleRegisterStep1: "Set up your personal access to CoinLover",
    titleRegisterStep2: "Connect Spreadsheet",
    subtitleRegisterStep2: "Your finances stay 100% in your private sheet",
    sheetUrlLabel: "Google Sheet Link",
    sheetUrlPlaceholder: "https://docs.google.com/spreadsheets/d/...",
    sheetUrlHint: "Find your spreadsheets here:",
    btnSubmit: "Sign In",
    btnNext: "Next",
    btnBack: "Back",
    btnConnect: "Connect Spreadsheet",
    demoBtn: "Try Demo Mode",
    demoHint: "Explore without connecting Google Sheet",
    nameLabel: "YOUR NAME",
    namePlaceholder: "What should we call you?",
    contactLabel: "EMAIL OR TELEGRAM",
    contactPlaceholder: "@username or email...",
    passkeyCheckboxTitle: "Log in with Face ID / fingerprint",
    passkeyCheckboxSub: "Bind device to spreadsheet for instant 1-click login",
    step1Title: "Create a ",
    step1Link: "Google Sheet",
    step2Title: "Rename it to CoinLover",
    step3Title: "In Share menu add this email as Editor:",
    serviceEmail: "coinlover-service-acc@baonlineru.iam.gserviceaccount.com",
    errorInvalidUrl: "Invalid Google Sheet link. Failed to extract Spreadsheet ID.",
    successTitle: "Successful login!",
    successSubtitle: "Opening your app...",
    registerSuccessTitle: "All Done!",
    registerSuccessSubtitle: "Spreadsheet configured and linked to CoinLover. Starting...",
  }
};

export const NativeAuthScreen: React.FC = () => {
  const [lang, setLang] = useState<"ru" | "en">(() => {
    const saved = localStorage.getItem("cl_lang");
    return (saved === "en" || saved === "ru") ? saved : "ru";
  });

  const t = translations[lang];

  // Active Tab: "login" | "register"
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);

  // Form states
  const [sheetUrl, setSheetUrl] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [usePasskeyForOnboarding, setUsePasskeyForOnboarding] = useState(true);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [safePt, setSafePt] = useState("16px");

  // Passkey states
  const [prefetchedLoginOptions, setPrefetchedLoginOptions] = useState<any>(null);
  const [pendingRegisterOptions, setPendingRegisterOptions] = useState<any>(null);
  const [pendingPasskeyCredential, setPendingPasskeyCredential] = useState<any>(null);
  const [pendingChallengeToken, setPendingChallengeToken] = useState("");
  const [isPasskeyRegisterPending, setIsPasskeyRegisterPending] = useState(false);
  const [passkeyRegisterSuccess, setPasskeyRegisterSuccess] = useState(false);
  const [passkeyRegisterError, setPasskeyRegisterError] = useState("");

  useEffect(() => {
    const isStandalone = 
      (window as any).__IS_PWA__ || 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone;

    if (isStandalone) {
      setSafePt("calc(env(safe-area-inset-top, 24px) + 16px)");
    } else {
      setSafePt("24px");
    }

    // Prefetch login options
    universalFetch(getAbsoluteApiUrl("/api/auth/login-options"))
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

    // Prefetch register options
    universalFetch(getAbsoluteApiUrl("/api/auth/register-options"))
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Failed to prefetch register options");
      })
      .then(data => {
        if (data.status === "success") {
          setPendingRegisterOptions(data);
        }
      })
      .catch(err => console.warn("Prefetch register options failed:", err));
  }, []);

  const toggleLanguage = (selectedLang: "ru" | "en") => {
    setLang(selectedLang);
    localStorage.setItem("cl_lang", selectedLang);
  };

  const copyEmailToClipboard = (emailToCopy: string) => {
    navigator.clipboard.writeText(emailToCopy);
    setCopiedEmail(true);
    if (navigator.vibrate) navigator.vibrate(40);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const extractSsId = (url: string) => {
    const match = url.match(/[-\w]{25,}/);
    return match ? match[0] : null;
  };

  // Login handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedSsId = extractSsId(sheetUrl);
    if (!parsedSsId) {
      setErrorMsg(t.errorInvalidUrl);
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const remoteData = await googleSheetsService.fetchSettings(parsedSsId);
      if (remoteData) {
        if (navigator.vibrate) navigator.vibrate(80);

        localStorage.setItem("cl_active_table_id", parsedSsId);
        localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE, "false");
        document.cookie = `cl_active_table_id=${parsedSsId}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;

        setIsSuccess(true);
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      } else {
        setErrorMsg(t.errorInvalidUrl);
      }
    } catch (err: any) {
      setErrorMsg(err.message || t.errorInvalidUrl);
    } finally {
      setIsLoading(false);
    }
  };

  // Demo mode handler
  const handleDemoSignIn = () => {
    if (navigator.vibrate) navigator.vibrate(40);
    const demoId = APP_SETTINGS.DEMO_SS_ID;
    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.ACTIVE_TABLE_ID, demoId);
    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE, "true");
    document.cookie = `cl_active_table_id=${demoId}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;
    window.location.href = `/?ssId=${demoId}`;
  };

  // Passkey Login handler
  const handlePasskeyLogin = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      let data = prefetchedLoginOptions;

      if (!data) {
        const optionsRes = await universalFetch(getAbsoluteApiUrl("/api/auth/login-options"));
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

      const verifyRes = await universalFetch(getAbsoluteApiUrl("/api/auth/login-verify"), {
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
        if (navigator.vibrate) navigator.vibrate(80);
        
        localStorage.setItem("cl_active_table_id", verifyData.ssId || ssId);
        localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE, "false");
        document.cookie = `cl_active_table_id=${verifyData.ssId || ssId}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;

        setIsSuccess(true);
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      } else {
        throw new Error(verifyData.message || "Verification failed");
      }
    } catch (err: any) {
      console.error("Passkey login failed:", err);
      if (err.message === "TIMEOUT") {
        setErrorMsg(
          lang === "ru"
            ? "Превышено время ожидания биометрии."
            : "Biometrics timeout exceeded."
        );
      } else if (err.name === "NotFoundError" || err.message?.includes("No credential") || err.message?.includes("not found")) {
        setErrorMsg(
          lang === "ru" 
            ? "Passkey не найден. Войдите сначала по ссылке на таблицу или создайте аккаунт." 
            : "Passkey not found. Sign in via your Google Sheet link first or create an account."
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

  // Register Step 1 Next
  const handleRegisterStep1Next = async () => {
    if (!name.trim() || !contact.trim()) return;

    if (!usePasskeyForOnboarding || !window.PublicKeyCredential) {
      setRegisterStep(2);
      return;
    }

    setIsPasskeyRegisterPending(true);
    setPasskeyRegisterError("");
    setPasskeyRegisterSuccess(false);

    try {
      let data = pendingRegisterOptions;
      if (!data) {
        const optionsRes = await universalFetch(
          getAbsoluteApiUrl(`/api/auth/register-options?contact=${encodeURIComponent(contact)}&name=${encodeURIComponent(name)}`)
        );
        if (!optionsRes.ok) {
          throw new Error(await optionsRes.text() || "Failed to fetch registration options");
        }
        data = await optionsRes.json();
      }

      if (data.status !== "success") {
        throw new Error(data.message || "Failed to fetch options");
      }

      if (data.options && data.options.publicKey) {
        data.options.publicKey.timeout = 60000;
      }

      const credential = await startRegistration(data.options);
      setPendingPasskeyCredential(credential);
      setPendingChallengeToken(data.challengeToken);
      setRegisterStep(2);
    } catch (err: any) {
      console.error("Passkey onboarding Step 1 failed:", err);
      let errMsg = err.message || String(err);
      if (err.name === "NotAllowedError") {
        errMsg = lang === "ru" 
          ? "Вход отменен пользователем или истекло время ожидания."
          : "Registration cancelled or timed out.";
      }
      setPasskeyRegisterError(errMsg);
    } finally {
      setIsPasskeyRegisterPending(false);
    }
  };

  // Verify Passkey after sheet submission
  const handleVerifyPendingPasskey = async (ssId: string) => {
    setIsPasskeyRegisterPending(true);
    setPasskeyRegisterError("");
    setPasskeyRegisterSuccess(false);
    try {
      if (!pendingPasskeyCredential) {
        throw new Error("No pending passkey credential found");
      }

      const verifyRes = await universalFetch(getAbsoluteApiUrl("/api/auth/register-verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ssId,
          contact,
          name,
          registrationResponse: pendingPasskeyCredential,
          challengeToken: pendingChallengeToken
        })
      });

      const verifyData = await verifyRes.json();
      if (verifyData.status === "success" && verifyData.verified) {
        setPasskeyRegisterSuccess(true);
        localStorage.removeItem("cl_accounts");
        localStorage.removeItem("cl_categories");
        localStorage.removeItem("cl_incomes");
        localStorage.removeItem("cl_transactions");
        localStorage.removeItem("cl_last_sync");
        localStorage.removeItem("cl_onboarding_completed");
        
        localStorage.setItem("cl_active_table_id", verifyData.ssId || ssId);
        localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE, "false");
        document.cookie = `cl_active_table_id=${verifyData.ssId || ssId}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;
        
        setTimeout(() => {
          window.location.href = `/?ssId=${verifyData.ssId || ssId}`;
        }, 1500);
      } else {
        throw new Error(verifyData.message || "Verification failed");
      }
    } catch (err: any) {
      console.error("Passkey binding failed:", err);
      setPasskeyRegisterError(err.message || String(err));
    } finally {
      setIsPasskeyRegisterPending(false);
    }
  };

  // Register Step 2 Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedSsId = extractSsId(sheetUrl);
    if (!parsedSsId) {
      setErrorMsg(t.errorInvalidUrl);
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const payload = {
        action: "registerLead",
        name: name || "App User",
        contact,
        sheetUrl: sheetUrl || "",
        type: "onboarding"
      };

      await googleSheetsService.syncToSheets(payload as any);

      if (usePasskeyForOnboarding && window.PublicKeyCredential && pendingPasskeyCredential) {
        setIsSuccess(true);
        await handleVerifyPendingPasskey(parsedSsId);
      } else {
        // Direct without passkey
        localStorage.removeItem("cl_accounts");
        localStorage.removeItem("cl_categories");
        localStorage.removeItem("cl_incomes");
        localStorage.removeItem("cl_transactions");
        localStorage.removeItem("cl_last_sync");
        
        localStorage.setItem("cl_active_table_id", parsedSsId);
        localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE, "false");
        document.cookie = `cl_active_table_id=${parsedSsId}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;

        setIsSuccess(true);
        setTimeout(() => {
          window.location.href = `/?ssId=${parsedSsId}`;
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || t.errorInvalidUrl);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      style={{ paddingTop: safePt }}
      className="min-h-screen bg-[#050505] text-white selection:bg-[#6d5dfc]/30 font-sans flex flex-col justify-between items-center px-4 sm:px-6 pb-6 relative overflow-x-hidden"
    >
      {/* Background glow and subtle grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[340px] h-[340px] bg-[#6d5dfc]/10 blur-[100px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] opacity-20" />
      </div>

      {/* Top Header */}
      <header className="w-full max-w-md flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#6d5dfc] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(109,93,252,0.4)]">
            <Coins className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-black tracking-tight text-white/90">CoinLover</span>
        </div>
        <div className="flex bg-white/5 rounded-lg p-1 border border-white/5 backdrop-blur-md">
          <button 
            onClick={() => toggleLanguage("ru")}
            className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-all ${lang === 'ru' ? 'bg-[#6d5dfc] text-white shadow-sm' : 'text-white/40 hover:text-white'}`}
          >RU</button>
          <button 
            onClick={() => toggleLanguage("en")}
            className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-all ${lang === 'en' ? 'bg-[#6d5dfc] text-white shadow-sm' : 'text-white/40 hover:text-white'}`}
          >EN</button>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-md z-10 my-auto py-4">
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div 
              key={`auth-${activeTab}-${registerStep}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-[28px] p-5 sm:p-6 shadow-2xl relative"
            >
              {/* Segmented Control Tabs (Linear Style) */}
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("login");
                    setErrorMsg("");
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "login" 
                      ? "bg-[#6d5dfc] text-white shadow-[0_2px_10px_rgba(109,93,252,0.3)]" 
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  {t.tabLogin}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("register");
                    setErrorMsg("");
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "register" 
                      ? "bg-[#6d5dfc] text-white shadow-[0_2px_10px_rgba(109,93,252,0.3)]" 
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  {t.tabRegister}
                </button>
              </div>

              {/* Header inside card */}
              <div className="text-center mb-6">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white/95">
                  {activeTab === "login" 
                    ? t.titleLogin 
                    : registerStep === 1 
                      ? t.titleRegisterStep1 
                      : t.titleRegisterStep2}
                </h1>
                <p className="text-xs text-white/40 mt-1 max-w-xs mx-auto leading-relaxed">
                  {activeTab === "login" 
                    ? t.subtitleLogin 
                    : registerStep === 1 
                      ? t.subtitleRegisterStep1 
                      : t.subtitleRegisterStep2}
                </p>
              </div>

              {/* TAB 1: LOGIN */}
              {activeTab === "login" && (
                <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1 mb-1 block">
                      {t.sheetUrlLabel}
                    </label>
                    <div className="relative flex items-center">
                      <LinkIcon size={16} className="absolute left-4 text-white/30" />
                      <input 
                        required 
                        type="text" 
                        placeholder={t.sheetUrlPlaceholder}
                        value={sheetUrl} 
                        onChange={(e) => setSheetUrl(e.target.value)} 
                        className="w-full bg-white/5 border border-white/10 rounded-[14px] py-3 text-white placeholder:text-white/20 focus:border-[#6d5dfc]/50 transition-all outline-none text-sm pl-11 pr-4"
                      />
                    </div>
                    <div className="mt-2 ml-1 flex items-center gap-1.5">
                      <span className="text-[10px] text-white/30">{t.sheetUrlHint}</span>
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
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-2.5 px-3.5 rounded-[14px] font-medium flex items-center gap-2"
                    >
                      <AlertCircle size={14} className="flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </motion.div>
                  )}

                  <button 
                    id="btn_native_login_submit"
                    type="submit"
                    disabled={isLoading || !sheetUrl.trim()}
                    className="w-full py-3.5 bg-[#6d5dfc] hover:bg-[#5b4ce3] disabled:opacity-50 disabled:grayscale text-white font-bold rounded-[14px] flex items-center justify-center gap-2 transition-all text-sm shadow-xl shadow-[#6d5dfc]/20 outline-none mt-1 active:scale-98"
                  >
                    {isLoading ? <RefreshCw className="animate-spin w-5 h-5" /> : <>{t.btnSubmit} <ArrowRight size={18} /></>}
                  </button>

                  {window.PublicKeyCredential && (
                    <>
                      <div className="flex items-center justify-center gap-3 my-1">
                        <div className="h-[1px] bg-white/10 flex-1" />
                        <span className="text-[9px] text-white/30 font-black uppercase tracking-wider">
                          {lang === 'ru' ? 'или' : 'or'}
                        </span>
                        <div className="h-[1px] bg-white/10 flex-1" />
                      </div>

                      <button 
                        type="button"
                        onClick={handlePasskeyLogin}
                        disabled={isLoading}
                        className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-[14px] flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-widest outline-none active:scale-98"
                      >
                        <Fingerprint size={16} className="text-[#6d5dfc]" />
                        {lang === 'ru' ? 'Войти через Face ID / Passkey' : 'Log In with Face ID / Passkey'}
                      </button>
                    </>
                  )}
                </form>
              )}

              {/* TAB 2: REGISTER (Step 1) */}
              {activeTab === "register" && registerStep === 1 && (
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1 mb-1 block">
                      {t.nameLabel}
                    </label>
                    <input 
                      required 
                      type="text" 
                      placeholder={t.namePlaceholder} 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      className="w-full bg-white/5 border border-white/10 rounded-[14px] px-4 py-3 text-white placeholder:text-white/20 focus:border-[#6d5dfc]/50 transition-all outline-none text-sm" 
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1 mb-1 block">
                      {t.contactLabel}
                    </label>
                    <input 
                      required 
                      type="text" 
                      placeholder={t.contactPlaceholder} 
                      value={contact} 
                      onChange={(e) => setContact(e.target.value)} 
                      className="w-full bg-white/5 border border-white/10 rounded-[14px] px-4 py-3 text-white placeholder:text-white/20 focus:border-[#6d5dfc]/50 transition-all outline-none text-sm" 
                    />
                  </div>

                  {window.PublicKeyCredential && (
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-[14px] hover:bg-white/10 transition-colors select-none">
                      <input 
                        type="checkbox" 
                        id="use_passkey_native_onboarding" 
                        checked={usePasskeyForOnboarding} 
                        onChange={(e) => setUsePasskeyForOnboarding(e.target.checked)}
                        className="w-4 h-4 rounded border-white/10 text-[#6d5dfc] focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="use_passkey_native_onboarding" className="text-xs text-white/80 leading-snug cursor-pointer flex-1 text-left">
                        🔑 <strong>{t.passkeyCheckboxTitle}</strong><br />
                        <span className="text-[10px] text-white/40">{t.passkeyCheckboxSub}</span>
                      </label>
                    </div>
                  )}

                  {passkeyRegisterError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-[14px] p-3 text-left flex flex-col gap-2">
                      <div className="flex gap-2">
                        <span className="text-red-400 mt-0.5 shrink-0">⚠️</span>
                        <p className="text-red-400 text-xs font-semibold leading-relaxed">
                          {passkeyRegisterError}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUsePasskeyForOnboarding(false);
                          setPasskeyRegisterError("");
                          setRegisterStep(2);
                        }}
                        className="text-center py-2 text-xs font-bold text-white/70 hover:text-white bg-white/5 rounded-lg border border-white/10 transition-all cursor-pointer"
                      >
                        {lang === 'ru' ? 'Продолжить без Face ID / биометрии' : 'Continue without biometrics'}
                      </button>
                    </div>
                  )}

                  {!passkeyRegisterError && (
                    <button 
                      id="btn_native_register_next"
                      type="button"
                      onClick={handleRegisterStep1Next}
                      disabled={!name.trim() || !contact.trim() || isPasskeyRegisterPending}
                      className="w-full py-3.5 bg-[#6d5dfc] hover:bg-[#5b4ce3] disabled:opacity-50 disabled:grayscale text-white font-bold rounded-[14px] flex items-center justify-center gap-2 transition-all text-sm shadow-xl shadow-[#6d5dfc]/20 outline-none mt-1 active:scale-98"
                    >
                      {isPasskeyRegisterPending ? (
                        <RefreshCw className="animate-spin w-5 h-5" />
                      ) : (
                        <>{t.btnNext} <ArrowRight size={18} /></>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* TAB 2: REGISTER (Step 2) */}
              {activeTab === "register" && registerStep === 2 && (
                <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3">
                  <div className="p-3.5 bg-black/40 border border-white/5 rounded-[18px] flex flex-col gap-2.5 relative">
                    <div className="flex flex-col gap-2 text-xs text-white/70">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#6d5dfc]/20 text-[#6d5dfc] flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</span>
                        <p className="leading-relaxed">
                          {t.step1Title}
                          <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" className="text-[#6d5dfc] underline hover:text-[#5b4ce3] font-bold">
                            {t.step1Link}
                          </a>
                        </p>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#6d5dfc]/20 text-[#6d5dfc] flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</span>
                        <p className="leading-relaxed">
                          {t.step2Title}
                        </p>
                      </div>

                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#6d5dfc]/20 text-[#6d5dfc] flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</span>
                        <p className="leading-relaxed">
                          {t.step3Title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-[#6d5dfc]/5 p-2 rounded-xl border border-[#6d5dfc]/10">
                      <code className="text-[10px] text-[#6d5dfc] break-all font-mono select-all flex-1">{t.serviceEmail}</code>
                      <button 
                        id="btn_copy_email_native"
                        type="button"
                        onClick={() => copyEmailToClipboard(t.serviceEmail)}
                        className={`p-1.5 rounded-md transition-all duration-200 outline-none flex items-center justify-center ${
                          copiedEmail 
                            ? "bg-[#10b981]/20 text-[#10b981]" 
                            : "hover:bg-[#6d5dfc]/20 text-[#6d5dfc]"
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
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1 mb-1 block">{t.sheetUrlLabel}</label>
                    <input 
                      required 
                      type="text" 
                      placeholder={t.sheetUrlPlaceholder} 
                      value={sheetUrl} 
                      onChange={(e) => setSheetUrl(e.target.value)} 
                      className="w-full bg-white/5 border border-white/10 rounded-[14px] px-4 py-3 text-white placeholder:text-white/20 focus:border-[#6d5dfc]/50 transition-all outline-none text-sm" 
                    />
                  </div>

                  {errorMsg && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-2.5 px-3.5 rounded-[14px] font-medium flex items-center gap-2"
                    >
                      <AlertCircle size={14} className="flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </motion.div>
                  )}

                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setRegisterStep(1)}
                      className="py-3.5 px-4 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold rounded-[14px] flex items-center justify-center transition-all text-sm outline-none"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <button 
                      id="btn_native_register_submit"
                      type="submit"
                      disabled={isLoading || !sheetUrl.trim()}
                      className="flex-1 py-3.5 bg-[#6d5dfc] hover:bg-[#5b4ce3] disabled:opacity-50 disabled:grayscale text-white font-bold rounded-[14px] flex items-center justify-center gap-2 transition-all text-sm shadow-xl shadow-[#6d5dfc]/20 outline-none active:scale-98"
                    >
                      {isLoading ? <RefreshCw className="animate-spin w-5 h-5" /> : <>{t.btnConnect} <Send size={16} /></>}
                    </button>
                  </div>
                </form>
              )}

              {/* DEMO MODE BUTTON (Below card or within card footer) */}
              <div className="mt-5 pt-4 border-t border-white/5 flex flex-col items-center">
                <button
                  type="button"
                  onClick={handleDemoSignIn}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-all group active:scale-98"
                >
                  <Sparkles size={14} className="text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>{t.demoBtn}</span>
                  <span className="text-[10px] opacity-60 font-normal hidden sm:inline">({t.demoHint})</span>
                </button>
              </div>
            </motion.div>
          ) : (
            /* SUCCESS STATE */
            <motion.div 
              key="auth-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-[28px] p-8 shadow-2xl text-center max-w-sm mx-auto"
            >
              <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)] animate-pulse">
                <Sparkles className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white/95">
                {activeTab === "login" ? t.successTitle : t.registerSuccessTitle}
              </h2>
              <p className="text-white/50 text-xs leading-relaxed px-4">
                {activeTab === "login" ? t.successSubtitle : t.registerSuccessSubtitle}
              </p>
              
              <div className="w-full flex items-center justify-center gap-2 mt-8 text-[#6d5dfc]">
                <RefreshCw className="animate-spin w-5 h-5" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md flex flex-col gap-2 items-center z-10 mt-auto">
        <span className="text-[10px] text-white/15">© 2026 CoinLover. Linear Style Financial Tracker.</span>
      </footer>
    </div>
  );
};

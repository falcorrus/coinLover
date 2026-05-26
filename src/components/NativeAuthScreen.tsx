import React, { useState, useEffect } from "react";
import { 
  Coins, 
  Link as LinkIcon, 
  Sparkles, 
  RefreshCw, 
  ArrowRight, 
  AlertCircle,
  Fingerprint
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { googleSheetsService } from "../services/googleSheets";
import { APP_SETTINGS } from "../constants/settings";
import { startAuthentication } from "@simplewebauthn/browser";

// Translations
const translations = {
  ru: {
    title: "Вход в CoinLover",
    subtitle: "Управляйте финансами через Google Таблицы",
    sheetUrlLabel: "Ссылка на Google Таблицу",
    sheetUrlPlaceholder: "https://docs.google.com/spreadsheets/d/...",
    sheetUrlHint: "Ссылку на вашу таблицу можете найти здесь:",
    btnSubmit: "Войти",
    demoBtn: "Попробовать Demo-режим",
    errorInvalidUrl: "Некорректная ссылка на Google Таблицу. Не удалось извлечь Spreadsheet ID.",
    successTitle: "Успешный вход!",
    successSubtitle: "Открываем ваше приложение...",
  },
  en: {
    title: "Login to CoinLover",
    subtitle: "Manage your finances via Google Sheets",
    sheetUrlLabel: "Google Sheet Link",
    sheetUrlPlaceholder: "https://docs.google.com/spreadsheets/d/...",
    sheetUrlHint: "Find your spreadsheets here:",
    btnSubmit: "Sign In",
    demoBtn: "Try Demo Mode",
    errorInvalidUrl: "Invalid Google Sheet link. Failed to extract Spreadsheet ID.",
    successTitle: "Successful login!",
    successSubtitle: "Opening your app...",
  }
};

export const NativeAuthScreen: React.FC = () => {
  const [lang, setLang] = useState<"ru" | "en">(() => {
    const saved = localStorage.getItem("cl_lang");
    return (saved === "en" || saved === "ru") ? saved : "ru";
  });

  const t = translations[lang];

  const [sheetUrl, setSheetUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [safePt, setSafePt] = useState("16px");
  const [prefetchedLoginOptions, setPrefetchedLoginOptions] = useState<any>(null);

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

  const toggleLanguage = (selectedLang: "ru" | "en") => {
    setLang(selectedLang);
    localStorage.setItem("cl_lang", selectedLang);
  };

  const extractSsId = (url: string) => {
    const match = url.match(/[-\w]{25,}/);
    return match ? match[0] : null;
  };

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
      // Пытаемся получить настройки (GET). Это безопасно и не затирает данные.
      const remoteData = await googleSheetsService.fetchSettings(parsedSsId);
      if (remoteData) {
        if (navigator.vibrate) navigator.vibrate(80);

        localStorage.setItem("cl_active_table_id", parsedSsId);
        // Пользователь уже имеет таблицу — онбординг не нужен
        localStorage.setItem("cl_onboarding_completed", "true");
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

  const handleDemoSignIn = () => {
    if (navigator.vibrate) navigator.vibrate(40);
    localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.ACTIVE_TABLE_ID);
    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE, "true");
    window.location.href = "/?demo=true";
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
        if (navigator.vibrate) navigator.vibrate(80);
        
        localStorage.setItem("cl_active_table_id", verifyData.ssId || ssId);
        localStorage.setItem("cl_onboarding_completed", "true");
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

  return (
    <div 
      style={{ paddingTop: safePt }}
      className="min-h-screen bg-[#050505] text-white selection:bg-[#6d5dfc]/30 font-sans flex flex-col justify-between items-center px-6 pb-8 relative overflow-hidden"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-[#6d5dfc]/8 blur-[100px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] opacity-20" />
      </div>

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

      <main className="w-full max-w-md z-10 my-auto py-8">
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div 
              key="auth-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-[28px] p-6 shadow-2xl relative"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#6d5dfc]/10 border border-[#6d5dfc]/20 rounded-2xl flex items-center justify-center mx-auto mb-4 relative group">
                  <Coins className="w-8 h-8 text-[#6d5dfc] animate-pulse" />
                  <div className="absolute -inset-1 bg-[#6d5dfc]/20 blur-md rounded-2xl -z-10 opacity-30 group-hover:opacity-75 transition-opacity" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white/90">{t.title}</h1>
                <p className="text-xs text-white/40 mt-1 max-w-xs mx-auto leading-relaxed">{t.subtitle}</p>
              </div>

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
                  disabled={isLoading || !sheetUrl.trim()}
                  className="w-full py-4 bg-[#6d5dfc] hover:bg-[#5b4ce3] disabled:opacity-50 disabled:grayscale text-white font-bold rounded-[14px] flex items-center justify-center gap-3 transition-all text-sm shadow-xl shadow-[#6d5dfc]/20 outline-none mt-2"
                >
                  {isLoading ? <RefreshCw className="animate-spin w-5 h-5" /> : <>{t.btnSubmit} <ArrowRight size={18} /></>}
                </button>

                {window.PublicKeyCredential && (
                  <>
                    <div className="flex items-center justify-center gap-3 my-2">
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
                      className="w-full py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-[14px] flex items-center justify-center gap-2.5 transition-all text-xs uppercase tracking-widest outline-none active:scale-98"
                    >
                      <Fingerprint size={16} className="text-[#6d5dfc]" />
                      {lang === 'ru' ? 'Войти через Face ID / Passkey' : 'Log In with Face ID / Passkey'}
                    </button>
                  </>
                )}
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="auth-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-[28px] p-8 shadow-2xl text-center max-w-sm mx-auto"
            >
              <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                <Sparkles className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white/95">{t.successTitle}</h2>
              <p className="text-white/50 text-xs leading-relaxed px-4">
                {t.successSubtitle}
              </p>
              
              <div className="w-full flex items-center justify-center gap-2 mt-8 text-[#6d5dfc]">
                <RefreshCw className="animate-spin w-5 h-5" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="w-full max-w-md flex flex-col gap-4 items-center z-10 mt-auto">
        <span className="text-[10px] text-white/15">© 2026 CoinLover. All rights reserved.</span>
      </footer>
    </div>
  );
};

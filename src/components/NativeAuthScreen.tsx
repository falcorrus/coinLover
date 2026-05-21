import React, { useState, useEffect, useRef } from "react";
import { 
  Coins, 
  Mail, 
  Send, 
  QrCode, 
  Link as LinkIcon, 
  Sparkles, 
  RefreshCw, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Camera, 
  Upload, 
  AlertCircle, 
  Check, 
  X, 
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import jsQR from "jsqr";
import { googleSheetsService } from "../services/googleSheets";

// Translations matching the design rule (Russian first or fallback)
const translations = {
  ru: {
    title: "Вход в CoinLover",
    subtitle: "Управляйте финансами через Google Таблицы",
    tgTab: "Telegram",
    emailTab: "Email",
    tgLabel: "Имя пользователя Telegram",
    emailLabel: "Электронная почта",
    tgPlaceholder: "@username или username",
    emailPlaceholder: "example@email.com",
    btnSubmit: "Войти",
    geekTitle: "Резервный вход (для гиков) 🛠",
    geekSubtitle: "Подключите существующую таблицу вручную",
    sheetUrlLabel: "Ссылка на Google Таблицу",
    sheetUrlPlaceholder: "https://docs.google.com/spreadsheets/d/...",
    btnConnectLink: "Подключить по ссылке",
    btnScanQr: "Сканировать QR-код",
    btnUploadQr: "Загрузить фото QR",
    qrModalTitle: "Сканирование QR-кода",
    qrInstructions: "Наведите камеру на QR-код вашей таблицы CoinLover",
    qrCameraError: "Не удалось получить доступ к камере. Используйте загрузку фото или вставку ссылки.",
    qrDecodeError: "Не удалось распознать QR-код на изображении. Попробуйте другое фото.",
    demoBtn: "Попробовать Demo-режим",
    errorUserNotFound: "Пользователь с таким Email или Telegram не найден. Зарегистрируйтесь на сайте.",
    errorInvalidUrl: "Некорректная ссылка на Google Таблицу. Не удалось извлечь Spreadsheet ID.",
    successTitle: "Успешный вход!",
    successSubtitle: "Открываем ваше приложение...",
    welcome: "С возвращением!",
    cameraAccessing: "Доступ к камере...",
    close: "Закрыть",
    serviceEmail: "coinlover-service-acc@baonlineru.iam.gserviceaccount.com",
    shareInstruction: "Пожалуйста, предоставьте доступ вашей Google Таблицы (Editor) на этот адрес:",
    copyBtn: "Копировать",
    copied: "Скопировано!"
  },
  en: {
    title: "Login to CoinLover",
    subtitle: "Manage your finances via Google Sheets",
    tgTab: "Telegram",
    emailTab: "Email",
    tgLabel: "Telegram Username",
    emailLabel: "Email Address",
    tgPlaceholder: "@username or username",
    emailPlaceholder: "example@email.com",
    btnSubmit: "Sign In",
    geekTitle: "Backup Login (for geeks) 🛠",
    geekSubtitle: "Connect an existing sheet manually",
    sheetUrlLabel: "Google Sheet Link",
    sheetUrlPlaceholder: "https://docs.google.com/spreadsheets/d/...",
    btnConnectLink: "Connect via Link",
    btnScanQr: "Scan QR Code",
    btnUploadQr: "Upload QR Photo",
    qrModalTitle: "QR Code Scanning",
    qrInstructions: "Point your camera at the QR code of your CoinLover sheet",
    qrCameraError: "Could not access camera. Try uploading a photo or pasting the link.",
    qrDecodeError: "Failed to recognize QR code. Please try another image.",
    demoBtn: "Try Demo Mode",
    errorUserNotFound: "User with this Email or Telegram not found. Register on the website.",
    errorInvalidUrl: "Invalid Google Sheet link. Failed to extract Spreadsheet ID.",
    successTitle: "Successful login!",
    successSubtitle: "Opening your app...",
    welcome: "Welcome back!",
    cameraAccessing: "Accessing camera...",
    close: "Close",
    serviceEmail: "coinlover-service-acc@baonlineru.iam.gserviceaccount.com",
    shareInstruction: "Please grant Editor access of your Google Sheet to this email:",
    copyBtn: "Copy",
    copied: "Copied!"
  }
};

export const NativeAuthScreen: React.FC = () => {
  // Determine language from localStorage or fallback to RU
  const [lang, setLang] = useState<"ru" | "en">(() => {
    const saved = localStorage.getItem("cl_lang");
    return (saved === "en" || saved === "ru") ? saved : "ru";
  });

  const t = translations[lang];

  // Form states
  const [activeTab, setActiveTab] = useState<"telegram" | "email">("telegram");
  const [contact, setContact] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  
  // UI states
  const [isGeekOpen, setIsGeekOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // QR Modal states
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrError, setQrError] = useState("");
  const [qrScanning, setQrScanning] = useState(false);

  // Video / Canvas refs for QR Scanning
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Safe area pt padding
  const [safePt, setSafePt] = useState("16px");

  useEffect(() => {
    // Detect standalone PWA safe pt offsets
    const isStandalone = 
      (window as any).__IS_PWA__ || 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone;

    if (isStandalone) {
      setSafePt("calc(env(safe-area-inset-top, 24px) + 16px)");
    } else {
      setSafePt("24px");
    }
  }, []);

  // Update language switcher
  const toggleLanguage = (selectedLang: "ru" | "en") => {
    setLang(selectedLang);
    localStorage.setItem("cl_lang", selectedLang);
  };

  // Safe username cleaning
  const cleanUsername = (user: string) => {
    let clean = user.trim().toLowerCase();
    if (clean.startsWith("@")) {
      clean = clean.substring(1);
    }
    return clean;
  };

  // Helper to extract ssId
  const extractSsId = (url: string) => {
    const match = url.match(/[-\w]{25,}/);
    return match ? match[0] : null;
  };

  // Handle Telegram/Email sign-in
  const handlePrimarySignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.trim()) return;

    setIsLoading(true);
    setErrorMsg("");

    try {
      const cleanContactVal = activeTab === "telegram" ? cleanUsername(contact) : contact.trim().toLowerCase();
      
      const result = await googleSheetsService.findUserByContact(cleanContactVal);
      if (result.status === "success" && result.data?.ssId) {
        const targetSsId = result.data.ssId;
        
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(80);

        // Save active table
        localStorage.setItem("cl_active_table_id", targetSsId);
        localStorage.setItem("cl_demo_mode", "false");
        document.cookie = `cl_active_table_id=${targetSsId}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;

        setIsSuccess(true);
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      } else {
        setErrorMsg(t.errorUserNotFound);
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      setErrorMsg(err.message || t.errorUserNotFound);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle geek URL sign-in
  const handleGeekSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedSsId = extractSsId(sheetUrl);
    if (!parsedSsId) {
      setErrorMsg(t.errorInvalidUrl);
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      // Initialize table setup
      const isOk = await googleSheetsService.initTable(parsedSsId);
      if (isOk) {
        if (navigator.vibrate) navigator.vibrate(80);

        localStorage.setItem("cl_active_table_id", parsedSsId);
        localStorage.setItem("cl_demo_mode", "false");
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

  // Demo Sign-In
  const handleDemoSignIn = () => {
    if (navigator.vibrate) navigator.vibrate(40);
    localStorage.removeItem("cl_active_table_id");
    localStorage.setItem("cl_demo_mode", "true");
    window.location.href = "/?demo=true";
  };

  // QR Code camera scan loop
  const startCamera = async () => {
    setQrError("");
    setQrScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true"); // critical for iOS Safari standalone PWA
        videoRef.current.play();
      }

      // Start processing loop
      scanIntervalRef.current = window.setInterval(scanFrame, 200);
    } catch (err) {
      console.error("Camera access failed", err);
      setQrError(t.qrCameraError);
      setQrScanning(false);
    }
  };

  const stopCamera = () => {
    setQrScanning(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data) {
        // Success
        const parsedSsId = extractSsId(code.data);
        if (parsedSsId) {
          // Success haptic
          if (navigator.vibrate) navigator.vibrate([40, 40, 40]);
          stopCamera();
          setIsQrModalOpen(false);

          // Save and redirect
          localStorage.setItem("cl_active_table_id", parsedSsId);
          localStorage.setItem("cl_demo_mode", "false");
          document.cookie = `cl_active_table_id=${parsedSsId}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;

          setIsSuccess(true);
          setTimeout(() => {
            window.location.href = "/";
          }, 1200);
        }
      }
    }
  };

  // QR Code Image File Upload Fallback
  const handleQrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0, img.width, img.height);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code && code.data) {
            const parsedSsId = extractSsId(code.data);
            if (parsedSsId) {
              if (navigator.vibrate) navigator.vibrate([40, 40]);
              localStorage.setItem("cl_active_table_id", parsedSsId);
              localStorage.setItem("cl_demo_mode", "false");
              document.cookie = `cl_active_table_id=${parsedSsId}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;

              setIsSuccess(true);
              setTimeout(() => {
                window.location.href = "/";
              }, 1200);
              return;
            }
          }
          setErrorMsg(t.qrDecodeError);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(t.serviceEmail);
    setCopied(true);
    if (navigator.vibrate) navigator.vibrate(30);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      style={{ paddingTop: safePt }}
      className="min-h-screen bg-[#050505] text-white selection:bg-[#6d5dfc]/30 font-sans flex flex-col justify-between items-center px-6 pb-8 relative overflow-hidden"
    >
      {/* Decorative background grid and glowing mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-[#6d5dfc]/8 blur-[100px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] opacity-20" />
      </div>

      {/* Header section with Logo & Lang Switcher */}
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

      {/* Main card panel */}
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
              {/* Pulsating welcome header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#6d5dfc]/10 border border-[#6d5dfc]/20 rounded-2xl flex items-center justify-center mx-auto mb-4 relative group">
                  <Coins className="w-8 h-8 text-[#6d5dfc] animate-pulse" />
                  <div className="absolute -inset-1 bg-[#6d5dfc]/20 blur-md rounded-2xl -z-10 opacity-30 group-hover:opacity-75 transition-opacity" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white/90">{t.title}</h1>
                <p className="text-xs text-white/40 mt-1 max-w-xs mx-auto leading-relaxed">{t.subtitle}</p>
              </div>

              {/* Login Tabs */}
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 mb-6">
                <button 
                  type="button"
                  onClick={() => { setActiveTab("telegram"); setErrorMsg(""); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === "telegram" ? 'bg-[#6d5dfc] text-white shadow-md' : 'text-white/40 hover:text-white'}`}
                >
                  <Send size={14} />
                  {t.tgTab}
                </button>
                <button 
                  type="button"
                  onClick={() => { setActiveTab("email"); setErrorMsg(""); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === "email" ? 'bg-[#6d5dfc] text-white shadow-md' : 'text-white/40 hover:text-white'}`}
                >
                  <Mail size={14} />
                  {t.emailTab}
                </button>
              </div>

              {/* Primary Login Form */}
              <form onSubmit={handlePrimarySignIn} className="flex flex-col gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1 mb-1 block">
                    {activeTab === "telegram" ? t.tgLabel : t.emailLabel}
                  </label>
                  <div className="relative flex items-center">
                    {activeTab === "telegram" ? (
                      <span className="absolute left-4 text-white/30 text-sm font-medium">@</span>
                    ) : (
                      <Mail size={16} className="absolute left-4 text-white/30" />
                    )}
                    <input 
                      required 
                      type={activeTab === "email" ? "email" : "text"} 
                      placeholder={activeTab === "telegram" ? t.tgPlaceholder : t.emailPlaceholder}
                      value={contact} 
                      onChange={(e) => setContact(e.target.value)} 
                      className={`w-full bg-white/5 border border-white/10 rounded-[14px] py-3 text-white placeholder:text-white/20 focus:border-[#6d5dfc]/50 transition-all outline-none text-sm ${activeTab === "telegram" ? 'pl-8 pr-4' : 'pl-11 pr-4'}`}
                    />
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
                  disabled={isLoading || !contact.trim()}
                  className="w-full py-4 bg-[#6d5dfc] hover:bg-[#5b4ce3] disabled:opacity-50 disabled:grayscale text-white font-bold rounded-[14px] flex items-center justify-center gap-3 transition-all text-sm shadow-xl shadow-[#6d5dfc]/20 outline-none mt-2"
                >
                  {isLoading ? <RefreshCw className="animate-spin w-5 h-5" /> : <>{t.btnSubmit} <ArrowRight size={18} /></>}
                </button>
              </form>

              {/* Geek Section (Accordion) */}
              <div className="mt-8 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => setIsGeekOpen(!isGeekOpen)}
                  className="w-full flex items-center justify-between py-2 text-xs font-semibold text-white/50 hover:text-white/80 transition-colors outline-none"
                >
                  <span>{t.geekTitle}</span>
                  {isGeekOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                <AnimatePresence>
                  {isGeekOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden flex flex-col gap-4 mt-2"
                    >
                      <p className="text-[10px] text-white/40 leading-relaxed font-normal">
                        {t.geekSubtitle}
                      </p>

                      {/* Google Sheets service account copy instruction */}
                      <div className="p-3 bg-black/30 border border-white/5 rounded-xl flex flex-col gap-2">
                        <p className="text-[9px] text-white/40 leading-relaxed uppercase font-black tracking-tight flex items-center gap-1.5">
                          <Info size={10} className="text-[#6d5dfc]" />
                          {t.shareInstruction}
                        </p>
                        <div className="flex items-center gap-2 bg-[#6d5dfc]/5 p-2 rounded-lg border border-[#6d5dfc]/10">
                          <code className="text-[9px] text-[#6d5dfc] break-all font-mono select-all flex-1">{t.serviceEmail}</code>
                          <button 
                            type="button"
                            onClick={copyToClipboard}
                            className="px-2 py-1 bg-[#6d5dfc]/10 hover:bg-[#6d5dfc]/20 rounded text-[9px] font-bold transition-all text-[#6d5dfc]"
                          >
                            {copied ? t.copied : t.copyBtn}
                          </button>
                        </div>
                      </div>

                      {/* Connect by link form */}
                      <form onSubmit={handleGeekSignIn} className="flex flex-col gap-3">
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1 mb-1 block">{t.sheetUrlLabel}</label>
                          <div className="relative flex items-center">
                            <LinkIcon size={14} className="absolute left-4 text-white/30" />
                            <input 
                              required 
                              type="text" 
                              placeholder={t.sheetUrlPlaceholder} 
                              value={sheetUrl} 
                              onChange={(e) => setSheetUrl(e.target.value)} 
                              className="w-full bg-white/5 border border-white/10 rounded-[14px] pl-10 pr-4 py-2.5 text-white placeholder:text-white/20 focus:border-[#6d5dfc]/50 transition-all outline-none text-xs"
                            />
                          </div>
                        </div>

                        <button 
                          disabled={isLoading || !sheetUrl.trim()}
                          className="w-full py-3 bg-[#6d5dfc]/10 border border-[#6d5dfc]/20 hover:bg-[#6d5dfc]/20 disabled:opacity-50 text-[#6d5dfc] font-bold rounded-[14px] flex items-center justify-center gap-2 transition-all text-xs outline-none"
                        >
                          {isLoading ? <RefreshCw className="animate-spin w-4 h-4" /> : <>{t.btnConnectLink} <ArrowRight size={14} /></>}
                        </button>
                      </form>

                      {/* Scan / Upload options */}
                      <div className="grid grid-cols-2 gap-3 mt-1">
                        <button
                          type="button"
                          onClick={() => { setIsQrModalOpen(true); setTimeout(startCamera, 300); }}
                          className="py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-white/80 font-bold rounded-[14px] flex items-center justify-center gap-2 transition-all text-xs outline-none"
                        >
                          <QrCode size={14} />
                          {t.btnScanQr}
                        </button>

                        <label className="py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-white/80 font-bold rounded-[14px] flex items-center justify-center gap-2 transition-all text-xs cursor-pointer select-none">
                          <Upload size={14} />
                          <span>{t.btnUploadQr}</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleQrFileUpload} 
                            className="hidden" 
                          />
                        </label>
                      </div>

                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </motion.div>
          ) : (
            // Premium Success screen
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

      {/* Footer section with Demo & FAQ link */}
      <footer className="w-full max-w-md flex flex-col gap-4 items-center z-10 mt-auto">
        <button 
          onClick={handleDemoSignIn}
          className="text-xs font-bold text-[#6d5dfc]/80 hover:text-[#6d5dfc] transition-colors flex items-center gap-1.5 py-2 underline underline-offset-4 outline-none"
        >
          {t.demoBtn}
        </button>
        <span className="text-[10px] text-white/15">© 2026 CoinLover. All rights reserved.</span>
      </footer>

      {/* QR Code Scanner Overlay Modal */}
      <AnimatePresence>
        {isQrModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#050505] z-50 flex flex-col justify-between items-center p-6"
          >
            {/* Header */}
            <div className="w-full flex justify-between items-center max-w-md">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#6d5dfc]" />
                <span className="text-sm font-bold tracking-tight text-white/90">{t.qrModalTitle}</span>
              </div>
              <button 
                onClick={() => { stopCamera(); setIsQrModalOpen(false); }}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Video preview container (Linear Style Scanner HUD) */}
            <div className="w-full max-w-sm aspect-square relative bg-black/40 border border-white/5 rounded-[28px] overflow-hidden flex items-center justify-center shadow-2xl">
              {qrScanning ? (
                <>
                  <video 
                    ref={videoRef} 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Scanner Overlay HUD */}
                  <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none flex items-center justify-center">
                    <div className="w-full h-full border border-white/20 relative rounded-xl">
                      {/* Lazer sweep line */}
                      <div className="absolute left-0 right-0 h-0.5 bg-green-500 shadow-[0_0_15px_#22c55e] top-0 animate-[scanner_2.5s_ease-in-out_infinite]" />
                      <style>{`
                        @keyframes scanner {
                          0% { top: 0%; }
                          50% { top: 100%; }
                          100% { top: 0%; }
                        }
                      `}</style>

                      {/* Glowing scanner corners */}
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#6d5dfc] -translate-x-0.5 -translate-y-0.5" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#6d5dfc] translate-x-0.5 -translate-y-0.5" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#6d5dfc] -translate-x-0.5 translate-y-0.5" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#6d5dfc] translate-x-0.5 translate-y-0.5" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 p-6 text-center">
                  {qrError ? (
                    <>
                      <AlertCircle className="w-10 h-10 text-red-500" />
                      <p className="text-xs text-white/50 leading-relaxed">{qrError}</p>
                    </>
                  ) : (
                    <>
                      <Camera className="w-10 h-10 text-[#6d5dfc] animate-pulse" />
                      <p className="text-xs text-white/50">{t.cameraAccessing}</p>
                    </>
                  )}
                </div>
              )}
              {/* Hidden canvas for jsQR rendering */}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Bottom guide text */}
            <div className="w-full max-w-sm text-center mb-8 flex flex-col gap-4">
              <p className="text-xs text-white/40 leading-relaxed px-6">
                {t.qrInstructions}
              </p>
              <button 
                onClick={() => { stopCamera(); setIsQrModalOpen(false); }}
                className="w-full py-4 bg-white/5 border border-white/5 hover:bg-white/10 text-white/80 font-bold rounded-[14px] transition-all text-sm outline-none"
              >
                {t.close}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

import * as React from "react";
import { Sun, Moon, Plus, Menu, RefreshCcw, List, Calendar, PieChart, Sparkles, TrendingDown, TrendingUp, Wallet, X, Smartphone, QrCode, Key, Fingerprint, ShieldCheck, ShieldAlert } from "lucide-react";
import { APP_SETTINGS } from "../../constants/settings";
import { HistoryModalState } from "../../types";
import { startRegistration } from "@simplewebauthn/browser";
import { googleSheetsService } from "../../services/googleSheets";
import { useLanguage } from "../../contexts/LanguageContext";

interface AppHeaderProps {
  isIncomeCollapsed: boolean;
  toggleIncome: () => void;
  isStoriesCollapsed: boolean;
  toggleStories: () => void;
  settingsLongPress: any;
  handleMenuClick: (e: React.MouseEvent) => void;
  isSettingsMenuOpen: boolean;
  setIsSettingsMenuOpen: (val: boolean) => void;
  pullSettings: () => void;
  setHistoryModal: (val: HistoryModalState) => void;
  setCalendarAnalyticsModal: (val: { isOpen: boolean }) => void;
  setAnalyticsModal: (val: { isOpen: boolean; type: "expense" | "income" }) => void;
  theme: "white" | "zen" | "mint" | "black" | "modern";
  setTheme: (t: "white" | "mint" | "black") => void;
  syncStatus: string;
  pillMode: "expense" | "income" | "balance";
  setPillMode: React.Dispatch<React.SetStateAction<"expense" | "income" | "balance">>;
  currentSymbol: string;
  displaySpent: number;
  displayEarned: number;
  displayBalance: number;
  categoriesCount: number;
  activeTableId: string | null;
}

// ... (props update)
export function AppHeader({
  isIncomeCollapsed, toggleIncome, isStoriesCollapsed, toggleStories, settingsLongPress, handleMenuClick, isSettingsMenuOpen,
  setIsSettingsMenuOpen, pullSettings, setHistoryModal, setCalendarAnalyticsModal, setAnalyticsModal,
  theme, setTheme, syncStatus, pillMode, setPillMode, currentSymbol, displaySpent, displayEarned, displayBalance,
  categoriesCount, activeTableId
}: AppHeaderProps) {
  const { t } = useLanguage();
  const isCompact = categoriesCount > 8;
  const [isDownloadModalOpen, setIsDownloadModalOpen] = React.useState(false);
  const [isPasskeyModalOpen, setIsPasskeyModalOpen] = React.useState(false);
  const [passkeyModalHidden, setPasskeyModalHidden] = React.useState(false); // hides modal visually without unmounting it
  const [passkeyStatus, setPasskeyStatus] = React.useState<"idle" | "loading" | "enabled" | "disabled">("idle");
  const [passkeyLoading, setPasskeyLoading] = React.useState(false);
  const [justRegistered, setJustRegistered] = React.useState(false);
  const [prefetchedRegisterOptions, setPrefetchedRegisterOptions] = React.useState<any>(null);
  const [passkeyPending, setPasskeyPending] = React.useState(false); // biometrics in progress

  React.useEffect(() => {
    if (isPasskeyModalOpen && activeTableId) {
      setJustRegistered(false);
      setPasskeyLoading(true);
      setPrefetchedRegisterOptions(null);
      setPasskeyModalHidden(false); // reset visibility

      // 5-second fallback timeout to prevent infinite spinner if network/GAS is slow or blocked
      const timeoutId = setTimeout(() => {
        setPasskeyLoading(false);
        setPasskeyStatus("disabled");
        console.warn("Passkey status check timed out, falling back to disabled");
      }, 5000);

      // 1. Fetch current settings status
      googleSheetsService.fetchSettings(activeTableId)
        .then(settings => {
          clearTimeout(timeoutId);
          if (settings && settings.passkeyEnabled) {
            setPasskeyStatus("enabled");
          } else {
            setPasskeyStatus("disabled");
          }
        })
        .catch(err => {
          clearTimeout(timeoutId);
          console.error("Error fetching passkey status:", err);
          setPasskeyStatus("disabled");
        })
        .finally(() => {
          setPasskeyLoading(false);
        });

      // 2. Prefetch registration options to preserve User Gesture on mobile browsers
      fetch(`/api/auth/register-options?ssId=${encodeURIComponent(activeTableId)}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error("Failed to prefetch registration options");
        })
        .then(data => {
          if (data.status === "success") {
            setPrefetchedRegisterOptions(data);
          }
        })
        .catch(err => console.warn("Prefetch registration options failed:", err));
    }
  }, [isPasskeyModalOpen, activeTableId]);

  const handleRegisterPasskey = async () => {
    if (!activeTableId) return;
    setPasskeyLoading(true);
    console.log("[Auth UI] Starting Passkey registration process");
    try {
      if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn (PublicKeyCredential) is NOT supported by this browser/device.");
      }
      console.log("[Auth UI] Secure Context:", window.isSecureContext);

      let data = prefetchedRegisterOptions;

      // Fallback if prefetch hasn't finished loading yet (unlikely but safe)
      if (!data) {
        console.log("[Auth UI] No prefetched options found, fetching dynamically...");
        const optionsRes = await fetch(`/api/auth/register-options?ssId=${encodeURIComponent(activeTableId)}`);
        if (!optionsRes.ok) {
          throw new Error(await optionsRes.text() || "Failed to fetch registration options");
        }
        data = await optionsRes.json();
        if (data.status !== "success") {
          throw new Error(data.message || "Failed to fetch options");
        }
      }

      console.log("[Auth UI] Registration Options received:", JSON.stringify(data.options));

      // CRITICAL FOR USER GESTURE AND MIUI COMPATIBILITY:
      // We DO NOT unmount the modal. We hide it visually (opacity-0 pointer-events-none) 
      // so Chrome doesn't think the element that initiated the gesture has disappeared.
      setPasskeyModalHidden(true);
      setPasskeyPending(true);

      console.log("[Auth UI] Invoking startRegistration now...");
      
      // Ensure we have a timeout set in options (native timeout fallback)
      if (data.options && data.options.publicKey) {
        data.options.publicKey.timeout = 60000;
      }

      let credential;
      try {
        // Direct execution preserves synchronous call stack for User Gesture!
        credential = await startRegistration(data.options);
        console.log("[Auth UI] startRegistration success:", JSON.stringify(credential));
      } catch (regErr: any) {
        console.error("[Auth UI] startRegistration inner error:", regErr);
        throw regErr;
      }

      console.log("[Auth UI] Verifying credentials on backend...");
      const verifyRes = await fetch("/api/auth/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ssId: activeTableId,
          registrationResponse: credential,
          challengeToken: data.challengeToken
        })
      });

      const verifyData = await verifyRes.json();
      if (verifyData.status === "success" && verifyData.verified) {
        setPasskeyStatus("enabled");
        setJustRegistered(true);
        pullSettings();
      } else {
        throw new Error(verifyData.message || "Verification failed");
      }
    } catch (err: any) {
      console.error("Passkey registration failed:", err);
      if (err.message === "TIMEOUT" || err.message === "TIMEOUT_60S" || err.name === "TimeoutError") {
        alert("Ошибка привязки биометрии: Превышено время ожидания (60 сек). Если вы настраиваете Face ID из встроенного браузера (например, Telegram), откройте CoinLover во внешнем браузере (Chrome).");
      } else {
        alert(`Ошибка привязки биометрии [${err.name || "Error"}]: ${err.message || String(err)}\n\n${err.stack || ""}`);
      }
    } finally {
      setPasskeyLoading(false);
      setPasskeyPending(false);
      setPasskeyModalHidden(false); // Restore visual display of the modal
    }
  };



  const PillButton = (
    <button onClick={() => setPillMode(p => p === "expense" ? "income" : p === "income" ? "balance" : "expense")} className={`mx-auto px-5 py-2 rounded-full bg-[var(--glass-item-bg)] border border-[var(--glass-border)] flex items-center gap-2 hover:bg-[var(--glass-item-active)] active:scale-95 transition-all shadow-sm ${isCompact ? '' : '-mt-0.5'}`}>
      {pillMode === "expense" ? (<><TrendingDown size={14} className="text-[#cda434]" /><span className="text-xs font-serif font-bold text-[#cda434]">-{currentSymbol} {displaySpent.toLocaleString()} {t('this month')}</span></>) : pillMode === "income" ? (<><TrendingUp size={14} className="text-[#10b981]" /><span className="text-xs font-serif font-bold text-[#10b981]">+{currentSymbol} {displayEarned.toLocaleString()} {t('this month')}</span></>) : (<><Wallet size={14} className="text-[var(--primary-color)]" /><span className="text-xs font-serif font-bold text-[var(--primary-color)]">{t('Total Balance')}: {currentSymbol} {displayBalance.toLocaleString()}</span></>)}
    </button>
  );

  return (
    <>
    {/* Passkey pending banner — shown while modal is closed and Chrome credential manager is active */}
    {passkeyPending && (
      <div className="fixed inset-x-0 bottom-0 z-[300] flex justify-center pb-8 pointer-events-none">
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#0d0d0d]/90 border border-white/10 backdrop-blur-xl shadow-2xl">
          <div className="w-5 h-5 rounded-full border-2 border-[#6d5dfc] border-t-transparent animate-spin" />
          <span className="text-sm text-white/80">{t('Confirm biometrics')}</span>
        </div>
      </div>
    )}
    <header className="px-6 flex flex-col gap-2 text-center shrink-0 safe-pt-header pb-2">
      <div className="flex justify-between items-center mb-2">
        <button onClick={toggleIncome} className="glass-icon-btn w-10 h-10 relative shrink-0">
          <Plus 
            size={APP_SETTINGS.UI.ICON_SIZE_LARGE} 
            strokeWidth={1.5}
            className={`text-[var(--primary-color)] transition-transform duration-300 ${!isIncomeCollapsed ? "rotate-45" : ""}`} 
          />
        </button>
        <div className="flex-1 flex justify-center items-center">
          {PillButton}
        </div>
        <button onClick={toggleStories} className="glass-icon-btn w-10 h-10 relative shrink-0">
          <Sparkles 
            size={APP_SETTINGS.UI.ICON_SIZE_LARGE} 
            strokeWidth={1.5}
            className={`text-[var(--primary-color)] transition-transform duration-700 ease-in-out ${!isStoriesCollapsed ? "rotate-180" : ""}`} 
          />
        </button>
      </div>

      {/* Floating Action Button (FAB) Menu in Right Bottom */}
      <div className="fixed right-6 bottom-[calc(env(safe-area-inset-bottom,0px)+24px)] z-[150] flex flex-col items-end">
        <button 
          {...settingsLongPress} 
          onClick={handleMenuClick} 
          className="w-14 h-14 rounded-full bg-[var(--glass-item-active)] border border-[var(--glass-border)] backdrop-blur-xl flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.35),0_0_20px_rgba(109,93,252,0.15)] hover:scale-105 active:scale-95 transition-all text-slate-500 relative group overflow-hidden"
        >
          {/* Ховер подсветка */}
          <div className="absolute -inset-1 bg-gradient-to-tr from-[#FFD700]/10 to-[#6d5dfc]/10 opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />
          
          {/* Инлайн-SVG favicon.svg монетки */}
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 32 32" 
            fill="none"
            className={`w-9 h-9 transition-transform duration-500 ease-out ${isSettingsMenuOpen ? "rotate-[360deg] scale-90" : ""}`}
          >
            <defs>
              <linearGradient id="rim_grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#FFD700"/>
                <stop offset="0.5" stopColor="#B8860B"/>
                <stop offset="1" stopColor="#8B6508"/>
              </linearGradient>
              <linearGradient id="face_grad" x1="32" y1="32" x2="0" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#F0B429"/>
                <stop offset="1" stopColor="#D49A17"/>
              </linearGradient>
              <filter id="depth" x="-10%" y="-10%" width="120%" height="120%">
                <feInnerShadow stdDeviation="1.5" />
              </filter>
            </defs>
            <circle cx="16" cy="16" r="15.5" fill="url(#rim_grad)" />
            <circle cx="16" cy="16" r="13.5" fill="#8B6508" opacity="0.4" />
            <circle cx="16" cy="16" r="12" fill="url(#face_grad)" />
            <path d="M16 21.5S11 19 11 15C11 12.8 12.5 11.5 14 11.5C15.2 11.5 16 12.5 16 14C16 12.5 16.8 11.5 18 11.5C19.5 11.5 21 12.8 21 15C21 19 16 21.5 16 21.5Z" fill="white" />
            <path d="M5 10C8 5 20 4 27 12" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
          </svg>
        </button>

        {isSettingsMenuOpen && (
          <>
            <div className="fixed inset-0 z-[140] bg-black/45 backdrop-blur-[2px]" onClick={() => setIsSettingsMenuOpen(false)} />
            <div className="absolute bottom-[72px] right-0 w-48 bg-[var(--bg-color)] border border-[var(--glass-border)] rounded-[24px] shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col z-[145] p-2.5 animate-in fade-in slide-in-from-bottom-5 zoom-in-95 origin-bottom-right backdrop-blur-xl">
              <div className="flex items-center justify-around p-2 border-b border-[var(--glass-border)]/50 mb-1.5">
                <button 
                  onClick={() => { setTheme("white"); setIsSettingsMenuOpen(false); }}
                  className={`p-2 rounded-xl transition-all ${theme === 'white' || theme === 'zen' ? 'bg-amber-100 text-amber-600 scale-110 shadow-sm' : 'text-slate-400 hover:bg-slate-100'}`}
                >
                  <Sun size={18} />
                </button>
                <button 
                  onClick={() => { setTheme("mint"); setIsSettingsMenuOpen(false); }}
                  className={`p-2 rounded-xl transition-all ${theme === 'mint' ? 'bg-emerald-500/20 text-emerald-600 scale-110 shadow-sm' : 'text-slate-400 hover:bg-emerald-50'}`}
                >
                  <Sparkles size={18} />
                </button>
                <button 
                  onClick={() => { setTheme("black"); setIsSettingsMenuOpen(false); }}
                  className={`p-2 rounded-xl transition-all ${theme === 'black' || theme === 'modern' ? 'bg-purple-500/20 text-purple-400 scale-110 shadow-sm' : 'text-slate-400 hover:bg-white/5'}`}
                >
                  <Moon size={18} />
                </button>
              </div>
              <button onClick={() => { setIsSettingsMenuOpen(false); pullSettings(); }} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--glass-item-bg)] transition-colors text-left"><RefreshCcw size={15} className={`text-amber-500 ${syncStatus === 'loading' ? 'animate-spin' : ''}`} /><span className="text-xs font-black text-[var(--text-main)] uppercase tracking-wider">{t('Update')}</span></button>
              <button onClick={() => { setIsSettingsMenuOpen(false); setHistoryModal({ isOpen: true, entity: { name: t('Feed'), icon: "list" }, type: "feed" }); }} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--glass-item-bg)] transition-colors text-left"><List size={15} className="text-[var(--primary-color)]" /><span className="text-xs font-black text-[var(--text-main)] uppercase tracking-wider">{t('Feed')}</span></button>
              <button onClick={() => { setIsSettingsMenuOpen(false); setCalendarAnalyticsModal({ isOpen: true }); }} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--glass-item-bg)] transition-colors text-left"><Calendar size={15} className="text-emerald-500" /><span className="text-xs font-black text-[var(--text-main)] uppercase tracking-wider">{t('Calendar')}</span></button>
              <button onClick={() => { setIsSettingsMenuOpen(false); setAnalyticsModal({ isOpen: true, type: "expense" }); }} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--glass-item-bg)] transition-colors text-left"><PieChart size={15} className="text-amber-500" /><span className="text-xs font-black text-[var(--text-main)] uppercase tracking-wider">{t('Analytics')}</span></button>
              {activeTableId && (
                <button onClick={() => { setIsSettingsMenuOpen(false); setIsPasskeyModalOpen(true); }} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--glass-item-bg)] transition-colors text-left"><Key size={15} className="text-indigo-400" /><span className="text-xs font-black text-[var(--text-main)] uppercase tracking-wider">{t('Security')}</span></button>
              )}
              <button onClick={() => { setIsSettingsMenuOpen(false); setIsDownloadModalOpen(true); }} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--glass-item-bg)] transition-colors text-left"><Smartphone size={15} className="text-[#6d5dfc]" /><span className="text-xs font-black text-[var(--text-main)] uppercase tracking-wider">{t('Application')}</span></button>
            </div>
          </>
        )}
      </div>

      {isDownloadModalOpen && (
        <div onClick={() => setIsDownloadModalOpen(false)} className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm glass-panel p-8 relative border-white/10 shadow-2xl rounded-[32px] bg-[var(--bg-color)]">
            <button onClick={() => setIsDownloadModalOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors outline-none"><X size={24} /></button>
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">{t('Install CoinLover')}</h3>
              <p className="text-xs text-[var(--text-main)] opacity-50">{t('Scan QR code to download')}</p>
            </div>
            <div className="bg-white p-3 rounded-2xl flex justify-center mb-6">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent("https://coinlover.ru/download/coinlover.apk")}`} 
                alt="Download QR"
                className="w-[180px] h-[180px] block"
              />
            </div>
            <div className="flex flex-col gap-3">
              <a 
                href="/download/coinlover.apk" 
                download
                className="w-full py-4 bg-[#6d5dfc] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#5b4ce3] transition-all text-xs uppercase tracking-widest"
              >
                <Smartphone size={16} />
                {t('Download APK')}
              </a>
            </div>
          </div>
        </div>
      )}

      {isPasskeyModalOpen && (
        <div 
          onClick={() => !passkeyPending && setIsPasskeyModalOpen(false)} 
          className={`fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-6 transition-all duration-300 ${
            passkeyModalHidden ? "opacity-0 pointer-events-none" : "opacity-100 animate-in fade-in"
          }`}
        >
          <div onClick={e => e.stopPropagation()} className="glass-panel w-full max-w-sm p-8 flex flex-col gap-6 shadow-2xl shadow-[var(--shadow-color)] animate-in zoom-in-95 duration-300 text-[var(--text-main)] text-left relative" style={{ backgroundColor: "var(--panel-bg)" }}>
            <button 
              onClick={() => !passkeyPending && setIsPasskeyModalOpen(false)} 
              disabled={passkeyPending}
              className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors outline-none disabled:opacity-0"
            >
              <X size={24} />
            </button>
            <div className="text-center mb-2">
              <h3 className="text-xl font-bold text-[var(--text-main)] mb-2 flex items-center justify-center gap-2">
                <Fingerprint size={24} className="text-[#6d5dfc]" />
                {t('Biometrics and Login')}
              </h3>
              <p className="text-xs text-[var(--text-main)] opacity-60 leading-relaxed mt-3">
                {t('Biometrics Desc')}
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-item-bg)] flex flex-col items-center justify-center text-center mb-2">
              {passkeyLoading ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <RefreshCcw size={32} className="text-[#6d5dfc] animate-spin" />
                  <span className="text-xs text-[var(--text-main)] opacity-55">{t('Loading Data')}</span>
                </div>
              ) : passkeyStatus === "enabled" ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <ShieldCheck size={28} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-main)]">{t('Biometrics Active')}</h4>
                    <p className="text-[10px] text-emerald-500 font-medium uppercase mt-0.5 tracking-wider">{t('Device Linked')}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <ShieldAlert size={28} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-main)]">{t('Biometrics Not Configured')}</h4>
                    <p className="text-[10px] text-amber-500 font-medium uppercase mt-0.5 tracking-wider">{t('Login via link only')}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                disabled={passkeyLoading || !activeTableId}
                onClick={justRegistered ? () => setIsPasskeyModalOpen(false) : handleRegisterPasskey}
                className={`w-full py-4 font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-xs uppercase tracking-widest disabled:opacity-40 disabled:scale-100 shadow-md cursor-pointer ${
                  justRegistered 
                    ? "bg-emerald-500 text-white shadow-emerald-500/15" 
                    : "bg-[#6d5dfc] text-white hover:bg-[#5b4ce3] shadow-[#6d5dfc]/15"
                }`}
              >
                {justRegistered ? (
                  <>
                    <ShieldCheck size={16} />
                    {t('Done')}
                  </>
                ) : (
                  <>
                    <Fingerprint size={16} />
                    {passkeyStatus === "enabled" ? t('Relink Device') : t('Setup Biometrics')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
    </>
  );
}

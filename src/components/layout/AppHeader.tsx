import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Plus, Menu, RefreshCcw, List, Calendar, PieChart, Sparkles, TrendingDown, TrendingUp, Wallet, X, Smartphone, QrCode, Key, Fingerprint, ShieldCheck, ShieldAlert, Settings, ChevronLeft, Mic, Search, Keyboard } from "lucide-react";
import { APP_SETTINGS } from "../../constants/settings";
import { HistoryModalState, Account, Transaction } from "../../types";
import { startRegistration } from "@simplewebauthn/browser";
import { googleSheetsService, getAbsoluteApiUrl, universalFetch } from "../../services/googleSheets";
import { useLanguage } from "../../contexts/LanguageContext";
import { AISheet } from "./AISheet";
import { ReconciliationModal } from "../ReconciliationModal";

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
  setIsAISheetOpen: (val: boolean, startInVoiceMode?: boolean) => void;
  isAISheetOpen: boolean;
  tariff?: string;
  onOpenPremiumModal: () => void;
  accounts?: Account[];
  transactions?: Transaction[];
  checkpoints?: Record<string, number>;
  checkpointDate?: string;
  reconcileBalances?: (updatedAccounts: Account[]) => Promise<boolean | void>;
}

export function AppHeader({
  isIncomeCollapsed, toggleIncome, isStoriesCollapsed, toggleStories, settingsLongPress, handleMenuClick, isSettingsMenuOpen,
  setIsSettingsMenuOpen, pullSettings, setHistoryModal, setCalendarAnalyticsModal, setAnalyticsModal,
  theme, setTheme, syncStatus, pillMode, setPillMode, currentSymbol, displaySpent, displayEarned, displayBalance,
  categoriesCount, activeTableId, setIsAISheetOpen, isAISheetOpen,
  tariff = "Free", onOpenPremiumModal,
  accounts = [], transactions = [], checkpoints, checkpointDate, reconcileBalances
}: AppHeaderProps) {
  const { t } = useLanguage();
  const isCompact = categoriesCount > 8;
  const [isDownloadModalOpen, setIsDownloadModalOpen] = React.useState(false);
  const [isPasskeyModalOpen, setIsPasskeyModalOpen] = React.useState(false);
  const [passkeyModalHidden, setPasskeyModalHidden] = React.useState(false); 
  const [passkeyStatus, setPasskeyStatus] = React.useState<"idle" | "loading" | "enabled" | "disabled">("idle");
  const [passkeyLoading, setPasskeyLoading] = React.useState(false);
  const [justRegistered, setJustRegistered] = React.useState(false);
  const [prefetchedRegisterOptions, setPrefetchedRegisterOptions] = React.useState<any>(null);
  const [passkeyPending, setPasskeyPending] = React.useState(false); 
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = React.useState(false);

  React.useEffect(() => {
    if (isPasskeyModalOpen && activeTableId) {
      setJustRegistered(false);
      setPasskeyLoading(true);
      setPrefetchedRegisterOptions(null);
      setPasskeyModalHidden(false); 

      const timeoutId = setTimeout(() => {
        setPasskeyLoading(false);
        setPasskeyStatus("disabled");
        console.warn("Passkey status check timed out, falling back to disabled");
      }, 5000);

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

      universalFetch(getAbsoluteApiUrl(`/api/auth/register-options?ssId=${encodeURIComponent(activeTableId)}`))
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
    try {
      if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn (PublicKeyCredential) is NOT supported by this browser/device.");
      }

      let data = prefetchedRegisterOptions;
      if (!data) {
        const optionsRes = await universalFetch(getAbsoluteApiUrl(`/api/auth/register-options?ssId=${encodeURIComponent(activeTableId)}`));
        if (!optionsRes.ok) {
          throw new Error(await optionsRes.text() || "Failed to fetch registration options");
        }
        data = await optionsRes.json();
        if (data.status !== "success") {
          throw new Error(data.message || "Failed to fetch options");
        }
      }

      setPasskeyModalHidden(true);
      setPasskeyPending(true);

      if (data.options && data.options.publicKey) {
        data.options.publicKey.timeout = 60000;
      }

      let credential;
      try {
        credential = await startRegistration(data.options);
      } catch (regErr: any) {
        throw regErr;
      }

      const verifyRes = await universalFetch(getAbsoluteApiUrl("/api/auth/register-verify"), {
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
        alert("Ошибка привязки биометрии: Превышено время ожидания (60 сек).");
      } else {
        alert(`Ошибка привязки биометрии [${err.name || "Error"}]: ${err.message || String(err)}`);
      }
    } finally {
      setPasskeyLoading(false);
      setPasskeyPending(false);
      setPasskeyModalHidden(false); 
    }
  };

  const PillButton = (
    <button onClick={() => setPillMode(p => p === "expense" ? "income" : p === "income" ? "balance" : "expense")} className={`mx-auto px-5 py-2 rounded-full bg-[var(--glass-item-bg)] border border-[var(--glass-border)] flex items-center gap-2 hover:bg-[var(--glass-item-active)] active:scale-95 transition-all shadow-sm ${isCompact ? '' : '-mt-0.5'}`}>
      {pillMode === "expense" ? (<><TrendingDown size={14} className="text-[#cda434]" /><span className="text-xs font-serif font-bold text-[#cda434]">-{currentSymbol} {displaySpent.toLocaleString()} {t('this month')}</span></>) : pillMode === "income" ? (<><TrendingUp size={14} className="text-[#10b981]" /><span className="text-xs font-serif font-bold text-[#10b981]">+{currentSymbol} {displayEarned.toLocaleString()} {t('this month')}</span></>) : (<><Wallet size={14} className="text-[var(--primary-color)]" /><span className="text-xs font-serif font-bold text-[var(--primary-color)]">{t('Total Balance')}: {currentSymbol} {displayBalance.toLocaleString()}</span></>)}
    </button>
  );

  return (
    <>
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
        <button onClick={toggleIncome} className="glass-icon-btn w-10 h-10 relative shrink-0 transition-opacity duration-300">
          <Plus 
            size={APP_SETTINGS.UI.ICON_SIZE_LARGE} 
            strokeWidth={1.5}
            className={`text-[var(--primary-color)] transition-transform duration-300 ${!isIncomeCollapsed ? "rotate-45" : ""}`} 
          />
        </button>
        <div className="flex-1 flex justify-center items-center">
          {PillButton}
        </div>
        <button onClick={toggleStories} className="glass-icon-btn w-10 h-10 relative shrink-0 transition-opacity duration-300">
          <Sparkles 
            size={APP_SETTINGS.UI.ICON_SIZE_LARGE} 
            strokeWidth={1.5}
            className={`text-[var(--primary-color)] transition-transform duration-700 ease-in-out ${!isStoriesCollapsed ? "rotate-180" : ""}`} 
          />
        </button>
      </div>

      {/* Floating Action Button (FAB) Menu - Hidden when AI is open */}
      {!isAISheetOpen && (
        <div className="fixed right-6 bottom-[calc(env(safe-area-inset-bottom,0px)+24px)] z-[150] flex flex-col items-end">
          <button 
            {...settingsLongPress} 
            onClick={handleMenuClick} 
            style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
            className="w-14 h-14 rounded-full bg-transparent border-none flex items-center justify-center hover:scale-105 active:scale-95 transition-all relative group select-none touch-none cursor-pointer outline-none"
          >
            <div className="absolute inset-0 rounded-full bg-[#FFD700]/15 opacity-0 group-hover:opacity-100 transition-opacity blur-md" />
            
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 32 32" 
              fill="none"
              className={`w-14 h-14 transition-transform duration-500 ease-out filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.25)] ${isSettingsMenuOpen ? "rotate-[360deg] scale-90" : ""}`}
            >
              <defs>
                <linearGradient id="coin_grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#F7C948"/>
                  <stop offset="50%" stopColor="#E59E0B"/>
                  <stop offset="100%" stopColor="#D97706"/>
                </linearGradient>
              </defs>
              <circle cx="16" cy="16" r="15" fill="url(#coin_grad)" />
              {/* Enlarged clean white heart */}
              <path d="M16 23.5S9.5 20.2 9.5 15C9.5 12.2 11.5 10.5 13.5 10.5C15 10.5 16 11.8 16 11.8C16 11.8 17 10.5 18.5 10.5C20.5 10.5 22.5 12.2 22.5 15C22.5 20.2 16 23.5 16 23.5Z" fill="white" />
            </svg>
          </button>

          {isSettingsMenuOpen && (
            <>
              <div className="fixed inset-0 z-[140] bg-black/55 backdrop-blur-[4px]" onClick={() => setIsSettingsMenuOpen(false)} />
              <div className="absolute bottom-[72px] right-0 w-[300px] bg-[var(--bg-color)] border border-[var(--glass-border)] rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_30px_rgba(109,93,252,0.12)] flex flex-col z-[145] overflow-hidden animate-in fade-in slide-in-from-bottom-5 zoom-in-95 origin-bottom-right backdrop-blur-2xl p-3">
                {/* Header: Title + Theme Switcher */}
                <div className="flex items-center justify-between gap-2 px-1 pb-2.5 mb-2.5 border-b border-[var(--glass-border)]/40">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#6d5dfc] animate-pulse" />
                    <span className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-[0.18em] opacity-60">
                      {t('Menu')}
                    </span>
                  </div>

                  {/* Theme Switcher Segment */}
                  <div className="flex items-center gap-1.5 p-1 bg-[var(--glass-item-bg)]/80 rounded-xl border border-[var(--glass-border)]/40">
                    <button 
                      onClick={() => setTheme("white")} 
                      title="Light"
                      className={`p-1.5 rounded-lg transition-all ${theme === 'white' || theme === 'zen' ? 'bg-amber-100 text-amber-600 scale-105 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      <Sun size={14} />
                    </button>
                    <button 
                      onClick={() => setTheme("mint")} 
                      title="Mint"
                      className={`p-1.5 rounded-lg transition-all ${theme === 'mint' ? 'bg-emerald-500/20 text-emerald-400 scale-105 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      <Sparkles size={14} />
                    </button>
                    <button 
                      onClick={() => setTheme("black")} 
                      title="Dark"
                      className={`p-1.5 rounded-lg transition-all ${theme === 'black' || theme === 'modern' ? 'bg-[#6d5dfc]/25 text-[#9d8ffc] border border-[#6d5dfc]/40 scale-105 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      <Moon size={14} />
                    </button>
                  </div>
                </div>

                {/* Bento Grid 3 Columns */}
                <div className="grid grid-cols-3 gap-1 mb-2.5">
                  {/* Feed */}
                  <button 
                    onClick={() => { 
                      setIsSettingsMenuOpen(false); 
                      setHistoryModal({ isOpen: true, entity: { name: t('Feed'), icon: "list" }, type: "feed" }); 
                    }} 
                    className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-[var(--glass-item-active)] active:scale-95 transition-all group text-center"
                  >
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[#6d5dfc]/10 text-[#6d5dfc] group-hover:scale-110 transition-transform mb-1">
                      <List size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-[var(--text-main)] tracking-tight line-clamp-1 leading-none">{t('Feed')}</span>
                  </button>

                  {/* Calendar */}
                  <button 
                    onClick={() => { 
                      setIsSettingsMenuOpen(false); 
                      setCalendarAnalyticsModal({ isOpen: true }); 
                    }} 
                    className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-[var(--glass-item-active)] active:scale-95 transition-all group text-center"
                  >
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform mb-1">
                      <Calendar size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-[var(--text-main)] tracking-tight line-clamp-1 leading-none">{t('Calendar')}</span>
                  </button>

                  {/* Analytics */}
                  <button 
                    onClick={() => { 
                      setIsSettingsMenuOpen(false); 
                      setAnalyticsModal({ isOpen: true, type: "expense" }); 
                    }} 
                    className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-[var(--glass-item-active)] active:scale-95 transition-all group text-center"
                  >
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform mb-1">
                      <PieChart size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-[var(--text-main)] tracking-tight line-clamp-1 leading-none">{t('Analytics')}</span>
                  </button>

                  {/* Reconcile Balances */}
                  <button 
                    onClick={() => { 
                      setIsSettingsMenuOpen(false); 
                      pullSettings();
                      setIsReconciliationModalOpen(true); 
                    }} 
                    className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-[var(--glass-item-active)] active:scale-95 transition-all group text-center"
                  >
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-orange-500/10 text-orange-500 group-hover:scale-110 transition-transform mb-1">
                      <RefreshCcw size={19} className={syncStatus === 'loading' ? 'animate-spin' : ''} />
                    </div>
                    <span className="text-[10px] font-bold text-[var(--text-main)] tracking-tight line-clamp-1 leading-none">{t('Reconcile Balances')}</span>
                  </button>

                  {/* Passkey Security */}
                  <button 
                    onClick={() => { 
                      setIsSettingsMenuOpen(false); 
                      if (activeTableId) {
                        setIsPasskeyModalOpen(true); 
                      }
                    }} 
                    disabled={!activeTableId}
                    className={`flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-[var(--glass-item-active)] active:scale-95 transition-all group text-center ${!activeTableId ? 'opacity-40 pointer-events-none' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition-transform mb-1">
                      <Key size={19} />
                    </div>
                    <span className="text-[10px] font-bold text-[var(--text-main)] tracking-tight line-clamp-1 leading-none">{t('Security')}</span>
                  </button>

                  {/* Application / APK */}
                  <button 
                    onClick={() => { 
                      setIsSettingsMenuOpen(false); 
                      setIsDownloadModalOpen(true); 
                    }} 
                    className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-[var(--glass-item-active)] active:scale-95 transition-all group text-center"
                  >
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-cyan-500/10 text-cyan-600 group-hover:scale-110 transition-transform mb-1">
                      <Smartphone size={19} />
                    </div>
                    <span className="text-[10px] font-bold text-[var(--text-main)] tracking-tight line-clamp-1 leading-none">{t('Application')}</span>
                  </button>
                </div>

                {/* Ask AI Dock */}
                <div className="pt-2 border-t border-[var(--glass-border)]/30">
                  <div className="flex items-center justify-between px-1 mb-1.5">
                    <span className="text-[9px] font-black text-[var(--text-main)] opacity-40 uppercase tracking-[0.18em]">{t('Ask AI')}</span>
                    {tariff === "Premium" && (
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-[#6d5dfc]/20 text-[#9d8ffc] border border-[#6d5dfc]/30">PRO</span>
                    )}
                  </div>

                  <div className="flex gap-1.5 p-1 bg-[var(--glass-item-bg)] border border-[var(--glass-border)]/40 rounded-[18px]">
                    <button 
                      onClick={() => { 
                        setIsSettingsMenuOpen(false); 
                        if (tariff !== "Premium") {
                          onOpenPremiumModal();
                        } else {
                          setIsAISheetOpen(true, false); 
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-[14px] hover:bg-[var(--glass-item-active)] active:scale-95 transition-all group"
                    >
                      <Keyboard size={14} className="text-[var(--text-main)] opacity-40 group-hover:text-[#6d5dfc] group-hover:opacity-100 transition-all" />
                      <span className="text-[10px] text-[var(--text-main)] opacity-60 font-bold uppercase tracking-wider">{t('Type')}</span>
                    </button>
                    <button 
                      onClick={() => { 
                        setIsSettingsMenuOpen(false); 
                        if (tariff !== "Premium") {
                          onOpenPremiumModal();
                        } else {
                          setIsAISheetOpen(true, true); 
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-[14px] bg-[#6d5dfc]/10 hover:bg-[#6d5dfc]/20 active:scale-95 transition-all group border border-[#6d5dfc]/20"
                    >
                      <Mic size={14} className="text-[#6d5dfc] group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] text-[#6d5dfc] font-black uppercase tracking-wider">{t('Voice')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

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

    <ReconciliationModal
      isOpen={isReconciliationModalOpen}
      onClose={() => setIsReconciliationModalOpen(false)}
      accounts={accounts}
      transactions={transactions}
      checkpoints={checkpoints}
      checkpointDate={checkpointDate}
      onApply={async (updated) => {
        if (reconcileBalances) {
          await reconcileBalances(updated);
        }
      }}
      onRefresh={async () => {
        await pullSettings();
      }}
      isLoading={syncStatus === "loading"}
    />
    </>
  );
}

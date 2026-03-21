// CoinLover - Modern Personal Finance App
import * as React from "react";
import { DndContext, DragOverlay, rectIntersection, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Wallet, Heart, Menu } from "lucide-react";

// Modules
import { APP_SETTINGS } from "./constants/settings";
import { IconMap } from "./constants";
import { useFinance } from "./hooks/useFinance";
import { useAppDnD } from "./hooks/useAppDnD";
import { useUsers } from "./hooks/useUsers";
import { useLongPress } from "./hooks/useLongPress";
import { ModalManager } from "./components/ModalManager";
import { LandingPage } from "./components/LandingPage";
import { OnboardingModal } from "./components/OnboardingModal";
import { useCurrencyCalculations } from "./hooks/useCurrencyCalculations";

// Layout Components
import { AppHeader } from "./components/layout/AppHeader";
import { IncomeSection } from "./components/layout/IncomeSection";
import { AccountsSection } from "./components/layout/AccountsSection";
import { ExpenseSection } from "./components/layout/ExpenseSection";

import { googleSheetsService } from "./services/googleSheets";
import { setGAUser, trackScreen, trackEvent } from "./services/analytics";

export default function App() {
  const [currentPath] = React.useState(window.location.pathname);
  const { activeTableId, switchTable } = useUsers();

  const {
    accounts, setAccounts, categories, setCategories, incomes, setIncomes,
    transactions, setTransactions, syncStatus, users, addTransaction, updateTransaction, deleteTransaction, saveAccount, deleteAccount,
    saveCategory, deleteCategory, saveIncome, deleteIncome, syncCategories, syncIncomes, syncAccountsOrder,
    pullSettings, checkConflicts, conflictData, setConflictData, updateLocalFromRemote, pushSettings
  } = useFinance(activeTableId);

  const [isSplashVisible, setIsSplashVisible] = React.useState(true);
  const [isOnboarding, setIsOnboarding] = React.useState(false);

  React.useEffect(() => {
    if (syncStatus === "success" && accounts.length === 0) {
      localStorage.removeItem("cl_onboarding_completed");
      setIsOnboarding(true);
    } else if (syncStatus === "success") {
      localStorage.setItem("cl_onboarding_completed", "true");
      setIsOnboarding(false);
    }
  }, [syncStatus, accounts.length]);

  const handleOnboardingComplete = async (currency: string, localCurrency: string, useTemplate: boolean) => {
    localStorage.setItem("cl_onboarding_completed", "true");
    setIsOnboarding(false);
    let newAccounts = [];
    if (useTemplate) {
      const tmpl = await googleSheetsService.fetchTemplate();
      newAccounts = tmpl?.accounts || [];
      setAccounts(newAccounts);
      setCategories(tmpl?.categories || []);
      setIncomes(tmpl?.incomes || []);
    } else {
      newAccounts = [{ id: `acc-${Date.now()}`, name: "Наличные", balance: 0, currency: localCurrency, color: "#10b981", icon: "wallet" }];
      setAccounts(newAccounts);
    }
    await pushSettings(newAccounts);
  };

  const [mode, setMode] = React.useState<"expense" | "income">("expense");
  const [pillMode, setPillMode] = React.useState<"expense" | "income" | "balance">(() => (localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.PILL_MODE) as any) || "expense");
  const [isIncomeCollapsed, setIsIncomeCollapsed] = React.useState(true);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<any>(() => localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.THEME) || "dark");
  const [editingTxId, setEditingTxId] = React.useState<string | null>(null);
  const [categoryCurrencyMode, setCategoryCurrencyMode] = React.useState<"base" | "local">(() => (localStorage.getItem("cl_category_currency_mode") as any) || "base");

  // Modals
  const [accountModal, setAccountModal] = React.useState<any>({ isOpen: false, account: null });
  const [incomeModal, setIncomeModal] = React.useState<any>({ isOpen: false, income: null });
  const [categoryModal, setCategoryModal] = React.useState<any>({ isOpen: false, category: null });
  const [historyModal, setHistoryModal] = React.useState<any>({ isOpen: false, entity: null, type: null });
  const [analyticsModal, setAnalyticsModal] = React.useState<any>({ isOpen: false, type: "expense" });
  const [calendarAnalyticsModal, setCalendarAnalyticsModal] = React.useState({ isOpen: false });
  const [confirmDelete, setConfirmDelete] = React.useState<any>({ isOpen: false, title: "", message: "", onConfirm: () => { } });
  const [isTagModalOpen, setIsTagModalOpen] = React.useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = React.useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = React.useState(false);
  const [numpad, setNumpad] = React.useState<any>({ isOpen: false, type: "expense", source: null, destination: null, sourceAmount: "0", sourceCurrency: "USD", targetAmount: "0", targetCurrency: "USD", targetLinked: true, activeField: "source", tag: null, comment: "" });

  const [modalStack, setModalStack] = React.useState<string[]>([]);
  const stackRef = React.useRef<string[]>([]);

  const closeSpecificModal = (modalId: string) => {
    switch (modalId) {
      case "account": setAccountModal((p: any) => ({ ...p, isOpen: false })); break;
      case "income": setIncomeModal((p: any) => ({ ...p, isOpen: false })); break;
      case "category": setCategoryModal((p: any) => ({ ...p, isOpen: false })); break;
      case "history": setHistoryModal({ isOpen: false, entity: null, type: null }); break;
      case "analytics": setAnalyticsModal((p: any) => ({ ...p, isOpen: false })); break;
      case "calendar": setCalendarAnalyticsModal({ isOpen: false }); break;
      case "confirm": setConfirmDelete((p: any) => ({ ...p, isOpen: false })); break;
      case "tag": setIsTagModalOpen(false); break;
      case "users": setIsUsersModalOpen(false); break;
      case "theme": setIsThemeModalOpen(false); break;
      case "numpad": setNumpad((p: any) => ({ ...p, isOpen: false })); break;
      case "settings": setIsSettingsMenuOpen(false); break;
      case "conflict": setConflictData(null); break;
    }
  };

  // 1. ПЕРВИЧНЫЙ ЭФФЕКТ: Синхронизация modalStack с состоянием компонентов
  React.useEffect(() => {
    const openModals = [
      { id: "account", open: accountModal.isOpen },
      { id: "income", open: incomeModal.isOpen },
      { id: "category", open: categoryModal.isOpen },
      { id: "history", open: historyModal.isOpen },
      { id: "analytics", open: analyticsModal.isOpen },
      { id: "calendar", open: calendarAnalyticsModal.isOpen },
      { id: "confirm", open: confirmDelete.isOpen },
      { id: "tag", open: isTagModalOpen },
      { id: "users", open: isUsersModalOpen },
      { id: "theme", open: isThemeModalOpen },
      { id: "numpad", open: numpad.isOpen },
      { id: "settings", open: isSettingsMenuOpen },
      { id: "conflict", open: !!conflictData }
    ];

    const currentlyOpenIds = openModals.filter(m => m.open).map(m => m.id);
    
    setModalStack(prev => {
      const newlyOpened = currentlyOpenIds.filter(id => !prev.includes(id));
      if (newlyOpened.length > 0) return [...prev, ...newlyOpened];
      
      const closed = prev.filter(id => !currentlyOpenIds.includes(id));
      if (closed.length > 0) return prev.filter(id => currentlyOpenIds.includes(id));
      
      return prev;
    });
  }, [
    accountModal.isOpen, incomeModal.isOpen, categoryModal.isOpen, historyModal.isOpen,
    analyticsModal.isOpen, calendarAnalyticsModal.isOpen, confirmDelete.isOpen,
    isTagModalOpen, isUsersModalOpen, isThemeModalOpen, numpad.isOpen, isSettingsMenuOpen, conflictData
  ]);

  // 2. ВТОРИЧНЫЙ ЭФФЕКТ: Синхронизация modalStack с Историей Браузера
  React.useEffect(() => {
    stackRef.current = modalStack;
    const currentDepth = modalStack.length;
    const historyDepth = window.history.state?.modalDepth || 0;

    if (currentDepth > historyDepth) {
      // Окно открылось через UI - пушим в историю
      window.history.pushState({ modalDepth: currentDepth }, "");
    } else if (currentDepth < historyDepth) {
      // Окно закрылось через UI - откатываем историю
      window.history.back();
    }
  }, [modalStack]);

  // 3. ТРЕТИЧНЫЙ ЭФФЕКТ: Обработка системных событий (Назад, Esc)
  React.useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const targetDepth = e.state?.modalDepth || 0;
      const stack = stackRef.current;

      if (stack.length > targetDepth) {
        // Мы нажали кнопку "Назад", глубина в истории уменьшилась
        const lastModalId = stack[stack.length - 1];
        closeSpecificModal(lastModalId);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stackRef.current.length > 0) {
        window.history.back();
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const currentMonthTransactions = React.useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return transactions.filter(t => {
      if (!t.date) return false;
      const d = new Date(String(t.date).trim());
      return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [transactions]);

  const calculations = useCurrencyCalculations(accounts, currentMonthTransactions, categories, incomes, categoryCurrencyMode);

  const settingsLongPress = useLongPress(() => { setIsSettingsMenuOpen(false); setIsUsersModalOpen(true); if (navigator.vibrate) navigator.vibrate(APP_SETTINGS.HAPTIC_FEEDBACK_DURATION_MEDIUM); }, 3000);
  const handleMenuClick = () => setIsSettingsMenuOpen(!isSettingsMenuOpen);

  const { activeDragId, activeDragType, isSortingMode, setIsSortingMode, overId, handleDragStart, handleDragMove, handleDragOver, handleDragEnd } = useAppDnD({
    accounts, setAccounts, categories, setCategories, incomes, setIncomes, syncAccountsOrder, syncCategories, syncIncomes, setNumpad
  });

  const handleSwitchTable = (id: string) => {
    // 1. Очищаем локальные состояния
    setAccounts([]); setCategories([]); setIncomes([]); setTransactions([]);
    
    // 2. Очищаем localStorage
    localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.ACCOUNTS); 
    localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.INCOMES); 
    localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(APP_SETTINGS.STORAGE_KEYS.LAST_SYNC);
    
    // 3. Переключаем ID и отключаем демо
    switchTable(id); 
    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE, "false");
    
    trackEvent("User", "SwitchTable", id); 
    setIsUsersModalOpen(false);
    
    // 4. Переходим на чистый URL (удаляем ssId, если он там был)
    const cleanUrl = window.location.origin + window.location.pathname;
    window.location.href = cleanUrl;
  };

  React.useEffect(() => {
    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.PILL_MODE, pillMode);
    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.THEME, theme);
    localStorage.setItem("cl_category_currency_mode", categoryCurrencyMode);
    document.documentElement.classList.remove("light", "midnight", "modern");
    if (theme !== "dark") document.documentElement.classList.add(theme);
  }, [pillMode, theme, categoryCurrencyMode]);

  React.useEffect(() => {
    if (activeTableId) setGAUser(activeTableId);
    setTimeout(() => setIsSplashVisible(false), APP_SETTINGS.SPLASH_SCREEN_DURATION);
    setTimeout(() => checkConflicts(), APP_SETTINGS.CONFLICT_CHECK_DELAY);
  }, [activeTableId, checkConflicts]);

  const toggleIncome = () => { const next = !isIncomeCollapsed; setIsIncomeCollapsed(next); setMode(next ? "expense" : "income"); };
  const isFullModalOpen = accountModal.isOpen || incomeModal.isOpen || categoryModal.isOpen || historyModal.isOpen || analyticsModal.isOpen || calendarAnalyticsModal.isOpen || numpad.isOpen || confirmDelete.isOpen || isTagModalOpen || !!conflictData;
  const anyModalOpen = isFullModalOpen || isSettingsMenuOpen;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: APP_SETTINGS.DND_ACTIVATION_DISTANCE } }));
  if (currentPath === "/landing") return <LandingPage />;

  return (
    <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className={`min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden bg-[var(--bg-color)] text-[var(--text-main)] font-sans select-none transition-colors duration-300 ${theme}`}>
        <style>{`body { overflow: hidden; overscroll-behavior: none; background: var(--bg-color); } * { -webkit-tap-highlight-color: transparent; }`}</style>
        
        {isSplashVisible && (
          <div className="fixed inset-0 z-[1000] bg-[var(--bg-color)] flex items-center justify-center animate-in fade-in duration-500">
            <div className="relative animate-pulse flex flex-col items-center gap-6">
              <div className="relative w-32 h-32 rounded-[48px] bg-gradient-to-br from-amber-300 via-amber-500 to-amber-600 flex items-center justify-center border-4 border-amber-200/20 shadow-2xl">
                <Heart size={APP_SETTINGS.UI.ICON_SIZE_SPLASH} fill="white" className="text-white drop-shadow-lg" />
              </div>
              <span className="text-amber-500 font-black tracking-[0.4em] uppercase text-sm">CoinLover</span>
            </div>
          </div>
        )}

        <div className="absolute top-4 right-4 z-50"><div className={`w-2 h-2 rounded-full ${syncStatus === "loading" ? "bg-amber-400 animate-pulse" : syncStatus === "success" ? "bg-emerald-500/50" : syncStatus === "error" ? "bg-rose-500" : "bg-white/10"}`} /></div>

        <div className={`flex-1 flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 transition-all duration-500 ease-out ${isFullModalOpen ? "scale-[0.96] blur-[3px] opacity-60 pointer-events-none" : "scale-100 blur-0 opacity-100"}`}>
          <AppHeader 
            isIncomeCollapsed={isIncomeCollapsed} toggleIncome={toggleIncome} isDemo={localStorage.getItem(APP_SETTINGS.STORAGE_KEYS.DEMO_MODE) !== "false"}
            settingsLongPress={settingsLongPress} handleMenuClick={handleMenuClick} isSettingsMenuOpen={isSettingsMenuOpen} setIsSettingsMenuOpen={setIsSettingsMenuOpen}
            pullSettings={pullSettings} setHistoryModal={setHistoryModal} setCalendarAnalyticsModal={setCalendarAnalyticsModal} setAnalyticsModal={setAnalyticsModal}
            setIsThemeModalOpen={setIsThemeModalOpen} syncStatus={syncStatus} pillMode={pillMode} setPillMode={setPillMode}
            currentSymbol={calculations.currentSymbol} displaySpent={calculations.displaySpent} displayEarned={calculations.displayEarned} displayBalance={calculations.displayBalance}
          />

          <IncomeSection 
            isIncomeCollapsed={isIncomeCollapsed} toggleIncome={toggleIncome} incomes={incomes} currentMonthTransactions={currentMonthTransactions}
            categoryCurrencyMode={categoryCurrencyMode} baseCurrency={calculations.baseCurrency} localCurrencyCode={calculations.localCurrencyCode}
            activeDragId={activeDragId} isSortingMode={isSortingMode} setIsSortingMode={setIsSortingMode}
            setAnalyticsModal={setAnalyticsModal} setIncomeModal={setIncomeModal} setHistoryModal={setHistoryModal}
          />

          <AccountsSection 
            accounts={accounts} activeDragId={activeDragId} activeDragType={activeDragType} overId={overId}
            isSortingMode={isSortingMode} setIsSortingMode={setIsSortingMode} setAccountModal={setAccountModal} setHistoryModal={setHistoryModal}
          />

          <ExpenseSection 
            mode={mode} categories={categories} currentMonthTransactions={currentMonthTransactions} categoryCurrencyMode={categoryCurrencyMode}
            setCategoryCurrencyMode={setCategoryCurrencyMode} baseCurrency={calculations.baseCurrency} baseSymbol={calculations.baseSymbol}
            localCurrencyCode={calculations.localCurrencyCode} localSymbol={calculations.localSymbol} activeDragId={activeDragId}
            activeDragType={activeDragType} overId={overId} isSortingMode={isSortingMode} setIsSortingMode={setIsSortingMode}
            setAnalyticsModal={setAnalyticsModal} setCategoryModal={setCategoryModal} setHistoryModal={setHistoryModal} 
            setCalendarAnalyticsModal={setCalendarAnalyticsModal} theme={theme}
          />
        </div>

        <ModalManager
          accountModal={accountModal} incomeModal={incomeModal} categoryModal={categoryModal} historyModal={historyModal}
          analyticsModal={analyticsModal} calendarAnalyticsModal={calendarAnalyticsModal} confirmDelete={confirmDelete}
          numpad={numpad} isTagModalOpen={isTagModalOpen} isUsersModalOpen={isUsersModalOpen} conflictData={conflictData} editingTxId={editingTxId}
          isThemeModalOpen={isThemeModalOpen} theme={theme} categoryCurrencyMode={categoryCurrencyMode} localCurrencyCode={calculations.localCurrencyCode}
          accounts={accounts} categories={categories} incomes={incomes} transactions={transactions} allExistingTags={[]}
          users={users} activeTableId={activeTableId} setAccountModal={setAccountModal} setIncomeModal={setIncomeModal} setCategoryModal={setCategoryModal}
          setHistoryModal={setHistoryModal} setAnalyticsModal={setAnalyticsModal} setCalendarAnalyticsModal={setCalendarAnalyticsModal}
          setConfirmDelete={setConfirmDelete} setNumpad={setNumpad} setIsTagModalOpen={setIsTagModalOpen} setIsUsersModalOpen={setIsUsersModalOpen}
          setEditingTxId={setEditingTxId} setConflictData={setConflictData} setIsThemeModalOpen={setIsThemeModalOpen} setTheme={setTheme}
          addTransaction={addTransaction} updateTransaction={updateTransaction} deleteTransaction={deleteTransaction}
          saveAccount={saveAccount} deleteAccount={deleteAccount} saveCategory={saveCategory} deleteCategory={deleteCategory}
          saveIncome={saveIncome} deleteIncome={deleteIncome} updateLocalFromRemote={updateLocalFromRemote} onSwitchTable={handleSwitchTable}
        />
        <OnboardingModal isOpen={isOnboarding} onComplete={handleOnboardingComplete} />
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDragId && activeDragType && (
          <div className={`draggable-coin grabbed-elevation pointer-events-none ${activeDragType === 'category' ? 'coin-category' : 'coin-wallet'}`}>
            {React.createElement(IconMap[(activeDragType === 'account' ? accounts.find(a => a.id === activeDragId) : activeDragType === 'category' ? categories.find(c => c.id === activeDragId) : incomes.find(i => i.id === activeDragId))?.icon || 'wallet'] || Wallet, { size: APP_SETTINGS.UI.ICON_SIZE_OVERLAY })}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

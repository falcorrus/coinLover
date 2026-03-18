import React, { useState } from "react";
import { X, CheckCircle2, RefreshCcw, Database, User } from "lucide-react";
import { googleSheetsService } from "../services/googleSheets";

interface UsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: { name: string; id: string }[];
  activeTableId: string;
  onSwitchTable: (id: string) => void;
}

export const UsersModal: React.FC<UsersModalProps> = ({
  isOpen, onClose, users, activeTableId, onSwitchTable
}) => {
  const [isInitializing, setIsInitializing] = useState<string | null>(null);

  const handleInit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;
    setIsInitializing(id);
    try {
      const ok = await googleSheetsService.initTable(id);
      if (ok) alert("Структура таблицы создана!");
      else alert("Ошибка. Проверьте доступ для сервисного аккаунта.");
    } catch (e) {
      alert("Ошибка соединения.");
    } finally {
      setIsInitializing(null);
    }
  };

  if (!isOpen) return null;

  // Combine master with other users
  const allUsers = [{ name: "Мой аккаунт", id: "" }, ...users];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300] animate-in fade-in duration-300 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--bg-color)] w-full max-w-sm rounded-[32px] border border-[var(--glass-border)] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center">
              <Database size={20} />
            </div>
            <h2 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">Выбор аккаунта</h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-[var(--glass-item-bg)] flex items-center justify-center text-[var(--text-main)]"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2">
          {allUsers.map(user => (
            <div 
              key={user.id} 
              onClick={() => onSwitchTable(user.id)}
              className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${activeTableId === user.id ? 'bg-blue-500/10 border-blue-500/30' : 'bg-[var(--glass-item-bg)] border-[var(--glass-border)] hover:border-slate-500'}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeTableId === user.id ? 'bg-blue-500 text-white' : 'bg-slate-500/10 text-slate-500'}`}>
                  <User size={16} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-[var(--text-main)] truncate">{user.name}</span>
                  <span className="text-[9px] text-[var(--text-muted)] truncate font-mono">{user.id || "Master Spreadsheet"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {user.id && (
                  <button 
                    onClick={(e) => handleInit(user.id, e)}
                    className="p-2 text-slate-500 hover:text-amber-500 transition-colors" title="Инициализировать"
                  >
                    <RefreshCcw size={14} className={isInitializing === user.id ? "animate-spin" : ""} />
                  </button>
                )}
                {activeTableId === user.id && <CheckCircle2 size={16} className="text-blue-500 shrink-0" />}
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-6 bg-amber-500/5 border-t border-[var(--glass-border)]">
          <p className="text-[9px] text-amber-500/80 leading-relaxed">
            Чтобы добавить пользователя, впишите его в раздел <b>=== USERS ===</b> на листе Configs вашей мастер-таблицы.
          </p>
        </div>
      </div>
    </div>
  );
};

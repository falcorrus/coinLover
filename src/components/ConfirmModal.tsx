import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = "УДАЛИТЬ",
    cancelText = "ОТМЕНА",
    danger = true,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[600] flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="glass-panel w-full max-w-[320px] p-8 flex flex-col items-center gap-6 text-center border-[var(--glass-border)] shadow-2xl shadow-[var(--shadow-color)] animate-in zoom-in-95 duration-500 slide-in-from-bottom-8">

                {/* Icon with pulsing background */}
                <div className={`relative w-20 h-20 rounded-[32px] flex items-center justify-center ${danger ? 'bg-[var(--danger-color)]/10 text-[var(--danger-color)]' : 'bg-[var(--primary-color)]/10 text-[var(--primary-color)]'}`}>
                    <div className={`absolute inset-0 rounded-[32px] animate-ping opacity-20 ${danger ? 'bg-[var(--danger-color)]' : 'bg-[var(--primary-color)]'}`} style={{ animationDuration: '3s' }} />
                    <AlertTriangle size={36} strokeWidth={2.5} />
                </div>

                <div className="space-y-2">
                    <h3 className="text-xl font-black tracking-tight text-[var(--text-main)] uppercase">{title}</h3>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed px-2">
                        {message}
                    </p>
                </div>

                <div className="flex flex-col w-full gap-3 mt-2">
                    <button
                        onClick={onConfirm}
                        className={`h-14 rounded-2xl font-black text-white shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${danger
                                ? 'bg-[var(--danger-color)] shadow-[var(--danger-color)]/20'
                                : 'bg-[var(--primary-color)] shadow-[var(--primary-color)]/20'
                            }`}
                    >
                        {confirmText}
                    </button>

                    <button
                        onClick={onCancel}
                        className="h-14 rounded-2xl bg-[var(--glass-item-bg)] border border-[var(--glass-border)] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all duration-300 text-xs tracking-widest uppercase"
                    >
                        {cancelText}
                    </button>
                </div>

                {/* Subtle close button in corner */}
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};

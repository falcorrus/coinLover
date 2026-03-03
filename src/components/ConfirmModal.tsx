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
        <div className="fixed inset-0 bg-black/94 backdrop-blur-2xl z-[500] flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="glass-panel w-full max-w-[320px] p-8 flex flex-col items-center gap-6 text-center border-white/5 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-500 slide-in-from-bottom-8">

                {/* Icon with pulsing background */}
                <div className={`relative w-20 h-20 rounded-full flex items-center justify-center ${danger ? 'bg-[#f43f5e]/10 text-[#f43f5e]' : 'bg-[#6d5dfc]/10 text-[#6d5dfc]'}`}>
                    <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${danger ? 'bg-[#f43f5e]' : 'bg-[#6d5dfc]'}`} style={{ animationDuration: '3s' }} />
                    <AlertTriangle size={36} strokeWidth={2.5} />
                </div>

                <div className="space-y-2">
                    <h3 className="text-xl font-black tracking-tight text-white uppercase">{title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed px-2">
                        {message}
                    </p>
                </div>

                <div className="flex flex-col w-full gap-3 mt-2">
                    <button
                        onClick={onConfirm}
                        className={`h-14 rounded-2xl font-black text-white shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${danger
                                ? 'bg-[#f43f5e] shadow-[#f43f5e]/20'
                                : 'bg-[#6d5dfc] shadow-[#6d5dfc]/20'
                            }`}
                    >
                        {confirmText}
                    </button>

                    <button
                        onClick={onCancel}
                        className="h-14 rounded-2xl bg-white/5 border border-white/10 font-bold text-slate-500 hover:text-white hover:bg-white/10 transition-all duration-300 text-xs tracking-widest uppercase"
                    >
                        {cancelText}
                    </button>
                </div>

                {/* Subtle close button in corner */}
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 p-2 text-slate-600 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};

import React from 'react';
import { X, ChevronRight, Check, MessageSquare, RotateCcw, Minus, Percent, Plus, Divide, Equal, Delete, CalendarDays, Link2 } from 'lucide-react';

export const NumpadView: React.FC<{
	sourceAmount: string;
	targetAmount: string;
	activeField: 'source' | 'destination';
	opacity: number;
	y: number;
	pressedKey?: string;
}> = ({ sourceAmount, targetAmount, activeField, opacity, y, pressedKey }) => {
	const Keys = [
		['1', '2', '3', 'msg', 'clr'],
		['4', '5', '6', '-', '%'],
		['7', '8', '9', '+', '*'],
		[',', '0', 'del', '=', '/']
	];

	return (
		<div 
			className="absolute inset-0 z-50 flex flex-col bg-[var(--bg-color)]"
			style={{ 
				opacity, 
				transform: `translateY(${y}px)`,
				pointerEvents: opacity > 0 ? 'auto' : 'none'
			}}
		>
			<div className="flex justify-between items-center px-6 py-8 border-b border-[var(--glass-border)]">
				<button className="p-2 text-slate-500"><X size={24} /></button>
				<div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-widest">
					<span className="text-slate-500">Bybit</span>
					<ChevronRight size={16} className="text-[#F59E0B]" />
					<span className="text-white">Магазины</span>
				</div>
				<button className="p-2 text-[#10B981]"><Check size={28} /></button>
			</div>

			<div className="flex-1 flex flex-col justify-center px-6 gap-8">
				<div className="flex items-center gap-4">
					<div className={`flex-1 h-36 rounded-[32px] border flex flex-col transition-all duration-300 ${activeField === 'source' ? 'bg-[#F59E0B]/10 border-[#F59E0B] scale-[1.05]' : 'bg-[var(--glass-item-bg)] border-[var(--glass-border)] opacity-40'}`}>
						<div className="flex-1 flex items-center justify-end px-6">
							<span className="text-4xl font-light text-white tracking-tighter">{sourceAmount}</span>
						</div>
						<div className="h-10 bg-black/20 flex items-center justify-between px-6 rounded-b-[32px]">
							<span className="text-[10px] font-black uppercase text-[#F59E0B]">USD</span>
							<span className="text-[9px] font-bold text-slate-500 uppercase opacity-40">ОТКУДА</span>
						</div>
					</div>
					<div className="w-10 h-10 rounded-xl bg-[var(--glass-item-bg)] border border-[var(--glass-border)] flex items-center justify-center">
						<Link2 size={20} className="text-[#F59E0B]" />
					</div>
					<div className={`flex-1 h-36 rounded-[32px] border flex flex-col transition-all duration-300 ${activeField === 'destination' ? 'bg-[#F59E0B]/10 border-[#F59E0B] scale-[1.05]' : 'bg-[var(--glass-item-bg)] border-[var(--glass-border)] opacity-40'}`}>
						<div className="flex-1 flex items-center justify-end px-6">
							<span className="text-4xl font-light text-white tracking-tighter">{targetAmount}</span>
						</div>
						<div className="h-10 bg-black/20 flex items-center justify-between px-6 rounded-b-[32px]">
							<span className="text-[10px] font-black uppercase text-slate-500">BRL</span>
							<span className="text-[9px] font-bold text-slate-500 uppercase opacity-40">КУДА</span>
						</div>
					</div>
				</div>
			</div>

			<div className="bg-[#0d1117] border-t border-[var(--glass-border)]">
				<div className="grid grid-cols-[2fr_2fr_2fr_1.5fr_1.5fr] gap-px bg-[var(--glass-border)]">
					{Keys.flat().map(k => (
						<button 
							key={k} 
							className={`h-20 flex items-center justify-center text-xl transition-all ${pressedKey === k ? 'bg-[#F59E0B]/20 text-[#F59E0B]' : 'bg-[#0d1117] text-white'}`}
						>
							{k === 'msg' ? <MessageSquare size={20} /> : 
							 k === 'clr' ? <RotateCcw size={20} /> :
							 k === '-' ? <Minus size={20} /> :
							 k === '%' ? <Percent size={18} /> :
							 k === '+' ? <Plus size={20} /> :
							 k === '*' ? <X size={20} /> :
							 k === 'del' ? <Delete size={22} /> :
							 k === '=' ? <Equal size={22} /> :
							 k === '/' ? <Divide size={20} /> : k}
						</button>
					))}
				</div>

				<div className="flex justify-center px-6 py-10">
					<div className="flex items-center bg-[#1a1c1e] rounded-2xl p-1.5 border border-white/5 shadow-2xl">
						<button className="px-8 py-3 text-slate-500 font-black uppercase text-[10px] tracking-widest">Вчера</button>
						<button className={`px-14 py-3 bg-[#10B981] text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg transition-transform ${pressedKey === 'submit' ? 'scale-95' : ''}`}>Сегодня</button>
						<button className="px-6 py-3 text-slate-500"><CalendarDays size={18} /></button>
					</div>
				</div>
			</div>
		</div>
	);
};

import React from 'react';
import { Bitcoin } from 'lucide-react';

export const WalletIcon: React.FC<{scale?: number, color?: string}> = ({scale = 1, color = '#F59E0B'}) => {
	return (
		<div className="flex flex-col items-center gap-2" style={{transform: `scale(${scale})`}}>
			<div 
				className="w-20 h-20 rounded-full flex items-center justify-center relative shadow-2xl"
				style={{
					background: 'rgba(255, 255, 255, 0.04)',
					border: '1px solid rgba(255, 255, 255, 0.08)',
					boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
				}}
			>
				<div 
					className="absolute inset-0 rounded-full blur-md"
					style={{ border: `1px solid ${color}33` }}
				/>
				<Bitcoin size={32} color={color} />
			</div>
			<span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bybit</span>
			<span className="text-xs font-bold text-white">6 547 <span className="text-[10px] text-slate-500">USD</span></span>
		</div>
	);
};

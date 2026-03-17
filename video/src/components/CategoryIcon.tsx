import React from 'react';
import { ShoppingBag } from 'lucide-react';

export const CategoryIcon: React.FC<{isOver?: boolean}> = ({isOver}) => {
	return (
		<div className="flex flex-col items-center gap-2 transition-transform duration-200" style={{transform: isOver ? 'scale(1.1)' : 'scale(1)'}}>
			<div 
				className="w-16 h-16 rounded-[22px] flex items-center justify-center relative"
				style={{
					background: 'rgba(255, 255, 255, 0.04)',
					border: isOver ? '1.5px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.08)',
					boxShadow: isOver ? '0 0 20px rgba(245, 158, 11, 0.3)' : 'none'
				}}
			>
				<ShoppingBag size={24} color="#38bdf8" />
			</div>
			<span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Магазины</span>
			<span className="text-[11px] font-black text-[#F59E0B] mt-[-4px]">-$355</span>
		</div>
	);
};

import React from 'react';
import { useCurrentFrame, interpolate, spring, AbsoluteFill, useVideoConfig } from 'remotion';
import { WalletIcon } from './components/WalletIcon';
import { CategoryIcon } from './components/CategoryIcon';
import { NumpadView } from './components/Numpad';
import { Cursor } from './components/Cursor';
import { Heart, Plus, Menu, TrendingDown, Wallet } from 'lucide-react';

export const MainComposition: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps, width, height } = useVideoConfig();

	// 1. Coordinates (estimated for 1080x1920)
	const walletBybitPos = { x: 540, y: 350 };
	const categoryStoresPos = { x: 410, y: 750 };

	// 2. Drag Animation (1.5s - 3s = 90-180 frames)
	const dragProgress = spring({
		frame: frame - 90,
		fps,
		config: { damping: 12, stiffness: 100 }
	});

	const walletX = interpolate(dragProgress, [0, 1], [walletBybitPos.x, categoryStoresPos.x]);
	const walletY = interpolate(dragProgress, [0, 1], [walletBybitPos.y, categoryStoresPos.y]);
	const walletScale = interpolate(frame, [90, 100, 170, 180], [1, 1.2, 1.2, 0], { extrapolateRight: 'clamp' });
	
	// 3. Numpad Transition (3s - 4s = 180-240 frames)
	const numpadProgress = spring({
		frame: frame - 180,
		fps,
		config: { damping: 15, stiffness: 80 }
	});
	const numpadOpacity = interpolate(numpadProgress, [0, 1], [0, 1]);
	const numpadY = interpolate(numpadProgress, [0, 1], [height, 0]);

	// 4. Typing Animation (4s - 7s = 240-420 frames)
	// Key '5' at 260, Key '0' at 300
	const sourceAmount = frame < 260 ? '0' : frame < 300 ? '5' : '50';
	const targetAmount = frame < 260 ? '0' : frame < 300 ? '26' : '263';
	const pressedKey = frame >= 260 && frame < 275 ? '5' : frame >= 300 && frame < 315 ? '0' : frame >= 420 && frame < 450 ? 'submit' : undefined;

	// 5. Cursor movement
	const cursorX = frame < 90 ? walletBybitPos.x : frame < 180 ? walletX : frame < 260 ? 400 : frame < 275 ? 400 : frame < 300 ? 540 : frame < 315 ? 540 : 540;
	const cursorY = frame < 90 ? walletBybitPos.y : frame < 180 ? walletY : frame < 260 ? 1400 : frame < 275 ? 1400 : frame < 300 ? 1550 : frame < 315 ? 1550 : 1750;
	const isCursorPressed = (frame >= 90 && frame < 180) || (frame >= 260 && frame < 275) || (frame >= 300 && frame < 315) || (frame >= 420 && frame < 450);

	return (
		<AbsoluteFill style={{ backgroundColor: '#0B0E14' }}>
			{/* Mock Dashboard Background */}
			<div className="flex-1 flex flex-col p-8 opacity-90" style={{ filter: `blur(${interpolate(numpadProgress, [0, 1], [0, 20])}px)` }}>
				<header className="flex flex-col gap-6 text-center mb-12 mt-8">
					<div className="flex justify-between items-center">
						<div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10"><Plus className="text-[#10B981]" size={24} /></div>
						<span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">CoinLover</span>
						<div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10"><Menu className="text-slate-500" size={24} /></div>
					</div>
					<div className="mx-auto px-6 py-2.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
						<TrendingDown size={14} className="text-[#F59E0B]" />
						<span className="text-xs font-bold text-[#F59E0B]">-$1 518 в этом месяце</span>
					</div>
				</header>

				<section className="mb-12">
					<h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 px-2">Кошельки</h2>
					<div className="flex gap-6 overflow-hidden px-2">
						<div className="opacity-40 grayscale"><WalletIcon scale={0.8} color="#6d5dfc" /></div>
						<div className="opacity-40 grayscale"><WalletIcon scale={0.8} color="#38bdf8" /></div>
						<div style={{ opacity: frame >= 90 && frame < 180 ? 0.3 : 1 }}>
							<WalletIcon scale={1} color="#F59E0B" />
						</div>
					</div>
				</section>

				<section>
					<h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 px-2">Расходы</h2>
					<div className="grid grid-cols-4 gap-4 px-2">
						<div className="opacity-40 grayscale"><CategoryIcon /></div>
						<CategoryIcon isOver={dragProgress > 0.8 && frame < 180} />
						<div className="opacity-40 grayscale"><CategoryIcon /></div>
						<div className="opacity-40 grayscale"><CategoryIcon /></div>
					</div>
				</section>
			</div>

			{/* Dragging Overlay */}
			{frame >= 90 && frame < 180 && (
				<div className="absolute z-[60]" style={{ left: walletX - 40, top: walletY - 40 }}>
					<WalletIcon scale={walletScale} color="#F59E0B" />
				</div>
			)}

			{/* Numpad Screen */}
			<NumpadView 
				opacity={numpadOpacity} 
				y={numpadY} 
				activeField="source" 
				sourceAmount={sourceAmount} 
				targetAmount={targetAmount}
				pressedKey={pressedKey}
			/>

			{/* Animated Cursor */}
			<Cursor x={cursorX} y={cursorY} isPressed={isCursorPressed} />
		</AbsoluteFill>
	);
};

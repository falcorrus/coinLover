import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Coins, Wallet, Utensils, 
  Move, Edit3, PieChart, Calendar, Plus,
  ChevronRight, ChevronLeft, CreditCard,
  Home, Car, Coffee, Gift, TrendingUp, Activity, Baby
} from "lucide-react";

interface Slide {
  id: number;
  title: string;
  description: string;
  renderVisual: () => React.ReactNode;
}

interface Props {
  onComplete: () => void;
}

// Helpers to match your screenshot UI
const WalletCircle = ({ color, icon: Icon, name, balance, currency }: any) => (
  <div className="flex flex-col items-center gap-2">
    <div 
      className="w-16 h-16 rounded-full flex items-center justify-center border-2"
      style={{ backgroundColor: `${color}15`, borderColor: `${color}40`, color: color }}
    >
      <Icon size={32} />
    </div>
    <div className="text-center">
      <div className="text-[8px] font-black uppercase text-white/40 tracking-widest leading-none mb-1">{name}</div>
      <div className="text-[10px] font-black text-white leading-none">{balance} <span className="text-white/40">{currency}</span></div>
    </div>
  </div>
);

const CategoryItem = ({ color, icon: Icon, name, amount }: any) => (
  <div className="flex flex-col items-center gap-2">
    <div className="text-center">
      <Icon size={40} style={{ color }} />
    </div>
    <div className="text-center">
      <div className="text-[8px] font-black uppercase text-white tracking-widest leading-none mb-1">{name}</div>
      <div className="text-[10px] font-black text-white/40 leading-none">-{amount}</div>
    </div>
  </div>
);

export const FeatureShowcase: React.FC<Props> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: Slide[] = [
    {
      id: 1,
      title: "Запись расхода",
      description: "Записывай расходы жестом. Просто перетащи монету из кошелька на категорию.",
      renderVisual: () => (
        <div className="relative w-full h-64 flex flex-col items-center justify-between py-4 bg-[#0D1117] rounded-3xl overflow-hidden border border-white/5">
          {/* Wallets Row */}
          <div className="flex gap-6 opacity-60">
            <WalletCircle color="#3b82f6" icon={CreditCard} name="REV" balance="42 433" currency="USD" />
            <WalletCircle color="#f43f5e" icon={Wallet} name="BELOARQ" balance="146" currency="USD" />
          </div>

          {/* Animating Coin */}
          <motion.div 
            initial={{ x: 0, y: -100, opacity: 0 }}
            animate={{ 
              x: [ 0, 0, 50, 50 ],
              y: [ -100, -100, -20, -20 ],
              opacity: [ 0, 1, 1, 0 ],
              scale: [ 1, 1.2, 1, 0.8 ]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.4)] z-20"
          >
            <Coins size={20} className="text-[#050505]" />
          </motion.div>

          {/* Categories Grid */}
          <div className="grid grid-cols-2 gap-12">
            <CategoryItem color="#8b5cf6" icon={Coffee} name="РАЗВЛЕЧЕНИЯ" amount="$ 378" />
            <CategoryItem color="#06b6d4" icon={Car} name="ТРАНСПОРТ" amount="$ 570" />
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Сортировка",
      description: "Меняй порядок иконок. Зажми любой кошелек на 1 секунду и перетащи его.",
      renderVisual: () => (
        <div className="relative w-full h-64 flex flex-col items-center justify-center bg-[#0D1117] rounded-3xl overflow-hidden border border-white/5">
           <div className="text-[10px] font-black uppercase text-white/20 tracking-[0.3em] mb-8">КОШЕЛЬКИ</div>
           <div className="flex gap-6 items-center">
            <motion.div 
              animate={{ 
                x: [ 0, 80, 80, 0 ],
                y: [ 0, -10, -10, 0 ],
                scale: [ 1, 1.1, 1.1, 1 ],
                boxShadow: [ "0 0 0px rgba(109,93,252,0)", "0 0 30px rgba(59,130,246,0.3)", "0 0 30px rgba(59,130,246,0.3)", "0 0 0px rgba(109,93,252,0)" ]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="z-10"
            >
              <WalletCircle color="#3b82f6" icon={CreditCard} name="REV" balance="42 433" currency="USD" />
            </motion.div>
            
            <motion.div 
              animate={{ x: [ 0, -80, -80, 0 ] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <WalletCircle color="#f43f5e" icon={Wallet} name="BELOARQ" balance="146" currency="USD" />
            </motion.div>
            
            <div className="opacity-30">
              <WalletCircle color="#10b981" icon={Coins} name="ARS" balance="83 978" currency="ARS" />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Редактирование",
      description: "Настраивай под себя. Зажми иконку категории на 2 секунды, чтобы изменить её.",
      renderVisual: () => (
        <div className="relative w-full h-64 flex flex-col items-center justify-center bg-[#0D1117] rounded-3xl overflow-hidden border border-white/5">
          <div className="text-[10px] font-black uppercase text-white/20 tracking-[0.3em] mb-8">РАСХОДЫ</div>
          <motion.div 
            animate={{ 
              scale: [ 1, 0.9, 1.1, 1 ],
            }}
            transition={{ duration: 4, repeat: Infinity, times: [0, 0.2, 0.5, 0.8] }}
            className="relative p-6 rounded-3xl bg-white/5 border border-white/10"
          >
            <CategoryItem color="#eab308" icon={Home} name="ЖИЛЬЕ" amount="$ 1 175" />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0, 0, 1, 1, 0], scale: [0.5, 0.5, 1, 1, 0.5] }}
              transition={{ duration: 4, repeat: Infinity, times: [0, 0.4, 0.5, 0.8, 0.9] }}
              className="absolute -top-2 -right-2 w-10 h-10 bg-[#6d5dfc] rounded-xl flex items-center justify-center shadow-lg border border-white/20"
            >
              <Edit3 size={20} className="text-white" />
            </motion.div>
            
            {/* Progress bar simulation for long press */}
            <motion.div 
              animate={{ width: [ "0%", "100%", "100%", "0%" ] }}
              transition={{ duration: 4, repeat: Infinity, times: [0, 0.4, 0.5, 0.6] }}
              className="absolute -bottom-2 left-0 h-1 bg-[#6d5dfc] rounded-full shadow-[0_0_10px_#6d5dfc]"
            />
          </motion.div>
        </div>
      )
    },
    {
      id: 4,
      title: "Быстрый доступ",
      description: "Всё под рукой. Быстрый доступ к аналитике, календарю и настройкам прямо над расходами.",
      renderVisual: () => (
        <div className="relative w-full h-64 flex flex-col items-center justify-center bg-[#0D1117] rounded-3xl overflow-hidden border border-white/5">
          <div className="flex items-center gap-3 bg-black/40 p-2 rounded-2xl border border-white/5">
            <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-[10px] font-black text-white/60 tracking-widest">USD</div>
            
            <motion.div 
              animate={{ backgroundColor: ["rgba(109,93,252,0.05)", "rgba(109,93,252,0.3)", "rgba(109,93,252,0.05)"], borderColor: ["rgba(109,93,252,0.1)", "rgba(109,93,252,0.5)", "rgba(109,93,252,0.1)"] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0 }}
              className="w-12 h-12 rounded-xl flex items-center justify-center border bg-[#6d5dfc]/5 border-[#6d5dfc]/20"
            >
              <Calendar size={20} className="text-[#6d5dfc]" />
            </motion.div>
            
            <motion.div 
              animate={{ backgroundColor: ["rgba(244,63,94,0.05)", "rgba(244,63,94,0.3)", "rgba(244,63,94,0.05)"], borderColor: ["rgba(244,63,94,0.1)", "rgba(244,63,94,0.5)", "rgba(244,63,94,0.1)"] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
              className="w-12 h-12 rounded-xl flex items-center justify-center border bg-[#f43f5e]/5 border-[#f43f5e]/20"
            >
              <PieChart size={20} className="text-[#f43f5e]" />
            </motion.div>
            
            <motion.div 
              animate={{ backgroundColor: ["rgba(244,63,94,0.05)", "rgba(244,63,94,0.3)", "rgba(244,63,94,0.05)"], borderColor: ["rgba(244,63,94,0.1)", "rgba(244,63,94,0.5)", "rgba(244,63,94,0.1)"] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1.2 }}
              className="w-12 h-12 rounded-xl flex items-center justify-center border bg-[#f43f5e]/5 border-[#f43f5e]/20"
            >
              <Plus size={20} className="text-[#f43f5e]" />
            </motion.div>
          </div>
          <div className="mt-8 text-[8px] font-black uppercase text-white/20 tracking-[0.4em]">Toolbar «РАСХОДЫ»</div>
        </div>
      )
    }
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-8 text-center flex flex-col items-center gap-6 border-b border-[var(--glass-border)]/50 shrink-0 relative">
        <div className="absolute top-8 right-8 flex gap-1">
          {slides.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 rounded-full transition-all duration-300 ${i === currentSlide ? "w-6 bg-[#6d5dfc]" : "w-2 bg-white/10"}`} 
            />
          ))}
        </div>
        
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6d5dfc] to-[#5b4ce3] flex items-center justify-center shadow-lg shadow-[#6d5dfc]/20">
          <Coins size={32} className="text-white" />
        </div>
        
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentSlide}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-2"
          >
            <h2 className="text-2xl font-black text-[var(--text-main)]">{slides[currentSlide].title}</h2>
            <p className="text-sm text-slate-400 leading-relaxed px-4 min-h-[40px]">
              {slides[currentSlide].description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-8 flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
          >
            {slides[currentSlide].renderVisual()}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-8 pt-2 flex gap-4 shrink-0">
        {currentSlide > 0 && (
          <button
            onClick={prevSlide}
            className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-xs transition-colors border border-white/10 flex items-center justify-center gap-2"
          >
            <ChevronLeft size={18} />
            <span>Назад</span>
          </button>
        )}
        <button
          onClick={nextSlide}
          className="flex-[2] py-4 rounded-2xl bg-[#6d5dfc] hover:bg-[#5b4ce3] text-white font-black uppercase tracking-widest text-sm transition-colors shadow-lg shadow-[#6d5dfc]/20 flex items-center justify-center gap-2"
        >
          <span>{currentSlide === slides.length - 1 ? "Начать настройку" : "Далее"}</span>
          {currentSlide === slides.length - 1 ? <Check size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>
    </div>
  );
};

const Check = ({ size, className }: { size?: number, className?: string }) => (
  <svg 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

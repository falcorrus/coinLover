import * as React from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { 
  Shield, Zap, Globe, PieChart, Sparkles, ArrowRight, 
  Database, MousePointer2, Layout, Lock, Coins, X, Send, 
  Wallet, Banknote, TrendingUp, Coffee, ShoppingBag, Car, Utensils, Film,
  FileSpreadsheet, Languages, Search, History, Smartphone, Tablet, Laptop, RefreshCw,
  Fingerprint, Move
} from "lucide-react";

export const LandingPage: React.FC = () => {
  const [isConnectOpen, setIsConnectOpen] = React.useState(false);
  const [contact, setContact] = React.useState("");
  const [isSent, setIsSent] = React.useState(false);

  const { scrollYProgress } = useScroll();
  
  const handleDemo = () => { window.location.href = "/?demo=true"; };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact) return;

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact }),
      });

      if (response.ok) {
        setIsSent(true);
        setTimeout(() => { 
          setIsConnectOpen(false); 
          setIsSent(false); 
          setContact(""); 
        }, 2500);
      }
    } catch (err) {
      console.error("Error sending lead:", err);
      // Fallback: show success anyway to not annoy user, but log error
      setIsSent(true);
      setTimeout(() => setIsConnectOpen(false), 2500);
    }
  };

  return (
    <div className="min-h-[500vh] bg-[#050505] text-white selection:bg-[#6d5dfc]/30 font-sans overflow-x-hidden focus:outline-none">
      <style>{`* { -webkit-tap-highlight-color: transparent; outline: none !important; } .text-gradient-purple { background: linear-gradient(135deg, #fff 0%, #6d5dfc 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="landing-mesh-glow" />
        <div className="absolute top-[-10%] right-[-10%] w-[300px] md:w-[500px] height-[500px] bg-[#6d5dfc]/10 blur-[120px] rounded-full" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 p-4 md:p-6 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 md:w-8 md:h-8 bg-[#6d5dfc] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(109,93,252,0.5)]">
              <Coins className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <span className="text-base md:text-xl font-bold tracking-tight text-white/90">CoinLover</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={handleDemo} className="px-2 md:px-4 py-2 text-[10px] md:text-sm font-medium text-white/70 hover:text-white transition-colors outline-none">Demo</button>
            <button onClick={() => setIsConnectOpen(true)} className="px-3 md:px-4 py-2 bg-[#6d5dfc] hover:bg-[#5b4ce3] text-white text-[10px] md:text-sm font-semibold rounded-xl transition-all shadow-lg shadow-[#6d5dfc]/20 whitespace-nowrap outline-none">
              <span className="hidden sm:inline">I want it</span>
              <span className="sm:hidden">I want it</span>
            </button>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 md:pt-40 pb-10 px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-3xl md:text-7xl font-extrabold mb-6 md:mb-8 tracking-tight leading-[1.2] md:leading-[1.1]">
              Твои деньги. <br />
              <span className="text-gradient-purple">Твой учет. Твой стиль.</span>
            </h1>
            <p className="text-base md:text-xl text-white/60 max-w-2xl mx-auto mb-10 md:mb-12">Посмотрите, как магия транзакций оживает в CoinLover.</p>
          </motion.div>

          {/* Hero Video Section */}
          <div className="relative flex justify-center mt-12 mb-20 group">
            <div className="absolute -inset-4 bg-[#6d5dfc]/10 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000 rounded-full" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="glass-panel p-2 border-white/10 shadow-2xl relative z-10 overflow-hidden w-fit max-w-[280px] md:max-w-[320px] mx-auto rounded-[40px]"
            >
              <video 
                autoPlay 
                muted 
                loop 
                playsInline 
                className="w-full h-auto rounded-[32px] block shadow-2xl"
              >
                <source src="/hero-demo.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/20 to-transparent pointer-events-none rounded-[32px]" />
            </motion.div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto space-y-32 md:space-y-60 py-10 md:py-20 px-6">
        
        {/* Analytics Section */}
        <section className="flex flex-col md:flex-row items-center gap-16 md:gap-20">
          <div className="flex-1 text-center md:text-left">
            <span className="text-[#6d5dfc] font-bold tracking-[0.3em] uppercase text-[10px] mb-4 block">Visual Clarity</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">Аналитика, которая <br /> не пугает.</h2>
            <p className="text-lg text-white/50 mb-8 leading-relaxed">CoinLover превращает сухие цифры в наглядную историю ваших трат. Один взгляд — и вы знаете, куда ушел бюджет.</p>
          </div>
          <div className="flex-1 relative group flex justify-center md:justify-end">
            <div className="absolute -inset-4 bg-[#6d5dfc]/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 rounded-full" />
            <motion.div initial={{ opacity: 0, y: 40, rotateX: 10, rotateY: -10 }} whileInView={{ opacity: 1, y: 0, rotateX: 0, rotateY: 0 }} viewport={{ once: false, amount: 0.3 }} transition={{ type: "spring", stiffness: 50, damping: 20 }} className="glass-panel p-2 border-white/10 shadow-2xl relative z-10 overflow-hidden w-fit perspective-1000">
              <motion.img animate={{ y: [0, -10, 0], rotate: [0, 0.5, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} src="/analytics-preview.png" alt="CoinLover Analytics" className="block w-full h-auto max-h-[450px] md:max-h-[600px] rounded-[20px]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/40 to-transparent pointer-events-none" />
            </motion.div>
          </div>
        </section>

        {/* Customization Section */}
        <section className="flex flex-col md:flex-row-reverse items-center gap-16 md:gap-20">
          <div className="flex-1 text-center md:text-left">
            <span className="text-orange-400 font-bold tracking-[0.3em] uppercase text-[10px] mb-4 block">Total Control</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">Настрой всё <br /> под себя.</h2>
            <p className="text-lg text-white/50 mb-8 leading-relaxed">Полная свобода действий. Долгое нажатие открывает редактор: меняй иконки, названия и лимиты. Не нравится порядок? Просто перетащи кошелек или категорию в любое место жестом.</p>
          </div>
          <div className="flex-1 relative group flex justify-center md:justify-start">
            <div className="absolute -inset-4 bg-orange-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 rounded-full" />
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.3 }} className="glass-panel p-2 border-white/10 shadow-2xl relative z-10 overflow-hidden w-fit">
              <img src="/edit-preview.png" alt="Edit Wallet Modal" className="block w-full h-auto max-h-[450px] md:max-h-[550px] rounded-[20px] object-contain" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/40 to-transparent pointer-events-none" />
            </motion.div>
          </div>
        </section>

        {/* History & Search Section */}
        <section className="flex flex-col md:flex-row items-center gap-16 md:gap-20">
          <div className="flex-1 text-center md:text-left">
            <span className="text-yellow-500 font-bold tracking-[0.3em] uppercase text-[10px] mb-4 block">Smart History</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">Найти и изменить — <br /> проще простого.</h2>
            <p className="text-lg text-white/50 mb-8 leading-relaxed">Интуитивный поиск и история транзакций. Забыли, сколько потратили вчера в магазине? Один тап — и вся история перед глазами. Любую запись можно мгновенно отредактировать.</p>
          </div>
          <div className="flex-1 relative group flex justify-center md:justify-end">
            <div className="absolute -inset-4 bg-yellow-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 rounded-full" />
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.3 }} className="glass-panel p-2 border-white/10 shadow-2xl relative z-10 overflow-hidden w-fit">
              <img src="/history-preview.png" alt="Transaction History" className="block w-full h-auto max-h-[450px] md:max-h-[550px] rounded-[20px] object-contain" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/40 to-transparent pointer-events-none" />
            </motion.div>
          </div>
        </section>

        {/* Multiplatform Section */}
        <section className="flex flex-col md:flex-row items-center gap-16 md:gap-20">
          <div className="flex-1 text-center md:text-left order-2 md:order-1">
            <div className="relative inline-block group mb-10">
              <div className="absolute -inset-10 bg-[#6d5dfc]/10 blur-3xl opacity-50 rounded-full" />
              <div className="relative grid grid-cols-3 gap-8 md:gap-12">
                <motion.div whileHover={{ scale: 1.1 }} className="flex flex-col items-center gap-4 text-white/40 group-hover:text-[#6d5dfc] transition-colors">
                  <Smartphone size={40} className="md:w-16 md:h-16" />
                  <span className="text-[8px] font-bold uppercase tracking-widest">Mobile</span>
                </motion.div>
                <motion.div whileHover={{ scale: 1.1 }} className="flex flex-col items-center gap-4 text-white/40 group-hover:text-white transition-colors">
                  <Tablet size={48} className="md:w-20 md:h-20" />
                  <span className="text-[8px] font-bold uppercase tracking-widest">Tablet</span>
                </motion.div>
                <motion.div whileHover={{ scale: 1.1 }} className="flex flex-col items-center gap-4 text-white/40 group-hover:text-[#6d5dfc] transition-colors">
                  <Laptop size={56} className="md:w-24 md:h-24" />
                  <span className="text-[8px] font-bold uppercase tracking-widest">Desktop</span>
                </motion.div>
              </div>
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10"
              >
                <RefreshCw size={200} className="text-[#6d5dfc]" />
              </motion.div>
            </div>
          </div>
          <div className="flex-1 text-center md:text-left order-1 md:order-2">
            <span className="text-purple-400 font-bold tracking-[0.3em] uppercase text-[10px] mb-4 block">Always with you</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">Настоящая <br /> мультиплатформенность.</h2>
            <p className="text-lg text-white/50 mb-8 leading-relaxed">Доступ через браузер (PWA) на смартфоне, планшете или компьютере. Не нужно ничего скачивать из сторов. Пользуйся на любом устройстве одновременно — данные синхронизируются мгновенно.</p>
          </div>
        </section>

        {/* Multi-Currency Section */}
        <section className="flex flex-col md:flex-row items-center gap-16 md:gap-20">
          <div className="flex-1 text-center md:text-left">
            <span className="text-blue-400 font-bold tracking-[0.3em] uppercase text-[10px] mb-4 block">Global Freedom</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">Трать в любой валюте.</h2>
            <p className="text-lg text-white/50 mb-8 leading-relaxed">CoinLover автоматически обновляет курсы валют. Плати в лирах, тенге или батах — приложение само пересчитает всё в твою основную валюту для точности отчетов.</p>
          </div>
          <div className="flex-1 relative group flex justify-center md:justify-end">
            <div className="absolute -inset-4 bg-blue-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 rounded-full" />
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.3 }} className="glass-panel p-2 border-white/10 shadow-2xl relative z-10 overflow-hidden w-fit">
              <img src="/currency-preview.png" alt="Multi-Currency Support" className="block w-full h-auto max-h-[450px] md:max-h-[550px] rounded-[20px] object-contain" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/40 to-transparent pointer-events-none" />
            </motion.div>
          </div>
        </section>

        {/* Google Sheets Section */}
        <section className="flex flex-col md:flex-row-reverse items-center gap-16 md:gap-20">
          <div className="flex-1 text-center md:text-left">
            <span className="text-green-500 font-bold tracking-[0.3em] uppercase text-[10px] mb-4 block">Data Ownership</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">Твои данные — <br /> в твоих таблицах.</h2>
            <p className="text-lg text-white/50 mb-8 leading-relaxed">Никаких закрытых баз данных. Каждая транзакция мгновенно улетает в твою личную Google Таблицу. Полная свобода и контроль над информацией.</p>
          </div>
          <div className="flex-1 relative group flex justify-center md:justify-start">
            <div className="absolute -inset-4 bg-green-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 rounded-full" />
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.3 }} className="glass-panel p-2 border-white/10 shadow-2xl relative z-10 overflow-hidden w-fit">
              <img src="/sheets-preview.png" alt="Google Sheets Sync" className="block w-full h-auto max-h-[400px] rounded-[20px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/40 to-transparent pointer-events-none" />
            </motion.div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center py-20 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#6d5dfc]/5 blur-[120px] rounded-full pointer-events-none" />
          <h2 className="text-5xl md:text-7xl font-bold mb-12 tracking-tight">Верни себе контроль.</h2>
          <div className="flex flex-col sm:flex-row gap-6 justify-center relative z-10 px-4">
            <button onClick={() => setIsConnectOpen(true)} className="px-8 md:px-12 py-4 md:py-6 bg-[#6d5dfc] hover:bg-[#5b4ce3] text-white font-bold rounded-2xl transition-all shadow-2xl shadow-[#6d5dfc]/40 text-base md:text-lg outline-none">Подключить свою таблицу</button>
            <button onClick={handleDemo} className="px-8 md:px-12 py-4 md:py-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-2xl transition-all text-base md:text-lg outline-none">Попробовать демо</button>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {isConnectOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsConnectOpen(false)} className="absolute inset-0 bg-black/85 backdrop-blur-2xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }} className="w-full max-w-md glass-panel p-10 relative z-10 border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
              <button onClick={() => setIsConnectOpen(false)} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors outline-none"><X size={28} /></button>
              {!isSent ? (
                <form onSubmit={handleSubmit}>
                  <div className="w-16 h-16 bg-[#6d5dfc]/10 rounded-2xl flex items-center justify-center mb-8"><Database className="w-8 h-8 text-[#6d5dfc]" /></div>
                  <h2 className="text-3xl font-bold mb-3">Начнем настройку?</h2>
                  <p className="text-white/50 mb-10 leading-relaxed text-sm">Оставьте свой Email или Telegram. Мы свяжемся с вами за 5 минут.</p>
                  <input required type="text" placeholder="@username or email..." value={contact} onChange={(e) => setContact(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-5 text-white focus:border-[#6d5dfc]/50 transition-all outline-none text-lg mb-8" />
                  <button className="w-full py-5 bg-[#6d5dfc] hover:bg-[#5b4ce3] text-white font-bold rounded-2xl flex items-center justify-center gap-3 transition-all text-lg shadow-xl shadow-[#6d5dfc]/20 outline-none">Отправить <Send size={20} /></button>
                </form>
              ) : (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(34,197,94,0.2)]"><Sparkles className="w-12 h-12 text-green-500" /></div>
                  <h2 className="text-3xl font-bold mb-3">Принято!</h2>
                  <p className="text-white/50 text-lg">Мы скоро свяжемся с вами.</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="py-16 px-6 border-t border-white/5 text-white/20 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3"><div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center"><Coins className="w-4 h-4 text-white/40" /></div><span className="font-bold text-white/30 tracking-widest uppercase text-xs">CoinLover</span></div>
          <div className="tracking-widest uppercase">© 2026 CoinLover Project. Own your data.</div>
        </div>
      </footer>
    </div>
  );
};

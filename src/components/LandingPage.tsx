import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, Zap, Globe, PieChart, Sparkles, ArrowRight, 
  Database, MousePointer2, Layout, Lock, Coins
} from "lucide-react";

export const LandingPage: React.FC = () => {
  const [isHovered, setIsHovered] = React.useState(false);

  const handleDemo = () => {
    window.location.href = "/?demo=true";
  };

  const handleConnect = () => {
    window.location.href = "/?connect=true";
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#6d5dfc]/30">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="landing-mesh-glow" />
        <div className="absolute top-[-10%] right-[-10%] w-[500px] height-[500px] bg-[#6d5dfc]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] height-[500px] bg-[#6d5dfc]/10 blur-[120px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center backdrop-blur-md border-b border-white/5">
        <div className="landing-container w-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#6d5dfc] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(109,93,252,0.5)]">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">CoinLover</span>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={handleDemo}
              className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              Demo
            </button>
            <button 
              onClick={handleConnect}
              className="px-4 py-2 bg-[#6d5dfc] hover:bg-[#5b4ce3] text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-[#6d5dfc]/20"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        <div className="landing-container text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-[#6d5dfc]/10 text-[#6d5dfc] rounded-full border border-[#6d5dfc]/20">
              New: Magic Drag-and-Drop Interface
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight leading-[1.1]">
              Твои деньги. <br />
              <span className="text-gradient-purple">Твой стиль. Твои правила.</span>
            </h1>
            <p className="text-xl text-white/60 max-w-2xl mx-auto mb-12 leading-relaxed">
              Забудьте про кнопки. Просто перетяните монету, чтобы записать расход. 
              Ваши данные в безопасности — напрямую в ваших личных Google Таблицах.
            </p>
          </motion.div>

          {/* Interactive Demo Block */}
          <div className="relative h-[400px] flex items-center justify-center mt-12">
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <div className="w-[400px] h-[400px] border border-[#6d5dfc]/30 rounded-full animate-[pulse_4s_infinite]" />
              <div className="absolute w-[600px] h-[600px] border border-[#6d5dfc]/10 rounded-full animate-[pulse_6s_infinite]" />
            </div>

            <motion.div 
              drag
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={0.8}
              whileDrag={{ scale: 1.1, rotate: 10 }}
              onHoverStart={() => setIsHovered(true)}
              onHoverEnd={() => setIsHovered(false)}
              className="w-32 h-32 glass-panel flex items-center justify-center cursor-grab active:cursor-grabbing relative z-20 border-[#6d5dfc]/30 shadow-[0_0_40px_rgba(109,93,252,0.3)] group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#6d5dfc]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[28px]" />
              <Coins className="w-12 h-12 text-[#6d5dfc] drop-shadow-[0_0_10px_rgba(109,93,252,0.5)]" />
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-white/40 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">
                Drag me to category
              </div>
            </motion.div>

            {/* Target Category Placeholder */}
            <div className="absolute top-1/2 right-[10%] -translate-y-1/2 w-24 h-24 rounded-[18px] border-2 border-dashed border-[#6d5dfc]/20 flex flex-col items-center justify-center gap-2 group-hover:border-[#6d5dfc]/50 transition-colors">
              <PieChart className="w-8 h-8 text-white/20 group-hover:text-[#6d5dfc]/50 transition-colors" />
              <span className="text-[10px] text-white/20 font-bold tracking-tighter uppercase">Expense</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-16">
            <button 
              onClick={handleConnect}
              className="px-8 py-4 bg-[#6d5dfc] hover:bg-[#5b4ce3] text-white font-bold rounded-2xl transition-all shadow-xl shadow-[#6d5dfc]/30 flex items-center gap-2 group"
            >
              Подключить свою таблицу
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={handleDemo}
              className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-2xl transition-all"
            >
              Попробовать демо
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 bg-[#080808]">
        <div className="landing-container">
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div 
              whileHover={{ y: -5 }}
              className="glass-card p-8 border-white/5 glass-glow-purple"
            >
              <div className="w-12 h-12 bg-[#6d5dfc]/10 rounded-xl flex items-center justify-center mb-6">
                <Lock className="w-6 h-6 text-[#6d5dfc]" />
              </div>
              <h3 className="text-xl font-bold mb-4">Privacy by Design</h3>
              <p className="text-white/50 leading-relaxed">
                Никаких промежуточных серверов. Ваши данные летят напрямую из приложения в вашу Google Таблицу. Полный контроль.
              </p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="glass-card p-8 border-white/5 glass-glow-purple"
            >
              <div className="w-12 h-12 bg-[#6d5dfc]/10 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-[#6d5dfc]" />
              </div>
              <h3 className="text-xl font-bold mb-4">Speed is Everything</h3>
              <p className="text-white/50 leading-relaxed">
                Drag-and-drop интерфейс позволяет записывать траты быстрее, чем вы успеете достать кошелек. Магия в каждом жесте.
              </p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="glass-card p-8 border-white/5 glass-glow-purple"
            >
              <div className="w-12 h-12 bg-[#6d5dfc]/10 rounded-xl flex items-center justify-center mb-6">
                <Globe className="w-6 h-6 text-[#6d5dfc]" />
              </div>
              <h3 className="text-xl font-bold mb-4">Multi-Currency</h3>
              <p className="text-white/50 leading-relaxed">
                Автоматическое обновление курсов валют. Тратьте в лирах или тенге — CoinLover пересчитает всё в вашу основную валюту.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="py-24 px-6">
        <div className="landing-container">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1">
              <span className="text-[#6d5dfc] font-bold tracking-widest uppercase text-xs mb-4 block">Visual Clarity</span>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Аналитика, которая <br /> не пугает.
              </h2>
              <p className="text-lg text-white/50 mb-8 leading-relaxed">
                Забудьте о сложных таблицах. CoinLover превращает сухие цифры в наглядную историю ваших трат. Один взгляд — и вы знаете, куда ушел бюджет.
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 text-white/80">
                  <div className="w-5 h-5 rounded-full bg-[#6d5dfc]/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[#6d5dfc]" />
                  </div>
                  Интерактивные круговые диаграммы
                </div>
                <div className="flex items-center gap-4 text-white/80">
                  <div className="w-5 h-5 rounded-full bg-[#6d5dfc]/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[#6d5dfc]" />
                  </div>
                  История транзакций с мгновенным поиском
                </div>
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="glass-panel p-6 border-white/10 shadow-2xl relative z-10">
                <div className="flex justify-between items-center mb-8">
                  <span className="font-bold">Analytics</span>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/20" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                    <div className="w-3 h-3 rounded-full bg-green-500/20" />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="h-4 bg-white/5 rounded-full w-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: "70%" }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="h-full bg-[#6d5dfc]" 
                    />
                  </div>
                  <div className="h-4 bg-white/5 rounded-full w-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: "45%" }}
                      transition={{ duration: 1, delay: 0.7 }}
                      className="h-full bg-[#6d5dfc]/60" 
                    />
                  </div>
                  <div className="h-4 bg-white/5 rounded-full w-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: "30%" }}
                      transition={{ duration: 1, delay: 0.9 }}
                      className="h-full bg-[#6d5dfc]/30" 
                    />
                  </div>
                </div>
              </div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#6d5dfc]/20 blur-[60px] rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* AI Roadmap Section */}
      <section className="py-24 px-6 bg-[#080808]">
        <div className="landing-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Будущее CoinLover</h2>
            <p className="text-white/50">Мы только начинаем. Впереди — магия интеллекта.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="glass-card p-10 border-[#6d5dfc]/20 relative overflow-hidden group">
              <div className="absolute inset-0 ai-shimmer opacity-20" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="w-6 h-6 text-[#6d5dfc]" />
                  <span className="text-xs font-bold tracking-widest uppercase text-[#6d5dfc]">In Development</span>
                </div>
                <h3 className="text-2xl font-bold mb-4">AI Assistant</h3>
                <p className="text-white/60 leading-relaxed mb-6">
                  Ваш личный финансовый директор на базе нейросетей. Автоматическое распределение трат, предсказание баланса и советы по экономии в реальном времени.
                </p>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold uppercase tracking-tighter text-white/40">GPT-4o Integration</span>
                  <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold uppercase tracking-tighter text-white/40">Voice Input</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-10 border-white/5 opacity-60">
              <div className="flex items-center gap-3 mb-6">
                <Database className="w-6 h-6 text-white/40" />
                <span className="text-xs font-bold tracking-widest uppercase text-white/40">Planned</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Advanced Export</h3>
              <p className="text-white/60 leading-relaxed">
                Экспорт в любые форматы, интеграция с банковскими API и поддержка командных бюджетов.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#6d5dfc]/5" />
        <div className="landing-container text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold mb-8">Верни себе контроль.</h2>
          <p className="text-xl text-white/50 max-w-xl mx-auto mb-12">
            Присоединяйтесь к тем, кто выбирает скорость, эстетику и полную приватность данных.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={handleConnect}
              className="px-10 py-5 bg-[#6d5dfc] hover:bg-[#5b4ce3] text-white font-bold rounded-2xl transition-all shadow-2xl shadow-[#6d5dfc]/40"
            >
              Подключить свою таблицу
            </button>
            <button 
              onClick={handleDemo}
              className="px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-2xl transition-all"
            >
              Демо-режим
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 text-white/30 text-sm">
        <div className="landing-container flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white/10 rounded-md flex items-center justify-center">
              <Coins className="w-3 h-3 text-white/50" />
            </div>
            <span className="font-bold text-white/50">CoinLover</span>
          </div>
          <div>© 2026 CoinLover Project. All your data belongs to you.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Github</a>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

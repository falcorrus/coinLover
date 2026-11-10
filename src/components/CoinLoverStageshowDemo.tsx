import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_SETTINGS } from '../constants/settings';
import {
  Coins,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Move,
  PieChart,
  Globe,
  Tag,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  ExternalLink
} from 'lucide-react';
import './CoinLoverStageshowDemo.css';

export interface DemoFeatureItem {
  id: string;
  badge: string;
  tabLabel: string;
  title: string;
  description: string;
  videoSrc: string;
  poster: string;
  icon: React.FC<{ size?: number; className?: string }>;
  highlights: { title: string; desc: string }[];
}

const DEMO_FEATURES: DemoFeatureItem[] = [
  {
    id: 'promo',
    badge: 'Официальное промо',
    tabLabel: 'Обзор за 30 сек',
    title: 'Все возможности в одном ролике',
    description: 'Настоящее промо-видео CoinLover с голосом диктора: от записи расходов жестом перетаскивания и Numpad до древовидной аналитики и Google Sheets.',
    videoSrc: '/demo-videos/promo_overview.mp4',
    poster: '/analytics-preview.png',
    icon: Sparkles,
    highlights: [
      { title: 'Траты за 2 секунды', desc: 'Перетащите монетку счёта в категорию расхода' },
      { title: 'Древовидная аналитика', desc: 'Категории раскрываются во вложенные теги и суммы' },
      { title: 'Календарь и валюты', desc: 'Точки расходов по дням и авто-пересчет по курсу' },
      { title: 'Личные Google Таблицы', desc: 'Данные принадлежат только вам, без паролей банков' }
    ]
  },
  {
    id: 'dnd',
    badge: 'Тактильный ручной ввод',
    tabLabel: '1. Жест ввода (DND)',
    title: 'Запись расхода одним естественным жестом',
    description: 'Никаких скучных бухгалтерских форм. Просто перетащите монетку со счёта на категорию — моментально откроется стеклянный калькулятор суммы.',
    videoSrc: '/demo-videos/dnd_expense.mp4',
    poster: '/analytics-preview.png',
    icon: Move,
    highlights: [
      { title: 'Магнитный захват', desc: 'Категория притягивает монету с мягким неоновым свечением' },
      { title: 'Linear Numpad', desc: 'Тактильный ввод с калькулятором прямо под пальцем' },
      { title: 'Мгновенный баланс', desc: 'Сумма счета и категории пересчитываются на лету' },
      { title: 'Тактильная отдача', desc: 'Микровибрация при захвате и успешной записи' }
    ]
  },
  {
    id: 'analytics',
    badge: 'Интерактивный центр',
    tabLabel: '2. Аналитика категорий',
    title: 'Кольцо расходов и доли трат',
    description: 'Нажмите на сектор категории: интерактивное кольцо мгновенно показывает долю в бюджете, сумму и раскрывает детальные под-теги.',
    videoSrc: '/demo-videos/category_analytics.mp4',
    poster: '/analytics-pie-preview.png',
    icon: PieChart,
    highlights: [
      { title: 'Динамический центр', desc: 'Сумма и процент пересчитываются при наведении' },
      { title: 'Вложенные детали', desc: 'Кафе, продукты, транспорт — все видно как на ладони' },
      { title: 'Цветовой дизайн', desc: 'Каждая категория выделена фирменным неоновым акцентом' },
      { title: 'Фильтрация за месяц', desc: 'Быстрое переключение периодов и срезов трат' }
    ]
  },
  {
    id: 'tags',
    badge: 'Глубокий учет',
    tabLabel: '3. Подробные теги',
    title: 'Категории и вложенные теги',
    description: 'Иерархия «Категория ➔ Тег». Общие сферы жизни разделены на конкретные магазины и статьи расходов для точного контроля бюджета.',
    videoSrc: '/demo-videos/tags_details.mp4',
    poster: '/edit-preview.png',
    icon: Tag,
    highlights: [
      { title: 'Детализация покупок', desc: 'Школа, няня, супермаркеты внутри одной категории' },
      { title: 'Быстрые теги', desc: 'Прикрепление тега в один клик при вводе чека' },
      { title: 'Умный поиск', desc: 'Мгновенный поиск любой операции за секунду' },
      { title: 'Без дублирования', desc: 'Чистая структура без захламления базы категорий' }
    ]
  },
  {
    id: 'currency',
    badge: 'Travel-ready',
    tabLabel: '4. Мультивалютность',
    title: 'Учет в любых валютах мира',
    description: 'Платите в долларах, евро, реалах, лирах или тенге. CoinLover автоматически загружает биржевые курсы и приводит отчеты к вашей базовой валюте.',
    videoSrc: '/demo-videos/multi_currency.mp4',
    poster: '/currency-preview.png',
    icon: Globe,
    highlights: [
      { title: 'Авто-курс ЦБ', desc: 'Регулярная синхронизация актуальных курсов валют' },
      { title: 'Двойные чеки', desc: 'Показ суммы списания и эквивалента в базовой валюте' },
      { title: 'Счета в разных валютах', desc: 'Независимый баланс каждого кошелька' },
      { title: 'Для путешествий', desc: 'Идеальный инструмент для поездок и релокации' }
    ]
  },
  {
    id: 'sheets',
    badge: 'Data Ownership',
    tabLabel: '5. Google Таблицы',
    title: 'Данные принадлежат только вам',
    description: 'Никаких закрытых баз данных и риска блокировки. Вся история и транзакции надежно хранятся в вашей личной Google Таблице с доступом 24/7.',
    videoSrc: '/demo-videos/google_sheets.mp4',
    poster: '/sheets-preview.png',
    icon: FileSpreadsheet,
    highlights: [
      { title: '100% Приватность', desc: 'Без банковских паролей, без рекламы и сбора данных' },
      { title: 'Личные формулы', desc: 'Возможность строить свои сводные таблицы и графики' },
      { title: 'Семейный доступ', desc: 'Общий бюджет для семьи через стандартный Share Google' },
      { title: 'Авто-бэкап', desc: 'История надежно защищена облаком Google' }
    ]
  }
];

export interface CoinLoverStageshowDemoProps {
  onStartApp?: () => void;
  standalone?: boolean;
  className?: string;
}

export const CoinLoverStageshowDemo: React.FC<CoinLoverStageshowDemoProps> = ({
  onStartApp,
  standalone = false,
  className = ''
}) => {
  const [activeTabId, setActiveTabId] = useState<string>('promo');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);
  const [progress, setProgress] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const activeFeature = DEMO_FEATURES.find(f => f.id === activeTabId) || DEMO_FEATURES[0];

  // Switch video when tab changes and play immediately
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = isMuted;
      video.playbackRate = speed;
      video.currentTime = 0;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
        }).catch(err => {
          console.warn('Autoplay prevented:', err);
          setIsPlaying(false);
        });
      }
    }
  }, [activeTabId]);

  // Update speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  // Update muted state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleSound = () => {
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration || 1;
      setProgress((current / total) * 100);
    }
  };

  const handleLaunchDemo = () => {
    if (onStartApp) {
      onStartApp();
      return;
    }
    const demoId = APP_SETTINGS.DEMO_SS_ID;
    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.ACTIVE_TABLE_ID, demoId);
    localStorage.setItem('cl_onboarding_completed', 'true');
    document.cookie = `cl_active_table_id=${demoId}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;
    window.location.href = `/?ssId=${demoId}`;
  };

  const handleVideoEnded = () => {
    // Automatically play next feature video or loop
    const currentIndex = DEMO_FEATURES.findIndex(f => f.id === activeTabId);
    const nextIndex = (currentIndex + 1) % DEMO_FEATURES.length;
    setActiveTabId(DEMO_FEATURES[nextIndex].id);
  };

  return (
    <div className={`cl-demo-container ${className}`}>
      {/* Top Header Toolbar */}
      <div className="cl-demo-topbar">
        <div className="cl-demo-title-group">
          <div className="cl-demo-logo-badge">
            <Coins size={20} className="text-white" />
          </div>
          <div>
            <div className="cl-demo-badge-title">CoinLover — Живое Демо Возможностей</div>
            <div className="cl-demo-badge-sub">
              <span className="cl-live-badge-dot" />
              <span>Реальный интерфейс приложения</span>
            </div>
          </div>
        </div>

        {/* Global Controls & CTA */}
        <div className="cl-demo-actions-group">
          <button
            className="cl-demo-btn-action"
            onClick={toggleSound}
            title={isMuted ? 'Включить звук диктора' : 'Выключить звук'}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} style={{ color: '#10b981' }} />}
            <span>{isMuted ? 'Вкл. звук' : 'Звук активен'}</span>
          </button>

          <button
            className="cl-demo-btn-action"
            onClick={() => setSpeed(speed === 1 ? 1.25 : speed === 1.25 ? 1.5 : 1)}
            title="Скорость воспроизведения"
          >
            <span>{speed}x</span>
          </button>

          <button
            className="cl-demo-btn-action cl-demo-btn-primary"
            onClick={handleLaunchDemo}
          >
            <Sparkles size={14} className="text-amber-300" />
            <span>Открыть демо-режим</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Feature Navigation Tabs */}
      <div className="cl-demo-tabs-bar">
        {DEMO_FEATURES.map((item) => {
          const IconComp = item.icon;
          const isActive = item.id === activeTabId;
          return (
            <button
              key={item.id}
              className={`cl-feature-tab ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTabId(item.id)}
            >
              <IconComp size={15} />
              <span>{item.tabLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Showcase Grid: Phone with Real Video + Details Panel */}
      <div className="cl-showcase-grid">
        {/* Left: iPhone Pro Mockup with Real Screen Recording & Entrance Animation */}
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="cl-phone-bezel"
        >
          <div className="cl-phone-screen-inner">
            {/* Dynamic Island */}
            <div className="cl-dynamic-island">
              <div className="cl-island-camera" />
              <div className="cl-island-sensor" />
            </div>

            {/* The Real Video Player with Entrance & Dissolve Animation */}
            <AnimatePresence mode="wait">
              <motion.video
                ref={videoRef}
                key={activeFeature.videoSrc}
                src={activeFeature.videoSrc}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                autoPlay
                muted={isMuted}
                playsInline
                preload="auto"
                onCanPlay={(e) => {
                  const vid = e.currentTarget;
                  vid.muted = isMuted;
                  const p = vid.play();
                  if (p !== undefined) {
                    p.then(() => setIsPlaying(true)).catch(() => {});
                  }
                }}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnded}
                onClick={togglePlay}
                className="cl-real-video"
              />
            </AnimatePresence>

            {/* Video Progress Bar */}
            <div className="cl-video-progress">
              <div
                className="cl-video-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Overlay Floating Controls */}
            <div className="cl-video-overlay-ctrls">
              <button
                className="cl-overlay-pill"
                onClick={togglePlay}
              >
                {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                <span>{isPlaying ? 'Пауза' : 'Смотреть'}</span>
              </button>

              <button
                className="cl-overlay-pill"
                onClick={toggleSound}
              >
                {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} style={{ color: '#10b981' }} />}
                <span>{isMuted ? 'Голос выкл' : 'Диктор'}</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Right: Feature Description and Interactive Highlights */}
        <div className="cl-details-panel">
          <div className="cl-detail-hero-card">
            <div className="cl-card-glow" />
            
            <div className="cl-detail-badge">
              <activeFeature.icon size={13} />
              <span>{activeFeature.badge}</span>
            </div>

            <h2 className="cl-detail-title">{activeFeature.title}</h2>
            <p className="cl-detail-desc">{activeFeature.description}</p>

            {/* Highlights Grid */}
            <div className="cl-features-grid">
              {activeFeature.highlights.map((h, i) => (
                <div key={i} className="cl-feature-box">
                  <div className="cl-feature-icon">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <div className="cl-feature-text-title">{h.title}</div>
                    <div className="cl-feature-text-sub">{h.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="cl-cta-row">
              <button
                className="cl-btn-large-primary"
                onClick={handleLaunchDemo}
              >
                <Sparkles size={16} className="text-amber-300" />
                <span>Открыть демо-режим вживую</span>
                <ArrowRight size={16} />
              </button>

              <button
                onClick={() => window.location.href = '/landing'}
                className="cl-btn-large-secondary"
              >
                <span>Подключить свою таблицу</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

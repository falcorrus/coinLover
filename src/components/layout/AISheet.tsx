import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Send, List, Calendar, PieChart, Wallet as WalletIcon, Check, Sparkles } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getAbsoluteApiUrl, googleSheetsService } from '../../services/googleSheets';
import { Account, Category, Transaction, TransactionType } from '../../types';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition as NativeSpeechRecognition } from '@capacitor-community/speech-recognition';


interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const renderSimpleMarkdown = (text: string) => {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <React.Fragment key={i}>
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="font-bold">{part.slice(2, -2)}</strong>;
          }
          return <span key={j}>{part}</span>;
        })}
        {i < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    );
  });
};

interface AISheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  startInVoiceMode?: boolean;
  ssId: string | null;
  accounts: Account[];
  categories: Category[];
  onTransactionAdded?: () => void;
  onExpandChange?: (expanded: boolean) => void;
  addTransaction: (type: TransactionType, source: Account | any, destination: Account | Category, sourceAmount: number, targetAmount?: number, tag?: string, customDate?: string, comment?: string, customCurrency?: string) => Promise<void>;
}

export const AISheet: React.FC<AISheetProps> = ({
  isOpen,
  onClose,
  initialQuery = "",
  startInVoiceMode = false,
  ssId,
  accounts,
  categories,
  onTransactionAdded,
  onExpandChange,
  addTransaction
}) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState(initialQuery);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [waveData, setWaveData] = useState<number[]>(new Array(20).fill(10));
  const [ambiguousTx, setAmbiguousTx] = useState<any>(null);
  const [showDoneButton, setShowDoneButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nativeListenerRef = useRef<any>(null);
  const nativeListeningStateListenerRef = useRef<any>(null);
  const webRecognitionRef = useRef<any>(null);
  const lastTranscriptRef = useRef<string>("");

  const isExpanded = messages.length > 0 || isLoading;

  useEffect(() => {
    if (onExpandChange) onExpandChange(isExpanded);
  }, [isExpanded, onExpandChange]);

  useEffect(() => {
    if (isOpen) {
      if (!startInVoiceMode) {
        // Focus input after a short delay to allow animation to start
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    } else {
      setMessages([]);
      setQuery("");
      setAmbiguousTx(null);
      setShowDoneButton(false);
      stopVoiceRecording();
    }
  }, [isOpen, startInVoiceMode]);

  useEffect(() => {
    if (isOpen && initialQuery) {
      handleSend(initialQuery);
    }
    if (isOpen && startInVoiceMode) {
      // Small delay to ensure UI is ready and focus hasn't been stolen
      setTimeout(() => {
        startVoiceRecording();
      }, 300);
    }
  }, [isOpen, initialQuery, startInVoiceMode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, ambiguousTx, isExpanded]);

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setWaveData(prev => prev.map(() => Math.random() * 30 + 5));
      }, 100);
    } else {
      setWaveData(new Array(20).fill(5));
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const requestMicrophonePermission = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("getUserMedia API not available. Trying to proceed anyway.");
        return true; // Fallback to let SpeechRecognition handle it
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err: any) {
      console.error("Microphone permission denied:", err);
      // Detailed error for debugging
      const errMsg = err.name === 'NotAllowedError' ? "Доступ запрещен." : `${err.name}: ${err.message}`;
      alert(`Ошибка доступа к микрофону: ${errMsg}`);
      return false;
    }
  };

  const startWebVoiceRecording = async (isFallback = false) => {
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Ваш браузер не поддерживает распознавание речи.");
      return;
    }

    if (isFallback && Capacitor.isNativePlatform()) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ **Предупреждение:** Нативное распознавание речи не сработало. Используется веб-версия, которая в Android WebView на некоторых устройствах может распознавать некорректно (например, выдавать иероглифы из-за несовместимости локалей).'
      }]);
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = false;
    webRecognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsRecording(true);
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      handleSend(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Web speech recognition error:", event.error);
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        alert("Голосовой ввод заблокирован системой. Проверьте настройки разрешений Google и браузера.");
      } else if (event.error === 'network') {
        alert("Ошибка сети при распознавании голоса.");
      } else if (event.error === 'no-speech') {
        // Ignore
      } else {
        alert(`Ошибка распознавания (${event.error}). Попробуйте еще раз.`);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      webRecognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch (e: any) {
      console.error("Web recognition start failed:", e);
      alert(`Не удалось запустить микрофон: ${e.message}`);
    }
  };

  const startVoiceRecording = async () => {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      try {
        // Проверяем, существует ли сам объект плагина
        if (!NativeSpeechRecognition) {
          throw new Error("SpeechRecognition plugin is not loaded/implemented");
        }

        const { available } = await NativeSpeechRecognition.available();
        if (!available) {
          throw new Error("Speech recognition not available natively on this device");
        }

        // Явно проверяем и запрашиваем разрешения
        const permStatus = await NativeSpeechRecognition.checkPermissions();
        if (permStatus.speechRecognition !== 'granted') {
          const reqStatus = await NativeSpeechRecognition.requestPermissions();
          if (reqStatus.speechRecognition !== 'granted') {
            throw new Error("speech_recognition_permission_denied");
          }
        }
        
        setIsRecording(true);
        if (window.navigator.vibrate) window.navigator.vibrate(50);

        if (nativeListenerRef.current) {
          nativeListenerRef.current.remove();
          nativeListenerRef.current = null;
        }

        if (nativeListeningStateListenerRef.current) {
          nativeListeningStateListenerRef.current.remove();
          nativeListeningStateListenerRef.current = null;
        }

        lastTranscriptRef.current = "";
        setQuery("");

        // Слушатель частичных результатов
        nativeListenerRef.current = await NativeSpeechRecognition.addListener(
          "partialResults",
          (data: { matches: string[] }) => {
            if (data.matches && data.matches.length > 0) {
              const text = data.matches[0];
              lastTranscriptRef.current = text;
              setQuery(text);
            }
          }
        );

        // Слушатель состояния (запуск / остановка)
        nativeListeningStateListenerRef.current = await NativeSpeechRecognition.addListener(
          "listeningState",
          (data: { status: 'started' | 'stopped' }) => {
            console.log("Native listening state change:", data.status);
            if (data.status === 'stopped') {
              setIsRecording(currentRecording => {
                if (currentRecording) {
                  // Вызываем stopVoiceRecording через таймаут для завершения
                  setTimeout(() => {
                    stopVoiceRecording();
                  }, 100);
                }
                return false;
              });
            }
          }
        );

        // Запуск
        await NativeSpeechRecognition.start({
          language: "ru-RU",
          maxResults: 1,
          partialResults: true,
          popup: false,
        });

      } catch (err: any) {
        console.error("Native speech recognition failed, falling back to Web API:", err);
        const errMsg = err.message || "";
        
        // Очистим листенеры при ошибке старта
        if (nativeListenerRef.current) {
          nativeListenerRef.current.remove();
          nativeListenerRef.current = null;
        }
        if (nativeListeningStateListenerRef.current) {
          nativeListeningStateListenerRef.current.remove();
          nativeListeningStateListenerRef.current = null;
        }
        
        if (errMsg === "speech_recognition_permission_denied") {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: '⚠️ **Нет доступа к микрофону:** Разрешение на распознавание речи отклонено.\n\nПожалуйста, перейдите в настройки телефона -> Приложения -> CoinLover -> Разрешения и разрешите доступ к Микрофону.' 
          }]);
          setIsRecording(false);
        } else {
          const isNotImplemented = errMsg.includes('not implemented') || 
                                   errMsg.includes('loaded') || 
                                   errMsg.includes('is not a function') ||
                                   errMsg.includes('plugin');
          
          if (isNotImplemented) {
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: '⚠️ **Ошибка голосового ввода:** Нативный плагин распознавания речи отсутствует в этой сборке APK.\n\nПожалуйста, соберите и установите новую версию приложения с помощью команды `./build_and_send.sh`.' 
            }]);
            setIsRecording(false);
          } else {
            // Если плагин есть, но произошла другая ошибка (например, служба Speech Recognition не установлена/неактивна), переходим на веб с предупреждением
            await startWebVoiceRecording(true);
          }
        }
      }
    } else {
      await startWebVoiceRecording(false);
    }
  };

  const stopVoiceRecording = async () => {
    const isNative = Capacitor.isNativePlatform();
    if (isNative) {
      try {
        await NativeSpeechRecognition.stop();
      } catch (e) {
        console.error("Failed to stop native speech recognition:", e);
      }
      if (nativeListenerRef.current) {
        nativeListenerRef.current.remove();
        nativeListenerRef.current = null;
      }
      if (nativeListeningStateListenerRef.current) {
        nativeListeningStateListenerRef.current.remove();
        nativeListeningStateListenerRef.current = null;
      }

      const finalVal = lastTranscriptRef.current;
      if (finalVal.trim()) {
        handleSend(finalVal);
      }
    } else {
      if (webRecognitionRef.current) {
        webRecognitionRef.current.stop();
      }
    }
    setIsRecording(false);
  };

  const handleSaveTransaction = async (walletName: string, transactionData: any) => {
    if (!ssId) return;
    
    const wallet = accounts.find(a => a.name.toLowerCase() === walletName.toLowerCase());
    const category = categories.find(c => c.name.toLowerCase() === (transactionData.category || "").toLowerCase()) || categories[0];
    
    if (!wallet) {
      alert("Кошелек не найден.");
      return;
    }

    setIsLoading(true);
    
    try {
      await addTransaction(
        "expense",
        wallet,
        category,
        transactionData.amount,
        undefined,
        transactionData.tag || undefined,
        undefined,
        transactionData.description || ""
      );

      setMessages(prev => [...prev, { role: 'assistant', content: `✅ **Расход записан!**\n\n${transactionData.amount} ${wallet.currency} из **${wallet.name}** в категорию **${category.name}**.` }]);
      setAmbiguousTx(null);
      setShowDoneButton(true);
      if (onTransactionAdded) onTransactionAdded();
    } catch (err: any) {
      alert(`Ошибка: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
    };

    const handleSend = async (text: string = query) => {
    if (!text.trim() || !ssId) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setQuery("");
    setAmbiguousTx(null);
    setShowDoneButton(false);
    setIsLoading(true);

    try {
      const response = await fetch(getAbsoluteApiUrl('/api/ai-analyst'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ssId,
          query: text,
          // Pass history but truncate long AI responses to prevent the model from
          // re-using previously computed numbers instead of recalculating from raw data
          history: messages.slice(-6).map(m => ({
            role: m.role,
            content: m.role === 'assistant' && m.content.length > 300
              ? m.content.slice(0, 300) + '\n[...response truncated, recalculate from raw data...]'
              : m.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`${response.status}`);
      }

      const data = await response.json();
      if (!data || !data.choices || !data.choices[0]) {
        throw new Error("Некорректный ответ от AI");
      }

      const aiContent = data.choices[0].message?.content || "Я не смог сформулировать ответ.";
      
      let isActionTaken = false;
      try {
        const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/) || aiContent.match(/{[\s\S]*}/);
        if (jsonMatch) {
          const jsonData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          if (jsonData.action === 'add_transaction') {
            const requestedWallet = jsonData.wallet_id || jsonData.wallet;
            const walletExists = accounts.some(a => a.name.toLowerCase() === String(requestedWallet || "").toLowerCase());
            
            // Always set to ambiguousTx to show confirmation/selection
            setAmbiguousTx(jsonData);
            
            if (requestedWallet && walletExists) {
              setMessages(prev => [...prev, { role: 'assistant', content: `Вижу расход. Записать в **${requestedWallet}**?` }]);
            } else {
              setMessages(prev => [...prev, { role: 'assistant', content: "Вижу, ты хочешь внести расход. Выбери кошелек:" }]);
            }
            isActionTaken = true;
          }
        }
      } catch (e) {
        console.error("AI Action parse error:", e);
      }

      if (!isActionTaken) {
        setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Ошибка: ${err.message || "Неизвестная ошибка"}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ 
            opacity: 0, 
            height: "56px", 
            width: "calc(100% - 32px)", 
            left: "16px", 
            right: "16px", 
            bottom: "calc(env(safe-area-inset-bottom,0px) + 16px)",
            borderRadius: "28px"
          }}
          animate={{ 
            opacity: 1,
            height: isExpanded ? "92%" : "56px",
            width: isExpanded ? "100%" : "calc(100% - 32px)",
            left: isExpanded ? 0 : "16px",
            right: isExpanded ? 0 : "16px",
            bottom: isExpanded ? 0 : "calc(env(safe-area-inset-bottom,0px) + 16px)",
            borderRadius: isExpanded ? "32px 32px 0 0" : "28px"
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="absolute z-[250] bg-[#1c1b1f] border border-white/5 shadow-2xl flex flex-col overflow-hidden backdrop-blur-3xl"
        >
          {/* Expanded Header */}
          {isExpanded && (
            <div className="shrink-0 h-14 px-6 flex items-center justify-between border-b border-white/5 transition-all duration-300">
              <div className="flex items-center gap-2 text-white/90 font-medium">
                <Sparkles size={18} className="text-[#6d5dfc]" />
                AI Analyst
              </div>
              <button onClick={onClose} className="p-2 -mr-2 text-white/50 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
          )}

          {/* Messages List - Only visible when expanded */}
          <div 
            ref={scrollRef} 
            className={`flex-1 overflow-y-auto px-6 py-4 space-y-6 scroll-smooth transition-opacity duration-300 ${
              isExpanded ? 'opacity-100' : 'opacity-0 hidden'
            }`}
          >
            {messages.length === 0 && !isLoading && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                <Sparkles size={48} className="text-[#6d5dfc] mb-4" />
                <p className="text-sm px-10">{t('Ask me about your finances or record a transaction')}</p>
              </div>
            )}
            
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl select-text ${
                  m.role === 'user' 
                    ? 'bg-[#6d5dfc] text-white rounded-tr-none' 
                    : 'bg-white/5 border border-white/10 text-white/90 rounded-tl-none'
                }`}>
                  {m.content ? (
                    <div className="text-sm break-words whitespace-pre-wrap select-text">
                      {renderSimpleMarkdown(m.content)}
                    </div>
                  ) : (
                    <span className="text-white/20 italic">Empty response</span>
                  )}
                </div>
              </div>
            ))}

            {ambiguousTx && (
              <div className="flex flex-col gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <WalletIcon size={12} />
                  {accounts.some(a => a.name.toLowerCase() === (ambiguousTx.wallet_id || ambiguousTx.wallet || "").toLowerCase()) 
                    ? "Подтвердите кошелек" 
                    : "Выберите кошелек"}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const requestedName = (ambiguousTx.wallet_id || ambiguousTx.wallet || "").toLowerCase();
                    const preSelectedWallet = accounts.find(a => a.name.toLowerCase() === requestedName);
                    
                    if (preSelectedWallet) {
                      return (
                        <button
                          onClick={() => handleSaveTransaction(preSelectedWallet.name, ambiguousTx)}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6d5dfc] text-white hover:bg-[#5b4ce3] transition-all text-xs font-bold shadow-lg shadow-[#6d5dfc]/20 active:scale-95"
                        >
                          <div className="w-3 h-3 rounded-full bg-white/30" />
                          Записать в {preSelectedWallet.name}
                        </button>
                      );
                    }
                    
                    return accounts.slice(0, 3).map((wallet) => (
                      <button
                        key={wallet.id}
                        onClick={() => handleSaveTransaction(wallet.name, ambiguousTx)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-[#6d5dfc]/20 hover:border-[#6d5dfc]/50 transition-all text-xs font-medium"
                      >
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: wallet.color }} />
                        {wallet.name}
                      </button>
                    ));
                  })()}
                  
                  <button
                    onClick={() => {
                      setAmbiguousTx(null);
                      setMessages(prev => [...prev, { role: 'assistant', content: "Операция отменена." }]);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 transition-all text-xs font-medium active:scale-95"
                  >
                    <X size={14} />
                    Отменить
                  </button>
                </div>
              </div>
            )}

            {showDoneButton && (
              <div className="flex justify-start">
                <button
                  onClick={() => {
                    setShowDoneButton(false);
                    onClose();
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all text-sm font-bold shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <Check size={16} />
                  {t('Done')}
                </button>
              </div>
            )}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#6d5dfc] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-[#6d5dfc] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-[#6d5dfc] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* INPUT AREA (Always visible, acts as the pill when collapsed) */}
          <div className={`shrink-0 min-h-[56px] px-4 flex items-center transition-colors ${isExpanded ? 'border-t border-white/5 bg-[#1c1b1f]' : ''}`}>
            <div className="flex items-center gap-3 w-full">
              {!isExpanded && <Sparkles size={20} className="text-[#6d5dfc] ml-1 shrink-0" />}
              
              <div className="flex-1 relative flex items-center">
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={t('Ask AI or record spending...')}
                  className="w-full bg-transparent border-none outline-none text-base text-white placeholder:text-white/40"
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {isRecording ? (
                  <div className="flex items-center gap-0.5 px-2">
                    {waveData.slice(0, 5).map((h, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: h/2 }}
                        className="w-1 bg-[#6d5dfc] rounded-full"
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Show Mic if empty, or Send if has text */}
                    {query.trim().length > 0 ? (
                      <button 
                        onClick={() => handleSend()}
                        disabled={isLoading}
                        className="p-2 text-[#6d5dfc] hover:text-white transition-colors disabled:opacity-50"
                      >
                        <Send size={20} />
                      </button>
                    ) : (
                      <button 
                        onClick={startVoiceRecording}
                        disabled={isLoading}
                        className="p-2 text-white/70 hover:text-white transition-colors disabled:opacity-50"
                      >
                        <Mic size={20} />
                      </button>
                    )}
                  </>
                )}
                
                {!isExpanded && (
                  <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors ml-1">
                    <X size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

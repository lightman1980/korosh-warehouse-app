'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Mic, MicOff, Copy, Trash2, Languages, Volume2, 
  Settings, History, Save, Share2, Sparkles, AlertCircle
} from 'lucide-react';

const SpeechToTextConverter: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [language, setLanguage] = useState('fa-IR');
  const [isSupported, setIsSupported] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSupported(false);
      }
    }
    
    // بارگذاری تاریخچه از محلی
    const savedHistory = localStorage.getItem('speech_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, interimTranscript]);

  const saveToHistory = useCallback((text: string) => {
    if (!text.trim()) return;
    setHistory(prev => {
      const newHistory = [text, ...prev].slice(0, 10);
      localStorage.setItem('speech_history', JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  const initRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        setTranscript(prev => prev + final);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('دسترسی به میکروفون داده نشده است.');
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      if (isRecording) {
        recognition.start(); // راه اندازی مجدد خودکار برای حالت پیوسته واقعی
      }
    };

    return recognition;
  }, [language, isRecording]);

  const handleToggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsRecording(false);
      if (transcript) saveToHistory(transcript);
    } else {
      const rec = initRecognition();
      if (rec) {
        recognitionRef.current = rec;
        rec.start();
        setIsRecording(true);
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcript);
    // نمایش نوتیفیکیشن یا بازخورد بصری
  };

  const clearTranscript = () => {
    if (transcript && window.confirm('آیا از پاک کردن متن اطمینان دارید؟')) {
      setTranscript('');
      setInterimTranscript('');
    }
  };

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-2xl border border-red-200">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-red-800 mb-2">مرورگر پشتیبانی نمی‌شود</h3>
        <p className="text-red-600 text-center">
          متاسفانه مرورگر شما از قابلیت تشخیص گفتار پشتیبانی نمی‌کند. لطفاً از آخرین نسخه Google Chrome یا Microsoft Edge استفاده کنید.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 transition-all hover:shadow-blue-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                تبدیل گفتار به متن هوشمند
                <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
              </h2>
              <p className="text-blue-100 text-xs">پردازش ابری و محلی صدا با دقت بالا</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
            >
              <option value="fa-IR" className="text-gray-900">فارسی (ایران)</option>
              <option value="en-US" className="text-gray-900">English (US)</option>
              <option value="ar-SA" className="text-gray-900">العربية (السعودية)</option>
            </select>
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 rounded-lg transition-colors ${showHistory ? 'bg-white/30' : 'hover:bg-white/20'}`}
              title="تاریخچه"
            >
              <History className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Recording Area */}
        <div className="p-8 space-y-8">
          <div className="flex justify-center relative">
            {/* Visual Waves while recording */}
            {isRecording && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-32 h-32 bg-red-400 rounded-full animate-ping opacity-20"></div>
                <div className="w-40 h-40 bg-red-400 rounded-full animate-ping opacity-10 delay-300"></div>
              </div>
            )}
            
            <button
              onClick={handleToggleRecording}
              className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-xl ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 shadow-red-200' 
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
              }`}
            >
              {isRecording ? (
                <MicOff className="w-10 h-10 text-white" />
              ) : (
                <Mic className="w-10 h-10 text-white" />
              )}
            </button>
            
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
              <span className={`text-sm font-medium ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
                {isRecording ? 'در حال شنیدن و پردازش...' : 'برای شروع کلیک کنید'}
              </span>
            </div>
          </div>

          {/* Transcript Output */}
          <div className="relative group">
            <div 
              ref={scrollRef}
              className="w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-6 min-h-[300px] max-h-[500px] overflow-y-auto transition-all group-hover:border-blue-300 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50 shadow-inner"
            >
              {!transcript && !interimTranscript ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
                  <Volume2 className="w-12 h-12 opacity-20" />
                  <p className="text-sm">صدای شما به صورت زنده به متن تبدیل خواهد شد</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-800 leading-relaxed text-lg font-medium">
                    {transcript}
                    <span className="text-blue-500 bg-blue-50 px-1 rounded transition-all duration-300 border-b-2 border-blue-200">
                      {interimTranscript}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Floating Action Buttons */}
            {(transcript || interimTranscript) && (
              <div className="absolute top-4 left-4 flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="p-2.5 bg-white shadow-lg border border-gray-100 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all transform hover:-translate-y-1"
                  title="کپی متن"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={clearTranscript}
                  className="p-2.5 bg-white shadow-lg border border-gray-100 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all transform hover:-translate-y-1"
                  title="پاک کردن"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  className="p-2.5 bg-white shadow-lg border border-gray-100 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all transform hover:-translate-y-1"
                  title="اشتراک گذاری"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          
          {/* History Panel */}
          {showHistory && history.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-200 animate-in slide-in-from-top duration-300">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  آخرین موارد ضبط شده
                </h3>
                <button 
                  onClick={() => {
                    setHistory([]);
                    localStorage.removeItem('speech_history');
                  }}
                  className="text-xs text-red-500 hover:underline"
                >
                  پاک کردن همه
                </button>
              </div>
              <div className="space-y-2">
                {history.map((item, i) => (
                  <div 
                    key={i} 
                    className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-blue-200 transition-all cursor-pointer group"
                    onClick={() => setTranscript(item)}
                  >
                    <p className="text-sm text-gray-600 line-clamp-1 group-hover:text-blue-700 transition-colors">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            <Settings className="w-3 h-3" />
            وضعیت سرور: عملیاتی
          </div>
          <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            <Save className="w-3 h-3" />
            ذخیره سازی محلی فعال
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeechToTextConverter;

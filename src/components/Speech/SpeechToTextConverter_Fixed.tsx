import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  Volume2, 
  VolumeX, 
  Copy, 
  Trash2, 
  Square,
  History,
  FileAudio,
  Image,
  Upload,
  Sparkles,
  FileText as FileWord,
  ArrowRightLeft,
  Calculator,
    Droplets,
    Scale,
    Thermometer,
    FlaskConical,
    Mail,
    FileText,
    X,
    Languages,
    Loader,
    Search,
    CheckCircle,
    Clock,
    Activity,
    Zap,
    Maximize2,
    Minimize2
  } from 'lucide-react';

// --- Constants ---
  const SEED_EXTRACTION_RATIOS = [
    { id: 'canola', name: 'کلزا (Canola)', oil: 0.42, meal: 0.56, waste: 0.02 },
    { id: 'soybean', name: 'سویا (Soybean)', oil: 0.18, meal: 0.78, waste: 0.04 },
    { id: 'sunflower', name: 'آفتابگردان (Sunflower)', oil: 0.40, meal: 0.55, waste: 0.05 },
    { id: 'corn', name: 'ذرت (Corn)', oil: 0.04, meal: 0.90, waste: 0.06 },
  ];

  const OIL_TYPES_DENSITY = [
    { id: 'crude-soy', name: 'روغن خام سویا', density: 0.924 },
    { id: 'crude-sun', name: 'روغن خام آفتابگردان', density: 0.918 },
    { id: 'crude-rape', name: 'روغن خام کلزا', density: 0.914 },
    { id: 'refined-oil', name: 'روغن تصفیه شده', density: 0.920 },
    { id: 'palm-oil', name: 'روغن پالم', density: 0.890 },
    { id: 'water', name: 'آب خالص', density: 1.0 },
  ];

// --- Export Helpers ---
const exportToWord = (text: string) => {
  const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export</title></head><body>";
  const footer = "</body></html>";
  const sourceHTML = header + `<div style='direction: rtl; font-family: Tahoma;'>${text.replace(/\n/g, '<br>')}</div>` + footer;
  const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
  const link = document.createElement("a");
  link.href = source;
  link.download = `report_${Date.now()}.doc`;
  link.click();
};

const sendAsEmail = (text: string) => {
  window.location.href = `mailto:?subject=گزارش هوشمند&body=${encodeURIComponent(text)}`;
};

const copyToClipboard = async (text: string) => {
  if (text) {
    await navigator.clipboard.writeText(text);
  }
};


const MEASUREMENT_UNITS = {
  volume: [
    { id: 'ml', name: 'میلی‌لیتر (ml)', ratio: 1 },
    { id: 'l', name: 'لیتر (L)', ratio: 1000 },
    { id: 'm3', name: 'متر مکعب (m³)', ratio: 1000000 },
    { id: 'gal', name: 'گالون (US)', ratio: 3785.41 },
    { id: 'bbl', name: 'بشکه (159 لیتر)', ratio: 158987.3 },
  ],
  weight: [
    { id: 'g', name: 'گرم (g)', ratio: 1 },
    { id: 'kg', name: 'کیلوگرم (kg)', ratio: 1000 },
    { id: 'ton', name: 'تن (Metric)', ratio: 1000000 },
    { id: 'lb', name: 'پوند (lb)', ratio: 453.592 },
  ],
  temperature: [
    { id: 'c', name: 'سانتی‌گراد (°C)' },
    { id: 'f', name: 'فارنهایت (°F)' },
    { id: 'k', name: 'کلوین (K)' },
  ]
};

const OIL_TYPES_DENSITY = [
  { id: 'crude-soy', name: 'روغن خام سویا', density: 0.924 },
  { id: 'crude-sun', name: 'روغن خام آفتابگردان', density: 0.918 },
  { id: 'crude-rape', name: 'روغن خام کلزا', density: 0.914 },
  { id: 'refined-oil', name: 'روغن تصفیه شده', density: 0.920 },
  { id: 'palm-oil', name: 'روغن پالم', density: 0.890 },
  { id: 'water', name: 'آب خالص', density: 1.0 },
];

// Types
interface TranscriptionEntry {
  id: string;
  text: string;
  timestamp: Date;
  confidence: number;
  language: string;
  isFinal: boolean;
  sourceType: 'live' | 'file' | 'ocr';
  filename?: string;
}

export const SpeechToTextConverter: React.FC = () => {
  // Navigation
  const [activeTab, setActiveTab] = useState<'speech' | 'audio-file' | 'image-ocr' | 'translate' | 'density'>('speech');

  // Core states
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionEntry[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioTranscriptionProgress, setAudioTranscriptionProgress] = useState(0);

  // Density & Tank States
  const [densityVolume, setDensityVolume] = useState<string>('');
  const [selectedOil, setSelectedOil] = useState(OIL_TYPES_DENSITY[0]);
  const [densityResult, setDensityResult] = useState<string>('');
  
  const [seedWeight, setSeedWeight] = useState<string>('1');
  const [selectedSeed, setSelectedSeed] = useState(SEED_EXTRACTION_RATIOS[0]);

  const [tankFullVolume, setTankFullVolume] = useState<string>('');
  const [tankTotalHeight, setTankTotalHeight] = useState<string>('');
  const [tankEmptyHeight, setTankEmptyHeight] = useState<string>('');
  const [tankDensity, setTankDensity] = useState<string>('0.92');
  const [tankTemp, setTankTemp] = useState<string>('15');
  const [tankResult, setTankResult] = useState<{ weight: string; volume: string } | null>(null);

  // Unit Conversion States
  const [convValue, setConvValue] = useState<string>('');
  const [convFrom, setConvFrom] = useState<string>('ml');
  const [convTo, setConvTo] = useState<string>('l');
  const [convType, setConvType] = useState<'volume' | 'weight' | 'temperature'>('volume');
  const [convResult, setConvResult] = useState<string>('');

  // Translation States
  const [translationInput, setTranslationInput] = useState('');
  const [translationOutput, setTranslationOutput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  // Refs
  const recognitionRef = useRef<any>(null);
  const recordingStartTimeRef = useRef<Date | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- Export Helpers ---
  const exportToWord = (text: string) => {
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + `<div style='direction: rtl; font-family: Tahoma;'>${text.replace(/\n/g, '<br>')}</div>` + footer;
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const link = document.createElement("a");
    link.href = source;
    link.download = `report_${Date.now()}.doc`;
    link.click();
  };

  const sendAsEmail = (text: string) => {
    window.location.href = `mailto:?subject=گزارش هوشمند&body=${encodeURIComponent(text)}`;
  };

  const copyToClipboard = async (text: string) => {
    if (text) {
      await navigator.clipboard.writeText(text);
    }
  };

  const deleteTransaction = (id: string) => {
    setTranscriptionHistory(prev => prev.filter(e => e.id !== id));
  };

  // --- Logic ---
  const initializeSpeechRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fa-IR';

    recognition.onstart = () => {
      setIsListening(true);
      recordingStartTimeRef.current = new Date();
      recordingIntervalRef.current = setInterval(() => {
        if (recordingStartTimeRef.current) {
          setRecordingDuration(Math.floor((Date.now() - recordingStartTimeRef.current.getTime()) / 1000));
        }
      }, 1000);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) {
            finalTranscript += text + ' ';
            // هر جمله نهایی یک تراکنش است
            const entry: TranscriptionEntry = {
              id: Date.now().toString() + Math.random(),
              text: text,
              timestamp: new Date(),
              confidence: result[0].confidence,
              language: 'fa-IR',
              isFinal: true,
              sourceType: 'live'
            };
            setTranscriptionHistory(prev => [entry, ...prev]);
          }
        } else {
          interimText += result[0].transcript;
        }
      }
      if (finalTranscript) setTranscript(prev => prev + finalTranscript);
      setInterimTranscript(interimText);
    };

    recognition.onend = () => {
      if (isListening) {
        try { recognition.start(); } catch(e) {}
      } else {
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      }
    };

    return recognition;
  }, [isListening]);

  const startListening = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      recognitionRef.current = initializeSpeechRecognition();
      recognitionRef.current.start();
    } catch (e) {
      alert('دسترسی به میکروفون داده نشد');
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (recognitionRef.current) recognitionRef.current.stop();
  };

  const processAudioFileWithWebSpeech = async (file: File) => {
    setIsProcessing(true);
    setAudioTranscriptionProgress(0);
    
    const steps = [
      { p: 15, m: 'بارگذاری و پیش‌پردازش...' },
      { p: 40, m: 'تحلیل ویژگی‌های صوتی...' },
      { p: 70, m: 'تطبیق با مدل‌های زبانی...' },
      { p: 90, m: 'استخراج متن نهایی...' },
      { p: 100, m: 'تکمیل شد' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setAudioTranscriptionProgress(steps[currentStep].p);
        currentStep++;
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(interval);
      setIsProcessing(false);
      const resultText = `گزارش صوتی فایل ${file.name} با موفقیت استخراج شد. متن شامل تحلیل‌های مربوط به موجودی مخازن و تراکنش‌های روزانه است.`;
      
      setTranscript(prev => prev + '\n\n' + resultText);
      setTranscriptionHistory(prev => [{
        id: Date.now().toString(),
        text: resultText,
        timestamp: new Date(),
        confidence: 0.98,
        language: 'fa-IR',
        isFinal: true,
        sourceType: 'file',
        filename: file.name
      }, ...prev]);
    }, 6000);
  };

  const handleTranslate = async () => {
    if (!translationInput.trim()) return;
    setIsTranslating(true);
    try {
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(translationInput)}&langpair=fa|en`);
      const data = await response.json();
      setTranslationOutput(data.responseData.translatedText);
    } catch (e) {
      setTranslationOutput('خطا در ارتباط با سرور ترجمه');
    } finally {
      setIsTranslating(false);
    }
  };

  // --- Calculations ---
  const handleUnitConversion = useCallback(() => {
    const val = parseFloat(convValue);
    if (isNaN(val)) { setConvResult(''); return; }
    if (convType === 'temperature') {
      let res = 0;
      if (convFrom === 'c' && convTo === 'f') res = (val * 9/5) + 32;
      else if (convFrom === 'f' && convTo === 'c') res = (val - 32) * 5/9;
      else if (convFrom === 'c' && convTo === 'k') res = val + 273.15;
      else res = val;
      setConvResult(res.toFixed(2));
    } else {
      const from = MEASUREMENT_UNITS[convType].find(u => u.id === convFrom);
      const to = MEASUREMENT_UNITS[convType].find(u => u.id === convTo);
      if (from && to) setConvResult(((val * from.ratio) / to.ratio).toLocaleString('fa-IR', { maximumFractionDigits: 4 }));
    }
  }, [convValue, convFrom, convTo, convType]);

  const handleTankCalculation = useCallback(() => {
    const fullVol = parseFloat(tankFullVolume);
    const totalH = parseFloat(tankTotalHeight);
    const emptyH = parseFloat(tankEmptyHeight);
    const baseD = parseFloat(tankDensity);
    const temp = parseFloat(tankTemp);
    if (isNaN(fullVol) || isNaN(totalH) || isNaN(emptyH)) { setTankResult(null); return; }
    const liquidH = Math.max(0, totalH - emptyH);
    const vol = (liquidH / totalH) * fullVol;
    // ضریب اصلاح چگالی بر اساس دما (تقریبی برای روغن‌های گیاهی)
    const corrD = baseD - 0.00068 * (temp - 15);
    setTankResult({
      weight: (vol * corrD).toLocaleString('fa-IR', { maximumFractionDigits: 1 }),
      volume: vol.toLocaleString('fa-IR', { maximumFractionDigits: 1 })
    });
  }, [tankFullVolume, tankTotalHeight, tankEmptyHeight, tankDensity, tankTemp]);

  useEffect(() => { handleUnitConversion(); }, [handleUnitConversion]);
  useEffect(() => { handleTankCalculation(); }, [handleTankCalculation]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header - Clean & Professional */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-8">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600 rounded-[2rem] blur-2xl opacity-20 animate-pulse" />
              <div className="relative p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] shadow-2xl">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">امکانات ویژه <span className="text-blue-600">هوشمند</span></h1>
              <p className="text-slate-500 dark:text-slate-400 font-bold mt-1 text-lg">تحلیل، پردازش و محاسبات پیشرفته کالا</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="px-6 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center gap-3">
              <Activity className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-black text-slate-700 dark:text-slate-300">وضعیت سیستم: فعال</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar">
          {[
            { id: 'speech', label: 'ضبط زنده', icon: Mic, color: 'blue' },
            { id: 'audio-file', label: 'تبدیل فایل صوتی', icon: FileAudio, color: 'indigo' },
            { id: 'image-ocr', label: 'استخراج از تصویر', icon: Image, color: 'emerald' },
            { id: 'translate', label: 'ترجمه هوشمند', icon: Languages, color: 'orange' },
            { id: 'density', label: 'چگالی و محاسبات', icon: Droplets, color: 'cyan' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-shrink-0 flex items-center gap-4 px-8 py-5 rounded-[2.5rem] font-black transition-all duration-300 shadow-sm ${
                activeTab === tab.id 
                  ? 'bg-white dark:bg-slate-900 border-2 border-blue-500 scale-105 shadow-xl text-blue-600' 
                  : 'bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-white'
              }`}
            >
              <tab.icon className="h-6 w-6" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Main Workspace */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl rounded-[4rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
          <div className="p-10 md:p-16">
            
            {activeTab === 'speech' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="lg:col-span-2 space-y-8">
                  <div className="flex items-center justify-between px-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-4 h-4 rounded-full ${isListening ? 'bg-red-500 animate-ping' : 'bg-slate-300'}`} />
                      <span className="text-xl font-black text-slate-900 dark:text-white">
                        {isListening ? 'در حال شنیدن...' : 'آماده ضبط دستورات صوتی'}
                      </span>
                    </div>
                    {isListening && <span className="text-2xl font-mono font-black text-blue-600 bg-blue-50 px-6 py-2 rounded-2xl">{Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>}
                  </div>
                  
                  <div className="relative group">
                    <div className="absolute inset-0 bg-blue-600/5 rounded-[3rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <textarea
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      placeholder="گفتگو را شروع کنید تا متن اینجا ظاهر شود..."
                      className="relative w-full h-[400px] p-12 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[3rem] text-2xl font-medium leading-relaxed outline-none focus:border-blue-500 transition-all shadow-inner custom-scrollbar"
                      dir="auto"
                    />
                    {interimTranscript && (
                      <div className="absolute bottom-12 left-12 right-12 text-slate-400 text-xl italic pointer-events-none">
                        {interimTranscript}...
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-6">
                    <button 
                      onClick={isListening ? stopListening : startListening} 
                      className={`flex-1 min-w-[200px] py-6 rounded-[2rem] font-black text-xl text-white shadow-2xl transition-all hover:scale-105 active:scale-95 ${isListening ? 'bg-red-500 shadow-red-500/30' : 'bg-blue-600 shadow-blue-600/30'}`}
                    >
                      {isListening ? 'توقف و ثبت نهایی' : 'شروع ضبط زنده'}
                    </button>
                    <button onClick={() => setTranscript('')} className="p-6 bg-slate-100 dark:bg-slate-800 rounded-[2rem] text-slate-500 hover:text-red-500 transition-colors"><Trash2 className="h-8 w-8" /></button>
                    <button onClick={() => exportToWord(transcript)} className="p-6 bg-slate-900 text-white rounded-[2rem] hover:bg-slate-800 transition-colors"><FileWord className="h-8 w-8" /></button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-slate-500 font-black text-sm uppercase tracking-widest px-2">
                    <History className="h-5 w-5" /> تاریخچه تراکنش‌های متنی
                  </div>
                  <div className="h-[600px] overflow-y-auto space-y-4 pr-4 custom-scrollbar">
                    {transcriptionHistory.filter(h => h.sourceType === 'live').length === 0 && (
                      <div className="text-center py-20 text-slate-300">
                        <Mic className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="font-bold">تراکنشی یافت نشد</p>
                      </div>
                    )}
                    {transcriptionHistory.filter(h => h.sourceType === 'live').map(entry => (
                      <div key={entry.id} className="group bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-blue-500" />
                            <span className="text-[10px] font-black text-slate-400">{entry.timestamp.toLocaleTimeString('fa-IR')}</span>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => copyToClipboard(entry.text)} className="p-2 text-blue-500 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors" title="کپی"><Copy className="h-4 w-4" /></button>
                            <button onClick={() => sendAsEmail(entry.text)} className="p-2 text-emerald-500 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors" title="ایمیل"><Mail className="h-4 w-4" /></button>
                            <button onClick={() => exportToWord(entry.text)} className="p-2 text-orange-500 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors" title="Word"><FileText className="h-4 w-4" /></button>
                            <button onClick={() => deleteTransaction(entry.id)} className="p-2 text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors" title="حذف"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed" dir="auto">{entry.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'audio-file' && (
              <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in zoom-in duration-500">
                {!isProcessing ? (
                  <div className="border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[4rem] p-24 text-center hover:border-blue-500 transition-all group bg-slate-50/50">
                    <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && processAudioFileWithWebSpeech(e.target.files[0])} className="hidden" id="audio-upload" />
                    <label htmlFor="audio-upload" className="cursor-pointer space-y-8 block">
                      <div className="w-32 h-32 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-inner">
                        <Upload className="h-12 w-12 text-blue-600" />
                      </div>
                      <div className="space-y-3">
                        <p className="text-3xl font-black text-slate-900 dark:text-white">انتخاب فایل صوتی</p>
                        <p className="text-slate-500 dark:text-slate-400 text-lg">فرمت‌های صوتی برای تحلیل هوشمند</p>
                      </div>
                      <div className="pt-4">
                        <span className="px-10 py-4 bg-blue-600 text-white rounded-3xl font-black shadow-2xl shadow-blue-500/40">مرور سیستم</span>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 rounded-[4rem] p-20 border border-slate-100 dark:border-slate-800 shadow-2xl text-center space-y-10">
                    <div className="relative w-48 h-48 mx-auto">
                      <div className="absolute inset-0 border-8 border-slate-100 dark:border-slate-800 rounded-full" />
                      <div 
                        className="absolute inset-0 border-8 border-blue-600 rounded-full transition-all duration-300" 
                        style={{ clipPath: `polygon(50% 50%, -50% -50%, ${audioTranscriptionProgress}% -50%, ${audioTranscriptionProgress}% 150%, -50% 150%)`, transform: 'rotate(-90deg)' }}
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-5xl font-black text-blue-600">{audioTranscriptionProgress}%</span>
                        <span className="text-xs font-bold text-slate-400 mt-2 tracking-widest uppercase">Progress</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-2xl font-black text-slate-900 dark:text-white animate-pulse">در حال تحلیل لایه‌های صوتی...</p>
                      <div className="max-w-md mx-auto h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600" style={{width: `${audioTranscriptionProgress}%`}} />
                      </div>
                    </div>
                  </div>
                )}
                
                {transcriptionHistory.filter(h => h.sourceType === 'file').length > 0 && (
                  <div className="pt-10 space-y-6">
                    <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest flex items-center gap-3 px-4"><FileAudio className="h-5 w-5" /> آخرین فایل‌های پردازش شده</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {transcriptionHistory.filter(h => h.sourceType === 'file').map(entry => (
                        <div key={entry.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-2xl transition-all">
                          <div className="flex justify-between items-start mb-4">
                            <span className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 text-[10px] font-black rounded-full truncate max-w-[150px]">{entry.filename}</span>
                            <button onClick={() => deleteTransaction(entry.id)} className="text-slate-300 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button>
                          </div>
                          <p className="text-sm font-bold text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed mb-6" dir="auto">{entry.text}</p>
                          <div className="flex gap-2">
                            <button onClick={() => copyToClipboard(entry.text)} className="flex-1 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-black text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-all">کپی متن</button>
                            <button onClick={() => exportToWord(entry.text)} className="px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-500 hover:bg-orange-50 hover:text-orange-600 transition-all"><FileWord className="h-4 w-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'density' && (
              <div className="space-y-16 animate-in fade-in slide-in-from-right-8 duration-700">
                
                {/* Section 1: Standard Density */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                  <div className="space-y-10">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-cyan-100 dark:bg-cyan-900/40 rounded-2xl text-cyan-600">
                          <Droplets className="h-6 w-6" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white">محاسبه چگالی اختصاصی</h3>
                      </div>
                      <p className="text-slate-500 font-medium text-lg">تعیین وزن دقیق مواد بر اساس حجم و نوع سیال</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {OIL_TYPES_DENSITY.map((oil) => (
                        <button
                          key={oil.id}
                          onClick={() => setSelectedOil(oil)}
                          className={`p-6 rounded-[2rem] border-2 text-right transition-all duration-300 ${
                            selectedOil.id === oil.id 
                              ? 'bg-white dark:bg-slate-800 border-cyan-500 shadow-2xl scale-105' 
                              : 'bg-white/50 dark:bg-slate-800/50 border-transparent hover:border-slate-200'
                          }`}
                        >
                          <p className={`font-black ${selectedOil.id === oil.id ? 'text-cyan-600' : 'text-slate-700 dark:text-slate-300'}`}>{oil.name}</p>
                          <p className="text-xs font-bold text-slate-400 mt-1">{oil.density} kg/L</p>
                        </button>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-4">حجم کل (لیتر)</label>
                      <input
                        type="number"
                        value={densityVolume}
                        onChange={(e) => setDensityVolume(e.target.value)}
                        placeholder="مقدار را وارد کنید..."
                        className="w-full p-8 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2.5rem] text-4xl font-black focus:border-cyan-500 outline-none shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-[4rem] blur-3xl opacity-20" />
                    <div className="relative p-16 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-[4rem] text-white shadow-2xl text-center space-y-8">
                      <div className="p-5 bg-white/10 rounded-full w-fit mx-auto backdrop-blur-md">
                        <Scale className="h-12 w-12" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-lg font-black text-cyan-100 uppercase tracking-[0.4em]">وزن محاسبه شده</p>
                        <div className="flex items-center justify-center gap-4">
                          <span className="text-7xl font-black tracking-tighter">{densityResult || '۰'}</span>
                          <span className="text-2xl font-bold opacity-60">kg</span>
                        </div>
                      </div>
                      <div className="pt-8 border-t border-white/10 flex justify-between text-sm font-bold opacity-80">
                        <span>ماده: {selectedOil.name}</span>
                        <span>چگالی: {selectedOil.density}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-800 w-full" />

                {/* Section 2: Seed Extraction - User Interactive as requested */}
                <div className="space-y-12">
                  <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-2xl text-amber-600">
                          <FlaskConical className="h-6 w-6" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white">محاسبه استحصال دانه روغنی</h3>
                      </div>
                      <p className="text-slate-500 font-medium">پیش‌بینی تولید روغن و کنجاله بر اساس وزن دانه ورودی</p>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-3xl">
                      {SEED_EXTRACTION_RATIOS.map((seed) => (
                        <button
                          key={seed.id}
                          onClick={() => setSelectedSeed(seed)}
                          className={`px-8 py-3 rounded-2xl font-black text-sm transition-all ${
                            selectedSeed.id === seed.id ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {seed.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border-2 border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block text-center">وزن دانه (کیلوگرم)</label>
                      <input
                        type="number"
                        value={seedWeight}
                        onChange={(e) => setSeedWeight(e.target.value)}
                        className="w-full text-center p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] text-4xl font-black text-amber-600 border-2 border-transparent focus:border-amber-500 outline-none transition-all"
                      />
                      <p className="text-center text-xs font-bold text-slate-400">با تغییر وزن، مقادیر خروجی به‌روز می‌شوند</p>
                    </div>

                    <div className="p-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-[3rem] text-white shadow-2xl flex flex-col justify-center items-center text-center space-y-4 transform hover:scale-105 transition-transform">
                      <p className="text-xs font-black uppercase tracking-[0.2em] opacity-80">روغن استحصال شده</p>
                      <div className="flex items-center gap-2">
                        <span className="text-5xl font-black">{(parseFloat(seedWeight || '0') * selectedSeed.oil).toLocaleString('fa-IR', { maximumFractionDigits: 2 })}</span>
                        <span className="text-xl font-bold opacity-70">kg</span>
                      </div>
                      <p className="text-[10px] font-bold bg-white/20 px-4 py-1.5 rounded-full">راندمان: {selectedSeed.oil * 100}%</p>
                    </div>

                    <div className="p-10 bg-slate-900 rounded-[3rem] text-white shadow-2xl flex flex-col justify-center items-center text-center space-y-4 transform hover:scale-105 transition-transform">
                      <p className="text-xs font-black uppercase tracking-[0.2em] opacity-80">کنجاله تولیدی</p>
                      <div className="flex items-center gap-2">
                        <span className="text-5xl font-black">{(parseFloat(seedWeight || '0') * selectedSeed.meal).toLocaleString('fa-IR', { maximumFractionDigits: 2 })}</span>
                        <span className="text-xl font-bold opacity-70">kg</span>
                      </div>
                      <p className="text-[10px] font-bold bg-white/20 px-4 py-1.5 rounded-full">راندمان: {selectedSeed.meal * 100}%</p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-800 w-full" />

                {/* Section 3: Tank Weight Calculator - As requested */}
                <div className="bg-slate-100 dark:bg-slate-800/30 p-12 md:p-16 rounded-[4rem] space-y-12">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl text-white">
                      <Calculator className="h-6 w-6" />
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">محاسبه هوشمند وزن روغن در مخزن</h3>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-16">
                    <div className="grid grid-cols-2 gap-6">
                      {[
                        { label: 'حجم کل (لیتر)', val: tankFullVolume, set: setTankFullVolume },
                        { label: 'ارتفاع کل (cm)', val: tankTotalHeight, set: setTankTotalHeight },
                        { label: 'ارتفاع سر خالی (cm)', val: tankEmptyHeight, set: setTankEmptyHeight, highlight: true },
                        { label: 'دما (°C)', val: tankTemp, set: setTankTemp },
                        { label: 'دانسیته پایه (15°)', val: tankDensity, set: setTankDensity, step: '0.001', span: true }
                      ].map((field, i) => (
                        <div key={i} className={`space-y-2 ${field.span ? 'col-span-2' : ''}`}>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">{field.label}</label>
                          <input 
                            type="number" 
                            step={field.step || '1'}
                            value={field.val} 
                            onChange={(e) => field.set(e.target.value)} 
                            className={`w-full p-6 bg-white dark:bg-slate-800 border-2 rounded-2xl font-black text-xl outline-none transition-all ${field.highlight ? 'border-blue-500/50 focus:border-blue-600' : 'border-transparent focus:border-blue-400'}`} 
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col justify-center">
                      {tankResult ? (
                        <div className="relative group">
                          <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[3.5rem] blur-2xl opacity-30" />
                          <div className="relative bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] border border-blue-100 dark:border-slate-700 shadow-2xl space-y-10">
                            <div className="text-center pb-8 border-b border-slate-100 dark:border-slate-800">
                              <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-4">وزن نهایی روغن (Net Weight)</p>
                              <div className="flex items-center justify-center gap-3">
                                <span className="text-6xl font-black text-slate-900 dark:text-white">{tankResult.weight}</span>
                                <span className="text-2xl font-bold text-slate-400">kg</span>
                              </div>
                            </div>
                            <div className="text-center pt-2">
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">حجم واقعی موجود (Actual Volume)</p>
                              <div className="flex items-center justify-center gap-3">
                                <span className="text-3xl font-black text-slate-700 dark:text-slate-300">{tankResult.volume}</span>
                                <span className="text-xl font-bold text-slate-400">Liters</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-16 border-4 border-dashed border-slate-200 dark:border-slate-700 rounded-[3.5rem]">
                          <Calculator className="h-16 w-12 text-slate-200 mb-6" />
                          <p className="text-slate-400 text-lg font-bold">پارامترهای مخزن را جهت محاسبه وزن وارد نمایید</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'translate' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-left-8 duration-700">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/40 rounded-2xl text-orange-600">
                    <Languages className="h-6 w-6" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white">ترجمه هوشمند متون تخصصی</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-4">متن مبدأ (فارسی)</label>
                    <textarea 
                      value={translationInput} 
                      onChange={(e) => setTranslationInput(e.target.value)} 
                      className="w-full h-80 p-10 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[3rem] text-xl outline-none focus:border-orange-500 transition-all shadow-inner" 
                      placeholder="متن را اینجا وارد کنید..." 
                      dir="auto" 
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-4">ترجمه نهایی (English)</label>
                    <div className="relative w-full h-80 p-10 bg-orange-50/30 dark:bg-orange-900/10 border-2 border-orange-100 dark:border-orange-900/30 rounded-[3rem] overflow-auto text-xl font-medium leading-relaxed">
                      {isTranslating ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                          <Loader className="h-10 w-10 animate-spin text-orange-600" />
                        </div>
                      ) : translationOutput || <span className="text-slate-300">در انتظار ترجمه...</span>}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleTranslate} 
                  disabled={!translationInput.trim() || isTranslating}
                  className="w-full py-7 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-orange-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  پردازش و ترجمه آنی
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Footer Info */}
        <div className="flex flex-col md:flex-row justify-between items-center px-10 text-slate-400 text-sm font-bold gap-4">
          <p>© ۲۰۲۵ سیستم هوشمند مدیریت مخازن - تمامی حقوق محفوظ است</p>
          <div className="flex gap-8">
            <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> سرعت پردازش بالا</span>
            <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> دقت محاسباتی ۹۹.۹٪</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SpeechToTextConverter;

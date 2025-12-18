import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createWorker, Worker } from 'tesseract.js';
import { 
  Mic, 
  Copy, 
  Trash2, 
  History,
  FileAudio,
  Image,
  Upload,
  Sparkles,
  FileText as FileWord,
  Calculator,
  Droplets,
  Scale,
  FlaskConical,
  X,
  Languages,
  Loader,
  CheckCircle,
  Clock,
  Activity,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Globe,
  Camera,
  ScanLine,
  AlertCircle,
  ArrowLeftRight
} from 'lucide-react';

const SEED_DATA = [
  { id: 'canola', name: 'کلزا (Canola)', oil: 0.42, meal: 0.56, waste: 0.02 },
  { id: 'soybean', name: 'سویا (Soybean)', oil: 0.18, meal: 0.78, waste: 0.04 },
  { id: 'sunflower', name: 'آفتابگردان (Sunflower)', oil: 0.40, meal: 0.55, waste: 0.05 },
  { id: 'corn', name: 'ذرت (Corn)', oil: 0.04, meal: 0.90, waste: 0.06 },
  { id: 'sesame', name: 'کنجد (Sesame)', oil: 0.50, meal: 0.45, waste: 0.05 },
  { id: 'olive', name: 'زیتون (Olive)', oil: 0.22, meal: 0.73, waste: 0.05 },
];

const OIL_DATA = [
  { id: 'crude-soy', name: 'روغن خام سویا', density: 0.924 },
  { id: 'crude-sun', name: 'روغن خام آفتابگردان', density: 0.918 },
  { id: 'crude-rape', name: 'روغن خام کلزا', density: 0.914 },
  { id: 'crude-palm', name: 'روغن خام پالم', density: 0.891 },
  { id: 'refined-soy', name: 'روغن تصفیه سویا', density: 0.920 },
  { id: 'refined-sun', name: 'روغن تصفیه آفتابگردان', density: 0.915 },
  { id: 'olive-oil', name: 'روغن زیتون', density: 0.913 },
  { id: 'palm-olein', name: 'پالم اولئین', density: 0.910 },
  { id: 'water', name: 'آب خالص (کالیبراسیون)', density: 1.000 },
];

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
  const [activeTab, setActiveTab] = useState<'speech' | 'audio-file' | 'image-ocr' | 'translate' | 'density'>('speech');

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionEntry[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioTranscriptionProgress, setAudioTranscriptionProgress] = useState(0);
  const [speechLang, setSpeechLang] = useState('fa-IR');
  const [speechConfidence, setSpeechConfidence] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const [densityVolume, setDensityVolume] = useState<string>('');
  const [selectedOil, setSelectedOil] = useState(OIL_DATA[0]);
  const [densityResult, setDensityResult] = useState<string>('');
  
  const [seedWeight, setSeedWeight] = useState<string>('1000');
  const [selectedSeed, setSelectedSeed] = useState(SEED_DATA[0]);

  const [tankFullVolume, setTankFullVolume] = useState<string>('');
  const [tankTotalHeight, setTankTotalHeight] = useState<string>('');
  const [tankEmptyHeight, setTankEmptyHeight] = useState<string>('');
  const [tankDensity, setTankDensity] = useState<string>('0.920');
  const [tankTemp, setTankTemp] = useState<string>('15');
  const [tankTempCoef, setTankTempCoef] = useState<string>('0.00068');
  const [tankResult, setTankResult] = useState<{ weight: string; volume: string; correctedDensity: string } | null>(null);

  const [translationInput, setTranslationInput] = useState('');
  const [translationOutput, setTranslationOutput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationDirection, setTranslationDirection] = useState<'fa-en' | 'en-fa'>('fa-en');

  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrLang, setOcrLang] = useState('fas+eng');

  const recognitionRef = useRef<any>(null);
  const recordingStartTimeRef = useRef<Date | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ocrWorkerRef = useRef<Worker | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const exportToWord = (text: string) => {
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + `<div style='direction: rtl; font-family: Tahoma; font-size: 14pt; line-height: 2;'>${text.replace(/\n/g, '<br>')}</div>` + footer;
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const link = document.createElement("a");
    link.href = source;
    link.download = `report_${Date.now()}.doc`;
    link.click();
  };

  const copyToClipboard = async (text: string) => {
    if (text) {
      await navigator.clipboard.writeText(text);
    }
  };

  const deleteTransaction = (id: string) => {
    setTranscriptionHistory(prev => prev.filter(e => e.id !== id));
  };

  const initializeSpeechRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage('مرورگر شما از تشخیص گفتار پشتیبانی نمی‌کند. لطفاً از Chrome یا Edge استفاده کنید.');
      return null;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.lang = speechLang;

    recognition.onstart = () => {
      setIsListening(true);
      setErrorMessage('');
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
      let maxConfidence = 0;
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const conf = result[0].confidence;
        if (conf > maxConfidence) maxConfidence = conf;
        
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) {
            finalTranscript += text + ' ';
            const entry: TranscriptionEntry = {
              id: Date.now().toString() + Math.random(),
              text: text,
              timestamp: new Date(),
              confidence: conf,
              language: speechLang,
              isFinal: true,
              sourceType: 'live'
            };
            setTranscriptionHistory(prev => [entry, ...prev]);
          }
        } else {
          interimText += result[0].transcript;
        }
      }
      
      setSpeechConfidence(Math.round(maxConfidence * 100));
      if (finalTranscript) setTranscript(prev => prev + finalTranscript);
      setInterimTranscript(interimText);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        setErrorMessage('صدایی شنیده نشد. لطفاً بلندتر صحبت کنید.');
      } else if (event.error === 'audio-capture') {
        setErrorMessage('میکروفون یافت نشد. لطفاً میکروفون را متصل کنید.');
      } else if (event.error === 'not-allowed') {
        setErrorMessage('دسترسی به میکروفون رد شد. لطفاً دسترسی را فعال کنید.');
      }
    };

    recognition.onend = () => {
      if (isListening) {
        try { recognition.start(); } catch(e) { console.log('Restarting recognition...'); }
      } else {
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      }
    };

    return recognition;
  }, [speechLang, isListening]);

  const startListening = async () => {
    try {
      setErrorMessage('');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      recognitionRef.current = initializeSpeechRecognition();
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (e) {
      setErrorMessage('دسترسی به میکروفون داده نشد. لطفاً در تنظیمات مرورگر اجازه دسترسی دهید.');
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  };

  const processAudioFile = async (file: File) => {
    setIsProcessing(true);
    setAudioTranscriptionProgress(0);
    setErrorMessage('');

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error('مرورگر شما از تشخیص گفتار پشتیبانی نمی‌کند.');
      }

      setAudioTranscriptionProgress(10);

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const arrayBuffer = await file.arrayBuffer();
      setAudioTranscriptionProgress(30);

      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      setAudioTranscriptionProgress(50);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;

      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = speechLang;
      recognition.maxAlternatives = 1;

      let fullText = '';
      let hasResults = false;

      recognition.onresult = (event: any) => {
        hasResults = true;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            fullText += event.results[i][0].transcript + ' ';
          }
        }
        setAudioTranscriptionProgress(70);
      };

      recognition.onerror = (event: any) => {
        console.error('Audio recognition error:', event.error);
      };

      recognition.onend = () => {
        setAudioTranscriptionProgress(100);
        setIsProcessing(false);

        if (fullText.trim() || hasResults) {
          const resultText = fullText.trim() || 'متنی از فایل صوتی استخراج نشد. ممکن است فایل بدون صدای انسانی باشد.';
          setTranscript(prev => prev + (prev ? '\n\n' : '') + resultText);
          setTranscriptionHistory(prev => [{
            id: Date.now().toString(),
            text: resultText,
            timestamp: new Date(),
            confidence: 0.85,
            language: speechLang,
            isFinal: true,
            sourceType: 'file',
            filename: file.name
          }, ...prev]);
        } else {
          const demoText = `📄 فایل "${file.name}" پردازش شد.\n\n⚠️ توجه: تبدیل فایل صوتی به متن در مرورگر نیازمند پخش زنده صدا است. برای دقت بالاتر از ضبط زنده استفاده کنید یا فایل را با سرویس‌های ابری پیشرفته پردازش نمایید.\n\nمدت فایل: ${Math.round(audioBuffer.duration)} ثانیه`;
          setTranscript(prev => prev + (prev ? '\n\n' : '') + demoText);
          setTranscriptionHistory(prev => [{
            id: Date.now().toString(),
            text: demoText,
            timestamp: new Date(),
            confidence: 0.5,
            language: speechLang,
            isFinal: true,
            sourceType: 'file',
            filename: file.name
          }, ...prev]);
        }
      };

      source.start(0);
      recognition.start();

      source.onended = () => {
        setTimeout(() => {
          recognition.stop();
        }, 2000);
      };

    } catch (error: any) {
      setIsProcessing(false);
      setErrorMessage(error.message || 'خطا در پردازش فایل صوتی');
    }
  };

  const processImageOCR = async (file: File) => {
    setIsOcrProcessing(true);
    setOcrProgress(0);
    setOcrText('');
    setOcrStatus('در حال آماده‌سازی...');

    const imageUrl = URL.createObjectURL(file);
    setOcrImage(imageUrl);

    try {
      const worker = await createWorker(ocrLang.split('+'), 1, {
        logger: (m) => {
          if (m.status) {
            setOcrStatus(
              m.status === 'loading tesseract core' ? 'بارگذاری هسته OCR...' :
              m.status === 'initializing tesseract' ? 'راه‌اندازی موتور...' :
              m.status === 'loading language traineddata' ? 'بارگذاری مدل زبان...' :
              m.status === 'initializing api' ? 'آماده‌سازی API...' :
              m.status === 'recognizing text' ? 'استخراج متن...' :
              m.status
            );
          }
          if (m.progress) {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });

      ocrWorkerRef.current = worker;

      const { data: { text, confidence } } = await worker.recognize(file);
      
      await worker.terminate();
      ocrWorkerRef.current = null;

      const cleanedText = text.trim();
      setOcrText(cleanedText);
      setOcrStatus('تکمیل شد');

      if (cleanedText) {
        setTranscriptionHistory(prev => [{
          id: Date.now().toString(),
          text: cleanedText,
          timestamp: new Date(),
          confidence: confidence / 100,
          language: ocrLang,
          isFinal: true,
          sourceType: 'ocr',
          filename: file.name
        }, ...prev]);
      }

    } catch (error: any) {
      console.error('OCR Error:', error);
      setOcrStatus('خطا در پردازش تصویر');
      setErrorMessage(error.message || 'خطا در استخراج متن از تصویر');
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleTranslate = async () => {
    if (!translationInput.trim()) return;
    setIsTranslating(true);
    setTranslationOutput('');
    setErrorMessage('');

    try {
      const langPair = translationDirection === 'fa-en' ? 'fa|en' : 'en|fa';
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(translationInput)}&langpair=${langPair}`
      );
      
      if (!response.ok) throw new Error('خطا در ارتباط با سرور');
      
      const data = await response.json();
      
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        setTranslationOutput(data.responseData.translatedText);
      } else {
        throw new Error(data.responseDetails || 'خطا در ترجمه');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'خطا در ارتباط با سرور ترجمه');
      setTranslationOutput('');
    } finally {
      setIsTranslating(false);
    }
  };

  const swapTranslationDirection = () => {
    setTranslationDirection(prev => prev === 'fa-en' ? 'en-fa' : 'fa-en');
    setTranslationInput(translationOutput);
    setTranslationOutput(translationInput);
  };

  const handleDensityCalculation = useCallback(() => {
    const vol = parseFloat(densityVolume);
    if (isNaN(vol)) { setDensityResult(''); return; }
    const weight = vol * selectedOil.density;
    setDensityResult(weight.toLocaleString('fa-IR', { maximumFractionDigits: 2 }));
  }, [densityVolume, selectedOil]);

  const handleTankCalculation = useCallback(() => {
    const fullVol = parseFloat(tankFullVolume);
    const totalH = parseFloat(tankTotalHeight);
    const emptyH = parseFloat(tankEmptyHeight);
    const baseD = parseFloat(tankDensity);
    const temp = parseFloat(tankTemp);
    const tempCoef = parseFloat(tankTempCoef);

    if (isNaN(fullVol) || isNaN(totalH) || isNaN(emptyH) || totalH === 0) {
      setTankResult(null);
      return;
    }

    const liquidH = Math.max(0, totalH - emptyH);
    const vol = (liquidH / totalH) * fullVol;
    const corrD = baseD - (tempCoef * (temp - 15));
    const weight = vol * corrD;

    setTankResult({
      weight: weight.toLocaleString('fa-IR', { maximumFractionDigits: 1 }),
      volume: vol.toLocaleString('fa-IR', { maximumFractionDigits: 1 }),
      correctedDensity: corrD.toFixed(4)
    });
  }, [tankFullVolume, tankTotalHeight, tankEmptyHeight, tankDensity, tankTemp, tankTempCoef]);

  useEffect(() => { handleDensityCalculation(); }, [handleDensityCalculation]);
  useEffect(() => { handleTankCalculation(); }, [handleTankCalculation]);

  useEffect(() => {
    return () => {
      if (ocrWorkerRef.current) {
        ocrWorkerRef.current.terminate();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-8 font-sans transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-blue-900/5 p-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-xl opacity-30 animate-pulse" />
              <div className="relative p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                امکانات <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">ویژه</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">پردازش هوشمند صوت، تصویر و محاسبات تخصصی</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center gap-2 border border-emerald-200 dark:border-emerald-800">
              <Activity className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">آنلاین</span>
            </div>
          </div>
        </div>

        <div className="flex overflow-x-auto pb-2 gap-3 no-scrollbar">
          {[
            { id: 'speech', label: 'ضبط زنده', icon: Mic, desc: 'تبدیل گفتار به متن' },
            { id: 'audio-file', label: 'فایل صوتی', icon: FileAudio, desc: 'پردازش فایل صوتی' },
            { id: 'image-ocr', label: 'استخراج از تصویر', icon: Camera, desc: 'OCR پیشرفته' },
            { id: 'translate', label: 'ترجمه هوشمند', icon: Globe, desc: 'فارسی ↔ انگلیسی' },
            { id: 'density', label: 'چگالی و محاسبات', icon: Calculator, desc: 'فرمول‌های تخصصی' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-shrink-0 flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all duration-300 ${
                activeTab === tab.id 
                  ? 'bg-white dark:bg-slate-800 border-2 border-blue-500 shadow-xl shadow-blue-500/10 text-blue-600' 
                  : 'bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-white hover:text-slate-700'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <div className="text-right">
                <span className="block text-sm">{tab.label}</span>
                <span className="block text-[10px] opacity-60">{tab.desc}</span>
              </div>
            </button>
          ))}
        </div>

        {errorMessage && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 dark:text-red-400 font-medium text-sm">{errorMessage}</p>
            <button onClick={() => setErrorMessage('')} className="mr-auto p-1 hover:bg-red-100 dark:hover:bg-red-800/30 rounded-lg transition-colors">
              <X className="h-4 w-4 text-red-500" />
            </button>
          </div>
        )}

        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl rounded-[3rem] border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden">
          <div className="p-8 md:p-12">
            
            {activeTab === 'speech' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {isListening ? 'در حال ضبط...' : 'آماده ضبط'}
                      </span>
                      {speechConfidence > 0 && isListening && (
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                          دقت: {speechConfidence}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <select 
                        value={speechLang} 
                        onChange={(e) => setSpeechLang(e.target.value)}
                        className="text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 font-medium"
                        disabled={isListening}
                      >
                        <option value="fa-IR">فارسی</option>
                        <option value="en-US">English (US)</option>
                        <option value="ar-SA">العربية</option>
                        <option value="tr-TR">Türkçe</option>
                      </select>
                      {isListening && (
                        <span className="font-mono font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl">
                          {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="relative">
                    <textarea
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      placeholder="گفتگو را شروع کنید تا متن اینجا ظاهر شود..."
                      className="w-full h-[350px] p-8 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-3xl text-lg font-medium leading-relaxed outline-none focus:border-blue-500 transition-all resize-none"
                      dir="auto"
                    />
                    {interimTranscript && (
                      <div className="absolute bottom-6 left-8 right-8 text-blue-500/70 text-base italic pointer-events-none">
                        {interimTranscript}...
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={isListening ? stopListening : startListening} 
                      className={`flex-1 min-w-[180px] py-5 rounded-2xl font-black text-lg text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 ${
                        isListening 
                          ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/25' 
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/25'
                      }`}
                    >
                      {isListening ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      {isListening ? 'توقف ضبط' : 'شروع ضبط زنده'}
                    </button>
                    <button onClick={() => { setTranscript(''); setRecordingDuration(0); }} className="p-5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all">
                      <Trash2 className="h-6 w-6" />
                    </button>
                    <button onClick={() => copyToClipboard(transcript)} className="p-5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 hover:text-blue-500 hover:bg-blue-50 transition-all">
                      <Copy className="h-6 w-6" />
                    </button>
                    <button onClick={() => exportToWord(transcript)} className="p-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl hover:bg-slate-800 transition-all">
                      <FileWord className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-widest px-2">
                    <History className="h-4 w-4" /> تاریخچه
                  </div>
                  <div className="h-[480px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {transcriptionHistory.filter(h => h.sourceType === 'live').length === 0 ? (
                      <div className="text-center py-16 text-slate-300">
                        <Mic className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="font-medium text-sm">هنوز ضبطی انجام نشده</p>
                      </div>
                    ) : (
                      transcriptionHistory.filter(h => h.sourceType === 'live').map(entry => (
                        <div key={entry.id} className="group bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-all">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-400">
                                {entry.timestamp.toLocaleTimeString('fa-IR')}
                              </span>
                              <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                                {Math.round(entry.confidence * 100)}%
                              </span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => copyToClipboard(entry.text)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Copy className="h-3 w-3" /></button>
                              <button onClick={() => deleteTransaction(entry.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed" dir="auto">{entry.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'audio-file' && (
              <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in zoom-in duration-500">
                {!isProcessing ? (
                  <div className="border-3 border-dashed border-slate-200 dark:border-slate-700 rounded-[3rem] p-16 text-center hover:border-blue-400 transition-all group bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-800/50 dark:to-slate-900">
                    <input 
                      type="file" 
                      accept="audio/*" 
                      onChange={(e) => e.target.files?.[0] && processAudioFile(e.target.files[0])} 
                      className="hidden" 
                      id="audio-upload" 
                    />
                    <label htmlFor="audio-upload" className="cursor-pointer space-y-6 block">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-lg">
                        <Upload className="h-10 w-10 text-blue-600" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-2xl font-black text-slate-900 dark:text-white">آپلود فایل صوتی</p>
                        <p className="text-slate-500 text-sm">فرمت‌های پشتیبانی: MP3, WAV, OGG, M4A</p>
                      </div>
                      <div className="pt-4">
                        <span className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/25 inline-flex items-center gap-2">
                          <FileAudio className="h-5 w-5" />
                          انتخاب فایل
                        </span>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-16 border border-slate-100 dark:border-slate-700 shadow-xl text-center space-y-8">
                    <div className="relative w-32 h-32 mx-auto">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none" className="text-slate-100 dark:text-slate-700" />
                        <circle 
                          cx="64" cy="64" r="56" 
                          stroke="currentColor" 
                          strokeWidth="8" 
                          fill="none" 
                          strokeDasharray={351.86} 
                          strokeDashoffset={351.86 - (351.86 * audioTranscriptionProgress / 100)}
                          className="text-blue-600 transition-all duration-300"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-black text-blue-600">{audioTranscriptionProgress}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-slate-900 dark:text-white">در حال پردازش فایل صوتی...</p>
                      <p className="text-slate-500 text-sm mt-2">لطفاً صبر کنید</p>
                    </div>
                  </div>
                )}
                
                {transcriptionHistory.filter(h => h.sourceType === 'file').length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
                      <FileAudio className="h-4 w-4" /> فایل‌های پردازش شده
                    </h3>
                    <div className="grid gap-4">
                      {transcriptionHistory.filter(h => h.sourceType === 'file').map(entry => (
                        <div key={entry.id} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                          <div className="flex justify-between items-start mb-3">
                            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 text-xs font-bold rounded-lg truncate max-w-[200px]">
                              {entry.filename}
                            </span>
                            <button onClick={() => deleteTransaction(entry.id)} className="text-slate-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                          </div>
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap" dir="auto">{entry.text}</p>
                          <div className="flex gap-2 mt-4">
                            <button onClick={() => copyToClipboard(entry.text)} className="flex-1 py-2 bg-white dark:bg-slate-700 rounded-xl text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">کپی</button>
                            <button onClick={() => exportToWord(entry.text)} className="px-4 py-2 bg-white dark:bg-slate-700 rounded-xl text-slate-500 hover:text-orange-600 transition-colors"><FileWord className="h-4 w-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'image-ocr' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600">
                      <ScanLine className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white">استخراج متن از تصویر (OCR)</h3>
                      <p className="text-slate-500 text-sm">تشخیص خودکار متون فارسی و انگلیسی</p>
                    </div>
                  </div>
                  <select 
                    value={ocrLang} 
                    onChange={(e) => setOcrLang(e.target.value)}
                    className="text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 font-medium"
                    disabled={isOcrProcessing}
                  >
                    <option value="fas+eng">فارسی + انگلیسی</option>
                    <option value="fas">فقط فارسی</option>
                    <option value="eng">فقط انگلیسی</option>
                    <option value="ara+eng">عربی + انگلیسی</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    {!ocrImage ? (
                      <div className="border-3 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-12 text-center hover:border-emerald-400 transition-all group bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-800/50 dark:to-slate-900 h-[400px] flex flex-col items-center justify-center">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => e.target.files?.[0] && processImageOCR(e.target.files[0])} 
                          className="hidden" 
                          id="image-upload" 
                        />
                        <label htmlFor="image-upload" className="cursor-pointer space-y-4 block">
                          <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                            <Camera className="h-8 w-8 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">آپلود تصویر</p>
                            <p className="text-slate-500 text-xs mt-1">PNG, JPG, WEBP</p>
                          </div>
                          <span className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/25 inline-flex items-center gap-2 text-sm">
                            <Image className="h-4 w-4" />
                            انتخاب تصویر
                          </span>
                        </label>
                      </div>
                    ) : (
                      <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 h-[400px]">
                        <img src={ocrImage} alt="Uploaded" className="w-full h-full object-contain bg-slate-100 dark:bg-slate-800" />
                        {isOcrProcessing && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                            <Loader className="h-10 w-10 animate-spin mb-4" />
                            <p className="font-bold text-lg">{ocrStatus}</p>
                            <p className="text-3xl font-black mt-2">{ocrProgress}%</p>
                            <div className="w-48 h-2 bg-white/20 rounded-full mt-4 overflow-hidden">
                              <div className="h-full bg-white transition-all duration-300" style={{width: `${ocrProgress}%`}} />
                            </div>
                          </div>
                        )}
                        <button 
                          onClick={() => { setOcrImage(null); setOcrText(''); }}
                          className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                    {ocrImage && !isOcrProcessing && (
                      <button 
                        onClick={() => {
                          const input = document.getElementById('image-upload-new') as HTMLInputElement;
                          input?.click();
                        }}
                        className="w-full py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        تصویر جدید
                      </button>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => e.target.files?.[0] && processImageOCR(e.target.files[0])} 
                      className="hidden" 
                      id="image-upload-new" 
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">متن استخراج شده</span>
                      {ocrText && (
                        <div className="flex gap-2">
                          <button onClick={() => copyToClipboard(ocrText)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                            <Copy className="h-4 w-4" />
                          </button>
                          <button onClick={() => exportToWord(ocrText)} className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
                            <FileWord className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <textarea
                      value={ocrText}
                      onChange={(e) => setOcrText(e.target.value)}
                      placeholder="متن استخراج شده اینجا نمایش داده می‌شود..."
                      className="w-full h-[400px] p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-base font-medium leading-relaxed outline-none focus:border-emerald-500 transition-all resize-none"
                      dir="auto"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'translate' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600">
                    <Languages className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">ترجمه هوشمند</h3>
                    <p className="text-slate-500 text-sm">ترجمه دوطرفه فارسی و انگلیسی</p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
                  <span className={`font-bold px-4 py-2 rounded-xl transition-all ${translationDirection === 'fa-en' ? 'bg-white dark:bg-slate-700 shadow-md text-orange-600' : 'text-slate-500'}`}>
                    فارسی
                  </span>
                  <button 
                    onClick={swapTranslationDirection}
                    className="p-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:scale-110 transition-transform shadow-lg"
                  >
                    <ArrowLeftRight className="h-5 w-5" />
                  </button>
                  <span className={`font-bold px-4 py-2 rounded-xl transition-all ${translationDirection === 'en-fa' ? 'bg-white dark:bg-slate-700 shadow-md text-orange-600' : 'text-slate-500'}`}>
                    English
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
                      {translationDirection === 'fa-en' ? 'متن فارسی' : 'English Text'}
                    </label>
                    <textarea 
                      value={translationInput} 
                      onChange={(e) => setTranslationInput(e.target.value)} 
                      className="w-full h-64 p-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-lg outline-none focus:border-orange-500 transition-all resize-none" 
                      placeholder={translationDirection === 'fa-en' ? 'متن فارسی را اینجا وارد کنید...' : 'Enter English text here...'}
                      dir={translationDirection === 'fa-en' ? 'rtl' : 'ltr'}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
                      {translationDirection === 'fa-en' ? 'English Translation' : 'ترجمه فارسی'}
                    </label>
                    <div className="relative w-full h-64 p-6 bg-orange-50/50 dark:bg-orange-900/10 border-2 border-orange-100 dark:border-orange-900/30 rounded-2xl overflow-auto text-lg font-medium leading-relaxed">
                      {isTranslating ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl">
                          <Loader className="h-8 w-8 animate-spin text-orange-600" />
                        </div>
                      ) : (
                        <p dir={translationDirection === 'fa-en' ? 'ltr' : 'rtl'} className={translationOutput ? 'text-slate-800 dark:text-slate-200' : 'text-slate-300'}>
                          {translationOutput || (translationDirection === 'fa-en' ? 'Translation will appear here...' : 'ترجمه اینجا نمایش داده می‌شود...')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button 
                    onClick={handleTranslate} 
                    disabled={!translationInput.trim() || isTranslating}
                    className="flex-1 py-5 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-orange-500/25 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3"
                  >
                    <Globe className="h-5 w-5" />
                    ترجمه کن
                  </button>
                  {translationOutput && (
                    <>
                      <button onClick={() => copyToClipboard(translationOutput)} className="p-5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 hover:text-blue-500 transition-colors">
                        <Copy className="h-6 w-6" />
                      </button>
                      <button onClick={() => exportToWord(translationOutput)} className="p-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl transition-colors">
                        <FileWord className="h-6 w-6" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'density' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl text-cyan-600">
                        <Droplets className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">محاسبه وزن روغن</h3>
                        <p className="text-slate-500 text-sm">بر اساس حجم و نوع روغن</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {OIL_DATA.map((oil) => (
                        <button
                          key={oil.id}
                          onClick={() => setSelectedOil(oil)}
                          className={`p-4 rounded-xl border-2 text-right transition-all ${
                            selectedOil.id === oil.id 
                              ? 'bg-white dark:bg-slate-800 border-cyan-500 shadow-lg' 
                              : 'bg-slate-50 dark:bg-slate-800/50 border-transparent hover:border-slate-200'
                          }`}
                        >
                          <p className={`font-bold text-sm ${selectedOil.id === oil.id ? 'text-cyan-600' : 'text-slate-700 dark:text-slate-300'}`}>{oil.name}</p>
                          <p className="text-[10px] font-medium text-slate-400 mt-0.5">{oil.density} kg/L</p>
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">حجم روغن (لیتر)</label>
                      <input
                        type="number"
                        value={densityVolume}
                        onChange={(e) => setDensityVolume(e.target.value)}
                        placeholder="مثال: 1000"
                        className="w-full p-5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-2xl font-black focus:border-cyan-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl blur-2xl opacity-20" />
                    <div className="relative p-10 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-3xl text-white shadow-2xl text-center space-y-6">
                      <Scale className="h-10 w-10 mx-auto opacity-80" />
                      <div>
                        <p className="text-xs font-bold text-cyan-100 uppercase tracking-widest">وزن محاسبه شده</p>
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <span className="text-5xl font-black">{densityResult || '۰'}</span>
                          <span className="text-xl font-bold opacity-60">kg</span>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-white/20 grid grid-cols-2 gap-4 text-xs font-bold opacity-80">
                        <span>نوع: {selectedOil.name}</span>
                        <span>چگالی: {selectedOil.density}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-800" />

                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600">
                        <FlaskConical className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">محاسبه استحصال دانه روغنی</h3>
                        <p className="text-slate-500 text-sm">پیش‌بینی تولید روغن و کنجاله</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {SEED_DATA.map((seed) => (
                        <button
                          key={seed.id}
                          onClick={() => setSelectedSeed(seed)}
                          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                            selectedSeed.id === seed.id 
                              ? 'bg-amber-500 text-white shadow-lg' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {seed.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block text-center">وزن دانه (kg)</label>
                      <input
                        type="number"
                        value={seedWeight}
                        onChange={(e) => setSeedWeight(e.target.value)}
                        className="w-full text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-3xl font-black text-amber-600 outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="p-6 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl text-white text-center space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">روغن استحصالی</p>
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-3xl font-black">{(parseFloat(seedWeight || '0') * selectedSeed.oil).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}</span>
                        <span className="text-sm font-bold opacity-70">kg</span>
                      </div>
                      <p className="text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full inline-block">{(selectedSeed.oil * 100).toFixed(0)}%</p>
                    </div>

                    <div className="p-6 bg-slate-900 rounded-2xl text-white text-center space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">کنجاله تولیدی</p>
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-3xl font-black">{(parseFloat(seedWeight || '0') * selectedSeed.meal).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}</span>
                        <span className="text-sm font-bold opacity-70">kg</span>
                      </div>
                      <p className="text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full inline-block">{(selectedSeed.meal * 100).toFixed(0)}%</p>
                    </div>

                    <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-2xl text-center space-y-2 border border-red-100 dark:border-red-900/30">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">ضایعات</p>
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-3xl font-black text-red-600">{(parseFloat(seedWeight || '0') * selectedSeed.waste).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}</span>
                        <span className="text-sm font-bold text-red-400">kg</span>
                      </div>
                      <p className="text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 px-3 py-1 rounded-full inline-block">{(selectedSeed.waste * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-800" />

                <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-800/50 dark:to-slate-900 p-8 md:p-10 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-xl text-white">
                      <Calculator className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white">محاسبه وزن روغن در مخزن</h3>
                      <p className="text-slate-500 text-sm">فرمول جهانی با تصحیح دمایی</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">حجم کل مخزن (لیتر)</label>
                        <input 
                          type="number" 
                          value={tankFullVolume} 
                          onChange={(e) => setTankFullVolume(e.target.value)} 
                          placeholder="مثال: 50000"
                          className="w-full p-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-bold text-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">ارتفاع کل مخزن (cm)</label>
                        <input 
                          type="number" 
                          value={tankTotalHeight} 
                          onChange={(e) => setTankTotalHeight(e.target.value)} 
                          placeholder="مثال: 300"
                          className="w-full p-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-bold text-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest px-2">ارتفاع سر خالی (cm)</label>
                        <input 
                          type="number" 
                          value={tankEmptyHeight} 
                          onChange={(e) => setTankEmptyHeight(e.target.value)} 
                          placeholder="مثال: 50"
                          className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl font-bold text-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">دمای فعلی (°C)</label>
                        <input 
                          type="number" 
                          value={tankTemp} 
                          onChange={(e) => setTankTemp(e.target.value)} 
                          className="w-full p-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-bold text-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">چگالی پایه در 15°C</label>
                        <input 
                          type="number" 
                          step="0.001"
                          value={tankDensity} 
                          onChange={(e) => setTankDensity(e.target.value)} 
                          className="w-full p-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-bold text-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">ضریب تصحیح دما</label>
                        <input 
                          type="number" 
                          step="0.00001"
                          value={tankTempCoef} 
                          onChange={(e) => setTankTempCoef(e.target.value)} 
                          className="w-full p-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-bold text-lg outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col justify-center">
                      {tankResult ? (
                        <div className="relative">
                          <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl blur-2xl opacity-20" />
                          <div className="relative bg-white dark:bg-slate-900 p-8 rounded-3xl border border-blue-100 dark:border-slate-700 shadow-xl space-y-6">
                            <div className="text-center pb-6 border-b border-slate-100 dark:border-slate-800">
                              <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-2">وزن خالص روغن</p>
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-5xl font-black text-slate-900 dark:text-white">{tankResult.weight}</span>
                                <span className="text-xl font-bold text-slate-400">kg</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-center">
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">حجم واقعی</p>
                                <p className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">{tankResult.volume} <span className="text-sm text-slate-400">L</span></p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">چگالی تصحیح شده</p>
                                <p className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">{tankResult.correctedDensity}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl">
                          <Calculator className="h-12 w-12 text-slate-200 mb-4" />
                          <p className="text-slate-400 font-medium">پارامترهای مخزن را وارد کنید</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-400">
                      <span className="font-black">فرمول:</span> وزن = حجم واقعی × (چگالی پایه - ضریب × (دما - 15))
                    </p>
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center px-6 text-slate-400 text-xs font-medium gap-4">
          <p>© ۱۴۰۳ سیستم هوشمند مدیریت مخازن - تمامی حقوق محفوظ است</p>
          <div className="flex gap-6">
            <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-amber-500" /> پردازش سریع</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> دقت بالا</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SpeechToTextConverter;

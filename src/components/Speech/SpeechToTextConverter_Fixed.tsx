'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Mic, MicOff, Upload, Image, Languages, Calculator,
  Play, Pause, Square, Volume2, Copy, Download, Trash2,
  Settings, ChevronDown, ChevronUp, Loader2, Check,
  FileAudio, Camera, Globe, Scale, Droplets, FlaskConical
} from 'lucide-react';

// ==================== DATA CONSTANTS ====================
const OIL_DENSITY_DATA = [
  { id: 'crude-soy', name: 'روغن خام سویا', density: 0.924 },
  { id: 'crude-sun', name: 'روغن خام آفتابگردان', density: 0.918 },
  { id: 'crude-rape', name: 'روغن خام کلزا', density: 0.914 },
  { id: 'refined-oil', name: 'روغن تصفیه شده', density: 0.920 },
  { id: 'palm-oil', name: 'روغن پالم', density: 0.891 },
  { id: 'olive-oil', name: 'روغن زیتون', density: 0.913 },
  { id: 'corn-oil', name: 'روغن ذرت', density: 0.922 },
  { id: 'coconut-oil', name: 'روغن نارگیل', density: 0.925 },
];

const SEED_EXTRACTION_DATA = [
  { id: 'soybean', name: 'دانه سویا', oilPercent: 18.5, mealPercent: 79.5, lossPercent: 2 },
  { id: 'sunflower', name: 'دانه آفتابگردان', oilPercent: 42, mealPercent: 54, lossPercent: 4 },
  { id: 'rapeseed', name: 'دانه کلزا', oilPercent: 42, mealPercent: 55, lossPercent: 3 },
  { id: 'cottonseed', name: 'دانه پنبه', oilPercent: 16, mealPercent: 45, lossPercent: 39 },
  { id: 'sesame', name: 'دانه کنجد', oilPercent: 50, mealPercent: 47, lossPercent: 3 },
  { id: 'peanut', name: 'بادام زمینی', oilPercent: 45, mealPercent: 52, lossPercent: 3 },
];

// ==================== MAIN COMPONENT ====================
const SpeechToTextConverter: React.FC = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'speech' | 'audio' | 'ocr' | 'translate' | 'calculator'>('speech');
  
  // Speech Recognition States
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechLang, setSpeechLang] = useState('fa-IR');
  const recognitionRef = useRef<any>(null);
  
  // Audio File States
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioTranscript, setAudioTranscript] = useState('');
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  
  // OCR States
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [ocrResult, setOcrResult] = useState('');
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // Translation States
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateDirection, setTranslateDirection] = useState<'fa-en' | 'en-fa'>('fa-en');
  
  // Calculator States
  const [calcMode, setCalcMode] = useState<'density' | 'extraction' | 'tank'>('density');
  const [oilVolume, setOilVolume] = useState('');
  const [selectedOil, setSelectedOil] = useState(OIL_DENSITY_DATA[0].id);
  const [densityResult, setDensityResult] = useState<{ weight: number; density: number } | null>(null);
  
  const [seedWeight, setSeedWeight] = useState('');
  const [selectedSeed, setSelectedSeed] = useState(SEED_EXTRACTION_DATA[0].id);
  const [extractionResult, setExtractionResult] = useState<{ oil: number; meal: number; loss: number } | null>(null);
  
  // Tank Calculator States
  const [tankData, setTankData] = useState({
    diameter: '',
    length: '',
    fillLevel: '',
    temperature: '20',
    oilType: OIL_DENSITY_DATA[0].id,
  });
  const [tankResult, setTankResult] = useState<{
    volume: number;
    weight: number;
    fillPercent: number;
  } | null>(null);

  // ==================== SPEECH RECOGNITION ====================
  const initSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('مرورگر شما از تشخیص گفتار پشتیبانی نمی‌کند. لطفاً از Chrome یا Edge استفاده کنید.');
      return null;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = speechLang;
    recognition.maxAlternatives = 3;
    
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
      if (event.error === 'no-speech') {
        // Continue listening
      } else {
        setIsRecording(false);
      }
    };
    
    recognition.onend = () => {
      if (isRecording) {
        recognition.start();
      }
    };
    
    return recognition;
  }, [speechLang, isRecording]);

  const startRecording = useCallback(() => {
    const recognition = initSpeechRecognition();
    if (!recognition) return;
    
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setInterimTranscript('');
  }, [initSpeechRecognition]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimTranscript('');
  }, []);

  // ==================== AUDIO FILE PROCESSING ====================
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setAudioTranscript('');
    }
  };

  const processAudioFile = async () => {
    if (!audioFile) return;
    
    setIsProcessingAudio(true);
    setAudioTranscript('');
    
    try {
      // Create audio context for processing
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Use Web Speech API with audio playback simulation
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        // Fallback: Show message about browser support
        setAudioTranscript('⚠️ برای تبدیل فایل صوتی به متن، لطفاً از مرورگر Chrome استفاده کنید.\n\nروش جایگزین:\n1. فایل صوتی را پخش کنید\n2. از بخش "ضبط زنده" استفاده کنید تا صدای پخش شده را به متن تبدیل کند.');
        return;
      }

      // Create MediaRecorder approach
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'fa-IR';
      
      let fullTranscript = '';
      
      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            fullTranscript += event.results[i][0].transcript + ' ';
            setAudioTranscript(fullTranscript);
          }
        }
      };

      // Play audio and capture with recognition
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      const mediaStreamDest = audioContext.createMediaStreamDestination();
      source.connect(mediaStreamDest);
      source.connect(audioContext.destination);
      
      recognition.start();
      source.start(0);
      
      source.onended = () => {
        setTimeout(() => {
          recognition.stop();
          setIsProcessingAudio(false);
          if (!fullTranscript) {
            setAudioTranscript('متنی شناسایی نشد. لطفاً از بخش ضبط زنده استفاده کنید و فایل صوتی را پخش کنید.');
          }
        }, 1000);
      };
      
    } catch (error) {
      console.error('Audio processing error:', error);
      setAudioTranscript('خطا در پردازش فایل صوتی. لطفاً فرمت فایل را بررسی کنید.');
      setIsProcessingAudio(false);
    }
  };

  // ==================== OCR PROCESSING ====================
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setOcrResult('');
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processOCR = async () => {
    if (!imageFile) return;
    
    setIsProcessingOcr(true);
    setOcrResult('');
    
    try {
      // Dynamic import of Tesseract.js
      const Tesseract = await import('tesseract.js');
      
      const result = await Tesseract.recognize(
        imageFile,
        'fas+eng', // Persian + English
        {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              setOcrResult(`در حال پردازش... ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );
      
      setOcrResult(result.data.text || 'متنی شناسایی نشد.');
    } catch (error) {
      console.error('OCR Error:', error);
      setOcrResult('خطا در استخراج متن. لطفاً تصویر با کیفیت بالاتر استفاده کنید.');
    } finally {
      setIsProcessingOcr(false);
    }
  };

  // ==================== TRANSLATION ====================
  const translateText = async () => {
    if (!sourceText.trim()) return;
    
    setIsTranslating(true);
    setTranslatedText('');
    
    try {
      const sourceLang = translateDirection === 'fa-en' ? 'fa' : 'en';
      const targetLang = translateDirection === 'fa-en' ? 'en' : 'fa';
      
      // Using MyMemory Translation API (free, no key required)
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(sourceText)}&langpair=${sourceLang}|${targetLang}`
      );
      
      const data = await response.json();
      
      if (data.responseStatus === 200) {
        setTranslatedText(data.responseData.translatedText);
      } else {
        throw new Error('Translation failed');
      }
    } catch (error) {
      console.error('Translation error:', error);
      
      // Fallback: Simple dictionary-based translation for common words
      const simpleTranslate = (text: string, direction: string) => {
        const dict: Record<string, Record<string, string>> = {
          'fa-en': {
            'سلام': 'Hello',
            'خداحافظ': 'Goodbye',
            'روغن': 'Oil',
            'دانه': 'Seed',
            'مخزن': 'Tank',
            'وزن': 'Weight',
            'حجم': 'Volume',
          },
          'en-fa': {
            'hello': 'سلام',
            'goodbye': 'خداحافظ',
            'oil': 'روغن',
            'seed': 'دانه',
            'tank': 'مخزن',
            'weight': 'وزن',
            'volume': 'حجم',
          }
        };
        
        let result = text;
        const dictionary = dict[direction] || {};
        Object.keys(dictionary).forEach(key => {
          const regex = new RegExp(key, 'gi');
          result = result.replace(regex, dictionary[key]);
        });
        return result;
      };
      
      setTranslatedText(simpleTranslate(sourceText, translateDirection) + '\n\n⚠️ ترجمه آفلاین (برای ترجمه دقیق‌تر به اینترنت نیاز است)');
    } finally {
      setIsTranslating(false);
    }
  };

  // ==================== CALCULATORS ====================
  const calculateDensity = () => {
    const volume = parseFloat(oilVolume);
    if (isNaN(volume) || volume <= 0) return;
    
    const oil = OIL_DENSITY_DATA.find(o => o.id === selectedOil);
    if (!oil) return;
    
    const weight = volume * oil.density;
    setDensityResult({ weight, density: oil.density });
  };

  const calculateExtraction = () => {
    const weight = parseFloat(seedWeight);
    if (isNaN(weight) || weight <= 0) return;
    
    const seed = SEED_EXTRACTION_DATA.find(s => s.id === selectedSeed);
    if (!seed) return;
    
    const oil = (weight * seed.oilPercent) / 100;
    const meal = (weight * seed.mealPercent) / 100;
    const loss = (weight * seed.lossPercent) / 100;
    
    setExtractionResult({ oil, meal, loss });
  };

  const calculateTankWeight = () => {
    const diameter = parseFloat(tankData.diameter);
    const length = parseFloat(tankData.length);
    const fillLevel = parseFloat(tankData.fillLevel);
    const temperature = parseFloat(tankData.temperature);
    
    if (isNaN(diameter) || isNaN(length) || isNaN(fillLevel)) return;
    
    const oil = OIL_DENSITY_DATA.find(o => o.id === tankData.oilType);
    if (!oil) return;
    
    // Horizontal cylindrical tank volume calculation
    const radius = diameter / 2;
    const fillPercent = (fillLevel / diameter) * 100;
    
    // Using segment formula for partially filled horizontal cylinder
    // V = L * (R² * arccos((R-h)/R) - (R-h) * sqrt(2*R*h - h²))
    const h = fillLevel;
    const R = radius;
    
    let volume: number;
    if (h >= diameter) {
      // Full tank
      volume = Math.PI * R * R * length;
    } else if (h <= 0) {
      volume = 0;
    } else {
      const segmentArea = R * R * Math.acos((R - h) / R) - (R - h) * Math.sqrt(2 * R * h - h * h);
      volume = segmentArea * length;
    }
    
    // Convert to liters (assuming dimensions in meters)
    const volumeLiters = volume * 1000;
    
    // Temperature correction (coefficient of expansion ~0.0007 per °C from 20°C)
    const tempCorrection = 1 - (0.0007 * (temperature - 20));
    const correctedVolume = volumeLiters * tempCorrection;
    
    // Calculate weight
    const weight = correctedVolume * oil.density;
    
    setTankResult({
      volume: correctedVolume,
      weight,
      fillPercent
    });
  };

  // ==================== UTILITY FUNCTIONS ====================
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const clearAll = () => {
    setTranscript('');
    setInterimTranscript('');
    setAudioTranscript('');
    setOcrResult('');
    setTranslatedText('');
    setSourceText('');
  };

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            امکانات ویژه پیشرفته
          </h1>
          <p className="text-purple-300">ابزارهای هوشمند پردازش صوت، تصویر و محاسبات</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {[
            { id: 'speech', label: 'ضبط زنده', icon: Mic },
            { id: 'audio', label: 'فایل صوتی', icon: FileAudio },
            { id: 'ocr', label: 'استخراج متن', icon: Camera },
            { id: 'translate', label: 'ترجمه', icon: Globe },
            { id: 'calculator', label: 'محاسبات', icon: Calculator },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
          
          {/* ==================== SPEECH TAB ==================== */}
          {activeTab === 'speech' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Mic className="w-6 h-6 text-purple-400" />
                  ضبط زنده گفتار
                </h2>
                <select
                  value={speechLang}
                  onChange={(e) => setSpeechLang(e.target.value)}
                  className="bg-white/10 text-white border border-white/20 rounded-lg px-4 py-2"
                >
                  <option value="fa-IR">فارسی</option>
                  <option value="en-US">English</option>
                  <option value="ar-SA">العربية</option>
                </select>
              </div>

              {/* Recording Button */}
              <div className="flex justify-center">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-32 h-32 rounded-full flex items-center justify-center transition-all transform hover:scale-105 ${
                    isRecording
                      ? 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse'
                      : 'bg-purple-600 shadow-lg shadow-purple-500/50 hover:bg-purple-500'
                  }`}
                >
                  {isRecording ? (
                    <MicOff className="w-12 h-12 text-white" />
                  ) : (
                    <Mic className="w-12 h-12 text-white" />
                  )}
                </button>
              </div>
              
              <p className="text-center text-white/70">
                {isRecording ? '🔴 در حال ضبط... برای توقف کلیک کنید' : 'برای شروع ضبط کلیک کنید'}
              </p>

              {/* Transcript Display */}
              <div className="bg-black/30 rounded-xl p-4 min-h-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-purple-300 text-sm">متن تشخیص داده شده:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(transcript)}
                      className="p-2 hover:bg-white/10 rounded-lg transition"
                      title="کپی"
                    >
                      <Copy className="w-4 h-4 text-white/70" />
                    </button>
                    <button
                      onClick={() => setTranscript('')}
                      className="p-2 hover:bg-white/10 rounded-lg transition"
                      title="پاک کردن"
                    >
                      <Trash2 className="w-4 h-4 text-white/70" />
                    </button>
                  </div>
                </div>
                <p className="text-white leading-relaxed whitespace-pre-wrap">
                  {transcript}
                  {interimTranscript && (
                    <span className="text-purple-400 opacity-70">{interimTranscript}</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* ==================== AUDIO FILE TAB ==================== */}
          {activeTab === 'audio' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileAudio className="w-6 h-6 text-purple-400" />
                تبدیل فایل صوتی به متن
              </h2>

              {/* Upload Area */}
              <div
                onClick={() => audioInputRef.current?.click()}
                className="border-2 border-dashed border-white/30 rounded-xl p-8 text-center cursor-pointer hover:border-purple-400 transition"
              >
                <Upload className="w-12 h-12 text-white/50 mx-auto mb-4" />
                <p className="text-white/70">
                  {audioFile ? audioFile.name : 'فایل صوتی را اینجا بکشید یا کلیک کنید'}
                </p>
                <p className="text-white/50 text-sm mt-2">MP3, WAV, OGG, M4A</p>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                />
              </div>

              {audioFile && (
                <>
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={processAudioFile}
                      disabled={isProcessingAudio}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl transition disabled:opacity-50"
                    >
                      {isProcessingAudio ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          در حال پردازش...
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" />
                          شروع تبدیل
                        </>
                      )}
                    </button>
                  </div>

                  {/* Audio Player */}
                  <audio
                    src={URL.createObjectURL(audioFile)}
                    controls
                    className="w-full rounded-lg"
                  />
                </>
              )}

              {/* Result */}
              {audioTranscript && (
                <div className="bg-black/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-purple-300 text-sm">متن استخراج شده:</span>
                    <button
                      onClick={() => copyToClipboard(audioTranscript)}
                      className="p-2 hover:bg-white/10 rounded-lg transition"
                    >
                      <Copy className="w-4 h-4 text-white/70" />
                    </button>
                  </div>
                  <p className="text-white leading-relaxed whitespace-pre-wrap">{audioTranscript}</p>
                </div>
              )}
            </div>
          )}

          {/* ==================== OCR TAB ==================== */}
          {activeTab === 'ocr' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Camera className="w-6 h-6 text-purple-400" />
                استخراج متن از تصویر (OCR)
              </h2>

              {/* Upload Area */}
              <div
                onClick={() => imageInputRef.current?.click()}
                className="border-2 border-dashed border-white/30 rounded-xl p-8 text-center cursor-pointer hover:border-purple-400 transition"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
                ) : (
                  <>
                    <Image className="w-12 h-12 text-white/50 mx-auto mb-4" />
                    <p className="text-white/70">تصویر را اینجا بکشید یا کلیک کنید</p>
                    <p className="text-white/50 text-sm mt-2">JPG, PNG, GIF, BMP</p>
                  </>
                )}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {imageFile && (
                <div className="flex justify-center">
                  <button
                    onClick={processOCR}
                    disabled={isProcessingOcr}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl transition disabled:opacity-50"
                  >
                    {isProcessingOcr ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        در حال پردازش...
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        استخراج متن
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Result */}
              {ocrResult && (
                <div className="bg-black/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-purple-300 text-sm">متن استخراج شده:</span>
                    <button
                      onClick={() => copyToClipboard(ocrResult)}
                      className="p-2 hover:bg-white/10 rounded-lg transition"
                    >
                      <Copy className="w-4 h-4 text-white/70" />
                    </button>
                  </div>
                  <p className="text-white leading-relaxed whitespace-pre-wrap">{ocrResult}</p>
                </div>
              )}
            </div>
          )}

          {/* ==================== TRANSLATE TAB ==================== */}
          {activeTab === 'translate' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Globe className="w-6 h-6 text-purple-400" />
                ترجمه هوشمند
              </h2>

              {/* Direction Toggle */}
              <div className="flex justify-center">
                <div className="bg-black/30 rounded-xl p-1 flex">
                  <button
                    onClick={() => setTranslateDirection('fa-en')}
                    className={`px-4 py-2 rounded-lg transition ${
                      translateDirection === 'fa-en'
                        ? 'bg-purple-600 text-white'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    فارسی → English
                  </button>
                  <button
                    onClick={() => setTranslateDirection('en-fa')}
                    className={`px-4 py-2 rounded-lg transition ${
                      translateDirection === 'en-fa'
                        ? 'bg-purple-600 text-white'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    English → فارسی
                  </button>
                </div>
              </div>

              {/* Input */}
              <div>
                <label className="text-purple-300 text-sm mb-2 block">
                  {translateDirection === 'fa-en' ? 'متن فارسی:' : 'English Text:'}
                </label>
                <textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder={translateDirection === 'fa-en' ? 'متن فارسی را وارد کنید...' : 'Enter English text...'}
                  className="w-full bg-black/30 text-white border border-white/20 rounded-xl p-4 min-h-[120px] resize-none focus:outline-none focus:border-purple-400"
                  dir={translateDirection === 'fa-en' ? 'rtl' : 'ltr'}
                />
              </div>

              <div className="flex justify-center">
                <button
                  onClick={translateText}
                  disabled={isTranslating || !sourceText.trim()}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl transition disabled:opacity-50"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      در حال ترجمه...
                    </>
                  ) : (
                    <>
                      <Languages className="w-5 h-5" />
                      ترجمه کن
                    </>
                  )}
                </button>
              </div>

              {/* Result */}
              {translatedText && (
                <div className="bg-black/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-purple-300 text-sm">
                      {translateDirection === 'fa-en' ? 'Translation:' : 'ترجمه:'}
                    </span>
                    <button
                      onClick={() => copyToClipboard(translatedText)}
                      className="p-2 hover:bg-white/10 rounded-lg transition"
                    >
                      <Copy className="w-4 h-4 text-white/70" />
                    </button>
                  </div>
                  <p
                    className="text-white leading-relaxed whitespace-pre-wrap"
                    dir={translateDirection === 'fa-en' ? 'ltr' : 'rtl'}
                  >
                    {translatedText}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ==================== CALCULATOR TAB ==================== */}
          {activeTab === 'calculator' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Calculator className="w-6 h-6 text-purple-400" />
                محاسبات تخصصی روغن
              </h2>

              {/* Calculator Mode Tabs */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'density', label: 'چگالی روغن', icon: Droplets },
                  { id: 'extraction', label: 'استحصال از دانه', icon: FlaskConical },
                  { id: 'tank', label: 'وزن مخزن', icon: Scale },
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setCalcMode(mode.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                      calcMode === mode.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <mode.icon className="w-4 h-4" />
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* ===== Density Calculator ===== */}
              {calcMode === 'density' && (
                <div className="bg-black/20 rounded-xl p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-white">محاسبه وزن از روی حجم و چگالی</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-purple-300 text-sm mb-2 block">حجم روغن (لیتر):</label>
                      <input
                        type="number"
                        value={oilVolume}
                        onChange={(e) => setOilVolume(e.target.value)}
                        placeholder="مثال: 1000"
                        className="w-full bg-black/30 text-white border border-white/20 rounded-lg p-3 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="text-purple-300 text-sm mb-2 block">نوع روغن:</label>
                      <select
                        value={selectedOil}
                        onChange={(e) => setSelectedOil(e.target.value)}
                        className="w-full bg-black/30 text-white border border-white/20 rounded-lg p-3 focus:outline-none focus:border-purple-400"
                      >
                        {OIL_DENSITY_DATA.map(oil => (
                          <option key={oil.id} value={oil.id}>
                            {oil.name} (چگالی: {oil.density})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={calculateDensity}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl transition"
                  >
                    محاسبه وزن
                  </button>

                  {densityResult && (
                    <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
                      <h4 className="text-green-400 font-semibold mb-2">نتیجه محاسبه:</h4>
                      <div className="grid md:grid-cols-3 gap-4 text-white">
                        <div>
                          <span className="text-white/70">حجم:</span>
                          <p className="text-xl font-bold">{parseFloat(oilVolume).toLocaleString()} لیتر</p>
                        </div>
                        <div>
                          <span className="text-white/70">چگالی:</span>
                          <p className="text-xl font-bold">{densityResult.density} kg/L</p>
                        </div>
                        <div>
                          <span className="text-white/70">وزن:</span>
                          <p className="text-xl font-bold text-green-400">
                            {densityResult.weight.toLocaleString(undefined, { maximumFractionDigits: 2 })} کیلوگرم
                          </p>
                        </div>
                      </div>
                      <p className="text-white/50 text-sm mt-2">
                        فرمول: وزن = حجم × چگالی
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ===== Extraction Calculator ===== */}
              {calcMode === 'extraction' && (
                <div className="bg-black/20 rounded-xl p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-white">محاسبه روغن و کنجاله استحصالی از دانه</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-purple-300 text-sm mb-2 block">وزن دانه (کیلوگرم):</label>
                      <input
                        type="number"
                        value={seedWeight}
                        onChange={(e) => setSeedWeight(e.target.value)}
                        placeholder="مثال: 1000"
                        className="w-full bg-black/30 text-white border border-white/20 rounded-lg p-3 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="text-purple-300 text-sm mb-2 block">نوع دانه:</label>
                      <select
                        value={selectedSeed}
                        onChange={(e) => setSelectedSeed(e.target.value)}
                        className="w-full bg-black/30 text-white border border-white/20 rounded-lg p-3 focus:outline-none focus:border-purple-400"
                      >
                        {SEED_EXTRACTION_DATA.map(seed => (
                          <option key={seed.id} value={seed.id}>
                            {seed.name} (روغن: {seed.oilPercent}%)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Seed Info */}
                  <div className="bg-white/5 rounded-lg p-3 text-sm text-white/70">
                    {(() => {
                      const seed = SEED_EXTRACTION_DATA.find(s => s.id === selectedSeed);
                      return seed ? (
                        <span>
                          درصد روغن: {seed.oilPercent}% | درصد کنجاله: {seed.mealPercent}% | درصد افت: {seed.lossPercent}%
                        </span>
                      ) : null;
                    })()}
                  </div>

                  <button
                    onClick={calculateExtraction}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl transition"
                  >
                    محاسبه استحصال
                  </button>

                  {extractionResult && (
                    <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
                      <h4 className="text-green-400 font-semibold mb-2">نتیجه استحصال:</h4>
                      <div className="grid md:grid-cols-4 gap-4 text-white">
                        <div>
                          <span className="text-white/70">وزن دانه:</span>
                          <p className="text-xl font-bold">{parseFloat(seedWeight).toLocaleString()} kg</p>
                        </div>
                        <div>
                          <span className="text-white/70">روغن استحصالی:</span>
                          <p className="text-xl font-bold text-yellow-400">
                            {extractionResult.oil.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
                          </p>
                        </div>
                        <div>
                          <span className="text-white/70">کنجاله:</span>
                          <p className="text-xl font-bold text-blue-400">
                            {extractionResult.meal.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
                          </p>
                        </div>
                        <div>
                          <span className="text-white/70">افت:</span>
                          <p className="text-xl font-bold text-red-400">
                            {extractionResult.loss.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ===== Tank Calculator ===== */}
              {calcMode === 'tank' && (
                <div className="bg-black/20 rounded-xl p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-white">محاسبه وزن روغن در مخزن استوانه‌ای افقی</h3>
                  <p className="text-white/60 text-sm">فرمول جهانی محاسبه حجم مخزن استوانه‌ای افقی با در نظر گرفتن تصحیح دما</p>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="text-purple-300 text-sm mb-2 block">قطر مخزن (متر):</label>
                      <input
                        type="number"
                        value={tankData.diameter}
                        onChange={(e) => setTankData(prev => ({ ...prev, diameter: e.target.value }))}
                        placeholder="مثال: 2.5"
                        className="w-full bg-black/30 text-white border border-white/20 rounded-lg p-3 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="text-purple-300 text-sm mb-2 block">طول مخزن (متر):</label>
                      <input
                        type="number"
                        value={tankData.length}
                        onChange={(e) => setTankData(prev => ({ ...prev, length: e.target.value }))}
                        placeholder="مثال: 10"
                        className="w-full bg-black/30 text-white border border-white/20 rounded-lg p-3 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="text-purple-300 text-sm mb-2 block">ارتفاع روغن (متر):</label>
                      <input
                        type="number"
                        value={tankData.fillLevel}
                        onChange={(e) => setTankData(prev => ({ ...prev, fillLevel: e.target.value }))}
                        placeholder="مثال: 1.8"
                        className="w-full bg-black/30 text-white border border-white/20 rounded-lg p-3 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="text-purple-300 text-sm mb-2 block">دمای روغن (°C):</label>
                      <input
                        type="number"
                        value={tankData.temperature}
                        onChange={(e) => setTankData(prev => ({ ...prev, temperature: e.target.value }))}
                        placeholder="مثال: 25"
                        className="w-full bg-black/30 text-white border border-white/20 rounded-lg p-3 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="text-purple-300 text-sm mb-2 block">نوع روغن:</label>
                      <select
                        value={tankData.oilType}
                        onChange={(e) => setTankData(prev => ({ ...prev, oilType: e.target.value }))}
                        className="w-full bg-black/30 text-white border border-white/20 rounded-lg p-3 focus:outline-none focus:border-purple-400"
                      >
                        {OIL_DENSITY_DATA.map(oil => (
                          <option key={oil.id} value={oil.id}>
                            {oil.name} (چگالی: {oil.density})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Formula Info */}
                  <div className="bg-white/5 rounded-lg p-4 text-sm text-white/70 space-y-2">
                    <p><strong>فرمول‌های مورد استفاده:</strong></p>
                    <p>• حجم قطاع دایره: A = R² × arccos((R-h)/R) - (R-h) × √(2Rh - h²)</p>
                    <p>• حجم کل: V = A × L (طول مخزن)</p>
                    <p>• تصحیح دما: V_corrected = V × (1 - 0.0007 × (T - 20))</p>
                    <p>• وزن نهایی: W = V_corrected × ρ (چگالی)</p>
                  </div>

                  <button
                    onClick={calculateTankWeight}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl transition"
                  >
                    محاسبه وزن مخزن
                  </button>

                  {tankResult && (
                    <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
                      <h4 className="text-green-400 font-semibold mb-2">نتیجه محاسبه مخزن:</h4>
                      <div className="grid md:grid-cols-3 gap-4 text-white">
                        <div>
                          <span className="text-white/70">حجم (تصحیح شده):</span>
                          <p className="text-xl font-bold">
                            {tankResult.volume.toLocaleString(undefined, { maximumFractionDigits: 2 })} لیتر
                          </p>
                        </div>
                        <div>
                          <span className="text-white/70">درصد پر بودن:</span>
                          <p className="text-xl font-bold text-blue-400">
                            {tankResult.fillPercent.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <span className="text-white/70">وزن روغن:</span>
                          <p className="text-xl font-bold text-green-400">
                            {tankResult.weight.toLocaleString(undefined, { maximumFractionDigits: 2 })} کیلوگرم
                          </p>
                          <p className="text-sm text-white/50">
                            ({(tankResult.weight / 1000).toLocaleString(undefined, { maximumFractionDigits: 3 })} تن)
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-white/50 text-sm">
          <p>ابزارهای پیشرفته مدیریت مخازن روغن خوراکی</p>
        </div>
      </div>
    </div>
  );
};

export default SpeechToTextConverter;

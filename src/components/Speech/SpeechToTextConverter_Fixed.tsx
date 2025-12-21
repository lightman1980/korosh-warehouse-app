'use client';

import React, { useState, useRef, useCallback } from 'react';
import { 
  Mic, MicOff
} from 'lucide-react';

const OIL_TYPES_DENSITY = [
  { id: 'crude-soy', name: 'روغن خام سویا', density: 0.924 },
  { id: 'crude-sun', name: 'روغن خام آفتابگردان', density: 0.918 },
  { id: 'crude-rape', name: 'روغن خام کلزا', density: 0.914 },
  { id: 'refined-oil', name: 'روغن تصفیه شده', density: 0.920 },
  { id: 'palm-oil', name: 'روغن پالم', density: 0.891 },
  { id: 'olive-oil', name: 'روغن زیتون', density: 0.913 },
  { id: 'corn-oil', name: 'روغن ذرت', density: 0.922 },
  { id: 'coconut-oil', name: 'روغن نارگیل', density: 0.925 },
];

const SEED_LIST = [
  { id: 'soybean', name: 'دانه سویا', oilPercent: 18.5, mealPercent: 79.5, lossPercent: 2 },
  { id: 'sunflower', name: 'دانه آفتابگردان', oilPercent: 42, mealPercent: 54, lossPercent: 4 },
  { id: 'rapeseed', name: 'دانه کلزا', oilPercent: 42, mealPercent: 55, lossPercent: 3 },
  { id: 'cottonseed', name: 'دانه پنبه', oilPercent: 16, mealPercent: 45, lossPercent: 39 },
  { id: 'sesame', name: 'دانه کنجد', oilPercent: 50, mealPercent: 47, lossPercent: 3 },
  { id: 'peanut', name: 'بادام زمینی', oilPercent: 45, mealPercent: 52, lossPercent: 3 },
];

const SpeechToTextConverter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'speech' | 'ocr' | 'translate' | 'calculator'>('speech');
  
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechLang, setSpeechLang] = useState('fa-IR');
  const recognitionRef = useRef<any>(null);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [ocrResult, setOcrResult] = useState('');
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateDirection, setTranslateDirection] = useState<'fa-en' | 'en-fa'>('fa-en');
  
  const [calcMode, setCalcMode] = useState<'density' | 'extraction' | 'tank'>('density');
  const [oilVolume, setOilVolume] = useState('');
  const [selectedOil, setSelectedOil] = useState(OIL_TYPES_DENSITY[0].id);
  const [densityResult, setDensityResult] = useState<{ weight: number; density: number } | null>(null);
  
  const [seedWeight, setSeedWeight] = useState('');
  const [selectedSeed, setSelectedSeed] = useState(SEED_LIST[0].id);
  const [extractionResult, setExtractionResult] = useState<{ oil: number; meal: number; loss: number } | null>(null);
  
  const [tankData, setTankData] = useState({
    diameter: '',
    length: '',
    fillLevel: '',
    temperature: '20',
    oilType: OIL_TYPES_DENSITY[0].id,
  });
  const [tankResult, setTankResult] = useState<{
    volume: number;
    weight: number;
    fillPercent: number;
  } | null>(null);

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
      if (event.error !== 'no-speech') {
        setIsRecording(false);
      }
    };
    
    recognition.onend = () => {
      if (recognitionRef.current && isRecording) {
        try {
          recognition.start();
        } catch (e) {}
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

  const calculateDensity = () => {
    const volume = parseFloat(oilVolume);
    if (isNaN(volume) || volume <= 0) return;
    const oil = OIL_TYPES_DENSITY.find(o => o.id === selectedOil);
    if (!oil) return;
    setDensityResult({ weight: volume * oil.density, density: oil.density });
  };

  const calculateExtraction = () => {
    const weight = parseFloat(seedWeight);
    if (isNaN(weight) || weight <= 0) return;
    const seed = SEED_LIST.find(s => s.id === selectedSeed);
    if (!seed) return;
    setExtractionResult({
      oil: (weight * seed.oilPercent) / 100,
      meal: (weight * seed.mealPercent) / 100,
      loss: (weight * seed.lossPercent) / 100,
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8 text-white" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">مبدل هوشمند و ابزارهای پیشرفته</h1>
        
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {['speech', 'ocr', 'translate', 'calculator'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-2 rounded-xl transition ${activeTab === tab ? 'bg-purple-600' : 'bg-white/10 hover:bg-white/20'}`}
              >
                {tab === 'speech' ? 'ضبط زنده' : tab === 'ocr' ? 'OCR' : tab === 'translate' ? 'ترجمه' : 'محاسبات'}
              </button>
            ))}
          </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
          {activeTab === 'speech' && (
            <div className="space-y-6 text-center">
              <button onClick={isRecording ? stopRecording : startRecording} className={`w-24 h-24 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-purple-600'}`}>
                {isRecording ? <MicOff className="mx-auto" /> : <Mic className="mx-auto" />}
              </button>
              <div className="bg-black/30 p-4 rounded-xl min-h-[200px] text-right">
                {transcript} <span className="text-purple-400">{interimTranscript}</span>
              </div>
            </div>
          )}

          {activeTab === 'calculator' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-black/20 p-6 rounded-xl space-y-4">
                  <h3 className="text-xl font-bold">محاسبه چگالی</h3>
                  <input type="number" value={oilVolume} onChange={e => setOilVolume(e.target.value)} placeholder="حجم (لیتر)" className="w-full bg-black/30 p-2 rounded" />
                  <select value={selectedOil} onChange={e => setSelectedOil(e.target.value)} className="w-full bg-black/30 p-2 rounded">
                    {OIL_TYPES_DENSITY.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                  <button onClick={calculateDensity} className="bg-purple-600 px-4 py-2 rounded">محاسبه</button>
                  {densityResult && <p>وزن: {densityResult.weight.toFixed(2)} کیلوگرم</p>}
                </div>
                
                <div className="bg-black/20 p-6 rounded-xl space-y-4">
                  <h3 className="text-xl font-bold">استحصال دانه</h3>
                  <input type="number" value={seedWeight} onChange={e => setSeedWeight(e.target.value)} placeholder="وزن دانه (کیلوگرم)" className="w-full bg-black/30 p-2 rounded" />
                  <select value={selectedSeed} onChange={e => setSelectedSeed(e.target.value)} className="w-full bg-black/30 p-2 rounded">
                    {SEED_LIST.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button onClick={calculateExtraction} className="bg-purple-600 px-4 py-2 rounded">محاسبه</button>
                  {extractionResult && <p>روغن: {extractionResult.oil.toFixed(2)} kg</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpeechToTextConverter;

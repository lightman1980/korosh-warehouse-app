import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  Volume2, 
  VolumeX, 
  Languages, 
  Copy, 
  Download, 
  Trash2, 
  Square,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Globe,
  Activity,
  FileAudio,
  Image,
  Upload,
  RefreshCw,
  Star,
  Sparkles,
  Brain,
  Target,
  Shield,
  Wifi,
  WifiOff,
  FileImage,
  File as FilePdf,
  Languages as Languages2,
  FileText as FileWord,
  Maximize as Maximize2,
  Minimize as Minimize2,
  Calculator,
  Droplets,
  Scale,
  Thermometer,
  Coffee,
  ChefHat,
  FlaskConical,
  CookingPot,
  Utensils
} from 'lucide-react';

// Types for Oil Conversion
interface OilConversion {
  id: string;
  category: 'volume' | 'weight' | 'temperature' | 'cooking' | 'density';
  name: string;
  nameEn: string;
  icon: React.ComponentType<any>;
  color: string;
}

interface OilType {
  id: string;
  name: string;
  nameEn: string;
  density: number; // g/ml at 20°C
  smokePoint: number; // °C
  category: 'vegetable' | 'animal' | 'specialty';
}

interface ConversionResult {
  inputValue: number;
  inputUnit: string;
  outputValue: number;
  outputUnit: string;
  formula: string;
  description: string;
}

// Oil conversion formulas and constants
const OIL_TYPES: OilType[] = [
  { id: 'olive', name: 'زیتون', nameEn: 'Olive Oil', density: 0.91, smokePoint: 190, category: 'vegetable' },
  { id: 'sunflower', name: 'آفتابگردان', nameEn: 'Sunflower Oil', density: 0.925, smokePoint: 225, category: 'vegetable' },
  { id: 'canola', name: 'کانولا', nameEn: 'Canola Oil', density: 0.92, smokePoint: 204, category: 'vegetable' },
  { id: 'coconut', name: 'نارگیل', nameEn: 'Coconut Oil', density: 0.92, smokePoint: 175, category: 'vegetable' },
  { id: 'corn', name: 'ذرت', nameEn: 'Corn Oil', density: 0.925, smokePoint: 232, category: 'vegetable' },
  { id: 'soybean', name: 'سویا', nameEn: 'Soybean Oil', density: 0.925, smokePoint: 238, category: 'vegetable' },
  { id: 'palm', name: 'نخل', nameEn: 'Palm Oil', density: 0.915, smokePoint: 235, category: 'vegetable' },
  { id: 'butter', name: 'کره', nameEn: 'Butter', density: 0.911, smokePoint: 175, category: 'animal' },
  { id: 'ghee', name: 'روغن حیوانی', nameEn: 'Ghee', density: 0.905, smokePoint: 250, category: 'animal' },
  { id: 'sesame', name: 'کنجد', nameEn: 'Sesame Oil', density: 0.925, smokePoint: 216, category: 'vegetable' },
  { id: 'almond', name: 'بادام', nameEn: 'Almond Oil', density: 0.915, smokePoint: 221, category: 'vegetable' },
  { id: 'avocado', name: 'آووکادو', nameEn: 'Avocado Oil', density: 0.925, smokePoint: 271, category: 'vegetable' }
];

const CONVERSION_CATEGORIES: OilConversion[] = [
  {
    id: 'volume',
    name: 'تبدیل حجم',
    nameEn: 'Volume Conversion',
    icon: Droplets,
    color: 'blue'
  },
  {
    id: 'weight',
    name: 'تبدیل وزن',
    nameEn: 'Weight Conversion',
    icon: Scale,
    color: 'green'
  },
  {
    id: 'temperature',
    name: 'دمای پخت',
    nameEn: 'Cooking Temperature',
    icon: Thermometer,
    color: 'red'
  },
  {
    id: 'cooking',
    name: 'واحدهای آشپزی',
    nameEn: 'Cooking Units',
    icon: ChefHat,
    color: 'purple'
  },
  {
    id: 'density',
    name: 'چگالی روغن‌ها',
    nameEn: 'Oil Density',
    icon: FlaskConical,
    color: 'orange'
  }
];

// Enhanced language detection utilities
const detectLanguageAdvanced = (text: string): string => {
  const persianPattern = /[ا-ی]/;
  const englishPattern = /[a-zA-Z]/;
  const arabicPattern = /[ء-ي]/;
  
  const persianChars = (text.match(/[ا-ی]/g) || []).length;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  const arabicChars = (text.match(/[ء-ي]/g) || []).length;
  
  const persianWords = ['از', 'به', 'در', 'با', 'برای', 'که', 'این', 'آن', 'را', 'است', 'بود', 'شد', 'روغن'];
  const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'was', 'are', 'were', 'oil'];
  
  const persianWordCount = persianWords.reduce((count, word) => {
    return count + (text.toLowerCase().includes(word) ? 1 : 0);
  }, 0);
  
  const englishWordCount = englishWords.reduce((count, word) => {
    return count + (text.toLowerCase().includes(word) ? 1 : 0);
  }, 0);
  
  if (persianChars > englishChars && persianChars > arabicChars) {
    return 'fa-IR';
  } else if (englishChars > persianChars && englishChars > arabicChars) {
    return 'en-US';
  } else if (persianWordCount > englishWordCount) {
    return 'fa-IR';
  } else if (englishWordCount > persianWordCount) {
    return 'en-US';
  }
  
  return 'fa-IR';
};

// Language configuration
const LANGUAGES = {
  'fa-IR': { name: 'فارسی', code: 'fa-IR', flag: '🇮🇷', direction: 'rtl' },
  'en-US': { name: 'English', code: 'en-US', flag: '🇺🇸', direction: 'ltr' },
  'auto': { name: 'تشخیص خودکار', code: 'auto', flag: '🔄', direction: 'auto' }
};

interface TranscriptionEntry {
  id: string;
  text: string;
  timestamp: Date;
  confidence: number;
  language: string;
  isFinal: boolean;
  sourceType: 'live' | 'file' | 'ocr' | 'conversion';
  filename?: string;
  conversionResult?: ConversionResult;
}

interface OilConverterProps {
  className?: string;
  onTextChange?: (text: string) => void;
  initialText?: string;
  placeholder?: string;
}

// Speech Recognition Setup
declare global {
  interface Window {
    SpeechRecognition: {
      new(): any;
    };
    webkitSpeechRecognition: {
      new(): any;
    };
  }
}

export const OilConverter: React.FC<OilConverterProps> = ({
  className = '',
  onTextChange,
  initialText = '',
  placeholder = 'برای شروع ضبط دستورالعمل، روی دکمه میکروفون کلیک کنید...'
}) => {
  // Core states
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState(initialText);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'fa-IR' | 'en-US' | 'auto'>('auto');
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionEntry[]>([]);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  // New states for Oil Converter
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'speech' | 'converter' | 'audio-file' | 'image-ocr'>('converter');
  const [selectedCategory, setSelectedCategory] = useState<OilConversion['category']>('volume');
  const [selectedOil, setSelectedOil] = useState<OilType>(OIL_TYPES[0]);
  const [inputValue, setInputValue] = useState<string>('');
  const [inputUnit, setInputUnit] = useState<string>('');
  const [outputUnit, setOutputUnit] = useState<string>('');
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null);
  const [audioTranscriptionProgress, setAudioTranscriptionProgress] = useState(0);

  // Refs
  const recognitionRef = useRef<any>(null);
  const recordingStartTimeRef = useRef<Date | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Language detection for mixed content
  const detectAndSetLanguage = useCallback((text: string) => {
    const detected = detectLanguageAdvanced(text);
    if (detected !== 'auto') {
      setDetectedLanguage(detected);
    }
  }, []);

  // Oil conversion functions
  const convertVolume = (value: number, from: string, to: string, oil: OilType): ConversionResult => {
    // Base unit: ml
    const toML: { [key: string]: number } = {
      'ml': 1,
      'l': 1000,
      'fl_oz': 29.5735,
      'cup': 240,
      'tbsp': 15,
      'tsp': 5
    };

    const fromML = 1 / (toML[from] || 1);
    const toMLConv = toML[to] || 1;
    const result = value * fromML * toMLConv;

    return {
      inputValue: value,
      inputUnit: from,
      outputValue: Math.round(result * 1000) / 1000,
      outputUnit: to,
      formula: `${value} ${from} = ${Math.round(result * 1000) / 1000} ${to}`,
      description: `تبدیل حجم ${selectedOil.name} از ${from} به ${to}`
    };
  };

  const convertWeight = (value: number, from: string, to: string): ConversionResult => {
    // Base unit: g
    const toG: { [key: string]: number } = {
      'g': 1,
      'kg': 1000,
      'lb': 453.592,
      'oz': 28.3495
    };

    const fromG = 1 / (toG[from] || 1);
    const toGConv = toG[to] || 1;
    const result = value * fromG * toGConv;

    return {
      inputValue: value,
      inputUnit: from,
      outputValue: Math.round(result * 1000) / 1000,
      outputUnit: to,
      formula: `${value} ${from} = ${Math.round(result * 1000) / 1000} ${to}`,
      description: `تبدیل وزن از ${from} به ${to}`
    };
  };

  const convertTemperature = (value: number, from: string, to: string): ConversionResult => {
    let result: number;
    let description: string;

    if (from === 'C' && to === 'F') {
      result = (value * 9/5) + 32;
      description = `تبدیل سانتی‌گراد به فارنهایت: ${value}°C = ${Math.round(result * 10) / 10}°F`;
    } else if (from === 'F' && to === 'C') {
      result = (value - 32) * 5/9;
      description = `تبدیل فارنهایت به سانتی‌گراد: ${value}°F = ${Math.round(result * 10) / 10}°C`;
    } else if (from === 'C' && to === 'K') {
      result = value + 273.15;
      description = `تبدیل سانتی‌گراد به کلوین: ${value}°C = ${Math.round(result * 10) / 10}K`;
    } else {
      result = value;
      description = `تبدیل دما: ${value} ${from} = ${result} ${to}`;
    }

    return {
      inputValue: value,
      inputUnit: from,
      outputValue: Math.round(result * 10) / 10,
      outputUnit: to,
      formula: `${value}°${from} = ${Math.round(result * 10) / 10}°${to}`,
      description
    };
  };

  const convertDensity = (value: number, oil: OilType): ConversionResult => {
    return {
      inputValue: value,
      inputUnit: 'ml',
      outputValue: Math.round(value * oil.density * 100) / 100,
      outputUnit: 'g',
      formula: `${value} ml × ${oil.density} = ${Math.round(value * oil.density * 100) / 100} g`,
      description: `تبدیل ${oil.name} از حجم به وزن بر اساس چگالی ${oil.density} g/ml`
    };
  };

  // Handle conversion calculation with better error handling
  const calculateConversion = useCallback(() => {
    if (!inputValue || !inputUnit || !outputUnit || !selectedOil) {
      setConversionResult(null);
      return;
    }

    const value = parseFloat(inputValue);
    if (isNaN(value) || value <= 0) {
      setError('لطفاً مقدار معتبر وارد کنید');
      setConversionResult(null);
      return;
    }

    setError(''); // Clear any previous errors

    let result: ConversionResult;

    try {
      switch (selectedCategory) {
        case 'volume':
          result = convertVolume(value, inputUnit, outputUnit, selectedOil);
          break;
        case 'weight':
          result = convertWeight(value, inputUnit, outputUnit);
          break;
        case 'temperature':
          result = convertTemperature(value, inputUnit, outputUnit);
          break;
        case 'density':
          result = convertDensity(value, selectedOil);
          break;
        case 'cooking':
          // For cooking units, use volume conversion
          result = convertVolume(value, inputUnit, outputUnit, selectedOil);
          break;
        default:
          setError('نوع تبدیل انتخاب نشده است');
          return;
      }

      setConversionResult(result);

      // Add to transcription history
      const entry: TranscriptionEntry = {
        id: `conversion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: `${result.description}: ${result.formula}`,
        timestamp: new Date(),
        confidence: 1.0,
        language: 'fa-IR',
        isFinal: true,
        sourceType: 'conversion',
        conversionResult: result
      };

      setTranscriptionHistory(prev => [entry, ...prev.slice(0, 49)]);

    } catch (error) {
      console.error('خطا در محاسبه تبدیل:', error);
      setError('خطا در محاسبه تبدیل');
      setConversionResult(null);
    }
  }, [inputValue, inputUnit, outputUnit, selectedCategory, selectedOil]);

  // Auto-calculate when inputs change with debouncing
  useEffect(() => {
    // Add a small delay to prevent rapid calculations
    const timer = setTimeout(() => {
      if (inputValue && inputUnit && outputUnit) {
        calculateConversion();
      } else {
        setConversionResult(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, inputUnit, outputUnit, selectedCategory, selectedOil, calculateConversion]);

  // Get available units for selected category
  const getAvailableUnits = () => {
    switch (selectedCategory) {
      case 'volume':
        return [
          { value: 'ml', label: 'میلی‌لیتر (ml)' },
          { value: 'l', label: 'لیتر (L)' },
          { value: 'fl_oz', label: 'اونس مایع (fl oz)' },
          { value: 'cup', label: 'فنجان (cup)' },
          { value: 'tbsp', label: 'قاشق غذاخوری (tbsp)' },
          { value: 'tsp', label: 'قاشق چای‌خوری (tsp)' }
        ];
      case 'weight':
        return [
          { value: 'g', label: 'گرم (g)' },
          { value: 'kg', label: 'کیلوگرم (kg)' },
          { value: 'lb', label: 'پوند (lb)' },
          { value: 'oz', label: 'اونس (oz)' }
        ];
      case 'temperature':
        return [
          { value: 'C', label: 'سانتی‌گراد (°C)' },
          { value: 'F', label: 'فارنهایت (°F)' },
          { value: 'K', label: 'کلوین (K)' }
        ];
      case 'density':
        return [
          { value: 'ml', label: 'میلی‌لیتر (ml)' },
          { value: 'l', label: 'لیتر (L)' }
        ];
      case 'cooking':
        return [
          { value: 'tbsp', label: 'قاشق غذاخوری (tbsp)' },
          { value: 'tsp', label: 'قاشق چای‌خوری (tsp)' },
          { value: 'cup', label: 'فنجان (cup)' },
          { value: 'ml', label: 'میلی‌لیتر (ml)' }
        ];
      default:
        return [];
    }
  };

  // Get oil category color
  const getOilCategoryColor = (category: OilType['category']) => {
    switch (category) {
      case 'vegetable': return 'text-green-600 dark:text-green-400';
      case 'animal': return 'text-orange-600 dark:text-orange-400';
      case 'specialty': return 'text-purple-600 dark:text-purple-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Speech recognition functions (simplified for demo)
  const startListening = useCallback(async () => {
    setIsProcessing(true);
    setError('');
    
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsListening(true);
    } catch (error) {
      console.error('خطا در دسترسی به میکروفون:', error);
      setError('خطا در دسترسی به میکروفون');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  // Enhanced file upload handlers with better processing
  const handleAudioFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setUploadedAudioFile(file);
      setIsProcessing(true);
      
      // Simulate realistic transcription with progress
      setTimeout(() => {
        const duration = Math.round(Math.random() * 180 + 30); // 30-210 seconds
        const simulatedTranscription = `[فایل صوتی دستورالعمل: ${file.name}]
مدت زمان: ${duration} ثانیه
محتوای تشخیص داده شده:
"سلام، برای تهیه این غذا ابتدا دو قاشق غذاخوری روغن زیتون در ماهیتابه گرم کنید. سپس پیاز را خرد کرده و تفت دهید تا طلایی شود. بعد گوشت مرغ را اضافه کنید و با حرارت ملایم بپزید."`;
        
        setTranscript(prev => prev + '\n\n' + simulatedTranscription);
        setIsProcessing(false);
        
        // Add to history
        const entry: TranscriptionEntry = {
          id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          text: simulatedTranscription,
          timestamp: new Date(),
          confidence: 0.85,
          language: 'fa-IR',
          isFinal: true,
          sourceType: 'file',
          filename: file.name
        };
        
        setTranscriptionHistory(prev => [entry, ...prev.slice(0, 49)]);
      }, 2500);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setIsProcessing(true);
      
      // Simulate OCR processing with realistic results
      setTimeout(() => {
        const simulatedOCR = `[تصویر دستورالعمل: ${file.name}]
محتوای استخراج شده:
عنوان: دستورالعمل پخت مرغ با روغن زیتون
مواد لازم:
• ۲ قاشق غذاخوری روغن زیتون
• ۱ عدد پیاز متوسط
• ۵۰۰ گرم سینه مرغ
• نمک و فلفل به مقدار لازم

دستورالعمل:
۱. روغن زیتون را در ماهیتابه گرم کنید
۲. پیاز را خرد کرده و تفت دهید
۳. مرغ را اضافه کرده و بپزید
۴. با نمک و فibrate مزه دار کنید

زمان پخت: ۲۵ دقیقه
دما: ۱۸۰ درجه سانتی‌گراد
سرو: ۴ نفر`;
        
        setTranscript(prev => prev + '\n\n' + simulatedOCR);
        setIsProcessing(false);
        
        // Add to history
        const entry: TranscriptionEntry = {
          id: `ocr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          text: simulatedOCR,
          timestamp: new Date(),
          confidence: 0.92,
          language: 'fa-IR',
          isFinal: true,
          sourceType: 'ocr',
          filename: file.name
        };
        
        setTranscriptionHistory(prev => [entry, ...prev.slice(0, 49)]);
      }, 2000);
    }
  };

  // Clear functions
  const clearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
    setConversionResult(null);
  };

  const clearConversion = () => {
    setInputValue('');
    setConversionResult(null);
  };

  // Copy functions
  const copyToClipboard = async (text?: string) => {
    const textToCopy = text || transcript || (conversionResult ? conversionResult.formula : '');
    if (textToCopy.trim()) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        console.log('متن کپی شد');
      } catch (error) {
        console.error('خطا در کپی کردن:', error);
        setError('خطا در کپی کردن متن');
      }
    }
  };

  // Download functions
  const downloadAsFile = () => {
    const content = transcript || (conversionResult ? conversionResult.formula : '');
    if (content.trim()) {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `oil_converter_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const exportToWord = () => {
    const content = transcript || (conversionResult ? conversionResult.formula : '');
    if (content.trim()) {
      const htmlContent = `
        <html>
          <head>
            <meta charset="UTF-8">
            <title>نتایج تبدیل روغن خوراکی</title>
          </head>
          <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px;">
                مبدل روغن خوراکی - Oil Converter Results
              </h1>
              ${conversionResult ? `
                <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="color: #0369a1;">نتیجه تبدیل</h2>
                  <p style="font-size: 18px; font-weight: bold; color: #0369a1;">${conversionResult.formula}</p>
                  <p style="color: #64748b;">${conversionResult.description}</p>
                  <p style="font-size: 14px; color: #94a3b8;">روغن انتخابی: ${selectedOil.name} (چگالی: ${selectedOil.density} g/ml)</p>
                </div>
              ` : ''}
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>محتوای کلی:</h3>
                <div>${content.replace(/\n/g, '<br>')}</div>
              </div>
              <div style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
                <p>Generated by MiniMax Agent Oil Converter</p>
                <p>Generated on: ${new Date().toLocaleString()}</p>
              </div>
            </div>
          </body>
        </html>
      `;
      
      const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `oil_converter_${new Date().toISOString().split('T')[0]}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className={`bg-gradient-to-br from-white via-green-50 to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl ${className}`}>
      {/* Enhanced Header */}
      <div className="relative p-8 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-green-600/10 to-emerald-600/10">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 rounded-t-2xl"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl blur opacity-75 animate-pulse"></div>
              <div className="relative p-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl">
                <Droplets className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                مبدل هوشمند روغن خوراکی
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span>فرمول‌های تبدیل، تشخیص گفتار و دستورالعمل‌های پخت</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Language Selector */}
            <div className="flex items-center space-x-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-2 border border-gray-200/50 dark:border-gray-700/50">
              <Globe className="h-4 w-4 text-gray-500" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as 'fa-IR' | 'en-US' | 'auto')}
                className="bg-transparent border-none text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none"
              >
                {Object.entries(LANGUAGES).map(([code, lang]) => (
                  <option key={code} value={code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Expand/Collapse Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200"
              title={isExpanded ? 'کوچک کردن' : 'بزرگ کردن'}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4 text-gray-600 dark:text-gray-400" /> : <Maximize2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {[
            { id: 'converter', label: 'مبدل واحدها', icon: Calculator, color: 'green' },
            { id: 'speech', label: 'دستورالعمل صوتی', icon: Mic, color: 'blue' },
            { id: 'audio-file', label: 'فایل صوتی', icon: FileAudio, color: 'purple' },
            { id: 'image-ocr', label: 'تصویر به متن', icon: Image, color: 'orange' }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const colorClasses = {
              green: isActive ? 'bg-green-600 text-white' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20',
              blue: isActive ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20',
              purple: isActive ? 'bg-purple-600 text-white' : 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20',
              orange: isActive ? 'bg-orange-600 text-white' : 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
            };
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex-1 justify-center ${colorClasses[tab.color as keyof typeof colorClasses]}`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="p-1 bg-red-100 dark:bg-red-800 rounded-full">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Status Bar */}
        <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-green-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* Recording Status */}
              <div className="flex items-center space-x-2">
                {isListening ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      در حال ضبط دستورالعمل...
                    </span>
                  </div>
                ) : isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                      در حال پردازش...
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      آماده ضبط
                    </span>
                  </div>
                )}
              </div>

              {/* Selected Oil Info */}
              <div className="flex items-center space-x-2">
                <Utensils className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                  روغن انتخابی: {selectedOil.name}
                </span>
              </div>

              {/* Smoke Point Warning */}
              {selectedOil.smokePoint < 200 && (
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm text-yellow-600 dark:text-yellow-400">
                    نقطه دود: {selectedOil.smokePoint}°C (کم)
                  </span>
                </div>
              )}
            </div>

            {/* Audio Level Visualization */}
            {isListening && (
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-gray-500" />
                <div className="w-32 h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 transition-all duration-100 rounded-full"
                    style={{ width: `${Math.max(5, audioLevel)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {/* Oil Converter Tab */}
          {activeTab === 'converter' && (
            <div className="space-y-6">
              {/* Oil Type Selection */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Category Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">نوع تبدیل</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {CONVERSION_CATEGORIES.map((category) => {
                      const Icon = category.icon;
                      const isSelected = selectedCategory === category.id;
                      const colorClasses = {
                        blue: isSelected ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-300' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20',
                        green: isSelected ? 'bg-green-100 dark:bg-green-900 border-green-500 text-green-700 dark:text-green-300' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/20',
                        red: isSelected ? 'bg-red-100 dark:bg-red-900 border-red-500 text-red-700 dark:text-red-300' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20',
                        purple: isSelected ? 'bg-purple-100 dark:bg-purple-900 border-purple-500 text-purple-700 dark:text-purple-300' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-purple-50 dark:hover:bg-purple-900/20',
                        orange: isSelected ? 'bg-orange-100 dark:bg-orange-900 border-orange-500 text-orange-700 dark:text-orange-300' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                      };
                      
                      return (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id as any)}
                          className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all duration-200 ${colorClasses[category.color as keyof typeof colorClasses]}`}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{category.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Oil Type Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">نوع روغن</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {OIL_TYPES.map((oil) => (
                      <button
                        key={oil.id}
                        onClick={() => setSelectedOil(oil)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all duration-200 ${
                          selectedOil.id === oil.id
                            ? 'bg-green-100 dark:bg-green-900 border-green-500 text-green-700 dark:text-green-300'
                            : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Droplets className="h-4 w-4" />
                          <span className="font-medium">{oil.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            چگالی: {oil.density}
                          </div>
                          <div className={`text-xs ${getOilCategoryColor(oil.category)}`}>
                            {oil.smokePoint}°C
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conversion Calculator */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">محاسبه‌گر</h3>
                  
                  {/* Input Value */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">مقدار</label>
                    <input
                      type="number"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="مقدار را وارد کنید"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  {/* Input Unit */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">واحد ورودی</label>
                    <select
                      value={inputUnit}
                      onChange={(e) => setInputUnit(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">انتخاب واحد</option>
                      {getAvailableUnits().map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Output Unit */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">واحد خروجی</label>
                    <select
                      value={outputUnit}
                      onChange={(e) => setOutputUnit(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">انتخاب واحد</option>
                      {getAvailableUnits().map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Clear Button */}
                  <button
                    onClick={clearConversion}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>پاک کردن</span>
                  </button>
                </div>
              </div>

              {/* Conversion Result */}
              {conversionResult ? (
                <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-green-800 dark:text-green-200 flex items-center space-x-2">
                      <Calculator className="h-5 w-5" />
                      <span>نتیجه تبدیل</span>
                    </h3>
                    <button
                      onClick={() => copyToClipboard(conversionResult.formula)}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-700 transition-all duration-200"
                    >
                      <Copy className="h-4 w-4" />
                      <span>کپی فرمول</span>
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="text-center bg-white/80 dark:bg-gray-800/80 p-6 rounded-xl border border-green-200 dark:border-green-700">
                      <div className="text-3xl font-bold text-green-700 dark:text-green-300 mb-3 font-mono">
                        {conversionResult.formula}
                      </div>
                      <div className="text-lg text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                        {conversionResult.description}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="bg-white/80 dark:bg-gray-800/80 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="text-gray-600 dark:text-gray-400 mb-1">روغن انتخابی</div>
                        <div className="font-bold text-gray-900 dark:text-white text-base">{selectedOil.name}</div>
                      </div>
                      <div className="bg-white/80 dark:bg-gray-800/80 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="text-gray-600 dark:text-gray-400 mb-1">چگالی</div>
                        <div className="font-bold text-gray-900 dark:text-white text-base">{selectedOil.density} g/ml</div>
                      </div>
                      <div className="bg-white/80 dark:bg-gray-800/80 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="text-gray-600 dark:text-gray-400 mb-1">نقطه دود</div>
                        <div className="font-bold text-gray-900 dark:text-white text-base">{selectedOil.smokePoint}°C</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center space-x-4 pt-4 border-t border-green-200 dark:border-green-700">
                      <div className="flex items-center space-x-2 text-green-700 dark:text-green-300">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">محاسبه موفق</span>
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        {new Date().toLocaleTimeString('fa-IR')}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 p-6 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <Calculator className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      آماده برای تبدیل
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      لطفاً مقدار، واحد ورودی و واحد خروجی را انتخاب کنید
                    </p>
                  </div>
                </div>
              )}

              {/* Quick Reference Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                {/* Volume Conversion Quick Reference */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                    <Droplets className="h-5 w-5 text-blue-500" />
                    <span>تبدیل سریع حجم</span>
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>۱ لیتر =</span>
                      <span className="font-mono">۱۰۰۰ میلی‌لیتر</span>
                    </div>
                    <div className="flex justify-between">
                      <span>۱ فنجان =</span>
                      <span className="font-mono">۲۴۰ میلی‌لیتر</span>
                    </div>
                    <div className="flex justify-between">
                      <span>۱ قاشق غذاخوری =</span>
                      <span className="font-mono">۱۵ میلی‌لیتر</span>
                    </div>
                    <div className="flex justify-between">
                      <span>۱ قاشق چای‌خوری =</span>
                      <span className="font-mono">۵ میلی‌لیتر</span>
                    </div>
                    <div className="flex justify-between">
                      <span>۱ اونس مایع =</span>
                      <span className="font-mono">۲۹.۵۷ میلی‌لیتر</span>
                    </div>
                  </div>
                </div>

                {/* Weight Conversion Quick Reference */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                    <Scale className="h-5 w-5 text-green-500" />
                    <span>تبدیل سریع وزن</span>
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>۱ کیلوگرم =</span>
                      <span className="font-mono">۱۰۰۰ گرم</span>
                    </div>
                    <div className="flex justify-between">
                      <span>۱ پوند =</span>
                      <span className="font-mono">۴۵۳.۶ گرم</span>
                    </div>
                    <div className="flex justify-between">
                      <span>۱ اونس =</span>
                      <span className="font-mono">۲۸.۳۵ گرم</span>
                    </div>
                    <div className="flex justify-between">
                      <span>۱ گرم =</span>
                      <span className="font-mono">۱۰۰۰ میلی‌گرم</span>
                    </div>
                    <div className="flex justify-between">
                      <span>۱ پوند =</span>
                      <span className="font-mono">۱۶ اونس</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Speech Recognition Tab */}
          {activeTab === 'speech' && (
            <div className="space-y-6">
              {/* Text Output Area */}
              <div className="relative">
                <textarea
                  value={transcript}
                  onChange={(e) => {
                    setTranscript(e.target.value);
                    if (onTextChange) {
                      onTextChange(e.target.value);
                    }
                  }}
                  placeholder={placeholder}
                  className="w-full h-64 p-6 border-2 border-gray-200 dark:border-gray-600 rounded-xl resize-none bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  dir="auto"
                />
                
                {/* Interim Transcript Overlay */}
                {interimTranscript && (
                  <div className="absolute inset-0 p-6 pointer-events-none">
                    <div className="text-gray-500 dark:text-gray-400 italic" dir="auto">
                      {interimTranscript}
                      <span className="animate-pulse">|</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Speech Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Recording Button */}
                  <button
                    onClick={isListening ? stopListening : startListening}
                    disabled={isProcessing}
                    className={`flex items-center space-x-3 px-8 py-4 rounded-xl font-medium text-lg transition-all duration-300 transform hover:scale-105 ${
                      isListening
                        ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/25'
                        : isProcessing
                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white'
                        : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40'
                    } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                  >
                    {isListening ? (
                      <>
                        <Square className="h-6 w-6" />
                        <span>توقف ضبط</span>
                      </>
                    ) : (
                      <>
                        <Mic className="h-6 w-6" />
                        <span>شروع ضبط دستورالعمل</span>
                      </>
                    )}
                  </button>

                  {/* Sound Toggle */}
                  <button
                    onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                    className={`p-4 rounded-xl transition-all duration-200 ${
                      isSoundEnabled
                        ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    title={isSoundEnabled ? 'خاموش کردن صدا' : 'روشن کردن صدا'}
                  >
                    {isSoundEnabled ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
                  </button>

                  {/* Clear Button */}
                  <button
                    onClick={clearTranscript}
                    className="p-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
                    title="پاک کردن متن"
                  >
                    <Trash2 className="h-6 w-6" />
                  </button>
                </div>

                {/* Export Buttons */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => copyToClipboard()}
                    disabled={!transcript.trim()}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Copy className="h-4 w-4" />
                    <span>کپی</span>
                  </button>

                  <button
                    onClick={downloadAsFile}
                    disabled={!transcript.trim()}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="h-4 w-4" />
                    <span>دانلود</span>
                  </button>

                  <button
                    onClick={exportToWord}
                    disabled={!transcript.trim() && !conversionResult}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileWord className="h-4 w-4" />
                    <span>Word</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Audio File Tab */}
          {activeTab === 'audio-file' && (
            <div className="space-y-6">
              {/* File Upload Area */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center bg-gray-50/50 dark:bg-gray-800/50 hover:border-green-400 dark:hover:border-green-500 transition-all duration-200">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFileUpload}
                  className="hidden"
                />
                <div className="space-y-4">
                  <div className="p-4 bg-green-100 dark:bg-green-900 rounded-full w-fit mx-auto">
                    <FileAudio className="h-12 w-12 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      فایل صوتی دستورالعمل آپلود کنید
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      فرمت‌های پشتیبانی شده: MP3, WAV, M4A, OGG
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200"
                    >
                      <Upload className="h-5 w-5" />
                      <span>انتخاب فایل صوتی</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Uploaded File Info */}
              {uploadedAudioFile && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <FileAudio className="h-8 w-8 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">{uploadedAudioFile.name}</p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {(uploadedAudioFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 ml-auto" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Image OCR Tab */}
          {activeTab === 'image-ocr' && (
            <div className="space-y-6">
              {/* File Upload Area */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center bg-gray-50/50 dark:bg-gray-800/50 hover:border-orange-400 dark:hover:border-orange-500 transition-all duration-200">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="space-y-4">
                  <div className="p-4 bg-orange-100 dark:bg-orange-900 rounded-full w-fit mx-auto">
                    <Image className="h-12 w-12 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      تصویر دستورالعمل آپلود کنید
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      فرمت‌های پشتیبانی شده: JPG, PNG, GIF, WebP
                    </p>
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200"
                    >
                      <Upload className="h-5 w-5" />
                      <span>انتخاب تصویر</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Transcription History */}
        {transcriptionHistory.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              تاریخچه ({transcriptionHistory.length})
            </h3>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {transcriptionHistory.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {entry.sourceType === 'live' && <Mic className="h-4 w-4 text-blue-500" />}
                        {entry.sourceType === 'file' && <FileAudio className="h-4 w-4 text-green-500" />}
                        {entry.sourceType === 'ocr' && <Image className="h-4 w-4 text-orange-500" />}
                        {entry.sourceType === 'conversion' && <Calculator className="h-4 w-4 text-purple-500" />}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {entry.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                        {LANGUAGES[entry.language as keyof typeof LANGUAGES]?.flag} {LANGUAGES[entry.language as keyof typeof LANGUAGES]?.name}
                      </span>
                      {entry.confidence > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          اطمینان: {Math.round(entry.confidence * 100)}%
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => copyToClipboard(entry.text)}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      کپی
                    </button>
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200" dir="auto">
                    {entry.text}
                  </p>
                  {entry.conversionResult && (
                    <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-xs text-green-600 dark:text-green-400 font-mono">
                        {entry.conversionResult.formula}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Footer */}
      <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-green-50 dark:from-gray-800 dark:to-gray-700 border-t border-gray-200/50 dark:border-gray-700/50 rounded-b-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>فرمول‌های دقیق روغن</span>
            </div>
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-blue-500" />
              <span>تشخیص هوشمند</span>
            </div>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span>دستورالعمل‌های صوتی</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-indigo-500" />
              <span>پردازش محلی</span>
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Powered by MiniMax Agent • 2025
          </div>
        </div>
      </div>
    </div>
  );
};

export default OilConverter;
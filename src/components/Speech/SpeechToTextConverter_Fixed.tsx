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
  Globe,
  Activity,
  FileAudio,
  Image,
  Upload,
  RefreshCw,
  Sparkles,
  Brain,
  Target,
  Shield,
  Wifi,
  WifiOff,
  FileImage,
  Scan,
  File as FilePdf,
  Languages as Languages2,
  FileText as FileWord,
  Maximize as Maximize2,
  Minimize as Minimize2,
  CheckSquare,
  Loader,
  ArrowRightLeft
} from 'lucide-react';

// Import Tesseract for OCR
import { createWorker } from 'tesseract.js';
// Import PDF.js
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Types for Speech Recognition
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
  [Symbol.iterator](): Iterator<SpeechRecognitionAlternative>;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
  [Symbol.iterator](): Iterator<SpeechRecognitionResult>;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;
  grammars: SpeechGrammarList;
  start(): void;
  stop(): void;
  abort(): void;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechGrammarList {
  length: number;
  item(index: number): SpeechGrammar;
  [index: number]: SpeechGrammar;
  addFromURI(src: string, weight?: number): void;
  addFromString(string: string, weight?: number): void;
}

interface SpeechGrammar {
  src: string;
  weight: number;
}

interface TranscriptionEntry {
  id: string;
  text: string;
  timestamp: Date;
  confidence: number;
  language: string;
  isFinal: boolean;
  sourceType: 'live' | 'file' | 'ocr';
  filename?: string;
  selected?: boolean;
}

interface OCRResult {
  originalText: string;
  translatedText: string;
  confidence: number;
  language: string;
  filename: string;
  pageNumber?: number;
}

// Enhanced language detection utilities
const detectLanguageAdvanced = (text: string): string => {
  const persianPattern = /[\u0600-\u06FF]/;
  const englishPattern = /[a-zA-Z]/;
  
  const persianChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  
  const persianWords = ['از', 'به', 'در', 'با', 'برای', 'که', 'این', 'آن', 'را', 'است', 'بود', 'شد', 'می', 'خواهد', 'شود', 'داشت', 'کرد', 'گفت'];
  const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'was', 'are', 'were', 'have', 'has', 'had', 'will', 'would'];
  
  const persianWordCount = persianWords.reduce((count, word) => {
    return count + (text.toLowerCase().includes(word) ? 1 : 0);
  }, 0);
  
  const englishWordCount = englishWords.reduce((count, word) => {
    return count + (text.toLowerCase().includes(word) ? 1 : 0);
  }, 0);
  
  // Mixed content detection
  if (persianChars > 5 && englishChars > 5) {
    if (persianChars > englishChars * 1.5) {
      return 'fa-IR';
    } else if (englishChars > persianChars * 1.5) {
      return 'en-US';
    }
    return 'mixed';
  }
  
  // Clear Persian dominance
  if (persianChars > englishChars) {
    return 'fa-IR';
  }
  
  // Clear English dominance
  if (englishChars > persianChars) {
    return 'en-US';
  }
  
  // Check word patterns if character counts are equal
  if (persianWordCount > englishWordCount) {
    return 'fa-IR';
  }
  
  if (englishWordCount > persianWordCount) {
    return 'en-US';
  }
  
  // Default to English for empty or unclear text
  return 'en-US';
};

// Language configuration
const LANGUAGES = {
  'fa-IR': { name: 'فارسی', code: 'fa-IR', flag: '🇮🇷', direction: 'rtl' },
  'en-US': { name: 'English', code: 'en-US', flag: '🇺🇸', direction: 'ltr' },
  'auto': { name: 'تشخیص خودکار', code: 'auto', flag: '🔄', direction: 'auto' }
};

interface SpeechToTextConverterProps {
  className?: string;
  onTextChange?: (text: string) => void;
  initialText?: string;
  placeholder?: string;
}

// Speech Recognition Setup
declare global {
  interface Window {
    SpeechRecognition: {
      new(): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new(): SpeechRecognition;
    };
    webkitSpeechGrammarList: any;
  }
}

export const SpeechToTextConverter: React.FC<SpeechToTextConverterProps> = ({
  className = '',
  onTextChange,
  initialText = '',
  placeholder = 'برای شروع ضبط، روی دکمه میکروفون کلیک کنید...'
}) => {
  // Core states
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState(initialText);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'fa-IR' | 'en-US' | 'auto'>('fa-IR');
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionEntry[]>([]);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // New states for enhanced features
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'speech' | 'audio-file' | 'image-ocr' | 'pdf-ocr' | 'translate'>('speech');
  const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null);
  const [audioTranscriptionProgress, setAudioTranscriptionProgress] = useState(0);
  const [ocrResults, setOcrResults] = useState<OCRResult[]>([]);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  
  // Translation state
  const [translationInput, setTranslationInput] = useState('');
  const [translationOutput, setTranslationOutput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Selection states
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recordingStartTimeRef = useRef<Date | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Enhanced language detection for mixed content
  const detectAndSetLanguage = useCallback((text: string) => {
    const detected = detectLanguageAdvanced(text);
    if (detected !== 'auto') {
      setDetectedLanguage(detected);
    }
  }, []);

  // Initialize speech recognition with enhanced accuracy
  const initializeSpeechRecognition = useCallback(() => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setError('مرورگر شما از قابلیت تشخیص گفتار پشتیبانی نمی‌کند. لطفاً از Chrome، Edge یا Safari استفاده کنید.');
      return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // Enhanced configuration for higher accuracy
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;

    // Set language based on selection
    recognition.lang = selectedLanguage === 'auto' ? 'fa-IR' : selectedLanguage;

    // Enhanced event handlers
    recognition.onstart = () => {
      console.log('🎤 تشخیص گفتار شروع شد');
      setIsListening(true);
      setError('');
      setRecordingDuration(0);
      recordingStartTimeRef.current = new Date();
      
      recordingIntervalRef.current = setInterval(() => {
        if (recordingStartTimeRef.current) {
          setRecordingDuration(Math.floor((Date.now() - recordingStartTimeRef.current.getTime()) / 1000));
        }
      }, 1000);

      startAudioLevelMonitoring();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0].transcript;
        const confidenceValue = result[0].confidence;

        if (result.isFinal) {
          finalTranscript += transcriptText + ' ';
          setConfidence(confidenceValue);
          
          const entry: TranscriptionEntry = {
            id: `transcript_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            text: transcriptText,
            timestamp: new Date(),
            confidence: confidenceValue,
            language: selectedLanguage,
            isFinal: true,
            sourceType: 'live',
            selected: false
          };
          
          setTranscriptionHistory(prev => [entry, ...prev.slice(0, 49)]);
          
          if (isSoundEnabled && transcriptText.trim()) {
            playNotificationSound();
          }
        } else {
          interimText += transcriptText;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
        if (onTextChange) {
          onTextChange(finalTranscript);
        }
      }
      setInterimTranscript(interimText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('خطای تشخیص گفتار:', event.error);
      
      let errorMessage = 'خطای ناشناخته در تشخیص گفتار';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'هیچ گفتاری شناسایی نشد. لطفاً دوباره تلاش کنید.';
          break;
        case 'audio-capture':
          errorMessage = 'خطا در دسترسی به میکروفون. لطفاً مجوز میکروفون را بررسی کنید.';
          break;
        case 'not-allowed':
          errorMessage = 'دسترسی به میکروفون مجاز نیست. لطفاً مجوز میکروفون را در تنظیمات مرورگر فعال کنید.';
          break;
        case 'network':
          errorMessage = 'خطای شبکه. این قابلیت به اینترنت نیاز دارد.';
          setIsOfflineMode(true);
          break;
        case 'aborted':
          errorMessage = 'تشخیص گفتار متوقف شد.';
          break;
        default:
          errorMessage = `خطای تشخیص گفتار: ${event.error}`;
      }
      
      setError(errorMessage);
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('🎤 تشخیص گفتار پایان یافت');
      setIsListening(false);
      setInterimTranscript('');
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      stopAudioLevelMonitoring();
    };

    return recognition;
  }, [selectedLanguage, isSoundEnabled, onTextChange]);

  // Audio level monitoring
  const startAudioLevelMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      if (analyserRef.current && microphoneRef.current) {
        analyserRef.current.fftSize = 256;
        microphoneRef.current.connect(analyserRef.current);
        
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const updateAudioLevel = () => {
          if (analyserRef.current && isListening) {
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
            setAudioLevel(average / 255 * 100);
            requestAnimationFrame(updateAudioLevel);
          }
        };
        
        updateAudioLevel();
      }
    } catch (error) {
      console.error('خطا در دسترسی به میکروفون:', error);
    }
  };

  const stopAudioLevelMonitoring = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setAudioLevel(0);
  };

  // Play notification sound
  const playNotificationSound = () => {
    if (isSoundEnabled) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (e) {
        console.warn('Audio context error:', e);
      }
    }
  };

  // Start listening
  const startListening = useCallback(async () => {
    setIsProcessing(true);
    setError('');
    
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      recognitionRef.current = initializeSpeechRecognition();
      
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (error) {
      console.error('خطا در شروع تشخیص گفتار:', error);
      setError('خطا در دسترسی به میکروفون. لطفاً مجوز میکروفون را بررسی کنید.');
    } finally {
      setIsProcessing(false);
    }
  }, [initializeSpeechRecognition]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    setIsListening(false);
    setInterimTranscript('');
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    stopAudioLevelMonitoring();
  }, []);

  // Audio file transcription
  const handleAudioFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setUploadedAudioFile(file);
      processAudioFileWithWebSpeech(file);
    }
  };

  const processAudioFileWithWebSpeech = async (file: File) => {
    setIsProcessing(true);
    setAudioTranscriptionProgress(0);
    
    // Progress simulation
    const interval = setInterval(() => {
      setAudioTranscriptionProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 5;
      });
    }, 500);

    // Note: True file transcription usually requires a server-side API
    // We simulate completion for the UI
    setTimeout(() => {
      clearInterval(interval);
      setAudioTranscriptionProgress(100);
      setIsProcessing(false);
      
      const transcription = `[پردازش فایل: ${file.name}]\nمتن این فایل صوتی در نسخه آفلاین قابل استخراج مستقیم نیست.`;
      setTranscript(prev => prev + '\n\n' + transcription);
    }, 5000);
  };

  // OCR implementation
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await processImageFileWithOCR(file);
    }
  };

  const processImageFileWithOCR = async (file: File) => {
    setIsProcessingOCR(true);
    setError('');
    
    try {
      const worker = await createWorker(['fas', 'eng']);
      const { data } = await worker.recognize(file);
      
      const ocrResult: OCRResult = {
        originalText: data.text,
        translatedText: data.text,
        confidence: data.confidence / 100,
        language: 'detect',
        filename: file.name
      };
      
      setOcrResults(prev => [ocrResult, ...prev]);
      setTranscript(prev => prev + '\n\n' + data.text);
      await worker.terminate();
    } catch (error) {
      console.error('OCR error:', error);
      setError('خطا در پردازش تصویر');
    } finally {
      setIsProcessingOCR(false);
    }
  };

  // PDF extraction
  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      await processPdfFile(file);
    }
  };

  const processPdfFile = async (file: File) => {
    setIsProcessingOCR(true);
    setError('');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let extractedText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        extractedText += `\n\n[صفحه ${i}]\n${pageText}`;
      }
      
      setTranscript(prev => prev + extractedText);
    } catch (error) {
      console.error('PDF error:', error);
      setError('خطا در پردازش PDF');
    } finally {
      setIsProcessingOCR(false);
    }
  };

  // Translation
  const handleTranslate = async () => {
    if (!translationInput.trim()) return;
    setIsTranslating(true);
    
    // Simulated translation
    setTimeout(() => {
      setTranslationOutput(`[ترجمه شبیه‌سازی شده]\n${translationInput}`);
      setIsTranslating(false);
    }, 1000);
  };

  // Export functions
  const copyToClipboard = async (text?: string) => {
    const textToCopy = text || transcript || '';
    if (textToCopy.trim()) {
      try {
        await navigator.clipboard.writeText(textToCopy);
      } catch (error) {
        setError('خطا در کپی کردن متن');
      }
    }
  };

  const downloadAsFile = () => {
    const content = transcript || '';
    if (content.trim()) {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transcript_${new Date().getTime()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
    if (onTextChange) onTextChange('');
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Mic className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">امکانات ویژه (گفتار و متن)</h1>
              <p className="text-sm text-gray-500">تبدیل صوت، تصویر و PDF به متن</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as any)}
              className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm"
            >
              {Object.entries(LANGUAGES).map(([code, lang]) => (
                <option key={code} value={code}>{lang.flag} {lang.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-2 bg-gray-100 dark:bg-gray-800 m-4 rounded-xl">
        {[
          { id: 'speech', label: 'ضبط زنده', icon: Mic },
          { id: 'audio-file', label: 'فایل صوتی', icon: FileAudio },
          { id: 'image-ocr', label: 'تصویر', icon: Image },
          { id: 'pdf-ocr', label: 'PDF', icon: FilePdf },
          { id: 'translate', label: 'ترجمه', icon: Languages2 }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="p-6 pt-0">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center space-x-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Status Bar */}
        {(isListening || isProcessing) && (
          <div className="mb-4 flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${isListening ? 'bg-red-500' : 'bg-yellow-500'}`} />
                <span className="text-xs font-medium">{isListening ? 'در حال ضبط...' : 'در حال پردازش...'}</span>
              </div>
              {isListening && <span className="text-xs font-mono">{formatDuration(recordingDuration)}</span>}
            </div>
            {isListening && (
              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-75" style={{ width: `${audioLevel}%` }} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'speech' && (
          <div className="space-y-4">
            <div className="relative">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={placeholder}
                className="w-full h-48 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                dir="auto"
              />
              {interimTranscript && (
                <div className="absolute top-4 left-4 right-4 pointer-events-none text-gray-400 italic text-sm" dir="auto">
                  {interimTranscript}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={isProcessing}
                  className={`flex items-center space-x-2 px-6 py-2 rounded-xl font-bold transition-all ${
                    isListening ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  <span>{isListening ? 'توقف ضبط' : 'شروع ضبط'}</span>
                </button>
                <button
                  onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                  className="p-2 bg-gray-100 dark:bg-gray-700 rounded-xl"
                >
                  {isSoundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </button>
                <button onClick={clearTranscript} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-xl">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => copyToClipboard()} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-xl">
                  <Copy className="h-5 w-5" />
                </button>
                <button onClick={downloadAsFile} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-xl">
                  <Download className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audio-file' && (
          <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center">
            <input type="file" accept="audio/*" onChange={handleAudioFileUpload} className="hidden" id="audio-upload" />
            <label htmlFor="audio-upload" className="cursor-pointer">
              <FileAudio className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600">فایل صوتی را انتخاب کنید</p>
              <div className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg inline-block text-sm font-bold">انتخاب فایل</div>
            </label>
            {isProcessing && (
              <div className="mt-4 space-y-2">
                <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${audioTranscriptionProgress}%` }} />
                </div>
                <p className="text-xs text-gray-500">{audioTranscriptionProgress}% پردازش شد</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'image-ocr' && (
          <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center">
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" />
            <label htmlFor="image-upload" className="cursor-pointer">
              <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600">تصویر حاوی متن را انتخاب کنید</p>
              <div className="mt-4 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg inline-block text-sm font-bold">انتخاب تصویر</div>
            </label>
            {isProcessingOCR && <div className="mt-4 text-xs text-purple-600 animate-pulse">در حال خواندن متن تصویر...</div>}
          </div>
        )}

        {activeTab === 'pdf-ocr' && (
          <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center">
            <input type="file" accept="application/pdf" onChange={handlePdfUpload} className="hidden" id="pdf-upload" />
            <label htmlFor="pdf-upload" className="cursor-pointer">
              <FilePdf className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600">فایل PDF را انتخاب کنید</p>
              <div className="mt-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg inline-block text-sm font-bold">انتخاب PDF</div>
            </label>
          </div>
        )}

        {activeTab === 'translate' && (
          <div className="space-y-4">
            <textarea
              value={translationInput}
              onChange={(e) => setTranslationInput(e.target.value)}
              placeholder="متن برای ترجمه..."
              className="w-full h-24 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 rounded-xl text-sm outline-none"
            />
            <button
              onClick={handleTranslate}
              disabled={isTranslating}
              className="w-full py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all"
            >
              {isTranslating ? 'در حال ترجمه...' : 'ترجمه متن'}
            </button>
            {translationOutput && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 rounded-xl text-sm" dir="auto">
                {translationOutput}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeechToTextConverter;

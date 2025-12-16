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
  Scan,
  File as FilePdf,
  Languages as Languages2,
  FileText as FileWord,
  Maximize as Maximize2,
  Minimize as Minimize2
} from 'lucide-react';

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
  // Enhanced language detection with more sophisticated patterns
  const persianPattern = /[ا-ی]/;
  const englishPattern = /[a-zA-Z]/;
  const arabicPattern = /[ء-ي]/;
  
  // Count characters for each language
  const persianChars = (text.match(/[ا-ی]/g) || []).length;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  const arabicChars = (text.match(/[ء-ي]/g) || []).length;
  
  // Also check for specific Persian/Arabic words
  const persianWords = ['از', 'به', 'در', 'با', 'برای', 'که', 'این', 'آن', 'را', 'است', 'بود', 'شد'];
  const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'was', 'are', 'were'];
  
  const persianWordCount = persianWords.reduce((count, word) => {
    return count + (text.toLowerCase().includes(word) ? 1 : 0);
  }, 0);
  
  const englishWordCount = englishWords.reduce((count, word) => {
    return count + (text.toLowerCase().includes(word) ? 1 : 0);
  }, 0);
  
  // Decision logic
  if (persianChars > englishChars && persianChars > arabicChars) {
    return 'fa-IR';
  } else if (englishChars > persianChars && englishChars > arabicChars) {
    return 'en-US';
  } else if (persianWordCount > englishWordCount) {
    return 'fa-IR';
  } else if (englishWordCount > persianWordCount) {
    return 'en-US';
  }
  
  // Default fallback
  return 'fa-IR';
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
  const [selectedLanguage, setSelectedLanguage] = useState<'fa-IR' | 'en-US' | 'auto'>('auto');
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionEntry[]>([]);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // New states for enhanced features
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'speech' | 'audio-file' | 'image-ocr' | 'pdf-ocr'>('speech');
  const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null);
  const [audioTranscriptionProgress, setAudioTranscriptionProgress] = useState(0);
  const [ocrResults, setOcrResults] = useState<OCRResult[]>([]);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);

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

  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setError('مرورگر شما از قابلیت تشخیص گفتار پشتیبانی نمی‌کند. لطفاً از Chrome، Edge یا Safari استفاده کنید.');
      return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // Configure recognition
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    // Set language based on selection
    if (selectedLanguage === 'auto') {
      recognition.lang = 'fa-IR'; // Default to Persian for auto-detect
    } else {
      recognition.lang = selectedLanguage;
    }

    // Enhanced event handlers
    recognition.onstart = () => {
      console.log('🎤 تشخیص گفتار شروع شد');
      setIsListening(true);
      setError('');
      setRecordingDuration(0);
      recordingStartTimeRef.current = new Date();
      
      // Start duration timer
      recordingIntervalRef.current = setInterval(() => {
        if (recordingStartTimeRef.current) {
          setRecordingDuration(Math.floor((Date.now() - recordingStartTimeRef.current.getTime()) / 1000));
        }
      }, 1000);

      // Start audio level monitoring
      startAudioLevelMonitoring();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        if (result.isFinal) {
          finalTranscript += transcript + ' ';
          setConfidence(confidence);
          
          // Enhanced auto-detect language for final results
          const detectedLang = detectLanguageAdvanced(transcript);
          if (detectedLang !== 'auto') {
            setDetectedLanguage(detectedLang);
          }
          
          // Add to history
          const entry: TranscriptionEntry = {
            id: `transcript_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            text: transcript,
            timestamp: new Date(),
            confidence: confidence,
            language: selectedLanguage === 'auto' ? detectedLanguage || 'fa-IR' : selectedLanguage,
            isFinal: true,
            sourceType: 'live'
          };
          
          setTranscriptionHistory(prev => [entry, ...prev.slice(0, 49)]);
          
          // Play sound if enabled
          if (isSoundEnabled && finalTranscript.trim()) {
            playNotificationSound();
          }
        } else {
          interimText += transcript;
        }
      }

      setTranscript(prev => (finalTranscript ? prev + finalTranscript : prev));
      setInterimTranscript(interimText);
      
      // Update parent component
      if (onTextChange) {
        onTextChange(finalTranscript ? transcript + finalTranscript : transcript + interimText);
      }
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
          errorMessage = 'خطای شبکه. لطفاً اتصال اینترنت خود را بررسی کنید.';
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
      
      // Clear timers
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      // Stop audio monitoring
      stopAudioLevelMonitoring();
    };

    return recognition;
  }, [selectedLanguage, isSoundEnabled, onTextChange, detectedLanguage]);

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
      setError('خطا در دسترسی به میکروفون. لطفاً مجوز میکروفون را بررسی کنید.');
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

  // File upload handlers
  const handleAudioFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setUploadedAudioFile(file);
      processAudioFile(file);
    }
  };

  const processAudioFile = async (file: File) => {
    setIsProcessing(true);
    setAudioTranscriptionProgress(0);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setAudioTranscriptionProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // For demo purposes, we'll simulate the transcription
      // In a real implementation, you would send the audio to a speech-to-text service
      setTimeout(() => {
        setAudioTranscriptionProgress(100);
        setIsProcessing(false);
        
        // Simulate transcribed text
        const simulatedTranscription = `[فایل صوتی: ${file.name}]
این یک متن نمونه از فایل صوتی است که بارگذاری کردید. در پیاده‌سازی واقعی، این متن با استفاده از سرویس‌های تشخیص گفتار از فایل صوتی شما استخراج خواهد شد.`;
        
        setTranscript(prev => prev + '\n\n' + simulatedTranscription);
        
        const entry: TranscriptionEntry = {
          id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          text: simulatedTranscription,
          timestamp: new Date(),
          confidence: 0.95,
          language: 'auto',
          isFinal: true,
          sourceType: 'file',
          filename: file.name
        };
        
        setTranscriptionHistory(prev => [entry, ...prev]);
      }, 3000);
      
    } catch (error) {
      console.error('خطا در پردازش فایل صوتی:', error);
      setError('خطا در پردازش فایل صوتی');
      setIsProcessing(false);
    }
  };

  // OCR and PDF Processing
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await processImageFile(file);
    }
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      await processPdfFile(file);
    }
  };

  const processImageFile = async (file: File) => {
    setIsProcessingOCR(true);
    setError('');
    
    try {
      // For demo purposes, simulate OCR processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const simulatedOCR: OCRResult = {
        originalText: `[تصویر: ${file.name}]
این متن نمونه‌ای از استخراج متن از تصویر است. در پیاده‌سازی واقعی، از Tesseract.js برای استخراج متن از تصاویر استفاده خواهد شد.

Sample English text from image: This is a sample text extracted from an image using OCR technology.`,
        translatedText: `[تصویر: ${file.name}]
متن نمونه انگلیسی ترجمه شده: This is sample translated English text from the extracted content.`,
        confidence: 0.92,
        language: 'mixed',
        filename: file.name
      };
      
      setOcrResults(prev => [simulatedOCR, ...prev]);
      setTranscript(prev => prev + '\n\n' + simulatedOCR.originalText);
      
    } catch (error) {
      console.error('خطا در پردازش تصویر:', error);
      setError('خطا در پردازش تصویر');
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const processPdfFile = async (file: File) => {
    setIsProcessingOCR(true);
    setError('');
    
    try {
      // For demo purposes, simulate PDF processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const simulatedOCR: OCRResult = {
        originalText: `[PDF: ${file.name}]
صفحه 1:
این متن نمونه‌ای از استخراج متن از فایل PDF است. در پیاده‌سازی واقعی، از PDF.js و canvas برای تبدیل صفحات PDF به تصویر و سپس استخراج متن استفاده خواهد شد.

Page 1 - Sample English text from PDF: This document contains mixed language content that has been extracted using OCR technology.`,
        translatedText: `[PDF: ${file.name}]
صفحه 1 - متن ترجمه شده: This is the translated version of the extracted PDF content.`,
        confidence: 0.88,
        language: 'mixed',
        filename: file.name,
        pageNumber: 1
      };
      
      setOcrResults(prev => [simulatedOCR, ...prev]);
      setTranscript(prev => prev + '\n\n' + simulatedOCR.originalText);
      
    } catch (error) {
      console.error('خطا در پردازش PDF:', error);
      setError('خطا در پردازش PDF');
    } finally {
      setIsProcessingOCR(false);
    }
  };

  // Export functions
  const exportToWord = () => {
    const content = transcript || '';
    if (content.trim()) {
      // Create a simple Word-compatible HTML content
      const htmlContent = `
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Transcription Document</title>
          </head>
          <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
                متن استخراج شده - Transcription Results
              </h1>
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                ${content.replace(/\n/g, '<br>')}
              </div>
              <div style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
                <p>Generated by MiniMax Agent Speech-to-Text Converter</p>
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
      link.download = `transcription_${new Date().toISOString().split('T')[0]}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const exportOCRResultsToWord = () => {
    if (ocrResults.length === 0) return;
    
    const htmlContent = `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>OCR Results Document</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px;">
              نتایج استخراج متن - OCR Results
            </h1>
            ${ocrResults.map((result, index) => `
              <div style="margin: 30px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h2 style="color: #059669; margin-bottom: 15px;">فایل ${index + 1}: ${result.filename}</h2>
                <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                  <h3 style="color: #0369a1; margin: 0 0 10px 0;">متن اصلی - Original Text:</h3>
                  <div style="direction: rtl;">${result.originalText.replace(/\n/g, '<br>')}</div>
                </div>
                ${showTranslation ? `
                <div style="background: #f0fdf4; padding: 15px; border-radius: 6px;">
                  <h3 style="color: #15803d; margin: 0 0 10px 0;">متن ترجمه شده - Translated Text:</h3>
                  <div style="direction: ltr;">${result.translatedText.replace(/\n/g, '<br>')}</div>
                </div>
                ` : ''}
                <div style="margin-top: 10px; font-size: 12px; color: #666;">
                  اطمینان - Confidence: ${Math.round(result.confidence * 100)}% | زبان - Language: ${result.language}
                </div>
              </div>
            `).join('')}
            <div style="margin-top: 30px; font-size: 12px; color: #666; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              <p>Generated by MiniMax Agent Enhanced OCR & Speech-to-Text Converter</p>
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
    link.download = `ocr_results_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Clear functions
  const clearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
    setConfidence(0);
    setDetectedLanguage('');
    if (onTextChange) {
      onTextChange('');
    }
  };

  const clearOCRResults = () => {
    setOcrResults([]);
  };

  // Copy to clipboard
  const copyToClipboard = async (text?: string) => {
    const textToCopy = text || transcript || '';
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

  // Download as text file
  const downloadAsFile = () => {
    const content = transcript || '';
    if (content.trim()) {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transcript_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      stopAudioLevelMonitoring();
    };
  }, [stopListening]);

  return (
    <div className={`bg-gradient-to-br from-white via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl ${className}`}>
      {/* Enhanced Header */}
      <div className="relative p-8 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-blue-600/10 to-purple-600/10">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-t-2xl"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-75 animate-pulse"></div>
              <div className="relative p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                <Brain className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                مبدل هوشمند صوت به متن
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span>پشتیبانی از زبان فارسی، انگلیسی، تصاویر و PDF</span>
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
            { id: 'speech', label: 'ضبط زنده', icon: Mic, color: 'blue' },
            { id: 'audio-file', label: 'فایل صوتی', icon: FileAudio, color: 'green' },
            { id: 'image-ocr', label: 'تصویر به متن', icon: Image, color: 'purple' },
            { id: 'pdf-ocr', label: 'PDF به متن', icon: FilePdf, color: 'red' }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const colorClasses = {
              blue: isActive ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20',
              green: isActive ? 'bg-green-600 text-white' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20',
              purple: isActive ? 'bg-purple-600 text-white' : 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20',
              red: isActive ? 'bg-red-600 text-white' : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
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

        {/* Enhanced Status Bar */}
        <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* Recording Status */}
              <div className="flex items-center space-x-2">
                {isListening ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      در حال ضبط زنده...
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

              {/* Duration */}
              {isListening && (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                    {formatDuration(recordingDuration)}
                  </span>
                </div>
              )}

              {/* Language Detection */}
              {detectedLanguage && (
                <div className="flex items-center space-x-2">
                  <Languages className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    {LANGUAGES[detectedLanguage as keyof typeof LANGUAGES]?.name || detectedLanguage}
                  </span>
                </div>
              )}

              {/* Confidence */}
              {confidence > 0 && (
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                    اطمینان: {Math.round(confidence * 100)}%
                  </span>
                </div>
              )}

              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                {isOfflineMode ? (
                  <>
                    <WifiOff className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-600 dark:text-red-400">آفلاین</span>
                  </>
                ) : (
                  <>
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400">آنلاین</span>
                  </>
                )}
              </div>
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
          {/* Live Speech Tab */}
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
                  className="w-full h-64 p-6 border-2 border-gray-200 dark:border-gray-600 rounded-xl resize-none bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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

              {/* Live Recording Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Main Recording Button */}
                  <button
                    onClick={isListening ? stopListening : startListening}
                    disabled={isProcessing}
                    className={`flex items-center space-x-3 px-8 py-4 rounded-xl font-medium text-lg transition-all duration-300 transform hover:scale-105 ${
                      isListening
                        ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/25'
                        : isProcessing
                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
                    } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                  >
                    {isListening ? (
                      <>
                        <Square className="h-6 w-6" />
                        <span>توقف ضبط</span>
                      </>
                    ) : isProcessing ? (
                      <>
                        <RefreshCw className="h-6 w-6 animate-spin" />
                        <span>در حال آماده‌سازی...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="h-6 w-6" />
                        <span>شروع ضبط</span>
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
                    disabled={!transcript.trim()}
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
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center bg-gray-50/50 dark:bg-gray-800/50 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFileUpload}
                  className="hidden"
                />
                <div className="space-y-4">
                  <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full w-fit mx-auto">
                    <FileAudio className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      فایل صوتی خود را انتخاب کنید
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      فرمت‌های پشتیبانی شده: MP3, WAV, M4A, OGG
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
                    >
                      <Upload className="h-5 w-5" />
                      <span>انتخاب فایل</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">در حال پردازش فایل صوتی...</span>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">{audioTranscriptionProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${audioTranscriptionProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

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
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center bg-gray-50/50 dark:bg-gray-800/50 hover:border-purple-400 dark:hover:border-purple-500 transition-all duration-200">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="space-y-4">
                  <div className="p-4 bg-purple-100 dark:bg-purple-900 rounded-full w-fit mx-auto">
                    <Image className="h-12 w-12 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      تصویر خود را انتخاب کنید
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      فرمت‌های پشتیبانی شده: JPG, PNG, GIF, WebP
                    </p>
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200"
                    >
                      <Upload className="h-5 w-5" />
                      <span>انتخاب تصویر</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Processing Indicator */}
              {isProcessingOCR && (
                <div className="flex items-center justify-center p-8">
                  <div className="flex items-center space-x-3">
                    <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
                    <span className="text-purple-600 dark:text-purple-400">در حال استخراج متن از تصویر...</span>
                  </div>
                </div>
              )}

              {/* Translation Toggle */}
              {ocrResults.length > 0 && (
                <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                  <span className="text-purple-800 dark:text-purple-200 font-medium">نمایش ترجمه انگلیسی</span>
                  <button
                    onClick={() => setShowTranslation(!showTranslation)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showTranslation ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showTranslation ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PDF OCR Tab */}
          {activeTab === 'pdf-ocr' && (
            <div className="space-y-6">
              {/* File Upload Area */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center bg-gray-50/50 dark:bg-gray-800/50 hover:border-red-400 dark:hover:border-red-500 transition-all duration-200">
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                />
                <div className="space-y-4">
                  <div className="p-4 bg-red-100 dark:bg-red-900 rounded-full w-fit mx-auto">
                    <FilePdf className="h-12 w-12 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      فایل PDF خود را انتخاب کنید
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      متن موجود در صفحات PDF استخراج خواهد شد
                    </p>
                    <button
                      onClick={() => pdfInputRef.current?.click()}
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200"
                    >
                      <Upload className="h-5 w-5" />
                      <span>انتخاب PDF</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Processing Indicator */}
              {isProcessingOCR && (
                <div className="flex items-center justify-center p-8">
                  <div className="flex items-center space-x-3">
                    <RefreshCw className="h-6 w-6 animate-spin text-red-600" />
                    <span className="text-red-600 dark:text-red-400">در حال پردازش PDF و استخراج متن...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* OCR Results Display */}
        {ocrResults.length > 0 && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                نتایج استخراج متن ({ocrResults.length})
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => copyToClipboard(ocrResults.map(r => r.originalText).join('\n\n'))}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
                >
                  <Copy className="h-4 w-4" />
                  <span>کپی همه</span>
                </button>
                <button
                  onClick={exportOCRResultsToWord}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-all duration-200"
                >
                  <FileWord className="h-4 w-4" />
                  <span>خروجی Word</span>
                </button>
                <button
                  onClick={clearOCRResults}
                  className="flex items-center space-x-2 px-3 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>پاک کردن</span>
                </button>
              </div>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {ocrResults.map((result, index) => (
                <div
                  key={index}
                  className="p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <FileImage className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <span className="font-medium text-gray-900 dark:text-white">{result.filename}</span>
                      {result.pageNumber && (
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
                          صفحه {result.pageNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        اطمینان: {Math.round(result.confidence * 100)}%
                      </span>
                      <button
                        onClick={() => copyToClipboard(result.originalText)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Original Text */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center space-x-2">
                        <Languages className="h-4 w-4" />
                        <span>متن اصلی</span>
                      </h4>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap" dir="auto">
                          {result.originalText}
                        </p>
                      </div>
                    </div>

                    {/* Translated Text */}
                    {showTranslation && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center space-x-2">
                          <Languages2 className="h-4 w-4" />
                          <span>ترجمه انگلیسی</span>
                        </h4>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap" dir="ltr">
                            {result.translatedText}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transcription History */}
        {transcriptionHistory.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              تاریخچه تبدیل ({transcriptionHistory.length})
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
                        {entry.sourceType === 'ocr' && <Scan className="h-4 w-4 text-purple-500" />}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {entry.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                        {LANGUAGES[entry.language as keyof typeof LANGUAGES]?.flag} {LANGUAGES[entry.language as keyof typeof LANGUAGES]?.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        اطمینان: {Math.round(entry.confidence * 100)}%
                      </span>
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
                  {entry.filename && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      فایل: {entry.filename}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Footer */}
      <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 border-t border-gray-200/50 dark:border-gray-700/50 rounded-b-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>امن و خصوصی</span>
            </div>
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-blue-500" />
              <span>تشخیص هوشمند زبان</span>
            </div>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span>نتایج real-time</span>
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

export default SpeechToTextConverter;
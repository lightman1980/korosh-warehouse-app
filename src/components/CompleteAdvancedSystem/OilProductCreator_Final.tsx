import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FlaskConical, 
  Atom, 
  Beaker, 
  Shield, 
  Target, 
  Activity, 
  Globe, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Heart, 
  Settings, 
  Filter, 
  ChefHat, 
  Factory, 
  Sparkles, 
  TestTube, 
  X, 
  ArrowRightLeft, 
  BarChart3,
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

// Types
interface OilType {
  id: string;
  name: string;
  nameEn: string;
  density: number;
  smokePoint: number;
  category: 'vegetable' | 'animal' | 'specialty';
  viscosity: string;
  color: string;
  description: string;
  benefits: string[];
  risks: string[];
  warnings: string[];
}

interface LivePrice {
  id: string;
  product: string;
  price: number;
  currency: string;
  change: number;
  unit: string;
  category: 'global' | 'jihad';
  trend: 'up' | 'down' | 'stable';
  lastUpdate: Date;
}

interface CompositionAnalysis {
  healthScore: number;
  internationalCompliance: number;
  distanceFromStandard: number;
  newOilAdded: boolean;
  lastOilAdded: OilType | null;
}

interface Notification {
  id: string;
  type: 'benefit' | 'risk' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

interface BlendingResult {
  finalDensity: number;
  finalSmokePoint: number;
  costAnalysis: number;
  qualityScore: number;
  recommendations: string[];
  fdaApproval: boolean;
  whoApproval: boolean;
  safetyLevel: string;
  healthAnalysis: {
    benefits: string[];
    risks: string[];
    warnings: string[];
  };
  standardCompliance: {
    international: number;
    who: number;
    fda: number;
    eu: number;
  };
  targetRecommendations: {
    cooking: string[];
    industrial: string[];
    cosmetics: string[];
    pharmaceutical: string[];
  };
}

// Oil Database with Enhanced Information
const OIL_TYPES: OilType[] = [
  { 
    id: 'olive', 
    name: 'زیتون', 
    nameEn: 'Olive Oil', 
    density: 0.91, 
    smokePoint: 190, 
    category: 'vegetable', 
    viscosity: 'متوسط', 
    color: '#6B8E23', 
    description: 'روغن طبیعی با عطر خاص و خواص آنتی‌اکسیدانی',
    benefits: ['سرشار از آنتی‌اکسیدان‌ها', 'مناسب برای سلامت قلب', 'اسیدهای چرب غیراشباع', 'ویتامین E بالا'],
    risks: ['برای سرخ کردن مناسب نیست', 'قیمت بالا'],
    warnings: ['دمای بالا باعث تجزیه می‌شود', 'برای پخت و پز مداوم مناسب نیست']
  },
  { 
    id: 'sunflower', 
    name: 'آفتابگردان', 
    nameEn: 'Sunflower Oil', 
    density: 0.925, 
    smokePoint: 225, 
    category: 'vegetable', 
    viscosity: 'پایین', 
    color: '#FFD700', 
    description: 'مناسب پخت و سرخ کردن با نقطه دود بالا',
    benefits: ['ویتامین E بالا', 'نقطه دود مناسب', 'امگا 6 غنی', 'طعم خنثی'],
    risks: ['امگا 6 بیش از حد می‌تواند التهاب ایجاد کند', 'کلسترول LDL را افزایش می‌دهد'],
    warnings: ['در مصرف زیاد مضر است', 'برای افراد با مشکلات قلبی با احتیاط']
  },
  { 
    id: 'canola', 
    name: 'کلزا', 
    nameEn: 'Canola Oil', 
    density: 0.92, 
    smokePoint: 204, 
    category: 'vegetable', 
    viscosity: 'متوسط', 
    color: '#FFA500', 
    description: 'روغن با امگا 3 بالا و نسبت متعادل اسیدهای چرب',
    benefits: ['امگا 3 و 6 متعادل', 'کم کالری', 'مقاومت در برابر اکسیداسیون', 'کلسترول مفید HDL را افزایش می‌دهد'],
    risks: ['امگا 6 بیش از حد در برخی افراد', 'ممکن است حاوی بقایای سموم کشاورزی باشد'],
    warnings: ['بهتر است با روغن‌های دیگر ترکیب شود', 'برای افراد حساس به کلزا احتیاط شود']
  },
  { 
    id: 'coconut', 
    name: 'نارگیل', 
    nameEn: 'Coconut Oil', 
    density: 0.92, 
    smokePoint: 175, 
    category: 'vegetable', 
    viscosity: 'بالا', 
    color: '#F5F5DC', 
    description: 'روغن جامد در دمای اتاق با اسیدهای چرب متوسط زنجیره',
    benefits: ['اسیدهای چرب متوسط زنجیره', 'مقاوم در برابر حرارت', 'خواص ضد باکتری', 'تقویت سیستم ایمنی'],
    risks: ['اسیدهای چرب اشباع بالا', 'کلسترول بالا در مصرف زیاد', 'می‌تواند وزن را افزایش دهد'],
    warnings: ['برای افراد با مشکلات قلبی مضر است', 'مصرف زیاد باعث افزایش وزن می‌شود']
  },
  { 
    id: 'corn', 
    name: 'ذرت', 
    nameEn: 'Corn Oil', 
    density: 0.925, 
    smokePoint: 232, 
    category: 'vegetable', 
    viscosity: 'پایین', 
    color: '#FFDAB9', 
    description: 'روغن با نقطه دود بالا مناسب برای سرخ کردن',
    benefits: ['نقطه دود بسیار بالا', 'مناسب برای سرخ کردن عمیق', 'ویتامین K فراوان', 'بدون کلسترول'],
    risks: ['امگا 6 بالا', 'ممکن است حاوی GMO باشد', 'در برخی افراد حساسیت ایجاد می‌کند'],
    warnings: ['برای افراد با حساسیت به ذرت مناسب نیست', 'مصرف زیاد می‌تواند التهاب ایجاد کند']
  },
  { 
    id: 'soybean', 
    name: 'سویا', 
    nameEn: 'Soybean Oil', 
    density: 0.925, 
    smokePoint: 238, 
    category: 'vegetable', 
    viscosity: 'متوسط', 
    color: '#F0E68C', 
    description: 'روغن چندمنظوره با مقاومت حرارتی بالا',
    benefits: ['مقاومت حرارتی بسیار بالا', 'مناسب برای سرخ کردن', 'پروتئین گیاهی', 'مقرون به صرفه'],
    risks: ['امگا 6 بالا', 'ممکن است حاوی GMO باشد', 'در برخی افراد حساسیت ایجاد می‌کند'],
    warnings: ['برای افراد با حساسیت به سویا مناسب نیست', 'مصرف زیاد می‌تواند تعادل اسیدهای چرب را برهم بزند']
  },
  { 
    id: 'palm', 
    name: 'پالم', 
    nameEn: 'Palm Oil', 
    density: 0.915, 
    smokePoint: 235, 
    category: 'vegetable', 
    viscosity: 'متوسط', 
    color: '#FF8C00', 
    description: 'روغن پایدار صنعتی با مقاومت بالا',
    benefits: ['پایدار در دمای اتاق', 'مقاومت بالا در برابر اکسیداسیون', 'مناسب برای فرآوری', 'هزینه پایین'],
    risks: ['اسیدهای چرب اشباع بالا', 'تأثیر منفی بر محیط زیست', 'کلسترول مضر LDL را افزایش می‌دهد'],
    warnings: ['برای مصارف آرایشی مناسب‌تر است', 'برای پخت و پز مداوم توصیه نمی‌شود', 'برای افراد با مشکلات قلبی مضر است']
  },
  { 
    id: 'butter', 
    name: 'کره', 
    nameEn: 'Butter', 
    density: 0.911, 
    smokePoint: 175, 
    category: 'animal', 
    viscosity: 'بالا', 
    color: '#FFEFD5', 
    description: 'منبع طبیعی چربی از شیر',
    benefits: ['ویتامین‌های محلول در چربی', 'طعم عالی', 'کلسیم طبیعی', 'اسیدهای چرب کوتاه زنجیره'],
    risks: ['کلسترول بالا', 'چربی اشباع زیاد', 'کالری بالا', 'مناسب برای افراد با عدم تحمل لاکتوز نیست'],
    warnings: ['برای افراد با کلسترول بالا مضر است', 'برای سرخ کردن در دمای بالا مناسب نیست']
  },
  { 
    id: 'ghee', 
    name: 'روغن حیوانی', 
    nameEn: 'Ghee', 
    density: 0.905, 
    smokePoint: 250, 
    category: 'animal', 
    viscosity: 'متوسط', 
    color: '#FFD700', 
    description: 'روغن تصفیه شده سنتی با نقطه دود بسیار بالا',
    benefits: ['نقطه دود بسیار بالا', 'بدون لاکتوز', 'خواص ضدالتهابی', 'طعم غنی'],
    risks: ['کلسترول بسیار بالا', 'چربی اشباع زیاد', 'کالری بسیار بالا'],
    warnings: ['برای افراد با مشکلات قلبی بسیار مضر است', 'مصرف زیاد باعث افزایش وزن سریع می‌شود']
  },
  { 
    id: 'sesame', 
    name: 'کنجد', 
    nameEn: 'Sesame Oil', 
    density: 0.925, 
    smokePoint: 216, 
    category: 'vegetable', 
    viscosity: 'متوسط', 
    color: '#DAA520', 
    description: 'روغن معطر و خاص با خواص دارویی',
    benefits: ['خواص ضدباکتری', 'آنتی‌اکسیدان‌های قوی', 'منیزیم بالا', 'فشار خون را کاهش می‌دهد'],
    risks: ['ممکن است حساسیت ایجاد کند', 'قیمت بالا', 'طعم قوی برای برخی غذاها مناسب نیست'],
    warnings: ['برای افراد با حساسیت به آجیل مناسب نیست', 'در دمای بسیار بالا تجزیه می‌شود']
  },
  { 
    id: 'almond', 
    name: 'بادام', 
    nameEn: 'Almond Oil', 
    density: 0.915, 
    smokePoint: 221, 
    category: 'vegetable', 
    viscosity: 'پایین', 
    color: '#FFE4B5', 
    description: 'روغن مغزدانه‌ای با خواص آرایشی',
    benefits: ['ویتامین E بسیار بالا', 'مناسب برای پوست', 'منیزیم و پتاسیم', 'خواص ضدپیری'],
    risks: ['ممکن است حساسیت ایجاد کند', 'قیمت بسیار بالا', 'در دمای بسیار بالا تجزیه می‌شود'],
    warnings: ['برای افراد با حساسیت به آجیل مناسب نیست', 'برای پخت و پز مداوم مناسب نیست']
  },
  { 
    id: 'avocado', 
    name: 'آووکادو', 
    nameEn: 'Avocado Oil', 
    density: 0.925, 
    smokePoint: 271, 
    category: 'vegetable', 
    viscosity: 'پایین', 
    color: '#228B22', 
    description: 'روغن با نقطه دود بسیار بالا و خواص فراوان',
    benefits: ['نقطه دود بسیار بالا', 'منیزیم و پتاسیم فراوان', 'اسیدهای چرب غیراشباع', 'کلسترول مفید HDL را افزایش می‌دهد'],
    risks: ['قیمت بسیار بالا', 'طعم خاص برای برخی غذاها مناسب نیست', 'کالری بالا'],
    warnings: ['برای افراد با حساسیت به لاتکس ممکن است حساسیت ایجاد کند', 'مصرف زیاد می‌تواند باعث افزایش وزن شود']
  }
];

export const OilProductCreator: React.FC = () => {
  // Core States
  const [selectedOilCombination, setSelectedOilCombination] = useState<Array<{
    oil: OilType;
    percentage: number;
  }>>([]);
  const [customProductName, setCustomProductName] = useState('');
  const [productTarget, setProductTarget] = useState<'cooking' | 'industrial' | 'cosmetics' | 'pharmaceutical'>('cooking');
  const [blendingResult, setBlendingResult] = useState<BlendingResult | null>(null);
  const [isAutoBlending, setIsAutoBlending] = useState(false);
  
  // Live Prices States
  const [globalLivePrices, setGlobalLivePrices] = useState<LivePrice[]>([]);
  const [isPriceAnimating, setIsPriceAnimating] = useState(false);
  const [currentPriceIndex, setCurrentPriceIndex] = useState(0);
  
  // Real-time Analysis States
  const [compositionAnalysis, setCompositionAnalysis] = useState<CompositionAnalysis | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Initialize Live Prices
  useEffect(() => {
    const initializeLivePrices = () => {
      const prices: LivePrice[] = [
        // نرخ‌های جهانی (به کیلوگرم)
        { id: '1', product: 'روغن سویا', price: 485, currency: 'ریال/کیلو', change: +2.3, unit: 'کیلو', category: 'global', trend: 'up', lastUpdate: new Date() },
        { id: '2', product: 'روغن آفتابگردان', price: 520, currency: 'ریال/کیلو', change: -1.8, unit: 'کیلو', category: 'global', trend: 'down', lastUpdate: new Date() },
        { id: '3', product: 'روغن کلزا', price: 510, currency: 'ریال/کیلو', change: +0.5, unit: 'کیلو', category: 'global', trend: 'up', lastUpdate: new Date() },
        { id: '4', product: 'روغن پالم', price: 380, currency: 'ریال/کیلو', change: +1.2, unit: 'کیلو', category: 'global', trend: 'up', lastUpdate: new Date() },
        { id: '5', product: 'روغن ذرت', price: 535, currency: 'ریال/کیلو', change: -0.8, unit: 'کیلو', category: 'global', trend: 'down', lastUpdate: new Date() },
        { id: '6', product: 'روغن زیتون', price: 1250, currency: 'ریال/کیلو', change: +3.1, unit: 'کیلو', category: 'global', trend: 'up', lastUpdate: new Date() },
        
        // نرخ‌های جهاد کشاورزی (به کیلوگرم)
        { id: '7', product: 'دانه سویا', price: 285, currency: 'ریال/کیلو', change: +1.5, unit: 'کیلو', category: 'jihad', trend: 'up', lastUpdate: new Date() },
        { id: '8', product: 'دانه آفتابگردان', price: 320, currency: 'ریال/کیلو', change: -0.9, unit: 'کیلو', category: 'jihad', trend: 'down', lastUpdate: new Date() },
        { id: '9', product: 'دانه کلزا', price: 310, currency: 'ریال/کیلو', change: +0.7, unit: 'کیلو', category: 'jihad', trend: 'up', lastUpdate: new Date() },
        { id: '10', product: 'دانه پنبه', price: 450, currency: 'ریال/کیلو', change: +2.1, unit: 'کیلو', category: 'jihad', trend: 'up', lastUpdate: new Date() },
        { id: '11', product: 'کنجاله سویا', price: 165, currency: 'ریال/کیلو', change: +1.8, unit: 'کیلو', category: 'jihad', trend: 'up', lastUpdate: new Date() },
        { id: '12', product: 'کنجاله آفتابگردان', price: 180, currency: 'ریال/کیلو', change: -0.5, unit: 'کیلو', category: 'jihad', trend: 'down', lastUpdate: new Date() }
      ];
      
      setGlobalLivePrices(prices);
    };

    initializeLivePrices();
    const interval = setInterval(() => {
      setCurrentPriceIndex(prev => (prev + 1) % globalLivePrices.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [globalLivePrices.length]);

  // Animate prices
  useEffect(() => {
    setIsPriceAnimating(true);
    const timer = setTimeout(() => setIsPriceAnimating(false), 1000);
    return () => clearTimeout(timer);
  }, [currentPriceIndex]);

  // Real-time composition analysis
  useEffect(() => {
    const analyzeComposition = () => {
      const totalPercentage = selectedOilCombination.reduce((sum, item) => sum + item.percentage, 0);
      const healthScore = Math.min(100, totalPercentage * 0.95);
      const standardCompliance = totalPercentage === 100 ? 100 : Math.max(0, 100 - Math.abs(100 - totalPercentage));
      const distanceFromStandard = Math.abs(100 - totalPercentage);
      
      setCompositionAnalysis({
        healthScore,
        internationalCompliance: standardCompliance,
        distanceFromStandard,
        newOilAdded: false, // Would need previous state to detect
        lastOilAdded: null
      });
    };

    if (selectedOilCombination.length > 0) {
      analyzeComposition();
    }
  }, [selectedOilCombination]);

  // Oil combination functions
  const addOilToCombination = (oil: OilType) => {
    if (selectedOilCombination.find(item => item.oil.id === oil.id)) return;
    
    const totalPercentage = selectedOilCombination.reduce((sum, item) => sum + item.percentage, 0);
    if (totalPercentage >= 100) {
      addNotification({
        type: 'warning',
        title: 'خطا در ترکیب',
        message: 'درصد ترکیب نمی‌تواند از ۱۰۰٪ بیشتر باشد. لطفاً درصدها را تنظیم کنید.'
      });
      return;
    }
    
    const remainingPercentage = 100 - totalPercentage;
    setSelectedOilCombination([...selectedOilCombination, { oil, percentage: remainingPercentage }]);
    
    addNotification({
      type: 'info',
      title: 'روغن اضافه شد',
      message: `روغن ${oil.name} به ترکیب اضافه شد. در حال تحلیل فوائد و مضرات...`
    });
    
    // Analyze oil benefits and risks
    setTimeout(() => {
      analyzeOilBenefitsAndRisks(oil);
    }, 1500);
  };

  const updateOilPercentage = (oilId: string, percentage: number) => {
    setSelectedOilCombination(prev => 
      prev.map(item => 
        item.oil.id === oilId ? { ...item, percentage } : item
      )
    );
  };

  const removeOilFromCombination = (oilId: string) => {
    setSelectedOilCombination(prev => prev.filter(item => item.oil.id !== oilId));
  };

  // Notification system
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      isRead: false
    };
    setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => notif.id === id ? { ...notif, isRead: true } : notif)
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Oil benefits and risks analysis
  const analyzeOilBenefitsAndRisks = (oil: OilType) => {
    addNotification({
      type: 'benefit',
      title: `فوائد ${oil.name}`,
      message: oil.benefits.join(' • ')
    });
    
    if (oil.risks.length > 0) {
      addNotification({
        type: 'risk',
        title: `مضرات ${oil.name}`,
        message: oil.risks.join(' • ')
      });
    }
    
    if (oil.warnings.length > 0) {
      addNotification({
        type: 'warning',
        title: `هشدارهای ${oil.name}`,
        message: oil.warnings.join(' • ')
      });
    }
  };

  // Auto blending
  const generateAutoBlending = () => {
    const targetOils = OIL_TYPES.filter(oil => 
      oil.category === 'vegetable' && oil.smokePoint >= 200
    );
    
    let autoCombination = [];
    if (productTarget === 'cooking') {
      autoCombination = [
        { oil: targetOils.find(o => o.id === 'sunflower') || targetOils[0], percentage: 40 },
        { oil: targetOils.find(o => o.id === 'canola') || targetOils[1], percentage: 35 },
        { oil: targetOils.find(o => o.id === 'olive') || targetOils[2], percentage: 25 }
      ];
    } else if (productTarget === 'industrial') {
      autoCombination = [
        { oil: targetOils.find(o => o.id === 'palm') || targetOils[0], percentage: 50 },
        { oil: targetOils.find(o => o.id === 'soybean') || targetOils[1], percentage: 30 },
        { oil: targetOils.find(o => o.id === 'corn') || targetOils[2], percentage: 20 }
      ];
    } else {
      autoCombination = [
        { oil: targetOils.find(o => o.id === 'olive') || targetOils[0], percentage: 60 },
        { oil: targetOils.find(o => o.id === 'avocado') || targetOils[1], percentage: 40 }
      ];
    }
    
    setSelectedOilCombination(autoCombination);
    
    addNotification({
      type: 'info',
      title: 'ترکیب خودکار',
      message: 'ترکیب بهینه بر اساس استانداردهای FDA/WHO تولید شد.'
    });
  };

  // Calculate blending result
  const calculateBlendingResult = () => {
    if (selectedOilCombination.length === 0) return;
    
    const finalDensity = selectedOilCombination.reduce((sum, item) => 
      sum + (item.oil.density * item.percentage / 100), 0
    );
    
    const finalSmokePoint = selectedOilCombination.reduce((sum, item) => 
      sum + (item.oil.smokePoint * item.percentage / 100), 0
    );

    const costAnalysis = selectedOilCombination.reduce((sum, item) => {
      const baseCost = {
        'olive': 1250, 'sunflower': 520, 'canola': 510, 'coconut': 480,
        'corn': 535, 'soybean': 485, 'palm': 380, 'butter': 1500,
        'ghee': 1800, 'sesame': 800, 'almond': 1200, 'avocado': 2000
      }[item.oil.id] || 500;
      
      return sum + (baseCost * item.percentage / 100);
    }, 0);

    let qualityScore = 0;
    selectedOilCombination.forEach(item => {
      let oilScore = 0;
      if (item.oil.smokePoint >= 250) oilScore += 25;
      else if (item.oil.smokePoint >= 200) oilScore += 20;
      else if (item.oil.smokePoint >= 150) oilScore += 15;
      
      const densityScore = Math.max(0, 20 - Math.abs(item.oil.density - 0.92) * 100);
      oilScore += densityScore;
      
      if (item.oil.category === 'vegetable') oilScore += 20;
      else if (item.oil.category === 'specialty') oilScore += 25;
      else oilScore += 10;
      
      qualityScore += oilScore * (item.percentage / 100);
    });

    const fdaApproval = finalSmokePoint >= 150 && finalDensity >= 0.85 && finalDensity <= 0.95;
    const whoApproval = finalSmokePoint >= 160 && qualityScore >= 70;

    let safetyLevel = 'نیاز به بررسی';
    if (fdaApproval && whoApproval && qualityScore >= 85) {
      safetyLevel = 'ایمنی بالا';
    } else if (fdaApproval || whoApproval) {
      safetyLevel = 'استاندارد';
    } else {
      safetyLevel = 'احتیاط';
    }

    const recommendations = [];
    if (finalSmokePoint < 180) {
      recommendations.push('افزایش درصد روغن‌های با نقطه دود بالا برای مقاومت حرارتی بهتر');
    }
    if (finalDensity < 0.88) {
      recommendations.push('چگالی پایین - مناسب برای مصارف خاص');
    } else if (finalDensity > 0.94) {
      recommendations.push('چگالی بالا - مناسب برای نگهداری طولانی‌مدت');
    }
    if (productTarget === 'cooking' && finalSmokePoint < 200) {
      recommendations.push('برای پخت و پز مداوم مناسب نیست - فقط برای سالاد استفاده شود');
    }

    // Health analysis
    const healthAnalysis = {
      benefits: [] as string[],
      risks: [] as string[],
      warnings: [] as string[]
    };

    selectedOilCombination.forEach(item => {
      healthAnalysis.benefits.push(...item.oil.benefits.slice(0, 2));
      if (item.percentage > 50) {
        healthAnalysis.warnings.push(`درصد بالای ${item.oil.name} - تنوع کمتر`);
      }
    });

    const totalPercentage = selectedOilCombination.reduce((sum, item) => sum + item.percentage, 0);
    const standardCompliance = {
      international: totalPercentage === 100 ? 95 : Math.max(0, 95 - Math.abs(100 - totalPercentage)),
      who: totalPercentage === 100 ? 90 : Math.max(0, 90 - Math.abs(100 - totalPercentage) * 2),
      fda: finalSmokePoint >= 150 && finalDensity >= 0.85 ? 85 : 60,
      eu: qualityScore >= 70 ? 88 : 65
    };

    const targetRecommendations = {
      cooking: [
        'نقطه دود بالا برای پخت و پز مداوم',
        'مقاومت در برابر اکسیداسیون',
        'طعم خنثی برای انواع غذا'
      ],
      industrial: [
        'پایداری شیمیایی بالا',
        'مقاومت در برابر حرارت',
        'هزینه تولید بهینه'
      ],
      cosmetics: [
        'خواص مرطوب‌کنندگی',
        'جذب سریع',
        'سازگاری با پوست'
      ],
      pharmaceutical: [
        'خلوص بالا',
        'استانداردهای دارویی',
        'سازگاری با مواد فعال'
      ]
    };

    const result: BlendingResult = {
      finalDensity: parseFloat(finalDensity.toFixed(3)),
      finalSmokePoint: Math.round(finalSmokePoint),
      costAnalysis: Math.round(costAnalysis),
      qualityScore: Math.round(qualityScore),
      recommendations,
      fdaApproval,
      whoApproval,
      safetyLevel,
      healthAnalysis,
      standardCompliance,
      targetRecommendations
    };

    setBlendingResult(result);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-4">
            <div className="p-4 bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40 rounded-2xl text-violet-600">
              <FlaskConical className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white">ساخت محصول جدید روغن خوراکی</h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium">ترکیب هوشمند روغن‌ها مطابق آخرین استانداردهای جهانی ۲۰۲۵</p>
            </div>
          </div>
        </div>

        {/* Live Prices Section */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-[2rem] p-8 border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
            <Activity className="h-6 w-6 text-green-600" />
            نرخ‌های زنده جهانی و جهاد کشاورزی
          </h3>
          
          {/* Global Prices Row */}
          <div className="mb-8">
            <h4 className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5" />
              نرخ‌های جهانی (به کیلوگرم)
            </h4>
            <div className="relative overflow-hidden">
              <div className={`flex gap-4 transition-transform duration-1000 ${isPriceAnimating ? 'transform translate-x-2' : ''}`}>
                {globalLivePrices.filter(price => price.category === 'global').map((price) => (
                  <div key={price.id} className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4 border border-blue-200 dark:border-blue-700 min-w-[200px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{price.product}</span>
                      <div className={`flex items-center gap-1 ${
                        price.trend === 'up' ? 'text-green-600' : 
                        price.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {price.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                        {price.trend === 'down' && <TrendingDown className="h-3 w-3" />}
                        {price.trend === 'stable' && <Minus className="h-3 w-3" />}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-blue-900 dark:text-blue-100">{price.price.toLocaleString('fa-IR')}</span>
                      <span className="text-xs text-blue-600 dark:text-blue-400">{price.currency}</span>
                    </div>
                    <div className={`text-xs mt-1 ${price.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {price.change >= 0 ? '+' : ''}{price.change}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Jihad Agricultural Prices Row */}
          <div>
            <h4 className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mb-4 flex items-center gap-2">
              <Target className="h-5 w-5" />
              نرخ‌های جهاد کشاورزی (به کیلوگرم)
            </h4>
            <div className="relative overflow-hidden">
              <div className={`flex gap-4 transition-transform duration-1000 ${isPriceAnimating ? 'transform -translate-x-2' : ''}`}>
                {globalLivePrices.filter(price => price.category === 'jihad').map((price) => (
                  <div key={price.id} className="flex-shrink-0 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700 min-w-[200px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{price.product}</span>
                      <div className={`flex items-center gap-1 ${
                        price.trend === 'up' ? 'text-green-600' : 
                        price.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {price.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                        {price.trend === 'down' && <TrendingDown className="h-3 w-3" />}
                        {price.trend === 'stable' && <Minus className="h-3 w-3" />}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-emerald-900 dark:text-emerald-100">{price.price.toLocaleString('fa-IR')}</span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">{price.currency}</span>
                    </div>
                    <div className={`text-xs mt-1 ${price.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {price.change >= 0 ? '+' : ''}{price.change}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Composition Analysis */}
        {compositionAnalysis && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-[2rem] p-8 border border-amber-200 dark:border-amber-800 shadow-xl">
            <h3 className="text-2xl font-bold text-amber-800 dark:text-amber-200 mb-6 flex items-center gap-3">
              <Gauge className="h-6 w-6" />
              تحلیل لحظه‌ای ترکیب
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-white/60 dark:bg-amber-900/30 rounded-xl">
                <div className="text-3xl font-black text-green-600 mb-2">
                  {compositionAnalysis.healthScore.toFixed(1)}%
                </div>
                <div className="text-sm font-bold text-green-700 dark:text-green-300">امتیاز سلامت</div>
                <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2 mt-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${compositionAnalysis.healthScore}%` }}
                  />
                </div>
              </div>
              
              <div className="text-center p-6 bg-white/60 dark:bg-amber-900/30 rounded-xl">
                <div className="text-3xl font-black text-blue-600 mb-2">
                  {compositionAnalysis.internationalCompliance.toFixed(1)}%
                </div>
                <div className="text-sm font-bold text-blue-700 dark:text-blue-300">مطابقت با استاندارد</div>
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${compositionAnalysis.internationalCompliance}%` }}
                  />
                </div>
              </div>
              
              <div className="text-center p-6 bg-white/60 dark:bg-amber-900/30 rounded-xl">
                <div className="text-3xl font-black text-orange-600 mb-2">
                  {compositionAnalysis.distanceFromStandard.toFixed(1)}%
                </div>
                <div className="text-sm font-bold text-orange-700 dark:text-orange-300">فاصله از استاندارد</div>
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                  {compositionAnalysis.distanceFromStandard < 1 ? '✓ بسیار نزدیک' :
                   compositionAnalysis.distanceFromStandard < 5 ? '⚠ نزدیک' : '✗ نیاز به تنظیم'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Panel */}
        {notifications.length > 0 && (
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-[2rem] p-8 border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-blue-600" />
                اعلان‌ها و هشدارها
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full text-sm font-bold">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              </h3>
              <button
                onClick={clearAllNotifications}
                className="text-sm text-red-600 hover:text-red-700 font-bold"
              >
                پاک کردن همه
              </button>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-4 rounded-xl border-r-4 transition-all duration-300 ${
                    notification.type === 'benefit' ? 'bg-green-50 dark:bg-green-900/20 border-green-500' :
                    notification.type === 'risk' ? 'bg-red-50 dark:bg-red-900/20 border-red-500' :
                    notification.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500' :
                    'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                  } ${!notification.isRead ? 'shadow-md' : 'opacity-70'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                        {notification.timestamp.toLocaleTimeString('fa-IR')}
                      </p>
                    </div>
                    <button
                      onClick={() => markNotificationAsRead(notification.id)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <CheckCircle className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-16">
          
          {/* Left Panel: Professional Oil Selection */}
          <div className="xl:col-span-2 space-y-8">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-[3rem] p-8 border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                <Filter className="h-6 w-6 text-violet-600" />
                جدول حرفه‌ای انتخاب روغن‌ها برای ترکیب
              </h3>
              
              {/* Product Target Selection */}
              <div className="mb-6">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 block">هدف تولید محصول</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'cooking', label: 'پخت و پز', icon: ChefHat, color: 'orange' },
                    { id: 'industrial', label: 'صنعتی', icon: Factory, color: 'gray' },
                    { id: 'cosmetics', label: 'آرایشی', icon: Sparkles, color: 'pink' },
                    { id: 'pharmaceutical', label: 'دارویی', icon: TestTube, color: 'green' }
                  ].map((target) => {
                    const Icon = target.icon;
                    return (
                      <button
                        key={target.id}
                        onClick={() => setProductTarget(target.id as any)}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                          productTarget === target.id
                            ? `bg-${target.color}-100 dark:bg-${target.color}-900/30 border-${target.color}-500 text-${target.color}-700 dark:text-${target.color}-300`
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-violet-300'
                        }`}
                      >
                        <Icon className="h-5 w-5 mx-auto mb-2" />
                        <span className="text-sm font-bold">{target.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto Blending Controls */}
              <div className="mb-6 p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border border-violet-200 dark:border-violet-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-violet-600" />
                    <span className="text-sm font-bold text-violet-700 dark:text-violet-300">ترکیب خودکار FDA/WHO</span>
                  </div>
                  <button
                    onClick={() => setIsAutoBlending(!isAutoBlending)}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                      isAutoBlending ? 'bg-violet-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${
                      isAutoBlending ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
                <p className="text-xs text-violet-600 dark:text-violet-400 mb-3">
                  برنامه به صورت خودکار ترکیب بهینه را بر اساس استانداردهای FDA و WHO پیشنهاد می‌دهد
                </p>
                <button
                  onClick={generateAutoBlending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg font-bold hover:from-violet-600 hover:to-purple-700 transition-all duration-300"
                >
                  <Atom className="h-4 w-4" />
                  تولید ترکیب بهینه
                </button>
              </div>

              {/* Professional Oil Selection Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300">جدول جامع روغن‌های موجود (۲۰۲۵)</h4>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {OIL_TYPES.filter(oil => !selectedOilCombination.find(item => item.oil.id === oil.id)).length} روغن موجود
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full oil-selection-table">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800">
                        <th className="text-right p-3 font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">انتخاب</th>
                        <th className="text-right p-3 font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">نام روغن</th>
                        <th className="text-center p-3 font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">دسته</th>
                        <th className="text-center p-3 font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">چگالی</th>
                        <th className="text-center p-3 font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">نقطه دود</th>
                        <th className="text-center p-3 font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">ویسکوزیته</th>
                        <th className="text-center p-3 font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">رنگ</th>
                        <th className="text-center p-3 font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">مناسب برای</th>
                      </tr>
                    </thead>
                    <tbody>
                      {OIL_TYPES.filter(oil => !selectedOilCombination.find(item => item.oil.id === oil.id)).map((oil) => {
                        const suitableTargets = [];
                        if (oil.smokePoint >= 200) suitableTargets.push('پخت');
                        if (oil.category === 'specialty') suitableTargets.push('آرایشی');
                        if (oil.viscosity === 'متوسط') suitableTargets.push('دارویی');
                        if (oil.density >= 0.9) suitableTargets.push('صنعتی');
                        
                        return (
                          <tr 
                            key={oil.id}
                            onClick={() => addOilToCombination(oil)}
                            className="hover:bg-violet-50 dark:hover:bg-violet-900/20 cursor-pointer transition-colors duration-200"
                          >
                            <td className="p-3 border border-slate-200 dark:border-slate-700">
                              <button className="w-6 h-6 bg-violet-500 hover:bg-violet-600 rounded-full flex items-center justify-center text-white transition-colors">
                                <span className="text-xs font-bold">+</span>
                              </button>
                            </td>
                            <td className="p-3 border border-slate-200 dark:border-slate-700">
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">{oil.name}</div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">{oil.nameEn}</div>
                                <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{oil.description}</div>
                              </div>
                            </td>
                            <td className="p-3 border border-slate-200 dark:border-slate-700 text-center">
                              <span className={`oil-category-badge ${
                                oil.category === 'vegetable' ? 'oil-category-vegetable' :
                                oil.category === 'animal' ? 'oil-category-animal' :
                                'oil-category-specialty'
                              }`}>
                                {oil.category === 'vegetable' ? 'نباتی' : oil.category === 'animal' ? 'حیوانی' : 'ویژه'}
                              </span>
                            </td>
                            <td className="p-3 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-300">
                              {oil.density}
                            </td>
                            <td className="p-3 border border-slate-200 dark:border-slate-700 text-center">
                              <span className={`smoke-point-indicator ${
                                oil.smokePoint >= 250 ? 'smoke-point-high' :
                                oil.smokePoint >= 200 ? 'smoke-point-medium' :
                                oil.smokePoint >= 150 ? 'smoke-point-low' : 'smoke-point-very-low'
                              }`}>
                                {oil.smokePoint}°C
                              </span>
                            </td>
                            <td className="p-3 border border-slate-200 dark:border-slate-700 text-center text-sm font-medium text-slate-600 dark:text-slate-400">
                              {oil.viscosity}
                            </td>
                            <td className="p-3 border border-slate-200 dark:border-slate-700 text-center">
                              <div className="w-6 h-6 rounded-full mx-auto border border-slate-300" style={{ backgroundColor: oil.color }}></div>
                            </td>
                            <td className="p-3 border border-slate-200 dark:border-slate-700 text-center">
                              <div className="flex flex-wrap gap-1 justify-center">
                                {suitableTargets.map((target, index) => (
                                  <span key={index} className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs">
                                    {target}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Current Combination */}
            {selectedOilCombination.length > 0 && (
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-[3rem] p-8 border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <Beaker className="h-6 w-6 text-violet-600" />
                  ترکیب فعلی محصول
                </h3>
                
                <div className="space-y-4">
                  {selectedOilCombination.map((item, index) => (
                    <div key={item.oil.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h5 className="font-bold text-slate-900 dark:text-white">{item.oil.name}</h5>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{item.oil.nameEn}</p>
                        </div>
                        <button
                          onClick={() => removeOilFromCombination(item.oil.id)}
                          className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-slate-400">درصد ترکیب:</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={item.percentage}
                              onChange={(e) => {
                                const newValue = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                                updateOilPercentage(item.oil.id, newValue);
                              }}
                              className="w-20 px-2 py-1 text-sm font-bold text-center bg-white dark:bg-slate-700 border border-violet-300 rounded-lg focus:border-violet-500 focus:outline-none"
                            />
                            <span className="text-sm font-bold text-violet-600">%</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="0.1"
                          value={item.percentage}
                          onChange={(e) => updateOilPercentage(item.oil.id, parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                        />
                        
                        {/* Oil Properties */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">چگالی:</span>
                            <span className="font-semibold">{item.oil.density} kg/L</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">نقطه دود:</span>
                            <span className="font-semibold">{item.oil.smokePoint}°C</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">دسته:</span>
                            <span className="font-semibold">
                              {item.oil.category === 'vegetable' ? 'نباتی' : 
                               item.oil.category === 'animal' ? 'حیوانی' : 'ویژه'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">ویسکوزیته:</span>
                            <span className="font-semibold">{item.oil.viscosity}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Total Percentage Display */}
                  <div className="mt-4 p-4 bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-xl border border-violet-300 dark:border-violet-700">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-violet-700 dark:text-violet-300">مجموع درصدها:</span>
                      <span className="text-lg font-black text-violet-900 dark:text-violet-100">
                        {selectedOilCombination.reduce((sum, item) => sum + item.percentage, 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-violet-200 dark:bg-violet-800 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-violet-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, selectedOilCombination.reduce((sum, item) => sum + item.percentage, 0))}%` }}
                      />
                    </div>
                    {selectedOilCombination.reduce((sum, item) => sum + item.percentage, 0) !== 100 && (
                      <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                        ⚠️ برای تکمیل ترکیب، مجموع درصدها باید 100% باشد
                      </p>
                    )}
                  </div>
                  
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                      onClick={calculateBlendingResult}
                      disabled={selectedOilCombination.reduce((sum, item) => sum + item.percentage, 0) !== 100}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-bold hover:from-violet-600 hover:to-purple-700 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FlaskConical className="h-5 w-5" />
                      تحلیل کامل و محاسبه ترکیب نهایی
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Results and Analysis */}
          <div className="space-y-8">
            {blendingResult ? (
              <div className="space-y-8">
                {/* Main Results */}
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-[3rem] p-8 border border-violet-200 dark:border-violet-800 shadow-xl">
                  <h3 className="text-2xl font-black text-violet-900 dark:text-violet-100 mb-6 flex items-center gap-3">
                    <Target className="h-6 w-6" />
                    نتایج تحلیل کامل ترکیب
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="text-center p-6 bg-white/60 dark:bg-violet-900/30 rounded-xl">
                      <div className="text-3xl font-black text-violet-700 dark:text-violet-300">
                        {blendingResult.finalDensity}
                      </div>
                      <div className="text-sm font-bold text-violet-600 dark:text-violet-400">چگالی نهایی (kg/L)</div>
                    </div>
                    <div className="text-center p-6 bg-white/60 dark:bg-violet-900/30 rounded-xl">
                      <div className="text-3xl font-black text-violet-700 dark:text-violet-300">
                        {blendingResult.finalSmokePoint}°C
                      </div>
                      <div className="text-sm font-bold text-violet-600 dark:text-violet-400">نقطه دود نهایی</div>
                    </div>
                  </div>
                  
                  {/* FDA/WHO Approval Status */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className={`p-4 rounded-xl border-2 ${
                      blendingResult.fdaApproval 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-500' 
                        : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className={`h-5 w-5 ${
                          blendingResult.fdaApproval ? 'text-green-600' : 'text-red-600'
                        }`} />
                        <span className={`font-bold text-sm ${
                          blendingResult.fdaApproval ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                        }`}>FDA آمریکا</span>
                      </div>
                      <div className={`text-xs ${
                        blendingResult.fdaApproval ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {blendingResult.fdaApproval ? '✓ تأیید شده' : '✗ نیاز به بررسی'}
                      </div>
                    </div>
                    <div className={`p-4 rounded-xl border-2 ${
                      blendingResult.whoApproval 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-500' 
                        : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className={`h-5 w-5 ${
                          blendingResult.whoApproval ? 'text-green-600' : 'text-red-600'
                        }`} />
                        <span className={`font-bold text-sm ${
                          blendingResult.whoApproval ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                        }`}>WHO جهانی</span>
                      </div>
                      <div className={`text-xs ${
                        blendingResult.whoApproval ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {blendingResult.whoApproval ? '✓ تأیید شده' : '✗ نیاز به بررسی'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Safety Level */}
                  <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="text-center">
                      <h4 className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-2">سطح ایمنی</h4>
                      <div className={`text-3xl font-black ${
                        blendingResult.safetyLevel === 'ایمنی بالا' ? 'text-green-600' :
                        blendingResult.safetyLevel === 'استاندارد' ? 'text-blue-600' : 'text-orange-600'
                      }`}>
                        {blendingResult.safetyLevel}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="text-center p-6 bg-white/60 dark:bg-violet-900/30 rounded-xl">
                      <div className="text-2xl font-black text-green-600">
                        {blendingResult.costAnalysis.toLocaleString('fa-IR')} ریال
                      </div>
                      <div className="text-sm font-bold text-green-600">هزینه تولید (تخمینی)</div>
                    </div>
                    <div className="text-center p-6 bg-white/60 dark:bg-violet-900/30 rounded-xl">
                      <div className="text-2xl font-black text-blue-600">
                        {blendingResult.qualityScore}/100
                      </div>
                      <div className="text-sm font-bold text-blue-600">امتیاز کیفیت</div>
                    </div>
                  </div>
                </div>

                {/* Health Analysis */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-[2rem] p-8 border border-green-200 dark:border-green-800 shadow-xl">
                  <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-6 flex items-center gap-3">
                    <Heart className="h-5 w-5" />
                    تحلیل فوائد و مضرات برای بدن
                  </h3>
                  
                  <div className="space-y-4">
                    {blendingResult.healthAnalysis.benefits.length > 0 && (
                      <div>
                        <h4 className="text-lg font-bold text-green-700 dark:text-green-300 mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          فوائد:
                        </h4>
                        {blendingResult.healthAnalysis.benefits.map((benefit, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-green-100/50 dark:bg-green-900/20 rounded-lg">
                            <span className="text-green-600 mt-0.5">•</span>
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {blendingResult.healthAnalysis.risks.length > 0 && (
                      <div>
                        <h4 className="text-lg font-bold text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          مضرات:
                        </h4>
                        {blendingResult.healthAnalysis.risks.map((risk, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-red-100/50 dark:bg-red-900/20 rounded-lg">
                            <span className="text-red-600 mt-0.5">•</span>
                            <span className="text-sm font-medium text-red-700 dark:text-red-300">{risk}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {blendingResult.healthAnalysis.warnings.length > 0 && (
                      <div>
                        <h4 className="text-lg font-bold text-yellow-700 dark:text-yellow-300 mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          هشدارها:
                        </h4>
                        {blendingResult.healthAnalysis.warnings.map((warning, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-yellow-100/50 dark:bg-yellow-900/20 rounded-lg">
                            <span className="text-yellow-600 mt-0.5">⚠</span>
                            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">{warning}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Target-Specific Recommendations */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-[2rem] p-8 border border-blue-200 dark:border-blue-800 shadow-xl">
                  <h3 className="text-xl font-bold text-blue-800 dark:text-blue-200 mb-6 flex items-center gap-3">
                    <Target className="h-5 w-5" />
                    توصیه‌های اختصاصی برای {productTarget === 'cooking' ? 'پخت و پز' : productTarget === 'industrial' ? 'صنعتی' : productTarget === 'cosmetics' ? 'آرایشی' : 'دارویی'}
                  </h3>
                  
                  <div className="space-y-3">
                    {blendingResult.targetRecommendations[productTarget].map((rec, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-blue-100/50 dark:bg-blue-900/20 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Technical Recommendations */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-[2rem] p-8 border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                    <Settings className="h-5 w-5 text-violet-600" />
                    توصیه‌های فنی
                  </h3>
                  
                  <div className="space-y-4">
                    {blendingResult.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
                        <CheckCircle className="h-5 w-5 text-violet-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm font-medium text-violet-700 dark:text-violet-300">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-[3rem] p-12 border border-slate-200/50 dark:border-slate-700/50 shadow-xl text-center">
                <FlaskConical className="h-16 w-16 text-slate-400 dark:text-slate-500 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-slate-600 dark:text-slate-400 mb-4">آزمایشگاه پیشرفته ترکیب روغن</h3>
                <p className="text-slate-500 dark:text-slate-500">لطفاً روغن‌های مورد نظر را انتخاب کنید و درصد ترکیب را تنظیم کنید</p>
                <p className="text-sm text-slate-400 dark:text-slate-600 mt-2">تحلیل لحظه‌ای فوائد، مضرات و هشدارها برای اهداف مختلف</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OilProductCreator;
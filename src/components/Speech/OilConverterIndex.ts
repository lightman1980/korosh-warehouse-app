// Export file for Oil Converter Enhanced
// فایل export برای مبدل روغن خوراکی پیشرفته

// Import the main OilConverter component
import OilConverter from './OilConverter_Enhanced';

// Re-export for convenience
export { OilConverter };
export default OilConverter;

// Export types if needed
export interface OilConversionData {
  inputValue: number;
  inputUnit: string;
  outputValue: number;
  outputUnit: string;
  formula: string;
  description: string;
}

export interface OilType {
  id: string;
  name: string;
  nameEn: string;
  density: number;
  smokePoint: number;
  category: 'vegetable' | 'animal' | 'specialty';
}

// Constants for oil types
export const OIL_TYPES = [
  { id: 'olive', name: 'زیتون', nameEn: 'Olive Oil', density: 0.91, smokePoint: 190, category: 'vegetable' as const },
  { id: 'sunflower', name: 'آفتابگردان', nameEn: 'Sunflower Oil', density: 0.925, smokePoint: 225, category: 'vegetable' as const },
  { id: 'canola', name: 'کانولا', nameEn: 'Canola Oil', density: 0.92, smokePoint: 204, category: 'vegetable' as const },
  { id: 'coconut', name: 'نارگیل', nameEn: 'Coconut Oil', density: 0.92, smokePoint: 175, category: 'vegetable' as const },
  { id: 'corn', name: 'ذرت', nameEn: 'Corn Oil', density: 0.925, smokePoint: 232, category: 'vegetable' as const },
  { id: 'soybean', name: 'سویا', nameEn: 'Soybean Oil', density: 0.925, smokePoint: 238, category: 'vegetable' as const },
  { id: 'palm', name: 'نخل', nameEn: 'Palm Oil', density: 0.915, smokePoint: 235, category: 'vegetable' as const },
  { id: 'butter', name: 'کره', nameEn: 'Butter', density: 0.911, smokePoint: 175, category: 'animal' as const },
  { id: 'ghee', name: 'روغن حیوانی', nameEn: 'Ghee', density: 0.905, smokePoint: 250, category: 'animal' as const },
  { id: 'sesame', name: 'کنجد', nameEn: 'Sesame Oil', density: 0.925, smokePoint: 216, category: 'vegetable' as const },
  { id: 'almond', name: 'بادام', nameEn: 'Almond Oil', density: 0.915, smokePoint: 221, category: 'vegetable' as const },
  { id: 'avocado', name: 'آووکادو', nameEn: 'Avocado Oil', density: 0.925, smokePoint: 271, category: 'vegetable' as const }
];

// Utility functions for oil conversions
export const convertVolume = (value: number, from: string, to: string, oil: OilType) => {
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
    description: `تبدیل حجم ${oil.name} از ${from} به ${to}`
  };
};

export const convertWeight = (value: number, from: string, to: string) => {
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

export const convertTemperature = (value: number, from: string, to: string) => {
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

export const convertDensity = (value: number, oil: OilType) => {
  return {
    inputValue: value,
    inputUnit: 'ml',
    outputValue: Math.round(value * oil.density * 100) / 100,
    outputUnit: 'g',
    formula: `${value} ml × ${oil.density} = ${Math.round(value * oil.density * 100) / 100} g`,
    description: `تبدیل ${oil.name} از حجم به وزن بر اساس چگالی ${oil.density} g/ml`
  };
};

// Version info
export const VERSION = '3.0.0';
export const VERSION_INFO = {
  version: VERSION,
  codename: 'Oil Specialist Edition',
  releaseDate: '2025-12-16',
  features: [
    'Specialized Oil Converter',
    'Unit Conversions',
    'Speech Recognition',
    'OCR Support',
    'Multi-language Support',
    'Real-time Calculations',
    'Professional UI',
    'TypeScript Support'
  ]
};
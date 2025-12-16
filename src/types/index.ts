// ============================================
// MAIN TYPES FOR WAREHOUSE MANAGEMENT SYSTEM
// ============================================

export interface BaseData {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OwnedProduct extends BaseData {
  code: string;
  type: 'owned';
}

export interface ConsignmentProduct extends BaseData {
  code: string;
  type: 'consignment';
}

export interface Site extends BaseData {
  location: string;
}

export interface Tank extends BaseData {
  code: string;
  capacity: number;
  currentStock: number;
}

export interface Company extends BaseData {
  registrationNumber: string;
  address: string;
  contactPerson: string;
  phone: string;
}

export interface CustomerCompany extends BaseData {
  parentCompanyId: string;
  registrationNumber: string;
  address: string;
  contactPerson: string;
  phone: string;
}

export interface Location extends BaseData {
  address: string;
  contactPerson: string;
  phone: string;
  postalCode: string;
  companyId: string;
  companyType: 'company' | 'customer';
  additionalInfo?: string;
}

export interface Driver extends BaseData {
  nationalId: string;
  plateNumber: string;
  homeAddress: string;
  phone: string;
  additionalInfo?: string;
}

export interface UserType {
  id: string;
  name: 'تملیکی' | 'امانی';
}

export interface CotageNumber extends BaseData {
  number: string; // 8 digits
}

export interface IndexNumber extends BaseData {
  number: string; // 8 digits
}

export interface RentalType extends BaseData {
  type: 'monthly' | 'daily';
  name: string;
}

export interface WastageRate extends BaseData {
  percentage: number;
}

export interface ReceiptBasis extends BaseData {
  type: 'bill_of_lading' | 'ullage_weight' | 'shore_tank' | 'gross_weight';
}

export interface Department extends BaseData {}

export interface InternalCompany extends BaseData {}

export interface Contract {
  id: string;
  contractNumber: string;
  companyId: string;
  startDate: Date;
  endDate: Date;
  rentalTypeId: string;
  rentalRate: number;
  siteId: string;
  wastageRateId: string;
  isActive: boolean;
  receiptBasisId: string;
  createdAt: Date;
  updatedAt: Date;
  contractWeight: number;
  remainingWeight: number;
}

export interface WarehouseReceipt {
  id: string;
  transactionNumber: string;
  userTypeId: string;
  companyId?: string;
  companyName?: string;
  contractId?: string;
  contractNumber?: string;
  productId: string;
  productName: string;
  siteId: string;
  siteName: string;
  tankId: string;
  tankName: string;
  shipUnloadingAmount: number; // renamed from initialAmount
  shipBillOfLadingAmount: number;
  tankShoreAmount: number;
  unit: 'kg' | 'ton';
  receiptDate: Date;
  dueDate?: Date; // optional for owned receipts
  wastageAmount: number;
  wastageReceivedAmount: number;
  ownedInventoryAmount?: number;
  withdrawableAmount?: number;
  finalAmount: number;
  isOverdue?: boolean; // only for consignment
  notes: string;
  attachments: FileAttachment[];
  status: 'draft' | 'saved' | 'finalized' | 'invoiced';
  additionalInfo?: WarehouseReceiptExtraInfo;
  invoiceStatus?: 'pre_invoice' | 'invoiced' | 'pending_payment' | 'settled';
  invoiceAmount?: number;
  invoiceDate?: Date;
  paymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WarehouseReceiptExtraInfo {
  driverFirstName?: string;
  driverLastName?: string;
  driverNationalId?: string;
  billOfLadingNumber?: string;
  plateNumber?: string;
  weight?: number;
  billAmount?: number;
  origin?: string;
  billDate?: Date;
  transportCompany?: string;
  driverMobile?: string;
  originAddress?: string;
  backBillAmount?: number;
  originPostalCode?: string;
}

export interface WarehouseDelivery {
  id: string;
  transactionNumber: string;
  userTypeId: string;
  companyId?: string;
  companyName?: string;
  productId: string;
  productName: string;
  siteId: string;
  siteName: string;
  tankId: string;
  tankName: string;
  recipientType: 'company' | 'customer';
  companyLocationId?: string;
  companyLocationName?: string;
  customerLocationId?: string;
  customerLocationName?: string;
  driverId?: string;
  driverName?: string;
  contractId?: string;
  contractNumber?: string;
  contractWeight?: number;
  remainingWeight?: number;
  amount: number;
  unit: 'kg' | 'ton';
  deliveryDate: Date;
  customerCompanyId?: string;
  customerCompanyName?: string;
  notes: string;
  attachments: FileAttachment[];
  additionalInfo?: AdditionalDeliveryInfo;
  status: 'draft' | 'saved' | 'finalized' | 'printed';
  createdAt: Date;
  updatedAt: Date;
}

export interface AdditionalDeliveryInfo {
  billOfLadingNumber?: string;
  vehiclePlateNumber?: string;
  shipName?: string;
  orderRegistrationNumber?: string;
  cotageNumber?: string;
  peteNumber?: string;
  bijackNumber?: string;
  originBillOfLading?: string;
  destinationBillOfLading?: string;
  driverNationalId?: string;
  driverFullName?: string;
  billOfLadingWeight?: number;
  ullageWeight?: number;
  shoreTankWeight?: number;
  fullTruckWeight?: number;
  emptyTruckWeight?: number;
  loadingDateAtOrigin?: Date;
  seedImpurity?: number;
  seedMoisture?: number;
  seedOilPercentage?: number;
  seedAcidityAmount?: number;
  grainCenter?: string;
  billOfLadingAmount?: number;
  other1?: string;
  other2?: string;
}

export interface FileAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: Date;
  url: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  fullName: string;
  email: string;
  departmentId: string;
  role: 'admin' | 'user';
  permissions: UserPermission[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPermission {
  module: string;
  action: 'view' | 'edit';
}

export interface AppSettings {
  serverAddress: string;
  serverPort: number;
  dataStoragePath: string;
  maxConnections: number;
  sslEnabled: boolean;
  backupPath: string;
  colorScheme: 'light' | 'dark';
  calendarType: 'persian' | 'gregorian' | 'hijri';
  currency: 'rial' | 'dollar' | 'euro';
  language: 'persian' | 'english';
  workflowEnabled: boolean;
  notifications: NotificationSettings;
  security: SecuritySettings;
  inventoryLimits: InventoryLimit[];
}

export interface NotificationSettings {
  lowInventoryAlert: boolean;
  priceChangeThreshold: number;
  newUserNotification: boolean;
  systemErrorAlerts: boolean;
  minInventoryAmount: number;
  maxInventoryAmount: number;
}

export interface SecuritySettings {
  maxFailedAttempts: number;
  sessionTimeoutMinutes: number;
}

export interface InventoryLimit {
  siteId: string;
  tankId: string;
  productId: string;
  minAmount: number;
  maxAmount: number;
}

export interface DashboardStats {
  activeContracts: number;
  expiredContracts: number;
  fullTanks: number;
  emptyTanks: number;
  finalizedReceipts: number;
  invoicedReceipts: number;
  overdueReceipts: OverdueReceipt[];
  inventoryByType: InventoryByType[];
}

export interface OverdueReceipt {
  id: string;
  companyName: string;
  amount: number;
  unit: string;
  dueDate: Date;
  daysPastDue: number;
}

export interface InventoryByType {
  userType: string;
  site: string;
  tank: string;
  product: string;
  amount: number;
  unit: string;
}

// ============================================
// OIL CONVERTER TYPES AND UTILITIES
// ============================================

export interface OilType {
  id: string;
  name: string;
  nameEn: string;
  density: number;
  smokePoint: number;
  category: 'vegetable' | 'animal' | 'specialty';
}

export interface OilConversionData {
  inputValue: number;
  inputUnit: string;
  outputValue: number;
  outputUnit: string;
  formula: string;
  description: string;
  oilType?: OilType;
}

export interface ConversionResult {
  inputValue: number;
  inputUnit: string;
  outputValue: number;
  outputUnit: string;
  formula: string;
  description: string;
}

export interface TranscriptionEntry {
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

export interface OCRResult {
  originalText: string;
  translatedText: string;
  confidence: number;
  language: string;
  filename: string;
  pageNumber?: number;
}

// Oil Types Constants
export const OIL_TYPES: OilType[] = [
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

// Utility Functions for Oil Conversions
export const convertVolume = (value: number, from: string, to: string, oil?: OilType): ConversionResult => {
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

  const oilName = oil ? oil.name : 'روغن';
  return {
    inputValue: value,
    inputUnit: from,
    outputValue: Math.round(result * 1000) / 1000,
    outputUnit: to,
    formula: `${value} ${from} = ${Math.round(result * 1000) / 1000} ${to}`,
    description: `تبدیل حجم ${oilName} از ${from} به ${to}`
  };
};

export const convertWeight = (value: number, from: string, to: string): ConversionResult => {
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

export const convertTemperature = (value: number, from: string, to: string): ConversionResult => {
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

export const convertDensity = (value: number, oil: OilType): ConversionResult => {
  return {
    inputValue: value,
    inputUnit: 'ml',
    outputValue: Math.round(value * oil.density * 100) / 100,
    outputUnit: 'g',
    formula: `${value} ml × ${oil.density} = ${Math.round(value * oil.density * 100) / 100} g`,
    description: `تبدیل ${oil.name} از حجم به وزن بر اساس چگالی ${oil.density} g/ml`
  };
};

// Language detection utility
export const detectLanguageAdvanced = (text: string): string => {
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

// Version Information
export const VERSION = '3.0.0';
export const VERSION_INFO = {
  version: VERSION,
  codename: 'Oil Specialist Edition',
  releaseDate: '2025-12-16',
  features: [
    'Warehouse Management System',
    'Oil Converter Specialist',
    'Unit Conversions',
    'Speech Recognition',
    'OCR Support',
    'Multi-language Support',
    'Real-time Calculations',
    'Professional UI',
    'TypeScript Support'
  ]
};

// Default export for convenience
const TypesModule = {
  // Warehouse Types
  BaseData,
  OwnedProduct,
  ConsignmentProduct,
  Site,
  Tank,
  Company,
  CustomerCompany,
  Location,
  Driver,
  UserType,
  CotageNumber,
  IndexNumber,
  RentalType,
  WastageRate,
  ReceiptBasis,
  Department,
  InternalCompany,
  Contract,
  WarehouseReceipt,
  WarehouseDelivery,
  FileAttachment,
  User,
  UserPermission,
  AppSettings,
  NotificationSettings,
  SecuritySettings,
  InventoryLimit,
  DashboardStats,
  OverdueReceipt,
  InventoryByType,
  
  // Oil Converter Types
  OilType,
  OilConversionData,
  ConversionResult,
  TranscriptionEntry,
  OCRResult,
  
  // Constants
  OIL_TYPES,
  
  // Utility Functions
  convertVolume,
  convertWeight,
  convertTemperature,
  convertDensity,
  detectLanguageAdvanced,
  
  // Version
  VERSION,
  VERSION_INFO
};

export default TypesModule;
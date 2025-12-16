import moment from 'moment-jalaali';

export const formatPersianNumber = (num: number): string => {
  return new Intl.NumberFormat('fa-IR').format(num);
};

export const getGregorianToPersianYearMonth = (date: Date): { year: number; month: number } => {
  const persianDate = moment(date);
  return {
    year: persianDate.jYear(),
    month: persianDate.jMonth() + 1 // ماه‌ها از 0 شروع می‌شوند
  };
};

export const getCurrentPersianMonth = (): number => {
  const now = new Date();
  const persianDate = getGregorianToPersianYearMonth(now);
  return persianDate.month;
};

export const calculateRemainingContractWeight = (
  receipt: any,
  contracts: any[],
  receipts: any[]
): number => {
  const contract = contracts.find(c => c.id === receipt.contractId);
  if (!contract) return 0;
  
  const totalReceipts = receipts
    .filter(r => r.contractId === contract.id && r.status !== 'cancelled' && r.status !== 'deleted')
    .reduce((sum, r) => sum + (r.receiptBasisAmount || 0), 0);
    
  return Math.max(0, (contract.contractWeight || 0) - totalReceipts);
};

export const getTankInventory = (tankId: string, receipts: any[], deliveries: any[], adjustments: any[]): number => {
  const tankReceipts = receipts.filter(r => r.tankId === tankId);
  const capacity = tankReceipts.length > 0 ? tankReceipts[0].tankCapacity || 5000000 : 5000000;
  
  const additions = tankReceipts
    .filter(r => r.status !== 'cancelled' && r.status !== 'deleted')
    .reduce((sum, r) => sum + (r.receiptBasisAmount || 0), 0);
    
  const removals = deliveries
    .filter(d => d.tankId === tankId && d.status !== 'cancelled' && d.status !== 'deleted')
    .reduce((sum, d) => sum + (d.amount || 0), 0);
    
  const tankAdjustments = adjustments.filter(a => a.tankId === tankId && a.status !== 'cancelled' && a.status !== 'deleted');
  const additionAdjustments = tankAdjustments
    .filter(a => a.adjustmentType === 'addition')
    .reduce((sum, a) => sum + (a.amount || 0), 0);
    
  const subtractionAdjustments = tankAdjustments
    .filter(a => a.adjustmentType === 'subtraction')
    .reduce((sum, a) => sum + (a.amount || 0), 0);
    
  return Math.max(0, capacity - (additions + additionAdjustments) + (removals + subtractionAdjustments));
};

export const isManagementLetterNumberUnique = (
  letterNumber: string,
  permits: any[],
  excludePermitId?: string
): boolean => {
  return !permits.some(
    p => p.managementLetterNumber === letterNumber && p.id !== excludePermitId
  );
};

export const generateTransactionNumber = (type: string, date?: Date): string => {
  const prefix = type === 'delivery' ? 'D' : type === 'receipt' ? 'R' : 'I';
  const now = date || new Date();
  const persianDate = moment(now);
  const year = persianDate.jYear();
  const month = (persianDate.jMonth() + 1).toString().padStart(2, '0');
  const day = persianDate.jDate().toString().padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}-${year}${month}${day}-${timestamp}`;
};

export const getContractUnit = (contractId: string, contracts: any[]): 'kg' | 'ton' => {
  const contract = contracts.find(c => c.id === contractId);
  return contract?.unit || 'kg';
};

export const formatPersianDate = (date: Date): string => {
  return moment(date).format('jYYYY/jMM/jDD');
};

export const formatPersianDateTime = (date: Date): string => {
  return moment(date).format('jYYYY/jMM/jDD HH:mm');
};

export const safeParseDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  
  // تلاش برای تجزیه تاریخ میلادی
  const gregorianDate = moment(dateString);
  if (gregorianDate.isValid()) {
    return gregorianDate.toDate();
  }
  
  // تلاش برای تجزیه تاریخ شمسی
  const persianDate = moment(dateString, 'jYYYY/jMM/jDD');
  if (persianDate.isValid()) {
    return persianDate.toDate();
  }
  
  return null;
};

// توابع کاربردی اضافه برای کار با تاریخ شمسی
export const getPersianMonthName = (month: number): string => {
  const months = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];
  return months[month - 1] || '';
};

export const convertToPersianDate = (date: Date): string => {
  return moment(date).format('dddd jD jMMMM jYYYY');
};

export const generateUniquePermitNumber = (date: Date): string => {
  const persianDate = moment(date);
  const year = persianDate.jYear();
  const month = (persianDate.jMonth() + 1).toString().padStart(2, '0');
  const day = persianDate.jDate().toString().padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  return `M${year}${month}${day}-${timestamp}`;
};

export const getCurrentPersianYear = (): number => {
  const now = new Date();
  const persianDate = moment(now);
  return persianDate.jYear();
};
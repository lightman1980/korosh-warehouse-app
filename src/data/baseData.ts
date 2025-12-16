export interface BaseDataItem {
  id: string;
  code?: string;
  name: string;
  type?: string;
  isActive: boolean;
  canDelete: boolean;
  createdAt: Date;
  updatedAt: Date;
  address?: string;
  phone?: string;
  postalCode?: string;
  additionalInfo?: string;
  nationalId?: string;
  plateNumber?: string;
  homeAddress?: string;
  // فیلدهای اضافی برای سازگاری با برنامه
  contactPerson?: string;
  registrationNumber?: string;
  capacity?: number;
  unit?: 'kg' | 'ton';
}

export interface BaseDataCategory {
  id: string;
  name: string;
  items: BaseDataItem[];
  hasCode: boolean;
  description: string;
}

export const initialCategories: BaseDataCategory[] = [
  {
    id: 'owned-products',
    name: 'نام کالای تملیکی',
    hasCode: true,
    description: 'لیست کالاهای تملیکی شرکت',
    items: [
      { id: '1', code: '1', name: 'روغن آفتابگردان-تملیکی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '2', code: '2', name: 'روغن های اولئیک-تملیکی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '3', code: '3', name: 'روغن کلزا-تملیکی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '4', code: '4', name: 'روغن سویا-تملیکی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '5', code: '5', name: 'روغن پالم اولئین-تملیکی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '6', code: '6', name: 'روغن زیتون-تملیکی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '7', code: '7', name: 'روغن زیتون بکر-تملیکی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '8', code: '8', name: 'روغن زیتون فرابکر-تملیکی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '9', code: '9', name: 'روغن ذرت-تملیکی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '10', code: '10', name: 'روغن کنجد-تملیکی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '11', code: '11', name: 'دانه-تملیکی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ]
  },
  {
    id: 'consignment-products',
    name: 'نام کالای امانی',
    hasCode: true,
    description: 'لیست کالاهای امانی',
    items: [
      { id: '1-1', code: '1-1', name: 'روغن آفتابگردان-امانی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '2-2', code: '2-2', name: 'روغن های اولئیک-امانی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '3-3', code: '3-3', name: 'روغن کلزا-امانی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '4-4', code: '4-4', name: 'روغن سویا-امانی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '5-5', code: '5-5', name: 'روغن پالم اولئین-امانی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '6-6', code: '6-6', name: 'روغن زیتون-امانی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '7-7', code: '7-7', name: 'روغن زیتون بکر-امانی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '8-8', code: '8-8', name: 'روغن زیتون فرابکر-امانی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '9-9', code: '9-9', name: 'روغن ذرت-امانی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '10-10', code: '10-10', name: 'روغن کنجد-امانی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '11-11', code: '11-11', name: 'دانه-امانی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ]
  },
  {
    id: 'sites',
    name: 'نام سایت مخازن',
    hasCode: false,
    description: 'لیست سایت های مخازن',
    items: [
      { id: 'site1', name: 'سایت مخازن انزلی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 'site2', name: 'سایت مخازن جنوب', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ]
  },
  {
    id: 'internal-sites',
    name: 'سایت های داخلی',
    hasCode: false,
    description: 'لیست سایت های داخلی شرکت',
    items: [
      { id: 'internal-site1', name: 'کارخانه تاکستان', isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'internal-site2', name: 'کارخانه اشتهارد', isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
    ]
  },
  {
    id: 'contractor-sites',
    name: 'سایت های پیمانکاری',
    hasCode: false,
    description: 'لیست سایت های پیمانکاری',
    items: [
      { id: 'contractor-site1', name: 'سایت پیمانکاری مارگارین', isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'contractor-site2', name: 'سایت پیکانکاری نوش آذر', isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'contractor-site3', name: 'سایت پیمانکاری سبوس مازند', isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
    ]
  },
  {
    id: 'tanks',
    name: 'نام مخزن',
    hasCode: false,
    description: 'لیست مخازن',
    items: [
      { id: 'tankA', name: 'مخزن A', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date(), capacity: 5000000, unit: 'kg' },
      { id: 'tankB', name: 'مخزن B', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date(), capacity: 5000000, unit: 'kg' },
      { id: 'tankC', name: 'مخزن C', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date(), capacity: 5000000, unit: 'kg' },
      { id: 'tankD', name: 'مخزن D', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date(), capacity: 5000000, unit: 'kg' },
      { id: 'tankE', name: 'مخزن E', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date(), capacity: 5000000, unit: 'kg' },
      { id: 'tankF', name: 'مخزن F', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date(), capacity: 5000000, unit: 'kg' },
      { id: 'tankG', name: 'مخزن G', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date(), capacity: 5000000, unit: 'kg' },
      { id: 'tankH', name: 'مخزن H', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date(), capacity: 5000000, unit: 'kg' },
      { id: 'tankI', name: 'مخزن I', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date(), capacity: 5000000, unit: 'kg' },
      { id: 'tankJ', name: 'مخزن J', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date(), capacity: 5000000, unit: 'kg' },
    ]
  },
  {
    id: 'companies',
    name: 'شرکت طرف حساب',
    hasCode: false,
    description: 'لیست شرکت های طرف حساب',
    items: [
      { id: 'comp1', name: 'شرکت محور طلایی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date(), contactPerson: 'مدیرعامل', registrationNumber: '1234567890' },
      { id: 'comp2', name: 'شرکت مادر تخصصی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date(), contactPerson: 'مدیرعامل', registrationNumber: '2345678901' },
      { id: 'comp3', name: 'شرکت طبیعت', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date(), contactPerson: 'مدیرعامل', registrationNumber: '3456789012' },
      { id: 'comp4', name: 'شرکت بهشهر', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date(), contactPerson: 'مدیرعامل', registrationNumber: '4567890123' },
      { id: 'comp5', name: 'شرکت تیوان جم', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date(), contactPerson: 'مدیرعامل', registrationNumber: '5678901234' },
    ]
  },
  {
    id: 'customer-companies',
    name: 'مشتری طرف حساب',
    hasCode: false,
    description: 'لیست مشتریان طرف حساب',
    items: [
      { id: 'cust1', name: 'شرکت مشتری محور طلایی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date(), contactPerson: 'مدیرعامل', registrationNumber: '6789012345' },
      { id: 'cust2', name: 'شرکت مشتری مادر تخصصی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date(), contactPerson: 'مدیرعامل', registrationNumber: '7890123456' },
      { id: 'cust3', name: 'شرکت مشتری طبیعت', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date(), contactPerson: 'مدیرعامل', registrationNumber: '8901234567' },
      { id: 'cust4', name: 'شرکت مشتری بهشهر', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date(), contactPerson: 'مدیرعامل', registrationNumber: '9012345678' },
      { id: 'cust5', name: 'شرکت مشتری تیوان جم', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date(), contactPerson: 'مدیرعامل', registrationNumber: '0123456789' },
    ]
  },
  {
    id: 'company-locations',
    name: 'لوکیشن طرف حساب',
    hasCode: false,
    description: 'لیست لوکیشن های شرکت های طرف حساب',
    items: [
      { id: 'comp-loc1', name: 'دفتر مرکزی شرکت محور طلایی', address: 'تهران، خیابان ولیعصر', phone: '021-12345678', postalCode: '1234567890', additionalInfo: 'دفتر اصلی', isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'comp-loc2', name: 'انبار شرکت مادر تخصصی', address: 'اصفهان، شهرک صنعتی', phone: '031-87654321', postalCode: '0987654321', additionalInfo: 'انبار اصلی', isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'comp-loc3', name: 'کارخانه شرکت طبیعت', address: 'شیراز، منطقه ویژه', phone: '071-11223344', postalCode: '1122334455', additionalInfo: 'کارخانه تولید', isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
    ]
  },
  {
    id: 'customer-locations',
    name: 'لوکیشن مشتری طرف حساب',
    hasCode: false,
    description: 'لیست لوکیشن های مشتریان طرف حساب',
    items: [
      { id: 'cust-loc1', name: 'دفتر مشتری محور طلایی', address: 'تهران، خیابان کریمخان', phone: '021-87654321', postalCode: '9876543210', additionalInfo: 'دفتر مشتری', isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'cust-loc2', name: 'انبار مشتری مادر تخصصی', address: 'اصفهان، خیابان چهارباغ', phone: '031-12345678', postalCode: '5432109876', additionalInfo: 'انبار مشتری', isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'cust-loc3', name: 'کارخانه مشتری طبیعت', address: 'شیراز، خیابان حافظ', phone: '071-55667788', postalCode: '7788990011', additionalInfo: 'کارخانه مشتری', isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
    ]
  },
  {
    id: 'user-types',
    name: 'نوع کاربری',
    hasCode: false,
    description: 'انواع کاربری سیستم',
    items: [
      { id: 'owned', name: 'تملیکی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 'consignment', name: 'امانی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ]
  },
  {
    id: 'cotage-numbers',
    name: 'شماره کوتاژ',
    hasCode: false,
    description: 'لیست شماره های کوتاژ (8 رقم)',
    items: [
      { id: 'cot1', name: '12345678', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 'cot2', name: '11122233', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 'cot3', name: '33344455', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 'cot4', name: '66677788', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 'cot5', name: '99988877', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ]
  },
  {
    id: 'index-numbers',
    name: 'شماره شاخص/ثبت سفارش',
    hasCode: false,
    description: 'لیست شماره های شاخص (8 رقم)',
    items: [
      { id: 'idx1', name: '11111111', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 'idx2', name: '22222222', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 'idx3', name: '33333333', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 'idx4', name: '44444444', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 'idx5', name: '55555555', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ]
  },
  {
    id: 'ship-names',
    name: 'نام کشتی',
    hasCode: false,
    description: 'لیست نام کشتی ها',
    items: [
      { id: 'ship1', name: 'سانجو', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 'ship2', name: 'هالتی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 'ship3', name: 'پاتیتو', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ]
  },
  {
    id: 'rental-types',
    name: 'نوع اجاره',
    hasCode: false,
    description: 'انواع اجاره',
    items: [
      { id: 'Alquiler-de-tanque-parcial', name: 'اجاره مقداری مخزن', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 'Alquiler-de-tanque-completo', name: 'اجاره کامل مخزن', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ]
  },
  {
    id: 'wastage-rates',
    name: 'مقدار افت',
    hasCode: false,
    description: 'درصدهای افت',
    items: [
      { id: 'waste1', name: '0.5%', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 'waste2', name: '1%', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ]
  },
  {
    id: 'receipt-basis',
    name: 'مبنای رسید',
    hasCode: false,
    description: 'مبنای محاسبه رسید',
    items: [
      { id: 'bill-lading', name: 'وزن بارنامه (Bill of lading weight)', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 'ullage', name: 'وزن آلج کشتی (Ullage weight)', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 'shore-tank', name: 'وزن شور تانک (Shore tank)', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 'gross', name: 'وزن ناخالص (Weight Gross)', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ]
  },
  {
    id: 'departments',
    name: 'دپارتمان',
    hasCode: false,
    description: 'دپارتمان های سازمانی',
    items: [
      { id: 'dept1', name: 'مخازن انزلی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 'dept2', name: 'برنامه ریزی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 'dept3', name: 'مالی', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ]
  },
  {
    id: 'locations',
    name: 'لوکیشن ها',
    hasCode: false,
    description: 'لیست لوکیشن ها',
    items: [
      { id: 'loc1', name: 'دفتر مرکزی شرکت محور طلایی', address: 'تهران، خیابان ولیعصر', phone: '021-12345678', postalCode: '1234567890', additionalInfo: 'دفتر اصلی', isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'loc2', name: 'انبار شرکت مادر تخصصی', address: 'اصفهان، شهرک صنعتی', phone: '031-87654321', postalCode: '0987654321', additionalInfo: 'انبار اصلی', isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'loc3', name: 'کارخانه شرکت طبیعت', address: 'شیراز، منطقه ویژه', phone: '071-11223344', postalCode: '1122334455', additionalInfo: 'کارخانه تولید', isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'loc4', name: 'دفتر مشتری محور طلایی', address: 'تهران، خیابان کریمخان', phone: '021-87654321', postalCode: '9876543210', additionalInfo: 'دفتر مشتری', isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'loc5', name: 'انبار مشتری مادر تخصصی', address: 'اصفهان، خیابان چهارباغ', phone: '031-12345678', postalCode: '5432109876', additionalInfo: 'انبار مشتری', isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
    ]
  },
  {
    id: 'drivers',
    name: 'راننده گان',
    hasCode: false,
    description: 'لیست راننده گان',
    items: [
      { id: 'drv1', name: 'احمد محمدی', nationalId: '1234567890', plateNumber: '12ج345', homeAddress: 'تهران، خیابان آزادی', additionalInfo: 'راننده با تجربه', isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'drv2', name: 'علی رضایی', nationalId: '0987654321', plateNumber: '34د567', homeAddress: 'اصفهان، خیابان چهارباغ', additionalInfo: 'راننده حرفه‌ای', isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'drv3', name: 'حسن احمدی', nationalId: '1122334455', plateNumber: '56ه789', homeAddress: 'شیراز، خیابان زند', additionalInfo: 'راننده مجرب', isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
    ]
  },
  {
    id: 'internal-company',
    name: 'نام شرکت داخلی',
    hasCode: false,
    description: 'شرکت داخلی',
    items: [
      { id: 'internal1', name: 'شرکت صنعت غذایی کورش', isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ]
  },
];

// Create baseDataCategories object for easy access
export const baseDataCategories = initialCategories.reduce((acc, category) => {
  const key = category.id.replace(/-/g, '_');
  acc[key] = category.items;
  return acc;
}, {} as Record<string, BaseDataItem[]>);

// تابع کمکی برای پیدا کردن آیتم بر اساس شناسه
export const findBaseDataItem = (categoryId: string, itemId: string): BaseDataItem | null => {
  const category = initialCategories.find(cat => cat.id === categoryId);
  if (!category) return null;
  
  return category.items.find(item => item.id === itemId) || null;
};

// تابع کمکی برای پیدا کردن آیتم بر اساس نام
export const findBaseDataItemByName = (categoryId: string, itemName: string): BaseDataItem | null => {
  const category = initialCategories.find(cat => cat.id === categoryId);
  if (!category) return null;
  
  return category.items.find(item => item.name === itemName) || null;
};

// تابع کمکی برای دریافت آیتم‌های فعال یک دسته‌بندی
export const getActiveItems = (categoryId: string): BaseDataItem[] => {
  const category = initialCategories.find(cat => cat.id === categoryId);
  if (!category) return [];
  
  return category.items.filter(item => item.isActive);
};

// تابع کمکی برای دریافت نام دسته‌بندی بر اساس شناسه
export const getCategoryName = (categoryId: string): string => {
  const category = initialCategories.find(cat => cat.id === categoryId);
  return category ? category.name : '';
};
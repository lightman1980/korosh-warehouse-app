import React, { useState, useEffect, useRef } from 'react';
import { Database, TestTube, FolderOpen, RefreshCw, Trash2, Eye, Upload, Download, FileSpreadsheet, Search, ListFilter as Filter, CreditCard as Edit2, Save, X, Plus, Minus, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Settings, HardDrive, Monitor, Folder, File, Table, Grid2x2 as Grid, List, ChartBar as BarChart3, ChartPie as PieChart, Activity, Clock, Calendar, Users, Package, FileText, TrendingUp, ChevronLeft, ChevronRight, Home, ArrowUp, ArrowDown, Filter as FilterIcon, Columns, MoreVertical, PlusCircle, Info, Globe, Warehouse, Package2, Tag, Building } from 'lucide-react';
import { Tooltip } from '../Common/Tooltip';
import { DataStorage } from '../../utils/dataStorage';
import { formatPersianDate, formatPersianNumber } from '../../utils/persian';
import { exportToExcel } from '../../utils/excelExport';
import { initialCategories } from '../../data/baseData';

// تعریف اینترفیس‌ها
interface DatabaseTable {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: React.ComponentType<any>;
  dataKey: string;
  fields: DatabaseField[];
  recordCount: number;
  lastModified: Date;
}

interface DatabaseField {
  key: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'object' | 'select';
  required: boolean;
  description: string;
  options?: string[]; // برای فیلدهای نوع select
}

interface DatabaseSettingsProps {
  settings: any;
  setSettings: (settings: any) => void;
  isLoading: boolean;
  testResults: Record<string, boolean>;
  setTestResults: (results: Record<string, boolean>) => void;
  selectFolder: (type: 'data' | 'backup') => void;
}

interface DataViewerProps {
  table: DatabaseTable;
  data: any[];
  onClose: () => void;
  onDataChange: (data: any[]) => void;
  onRefresh: () => void;
}

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'import' | 'export' | 'format';
  tables: DatabaseTable[];
  tableData: Record<string, any[]>;
}

// تعریف جداول پایگاه داده با فیلدهای تکمیل‌شده
const databaseTables: DatabaseTable[] = [
  {
    id: 'baseDataCategories',
    name: 'baseDataCategories',
    displayName: 'اطلاعات پایه',
    description: 'دسته‌بندی‌های اطلاعات پایه سیستم',
    icon: Database,
    dataKey: 'baseDataCategories',
    fields: [
      { key: 'id', name: 'شناسه', type: 'string', required: true, description: 'شناسه یکتای دسته‌بندی' },
      { key: 'name', name: 'نام', type: 'string', required: true, description: 'نام دسته‌بندی' },
      { key: 'items', name: 'آیتم‌ها', type: 'object', required: true, description: 'لیست آیتم‌های دسته‌بندی' },
      { key: 'createdAt', name: 'تاریخ ایجاد', type: 'date', required: false, description: 'تاریخ ایجاد دسته‌بندی' },
      { key: 'updatedAt', name: 'تاریخ ویرایش', type: 'date', required: false, description: 'تاریخ آخرین ویرایش' },
      { key: 'createdBy', name: 'ایجاد کننده', type: 'string', required: false, description: 'کاربر ایجاد کننده' }
    ],
    recordCount: 0,
    lastModified: new Date()
  },
  {
    id: 'contracts',
    name: 'contracts',
    displayName: 'قراردادها',
    description: 'اطلاعات قراردادهای سیستم',
    icon: FileText,
    dataKey: 'contracts',
    fields: [
      { key: 'id', name: 'شناسه', type: 'string', required: true, description: 'شناسه یکتای قرارداد' },
      { key: 'contractNumber', name: 'شماره قرارداد', type: 'string', required: true, description: 'شماره قرارداد' },
      { key: 'companyId', name: 'شرکت', type: 'string', required: true, description: 'شناسه شرکت طرف حساب' },
      { key: 'companyName', name: 'نام شرکت', type: 'string', required: true, description: 'نام شرکت طرف حساب' },
      { key: 'productType', name: 'نوع کالا', type: 'select', required: true, description: 'نوع کالا', options: ['مصرفی', 'سرمایه‌ای', 'خام', 'نیمه‌ساخته'] },
      { key: 'siteName', name: 'نام سایت', type: 'string', required: true, description: 'نام سایت مربوط به قرارداد' },
      { key: 'storageName', name: 'نام مخزن', type: 'string', required: true, description: 'نام مخزن ذخیره‌سازی' },
      { key: 'startDate', name: 'تاریخ شروع', type: 'date', required: true, description: 'تاریخ شروع قرارداد' },
      { key: 'endDate', name: 'تاریخ پایان', type: 'date', required: true, description: 'تاریخ پایان قرارداد' },
      { key: 'value', name: 'ارزش قرارداد', type: 'number', required: false, description: 'ارزش مالی قرارداد' },
      { key: 'status', name: 'وضعیت', type: 'select', required: true, description: 'وضعیت فعلی قرارداد', options: ['فعال', 'منقضی شده', 'در حال بررسی', 'لغو شده'] },
      { key: 'description', name: 'توضیحات', type: 'string', required: false, description: 'توضیحات اضافی' },
      { key: 'createdAt', name: 'تاریخ ایجاد', type: 'date', required: false, description: 'تاریخ ایجاد قرارداد' },
      { key: 'updatedAt', name: 'تاریخ ویرایش', type: 'date', required: false, description: 'تاریخ آخرین ویرایش' },
      { key: 'createdBy', name: 'ایجاد کننده', type: 'string', required: false, description: 'کاربر ایجاد کننده' }
    ],
    recordCount: 0,
    lastModified: new Date()
  },
  {
    id: 'receipts',
    name: 'receipts',
    displayName: 'رسید انبار',
    description: 'اطلاعات رسیدهای انبار',
    icon: Package,
    dataKey: 'receipts',
    fields: [
      { key: 'id', name: 'شناسه', type: 'string', required: true, description: 'شناسه یکتای رسید' },
      { key: 'transactionNumber', name: 'شماره تراکنش', type: 'string', required: true, description: 'شماره تراکنش رسید' },
      { key: 'contractId', name: 'شناسه قرارداد', type: 'string', required: true, description: 'شناسه قرارداد مرتبط' },
      { key: 'companyName', name: 'نام شرکت', type: 'string', required: true, description: 'نام شرکت طرف حساب' },
      { key: 'productName', name: 'نام کالا', type: 'string', required: true, description: 'نام کالا' },
      { key: 'productType', name: 'نوع کالا', type: 'string', required: true, description: 'نوع کالا' },
      { key: 'storageName', name: 'نام مخزن', type: 'string', required: true, description: 'نام مخزن' },
      { key: 'finalAmount', name: 'مقدار نهایی', type: 'number', required: true, description: 'مقدار نهایی رسید' },
      { key: 'unit', name: 'واحد', type: 'string', required: true, description: 'واحد شمارش' },
      { key: 'receiptDate', name: 'تاریخ رسید', type: 'date', required: true, description: 'تاریخ ثبت رسید' },
      { key: 'operator', name: 'اپراتور', type: 'string', required: true, description: 'اپراتور ثبت‌کننده' },
      { key: 'description', name: 'توضیحات', type: 'string', required: false, description: 'توضیحات اضافی' },
      { key: 'createdAt', name: 'تاریخ ایجاد', type: 'date', required: false, description: 'تاریخ ایجاد رکورد' },
      { key: 'updatedAt', name: 'تاریخ ویرایش', type: 'date', required: false, description: 'تاریخ آخرین ویرایش' }
    ],
    recordCount: 0,
    lastModified: new Date()
  },
  {
    id: 'deliveries',
    name: 'deliveries',
    displayName: 'حواله انبار',
    description: 'اطلاعات حواله‌های انبار',
    icon: TrendingUp,
    dataKey: 'deliveries',
    fields: [
      { key: 'id', name: 'شناسه', type: 'string', required: true, description: 'شناسه یکتای حواله' },
      { key: 'transactionNumber', name: 'شماره تراکنش', type: 'string', required: true, description: 'شماره تراکنش حواله' },
      { key: 'contractId', name: 'شناسه قرارداد', type: 'string', required: true, description: 'شناسه قرارداد مرتبط' },
      { key: 'companyName', name: 'نام شرکت', type: 'string', required: true, description: 'نام شرکت مقصد' },
      { key: 'productName', name: 'نام کالا', type: 'string', required: true, description: 'نام کالا' },
      { key: 'productType', name: 'نوع کالا', type: 'string', required: true, description: 'نوع کالا' },
      { key: 'storageName', name: 'نام مخزن', type: 'string', required: true, description: 'نام مخزن' },
      { key: 'amount', name: 'مقدار', type: 'number', required: true, description: 'مقدار حواله' },
      { key: 'unit', name: 'واحد', type: 'string', required: true, description: 'واحد شمارش' },
      { key: 'deliveryDate', name: 'تاریخ حواله', type: 'date', required: true, description: 'تاریخ ثبت حواله' },
      { key: 'operator', name: 'اپراتور', type: 'string', required: true, description: 'اپراتور ثبت‌کننده' },
      { key: 'description', name: 'توضیحات', type: 'string', required: false, description: 'توضیحات اضافی' },
      { key: 'createdAt', name: 'تاریخ ایجاد', type: 'date', required: false, description: 'تاریخ ایجاد رکورد' },
      { key: 'updatedAt', name: 'تاریخ ویرایش', type: 'date', required: false, description: 'تاریخ آخرین ویرایش' }
    ],
    recordCount: 0,
    lastModified: new Date()
  },
  {
    id: 'invoices',
    name: 'invoices',
    displayName: 'فاکتورها',
    description: 'اطلاعات فاکتورهای صادر شده',
    icon: FileText,
    dataKey: 'invoices',
    fields: [
      { key: 'id', name: 'شناسه', type: 'string', required: true, description: 'شناسه یکتای فاکتور' },
      { key: 'invoiceNumber', name: 'شماره فاکتور', type: 'string', required: true, description: 'شماره فاکتور' },
      { key: 'contractId', name: 'شناسه قرارداد', type: 'string', required: true, description: 'شناسه قرارداد مرتبط' },
      { key: 'companyName', name: 'نام شرکت', type: 'string', required: true, description: 'نام شرکت' },
      { key: 'amount', name: 'مبلغ', type: 'number', required: true, description: 'مبلغ فاکتور' },
      { key: 'tax', name: 'مالیات', type: 'number', required: false, description: 'مبلغ مالیات' },
      { key: 'discount', name: 'تخفیف', type: 'number', required: false, description: 'مبلغ تخفیف' },
      { key: 'totalAmount', name: 'مبلغ کل', type: 'number', required: true, description: 'مبلغ کل پس از کسر مالیات و تخفیف' },
      { key: 'issueDate', name: 'تاریخ صدور', type: 'date', required: true, description: 'تاریخ صدور فاکتور' },
      { key: 'dueDate', name: 'تاریخ سررسید', type: 'date', required: true, description: 'تاریخ سررسید پرداخت' },
      { key: 'status', name: 'وضعیت', type: 'select', required: true, description: 'وضعیت پرداخت', options: ['پرداخت شده', 'در انتظار پرداخت', 'سررسید گذشته', 'لغو شده'] },
      { key: 'description', name: 'توضیحات', type: 'string', required: false, description: 'توضیحات اضافی' },
      { key: 'createdAt', name: 'تاریخ ایجاد', type: 'date', required: false, description: 'تاریخ ایجاد رکورد' },
      { key: 'updatedAt', name: 'تاریخ ویرایش', type: 'date', required: false, description: 'تاریخ آخرین ویرایش' }
    ],
    recordCount: 0,
    lastModified: new Date()
  },
  {
    id: 'users',
    name: 'users',
    displayName: 'کاربران',
    description: 'اطلاعات کاربران سیستم',
    icon: Users,
    dataKey: 'users',
    fields: [
      { key: 'id', name: 'شناسه', type: 'string', required: true, description: 'شناسه یکتای کاربر' },
      { key: 'username', name: 'نام کاربری', type: 'string', required: true, description: 'نام کاربری' },
      { key: 'password', name: 'رمز عبور', type: 'string', required: true, description: 'رمز عبور' },
      { key: 'fullName', name: 'نام کامل', type: 'string', required: true, description: 'نام کامل کاربر' },
      { key: 'email', name: 'ایمیل', type: 'string', required: true, description: 'آدرس ایمیل' },
      { key: 'phone', name: 'تلفن', type: 'string', required: false, description: 'شماره تلفن' },
      { key: 'role', name: 'نقش', type: 'select', required: true, description: 'نقش کاربر در سیستم', options: ['مدیر سیستم', 'اپراتور انبار', 'کاربر عادی', 'حسابداری'] },
      { key: 'isActive', name: 'وضعیت فعال', type: 'boolean', required: true, description: 'آیا کاربر فعال است؟' },
      { key: 'lastLogin', name: 'آخرین ورود', type: 'date', required: false, description: 'تاریخ آخرین ورود به سیستم' },
      { key: 'createdAt', name: 'تاریخ ایجاد', type: 'date', required: false, description: 'تاریخ ایجاد کاربر' },
      { key: 'updatedAt', name: 'تاریخ ویرایش', type: 'date', required: false, description: 'تاریخ آخرین ویرایش' }
    ],
    recordCount: 0,
    lastModified: new Date()
  },
  {
    id: 'messages',
    name: 'messages',
    displayName: 'پیام‌ها',
    description: 'پیام‌های سیستم مکاتبات',
    icon: FileText,
    dataKey: 'messages',
    fields: [
      { key: 'id', name: 'شناسه', type: 'string', required: true, description: 'شناسه یکتای پیام' },
      { key: 'subject', name: 'موضوع', type: 'string', required: true, description: 'موضوع پیام' },
      { key: 'content', name: 'محتوا', type: 'string', required: true, description: 'محتوای پیام' },
      { key: 'senderId', name: 'شناسه فرستنده', type: 'string', required: true, description: 'شناسه فرستنده پیام' },
      { key: 'senderName', name: 'نام فرستنده', type: 'string', required: true, description: 'نام فرستنده پیام' },
      { key: 'receiverId', name: 'شناسه گیرنده', type: 'string', required: true, description: 'شناسه گیرنده پیام' },
      { key: 'receiverName', name: 'نام گیرنده', type: 'string', required: true, description: 'نام گیرنده پیام' },
      { key: 'sendDate', name: 'تاریخ ارسال', type: 'date', required: true, description: 'تاریخ ارسال پیام' },
      { key: 'isRead', name: 'وضعیت خواندن', type: 'boolean', required: true, description: 'آیا پیام خوانده شده است؟' },
      { key: 'priority', name: 'اولویت', type: 'select', required: true, description: 'اولویت پیام', options: ['پایین', 'متوسط', 'بالا', 'فوری'] },
      { key: 'createdAt', name: 'تاریخ ایجاد', type: 'date', required: false, description: 'تاریخ ایجاد رکورد' },
      { key: 'updatedAt', name: 'تاریخ ویرایش', type: 'date', required: false, description: 'تاریخ آخرین ویرایش' }
    ],
    recordCount: 0,
    lastModified: new Date()
  },
  {
    id: 'reports',
    name: 'reports',
    displayName: 'گزارش‌ها',
    description: 'گزارش‌های تولید شده سیستم',
    icon: BarChart3,
    dataKey: 'reports',
    fields: [
      { key: 'id', name: 'شناسه', type: 'string', required: true, description: 'شناسه یکتای گزارش' },
      { key: 'title', name: 'عنوان', type: 'string', required: true, description: 'عنوان گزارش' },
      { key: 'type', name: 'نوع', type: 'select', required: true, description: 'نوع گزارش', options: ['گزارش انبار', 'گزارش مالی', 'گزارش عملکرد', 'گزارش قراردادها'] },
      { key: 'description', name: 'توضیحات', type: 'string', required: false, description: 'توضیحات گزارش' },
      { key: 'generatedDate', name: 'تاریخ تولید', type: 'date', required: true, description: 'تاریخ تولید گزارش' },
      { key: 'generatedBy', name: 'تولید کننده', type: 'string', required: true, description: 'کاربر تولید کننده گزارش' },
      { key: 'periodStart', name: 'شروع دوره', type: 'date', required: true, description: 'تاریخ شروع دوره گزارش' },
      { key: 'periodEnd', name: 'پایان دوره', type: 'date', required: true, description: 'تاریخ پایان دوره گزارش' },
      { key: 'filePath', name: 'مسیر فایل', type: 'string', required: false, description: 'مسیر ذخیره فایل گزارش' },
      { key: 'createdAt', name: 'تاریخ ایجاد', type: 'date', required: false, description: 'تاریخ ایجاد رکورد' }
    ],
    recordCount: 0,
    lastModified: new Date()
  },
  {
    id: 'settings',
    name: 'settings',
    displayName: 'تنظیمات',
    description: 'تنظیمات سیستم',
    icon: Settings,
    dataKey: 'settings',
    fields: [
      { key: 'id', name: 'شناسه', type: 'string', required: true, description: 'شناسه یکتای تنظیمات' },
      { key: 'key', name: 'کلید', type: 'string', required: true, description: 'کلید تنظیمات' },
      { key: 'value', name: 'مقدار', type: 'string', required: true, description: 'مقدار تنظیمات' },
      { key: 'category', name: 'دسته‌بندی', type: 'select', required: true, description: 'دسته‌بندی تنظیمات', options: ['عمومی', 'امنیتی', 'ظاهری', 'پیشرفته'] },
      { key: 'description', name: 'توضیحات', type: 'string', required: false, description: 'توضیحات تنظیمات' },
      { key: 'isEditable', name: 'قابل ویرایش', type: 'boolean', required: true, description: 'آیا این تنظیم قابل ویرایش است؟' },
      { key: 'createdAt', name: 'تاریخ ایجاد', type: 'date', required: false, description: 'تاریخ ایجاد تنظیمات' },
      { key: 'updatedAt', name: 'تاریخ ویرایش', type: 'date', required: false, description: 'تاریخ آخرین ویرایش' }
    ],
    recordCount: 0,
    lastModified: new Date()
  },
  {
    id: 'consignmentReceipts',
    name: 'consignmentReceipts',
    displayName: 'رسیدهای امانی',
    description: 'رسیدهای انبار امانی (کنساینمنت)',
    icon: Package,
    dataKey: 'receipts',
    fields: [
      { key: 'id', name: 'شناسه', type: 'string', required: true, description: 'شناسه یکتای رسید' },
      { key: 'transactionNumber', name: 'شماره تراکنش', type: 'string', required: true, description: 'شماره تراکنش رسید' },
      { key: 'userType', name: 'نوع کاربر', type: 'select', required: true, description: 'نوع کاربر', options: ['owned', 'consignment'] },
      { key: 'contractId', name: 'شناسه قرارداد', type: 'string', required: false, description: 'شناسه قرارداد مرتبط' },
      { key: 'contractNumber', name: 'شماره قرارداد', type: 'string', required: false, description: 'شماره قرارداد' },
      { key: 'companyId', name: 'شناسه شرکت', type: 'string', required: false, description: 'شناسه شرکت' },
      { key: 'companyName', name: 'نام شرکت', type: 'string', required: false, description: 'نام شرکت' },
      { key: 'productId', name: 'شناسه کالا', type: 'string', required: true, description: 'شناسه کالا' },
      { key: 'productName', name: 'نام کالا', type: 'string', required: true, description: 'نام کالا' },
      { key: 'siteId', name: 'شناسه سایت', type: 'string', required: true, description: 'شناسه سایت' },
      { key: 'siteName', name: 'نام سایت', type: 'string', required: true, description: 'نام سایت' },
      { key: 'tankId', name: 'شناسه مخزن', type: 'string', required: true, description: 'شناسه مخزن' },
      { key: 'tankName', name: 'نام مخزن', type: 'string', required: true, description: 'نام مخزن' },
      { key: 'shipUnloadingAmount', name: 'مقدار تخلیه کشتی', type: 'number', required: false, description: 'مقدار تخلیه از کشتی' },
      { key: 'shipBillOfLadingAmount', name: 'مقدار بارنامه کشتی', type: 'number', required: false, description: 'مقدار بارنامه کشتی' },
      { key: 'tankShoreAmount', name: 'مقدار ساحل مخزن', type: 'number', required: false, description: 'مقدار ساحل مخزن' },
      { key: 'wastageAmount', name: 'مقدار افت', type: 'number', required: false, description: 'مقدار افت' },
      { key: 'wastageReceivedAmount', name: 'مقدار افت دریافت شده', type: 'number', required: false, description: 'مقدار افت دریافت شده' },
      { key: 'finalAmount', name: 'مقدار نهایی', type: 'number', required: true, description: 'مقدار نهایی رسید' },
      { key: 'unit', name: 'واحد', type: 'select', required: true, description: 'واحد شمارش', options: ['kg', 'ton'] },
      { key: 'receiptDate', name: 'تاریخ رسید', type: 'date', required: true, description: 'تاریخ ثبت رسید' },
      { key: 'dueDate', name: 'تاریخ سررسید', type: 'date', required: false, description: 'تاریخ سررسید (فقط برای امانی)' },
      { key: 'isOverdue', name: 'سررسید گذشته', type: 'boolean', required: false, description: 'آیا سررسید گذشته است؟' },
      { key: 'notes', name: 'توضیحات', type: 'string', required: false, description: 'توضیحات اضافی' },
      { key: 'status', name: 'وضعیت', type: 'select', required: true, description: 'وضعیت رسید', options: ['draft', 'saved', 'finalized', 'invoiced'] },
      { key: 'invoiceStatus', name: 'وضعیت فاکتور', type: 'select', required: false, description: 'وضعیت فاکتور', options: ['pre_invoice', 'invoiced', 'pending_payment', 'settled'] },
      { key: 'isVoided', name: 'ابطال شده', type: 'boolean', required: false, description: 'آیا رسید ابطال شده است؟' },
      { key: 'createdAt', name: 'تاریخ ایجاد', type: 'date', required: false, description: 'تاریخ ایجاد رکورد' },
      { key: 'updatedAt', name: 'تاریخ ویرایش', type: 'date', required: false, description: 'تاریخ آخرین ویرایش' }
    ],
    recordCount: 0,
    lastModified: new Date()
  },
  {
    id: 'ownedReceipts',
    name: 'ownedReceipts',
    displayName: 'رسیدهای تملیکی',
    description: 'رسیدهای انبار تملیکی (مالکیتی)',
    icon: Package,
    dataKey: 'receipts',
    fields: [
      { key: 'id', name: 'شناسه', type: 'string', required: true, description: 'شناسه یکتای رسید' },
      { key: 'transactionNumber', name: 'شماره تراکنش', type: 'string', required: true, description: 'شماره تراکنش رسید' },
      { key: 'userType', name: 'نوع کاربر', type: 'select', required: true, description: 'نوع کاربر', options: ['owned', 'consignment'] },
      { key: 'contractId', name: 'شناسه قرارداد', type: 'string', required: false, description: 'شناسه قرارداد مرتبط' },
      { key: 'contractNumber', name: 'شماره قرارداد', type: 'string', required: false, description: 'شماره قرارداد' },
      { key: 'companyId', name: 'شناسه شرکت', type: 'string', required: false, description: 'شناسه شرکت' },
      { key: 'companyName', name: 'نام شرکت', type: 'string', required: false, description: 'نام شرکت' },
      { key: 'productId', name: 'شناسه کالا', type: 'string', required: true, description: 'شناسه کالا' },
      { key: 'productName', name: 'نام کالا', type: 'string', required: true, description: 'نام کالا' },
      { key: 'siteId', name: 'شناسه سایت', type: 'string', required: true, description: 'شناسه سایت' },
      { key: 'siteName', name: 'نام سایت', type: 'string', required: true, description: 'نام سایت' },
      { key: 'tankId', name: 'شناسه مخزن', type: 'string', required: true, description: 'شناسه مخزن' },
      { key: 'tankName', name: 'نام مخزن', type: 'string', required: true, description: 'نام مخزن' },
      { key: 'shipUnloadingAmount', name: 'مقدار تخلیه کشتی', type: 'number', required: false, description: 'مقدار تخلیه از کشتی' },
      { key: 'shipBillOfLadingAmount', name: 'مقدار بارنامه کشتی', type: 'number', required: false, description: 'مقدار بارنامه کشتی' },
      { key: 'tankShoreAmount', name: 'مقدار ساحل مخزن', type: 'number', required: false, description: 'مقدار ساحل مخزن' },
      { key: 'wastageAmount', name: 'مقدار افت', type: 'number', required: false, description: 'مقدار افت' },
      { key: 'wastageReceivedAmount', name: 'مقدار افت دریافت شده', type: 'number', required: false, description: 'مقدار افت دریافت شده' },
      { key: 'finalAmount', name: 'مقدار نهایی', type: 'number', required: true, description: 'مقدار نهایی رسید' },
      { key: 'unit', name: 'واحد', type: 'select', required: true, description: 'واحد شمارش', options: ['kg', 'ton'] },
      { key: 'receiptDate', name: 'تاریخ رسید', type: 'date', required: true, description: 'تاریخ ثبت رسید' },
      { key: 'notes', name: 'توضیحات', type: 'string', required: false, description: 'توضیحات اضافی' },
      { key: 'status', name: 'وضعیت', type: 'select', required: true, description: 'وضعیت رسید', options: ['draft', 'saved', 'finalized', 'invoiced'] },
      { key: 'invoiceStatus', name: 'وضعیت فاکتور', type: 'select', required: false, description: 'وضعیت فاکتور', options: ['pre_invoice', 'invoiced', 'pending_payment', 'settled'] },
      { key: 'isVoided', name: 'ابطال شده', type: 'boolean', required: false, description: 'آیا رسید ابطال شده است؟' },
      { key: 'createdAt', name: 'تاریخ ایجاد', type: 'date', required: false, description: 'تاریخ ایجاد رکورد' },
      { key: 'updatedAt', name: 'تاریخ ویرایش', type: 'date', required: false, description: 'تاریخ آخرین ویرایش' }
    ],
    recordCount: 0,
    lastModified: new Date()
  },
  {
    id: 'consignmentDeliveries',
    name: 'consignmentDeliveries',
    displayName: 'حواله‌های امانی',
    description: 'حواله‌های انبار امانی (کنساینمنت)',
    icon: TrendingUp,
    dataKey: 'deliveries',
    fields: [
      { key: 'id', name: 'شناسه', type: 'string', required: true, description: 'شناسه یکتای حواله' },
      { key: 'transactionNumber', name: 'شماره تراکنش', type: 'string', required: true, description: 'شماره تراکنش حواله' },
      { key: 'userType', name: 'نوع کاربر', type: 'select', required: true, description: 'نوع کاربر', options: ['owned', 'consignment'] },
      { key: 'productId', name: 'شناسه کالا', type: 'string', required: true, description: 'شناسه کالا' },
      { key: 'productName', name: 'نام کالا', type: 'string', required: true, description: 'نام کالا' },
      { key: 'siteId', name: 'شناسه سایت', type: 'string', required: true, description: 'شناسه سایت' },
      { key: 'siteName', name: 'نام سایت', type: 'string', required: true, description: 'نام سایت' },
      { key: 'tankId', name: 'شناسه مخزن', type: 'string', required: true, description: 'شناسه مخزن' },
      { key: 'tankName', name: 'نام مخزن', type: 'string', required: true, description: 'نام مخزن' },
      { key: 'amount', name: 'مقدار', type: 'number', required: true, description: 'مقدار حواله' },
      { key: 'unit', name: 'واحد', type: 'select', required: true, description: 'واحد شمارش', options: ['kg', 'ton'] },
      { key: 'deliveryDate', name: 'تاریخ حواله', type: 'date', required: true, description: 'تاریخ ثبت حواله' },
      { key: 'companyId', name: 'شناسه شرکت', type: 'string', required: false, description: 'شناسه شرکت' },
      { key: 'companyName', name: 'نام شرکت', type: 'string', required: false, description: 'نام شرکت' },
      { key: 'contractId', name: 'شناسه قرارداد', type: 'string', required: false, description: 'شناسه قرارداد' },
      { key: 'contractNumber', name: 'شماره قرارداد', type: 'string', required: false, description: 'شماره قرارداد' },
      { key: 'driverId', name: 'شناسه راننده', type: 'string', required: false, description: 'شناسه راننده' },
      { key: 'driverName', name: 'نام راننده', type: 'string', required: false, description: 'نام راننده' },
      { key: 'notes', name: 'توضیحات', type: 'string', required: false, description: 'توضیحات اضافی' },
      { key: 'status', name: 'وضعیت', type: 'select', required: true, description: 'وضعیت حواله', options: ['draft', 'saved', 'issued', 'finalized', 'printed', 'correction_requested'] },
      { key: 'isVoided', name: 'ابطال شده', type: 'boolean', required: false, description: 'آیا حواله ابطال شده است؟' },
      { key: 'createdAt', name: 'تاریخ ایجاد', type: 'date', required: false, description: 'تاریخ ایجاد رکورد' },
      { key: 'updatedAt', name: 'تاریخ ویرایش', type: 'date', required: false, description: 'تاریخ آخرین ویرایش' }
    ],
    recordCount: 0,
    lastModified: new Date()
  },
  {
    id: 'ownedDeliveries',
    name: 'ownedDeliveries',
    displayName: 'حواله‌های تملیکی',
    description: 'حواله‌های انبار تملیکی (مالکیتی)',
    icon: TrendingUp,
    dataKey: 'deliveries',
    fields: [
      { key: 'id', name: 'شناسه', type: 'string', required: true, description: 'شناسه یکتای حواله' },
      { key: 'transactionNumber', name: 'شماره تراکنش', type: 'string', required: true, description: 'شماره تراکنش حواله' },
      { key: 'userType', name: 'نوع کاربر', type: 'select', required: true, description: 'نوع کاربر', options: ['owned', 'consignment'] },
      { key: 'productId', name: 'شناسه کالا', type: 'string', required: true, description: 'شناسه کالا' },
      { key: 'productName', name: 'نام کالا', type: 'string', required: true, description: 'نام کالا' },
      { key: 'siteId', name: 'شناسه سایت', type: 'string', required: true, description: 'شناسه سایت' },
      { key: 'siteName', name: 'نام سایت', type: 'string', required: true, description: 'نام سایت' },
      { key: 'tankId', name: 'شناسه مخزن', type: 'string', required: true, description: 'شناسه مخزن' },
      { key: 'tankName', name: 'نام مخزن', type: 'string', required: true, description: 'نام مخزن' },
      { key: 'amount', name: 'مقدار', type: 'number', required: true, description: 'مقدار حواله' },
      { key: 'unit', name: 'واحد', type: 'select', required: true, description: 'واحد شمارش', options: ['kg', 'ton'] },
      { key: 'deliveryDate', name: 'تاریخ حواله', type: 'date', required: true, description: 'تاریخ ثبت حواله' },
      { key: 'companyId', name: 'شناسه شرکت', type: 'string', required: false, description: 'شناسه شرکت' },
      { key: 'companyName', name: 'نام شرکت', type: 'string', required: false, description: 'نام شرکت' },
      { key: 'contractId', name: 'شناسه قرارداد', type: 'string', required: false, description: 'شناسه قرارداد' },
      { key: 'contractNumber', name: 'شماره قرارداد', type: 'string', required: false, description: 'شماره قرارداد' },
      { key: 'driverId', name: 'شناسه راننده', type: 'string', required: false, description: 'شناسه راننده' },
      { key: 'driverName', name: 'نام راننده', type: 'string', required: false, description: 'نام راننده' },
      { key: 'notes', name: 'توضیحات', type: 'string', required: false, description: 'توضیحات اضافی' },
      { key: 'status', name: 'وضعیت', type: 'select', required: true, description: 'وضعیت حواله', options: ['draft', 'saved', 'issued', 'finalized', 'printed', 'correction_requested'] },
      { key: 'isVoided', name: 'ابطال شده', type: 'boolean', required: false, description: 'آیا حواله ابطال شده است؟' },
      { key: 'createdAt', name: 'تاریخ ایجاد', type: 'date', required: false, description: 'تاریخ ایجاد رکورد' },
      { key: 'updatedAt', name: 'تاریخ ویرایش', type: 'date', required: false, description: 'تاریخ آخرین ویرایش' }
    ],
    recordCount: 0,
    lastModified: new Date()
  },
  {
    id: 'consignmentWastage',
    name: 'consignmentWastage',
    displayName: 'افت‌های امانی',
    description: 'افت‌های انبار امانی (کنساینمنت)',
    icon: AlertTriangle,
    dataKey: 'wastageTransactions',
    fields: [
      { key: 'id', name: 'شناسه', type: 'string', required: true, description: 'شناسه یکتای تراکنش افت' },
      { key: 'transactionNumber', name: 'شماره تراکنش', type: 'string', required: true, description: 'شماره تراکنش افت' },
      { key: 'transactionType', name: 'نوع تراکنش', type: 'select', required: true, description: 'نوع تراکنش', options: ['owned', 'consignment'] },
      { key: 'referenceType', name: 'نوع مرجع', type: 'string', required: false, description: 'نوع مرجع تراکنش' },
      { key: 'referenceId', name: 'شناسه مرجع', type: 'string', required: false, description: 'شناسه مرجع تراکنش' },
      { key: 'productId', name: 'شناسه کالا', type: 'string', required: false, description: 'شناسه کالا' },
      { key: 'productName', name: 'نام کالا', type: 'string', required: false, description: 'نام کالا' },
      { key: 'siteId', name: 'شناسه سایت', type: 'string', required: false, description: 'شناسه سایت' },
      { key: 'siteName', name: 'نام سایت', type: 'string', required: false, description: 'نام سایت' },
      { key: 'tankId', name: 'شناسه مخزن', type: 'string', required: false, description: 'شناسه مخزن' },
      { key: 'tankName', name: 'نام مخزن', type: 'string', required: false, description: 'نام مخزن' },
      { key: 'amount', name: 'مقدار', type: 'number', required: false, description: 'مقدار افت' },
      { key: 'unit', name: 'واحد', type: 'select', required: false, description: 'واحد شمارش', options: ['kg', 'ton'] },
      { key: 'transactionDate', name: 'تاریخ تراکنش', type: 'date', required: false, description: 'تاریخ تراکنش افت' },
      { key: 'description', name: 'توضیحات', type: 'string', required: false, description: 'توضیحات اضافی' },
      { key: 'createdAt', name: 'تاریخ ایجاد', type: 'date', required: false, description: 'تاریخ ایجاد رکورد' },
      { key: 'updatedAt', name: 'تاریخ ویرایش', type: 'date', required: false, description: 'تاریخ آخرین ویرایش' }
    ],
    recordCount: 0,
    lastModified: new Date()
  },
  {
    id: 'ownedWastage',
    name: 'ownedWastage',
    displayName: 'افت‌های تملیکی',
    description: 'افت‌های انبار تملیکی (مالکیتی)',
    icon: AlertTriangle,
    dataKey: 'wastageTransactions',
    fields: [
      { key: 'id', name: 'شناسه', type: 'string', required: true, description: 'شناسه یکتای تراکنش افت' },
      { key: 'transactionNumber', name: 'شماره تراکنش', type: 'string', required: true, description: 'شماره تراکنش افت' },
      { key: 'transactionType', name: 'نوع تراکنش', type: 'select', required: true, description: 'نوع تراکنش', options: ['owned', 'consignment'] },
      { key: 'referenceType', name: 'نوع مرجع', type: 'string', required: false, description: 'نوع مرجع تراکنش' },
      { key: 'referenceId', name: 'شناسه مرجع', type: 'string', required: false, description: 'شناسه مرجع تراکنش' },
      { key: 'productId', name: 'شناسه کالا', type: 'string', required: false, description: 'شناسه کالا' },
      { key: 'productName', name: 'نام کالا', type: 'string', required: false, description: 'نام کالا' },
      { key: 'siteId', name: 'شناسه سایت', type: 'string', required: false, description: 'شناسه سایت' },
      { key: 'siteName', name: 'نام سایت', type: 'string', required: false, description: 'نام سایت' },
      { key: 'tankId', name: 'شناسه مخزن', type: 'string', required: false, description: 'شناسه مخزن' },
      { key: 'tankName', name: 'نام مخزن', type: 'string', required: false, description: 'نام مخزن' },
      { key: 'amount', name: 'مقدار', type: 'number', required: false, description: 'مقدار افت' },
      { key: 'unit', name: 'واحد', type: 'select', required: false, description: 'واحد شمارش', options: ['kg', 'ton'] },
      { key: 'transactionDate', name: 'تاریخ تراکنش', type: 'date', required: false, description: 'تاریخ تراکنش افت' },
      { key: 'description', name: 'توضیحات', type: 'string', required: false, description: 'توضیحات اضافی' },
      { key: 'createdAt', name: 'تاریخ ایجاد', type: 'date', required: false, description: 'تاریخ ایجاد رکورد' },
      { key: 'updatedAt', name: 'تاریخ ویرایش', type: 'date', required: false, description: 'تاریخ آخرین ویرایش' }
    ],
    recordCount: 0,
    lastModified: new Date()
  },
  {
    id: 'warehouseDeductions',
    name: 'warehouseDeductions',
    displayName: 'سندهای کسر انبار',
    description: 'سندهای کسر موجودی انبار',
    icon: Minus,
    dataKey: 'inventoryAdjustments',
    fields: [
      { key: 'id', name: 'شناسه', type: 'string', required: true, description: 'شناسه یکتای سند' },
      { key: 'transactionNumber', name: 'شماره تراکنش', type: 'string', required: true, description: 'شماره تراکنش سند' },
      { key: 'documentDate', name: 'تاریخ سند', type: 'date', required: true, description: 'تاریخ سند' },
      { key: 'adjustmentType', name: 'نوع تنظیم', type: 'select', required: true, description: 'نوع تنظیم', options: ['deduction', 'addition'] },
      { key: 'productType', name: 'نوع محصول', type: 'select', required: true, description: 'نوع محصول', options: ['owned', 'consignment'] },
      { key: 'productId', name: 'شناسه کالا', type: 'string', required: true, description: 'شناسه کالا' },
      { key: 'productName', name: 'نام کالا', type: 'string', required: true, description: 'نام کالا' },
      { key: 'siteId', name: 'شناسه سایت', type: 'string', required: true, description: 'شناسه سایت' },
      { key: 'siteName', name: 'نام سایت', type: 'string', required: true, description: 'نام سایت' },
      { key: 'tankId', name: 'شناسه مخزن', type: 'string', required: true, description: 'شناسه مخزن' },
      { key: 'tankName', name: 'نام مخزن', type: 'string', required: true, description: 'نام مخزن' },
      { key: 'quantity', name: 'مقدار', type: 'number', required: true, description: 'مقدار کسر' },
      { key: 'companyId', name: 'شناسه شرکت', type: 'string', required: true, description: 'شناسه شرکت' },
      { key: 'companyName', name: 'نام شرکت', type: 'string', required: true, description: 'نام شرکت' },
      { key: 'locationId', name: 'شناسه مکان', type: 'string', required: true, description: 'شناسه مکان' },
      { key: 'locationName', name: 'نام مکان', type: 'string', required: true, description: 'نام مکان' },
      { key: 'status', name: 'وضعیت', type: 'select', required: true, description: 'وضعیت سند', options: ['temporary', 'printed', 'attached', 'finalized'] },
      { key: 'createdAt', name: 'تاریخ ایجاد', type: 'date', required: false, description: 'تاریخ ایجاد رکورد' },
      { key: 'updatedAt', name: 'تاریخ ویرایش', type: 'date', required: false, description: 'تاریخ آخرین ویرایش' }
    ],
    recordCount: 0,
    lastModified: new Date()
  },
  {
    id: 'warehouseAdditions',
    name: 'warehouseAdditions',
    displayName: 'سندهای اضافه انبار',
    description: 'سندهای اضافه موجودی انبار',
    icon: Plus,
    dataKey: 'inventoryAdjustments',
    fields: [
      { key: 'id', name: 'شناسه', type: 'string', required: true, description: 'شناسه یکتای سند' },
      { key: 'transactionNumber', name: 'شماره تراکنش', type: 'string', required: true, description: 'شماره تراکنش سند' },
      { key: 'documentDate', name: 'تاریخ سند', type: 'date', required: true, description: 'تاریخ سند' },
      { key: 'adjustmentType', name: 'نوع تنظیم', type: 'select', required: true, description: 'نوع تنظیم', options: ['deduction', 'addition'] },
      { key: 'productType', name: 'نوع محصول', type: 'select', required: true, description: 'نوع محصول', options: ['owned', 'consignment'] },
      { key: 'productId', name: 'شناسه کالا', type: 'string', required: true, description: 'شناسه کالا' },
      { key: 'productName', name: 'نام کالا', type: 'string', required: true, description: 'نام کالا' },
      { key: 'siteId', name: 'شناسه سایت', type: 'string', required: true, description: 'شناسه سایت' },
      { key: 'siteName', name: 'نام سایت', type: 'string', required: true, description: 'نام سایت' },
      { key: 'tankId', name: 'شناسه مخزن', type: 'string', required: true, description: 'شناسه مخزن' },
      { key: 'tankName', name: 'نام مخزن', type: 'string', required: true, description: 'نام مخزن' },
      { key: 'quantity', name: 'مقدار', type: 'number', required: true, description: 'مقدار اضافه' },
      { key: 'companyId', name: 'شناسه شرکت', type: 'string', required: true, description: 'شناسه شرکت' },
      { key: 'companyName', name: 'نام شرکت', type: 'string', required: true, description: 'نام شرکت' },
      { key: 'locationId', name: 'شناسه مکان', type: 'string', required: true, description: 'شناسه مکان' },
      { key: 'locationName', name: 'نام مکان', type: 'string', required: true, description: 'نام مکان' },
      { key: 'status', name: 'وضعیت', type: 'select', required: true, description: 'وضعیت سند', options: ['temporary', 'printed', 'attached', 'finalized'] },
      { key: 'createdAt', name: 'تاریخ ایجاد', type: 'date', required: false, description: 'تاریخ ایجاد رکورد' },
      { key: 'updatedAt', name: 'تاریخ ویرایش', type: 'date', required: false, description: 'تاریخ آخرین ویرایش' }
    ],
    recordCount: 0,
    lastModified: new Date()
  }
];

// کامپوننت مشاهده و ویرایش داده‌ها
const DataViewer: React.FC<DataViewerProps> = ({ 
  table, 
  data, 
  onClose, 
  onDataChange,
  onRefresh
}) => {
  const [tableData, setTableData] = useState<any[]>(data);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newRecord, setNewRecord] = useState<any>({});
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [showFilter, setShowFilter] = useState(false);
  const [showAllData, setShowAllData] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const storage = DataStorage.getInstance();

  useEffect(() => {
    setTableData(data);
    // انتخاب تمام فیلدها به صورت پیش‌فرض
    setSelectedFields(table.fields.map(field => field.key));
  }, [data, table]);

  const handleEdit = (rowId: string) => {
    const row = tableData.find(item => item.id === rowId);
    if (row) {
      setEditingRow(rowId);
      setEditData({ ...row });
    }
  };

  const handleSave = () => {
    const updatedData = tableData.map(item => 
      item.id === editingRow ? { ...editData, updatedAt: new Date() } : item
    );
    setTableData(updatedData);
    storage.saveData(table.dataKey, updatedData);
    onDataChange(updatedData);
    setEditingRow(null);
    setEditData({});
  };

  const handleDelete = (rowId: string) => {
    if (confirm('آیا از حذف این رکورد اطمینان دارید؟')) {
      const updatedData = tableData.filter(item => item.id !== rowId);
      setTableData(updatedData);
      storage.saveData(table.dataKey, updatedData);
      onDataChange(updatedData);
    }
  };

  const handleCreate = () => {
    const defaultValues: any = { id: `new_${Date.now()}` };
    
    table.fields.forEach(field => {
      if (field.key !== 'id') {
        switch (field.type) {
          case 'string':
            defaultValues[field.key] = '';
            break;
          case 'number':
            defaultValues[field.key] = 0;
            break;
          case 'date':
            defaultValues[field.key] = new Date().toISOString().split('T')[0];
            break;
          case 'boolean':
            defaultValues[field.key] = false;
            break;
          case 'select':
            defaultValues[field.key] = field.options && field.options.length > 0 ? field.options[0] : '';
            break;
          case 'object':
            defaultValues[field.key] = [];
            break;
        }
      }
    });
    
    setNewRecord(defaultValues);
    setIsCreating(true);
  };

  const handleSaveNew = () => {
    const newRecordWithTimestamp = {
      ...newRecord,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const updatedData = [...tableData, newRecordWithTimestamp];
    setTableData(updatedData);
    storage.saveData(table.dataKey, updatedData);
    onDataChange(updatedData);
    setIsCreating(false);
    setNewRecord({});
  };

  const handleSort = (fieldKey: string) => {
    if (sortField === fieldKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(fieldKey);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (fieldKey: string, value: any) => {
    setFilterValues({
      ...filterValues,
      [fieldKey]: value
    });
  };

  const clearFilters = () => {
    setFilterValues({});
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const refreshedData = storage.loadData(table.dataKey) || [];
      setTableData(Array.isArray(refreshedData) ? refreshedData : []);
      onRefresh();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // اعمال فیلترها و مرتب‌سازی
  const processedData = [...tableData].filter(item => {
    if (searchTerm) {
      const searchMatch = Object.values(item).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (!searchMatch) return false;
    }
    
    for (const [key, value] of Object.entries(filterValues)) {
      if (value !== undefined && value !== '') {
        const fieldValue = item[key];
        
        if (fieldValue === undefined || fieldValue === null) return false;
        
        if (typeof value === 'string') {
          if (!String(fieldValue).toLowerCase().includes(value.toLowerCase())) {
            return false;
          }
        } else if (typeof value === 'number') {
          if (fieldValue !== value) return false;
        } else if (typeof value === 'boolean') {
          if (fieldValue !== value) return false;
        }
      }
    }
    
    return true;
  }).sort((a, b) => {
    if (!sortField) return 0;
    
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue === undefined || bValue === undefined) return 0;
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' 
        ? aValue - bValue
        : bValue - aValue;
    } else if (aValue instanceof Date && bValue instanceof Date) {
      return sortDirection === 'asc' 
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    }
    
    return 0;
  });

  // صفحه‌بندی
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const paginatedData = processedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportTableData = () => {
    exportToExcel({
      filename: `${table.displayName}_${formatPersianDate(new Date())}`,
      sheetName: table.displayName,
      title: `گزارش ${table.displayName}`,
      subtitle: `تاریخ تولید: ${formatPersianDate(new Date())}`,
      columns: table.fields.map(field => ({
        key: field.key,
        header: field.name,
        width: 20
      })),
      data: processedData
    });
  };

  // فیلدهایی که باید نمایش داده شوند
  const visibleFields = showAllData 
    ? table.fields 
    : table.fields.filter(field => selectedFields.includes(field.key));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <table.icon className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-xl font-bold text-gray-900">{table.displayName}</h3>
              <p className="text-sm text-gray-600">{table.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshData}
              disabled={isLoading}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              به‌روزرسانی
            </button>
            <button
              onClick={handleCreate}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              ایجاد رکورد جدید
            </button>
            <button
              onClick={exportTableData}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              خروجی اکسل
            </button>
            <button
              onClick={() => setShowAllData(!showAllData)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                showAllData 
                  ? 'bg-purple-600 text-white hover:bg-purple-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Eye className="h-4 w-4" />
              {showAllData ? 'نمایش فیلدهای منتخب' : 'نمایش تمام فیلدها'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {!showAllData && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">انتخاب فیلدها برای نمایش</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedFields(table.fields.map(field => field.key))}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  انتخاب همه
                </button>
                <button
                  onClick={() => setSelectedFields([])}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  حذف همه
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {table.fields.map(field => (
                <label key={field.key} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field.key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFields([...selectedFields, field.key]);
                      } else {
                        setSelectedFields(selectedFields.filter(f => f !== field.key));
                      }
                    }}
                    className="rounded"
                  />
                  {field.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="جستجو در داده‌ها..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="text-sm text-gray-600">
              {formatPersianNumber(processedData.length)} رکورد
            </div>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`p-2 rounded-lg ${showFilter ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>
          
          {showFilter && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-900">فیلترها</h4>
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  پاک کردن فیلترها
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {visibleFields.map(field => (
                  <div key={field.key} className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">
                      {field.name}
                    </label>
                    {field.type === 'boolean' ? (
                      <select
                        value={filterValues[field.key] || ''}
                        onChange={(e) => handleFilterChange(field.key, e.target.value === 'true' ? true : e.target.value === 'false' ? false : '')}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="">همه</option>
                        <option value="true">بله</option>
                        <option value="false">خیر</option>
                      </select>
                    ) : field.type === 'date' ? (
                      <input
                        type="date"
                        value={filterValues[field.key] || ''}
                        onChange={(e) => handleFilterChange(field.key, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : field.type === 'number' ? (
                      <input
                        type="number"
                        value={filterValues[field.key] || ''}
                        onChange={(e) => handleFilterChange(field.key, parseFloat(e.target.value) || '')}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={filterValues[field.key] || ''}
                        onChange={(e) => handleFilterChange(field.key, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="">همه</option>
                        {field.options?.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={filterValues[field.key] || ''}
                        onChange={(e) => handleFilterChange(field.key, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    {visibleFields.map(field => (
                      <th 
                        key={field.key} 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort(field.key)}
                      >
                        <div className="flex items-center justify-end">
                          {field.name}
                          {sortField === field.key && (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      عملیات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.map((row, index) => (
                    <tr key={row.id || index} className="hover:bg-gray-50">
                      {visibleFields.map(field => (
                        <td key={field.key} className="px-4 py-3 border-b border-gray-200">
                          {editingRow === row.id ? (
                            field.type === 'boolean' ? (
                              <input
                                type="checkbox"
                                checked={editData[field.key] || false}
                                onChange={(e) => setEditData({ ...editData, [field.key]: e.target.checked })}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            ) : field.type === 'date' ? (
                              <input
                                type="date"
                                value={editData[field.key] ? new Date(editData[field.key]).toISOString().split('T')[0] : ''}
                                onChange={(e) => setEditData({ ...editData, [field.key]: e.target.value })}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            ) : field.type === 'number' ? (
                              <input
                                type="number"
                                value={editData[field.key] || ''}
                                onChange={(e) => setEditData({ ...editData, [field.key]: parseFloat(e.target.value) || 0 })}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            ) : field.type === 'select' ? (
                              <select
                                value={editData[field.key] || ''}
                                onChange={(e) => setEditData({ ...editData, [field.key]: e.target.value })}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                {field.options?.map(option => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            ) : field.type === 'object' ? (
                              <textarea
                                value={JSON.stringify(editData[field.key] || [], null, 2)}
                                onChange={(e) => {
                                  try {
                                    const parsedValue = JSON.parse(e.target.value);
                                    setEditData({ ...editData, [field.key]: parsedValue });
                                  } catch {
                                    setEditData({ ...editData, [field.key]: e.target.value });
                                  }
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm h-20"
                              />
                            ) : (
                              <input
                                type="text"
                                value={editData[field.key] || ''}
                                onChange={(e) => setEditData({ ...editData, [field.key]: e.target.value })}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            )
                          ) : (
                            <span className="text-sm text-gray-900">
                              {field.type === 'date' && row[field.key] 
                                ? formatPersianDate(new Date(row[field.key]))
                                : field.type === 'number' && row[field.key]
                                ? formatPersianNumber(row[field.key])
                                : field.type === 'boolean'
                                ? (row[field.key] ? 'بله' : 'خیر')
                                : field.type === 'object'
                                ? `${Array.isArray(row[field.key]) ? row[field.key].length : 0} آیتم`
                                : String(row[field.key] || '-')}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3 border-b border-gray-200">
                        {editingRow === row.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleSave}
                              className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingRow(null);
                                setEditData({});
                              }}
                              className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-50"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(row.id)}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(row.id)}
                              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  
                  {isCreating && (
                    <tr className="bg-blue-50">
                      {visibleFields.map(field => (
                        <td key={field.key} className="px-4 py-3 border-b border-gray-200">
                          {field.type === 'boolean' ? (
                            <input
                              type="checkbox"
                              checked={newRecord[field.key] || false}
                              onChange={(e) => setNewRecord({ ...newRecord, [field.key]: e.target.checked })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          ) : field.type === 'date' ? (
                            <input
                              type="date"
                              value={newRecord[field.key] || ''}
                              onChange={(e) => setNewRecord({ ...newRecord, [field.key]: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          ) : field.type === 'number' ? (
                            <input
                              type="number"
                              value={newRecord[field.key] || ''}
                              onChange={(e) => setNewRecord({ ...newRecord, [field.key]: parseFloat(e.target.value) || 0 })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          ) : field.type === 'select' ? (
                            <select
                              value={newRecord[field.key] || ''}
                              onChange={(e) => setNewRecord({ ...newRecord, [field.key]: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              {field.options?.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          ) : field.type === 'object' ? (
                            <textarea
                              value={JSON.stringify(newRecord[field.key] || [], null, 2)}
                              onChange={(e) => {
                                try {
                                  const parsedValue = JSON.parse(e.target.value);
                                  setNewRecord({ ...newRecord, [field.key]: parsedValue });
                                } catch {
                                  setNewRecord({ ...newRecord, [field.key]: e.target.value });
                                }
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm h-20"
                            />
                          ) : (
                            <input
                              type="text"
                              value={newRecord[field.key] || ''}
                              onChange={(e) => setNewRecord({ ...newRecord, [field.key]: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSaveNew}
                            className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setIsCreating(false);
                              setNewRecord({});
                            }}
                            className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-50"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {processedData.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Table className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">داده‌ای یافت نشد</h3>
                  <p className="text-gray-600">
                    {searchTerm ? 'نتیجه‌ای برای جستجوی شما یافت نشد.' : 'این جدول خالی است.'}
                  </p>
                  {!isCreating && (
                    <button
                      onClick={handleCreate}
                      className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
                    >
                      <Plus className="h-4 w-4" />
                      ایجاد اولین رکورد
                    </button>
                  )}
                </div>
              )}
              
              {/* صفحه‌بندی */}
              {processedData.length > itemsPerPage && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <div className="text-sm text-gray-700">
                    نمایش {(currentPage - 1) * itemsPerPage + 1} تا {Math.min(currentPage * itemsPerPage, processedData.length)} از {formatPersianNumber(processedData.length)} رکورد
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <span className="text-sm">
                      صفحه {formatPersianNumber(currentPage)} از {formatPersianNumber(totalPages)}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value={10}>10 رکورد در صفحه</option>
                    <option value={25}>25 رکورد در صفحه</option>
                    <option value={50}>50 رکورد در صفحه</option>
                    <option value={100}>100 رکورد در صفحه</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// کامپوننت ورود/خروجی اکسل
const ImportExportModal: React.FC<ImportExportModalProps> = ({ 
  isOpen, 
  onClose, 
  mode, 
  tables,
  tableData
}) => {
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [operationType, setOperationType] = useState<'full' | 'partial'>('full');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const storage = DataStorage.getInstance();

  const selectedTableData = tables.find(t => t.id === selectedTable);

  useEffect(() => {
    if (selectedTableData) {
      setSelectedFields(selectedTableData.fields.map(f => f.key));
    }
  }, [selectedTableData]);

  const handleImport = async (file: File) => {
    if (!selectedTableData) return;

    setIsProcessing(true);
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const importedData = lines.slice(1)
        .filter(line => line.trim())
        .map((line, index) => {
          const values = line.split(',').map(v => v.trim());
          const record: any = { id: `imported_${Date.now()}_${index}` };
          
          headers.forEach((header, i) => {
            if (values[i]) {
              record[header] = values[i];
            }
          });
          
          record.createdAt = new Date();
          record.updatedAt = new Date();
          return record;
        });

      if (operationType === 'full') {
        storage.saveData(selectedTableData.dataKey, importedData);
      } else {
        const existingData = tableData[selectedTableData.dataKey] || [];
        const combinedData = [...existingData, ...importedData];
        storage.saveData(selectedTableData.dataKey, combinedData);
      }

      alert(`${importedData.length} رکورد با موفقیت وارد شد`);
      onClose();
    } catch (error) {
      console.error('Import error:', error);
      alert('خطا در وارد کردن فایل');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    if (!selectedTableData) return;

    setIsProcessing(true);
    try {
      const data = storage.loadData(selectedTableData.dataKey) || [];
      const fieldsToExport = operationType === 'partial' ? selectedFields : selectedTableData.fields.map(f => f.key);
      
      const exportData = data.map(item => {
        const exportItem: any = {};
        fieldsToExport.forEach(fieldKey => {
          const field = selectedTableData.fields.find(f => f.key === fieldKey);
          if (field) {
            exportItem[field.name] = item[fieldKey];
          }
        });
        return exportItem;
      });

      exportToExcel({
        filename: `${selectedTableData.displayName}_${formatPersianDate(new Date())}`,
        sheetName: selectedTableData.displayName,
        title: `گزارش ${selectedTableData.displayName}`,
        subtitle: `تاریخ تولید: ${formatPersianDate(new Date())}`,
        columns: fieldsToExport.map(fieldKey => {
          const field = selectedTableData.fields.find(f => f.key === fieldKey);
          return {
            key: field?.name || fieldKey,
            header: field?.name || fieldKey,
            width: 20
          };
        }),
        data: exportData
      });

      alert('فایل اکسل با موفقیت ایجاد شد');
    } catch (error) {
      console.error('Export error:', error);
      alert('خطا در ایجاد فایل اکسل');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFormat = () => {
    if (!selectedTableData) return;

    const formatData = {
      tableName: selectedTableData.displayName,
      description: selectedTableData.description,
      fields: selectedTableData.fields.map(field => ({
        name: field.name,
        type: field.type,
        required: field.required,
        description: field.description,
        options: field.options
      })),
      sampleData: selectedTableData.fields.reduce((acc, field) => {
        acc[field.name] = field.type === 'string' ? 'نمونه متن' :
                          field.type === 'number' ? 123 :
                          field.type === 'date' ? formatPersianDate(new Date()) :
                          field.type === 'boolean' ? 'بله/خیر' : 
                          field.type === 'select' ? (field.options && field.options.length > 0 ? field.options[0] : '') :
                          'نمونه';
        return acc;
      }, {} as any)
    };

    exportToExcel({
      filename: `فرمت_${selectedTableData.displayName}_${formatPersianDate(new Date())}`,
      sheetName: 'فرمت استاندارد',
      title: `فرمت استاندارد ${selectedTableData.displayName}`,
      subtitle: `تاریخ تولید: ${formatPersianDate(new Date())}`,
      columns: [
        { key: 'field', header: 'نام فیلد', width: 25 },
        { key: 'type', header: 'نوع داده', width: 15 },
        { key: 'required', header: 'الزامی', width: 10 },
        { key: 'options', header: 'گزینه‌ها', width: 20 },
        { key: 'description', header: 'توضیحات', width: 40 }
      ],
      data: selectedTableData.fields.map(field => ({
        field: field.name,
        type: field.type,
        required: field.required ? 'بله' : 'خیر',
        options: field.type === 'select' ? (field.options?.join(', ') || '') : '-',
        description: field.description
      }))
    });

    alert('فایل فرمت استاندارد با موفقیت ایجاد شد');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900">
              {mode === 'import' ? 'ورود اکسلی اطلاعات' : 
               mode === 'export' ? 'خروجی اکسلی اطلاعات' : 'فرمت استاندارد اکسل'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              انتخاب صفحه/جدول
            </label>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">انتخاب کنید</option>
              {tables.map(table => (
                <option key={table.id} value={table.id}>
                  {table.displayName} ({formatPersianNumber(table.recordCount)} رکورد)
                </option>
              ))}
            </select>
          </div>

          {selectedTableData && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع عملیات
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="operationType"
                      value="full"
                      checked={operationType === 'full'}
                      onChange={(e) => setOperationType(e.target.value as 'full' | 'partial')}
                      className="ml-2"
                    />
                    <span className="text-sm">
                      {mode === 'import' ? 'وارد کردن کلی (جایگزینی تمام داده‌ها)' : 
                       mode === 'export' ? 'خروجی کلی (تمام فیلدها)' : 'فرمت کلی (تمام فیلدها)'}
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="operationType"
                      value="partial"
                      checked={operationType === 'partial'}
                      onChange={(e) => setOperationType(e.target.value as 'full' | 'partial')}
                      className="ml-2"
                    />
                    <span className="text-sm">
                      {mode === 'import' ? 'وارد کردن جزئی (افزودن به داده‌های موجود)' : 
                       mode === 'export' ? 'خروجی جزئی (فیلدهای انتخابی)' : 'فرمت جزئی (فیلدهای انتخابی)'}
                    </span>
                  </label>
                </div>
              </div>

              {operationType === 'partial' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    انتخاب فیلدها
                  </label>
                  <div className="border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                    {selectedTableData.fields.map(field => (
                      <label key={field.key} className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(field.key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFields([...selectedFields, field.key]);
                            } else {
                              setSelectedFields(selectedFields.filter(f => f !== field.key));
                            }
                          }}
                          className="ml-2"
                        />
                        <div>
                          <span className="text-sm font-medium">{field.name}</span>
                          <span className="text-xs text-gray-500 block">{field.description}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">اطلاعات جدول</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>تعداد رکورد: {formatPersianNumber(selectedTableData.recordCount)}</div>
                  <div>آخرین تغییر: {formatPersianDate(selectedTableData.lastModified)}</div>
                  <div>تعداد فیلد: {formatPersianNumber(selectedTableData.fields.length)}</div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            انصراف
          </button>
          
          {mode === 'import' ? (
            <label className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {isProcessing ? 'در حال پردازش...' : 'انتخاب فایل اکسل'}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && selectedTableData) {
                    handleImport(file);
                  }
                }}
                className="hidden"
                disabled={!selectedTableData || isProcessing}
              />
            </label>
          ) : mode === 'export' ? (
            <button
              onClick={handleExport}
              disabled={!selectedTableData || isProcessing}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {isProcessing ? 'در حال ایجاد...' : 'دانلود اکسل'}
            </button>
          ) : (
            <button
              onClick={handleFormat}
              disabled={!selectedTableData || isProcessing}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {isProcessing ? 'در حال ایجاد...' : 'دانلود فرمت'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// کامپوننت اصلی
export const DatabaseSettings: React.FC<DatabaseSettingsProps> = ({
  settings,
  setSettings,
  isLoading,
  testResults,
  setTestResults,
  selectFolder
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'data-viewer' | 'import-export'>('overview');
  const [selectedTable, setSelectedTable] = useState<DatabaseTable | null>(null);
  const [showDataViewer, setShowDataViewer] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [importExportMode, setImportExportMode] = useState<'import' | 'export' | 'format'>('export');
  const [tables, setTables] = useState<DatabaseTable[]>(databaseTables);
  const [tableData, setTableData] = useState<Record<string, any[]>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const storage = DataStorage.getInstance();

  // بارگذاری خودکار داده‌ها در ابتدای کار
  useEffect(() => {
    loadAllTableData();
  }, []);

  const loadAllTableData = () => {
    setIsRefreshing(true);
    try {
      const newData: Record<string, any[]> = {};
      
      // بارگذاری داده‌های خام
      const allReceipts = storage.loadData('receipts') || [];
      const allDeliveries = storage.loadData('deliveries') || [];
      const allWastageTransactions = storage.loadData('wastageTransactions') || [];
      const allInventoryAdjustments = storage.loadData('inventoryAdjustments') || [];
      const allConsignmentDeliverySlips = storage.loadData('consignment-delivery-slips') || [];
      
      tables.forEach(table => {
        let data: any[] = [];
        
        // فیلتر کردن داده‌ها بر اساس نوع جدول
        if (table.id === 'consignmentReceipts') {
          data = Array.isArray(allReceipts) ? allReceipts.filter((r: any) => r.userType === 'consignment') : [];
        } else if (table.id === 'ownedReceipts') {
          data = Array.isArray(allReceipts) ? allReceipts.filter((r: any) => r.userType === 'owned') : [];
        } else if (table.id === 'consignmentDeliveries') {
          data = Array.isArray(allDeliveries) ? allDeliveries.filter((d: any) => d.userType === 'consignment') : [];
        } else if (table.id === 'ownedDeliveries') {
          data = Array.isArray(allDeliveries) ? allDeliveries.filter((d: any) => d.userType === 'owned') : [];
        } else if (table.id === 'consignmentWastage') {
          data = Array.isArray(allWastageTransactions) ? allWastageTransactions.filter((w: any) => w.transactionType === 'consignment') : [];
        } else if (table.id === 'ownedWastage') {
          data = Array.isArray(allWastageTransactions) ? allWastageTransactions.filter((w: any) => w.transactionType === 'owned') : [];
        } else if (table.id === 'warehouseDeductions') {
          data = Array.isArray(allInventoryAdjustments) ? allInventoryAdjustments.filter((adj: any) => adj.adjustmentType === 'deduction') : [];
        } else if (table.id === 'warehouseAdditions') {
          data = Array.isArray(allInventoryAdjustments) ? allInventoryAdjustments.filter((adj: any) => adj.adjustmentType === 'addition') : [];
        } else {
          // برای جداول دیگر، داده‌ها را مستقیماً از storage بارگذاری کن
          const rawData = storage.loadData(table.dataKey) || [];
          data = Array.isArray(rawData) ? rawData : [];
        }
        
        newData[table.dataKey] = data;
      });
      
      setTableData(newData);
      updateTableCounts();
    } catch (error) {
      console.error('Error loading table data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const updateTableCounts = () => {
    // بارگذاری داده‌های خام برای محاسبه تعداد رکوردها
    const allReceipts = storage.loadData('receipts') || [];
    const allDeliveries = storage.loadData('deliveries') || [];
    const allWastageTransactions = storage.loadData('wastageTransactions') || [];
    const allInventoryAdjustments = storage.loadData('inventoryAdjustments') || [];
    
    const updatedTables = tables.map(table => {
      let count = 0;
      
      // محاسبه تعداد رکوردها بر اساس نوع جدول
      if (table.id === 'consignmentReceipts') {
        count = Array.isArray(allReceipts) ? allReceipts.filter((r: any) => r.userType === 'consignment').length : 0;
      } else if (table.id === 'ownedReceipts') {
        count = Array.isArray(allReceipts) ? allReceipts.filter((r: any) => r.userType === 'owned').length : 0;
      } else if (table.id === 'consignmentDeliveries') {
        count = Array.isArray(allDeliveries) ? allDeliveries.filter((d: any) => d.userType === 'consignment').length : 0;
      } else if (table.id === 'ownedDeliveries') {
        count = Array.isArray(allDeliveries) ? allDeliveries.filter((d: any) => d.userType === 'owned').length : 0;
      } else if (table.id === 'consignmentWastage') {
        count = Array.isArray(allWastageTransactions) ? allWastageTransactions.filter((w: any) => w.transactionType === 'consignment').length : 0;
      } else if (table.id === 'ownedWastage') {
        count = Array.isArray(allWastageTransactions) ? allWastageTransactions.filter((w: any) => w.transactionType === 'owned').length : 0;
      } else if (table.id === 'warehouseDeductions') {
        count = Array.isArray(allInventoryAdjustments) ? allInventoryAdjustments.filter((adj: any) => adj.adjustmentType === 'deduction').length : 0;
      } else if (table.id === 'warehouseAdditions') {
        count = Array.isArray(allInventoryAdjustments) ? allInventoryAdjustments.filter((adj: any) => adj.adjustmentType === 'addition').length : 0;
      } else {
        const data = tableData[table.dataKey] || [];
        count = Array.isArray(data) ? data.length : 0;
      }
      
      return {
        ...table,
        recordCount: count,
        lastModified: new Date()
      };
    });
    setTables(updatedTables);
  };

  const testStorage = async () => {
    setTestResults({ ...testResults, storage: false });
    
    try {
      const testKey = 'storage_test';
      const testValue = { test: 'data', timestamp: new Date().toISOString() };
      
      storage.saveData(testKey, testValue);
      const retrieved = storage.loadData(testKey);
      storage.clearAllData();
      storage.saveData(testKey, null);
      
      const isWorking = retrieved && retrieved.test === testValue.test;
      setTestResults({ ...testResults, storage: isWorking });
      
      if (isWorking) {
        alert('تست ذخیره‌سازی با موفقیت انجام شد');
      } else {
        alert('خطا در تست ذخیره‌سازی');
      }
    } catch (error) {
      console.error('Storage test error:', error);
      setTestResults({ ...testResults, storage: false });
      alert('خطا در تست ذخیره‌سازی');
    }
  };

  const resetBaseData = () => {
    if (confirm('آیا از بازنشانی اطلاعات پایه به حالت اولیه اطمینان دارید؟ تمام اطلاعات اضافه شده توسط کاربر حذف خواهد شد.')) {
      try {
        storage.saveData('baseDataCategories', initialCategories);
        
        initialCategories.forEach(category => {
          storage.saveData(`category_${category.id}`, category);
        });
        
        window.dispatchEvent(new CustomEvent('baseDataUpdated', {
          detail: { action: 'reset' }
        }));
        
        loadAllTableData();
        alert('اطلاعات پایه با موفقیت به حالت اولیه بازگردانده شد');
      } catch (error) {
        console.error('Reset error:', error);
        alert('خطا در بازنشانی اطلاعات');
      }
    }
  };

  const clearCache = () => {
    if (confirm('آیا از پاک کردن کش برنامه اطمینان دارید؟ این عمل فقط کش را پاک می‌کند و داده‌های کاربر حفظ می‌شود.')) {
      try {
        const tempKeys = ['temp_', 'cache_', 'session_'];
        const allData = storage.getAllData();
        
        Object.keys(allData).forEach(key => {
          if (tempKeys.some(prefix => key.startsWith(prefix))) {
            localStorage.removeItem(key);
          }
        });
        
        if ('caches' in window) {
          caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
              caches.delete(cacheName);
            });
          });
        }
        
        alert('کش برنامه با موفقیت پاک شد');
      } catch (error) {
        console.error('Clear cache error:', error);
        alert('خطا در پاک کردن کش');
      }
    }
  };

  const openDataViewer = (table: DatabaseTable) => {
    setSelectedTable(table);
    setShowDataViewer(true);
  };

  const openImportExport = (mode: 'import' | 'export' | 'format') => {
    setImportExportMode(mode);
    setShowImportExport(true);
  };

  const handleDataChange = (newData: any[]) => {
    if (selectedTable) {
      // برای جداول فیلتر شده، باید داده‌های اصلی را به‌روزرسانی کنیم
      if (selectedTable.id === 'consignmentReceipts' || selectedTable.id === 'ownedReceipts') {
        const allReceipts = storage.loadData('receipts') || [];
        const otherReceipts = Array.isArray(allReceipts) 
          ? allReceipts.filter((r: any) => 
              selectedTable.id === 'consignmentReceipts' 
                ? r.userType !== 'consignment' 
                : r.userType !== 'owned'
            ) 
          : [];
        const updatedReceipts = [...otherReceipts, ...newData];
        storage.saveData('receipts', updatedReceipts);
      } else if (selectedTable.id === 'consignmentDeliveries' || selectedTable.id === 'ownedDeliveries') {
        const allDeliveries = storage.loadData('deliveries') || [];
        const otherDeliveries = Array.isArray(allDeliveries) 
          ? allDeliveries.filter((d: any) => 
              selectedTable.id === 'consignmentDeliveries' 
                ? d.userType !== 'consignment' 
                : d.userType !== 'owned'
            ) 
          : [];
        const updatedDeliveries = [...otherDeliveries, ...newData];
        storage.saveData('deliveries', updatedDeliveries);
      } else if (selectedTable.id === 'consignmentWastage' || selectedTable.id === 'ownedWastage') {
        const allWastage = storage.loadData('wastageTransactions') || [];
        const otherWastage = Array.isArray(allWastage) 
          ? allWastage.filter((w: any) => 
              selectedTable.id === 'consignmentWastage' 
                ? w.transactionType !== 'consignment' 
                : w.transactionType !== 'owned'
            ) 
          : [];
        const updatedWastage = [...otherWastage, ...newData];
        storage.saveData('wastageTransactions', updatedWastage);
      } else if (selectedTable.id === 'warehouseDeductions' || selectedTable.id === 'warehouseAdditions') {
        const allAdjustments = storage.loadData('inventoryAdjustments') || [];
        const otherAdjustments = Array.isArray(allAdjustments) 
          ? allAdjustments.filter((adj: any) => 
              selectedTable.id === 'warehouseDeductions' 
                ? adj.adjustmentType !== 'deduction' 
                : adj.adjustmentType !== 'addition'
            ) 
          : [];
        const updatedAdjustments = [...otherAdjustments, ...newData];
        storage.saveData('inventoryAdjustments', updatedAdjustments);
      } else {
        // برای جداول دیگر، مستقیماً ذخیره کن
        storage.saveData(selectedTable.dataKey, newData);
      }
      
      // به‌روزرسانی state و تعداد رکوردها
      setTableData({
        ...tableData,
        [selectedTable.dataKey]: newData
      });
      loadAllTableData(); // بارگذاری مجدد برای به‌روزرسانی تمام جداول
    }
  };

  const handleRefresh = () => {
    loadAllTableData();
  };

  // تابع جدید برای نمایش تمام اطلاعات از تمام جداول
  const showAllDataFromAllTables = () => {
    // ایجاد یک جدول مجازی با تمام فیلدهای تمام جداول
    const allFields: DatabaseField[] = [];
    const allData: any[] = [];
    
    tables.forEach(table => {
      // اضافه کردن فیلدهای هر جدول با پیشوند نام جدول
      table.fields.forEach(field => {
        allFields.push({
          ...field,
          key: `${table.name}_${field.key}`,
          name: `${table.displayName}: ${field.name}`
        });
      });
      
      // اضافه کردن داده‌های هر جدول با پیشوند نام جدول
      const data = tableData[table.dataKey] || [];
      data.forEach(item => {
        const prefixedItem: any = { id: `${table.name}_${item.id}` };
        Object.keys(item).forEach(key => {
          prefixedItem[`${table.name}_${key}`] = item[key];
        });
        allData.push(prefixedItem);
      });
    });
    
    // ایجاد جدول مجازی
    const virtualTable: DatabaseTable = {
      id: 'all_tables',
      name: 'all_tables',
      displayName: 'تمام اطلاعات از تمام جداول',
      description: 'نمایش تمام اطلاعات از تمام جداول سیستم',
      icon: Database,
      dataKey: 'all_tables',
      fields: allFields,
      recordCount: allData.length,
      lastModified: new Date()
    };
    
    setSelectedTable(virtualTable);
    setShowDataViewer(true);
  };


  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              activeView === 'overview' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Database className="h-4 w-4" />
            نمای کلی
          </button>
          <button
            onClick={() => setActiveView('data-viewer')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              activeView === 'data-viewer' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Eye className="h-4 w-4" />
            مشاهده و ویرایش اطلاعات
          </button>
          <button
            onClick={() => setActiveView('import-export')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              activeView === 'import-export' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            ورود/خروجی اکسل
          </button>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="ml-auto px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'در حال به‌روزرسانی...' : 'به‌روزرسانی اطلاعات'}
          </button>
        </div>
      </div>

      {activeView === 'overview' && (
        <div className="space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">کل جداول</p>
                  <p className="text-2xl font-bold text-blue-600">{formatPersianNumber(tables.length)}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Table className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">کل رکوردها</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatPersianNumber(tables.reduce((sum, table) => sum + table.recordCount, 0))}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Grid className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">حجم داده‌ها</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatPersianNumber(Math.round(JSON.stringify(storage.getAllData()).length / 1024))} KB
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <HardDrive className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">جداول پایگاه داده</h3>
              <button
                onClick={showAllDataFromAllTables}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                نمایش تمام اطلاعات از تمام جداول
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      نام جدول
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      تعداد رکورد
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      آخرین تغییر
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      عملیات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tables.map((table, index) => (
                    <tr key={table.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <table.icon className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="mr-4">
                            <div className="text-sm font-medium text-gray-900">{table.displayName}</div>
                            <div className="text-sm text-gray-500">{table.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {formatPersianNumber(table.recordCount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">
                          {formatPersianDate(table.lastModified)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openDataViewer(table)}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                            title="مشاهده داده‌ها"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTable(table);
                              openImportExport('export');
                            }}
                            className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50 transition-colors"
                            title="خروجی اکسل"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTable(table);
                              openImportExport('import');
                            }}
                            className="text-orange-600 hover:text-orange-800 p-1 rounded hover:bg-orange-50 transition-colors"
                            title="ورود اکسل"
                          >
                            <Upload className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">عملیات پایگاه داده</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={testStorage}
                disabled={isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <TestTube className="h-4 w-4" />
                تست ذخیره‌سازی
                {testResults.storage !== undefined && (
                  <span className={`ml-2 ${testResults.storage ? 'text-green-200' : 'text-yellow-200'}`}>
                    {testResults.storage ? '✓' : '✗'}
                  </span>
                )}
              </button>
              
              <button
                onClick={resetBaseData}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                بازنشانی اطلاعات
              </button>
              
              <button
                onClick={clearCache}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                پاک کردن کش
              </button>
              
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                به‌روزرسانی آمار
              </button>
            </div>
          </div>
        </div>
      )}

      {activeView === 'data-viewer' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Eye className="h-5 w-5 mr-2 text-blue-500" />
              مشاهده و ویرایش اطلاعات
            </h3>
            <button
              onClick={showAllDataFromAllTables}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              نمایش تمام اطلاعات از تمام جداول
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tables.map(table => (
              <div key={table.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <table.icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{table.displayName}</h4>
                      <p className="text-xs text-gray-500">{table.description}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">تعداد رکورد:</span>
                    <span className="font-medium">{formatPersianNumber(table.recordCount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">تعداد فیلد:</span>
                    <span className="font-medium">{formatPersianNumber(table.fields.length)}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => openDataViewer(table)}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Eye className="h-4 w-4" />
                    مشاهده
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTable(table);
                      openImportExport('export');
                    }}
                    className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'import-export' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <FileSpreadsheet className="h-5 w-5 mr-2 text-blue-500" />
              ورود و خروجی اکسل
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-600 rounded-lg">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900">ورود اکسلی اطلاعات</h4>
                    <p className="text-sm text-blue-700">وارد کردن داده‌ها از فایل اکسل</p>
                  </div>
                </div>
                <button
                  onClick={() => openImportExport('import')}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  شروع ورود داده‌ها
                </button>
              </div>
              
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-600 rounded-lg">
                    <Download className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-900">خروجی اکسلی اطلاعات</h4>
                    <p className="text-sm text-green-700">دریافت داده‌ها در فایل اکسل</p>
                  </div>
                </div>
                <button
                  onClick={() => openImportExport('export')}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  شروع خروجی داده‌ها
                </button>
              </div>
              
              <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-purple-600 rounded-lg">
                    <FileSpreadsheet className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-900">فرمت استاندارد اکسل</h4>
                    <p className="text-sm text-purple-700">دریافت فرمت استاندارد جداول</p>
                  </div>
                </div>
                <button
                  onClick={() => openImportExport('format')}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  دانلود فرمت
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDataViewer && selectedTable && (
        <DataViewer
          table={selectedTable}
          data={selectedTable.id === 'all_tables' 
            ? (() => {
                // اگر جدول مجازی "تمام جداول" است، داده‌ها را از تمام جداول جمع‌آوری کن
                const allData: any[] = [];
                tables.forEach(table => {
                  let data: any[] = [];
                  
                  // بارگذاری و فیلتر داده‌ها برای هر جدول
                  if (table.id === 'consignmentReceipts') {
                    const allReceipts = storage.loadData('receipts') || [];
                    data = Array.isArray(allReceipts) ? allReceipts.filter((r: any) => r.userType === 'consignment') : [];
                  } else if (table.id === 'ownedReceipts') {
                    const allReceipts = storage.loadData('receipts') || [];
                    data = Array.isArray(allReceipts) ? allReceipts.filter((r: any) => r.userType === 'owned') : [];
                  } else if (table.id === 'consignmentDeliveries') {
                    const allDeliveries = storage.loadData('deliveries') || [];
                    data = Array.isArray(allDeliveries) ? allDeliveries.filter((d: any) => d.userType === 'consignment') : [];
                  } else if (table.id === 'ownedDeliveries') {
                    const allDeliveries = storage.loadData('deliveries') || [];
                    data = Array.isArray(allDeliveries) ? allDeliveries.filter((d: any) => d.userType === 'owned') : [];
                  } else if (table.id === 'consignmentWastage') {
                    const allWastage = storage.loadData('wastageTransactions') || [];
                    data = Array.isArray(allWastage) ? allWastage.filter((w: any) => w.transactionType === 'consignment') : [];
                  } else if (table.id === 'ownedWastage') {
                    const allWastage = storage.loadData('wastageTransactions') || [];
                    data = Array.isArray(allWastage) ? allWastage.filter((w: any) => w.transactionType === 'owned') : [];
                  } else if (table.id === 'warehouseDeductions') {
                    const allAdjustments = storage.loadData('inventoryAdjustments') || [];
                    data = Array.isArray(allAdjustments) ? allAdjustments.filter((adj: any) => adj.adjustmentType === 'deduction') : [];
                  } else if (table.id === 'warehouseAdditions') {
                    const allAdjustments = storage.loadData('inventoryAdjustments') || [];
                    data = Array.isArray(allAdjustments) ? allAdjustments.filter((adj: any) => adj.adjustmentType === 'addition') : [];
                  } else {
                    data = tableData[table.dataKey] || [];
                  }
                  
                  data.forEach(item => {
                    const prefixedItem: any = { id: `${table.name}_${item.id}` };
                    Object.keys(item).forEach(key => {
                      prefixedItem[`${table.name}_${key}`] = item[key];
                    });
                    allData.push(prefixedItem);
                  });
                });
                return allData;
              })()
            : (() => {
                // برای جداول فیلتر شده، داده‌ها را از storage بارگذاری و فیلتر کن
                if (selectedTable.id === 'consignmentReceipts' || selectedTable.id === 'ownedReceipts') {
                  const allReceipts = storage.loadData('receipts') || [];
                  return Array.isArray(allReceipts) 
                    ? allReceipts.filter((r: any) => 
                        selectedTable.id === 'consignmentReceipts' 
                          ? r.userType === 'consignment' 
                          : r.userType === 'owned'
                      ) 
                    : [];
                } else if (selectedTable.id === 'consignmentDeliveries' || selectedTable.id === 'ownedDeliveries') {
                  const allDeliveries = storage.loadData('deliveries') || [];
                  return Array.isArray(allDeliveries) 
                    ? allDeliveries.filter((d: any) => 
                        selectedTable.id === 'consignmentDeliveries' 
                          ? d.userType === 'consignment' 
                          : d.userType === 'owned'
                      ) 
                    : [];
                } else if (selectedTable.id === 'consignmentWastage' || selectedTable.id === 'ownedWastage') {
                  const allWastage = storage.loadData('wastageTransactions') || [];
                  return Array.isArray(allWastage) 
                    ? allWastage.filter((w: any) => 
                        selectedTable.id === 'consignmentWastage' 
                          ? w.transactionType === 'consignment' 
                          : w.transactionType === 'owned'
                      ) 
                    : [];
                } else if (selectedTable.id === 'warehouseDeductions' || selectedTable.id === 'warehouseAdditions') {
                  const allAdjustments = storage.loadData('inventoryAdjustments') || [];
                  return Array.isArray(allAdjustments) 
                    ? allAdjustments.filter((adj: any) => 
                        selectedTable.id === 'warehouseDeductions' 
                          ? adj.adjustmentType === 'deduction' 
                          : adj.adjustmentType === 'addition'
                      ) 
                    : [];
                } else {
                  return tableData[selectedTable.dataKey] || [];
                }
              })()}
          onClose={() => {
            setShowDataViewer(false);
            setSelectedTable(null);
          }}
          onDataChange={handleDataChange}
          onRefresh={handleRefresh}
        />
      )}

      {showImportExport && (
        <ImportExportModal
          isOpen={showImportExport}
          onClose={() => {
            setShowImportExport(false);
            setSelectedTable(null);
          }}
          mode={importExportMode}
          tables={tables}
          tableData={tableData}
        />
      )}
    </div>
  );
}
import React, { useState, useEffect, useCallback, useReducer, useRef, useMemo } from 'react';
import { Plus, Search, Download, Package, FileText, X, Calendar, CircleAlert as AlertCircle, Save, CreditCard as Edit2, Trash2, Eye, Clock, TrendingUp, ChartBar as BarChart3, RefreshCw, ChevronDown, ChevronUp, Activity, Printer, ArrowLeft, Building as BuildingIcon, Warehouse, TriangleAlert as AlertTriangle, ChevronRight, FolderOpen, Info, Minimize2, Maximize2 } from 'lucide-react';
import { formatPersianDate, formatPersianNumber } from '../../utils/persian';
import { DataStorage } from '../../utils/dataStorage';
import { Building2, Truck } from 'lucide-react';
import { PersianDatePicker } from '../Common/PersianDatePicker';

// کامپوننت Tooltip برای راهنمایی فیلدهای محاسباتی
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-block">
      <div 
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center"
      >
        {children}
        <Info className="h-4 w-4 text-blue-500 mr-1 cursor-help" />
      </div>
      {show && (
        <div className="absolute z-10 w-64 p-3 mt-2 text-sm text-white bg-gray-800 rounded-lg shadow-lg right-0 bottom-full mb-2">
          <div className="text-right">{text}</div>
          <div className="absolute w-3 h-3 bg-gray-800 transform rotate-45 -bottom-1.5 right-4"></div>
        </div>
      )}
    </div>
  );
};

const isValidDate = (date: any): date is Date => {
  return date instanceof Date && !isNaN(date.getTime());
};

const calculateDueDate = (receiptDate: Date): Date => {
  const dueDate = new Date(receiptDate);
  dueDate.setMonth(dueDate.getMonth() + 1);
  return dueDate;
};

interface WarehouseReceipt {
  id: string;
  transactionNumber: string;
  userType: 'owned' | 'consignment';
  counterpartyId?: string;
  counterpartyName?: string;
  customerCounterpartyId?: string;
  customerCounterpartyName?: string;
  counterpartyLocationId?: string;
  counterpartyLocationName?: string;
  customerCounterpartyLocationId?: string;
  customerCounterpartyLocationName?: string;
  contractId?: string;
  contractNumber?: string;
  contractWeight?: number;
  // فیلدهای اضافی برای اجاره
  rentalTypeId?: string;
  rentalTypeName?: string;
  rentalRate?: number;
  wastagePercentage?: number;
  wastageWeight?: number;
  gainedWeight?: number;
  gainedProductCode?: string;
  gainedProductName?: string;
  consignmentRemainder?: number;
  inventoryRemainder?: number;
  contractReceiptWeight?: number;
  contractRemainder?: number;
  isOverdue?: boolean;
  companyId?: string;
  companyName?: string;
  productId: string;
  productName: string;
  productCode?: string;
  siteId: string;
  siteName: string;
  tankId: string;
  tankName: string;
  tankCapacity?: number;
  shipUnloadingAmount: number;
  shipBillOfLadingAmount: number;
  tankShoreAmount: number;
  weightGross?: number;
  receiptBasis?: string;
  receiptBasisAmount?: number;
  unit: 'kg' | 'ton';
  receiptDate: Date;
  dueDate?: Date;
  finalAmount: number;
  notes: string;
  status: 'draft' | 'saved' | 'finalized' | 'printed';
  invoiceStatus?: 'pre_invoice' | 'invoiced' | 'pending_payment' | 'settled';
  createdAt: Date;
  updatedAt: Date;
  shipId?: string;
  shipName?: string;
  cotageId?: string;
  cotageNumber?: string;
  indexId?: string;
  indexNumber?: string;
  driverId?: string;
  driverName?: string;
  internalCompanyName?: string;
  deliveryType?: 'first_party' | 'second_party';
  additionalInfo?: ReceiptAdditionalInfo;
}

interface ReceiptAdditionalInfo {
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

// تابع تولید شماره تراکنش با پیشوندهای مختلف
// این تابع به صورت dynamic در کامپوننت اصلی تعریف می‌شود

const receiptBasisOptions = [
  { id: 'bill-lading', name: 'وزن بارنامه (Bill of lading weight)' },
  { id: 'ullage', name: 'وزن آلج کشتي (Ullage weight)' },
  { id: 'shore-tank', name: 'وزن شور تانک (Shore tank)' },
  { id: 'gross', name: 'وزن ناخالص (Weight Gross)' },
];

// کامپوننت نمودار موجودي - اصلاح شده براي نمايش مقادير
interface InventoryChartProps {
  data: Array<{ label: string; value: number }>;
  title: string;
  type?: 'bar' | 'pie';
  showValues?: boolean;
}

const InventoryChart: React.FC<InventoryChartProps> = ({ data, title, type = 'bar', showValues = true }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">داده‌اي براي نمايش وجود ندارد</p>
      </div>
    );
  }
  
  if (type === 'pie') {
    const total = data.reduce((sum: number, item: { label: string; value: number }) => sum + item.value, 0);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    
    return (
      <div className="bg-white p-4 rounded-xl border border-gray-200 h-80">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">{title}</h3>
        <div className="flex items-center justify-center">
          <div className="relative w-48 h-48">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              {data.map((item: { label: string; value: number }, index: number) => {
                const percentage = (item.value / total) * 100;
                const angle = (percentage / 100) * 360;
                const startAngle = data.slice(0, index).reduce((sum: number, d: { label: string; value: number }) => sum + (d.value / total) * 360, 0);
                
                const x1 = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180);
                const y1 = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180);
                const x2 = 100 + 80 * Math.cos((startAngle + angle - 90) * Math.PI / 180);
                const y2 = 100 + 80 * Math.sin((startAngle + angle - 90) * Math.PI / 180);
                
                const largeArcFlag = angle > 180 ? 1 : 0;
                const pathData = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                
                return (
                  <path
                    key={index}
                    d={pathData}
                    fill={colors[index % colors.length]}
                    stroke="white"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1">
          {data.map((item: { label: string; value: number }, index: number) => (
            <div key={index} className="flex items-center gap-1">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: colors[index % colors.length] }}
              ></div>
              <span className="text-xs text-gray-700 truncate">{item.label}</span>
              {showValues && (
                <span className="text-xs font-bold text-gray-900">
                  {formatPersianNumber(item.value)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 h-80">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">{title}</h3>
      <div className="space-y-2">
        {data.map((item: { label: string; value: number }, index: number) => (
          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <span className="text-xs font-medium text-gray-900 truncate">{item.label}</span>
            {showValues && (
              <span className="text-sm font-bold text-blue-600">
                {formatPersianNumber(item.value)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// کامپوننت گزارش درختي موجودي کالاها - نسخه جديد با جزئیات اسناد
interface WastageTransaction {
  id: string;
  transactionNumber: string;
  transactionType: 'owned' | 'consignment';
  siteId?: string;
  tankId?: string;
  amount: number;
  contractNumber?: string;
  receiptTransactionNumber?: string;
  counterpartyName?: string;
}

interface Delivery {
  id: string;
  transactionNumber: string;
  status: string;
  siteId?: string;
  tankId?: string;
  amount?: number;
  contractNumber?: string;
  counterpartyName?: string;
  transactionType?: string;
}

interface BaseData {
  sites?: Array<{ id: string; name: string }>;
  tanks?: Array<{ id: string; name: string }>;
}

interface TreeInventoryReportProps {
  receipts: WarehouseReceipt[];
  baseData: BaseData;
  wastageTransactions?: WastageTransaction[];
  deliveries?: Delivery[];
}

const TreeInventoryReport: React.FC<TreeInventoryReportProps> = ({ receipts, baseData, wastageTransactions = [], deliveries = [] }) => {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  
  // گروه‌بندي داده‌ها بر اساس سايت، مخزن، نوع کالا و نوع سند
  interface TreeNode {
    id: string;
    name: string;
    type: string;
    children?: Record<string, TreeNode>;
    totalAmount?: number;
    parentId?: string;
    count?: number;
    amount?: number;
    contractNumber?: string;
    receiptNumber?: string;
    counterpartyName?: string;
  }

  const groupedData = receipts.reduce((acc: Record<string, TreeNode>, receipt: WarehouseReceipt) => {
    if (!receipt.siteId || !receipt.tankId) return acc;
    
    const siteKey = `site_${receipt.siteId}`;
    const tankKey = `tank_${receipt.tankId}`;
    const productTypeKey = `${receipt.userType === 'owned' ? 'owned' : 'consignment'}_${receipt.siteId}_${receipt.tankId}`;
    const documentTypeKey = `${receipt.userType === 'owned' ? 'owned_receipt' : 'consignment_receipt'}_${receipt.siteId}_${receipt.tankId}`;
    
    // ایجاد سايت
    if (!acc[siteKey]) {
      const site = baseData.sites?.find(s => s.id === receipt.siteId);
      acc[siteKey] = {
        id: siteKey,
        name: site?.name || 'سايت نامشخص',
        type: 'site',
        children: {},
        totalAmount: 0
      };
    }
    
    // ایجاد مخزن
    const siteNode = acc[siteKey];
    if (siteNode && !siteNode.children?.[tankKey]) {
      const tank = baseData.tanks?.find((t: { id: string; name: string }) => t.id === receipt.tankId);
      if (!siteNode.children) siteNode.children = {};
      siteNode.children[tankKey] = {
        id: tankKey,
        name: tank?.name || 'مخزن نامشخص',
        type: 'tank',
        children: {},
        totalAmount: 0,
        parentId: siteKey
      };
    }
    
    // ایجاد نوع کالا
    const tankNode = siteNode?.children?.[tankKey];
    if (tankNode && !tankNode.children?.[productTypeKey]) {
      const productTypeName = receipt.userType === 'owned' ? 'کالای تملیکی' : 'کالای امانی';
      if (!tankNode.children) tankNode.children = {};
      tankNode.children[productTypeKey] = {
        id: productTypeKey,
        name: productTypeName,
        type: 'productType',
        children: {},
        totalAmount: 0,
        parentId: tankKey
      };
    }
    
    // ایجاد نوع سند
    const productTypeNode = tankNode?.children?.[productTypeKey];
    if (productTypeNode && !productTypeNode.children?.[documentTypeKey]) {
      const documentTypeName = receipt.userType === 'owned' ? 'رسید تملیکی' : 'رسید امانی';
      if (!productTypeNode.children) productTypeNode.children = {};
      productTypeNode.children[documentTypeKey] = {
        id: documentTypeKey,
        name: documentTypeName,
        type: 'documentType',
        children: {},
        totalAmount: 0,
        count: 0,
        parentId: productTypeKey
      };
    }
    
    // ایجاد آیتم سند
    const itemKey = `receipt_${receipt.id}`;
    const documentTypeNode = productTypeNode?.children?.[documentTypeKey];
    if (documentTypeNode && !documentTypeNode.children?.[itemKey]) {
      if (!documentTypeNode.children) documentTypeNode.children = {};
      documentTypeNode.children[itemKey] = {
        id: itemKey,
        name: `رسید ${receipt.transactionNumber}`,
        type: 'item',
        amount: receipt.receiptBasisAmount || 0,
        contractNumber: receipt.contractNumber || '',
        receiptNumber: receipt.transactionNumber || '',
        counterpartyName: receipt.counterpartyName || '',
        parentId: documentTypeKey
      };
    }
    
    // به‌روزرسانی مقادیر
    const amount = receipt.receiptBasisAmount || 0;
    if (siteNode) {
      siteNode.totalAmount = (siteNode.totalAmount || 0) + amount;
      if (tankNode) {
        tankNode.totalAmount = (tankNode.totalAmount || 0) + amount;
        if (productTypeNode) {
          productTypeNode.totalAmount = (productTypeNode.totalAmount || 0) + amount;
          if (documentTypeNode) {
            documentTypeNode.totalAmount = (documentTypeNode.totalAmount || 0) + amount;
            documentTypeNode.count = (documentTypeNode.count || 0) + 1;
          }
        }
      }
    }
    
    return acc;
  }, {} as any);
  
  // افزودن تراکنش‌هاي "افزودن به تملکي" به گزارش (رسید تملیکی ایجاد شده از محل افت)
  wastageTransactions
    .filter(transaction => transaction.transactionType === 'owned')
    .forEach(transaction => {
      if (!transaction.siteId || !transaction.tankId) return;
      
      const siteKey = `site_${transaction.siteId}`;
      const tankKey = `tank_${transaction.tankId}`;
      const productTypeKey = `owned_${transaction.siteId}_${transaction.tankId}`;
      const documentTypeKey = `owned_wastage_${transaction.siteId}_${transaction.tankId}`;
      
      // ایجاد سايت اگر وجود نداشته باشد
      if (!groupedData[siteKey]) {
        const site = baseData.sites?.find((s: { id: string; name: string }) => s.id === transaction.siteId);
        groupedData[siteKey] = {
          id: siteKey,
          name: site?.name || 'سايت نامشخص',
          type: 'site',
          children: {},
          totalAmount: 0
        };
      }
      
      // ایجاد مخزن اگر وجود نداشته باشد
      const siteNodeWT = groupedData[siteKey];
      if (siteNodeWT && !siteNodeWT.children?.[tankKey]) {
        const tank = baseData.tanks?.find((t: { id: string; name: string }) => t.id === transaction.tankId);
        if (!siteNodeWT.children) siteNodeWT.children = {};
        siteNodeWT.children[tankKey] = {
          id: tankKey,
          name: tank?.name || 'مخزن نامشخص',
          type: 'tank',
          children: {},
          totalAmount: 0,
          parentId: siteKey
        };
      }
      
      // ایجاد نوع کالا اگر وجود نداشته باشد
      const tankNodeWT = siteNodeWT?.children?.[tankKey];
      if (tankNodeWT && !tankNodeWT.children?.[productTypeKey]) {
        if (!tankNodeWT.children) tankNodeWT.children = {};
        tankNodeWT.children[productTypeKey] = {
          id: productTypeKey,
          name: 'کالای تملیکی',
          type: 'productType',
          children: {},
          totalAmount: 0,
          parentId: tankKey
        };
      }
      
      // ایجاد نوع سند اگر وجود نداشته باشد
      const productTypeNodeWT = tankNodeWT?.children?.[productTypeKey];
      if (productTypeNodeWT && !productTypeNodeWT.children?.[documentTypeKey]) {
        if (!productTypeNodeWT.children) productTypeNodeWT.children = {};
        productTypeNodeWT.children[documentTypeKey] = {
          id: documentTypeKey,
          name: 'رسید تملیکی ایجاد شده از محل افت',
          type: 'documentType',
          children: {},
          totalAmount: 0,
          count: 0,
          parentId: productTypeKey
        };
      }
      
      // ایجاد آیتم سند
      const itemKey = `owned_wastage_${transaction.id}`;
      const documentTypeNodeWT = productTypeNodeWT?.children?.[documentTypeKey];
      if (documentTypeNodeWT && !documentTypeNodeWT.children?.[itemKey]) {
        if (!documentTypeNodeWT.children) documentTypeNodeWT.children = {};
        documentTypeNodeWT.children[itemKey] = {
          id: itemKey,
          name: `تراکنش ${transaction.transactionNumber}`,
          type: 'item',
          amount: Math.abs(transaction.amount),
          contractNumber: transaction.contractNumber || '',
          receiptNumber: transaction.receiptTransactionNumber || '',
          counterpartyName: transaction.counterpartyName || '',
          parentId: documentTypeKey
        };
      }
      
      // به‌روزرساني مقادير با تراکنش‌هاي "افزودن به تملکي"
      const amount = Math.abs(transaction.amount);
      if (siteNodeWT) {
        siteNodeWT.totalAmount = (siteNodeWT.totalAmount || 0) + amount;
        if (tankNodeWT) {
          tankNodeWT.totalAmount = (tankNodeWT.totalAmount || 0) + amount;
          if (productTypeNodeWT) {
            productTypeNodeWT.totalAmount = (productTypeNodeWT.totalAmount || 0) + amount;
            if (documentTypeNodeWT) {
              documentTypeNodeWT.totalAmount = (documentTypeNodeWT.totalAmount || 0) + amount;
              documentTypeNodeWT.count = (documentTypeNodeWT.count || 0) + 1;
            }
          }
        }
      }
    });
  
  // کسر تراکنش‌هاي افت از موجودي کالاي امانی (رسید امانی ایجاد شده از محل افت)
  wastageTransactions
    .filter(transaction => transaction.transactionType === 'consignment')
    .forEach(transaction => {
      if (!transaction.siteId || !transaction.tankId) return;
      
      const siteKey = `site_${transaction.siteId}`;
      const tankKey = `tank_${transaction.tankId}`;
      const productTypeKey = `consignment_${transaction.siteId}_${transaction.tankId}`;
      const documentTypeKey = `consignment_wastage_${transaction.siteId}_${transaction.tankId}`;
      
      // ایجاد سايت اگر وجود نداشته باشد
      if (!groupedData[siteKey]) {
        const site = baseData.sites?.find((s: { id: string; name: string }) => s.id === transaction.siteId);
        groupedData[siteKey] = {
          id: siteKey,
          name: site?.name || 'سايت نامشخص',
          type: 'site',
          children: {},
          totalAmount: 0
        };
      }
      
      // ایجاد مخزن اگر وجود نداشته باشد
      const siteNodeCT = groupedData[siteKey];
      if (siteNodeCT && !siteNodeCT.children?.[tankKey]) {
        const tank = baseData.tanks?.find((t: { id: string; name: string }) => t.id === transaction.tankId);
        if (!siteNodeCT.children) siteNodeCT.children = {};
        siteNodeCT.children[tankKey] = {
          id: tankKey,
          name: tank?.name || 'مخزن نامشخص',
          type: 'tank',
          children: {},
          totalAmount: 0,
          parentId: siteKey
        };
      }
      
      // ایجاد نوع کالا اگر وجود نداشته باشد
      const tankNodeCT = siteNodeCT?.children?.[tankKey];
      if (tankNodeCT && !tankNodeCT.children?.[productTypeKey]) {
        if (!tankNodeCT.children) tankNodeCT.children = {};
        tankNodeCT.children[productTypeKey] = {
          id: productTypeKey,
          name: 'کالاي اماني',
          type: 'productType',
          children: {},
          totalAmount: 0,
          parentId: tankKey
        };
      }
      
      // ایجاد نوع سند اگر وجود نداشته باشد
      const productTypeNodeCT = tankNodeCT?.children?.[productTypeKey];
      if (productTypeNodeCT && !productTypeNodeCT.children?.[documentTypeKey]) {
        if (!productTypeNodeCT.children) productTypeNodeCT.children = {};
        productTypeNodeCT.children[documentTypeKey] = {
          id: documentTypeKey,
          name: 'رسید امانی ایجاد شده از محل افت',
          type: 'documentType',
          children: {},
          totalAmount: 0,
          count: 0,
          parentId: productTypeKey
        };
      }
      
      // ایجاد آیتم سند
      const itemKey = `consignment_wastage_${transaction.id}`;
      const documentTypeNodeCT = productTypeNodeCT?.children?.[documentTypeKey];
      if (documentTypeNodeCT && !documentTypeNodeCT.children?.[itemKey]) {
        if (!documentTypeNodeCT.children) documentTypeNodeCT.children = {};
        documentTypeNodeCT.children[itemKey] = {
          id: itemKey,
          name: `تراکنش ${transaction.transactionNumber}`,
          type: 'item',
          amount: -Math.abs(transaction.amount),
          contractNumber: transaction.contractNumber || '',
          receiptNumber: transaction.receiptTransactionNumber || '',
          counterpartyName: transaction.counterpartyName || '',
          parentId: documentTypeKey
        };
      }
      
      // به‌روزرساني مقادير با تراکنش‌هاي "کسر از اماني"
      const amount = Math.abs(transaction.amount);
      if (siteNodeCT) {
        siteNodeCT.totalAmount = (siteNodeCT.totalAmount || 0) - amount;
        if (tankNodeCT) {
          tankNodeCT.totalAmount = (tankNodeCT.totalAmount || 0) - amount;
          if (productTypeNodeCT) {
            productTypeNodeCT.totalAmount = (productTypeNodeCT.totalAmount || 0) - amount;
            if (documentTypeNodeCT) {
              documentTypeNodeCT.totalAmount = (documentTypeNodeCT.totalAmount || 0) + amount;
              documentTypeNodeCT.count = (documentTypeNodeCT.count || 0) + 1;
            }
          }
        }
      }
    });
  
  // افزودن سندهای اضافه انبار
  deliveries
    .filter(delivery => delivery.status === 'saved' || delivery.status === 'finalized' || delivery.status === 'printed')
    .forEach(delivery => {
      if (!delivery.siteId || !delivery.tankId) return;
      
      const siteKey = `site_${delivery.siteId}`;
      const tankKey = `tank_${delivery.tankId}`;
      const productTypeKey = `owned_${delivery.siteId}_${delivery.tankId}`;
      const documentTypeKey = `warehouse_add_${delivery.siteId}_${delivery.tankId}`;
      
      // ایجاد سايت اگر وجود نداشته باشد
      if (!groupedData[siteKey]) {
        const site = baseData.sites?.find((s: { id: string; name: string }) => s.id === delivery.siteId);
        groupedData[siteKey] = {
          id: siteKey,
          name: site?.name || 'سايت نامشخص',
          type: 'site',
          children: {},
          totalAmount: 0
        };
      }
      
      // ایجاد مخزن اگر وجود نداشته باشد
      const siteNodeDA = groupedData[siteKey];
      if (siteNodeDA && !siteNodeDA.children?.[tankKey]) {
        const tank = baseData.tanks?.find((t: { id: string; name: string }) => t.id === delivery.tankId);
        if (!siteNodeDA.children) siteNodeDA.children = {};
        siteNodeDA.children[tankKey] = {
          id: tankKey,
          name: tank?.name || 'مخزن نامشخص',
          type: 'tank',
          children: {},
          totalAmount: 0,
          parentId: siteKey
        };
      }
      
      // ایجاد نوع کالا اگر وجود نداشته باشد
      const tankNodeDA = siteNodeDA?.children?.[tankKey];
      if (tankNodeDA && !tankNodeDA.children?.[productTypeKey]) {
        if (!tankNodeDA.children) tankNodeDA.children = {};
        tankNodeDA.children[productTypeKey] = {
          id: productTypeKey,
          name: 'کالای تملیکی',
          type: 'productType',
          children: {},
          totalAmount: 0,
          parentId: tankKey
        };
      }
      
      // ایجاد نوع سند اگر وجود نداشته باشد
      const productTypeNodeDA = tankNodeDA?.children?.[productTypeKey];
      if (productTypeNodeDA && !productTypeNodeDA.children?.[documentTypeKey]) {
        if (!productTypeNodeDA.children) productTypeNodeDA.children = {};
        productTypeNodeDA.children[documentTypeKey] = {
          id: documentTypeKey,
          name: 'سندهای اضافه انبار',
          type: 'documentType',
          children: {},
          totalAmount: 0,
          count: 0,
          parentId: productTypeKey
        };
      }
      
      // ایجاد آیتم سند
      const itemKey = `delivery_add_${delivery.id}`;
      const documentTypeNodeDA = productTypeNodeDA?.children?.[documentTypeKey];
      if (documentTypeNodeDA && !documentTypeNodeDA.children?.[itemKey]) {
        if (!documentTypeNodeDA.children) documentTypeNodeDA.children = {};
        documentTypeNodeDA.children[itemKey] = {
          id: itemKey,
          name: `حواله ${delivery.transactionNumber}`,
          type: 'item',
          amount: -(delivery.amount || 0),
          contractNumber: delivery.contractNumber || '',
          receiptNumber: delivery.transactionNumber || '',
          counterpartyName: delivery.counterpartyName || '',
          parentId: documentTypeKey
        };
      }
      
      // به‌روزرساني مقادير با سندهای اضافه انبار
      const amount = delivery.amount || 0;
      if (siteNodeDA) {
        siteNodeDA.totalAmount = (siteNodeDA.totalAmount || 0) - amount; // کسر از موجودی
        if (tankNodeDA) {
          tankNodeDA.totalAmount = (tankNodeDA.totalAmount || 0) - amount;
          if (productTypeNodeDA) {
            productTypeNodeDA.totalAmount = (productTypeNodeDA.totalAmount || 0) - amount;
            if (documentTypeNodeDA) {
              documentTypeNodeDA.totalAmount = (documentTypeNodeDA.totalAmount || 0) + amount;
              documentTypeNodeDA.count = (documentTypeNodeDA.count || 0) + 1;
            }
          }
        }
      }
    });
  
  // افزودن سندهای کسر انبار
  deliveries
    .filter(delivery => (delivery.status === 'saved' || delivery.status === 'finalized' || delivery.status === 'printed') && delivery.transactionType === 'subtract')
    .forEach(delivery => {
      if (!delivery.siteId || !delivery.tankId) return;
      
      const siteKey = `site_${delivery.siteId}`;
      const tankKey = `tank_${delivery.tankId}`;
      const productTypeKey = `owned_${delivery.siteId}_${delivery.tankId}`;
      const documentTypeKey = `warehouse_subtract_${delivery.siteId}_${delivery.tankId}`;
      
      // ایجاد سايت اگر وجود نداشته باشد
      if (!groupedData[siteKey]) {
        const site = baseData.sites?.find((s: { id: string; name: string }) => s.id === delivery.siteId);
        groupedData[siteKey] = {
          id: siteKey,
          name: site?.name || 'سايت نامشخص',
          type: 'site',
          children: {},
          totalAmount: 0
        };
      }
      
      // ایجاد مخزن اگر وجود نداشته باشد
      const siteNodeDS = groupedData[siteKey];
      if (siteNodeDS && !siteNodeDS.children?.[tankKey]) {
        const tank = baseData.tanks?.find((t: { id: string; name: string }) => t.id === delivery.tankId);
        if (!siteNodeDS.children) siteNodeDS.children = {};
        siteNodeDS.children[tankKey] = {
          id: tankKey,
          name: tank?.name || 'مخزن نامشخص',
          type: 'tank',
          children: {},
          totalAmount: 0,
          parentId: siteKey
        };
      }
      
      // ایجاد نوع کالا اگر وجود نداشته باشد
      const tankNodeDS = siteNodeDS?.children?.[tankKey];
      if (tankNodeDS && !tankNodeDS.children?.[productTypeKey]) {
        if (!tankNodeDS.children) tankNodeDS.children = {};
        tankNodeDS.children[productTypeKey] = {
          id: productTypeKey,
          name: 'کالای تملیکی',
          type: 'productType',
          children: {},
          totalAmount: 0,
          parentId: tankKey
        };
      }
      
      // ایجاد نوع سند اگر وجود نداشته باشد
      const productTypeNodeDS = tankNodeDS?.children?.[productTypeKey];
      if (productTypeNodeDS && !productTypeNodeDS.children?.[documentTypeKey]) {
        if (!productTypeNodeDS.children) productTypeNodeDS.children = {};
        productTypeNodeDS.children[documentTypeKey] = {
          id: documentTypeKey,
          name: 'سند کسر انبار',
          type: 'documentType',
          children: {},
          totalAmount: 0,
          count: 0,
          parentId: productTypeKey
        };
      }
      
      // ایجاد آیتم سند
      const itemKey = `delivery_subtract_${delivery.id}`;
      const documentTypeNodeDS = productTypeNodeDS?.children?.[documentTypeKey];
      if (documentTypeNodeDS && !documentTypeNodeDS.children?.[itemKey]) {
        if (!documentTypeNodeDS.children) documentTypeNodeDS.children = {};
        documentTypeNodeDS.children[itemKey] = {
          id: itemKey,
          name: `حواله ${delivery.transactionNumber}`,
          type: 'item',
          amount: -(delivery.amount || 0),
          contractNumber: delivery.contractNumber || '',
          receiptNumber: delivery.transactionNumber || '',
          counterpartyName: delivery.counterpartyName || '',
          parentId: documentTypeKey
        };
      }
      
      // به‌روزرساني مقادير با سند کسر انبار
      const amount = delivery.amount || 0;
      if (siteNodeDS) {
        siteNodeDS.totalAmount = (siteNodeDS.totalAmount || 0) - amount; // کسر از موجودی
        if (tankNodeDS) {
          tankNodeDS.totalAmount = (tankNodeDS.totalAmount || 0) - amount;
          if (productTypeNodeDS) {
            productTypeNodeDS.totalAmount = (productTypeNodeDS.totalAmount || 0) - amount;
            if (documentTypeNodeDS) {
              documentTypeNodeDS.totalAmount = (documentTypeNodeDS.totalAmount || 0) + amount;
              documentTypeNodeDS.count = (documentTypeNodeDS.count || 0) + 1;
            }
          }
        }
      }
    });
  
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };
  
  // استفاده از تابع renderTreeNode اصلاح شده
  const renderTreeNode = (node: any, level = 0) => {
    const isExpanded = expandedNodes[node.id];
    const hasChildren = node.children && Object.keys(node.children).length > 0;
    
    return (
      <div key={node.id} className="mb-1">
        <div 
          className={`flex items-center py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-100 ${
            node.type === 'site' ? 'bg-blue-50 border border-blue-200' :
            node.type === 'tank' ? 'bg-green-50 border border-green-200' :
            node.type === 'productType' ? 'bg-purple-50 border border-purple-200' :
            node.type === 'documentType' ? 'bg-yellow-50 border border-yellow-200' :
            node.type === 'item' ? 'bg-gray-50 border border-gray-200' :
            'bg-white border border-gray-200'
          }`}
          style={{ marginLeft: `${level * 20}px` }}
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          {hasChildren && (
            <span className="ml-1">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
          )}
          {!hasChildren && <span className="ml-1 w-4"></span>}
          
          {node.type === 'site' && <FolderOpen className="h-4 w-4 text-blue-600 ml-1" />}
          {node.type === 'tank' && <Warehouse className="h-4 w-4 text-green-600 ml-1" />}
          {node.type === 'productType' && <Package className="h-4 w-4 text-purple-600 ml-1" />}
          {node.type === 'documentType' && <FileText className="h-4 w-4 text-yellow-600 ml-1" />}
          {node.type === 'item' && <FileText className="h-4 w-4 text-gray-600 ml-1" />}
          
          <div className="flex flex-col">
            <span className="text-sm font-medium">{node.name}</span>
            {node.type === 'item' && (
              <div className="flex gap-2 text-xs text-gray-600">
                {node.contractNumber && (
                  <span>قرارداد: {node.contractNumber}</span>
                )}
                {node.receiptNumber && (
                  <span>رسید: {node.receiptNumber}</span>
                )}
                {node.counterpartyName && (
                  <span>طرف حساب: {node.counterpartyName}</span>
                )}
              </div>
            )}
          </div>
          
          <span className={`mr-auto text-sm font-bold ${
            node.type === 'item' ? 
              (node.amount < 0 ? 'text-red-600' : 'text-blue-600') :
              (node.totalAmount < 0 ? 'text-red-600' : 'text-blue-600')
          }`}>
            {node.type === 'item' ? 
              `${node.amount < 0 ? '' : '+'}${formatPersianNumber(node.amount)} کيلوگرم` :
              `${node.totalAmount < 0 ? '' : '+'}${formatPersianNumber(node.totalAmount)} کيلوگرم`
            }
            {node.type === 'documentType' && ` (${node.count} سند)`}
          </span>
        </div>
        
        {isExpanded && hasChildren && (
          <div>
            {Object.values(node.children).map((child: any) => 
              renderTreeNode(child, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">گزارش موجودي کالاها</h3>
      
      {Object.keys(groupedData).length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>داده‌اي براي نمايش وجود ندارد</p>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          {Object.values(groupedData).map((node: any) => renderTreeNode(node))}
        </div>
      )}
    </div>
  );
};

// تابع تولید شماره تراکنش - موقتی برای استفاده در reducer
const generateTempTransactionNumber = (type: string): string => {
  const toPersianDate = (date: Date): string => {
    const persianDate = formatPersianDate(date);
    return persianDate.replace(/\//g, '');
  };
  
  const persianDate = toPersianDate(new Date());
  
  let prefix = '';
  let dataKey = '';
  let startNumber = 1; // شماره شروع برای سریال نامبر
  let data: any[] = [];
  
  // ایجاد instance از DataStorage برای دسترسی به داده‌ها
  const storage = DataStorage.getInstance();
  
  switch (type) {
    case 'consignment':
      // کسر از امانی: EWRE-{date}-100001, 100002, ...
      prefix = 'EWRE';
      dataKey = 'wastageTransactions'; // استفاده از wastage transactions برای کسر از امانی
      startNumber = 100001; // شروع از 100001
      break;
    case 'owned':
      // افزودن به تملیکی: OWRT-{date}-200001, 200002, ...
      prefix = 'OWRT';
      dataKey = 'wastageTransactions'; // استفاده از wastage transactions برای افزودن به تملیکی
      startNumber = 200001; // شروع از 200001
      break;
    case 'consignment_receipt':
      prefix = 'EWRT';
      dataKey = 'warehouse-receipts';
      startNumber = 1;
      break;
    case 'owned_receipt':
      prefix = 'OWRT';
      dataKey = 'warehouse-receipts';
      startNumber = 1;
      break;
    default:
      prefix = 'T';
      dataKey = 'warehouse-receipts';
      startNumber = 1;
  }
  
  // بارگذاری داده‌ها از storage
  data = storage.loadData(dataKey) || [];
  
  // اگر نوع consignment یا owned است، فقط تراکنش‌های مربوط به همان نوع را بررسی کن
  if (type === 'consignment' || type === 'owned') {
    data = data.filter((item: any) => item.transactionType === type);
  }
  
  const existingTransactionNumbers = data
    .map((s: any) => s.transactionNumber)
    .filter((num: string) => num && num.startsWith(prefix) && num.includes(`-${persianDate}-`))
    .map((num: string) => {
      const parts = num.split('-');
      // بخش سوم که شماره 6 رقمی است
      const serialPart = parts[2] || '0';
      return parseInt(serialPart, 10);
    })
    .filter(n => !isNaN(n));
  
  // شماره بعدی: از startNumber شروع می‌شود و به صورت پیوسته افزایش می‌یابد
  let nextNumber = startNumber;
  if (existingTransactionNumbers.length > 0) {
    const maxNumber = Math.max(...existingTransactionNumbers);
    // اطمینان از اینکه شماره بعدی از startNumber کمتر نباشد
    nextNumber = Math.max(maxNumber + 1, startNumber);
  }
  
  let newTransactionNumber: string = '';
  let attempts = 0;
  do {
    newTransactionNumber = `${prefix}-${persianDate}-${nextNumber.toString().padStart(6, '0')}`;
    const exists = data.some((item: any) => item.transactionNumber === newTransactionNumber);
    if (!exists) break;
    nextNumber++; // افزایش 1 برای شماره بعدی
    attempts++;
  } while (attempts < 1000);
  
  return newTransactionNumber;
};

// Reducer براي مديريت تراکنش‌هاي افت - اصلاح شده
const wastageTransactionsReducer = (state: any[], action: any) => {
  switch (action.type) {
    case 'MANAGE_SINGLE_TRANSACTION':
      const { receiptId, transactionData, transactionType } = action.payload;
      console.log(`?? مديريت تراکنش ${transactionType} براي رسيد ${receiptId} با داده‌ها:`, transactionData);
      
      // بررسي اينکه آيا براي اين رسيد قبلاً تراکنش از اين نوع ثبت شده است
      const existingTransaction = state.find(t => 
        t.referenceId === receiptId && t.transactionType === transactionType
      );
      
      if (existingTransaction) {
        console.log(`?? براي رسيد ${receiptId} قبلاً تراکنش ${transactionType} ثبت شده است`);
        return state;
      }
      
      // ايجاد تراکنش جديد فقط در صورت وجود وزن افت
      if (transactionData.gainedWeight && transactionData.gainedWeight > 0) {
        let newTransaction;
        
        if (transactionType === 'consignment') {
          // تراکنش: کسر از کالاي اماني (مقدار منفي)
         newTransaction = {
  id: `consignment_${receiptId}`,
  transactionNumber: generateTempTransactionNumber('consignment'),
  transactionType: 'consignment',
  productId: transactionData.productId,
  productName: transactionData.productName,
  productCode: transactionData.productCode,
  amount: -transactionData.gainedWeight,
  unit: transactionData.unit,
  siteId: transactionData.siteId,
  siteName: transactionData.siteName,
  tankId: transactionData.tankId,
  tankName: transactionData.tankName,
  transactionDate: new Date(),
  referenceId: receiptId,
  referenceType: 'consignment_receipt',
  receiptTransactionNumber: transactionData.transactionNumber, // اين خط اضافه شد
  contractNumber: transactionData.contractNumber,       // اين خط اضافه شد
  counterpartyName: transactionData.counterpartyName,   // اين خط اضافه شد
  description: `افت - اماني سيستمي: ${transactionData.productName}`,
  status: 'completed',
  createdAt: transactionData.createdAt || new Date(),
  updatedAt: new Date()
};
        } else {
          // تراکنش: افزودن به کالای تملیکی (مقدار مثبت)
         newTransaction = {
  id: `owned_${receiptId}`,
  transactionNumber: generateTempTransactionNumber('owned'),
  transactionType: 'owned',
  productId: transactionData.gainedProductCode,
  productName: transactionData.gainedProductName,
  productCode: transactionData.gainedProductCode,
  amount: transactionData.gainedWeight,
  unit: transactionData.unit,
  siteId: transactionData.siteId,
  siteName: transactionData.siteName,
  tankId: transactionData.tankId,
  tankName: transactionData.tankName,
  transactionDate: new Date(),
  referenceId: receiptId,
  referenceType: 'consignment_receipt',
  receiptTransactionNumber: transactionData.transactionNumber, // اين خط اضافه شد
  contractNumber: transactionData.contractNumber,       // اين خط اضافه شد
  counterpartyName: transactionData.counterpartyName,   // اين خط اضافه شد
  description: `افت + اماني سيستمي: ${transactionData.gainedProductName}`,
  status: 'completed',
  createdAt: transactionData.createdAt || new Date(),
  updatedAt: new Date()
};
        }
        
        console.log(`? ايجاد تراکنش ${transactionType} با شناسه ${newTransaction.id} و مقدار ${Math.abs(newTransaction.amount)}`);
        
        // بررسي تعداد کل تراکنش‌ها براي اين رسيد (نبايد بيشتر از 2 باشد)
        const updatedState = [...state, newTransaction];
        const transactionsForReceipt = updatedState.filter(t => t.referenceId === receiptId);
        
        if (transactionsForReceipt.length > 2) {
          console.error(`? خطا: تعداد تراکنش‌هاي ايجاد شده براي رسيد ${receiptId} بيشتر از حد مجاز است (${transactionsForReceipt.length})`);
          // فقط دو تراکنش اول را نگه مي‌داريم
          const validTransactions = transactionsForReceipt.slice(0, 2);
          const otherTransactions = updatedState.filter(t => t.referenceId !== receiptId);
          return [...otherTransactions, ...validTransactions];
        }
        
        return updatedState;
      }
      
      console.log(`?? هيچ تراکنش ${transactionType} براي رسيد ${receiptId} ايجاد نشد (وزن افت: ${transactionData.gainedWeight})`);
      return state;
      
    case 'UPDATE_TRANSACTION':
      const { receiptId: updateReceiptId, transactionData: updateTransactionData, transactionType: updateTransactionType } = action.payload;
      console.log(`?? به‌روزرساني تراکنش ${updateTransactionType} براي رسيد ${updateReceiptId} با داده‌ها:`, updateTransactionData);
      
      // پيدا کردن تراکنش موجود براي اين رسيد و نوع
      const existingTransactionIndex = state.findIndex(t => 
        t.referenceId === updateReceiptId && t.transactionType === updateTransactionType
      );
      
      if (existingTransactionIndex === -1) {
        console.log(`?? تراکنش ${updateTransactionType} براي رسيد ${updateReceiptId} يافت نشد`);
        return state;
      }
      
      // به‌روزرساني تراکنش موجود
      const updatedState = [...state];
      if (updateTransactionType === 'consignment') {
        // به‌روزرساني تراکنش کسر از کالاي اماني
       updatedState[existingTransactionIndex] = {
  ...updatedState[existingTransactionIndex],
  amount: -updateTransactionData.gainedWeight,
  productId: updateTransactionData.productId,
  productName: updateTransactionData.productName,
  productCode: updateTransactionData.productCode,
  receiptTransactionNumber: updateTransactionData.transactionNumber, // اين خط اضافه شد
  contractNumber: updateTransactionData.contractNumber,       // اين خط اضافه شد
  counterpartyName: updateTransactionData.counterpartyName,   // اين خط اضافه شد
  updatedAt: new Date()
};
      } else {
        // به‌روزرسانی تراکنش افزودن به کالای تملیکی
     updatedState[existingTransactionIndex] = {
  ...updatedState[existingTransactionIndex],
  amount: updateTransactionData.gainedWeight,
  productId: updateTransactionData.gainedProductCode,
  productName: updateTransactionData.gainedProductName,
  productCode: updateTransactionData.gainedProductCode,
  receiptTransactionNumber: updateTransactionData.transactionNumber, // اين خط اضافه شد
  contractNumber: updateTransactionData.contractNumber,       // اين خط اضافه شد
  counterpartyName: updateTransactionData.counterpartyName,   // اين خط اضافه شد
  updatedAt: new Date()
};
      }
      
      console.log(`? تراکنش ${updateTransactionType} براي رسيد ${updateReceiptId} به‌روزرساني شد`);
      return updatedState;
      
    case 'REMOVE_BY_RECEIPT':
      return state.filter(t => t.referenceId !== action.payload.receiptId);
      
    case 'SET_TRANSACTIONS':
      // هنگام بارگذاري اوليه، مطمئن شويم که براي هر رسيد حداکثر 2 تراکنش وجود دارد
      const receiptIds = new Set(action.payload.map((t: any) => t.referenceId));
      let cleanedState = [...action.payload];
      
      receiptIds.forEach(id => {
        const receiptTransactions = cleanedState.filter(t => t.referenceId === id);
        if (receiptTransactions.length > 2) {
          console.warn(`?? تعداد تراکنش‌هاي غيرمجاز براي رسيد ${id}: ${receiptTransactions.length}. اصلاح مي‌شود...`);
          const validTransactions = receiptTransactions.slice(0, 2);
          const otherTransactions = cleanedState.filter(t => t.referenceId !== id);
          cleanedState = [...otherTransactions, ...validTransactions];
        }
      });
      
      return cleanedState;
      
    default:
      return state;
  }
};

export const WarehouseReceiptManager: React.FC = () => {
  const storage = DataStorage.getInstance();
  
  // تابع تبدیل تاریخ میلادی به شمسی
  const toPersianDate = (date: Date): string => {
    const persianDate = formatPersianDate(date);
    // حذف اسلش‌ها و تبدیل به فرمت YYYYMMDD
    return persianDate.replace(/\//g, '');
  };

  // تابع تولید شماره تراکنش با پیشوندهای مختلف
  const generateTransactionNumber = (type: string, transactionDate?: Date): string => {
    const date = transactionDate || new Date();
    const persianDate = toPersianDate(date);
    
    // تعیین پیشوند و datasource بر اساس نوع
    let prefix = '';
    let dataKey = '';
    let data: any[] = [];
    
    switch (type) {
      case 'consignment_receipt':
        // رسید امانی: EWRT-{date}-000001, 000002, ...
        prefix = 'EWRT';
        dataKey = 'warehouse-receipts';
        break;
      case 'owned_receipt':
        // رسید تملیکی: OWRT-{date}-000001, 000002, ...
        prefix = 'OWRT';
        dataKey = 'warehouse-receipts';
        break;
      default:
        prefix = 'T';
        dataKey = 'warehouse-receipts';
    }
    
    data = storage.loadData(dataKey) || [];
    
    // فیلتر کردن فقط رسیدهای مربوط به نوع مورد نظر
    if (type === 'consignment_receipt') {
      data = data.filter((r: any) => r.userType === 'consignment');
    } else if (type === 'owned_receipt') {
      data = data.filter((r: any) => r.userType === 'owned');
    }
    
    // شماره‌گذاری پیوسته برای هر تاریخ با کنترل تکرار
    const existingTransactionNumbers = data
      .map((s: any) => s.transactionNumber)
      .filter((num: string) => num && num.startsWith(prefix) && num.includes(`-${persianDate}-`))
      .map((num: string) => {
        const parts = num.split('-');
        // بخش سوم که شماره 6 رقمی است
        const serialPart = parts[2] || '0';
        return parseInt(serialPart, 10);
      })
      .filter(n => !isNaN(n));
    
    // شماره بعدی: از 000001 شروع می‌شود و به صورت پیوسته افزایش می‌یابد (000001, 000002, 000003, ...)
    let nextNumber = 1; // از 1 شروع شود
    if (existingTransactionNumbers.length > 0) {
      const maxNumber = Math.max(...existingTransactionNumbers);
      nextNumber = maxNumber + 1; // افزایش پیوسته
    }
    
    // تولید شماره جدید و اطمینان از عدم تکرار
    let newTransactionNumber: string = '';
    let attempts = 0;
    do {
      newTransactionNumber = `${prefix}-${persianDate}-${nextNumber.toString().padStart(6, '0')}`;
      const exists = data.some((s: any) => s.transactionNumber === newTransactionNumber);
      if (!exists) break;
      nextNumber++; // افزایش 1 برای شماره بعدی
      attempts++;
    } while (attempts < 1000);
    
    return newTransactionNumber;
  };
  
  // useRef براي جلوگيري از فراخواني‌هاي تکراري
  const lastProcessedReceiptRef = useRef<{ receiptId: string; timestamp: number } | null>(null);
  
  // useRef براي نگهداري اطلاعات رسيد فعلي
  const currentReceiptRef = useRef<Partial<WarehouseReceipt> | null>(null);
  
  const [receipts, setReceipts] = useState<WarehouseReceipt[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [baseData, setBaseData] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [editingReceipt, setEditingReceipt] = useState<string | null>(null);
  const [newReceipt, setNewReceipt] = useState<Partial<WarehouseReceipt>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [contractInfo, setContractInfo] = useState<any>(null);
  const [currentUserType, setCurrentUserType] = useState<'owned' | 'consignment' | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: keyof WarehouseReceipt; direction: 'ascending' | 'descending' } | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [baseDataError, setBaseDataError] = useState<string | null>(null);
  const [showUserTypeModal, setShowUserTypeModal] = useState(false);
  const [, setIsReceiptBasisManuallyEdited] = useState(false);
  const [contractRemainderWarning, setContractRemainderWarning] = useState<string | null>(null);
  const [tankCapacityWarning, setTankCapacityWarning] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [receiptExtraInfo, setReceiptExtraInfo] = useState<ReceiptAdditionalInfo>({});
  const [showReceiptExtraInfo, setShowReceiptExtraInfo] = useState<boolean>(false);
  const [receiptExtraInfoErrors, setReceiptExtraInfoErrors] = useState<Record<string, string>>({});
  const [enforceReceiptExtraInfo, setEnforceReceiptExtraInfo] = useState<{ consignment: boolean; owned: boolean }>({ consignment: false, owned: false });
  
  // State جديد براي مديريت هشدارهاي افت
  const [wastageAlertStep, setWastageAlertStep] = useState<number>(0);
  const [showWastageAlerts, setShowWastageAlerts] = useState<boolean>(false);
  
  // State برای تنظیمات افت اتوماتیک
  const [automaticLossEnabled, setAutomaticLossEnabled] = useState<boolean>(true);
  
  // Use reducer for wastage transactions
  const [wastageTransactions, dispatchWastageTransactions] = useReducer(wastageTransactionsReducer, []);
  
  // State for wastage transactions sorting
  const [wastageSortConfig, setWastageSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
  
  // Helper function for safe number conversion
  const safeNumber = (value: any, defaultValue: number = 0): number => {
    if (value === null || value === undefined || value === '') return defaultValue;
    
    if (typeof value === 'number') {
      return isNaN(value) ? defaultValue : value;
    }
    
    const num = parseFloat(value.toString());
    return isNaN(num) ? defaultValue : num;
  };

  // Helper function to get tank capacity
  const getTankCapacity = (tankId: string): number => {
    const tank = baseData.tanks?.find((t: { id: string; capacity?: string }) => t.id === tankId);
    if (!tank?.capacity) return 5000000; // Default 5M kg
    
    const capacityStr = tank.capacity;
    const capacityMatch = capacityStr.match(/[\d,]+/);
    return capacityMatch ? parseInt(capacityMatch[0].replace(/,/g, '')) : 5000000;
  };

  // State for tank inventory calculations
  const [inventoryRefreshKey] = useState(0);
  const [selectedTankForFilter, setSelectedTankForFilter] = useState<string>('');
  const [selectedSiteForFilter, setSelectedSiteForFilter] = useState<string>('');
  const [showInventoryPackage, setShowInventoryPackage] = useState<boolean>(true);
  const [upToDate, setUpToDate] = useState<Date>(new Date());
  const [isReceiptListMinimized, setIsReceiptListMinimized] = useState<boolean>(false);
  const [isWastageTableMinimized, setIsWastageTableMinimized] = useState<boolean>(false);
  const [showExtraInfoInTable, setShowExtraInfoInTable] = useState<boolean>(false);

  // منحصربه‌فرد مخازن و سایت‌ها برای فیلترها
  const uniqueTanks = useMemo(() => {
    const tankMap = new Map();
    const allReceipts = (storage.loadData('receipts') || []) as any[];
    allReceipts.forEach((receipt: any) => {
      if (receipt.tankId && receipt.tankName && !receipt.isVoided) {
        tankMap.set(receipt.tankId, receipt.tankName);
      }
    });
    return Array.from(tankMap.entries());
  }, [storage]);

  const uniqueSites = useMemo(() => {
    const siteMap = new Map();
    const allReceipts = (storage.loadData('receipts') || []) as any[];
    allReceipts.forEach((receipt: any) => {
      if (receipt.siteId && receipt.siteName && !receipt.isVoided) {
        siteMap.set(receipt.siteId, receipt.siteName);
      }
    });
    return Array.from(siteMap.entries());
  }, [storage]);

  // Calculate owned tanks inventory based on user formula
  const calculateOwnedTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    console.log('🧮 محاسبه موجودی مخازن تملیکی:', { siteId, tankId });
    
    // اطمینان از دریافت داده‌های معتبر
    const allReceipts = ((storage.loadData('receipts') || []) as any[]).filter((r: any) => 
      r && typeof r === 'object' && !r.isVoided && new Date(r.receiptDate) <= upToDate
    );
    const allAdjustments = ((storage.loadData('inventoryAdjustments') || []) as any[]).filter((adj: any) => 
      adj && typeof adj === 'object' && !adj.isVoided && new Date(adj.documentDate) <= upToDate
    );
    const allDeliveries = ((storage.loadData('ownership-delivery-slips') || []) as any[]).filter((d: any) => 
      d && typeof d === 'object' && !d.isVoided && new Date(d.deliveryDate) <= upToDate
    );
    
    // فیلتر کردن داده‌ها بر اساس سایت و مخزن انتخاب شده
    const currentSiteId = siteId || selectedSiteForFilter;
    const currentTankId = tankId || selectedTankForFilter;
    
    const siteTankReceipts = allReceipts.filter((r: any) => {
      if (currentSiteId && r.siteId !== currentSiteId) return false;
      if (currentTankId && r.tankId !== currentTankId) return false;
      return r.userType === 'owned' && !r.isVoided && new Date(r.receiptDate) <= upToDate;
    });
    
    const siteTankAdjustments = allAdjustments.filter((adj: any) => {
      if (currentSiteId && adj.siteId !== currentSiteId) return false;
      if (currentTankId && adj.tankId !== currentTankId) return false;
      return adj.productType === 'owned' && !adj.isVoided && new Date(adj.documentDate) <= upToDate;
    });
    
    const siteTankDeliveries = allDeliveries.filter((d: any) => {
      if (currentSiteId && d.siteId !== currentSiteId) return false;
      if (currentTankId && d.tankId !== currentTankId) return false;
      return !d.isVoided && new Date(d.deliveryDate) <= upToDate;
    });

    // فرمول کاربر: جمع(رسید انبارهای تملیکی + سند اضافه انبارهای تملیکی - حواله های تملیکی - افت تملیکی ها - سند کسر انبارهای تملیکی)
    
    // 1. جمع رسید انبارهای تملیکی
    const ownedReceiptsAmount = siteTankReceipts.reduce((sum: number, r: any) => {
      const amount = r.amount || r.receiptBasisAmount || 0;
      return sum + safeNumber(amount, 0);
    }, 0);

    // 2. سند اضافه انبارهای تملیکی
    const ownedAdditionDocuments = siteTankAdjustments
      .filter((adj: any) => adj.adjustmentType === 'addition')
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);

    // 3. حواله های تملیکی
    const ownedDeliveries = siteTankDeliveries
      .filter((d: any) => !d.isVoided && new Date(d.deliveryDate) <= upToDate)
      .reduce((sum: number, d: any) => sum + safeNumber(d.amount, 0), 0);

    // 4. افزودن به تملیکی
    const allWastageTransactions = ((storage.loadData('wastageTransactions') || []) as any[]).filter((t: any) => 
      t && typeof t === 'object' && !t.isVoided && new Date(t.transactionDate) <= upToDate
    );
    const ownedGainedAmount = allWastageTransactions.filter((t: any) => 
      t.transactionType === 'owned' && 
      !t.isVoided &&
      (currentSiteId ? t.siteId === currentSiteId : true) &&
      (currentTankId ? t.tankId === currentTankId : true)
    ).reduce((sum: number, t: any) => {
      const amount = safeNumber(t.amount, 0);
      return sum + Math.abs(amount);
    }, 0);

    // 5. سند کسر انبارهای تملیکی
    const ownedDeductionDocuments = siteTankAdjustments
      .filter((adj: any) => adj.adjustmentType === 'deduction' && !adj.isVoided && new Date(adj.documentDate) <= upToDate)
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);

    // 6. تبدیل‌های کالا: کالای مصرفی (کسر) و کالای تولیدی (اضافه)
    const allConversions = ((storage.loadData('productConversions') || []) as any[]).filter((c: any) => 
      c && typeof c === 'object' && !c.isVoided && new Date(c.documentDate) <= upToDate
    );
    const siteTankConversions = allConversions.filter((c: any) => {
      if (currentSiteId && c.siteId !== currentSiteId) return false;
      if (currentTankId && c.tankId !== currentTankId) return false;
      return true;
    });
    
    // کالای مصرفی تملیکی (کسر از موجودی)
    const ownedConsumedProducts = siteTankConversions
      .filter((c: any) => c.consumedProductType === 'owned')
      .reduce((sum: number, c: any) => sum + safeNumber(c.consumedQuantity, 0), 0);
    
    // کالای تولیدی تملیکی (اضافه به موجودی)
    const ownedProducedProducts = siteTankConversions
      .filter((c: any) => c.producedProductType === 'owned')
      .reduce((sum: number, c: any) => sum + safeNumber(c.producedQuantity, 0), 0);

    // محاسبه نهایی: فیلدهای تملیکی + فیلدهای امانی
    const totalOwnedValue = ownedReceiptsAmount + ownedAdditionDocuments + ownedGainedAmount + ownedProducedProducts - ownedDeliveries - ownedDeductionDocuments - ownedConsumedProducts;

    return {
      ownedReceiptsAmount,
      ownedAdditionDocuments,
      ownedDeliveries,
      ownedGainedAmount,
      ownedDeductionDocuments,
      ownedConsumedProducts,
      ownedProducedProducts,
      finalInventory: totalOwnedValue
    };
  }, [upToDate, selectedSiteForFilter, selectedTankForFilter]);

  // Calculate consignment tanks inventory
  const calculateConsignmentTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    console.log('🧮 محاسبه موجودی مخازن امانی:', { siteId, tankId, refreshKey: inventoryRefreshKey });
    
    // اطمینان از خواندن آخرین داده‌ها از تمام منابع
    const allReceipts = ((storage.loadData('receipts') || []) as any[]).filter((r: any) => 
      r && typeof r === 'object' && !r.isVoided && new Date(r.receiptDate) <= upToDate
    );
    const allAdjustments = ((storage.loadData('inventoryAdjustments') || []) as any[]).filter((adj: any) => 
      adj && typeof adj === 'object' && !adj.isVoided && new Date(adj.documentDate) <= upToDate
    );
    
    // منابع مختلف حواله‌های امانی
    const consignmentSlips = ((storage.loadData('consignment-delivery-slips') || []) as any[]).filter((d: any) => {
      if (!d || typeof d !== 'object' || d.isVoided) return false;
      const dateValue = d.deliveryDate || d.slipDate;
      if (!dateValue || dateValue === undefined || dateValue === null) {
        return true;
      }
      const deliveryDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
      if (isNaN(deliveryDate.getTime())) {
        return true;
      }
      return deliveryDate <= upToDate;
    }) as any[];

    // منابع اضافی - حواله‌های عمومی که ممکن است امانی باشند
    const generalDeliveries = ((storage.loadData('deliveries') || []) as any[]).filter((d: any) => {
      if (!d || typeof d !== 'object' || d.isVoided) return false;
      const dateValue = d.deliveryDate || d.createdAt;
      if (!dateValue) return false;
      const deliveryDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
      if (isNaN(deliveryDate.getTime())) return false;
      return deliveryDate <= upToDate;
    }) as any[];

    const currentSiteId = siteId || selectedSiteForFilter;
    const currentTankId = tankId || selectedTankForFilter;
    
    const consignmentReceipts = allReceipts.filter((r: any) => 
      r && typeof r === 'object' &&
      r.userType === 'consignment' && 
      !r.isVoided &&
      (currentSiteId ? r.siteId === currentSiteId : true) &&
      (currentTankId ? r.tankId === currentTankId : true)
    );
    
    const consignmentAdditions = allAdjustments
      .filter((adj: any) => 
        adj.adjustmentType === 'addition' && 
        adj.productType === 'consignment' &&
        (currentSiteId ? adj.siteId === currentSiteId : true) &&
        (currentTankId ? adj.tankId === currentTankId : true) &&
        !adj.isVoided && new Date(adj.documentDate) <= upToDate
      )
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);
    
    // تشخیص پیشرفته حواله‌های امانی
    const consignmentDeliveries = [
      ...consignmentSlips,
      ...generalDeliveries.filter((d: any) => {
        const hasConsignmentFeatures = 
          d.contractNumber || 
          d.permitId || 
          d.userType === 'consignment' ||
          d.type === 'امانی' ||
          d.nature === 'consignment';
        
        return hasConsignmentFeatures;
      })
    ]
    .filter((d: any) => {
      if (!d || typeof d !== 'object' || d.isVoided) return false;
      
      return (!currentSiteId || d.siteId === currentSiteId) &&
             (!currentTankId || d.tankId === currentTankId);
    })
    .reduce((sum: number, d: any) => sum + safeNumber(d.amount, 0), 0);

    const allWastageTransactions = ((storage.loadData('wastageTransactions') || []) as any[]).filter((t: any) => 
      t && typeof t === 'object' && !t.isVoided && new Date(t.transactionDate) <= upToDate
    );
    
    const consignmentDeductionAmount = allWastageTransactions
      .filter((t: any) => 
        t.transactionType === 'consignment' && 
        !t.isVoided && 
        new Date(t.transactionDate) <= upToDate &&
        (currentSiteId ? t.siteId === currentSiteId : true) &&
        (currentTankId ? t.tankId === currentTankId : true)
      )
      .reduce((sum: number, t: any) => sum + Math.abs(safeNumber(t.amount, 0)), 0);
    
    const consignmentDeductionDocuments = allAdjustments
      .filter((adj: any) => 
        adj && typeof adj === 'object' &&
        adj.adjustmentType === 'deduction' && 
        adj.productType === 'consignment' &&
        (currentSiteId ? adj.siteId === currentSiteId : true) &&
        (currentTankId ? adj.tankId === currentTankId : true) &&
        !adj.isVoided && new Date(adj.documentDate) <= upToDate
      )
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);
    
    const consignmentReceiptsAmount = consignmentReceipts
      .filter((r: any) => !r.isVoided && new Date(r.receiptDate) <= upToDate)
      .reduce((sum: number, r: any) => {
        let baseAmount = 0;
        if (r.receiptBasisAmount && r.receiptBasisAmount > 0) {
          baseAmount = r.receiptBasisAmount;
        } else if (r.finalAmount && r.finalAmount > 0) {
          baseAmount = r.finalAmount;
        } else if (r.amount && r.amount > 0) {
          baseAmount = r.amount;
        } else {
          baseAmount = (safeNumber(r.shipUnloadingAmount, 0) + 
                       safeNumber(r.tankShoreAmount, 0) + 
                       safeNumber(r.shipBillOfLadingAmount, 0) + 
                       safeNumber(r.weightGross, 0));
        }
        return sum + baseAmount;
    }, 0);

    // تبدیل‌های کالا: کالای مصرفی (کسر) و کالای تولیدی (اضافه)
    const allConversions = ((storage.loadData('productConversions') || []) as any[]).filter((c: any) => 
      c && typeof c === 'object' && !c.isVoided && new Date(c.documentDate) <= upToDate
    );
    const siteTankConversions = allConversions.filter((c: any) => {
      if (currentSiteId && c.siteId !== currentSiteId) return false;
      if (currentTankId && c.tankId !== currentTankId) return false;
      return true;
    });
    
    // کالای مصرفی امانی (کسر از موجودی)
    const consignmentConsumedProducts = siteTankConversions
      .filter((c: any) => c.consumedProductType === 'consignment')
      .reduce((sum: number, c: any) => sum + safeNumber(c.consumedQuantity, 0), 0);
    
    // کالای تولیدی امانی (اضافه به موجودی)
    const consignmentProducedProducts = siteTankConversions
      .filter((c: any) => c.producedProductType === 'consignment')
      .reduce((sum: number, c: any) => sum + safeNumber(c.producedQuantity, 0), 0);

    const totalConsignmentValue = consignmentReceiptsAmount + consignmentAdditions + consignmentProducedProducts - consignmentDeliveries - consignmentDeductionAmount - consignmentDeductionDocuments - consignmentConsumedProducts;

    return {
      consignmentReceiptsAmount,
      consignmentAdditions,
      consignmentDeliveries,
      consignmentDeductionAmount,
      consignmentDeductionDocuments,
      consignmentConsumedProducts,
      consignmentProducedProducts,
      finalInventory: totalConsignmentValue
    };
  }, [upToDate, selectedSiteForFilter, selectedTankForFilter, inventoryRefreshKey, storage]);

  // Calculate consignment+owned tanks inventory
  const calculateConsignmentOwnedTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    console.log('🧮 محاسبه موجودی مخازن امانی/تملیکی:', { siteId, tankId });
    
    const owned = calculateOwnedTanksInventory(siteId, tankId);
    const consignment = calculateConsignmentTanksInventory(siteId, tankId);
    
    const result = {
      ownedReceiptsAmount: owned.ownedReceiptsAmount,
      ownedAdditionDocuments: owned.ownedAdditionDocuments,
      ownedDeliveries: owned.ownedDeliveries,
      ownedGainedAmount: owned.ownedGainedAmount,
      ownedDeductionDocuments: owned.ownedDeductionDocuments,
      ownedConsumedProducts: owned.ownedConsumedProducts || 0,
      ownedProducedProducts: owned.ownedProducedProducts || 0,
      consignmentReceiptsAmount: consignment.consignmentReceiptsAmount,
      consignmentAdditions: consignment.consignmentAdditions,
      consignmentDeliveries: consignment.consignmentDeliveries,
      consignmentDeductionAmount: consignment.consignmentDeductionAmount,
      consignmentDeductionDocuments: consignment.consignmentDeductionDocuments,
      consignmentConsumedProducts: consignment.consignmentConsumedProducts || 0,
      consignmentProducedProducts: consignment.consignmentProducedProducts || 0,
      finalInventory: owned.finalInventory + consignment.finalInventory
    };
    
    console.log('📊 نتایج محاسبه موجودی امانی/تملیکی:', {
      ownedDeliveries: owned.ownedDeliveries,
      consignmentDeliveries: consignment.consignmentDeliveries,
      totalDeliveries: owned.ownedDeliveries + consignment.consignmentDeliveries,
      finalInventory: result.finalInventory
    });

    return result;
  }, [calculateOwnedTanksInventory, calculateConsignmentTanksInventory]);

  // Calculate total tank capacity
  const calculateTotalTankCapacity = useCallback((siteId?: string, tankId?: string) => {
    const tanks = baseData.tanks || [];
    let totalCapacity = 0;
    // فقط از فیلترهای جداول موجودی استفاده می‌کنیم، نه از form.siteId و form.tankId
    const currentSiteId = siteId || selectedSiteForFilter;
    const currentTankId = tankId || selectedTankForFilter;
    
    tanks.forEach((tank: any) => {
      // اگر فیلتر مخزن داریم، فقط همان مخزن
      if (currentTankId && tank.id !== currentTankId) return;
      
      // اگر فیلتر سایت داریم و سایت روی مخزن تعریف شده، باید هم‌خوان باشد
      if (currentSiteId && tank.siteId && tank.siteId !== currentSiteId) return;
      
      // اگر سایت فیلتر شده اما siteId مخزن خالی است، آن را رد نکن تا ظرفیت صفر نشود
      const capacityStr = tank.capacity || "5,000,000 کیلوگرم";
      const capacityMatch = capacityStr.match(/[\d,]+/);
      const capacity = capacityMatch ? parseInt(capacityMatch[0].replace(/,/g, ''), 10) : 5000000;
      totalCapacity += capacity;
    });
    return totalCapacity;
  }, [baseData.tanks, selectedSiteForFilter, selectedTankForFilter]);

  // Calculate total receipts for a tank (without considering product type)
  const calculateTotalReceipts = (siteId: string, tankId: string, excludeId?: string): number => {
    return receipts
      .filter(r => 
        r.siteId === siteId && 
        r.tankId === tankId &&
        r.id !== excludeId &&
        (r.status === 'saved' || r.status === 'finalized' || r.status === 'printed')
      )
      .reduce((sum, r) => sum + (r.receiptBasisAmount || 0), 0);
  };
  
  // Calculate total receipts for a tank by product type
  const calculateTotalReceiptsByProduct = (siteId: string, tankId: string, productId?: string, excludeId?: string): number => {
    return receipts
      .filter(r => 
        r.siteId === siteId && 
        r.tankId === tankId &&
        r.id !== excludeId &&
        (productId ? r.productId === productId : true) &&
        (r.status === 'saved' || r.status === 'finalized' || r.status === 'printed')
      )
      .reduce((sum, r) => sum + (r.receiptBasisAmount || 0), 0);
  };
  
  // Calculate total owned receipts for a tank
  const calculateTotalOwnedReceipts = (siteId: string, tankId: string, excludeId?: string): number => {
    return receipts
      .filter(r => 
        r.userType === 'owned' && 
        r.siteId === siteId && 
        r.tankId === tankId &&
        r.id !== excludeId &&
        (r.status === 'saved' || r.status === 'finalized' || r.status === 'printed')
      )
      .reduce((sum, r) => sum + (r.receiptBasisAmount || 0), 0);
  };
  
  // Calculate total consignment receipts for a tank
  const calculateTotalConsignmentReceipts = (siteId: string, tankId: string, excludeId?: string): number => {
    return receipts
      .filter(r => 
        r.userType === 'consignment' && 
        r.siteId === siteId && 
        r.tankId === tankId &&
        r.id !== excludeId &&
        (r.status === 'saved' || r.status === 'finalized' || r.status === 'printed')
      )
      .reduce((sum, r) => sum + (r.receiptBasisAmount || 0), 0);
  };
  
  // Calculate total owned deliveries for a tank (without considering product type)
  const calculateTotalOwnedDeliveries = (siteId: string, tankId: string): number => {
    return deliveries
      .filter(d => 
        d.siteId === siteId && 
        d.tankId === tankId &&
        (d.status === 'saved' || d.status === 'finalized' || d.status === 'printed')
      )
      .reduce((sum, d) => sum + (d.amount || 0), 0);
  };
  
  // Calculate total owned deliveries for a tank by product type
  const calculateTotalOwnedDeliveriesByProduct = (siteId: string, tankId: string, productId?: string): number => {
    return deliveries
      .filter(d => 
        d.siteId === siteId && 
        d.tankId === tankId &&
        (productId ? d.productId === productId : true) &&
        (d.status === 'saved' || d.status === 'finalized' || d.status === 'printed')
      )
      .reduce((sum, d) => sum + (d.amount || 0), 0);
  };
  
  // Calculate remaining tank capacity
  const calculateRemainingCapacity = (siteId: string, tankId: string, excludeId?: string): number => {
    const capacity = getTankCapacity(tankId);
    const totalConsignmentReceipts = calculateTotalConsignmentReceipts(siteId, tankId, excludeId);
    const totalOwnedReceipts = calculateTotalOwnedReceipts(siteId, tankId, excludeId);
    const totalDeliveries = calculateTotalOwnedDeliveries(siteId, tankId);
    
    return capacity - (totalConsignmentReceipts + totalOwnedReceipts - totalDeliveries);
  };
  
  // Calculate remaining tank capacity by product type
  const calculateRemainingCapacityByProduct = (siteId: string, tankId: string, productId?: string, excludeId?: string): number => {
    const capacity = getTankCapacity(tankId);
    const totalReceipts = calculateTotalReceiptsByProduct(siteId, tankId, productId, excludeId);
    const totalDeliveries = calculateTotalOwnedDeliveriesByProduct(siteId, tankId, productId);
    
    return capacity - (totalReceipts - totalDeliveries);
  };
  
  
  // Calculate contract receipt weight (only saved/finalized receipts)
  const calculateContractReceiptWeight = (contractId: string, excludeId?: string): number => {
    return receipts
      .filter(r => 
        r.contractId === contractId && 
        r.id !== excludeId &&
        (r.status === 'saved' || r.status === 'finalized' || r.status === 'printed')
      )
      .reduce((sum, r) => sum + (r.receiptBasisAmount || 0), 0);
  };
  
  // Calculate contract remainder (only saved/finalized receipts) - اصلاح شده
  const calculateContractRemainder = (contractId: string, contractWeight?: number, excludeId?: string): number => {
    if (!contractId) return 0;
    
    // محاسبه مجموع رسیدهای انبار مربوط به قرارداد
    const totalReceipts = receipts
      .filter(r => 
        r.contractId === contractId && 
        r.id !== excludeId &&
        (r.status === 'saved' || r.status === 'finalized' || r.status === 'printed')
      )
      .reduce((sum, r) => sum + (r.receiptBasisAmount || 0), 0);
    
    // محاسبه مجموع سندهای اضافه انبار مربوط به قرارداد
    const totalWarehouseAdd = deliveries
      .filter(d => 
        d.contractId === contractId && 
        (d.status === 'saved' || d.status === 'finalized' || d.status === 'printed') && 
        d.transactionType !== 'subtract'
      )
      .reduce((sum, d) => sum + (d.amount || 0), 0);
    
    // محاسبه مجموع حواله‌های مربوط به قرارداد
    const totalDeliveries = deliveries
      .filter(d => 
        d.contractId === contractId && 
        (d.status === 'saved' || d.status === 'finalized' || d.status === 'printed')
      )
      .reduce((sum, d) => sum + (d.amount || 0), 0);
    
    // محاسبه مجموع سندهای کسر انبار مربوط به قرارداد
    const totalWarehouseSubtract = deliveries
      .filter(d => 
        d.contractId === contractId && 
        (d.status === 'saved' || d.status === 'finalized' || d.status === 'printed') && 
        d.transactionType === 'subtract'
      )
      .reduce((sum, d) => sum + (d.amount || 0), 0);
    
    // محاسبه وزن مانده قرارداد
    const remainingWeight = (contractWeight || 0) - (totalReceipts + totalWarehouseAdd - totalDeliveries - totalWarehouseSubtract);
    
    return remainingWeight;
  };
  
  // Calculate contract remaining weight (including all factors: receipts, warehouse adds, deliveries, warehouse subtracts)
  const calculateContractRemainingWeight = (contractId: string): number => {
    if (!contractId) return 0;
    
    // محاسبه مجموع رسیدهای انبار مربوط به قرارداد
    const totalReceipts = receipts
      .filter((r: WarehouseReceipt) => r.contractId === contractId && (r.status === 'saved' || r.status === 'finalized' || r.status === 'printed'))
      .reduce((sum: number, r: WarehouseReceipt) => sum + (r.receiptBasisAmount || 0), 0);
    
    // محاسبه مجموع سندهای اضافه انبار مربوط به قرارداد
    const totalWarehouseAdd = deliveries
      .filter((d: any) => d.contractId === contractId && (d.status === 'saved' || d.status === 'finalized' || d.status === 'printed') && d.transactionType !== 'subtract')
      .reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
    
    // محاسبه مجموع حواله‌های مربوط به قرارداد
    const totalDeliveries = deliveries
      .filter((d: any) => d.contractId === contractId && (d.status === 'saved' || d.status === 'finalized' || d.status === 'printed'))
      .reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
    
    // محاسبه مجموع سندهای کسر انبار مربوط به قرارداد
    const totalWarehouseSubtract = deliveries
      .filter((d: any) => d.contractId === contractId && (d.status === 'saved' || d.status === 'finalized' || d.status === 'printed') && d.transactionType === 'subtract')
      .reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
    
    // محاسبه وزن مانده قرارداد
    const contract = contracts.find((c: any) => c.id === contractId);
    const contractWeight = contract ? contract.contractWeight || 0 : 0;
    
    return contractWeight - (totalReceipts + totalWarehouseAdd - totalDeliveries - totalWarehouseSubtract);
  };
  
  // Calculate receipt basis amount based on selected basis - اصلاح شده
  const calculateReceiptBasisAmount = (receipt: Partial<WarehouseReceipt>): number => {
    if (!receipt.receiptBasis) return 0;
    
    switch (receipt.receiptBasis) {
      case 'bill-lading':
        return receipt.shipBillOfLadingAmount || 0;
      case 'ullage':
        return receipt.shipUnloadingAmount || 0;
      case 'shore-tank':
        return receipt.tankShoreAmount || 0;
      case 'gross':
        return receipt.weightGross || 0;
      default:
        return 0;
    }
  };
  
  // Load base data function
  const loadBaseData = useCallback(async (_forceRefresh = false) => {
    setBaseDataError(null);
    console.log("?? شروع بارگذاري اطلاعات پايه...");
    
    try {
      const loadDataWithFallback = (key: string, fallbackData: any[] = []) => {
        try {
          const categories = (storage.loadData('baseDataCategories') || []) as any[];
          const category = categories.find((c: any) => c.id === key.replace('category_', ''));
          const data = category?.items || [];
          
          if (data.length > 0) {
            console.log(`? ${key} از کش بارگذاري شد:`, data.length, "مورد");
            return data;
          } else {
            console.log(`?? ${key} در کش خالي است، استفاده از داده‌هاي پيش‌فرض`);
            return fallbackData;
          }
        } catch (error) {
          console.error(`? خطا در بارگذاري ${key}:`, error);
          console.log(`?? استفاده از داده‌هاي پيش‌فرض براي ${key}`);
          return fallbackData;
        }
      };
      
      const companies = loadDataWithFallback('companies');
      const customerCompanies = loadDataWithFallback('customer-companies');
      const locations = loadDataWithFallback('locations');
      const ownedProducts = loadDataWithFallback('owned-products');
      const consignmentProducts = loadDataWithFallback('consignment-products');
      const sites = loadDataWithFallback('sites');
      const tanks = loadDataWithFallback('tanks');
      const shipNames = loadDataWithFallback('ship-names');
      const cotageNumbers = loadDataWithFallback('cotage-numbers');
      const indexNumbers = loadDataWithFallback('index-numbers');
      const drivers = loadDataWithFallback('drivers');
      const receiptBasis = loadDataWithFallback('receipt-basis', receiptBasisOptions);
      const internalCompany = loadDataWithFallback('internal-company');
      const wastageRates = loadDataWithFallback('wastage-rates');
      
      const loadedBaseData = {
        companies,
        customerCompanies,
        counterparties: companies,
        customerCounterparties: customerCompanies,
        counterpartyLocations: locations,
        customerCounterpartyLocations: locations,
        ownedProducts,
        consignmentProducts,
        sites,
        tanks,
        locations,
        drivers,
        receiptBasis,
        shipNames,
        cotageNumbers,
        indexNumbers,
        internalCompany,
        wastageRates
      };
      
      console.log("? اطلاعات پايه بارگذاري شد:", loadedBaseData);
      setBaseData(loadedBaseData);
      setDataLoaded(true);
      setLastUpdate(Date.now());
      setBaseDataError(null);
    } catch (error) {
      console.error("? خطا در بارگذاري اطلاعات پايه:", error);
      setBaseDataError("خطا در بارگذاري اطلاعات پايه. لطفاً صفحه را رفرش کنيد.");
      setBaseData({
        companies: [],
        customerCompanies: [],
        counterparties: [],
        customerCounterparties: [],
        counterpartyLocations: [],
        customerCounterpartyLocations: [],
        ownedProducts: [],
        consignmentProducts: [],
        sites: [],
        tanks: [],
        locations: [],
        drivers: [],
        receiptBasis: receiptBasisOptions,
        shipNames: [],
        cotageNumbers: [],
        indexNumbers: [],
        internalCompany: [],
        wastageRates: []
      });
    }
  }, [storage]);
  
  // Load contracts function
  const loadContracts = useCallback(() => {
    console.log("?? شروع بارگذاري قراردادها...");
    try {
      const savedContracts = (storage.loadData('contracts') || []) as any[];
      console.log("? قراردادها بارگذاري شدند:", savedContracts.length, "مورد");
      setContracts(savedContracts);
    } catch (error) {
      console.error("? خطا در بارگذاري قراردادها:", error);
      setContracts([]);
    }
  }, [storage]);
  
  // Load deliveries function
  const loadDeliveries = useCallback(() => {
    console.log("?? شروع بارگذاري حواله‌ها...");
    try {
      const savedDeliveries = (storage.loadData('deliveries') || []) as any[];
      console.log("? حواله‌ها بارگذاري شدند:", savedDeliveries.length, "مورد");
      setDeliveries(savedDeliveries);
    } catch (error) {
      console.error("? خطا در بارگذاري حواله‌ها:", error);
      setDeliveries([]);
    }
  }, [storage]);
  
  // Force refresh base data function
  const forceRefreshBaseData = useCallback(async () => {
    console.log("?? شروع به‌روزرساني اجباري اطلاعات پايه...");
    try {
      await loadBaseData(true);
      loadContracts();
      loadDeliveries();
      alert("? اطلاعات پايه با موفقيت به‌روزرساني شد");
    } catch (error) {
      console.error("? خطا در به‌روزرساني اطلاعات پايه:", error);
      alert("? خطا در به‌روزرساني اطلاعات پايه");
    }
  }, [loadBaseData, loadContracts, loadDeliveries]);
  
  useEffect(() => {
    console.log("?? بارگذاري اوليه داده‌ها...");
    loadContracts();
    loadDeliveries();
    loadBaseData();
    
    const savedReceipts = (storage.loadData('receipts') || []) as any[];
    if (savedReceipts.length > 0) {
      const receiptsWithDates = savedReceipts.map((receipt: any) => {
        try {
          const receiptDate = receipt.receiptDate ? new Date(receipt.receiptDate) : new Date();
          const dueDate = receipt.dueDate ? new Date(receipt.dueDate) : undefined;
          const createdAt = receipt.createdAt ? new Date(receipt.createdAt) : new Date();
          const updatedAt = receipt.updatedAt ? new Date(receipt.updatedAt) : new Date();
          
          return {
            ...receipt,
            receiptDate: isValidDate(receiptDate) ? receiptDate : new Date(),
            dueDate: dueDate && isValidDate(dueDate) ? dueDate : undefined,
            createdAt: isValidDate(createdAt) ? createdAt : new Date(),
            updatedAt: isValidDate(updatedAt) ? updatedAt : new Date()
          };
        } catch (error) {
          console.error("Error parsing receipt dates:", error);
          return {
            ...receipt,
            receiptDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
      });
      setReceipts(receiptsWithDates);
    }
    
    // Load wastage transactions
    const savedWastageTransactions = storage.loadData('wastageTransactions') || [];
    dispatchWastageTransactions({ type: 'SET_TRANSACTIONS', payload: savedWastageTransactions });
    
    // Load settings for automatic loss
    const savedSettings = (storage.loadData('settings') || {}) as any;
    const automaticLoss = savedSettings.performance?.automaticLoss !== undefined 
      ? savedSettings.performance.automaticLoss 
      : (savedSettings.userManagement?.automaticLoss !== undefined 
          ? savedSettings.userManagement.automaticLoss 
          : true); // Default to true if not set
    setAutomaticLossEnabled(automaticLoss);

    const perfSettings = savedSettings.performance || {};
    setEnforceReceiptExtraInfo({
      consignment: perfSettings.enforceReceiptExtraInfo?.consignment || false,
      owned: perfSettings.enforceReceiptExtraInfo?.owned || false
    });
  }, [loadBaseData, loadContracts, loadDeliveries]);
  
  useEffect(() => {
    if (receipts.length > 0) {
      storage.saveData('receipts', receipts);
    }
  }, [receipts, storage]);
  
  // useEffect براي ذخيره‌سازي تراکنش‌ها با Debounce و کنترل بيشتر
  // همگام‌سازی وزن (مبنا) با مقدار مبناي رسيد و تاریخ بارنامه با تاریخ رسید
  useEffect(() => {
    // همیشه وزن (مبنا) را با مقدار مبناي رسيد همگام‌سازی کن - حتی اگر showReceiptExtraInfo false باشد
    if (newReceipt.receiptBasisAmount !== undefined && newReceipt.receiptBasisAmount !== null) {
      setReceiptExtraInfo(prev => ({
        ...prev,
        weight: newReceipt.receiptBasisAmount || 0
      }));
    }
    if (showReceiptExtraInfo && newReceipt.receiptDate && isValidDate(newReceipt.receiptDate)) {
      setReceiptExtraInfo(prev => ({
        ...prev,
        billDate: prev.billDate || newReceipt.receiptDate
      }));
    }
  }, [newReceipt.receiptBasisAmount, newReceipt.receiptDate, showReceiptExtraInfo]);

  useEffect(() => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    setSaveTimeout(setTimeout(() => {
      if (wastageTransactions.length > 0) {
        console.log('?? ذخيره‌سازي تراکنش‌هاي افت در حافظه محلي');
        
        // کنترل نهايي قبل از ذخيره‌سازي
        const receiptIds = new Set(wastageTransactions.map(t => t.referenceId));
        let cleanedTransactions = [...wastageTransactions];
        
        receiptIds.forEach(id => {
          const receiptTransactions = cleanedTransactions.filter(t => t.referenceId === id);
          if (receiptTransactions.length > 2) {
            console.warn(`?? تعداد تراکنش‌هاي غيرمجاز براي رسيد ${id}: ${receiptTransactions.length}. اصلاح مي‌شود...`);
            const validTransactions = receiptTransactions.slice(0, 2);
            const otherTransactions = cleanedTransactions.filter(t => t.referenceId !== id);
            cleanedTransactions = [...otherTransactions, ...validTransactions];
          }
        });
        
        storage.saveData('wastageTransactions', cleanedTransactions);
        
        // Update main transactions
        const allTransactions = (storage.loadData('transactions') || []) as any[];
        const updatedTransactions = [...allTransactions];
        
        cleanedTransactions.forEach((wt: any) => {
          const existingIndex = updatedTransactions.findIndex(t => t.id === wt.id);
          if (existingIndex === -1) {
            updatedTransactions.push(wt);
          } else {
            updatedTransactions[existingIndex] = wt;
          }
        });
        
        storage.saveData('transactions', updatedTransactions);
      }
    }, 500));
    
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [wastageTransactions, storage]);
  
  // Auto-update every 10 seconds when editing
  useEffect(() => {
    const interval = setInterval(() => {
      if (isAddingNew || editingReceipt) {
        console.log("?? به‌روزرساني خودکار اطلاعات پايه...");
        loadBaseData(false).catch(error => {
          console.error("? خطا در به‌روزرساني خودکار:", error);
        });
        loadContracts();
        loadDeliveries();
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [isAddingNew, editingReceipt, loadBaseData, loadContracts, loadDeliveries]);
  
  // Listen to base data update events
  useEffect(() => {
    const handleBaseDataUpdate = (event: CustomEvent) => {
      console.log("?? دريافت رويداد به‌روزرساني اطلاعات پايه:", event.detail);
      
      loadBaseData(true).then(() => {
        console.log("? loadBaseData با موفقيت انجام شد");
      }).catch(error => {
        console.error("? خطا در پردازش رويداد به‌روزرساني:", error);
      });
    };
    
    window.addEventListener('baseDataUpdated', handleBaseDataUpdate as EventListener);
    
    return () => {
      window.removeEventListener('baseDataUpdated', handleBaseDataUpdate as EventListener);
    };
  }, [loadBaseData]);
  
  // Listen to contracts update events
  useEffect(() => {
    const handleContractsUpdate = (event: CustomEvent) => {
      console.log("?? دريافت رويداد به‌روزرساني قراردادها:", event.detail);
      
      loadContracts();
    };
    
    window.addEventListener('contractsUpdated', handleContractsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('contractsUpdated', handleContractsUpdate as EventListener);
    };
  }, [loadContracts]);
  
  // Main useEffect for calculating receipt basis amount - اصلاح شده
  useEffect(() => {
    console.log("?? useEffect براي محاسبه مقدار مبناي رسيد اجرا شد");
    
    // برای هر دو نوع رسید (تملیکی و امانی)، مقدار مبنای رسید فقط به صورت سیستمی محاسبه شود
    if (!newReceipt.receiptBasis) {
      console.log("?? مبناي رسيد تنظيم نشده است");
      return;
    }
    
    const receiptBasisAmount = calculateReceiptBasisAmount(newReceipt);
    
    console.log(`? به‌روزرساني مقدار مبناي رسيد: ${receiptBasisAmount} (مبناي: ${newReceipt.receiptBasis})`);
    
    setNewReceipt(prev => {
      const updatedReceipt = {
        ...prev,
        receiptBasisAmount
      };
      
      // همزمان با به‌روزرسانی receiptBasisAmount، وزن (مبنا) را نیز به‌روزرسانی کن
      setReceiptExtraInfo(prevExtra => ({
        ...prevExtra,
        weight: receiptBasisAmount || 0
      }));
      
      calculateAmounts(updatedReceipt);
      return updatedReceipt;
    });
  }, [
    newReceipt.receiptBasis,
    newReceipt.shipBillOfLadingAmount,
    newReceipt.shipUnloadingAmount,
    newReceipt.tankShoreAmount,
    newReceipt.weightGross
  ]);
  
  // useEffect for checking if receipt basis amount exceeds remaining contract weight
  useEffect(() => {
    if (currentUserType === 'consignment' && newReceipt.contractId && newReceipt.receiptBasisAmount) {
      const remainingWeight = calculateContractRemainingWeight(newReceipt.contractId);
      
      if (newReceipt.receiptBasisAmount > remainingWeight) {
        setContractRemainderWarning(
          `مقدار مبنای رسید (${formatPersianNumber(newReceipt.receiptBasisAmount)} ${newReceipt.unit}) از وزن مانده قرارداد (${formatPersianNumber(remainingWeight)} ${newReceipt.unit}) بیشتر است.`
        );
      } else {
        setContractRemainderWarning(null);
      }
    }
  }, [newReceipt.receiptBasisAmount, newReceipt.contractId, currentUserType]);
  
  const filteredReceipts = receipts.filter(receipt => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    return (
      receipt.transactionNumber.toLowerCase().includes(searchLower) ||
      receipt.productName.toLowerCase().includes(searchLower) ||
      (receipt.counterpartyName && receipt.counterpartyName.toLowerCase().includes(searchLower)) ||
      (receipt.customerCounterpartyName && receipt.customerCounterpartyName.toLowerCase().includes(searchLower)) ||
      (receipt.counterpartyLocationName && receipt.counterpartyLocationName.toLowerCase().includes(searchLower)) ||
      (receipt.customerCounterpartyLocationName && receipt.customerCounterpartyLocationName.toLowerCase().includes(searchLower)) ||
      (receipt.contractNumber && receipt.contractNumber.toLowerCase().includes(searchLower)) ||
      (receipt.shipName && receipt.shipName.toLowerCase().includes(searchLower)) ||
      (receipt.cotageNumber && receipt.cotageNumber.toLowerCase().includes(searchLower)) ||
      (receipt.indexNumber && receipt.indexNumber.toLowerCase().includes(searchLower)) ||
      (receipt.driverName && receipt.driverName.toLowerCase().includes(searchLower)) ||
      (receipt.internalCompanyName && receipt.internalCompanyName.toLowerCase().includes(searchLower)) ||
      receipt.siteName.toLowerCase().includes(searchLower) ||
      receipt.tankName.toLowerCase().includes(searchLower) ||
      (receipt.receiptBasis && receipt.receiptBasis.toLowerCase().includes(searchLower)) ||
      receipt.notes.toLowerCase().includes(searchLower) ||
      receipt.status.toLowerCase().includes(searchLower) ||
      receipt.userType.toLowerCase().includes(searchLower)
    );
  });
  
  const sortedReceipts = React.useMemo(() => {
    const sortableReceipts = [...filteredReceipts];
    if (sortConfig !== null) {
      sortableReceipts.sort((a: WarehouseReceipt, b: WarehouseReceipt) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal === undefined || bVal === undefined) return 0;
        if (aVal < bVal) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableReceipts;
  }, [filteredReceipts, sortConfig]);
  
  const requestSort = (key: keyof WarehouseReceipt) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortDirectionIcon = (key: keyof WarehouseReceipt) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ChevronDown className="h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'ascending' 
      ? <ChevronUp className="h-4 w-4 text-blue-600" /> 
      : <ChevronDown className="h-4 w-4 text-blue-600" />;
  };
  
  // Wastage transactions sorting functions
  const requestWastageSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (wastageSortConfig && wastageSortConfig.key === key && wastageSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setWastageSortConfig({ key, direction });
  };
  
  const getWastageSortDirectionIcon = (key: string) => {
    if (!wastageSortConfig || wastageSortConfig.key !== key) {
      return <ChevronDown className="h-4 w-4 text-gray-400" />;
    }
    return wastageSortConfig.direction === 'ascending' 
      ? <ChevronUp className="h-4 w-4 text-blue-600" /> 
      : <ChevronDown className="h-4 w-4 text-blue-600" />;
  };
  
  // Sort wastage transactions
  const sortedWastageTransactions = useMemo(() => {
    if (!wastageSortConfig) return wastageTransactions;
    
    return [...wastageTransactions].sort((a: any, b: any) => {
      const aValue = a[wastageSortConfig.key];
      const bValue = b[wastageSortConfig.key];
      
      if (aValue < bValue) {
        return wastageSortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return wastageSortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }, [wastageTransactions, wastageSortConfig]);
  
  const handleStartNewReceipt = (userType: 'owned' | 'consignment') => {
    console.log(`?? شروع ثبت رسید جدید: ${userType === 'owned' ? 'تملیکی' : 'امانی'}`);
    
    setCurrentUserType(userType);
    setIsAddingNew(true);
    setShowUserTypeModal(false);
    setIsReceiptBasisManuallyEdited(false);
    setContractRemainderWarning(null);
    setTankCapacityWarning(null);
    
    loadBaseData(false).catch(error => {
      console.error("? خطا در بارگذاري اطلاعات پايه:", error);
    });
    loadContracts();
    loadDeliveries();
    
    const currentDate = new Date();
    
    const newReceiptData: Partial<WarehouseReceipt> = {
      userType,
      unit: 'kg',
      receiptDate: currentDate,
      status: 'draft',
      shipUnloadingAmount: 0,
      shipBillOfLadingAmount: 0,
      tankShoreAmount: 0,
      weightGross: 0,
      finalAmount: 0,
      notes: '',
      wastagePercentage: 0.5,
      deliveryType: 'first_party',
      receiptBasis: 'bill-lading',
      receiptBasisAmount: 0
    };
    
    if (userType === 'consignment') {
      try {
        const dueDate = calculateDueDate(currentDate);
        if (isValidDate(dueDate)) {
          newReceiptData.dueDate = dueDate;
        } else {
          const defaultDate = new Date();
          defaultDate.setMonth(defaultDate.getMonth() + 1);
          newReceiptData.dueDate = defaultDate;
        }
      } catch (error) {
        console.error("Error calculating due date:", error);
        const defaultDate = new Date();
        defaultDate.setMonth(defaultDate.getMonth() + 1);
        newReceiptData.dueDate = defaultDate;
      }
    }
    
    console.log("? داده‌هاي اوليه رسيد:", newReceiptData);
    setNewReceipt(newReceiptData);
    setReceiptExtraInfo(createDefaultReceiptExtraInfo(newReceiptData));
    setShowReceiptExtraInfo(false);
    setReceiptExtraInfoErrors({});
  };
  
  const calculateAmounts = (receipt: Partial<WarehouseReceipt>) => {
    console.log("?? تابع calculateAmounts با مقادير زير فراخواني شد:", receipt);
    
    const finalReceiptBasisAmount = receipt.receiptBasisAmount || 0;
    
    console.log(`? مقدار مبناي رسيد محاسبه شده: ${finalReceiptBasisAmount} (مبناي: ${receipt.receiptBasis})`);
    
    const updatedReceipt = {
      ...receipt,
      receiptBasisAmount: finalReceiptBasisAmount
    };
    
    if (receipt.userType === 'consignment') {
      const wastagePercentage = receipt.wastagePercentage || 0;
      const wastageWeight = -(finalReceiptBasisAmount * (wastagePercentage / 100));
      const gainedWeight = Math.abs(wastageWeight);
      const consignmentRemainder = finalReceiptBasisAmount + wastageWeight;
      const inventoryRemainder = finalReceiptBasisAmount + wastageWeight + gainedWeight;
      
      // Calculate contract receipt weight (only saved/finalized receipts)
      const contractReceiptWeight = calculateContractReceiptWeight(receipt.contractId || '', receipt.id);
      const totalContractReceiptWeight = contractReceiptWeight + finalReceiptBasisAmount;
      
      // Calculate contract remainder - اصلاح شده
      const contractWeight = receipt.contractWeight || 0;
      const contractRemainder = calculateContractRemainder(receipt.contractId || '', contractWeight, receipt.id);
      
      // Check contract limit
      if (finalReceiptBasisAmount > contractRemainder) {
        const warningMessage = `مقدار مبناي رسيد (${formatPersianNumber(finalReceiptBasisAmount)} ${receipt.unit}) از وزن مانده قرارداد (${formatPersianNumber(contractRemainder)} ${receipt.unit}) بيشتر است. لطفا مقدار را اصلاح کنيد.`;
        console.warn(warningMessage);
        setContractRemainderWarning(warningMessage);
      } else {
        setContractRemainderWarning(null);
      }
      
      updatedReceipt.wastageWeight = wastageWeight;
      updatedReceipt.gainedWeight = gainedWeight;
      updatedReceipt.consignmentRemainder = consignmentRemainder;
      updatedReceipt.inventoryRemainder = inventoryRemainder;
      updatedReceipt.contractReceiptWeight = totalContractReceiptWeight;
      updatedReceipt.contractRemainder = contractRemainder - finalReceiptBasisAmount;
      updatedReceipt.finalAmount = consignmentRemainder;
      
    } else if (receipt.userType === 'owned') {
      // Check tank capacity for owned receipts
      if (receipt.siteId && receipt.tankId) {
        const remainingCapacity = calculateRemainingCapacity(receipt.siteId, receipt.tankId, receipt.id);
        
        if (finalReceiptBasisAmount > remainingCapacity) {
          const warningMessage = `مقدار رسيد (${formatPersianNumber(finalReceiptBasisAmount)} ${receipt.unit}) از ظرفيت مانده مخزن (${formatPersianNumber(remainingCapacity)} ${receipt.unit}) بيشتر است.`;
          console.warn(warningMessage);
          setTankCapacityWarning(warningMessage);
        } else {
          setTankCapacityWarning(null);
        }
      }
      
      updatedReceipt.finalAmount = finalReceiptBasisAmount;
    }
    
    setNewReceipt(prev => ({
      ...prev,
      ...updatedReceipt
    }));
    
    console.log("? مقادير پس از محاسبه در calculateAmounts:", updatedReceipt);
  };

  const createDefaultReceiptExtraInfo = (receipt?: Partial<WarehouseReceipt>): ReceiptAdditionalInfo => {
    return {
      driverFirstName: '',
      driverLastName: '',
      driverNationalId: '',
      billOfLadingNumber: '',
      plateNumber: '',
      weight: receipt?.receiptBasisAmount || 0,
      billAmount: undefined,
      origin: '',
      billDate: receipt?.receiptDate || new Date(),
      transportCompany: '',
      driverMobile: '',
      originAddress: receipt?.siteName && receipt?.tankName ? `${receipt.siteName} - ${receipt.tankName}` : '',
      backBillAmount: undefined,
      originPostalCode: ''
    };
  };
  
  // Handle contract selection and auto-fill receipt basis and wastage rate
  const handleContractChange = (contractId: string) => {
    const selectedContract = contracts.find((c: any) => c.id === contractId);
    
    if (selectedContract) {
      setContractInfo(selectedContract);
      
      // Get wastage rate from contract
      let wastagePercentage = 0.5; // Default
      if (selectedContract.wastageRateId) {
        const wastageRate = (baseData.wastageRates as any[])?.find((wr: any) => wr.id === selectedContract.wastageRateId);
        if (wastageRate) {
          const percentageMatch = wastageRate.name.match(/[\d.]+/);
          wastagePercentage = percentageMatch ? parseFloat(percentageMatch[0]) : 0.5;
        }
      }
      
      // Auto-fill receipt basis, wastage rate, and rental information from contract
      setNewReceipt(prev => ({
        ...prev,
        contractId,
        contractNumber: selectedContract.contractNumber,
        rentalTypeId: selectedContract.rentalTypeId,
        rentalTypeName: selectedContract.rentalTypeName,
        rentalRate: selectedContract.rentalRate,
        receiptBasis: selectedContract.receiptBasisId || 'bill-lading',
        wastagePercentage,
        siteId: selectedContract.siteId || '',
        siteName: selectedContract.siteName || '',
        tankId: selectedContract.tankId || '',
        tankName: selectedContract.tankName || '',
        contractWeight: selectedContract.contractWeight || 0
      }));
      
      // به‌روزرسانی پیش‌فرض‌های اطلاعات تکمیلی بر اساس قرارداد
      setReceiptExtraInfo(prev => ({
        ...prev,
        originAddress: selectedContract.siteName && selectedContract.tankName 
          ? `${selectedContract.siteName} - ${selectedContract.tankName}` 
          : prev.originAddress
      }));
      
      // Calculate receipt basis amount based on selected basis
      setTimeout(() => {
        const receiptBasisAmount = calculateReceiptBasisAmount({
          ...newReceipt,
          receiptBasis: selectedContract.receiptBasisId || 'bill-lading'
        });
        
        setNewReceipt(prev => ({
          ...prev,
          receiptBasisAmount
        }));
        
        calculateAmounts({ 
          ...newReceipt, 
          contractId,
          receiptBasis: (selectedContract.receiptBasisId || 'bill-lading') as string,
          receiptBasisAmount,
          wastagePercentage
        });
      }, 100);
    } else {
      setContractInfo(null);
      setNewReceipt(prev => ({
        ...prev,
        contractId: '',
        contractNumber: '',
        receiptBasis: 'bill-lading',
        wastagePercentage: 0.5,
        siteId: '',
        siteName: '',
        tankId: '',
        tankName: '',
        contractWeight: 0
      }));
      setReceiptExtraInfo(prev => ({
        ...prev,
        originAddress: prev.originAddress // بدون تغییر خاص
      }));
    }
  };
  
  // اعتبارسنجی تاریخ تراکنش امانی با بازه قرارداد
  const validateConsignmentTransactionDate = (contractId: string, transactionDate: Date): boolean => {
    if (!contractId) return true;
    
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return true;
    
    const startDate = new Date(contract.startDate);
    const endDate = new Date(contract.endDate);
    
    return transactionDate >= startDate && transactionDate <= endDate;
  };
  
  // تابع handleSave با کنترل فراخواني‌هاي تکراري
  const handleSave = async () => {
    // Prevent multiple clicks
    if (isSaving) return;
    
    // Check permissions
    try {
      const { canCreate } = await import('../../utils/permissionHelpers');
      const moduleId = newReceipt.userType === 'consignment' ? 'consignment_receipt' : 'ownership_receipt';
      if (!canCreate(moduleId)) {
        alert('شما دسترسی ایجاد در این بخش را ندارید. لطفاً با مدیر سیستم تماس بگیرید.');
        return;
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
    
    setIsSaving(true);
    
    try {
      console.log("?? شروع ذخيره‌سازي رسيد...");
      
      loadBaseData(false).catch(error => {
        console.error("? خطا در بارگذاري اطلاعات پايه:", error);
      });
      loadContracts();
      loadDeliveries();
      
      // بررسی تاریخ تراکنش امانی
      if (newReceipt.userType === 'consignment' && newReceipt.contractId) {
        const transactionDate = newReceipt.receiptDate || new Date();
        if (!validateConsignmentTransactionDate(newReceipt.contractId, transactionDate)) {
          alert('خطا: تاریخ تراکنش خارج از بازه زمانی قرارداد است');
          setIsSaving(false);
          return;
        }
      }
      
      // الزامی بودن شماره قرارداد برای تراکنش‌های امانی
      if (newReceipt.userType === 'consignment' && !newReceipt.contractId) {
        alert('برای تراکنش‌های امانی انتخاب قرارداد الزامی است');
        setIsSaving(false);
        return;
      }
      
      // Check contract remainder limit for consignment
      if (currentUserType === 'consignment' && contractRemainderWarning) {
        alert(contractRemainderWarning);
        setIsSaving(false);
        return;
      }
      
      // Check tank capacity limit for both consignment and owned
      if (newReceipt.siteId && newReceipt.tankId) {
        const remainingCapacity = calculateRemainingCapacity(newReceipt.siteId || '', newReceipt.tankId || '', editingReceipt || undefined);
        
        if (newReceipt.receiptBasisAmount && newReceipt.receiptBasisAmount > remainingCapacity) {
          const warningMessage = `مقدار رسيد (${formatPersianNumber(newReceipt.receiptBasisAmount)} ${newReceipt.unit}) از ظرفيت مانده مخزن (${formatPersianNumber(remainingCapacity)} ${newReceipt.unit}) بيشتر است.`;
          alert(warningMessage);
          setIsSaving(false);
          return;
        }
      }
      
      const validationErrors = validateReceipt(newReceipt);
      setErrors(validationErrors);
      if (Object.keys(validationErrors).length > 0) {
        setIsSaving(false);
        return;
      }

    // اعتبارسنجی اطلاعات تکمیلی در صورت اجبار
    const mustFillExtra = (currentUserType === 'consignment' && enforceReceiptExtraInfo.consignment) 
      || (currentUserType === 'owned' && enforceReceiptExtraInfo.owned);
    if (mustFillExtra || showReceiptExtraInfo) {
      const requiredFields: (keyof ReceiptAdditionalInfo)[] = [
        'driverFirstName', 'driverLastName', 'driverNationalId', 'billOfLadingNumber',
        'plateNumber', 'weight', 'billAmount', 'origin', 'billDate', 'transportCompany',
        'driverMobile', 'originAddress', 'backBillAmount', 'originPostalCode'
      ];
      const extraErrors: Record<string, string> = {};
      requiredFields.forEach(f => {
        const val = (receiptExtraInfo as any)[f];
        if (val === undefined || val === null || val === '') {
          extraErrors[f] = 'الزامی';
        }
      });
      setReceiptExtraInfoErrors(extraErrors);
      if (mustFillExtra && Object.keys(extraErrors).length > 0) {
        alert('لطفاً اطلاعات تکمیلی رسید را کامل کنید');
        setIsSaving(false);
        return;
      }
    }
      
      // بررسي تکميل بودن "مقدار مبناي رسيد"
      if (!newReceipt.receiptBasisAmount || newReceipt.receiptBasisAmount <= 0) {
        setErrors({
          ...validationErrors,
          receiptBasisAmount: 'مقدار مبناي رسيد بايد تکميل و بزرگتر از صفر باشد'
        });
        setIsSaving(false);
        return;
      }
      
      calculateAmounts(newReceipt);
      
      const selectedProduct = (currentUserType === 'consignment' ? baseData.consignmentProducts : baseData.ownedProducts)?.find((p: any) => p.id === newReceipt.productId);
      const selectedSite = baseData.sites?.find((s: any) => s.id === newReceipt.siteId);
      const selectedTank = baseData.tanks?.find((t: any) => t.id === newReceipt.tankId);
      const selectedCompany = baseData.companies?.find((c: any) => c.id === newReceipt.counterpartyId);
      const selectedContract = contracts.find((c: any) => c.id === newReceipt.contractId);
      const selectedReceiptBasis = baseData.receiptBasis?.find((b: any) => b.id === newReceipt.receiptBasis);
      
      let gainedProductCode = '';
      let gainedProductName = '';
      let productCode = '';
      
      if (currentUserType === 'consignment' && selectedProduct) {
        const consignmentCode = selectedProduct.code || '';
        const codeParts = consignmentCode.split('-');
        gainedProductCode = codeParts[0] || '';
        productCode = consignmentCode;
        
        const ownedProduct = baseData.ownedProducts?.find((p: any) => p.code === gainedProductCode);
        gainedProductName = ownedProduct?.name || '';
        
        if (!gainedProductName) {
          const consignmentName = selectedProduct.name || '';
          gainedProductName = consignmentName.replace('-اماني', '-تملکي');
        }
      }
      
      setReceipts(prev => {
        const updatedReceipts = [...prev];
        let receiptId: string;
        let transactionNumber: string = '';
        
        if (editingReceipt) {
          receiptId = editingReceipt;
          const index = updatedReceipts.findIndex(receipt => receipt.id === editingReceipt);
          if (index !== -1) {
            const existingReceipt = updatedReceipts[index];
            transactionNumber = existingReceipt.transactionNumber;
            updatedReceipts[index] = {
              ...existingReceipt,
              ...newReceipt,
            additionalInfo: receiptExtraInfo,
              productName: selectedProduct?.name || existingReceipt.productName,
              productCode: productCode || existingReceipt.productCode,
              siteName: selectedSite?.name || existingReceipt.siteName,
              tankName: selectedTank?.name || existingReceipt.tankName,
              tankCapacity: getTankCapacity(newReceipt.tankId || ''),
              companyName: selectedCompany?.name || existingReceipt.companyName,
              contractNumber: selectedContract?.contractNumber || existingReceipt.contractNumber,
              contractWeight: selectedContract?.contractWeight || existingReceipt.contractWeight,
              receiptBasis: selectedReceiptBasis?.name || existingReceipt.receiptBasis,
              gainedProductCode: gainedProductCode,
              gainedProductName: gainedProductName,
              updatedAt: new Date()
            } as WarehouseReceipt;
          }
        } else if (isAddingNew) {
          receiptId = `receipt_${Date.now()}`;
          transactionNumber = currentUserType === 'consignment' 
            ? generateTransactionNumber('consignment_receipt') 
            : generateTransactionNumber('owned_receipt');
          
          const newReceiptObj: WarehouseReceipt = {
            ...newReceipt,
            id: receiptId,
            transactionNumber, // اصلاح: تعريف transactionNumber
            additionalInfo: receiptExtraInfo,
            productName: selectedProduct?.name || '',
            productCode: productCode || '',
            siteName: selectedSite?.name || '',
            tankName: selectedTank?.name || '',
            tankCapacity: getTankCapacity(newReceipt.tankId || ''),
            companyName: selectedCompany?.name,
            contractNumber: selectedContract?.contractNumber || '',
            contractWeight: selectedContract?.contractWeight,
            receiptBasis: selectedReceiptBasis?.name || '',
            gainedProductCode: gainedProductCode,
            gainedProductName: gainedProductName,
            createdAt: new Date(),
            updatedAt: new Date()
          } as WarehouseReceipt;
          
          updatedReceipts.push(newReceiptObj);
        } else {
          setIsSaving(false);
          return updatedReceipts;
        }
        
        // کنترل فراخواني‌هاي تکراري با useRef
        const now = Date.now();
        if (lastProcessedReceiptRef.current && 
            lastProcessedReceiptRef.current.receiptId === receiptId &&
            now - lastProcessedReceiptRef.current.timestamp < 1000) {
          console.warn(`?? فراخواني تکراري براي رسيد ${receiptId} ناديده گرفته شد`);
          setIsSaving(false);
          return updatedReceipts;
        }
        
        lastProcessedReceiptRef.current = { receiptId, timestamp: now };
        
        // براي رسيدهاي اماني با وزن افت، هشدارها را نمايش مي‌دهيم (فقط در صورت فعال بودن افت اتوماتیک)
        if (currentUserType === 'consignment' && newReceipt.gainedWeight && newReceipt.gainedWeight > 0 && automaticLossEnabled) {
          console.log(`?? نمايش هشدارهاي افت براي رسيد ${receiptId}`);
          
          // بررسي اينکه آيا براي اين رسيد قبلاً تراکنش افت ثبت شده است
          const existingTransactions = wastageTransactions.filter(t => t.referenceId === receiptId);
          if (existingTransactions.length === 0) {
            // ذخيره اطلاعات رسيد فعلي در ref
            currentReceiptRef.current = {
  ...newReceipt,
  id: receiptId,
  transactionNumber: transactionNumber || newReceipt.transactionNumber,
  productName: selectedProduct?.name || '',
  productCode: productCode || '',
  siteName: selectedSite?.name || '',
  tankName: selectedTank?.name || '',
  companyName: selectedCompany?.name,
  counterpartyName: selectedCompany?.name, // اين خط اضافه شد
  contractNumber: selectedContract?.contractNumber || '',
  gainedProductCode: gainedProductCode,
  gainedProductName: gainedProductName,
  createdAt: new Date()
};
            
            setShowWastageAlerts(true);
            setWastageAlertStep(1);
          } else {
            console.log(`?? براي رسيد ${receiptId} قبلاً تراکنش افت ثبت شده است`);
            
            // به‌روزرساني تراکنش‌هاي موجود
            existingTransactions.forEach(transaction => {
              if (transaction.transactionType === 'consignment') {
                dispatchWastageTransactions({
                  type: 'UPDATE_TRANSACTION',
                  payload: {
                    receiptId,
                    transactionData: {
                      ...newReceipt,
                      gainedWeight: newReceipt.gainedWeight
                    },
                    transactionType: 'consignment'
                  }
                });
              } else if (transaction.transactionType === 'owned') {
                dispatchWastageTransactions({
                  type: 'UPDATE_TRANSACTION',
                  payload: {
                    receiptId,
                    transactionData: {
                      ...newReceipt,
                      gainedWeight: newReceipt.gainedWeight
                    },
                    transactionType: 'owned'
                  }
                });
              }
            });
          }
        }
        
        return updatedReceipts;
      });
      
      setEditingReceipt(null);
      setIsAddingNew(false);
      setNewReceipt({});
      setErrors({});
      setIsReceiptBasisManuallyEdited(false);
      setContractRemainderWarning(null);
      setTankCapacityWarning(null);
      
      console.log("? رسيد با موفقيت ذخيره شد");
    } catch (error) {
      console.error("? خطا در ذخيره‌سازي رسيد:", error);
      alert("خطا در ذخيره‌سازي رسيد. لطفاً دوباره تلاش کنيد.");
    } finally {
      setIsSaving(false);
    }
  };
  
  // تابع براي مديريت کليک روي هشدارهاي افت
  const handleWastageAlertClick = (step: number) => {
    const receiptData = currentReceiptRef.current;
    if (!receiptData) {
      console.error("? اطلاعات رسيد در دسترس نيست");
      return;
    }
    
    if (step === 1) {
      // مرحله اول: کسر از کالاي اماني
      console.log("?? مرحله اول هشدار: کسر از کالاي اماني");
      
      // ايجاد تراکنش منفي براي کالاي اماني
      if (receiptData.gainedWeight && receiptData.gainedWeight > 0) {
dispatchWastageTransactions({
  type: 'MANAGE_SINGLE_TRANSACTION',
  payload: {
    receiptId: receiptData.id || `temp_${Date.now()}`,
    transactionData: {
      productId: receiptData.productId,
      productName: receiptData.productName,
      productCode: receiptData.productCode,
      gainedProductCode: receiptData.gainedProductCode,
      gainedProductName: receiptData.gainedProductName,
      unit: receiptData.unit,
      siteId: receiptData.siteId,
      siteName: receiptData.siteName,
      tankId: receiptData.tankId,
      tankName: receiptData.tankName,
      gainedWeight: receiptData.gainedWeight,
      transactionNumber: receiptData.transactionNumber, // اين خط اضافه شد
      contractNumber: receiptData.contractNumber,       // اين خط اضافه شد
      counterpartyName: receiptData.counterpartyName,   // اين خط اضافه شد
      createdAt: new Date()
    },
    transactionType: 'consignment'
  }
});
        
        // نمايش پيام موفقيت
        alert("? تراکنش کسر از کالاي اماني با موفقيت ثبت شد.");
      }
      
      setWastageAlertStep(2);
    } else if (step === 2) {
      // مرحله دوم: افزودن به کالای تملیکی
      console.log("?? مرحله دوم هشدار: افزودن به کالای تملیکی");
      
      // ایجاد تراکنش مثبت برای کالای تملیکی
      if (receiptData.gainedWeight && receiptData.gainedWeight > 0) {
        dispatchWastageTransactions({
  type: 'MANAGE_SINGLE_TRANSACTION',
  payload: {
    receiptId: receiptData.id || `temp_${Date.now()}`,
    transactionData: {
      productId: receiptData.gainedProductCode,
      productName: receiptData.gainedProductName,
      productCode: receiptData.gainedProductCode,
      gainedProductCode: receiptData.gainedProductCode,
      gainedProductName: receiptData.gainedProductName,
      unit: receiptData.unit,
      siteId: receiptData.siteId,
      siteName: receiptData.siteName,
      tankId: receiptData.tankId,
      tankName: receiptData.tankName,
      gainedWeight: receiptData.gainedWeight,
      transactionNumber: receiptData.transactionNumber, // اين خط اضافه شد
      contractNumber: receiptData.contractNumber,       // اين خط اضافه شد
      counterpartyName: receiptData.counterpartyName,   // اين خط اضافه شد
      createdAt: new Date()
    },
    transactionType: 'owned'
  }
});
        
        // نمايش پيام موفقيت
        alert("? تراکنش افزودن به کالای تملیکی با موفقیت ثبت شد.");
      }
      
      setShowWastageAlerts(false);
      setWastageAlertStep(0);
      currentReceiptRef.current = null; // پاک کردن ref پس از اتمام
    }
  };
  
  const handleCancel = () => {
    setEditingReceipt(null);
    setIsAddingNew(false);
    setNewReceipt({});
    setErrors({});
    setIsReceiptBasisManuallyEdited(false);
    setContractRemainderWarning(null);
    setTankCapacityWarning(null);
    setShowWastageAlerts(false);
    setWastageAlertStep(0);
    currentReceiptRef.current = null;
  };
  
  // اصلاح تابع handleEdit براي اطمينان از اجراي صحيح تمام محاسبات و قواعد
  const handleEdit = (receiptId: string) => {
    const receipt = receipts.find(r => r.id === receiptId);

    // محدودیت ویرایش برای رسیدهای نهایی شده و چاپ شده
    if (receipt && (receipt.status === 'finalized' || receipt.status === 'printed')) {
      alert('رسیدهای نهایی شده و چاپ شده قابل ویرایش نیستند. برای اصلاح، از گزینه "درخواست اصلاحیه" استفاده کنید.');
      return;
    }

    setEditingReceipt(receiptId);
    setIsReceiptBasisManuallyEdited(false);
    setContractRemainderWarning(null);
    setTankCapacityWarning(null);
    loadBaseData(false).catch(error => {
      console.error("? خطا در بارگذاري اطلاعات پايه:", error);
    });
    loadContracts();
    loadDeliveries();
    if (receipt) {
      const receiptCopy = JSON.parse(JSON.stringify(receipt));
      if (receiptCopy.receiptDate) {
        receiptCopy.receiptDate = new Date(receiptCopy.receiptDate);
      }
      if (receiptCopy.dueDate) {
        receiptCopy.dueDate = new Date(receiptCopy.dueDate);
      }
      if (receiptCopy.createdAt) {
        receiptCopy.createdAt = new Date(receiptCopy.createdAt);
      }
      if (receiptCopy.updatedAt) {
        receiptCopy.updatedAt = new Date(receiptCopy.updatedAt);
      }
      
      // اطمينان از تنظيم صحيح receiptBasis و receiptBasisAmount
      if (!receiptCopy.receiptBasis) {
        receiptCopy.receiptBasis = 'bill-lading'; // مقدار پيش‌فرض
      }
      
      if (!receiptCopy.receiptBasisAmount) {
        receiptCopy.receiptBasisAmount = calculateReceiptBasisAmount(receiptCopy);
      }
      
      setNewReceipt(receiptCopy);
      setReceiptExtraInfo(receiptCopy.additionalInfo || createDefaultReceiptExtraInfo(receiptCopy));
      setShowReceiptExtraInfo(!!receiptCopy.additionalInfo);
      setReceiptExtraInfoErrors({});
      setCurrentUserType(receipt.userType);
      
      // اگر رسيد اماني است، اطلاعات قرارداد را نيز بارگذاري کن
      if (receipt.userType === 'consignment' && receipt.contractId) {
        const selectedContract = contracts.find(c => c.id === receipt.contractId);
        if (selectedContract) {
          setContractInfo(selectedContract);
          
          // Get wastage rate from contract
          let wastagePercentage = 0.5; // Default
          if (selectedContract.wastageRateId) {
            const wastageRate = baseData.wastageRates?.find((wr: any) => wr.id === selectedContract.wastageRateId);
            if (wastageRate) {
              const percentageMatch = wastageRate.name.match(/[\d.]+/);
              wastagePercentage = percentageMatch ? parseFloat(percentageMatch[0]) : 0.5;
            }
          }
          
          // اصلاح: بارگذاري صحيح اطلاعات مبناي رسيد و اجاره از قرارداد
          const updatedReceipt = {
            ...receiptCopy,
            rentalTypeId: selectedContract.rentalTypeId,
            rentalTypeName: selectedContract.rentalTypeName,
            rentalRate: selectedContract.rentalRate,
            receiptBasis: selectedContract.receiptBasisId || 'bill-lading',
            wastagePercentage
          };
          
          // Calculate receipt basis amount based on selected basis
          const receiptBasisAmount = calculateReceiptBasisAmount(updatedReceipt);
          updatedReceipt.receiptBasisAmount = receiptBasisAmount;
          
          setNewReceipt(prev => ({
            ...prev,
            ...updatedReceipt
          }));
          
          // محاسبه تمام مقادير با داده‌هاي به‌روز شده
          calculateAmounts(updatedReceipt);
        }
      }
      
      // برای رسیدهای تملیکی نیز اطلاعات قرارداد را بارگذاری کن
      if (receipt.userType === 'owned' && receipt.contractId) {
        const selectedContract = contracts.find(c => c.id === receipt.contractId);
        if (selectedContract) {
          setContractInfo(selectedContract);
          
          // اصلاح: بارگذاري صحيح اطلاعات مبناي رسيد و اجاره از قرارداد
          const updatedReceipt = {
            ...receiptCopy,
            rentalTypeId: selectedContract.rentalTypeId,
            rentalTypeName: selectedContract.rentalTypeName,
            rentalRate: selectedContract.rentalRate,
            receiptBasis: selectedContract.receiptBasisId || 'bill-lading'
          };
          
          // Calculate receipt basis amount based on selected basis
          const receiptBasisAmount = calculateReceiptBasisAmount(updatedReceipt);
          updatedReceipt.receiptBasisAmount = receiptBasisAmount;
          
          setNewReceipt(prev => ({
            ...prev,
            ...updatedReceipt
          }));
          
          // محاسبه تمام مقادير با داده‌هاي به‌روز شده
          calculateAmounts(updatedReceipt);
        }
      }
      
      // محاسبه مجدد تمام مقادير محاسباتي با تأخير براي اطمينان از بارگذاري کامل داده‌ها
      setTimeout(() => {
        // اگر رسيد اماني است، بررسي محدوديت‌هاي قرارداد و مخزن
        if (receipt.userType === 'consignment') {
          const contractRemainder = calculateContractRemainder(
            receipt.contractId || '', 
            receipt.contractWeight || 0, 
            receipt.id
          );
          
          if (newReceipt.receiptBasisAmount && newReceipt.receiptBasisAmount > contractRemainder) {
            const warningMessage = `مقدار مبناي رسيد (${formatPersianNumber(newReceipt.receiptBasisAmount)} ${receipt.unit}) از وزن مانده قرارداد (${formatPersianNumber(contractRemainder)} ${receipt.unit}) بيشتر است.`;
            setContractRemainderWarning(warningMessage);
          }
        } else if (receipt.userType === 'owned' && receipt.siteId && receipt.tankId) {
          const remainingCapacity = calculateRemainingCapacity(receipt.siteId, receipt.tankId, receipt.id);
          
          if (newReceipt.receiptBasisAmount && newReceipt.receiptBasisAmount > remainingCapacity) {
            const warningMessage = `مقدار رسيد (${formatPersianNumber(newReceipt.receiptBasisAmount)} ${receipt.unit}) از ظرفيت مانده مخزن (${formatPersianNumber(remainingCapacity)} ${receipt.unit}) بيشتر است.`;
            setTankCapacityWarning(warningMessage);
          }
        }
      }, 300);
    }
    setErrors({});
  };
  
  const handleDelete = (receiptId: string) => {
    if (confirm('آيا از حذف اين رسيد اطمينان داريد؟')) {
      setReceipts(prev => prev.filter(receipt => receipt.id !== receiptId));
      
      // Remove related wastage transactions
      dispatchWastageTransactions({ type: 'REMOVE_BY_RECEIPT', payload: { receiptId } });
    }
  };
  
  const handleStatusChange = (receiptId: string, newStatus: WarehouseReceipt['status']) => {
    setReceipts(prev => prev.map(receipt =>
      receipt.id === receiptId
        ? { ...receipt, status: newStatus, updatedAt: new Date() }
        : receipt
    ));
  };
  
  const handleBackToPreviousStage = (receiptId: string) => {
    const receipt = receipts.find(r => r.id === receiptId);
    if (!receipt) return;
    let previousStatus: WarehouseReceipt['status'] = 'draft';
    
    switch (receipt.status) {
      case 'saved':
        previousStatus = 'draft';
        break;
      case 'finalized':
        previousStatus = 'saved';
        break;
      case 'printed':
        previousStatus = 'finalized';
        break;
    }
    handleStatusChange(receiptId, previousStatus);
  };
  
  const validateReceipt = (receipt: Partial<WarehouseReceipt>): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!receipt.productId) {
      errors.productId = 'انتخاب کالا الزامي است';
    }
    if (!receipt.siteId) {
      errors.siteId = 'انتخاب سايت الزامي است';
    }
    if (!receipt.tankId) {
      errors.tankId = 'انتخاب مخزن الزامي است';
    }
    
    if (!receipt.receiptBasis) {
      errors.receiptBasis = 'انتخاب مبناي رسيد الزامي است';
    }
    
    if (!receipt.receiptDate || !isValidDate(receipt.receiptDate)) {
      errors.receiptDate = 'تاريخ رسيد نامعتبر است';
    }
    
    if (receipt.userType === 'consignment') {
      if (!receipt.counterpartyId) {
        errors.counterpartyId = 'انتخاب طرف حساب الزامي است';
      }
      if (receipt.deliveryType === 'second_party' && !receipt.customerCounterpartyId) {
        errors.customerCounterpartyId = 'انتخاب مشتري طرف حساب الزامي است';
      }
      if (!receipt.counterpartyLocationId) {
        errors.counterpartyLocationId = 'انتخاب لوکيشن طرف حساب الزامي است';
      }
      if (receipt.deliveryType === 'second_party' && !receipt.customerCounterpartyLocationId) {
        errors.customerCounterpartyLocationId = 'انتخاب لوکيشن مشتري طرف حساب الزامي است';
      }
      if (!receipt.contractId) {
        errors.contractId = 'انتخاب قرارداد طرف حساب الزامي است';
      }
      
      if (!receipt.dueDate || !isValidDate(receipt.dueDate)) {
        errors.dueDate = 'تاريخ سررسيد نامعتبر است';
      }
    }
    
    return errors;
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'پيش‌نويس';
      case 'saved': return 'ذخيره شده';
      case 'finalized': return 'نهايي شده';
      case 'printed': return 'پرينت شده';
      default: return status;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'saved': return 'bg-blue-100 text-blue-800';
      case 'finalized': return 'bg-green-100 text-green-800';
      case 'printed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getNextStageText = (status: string) => {
    switch (status) {
      case 'draft': return 'ذخيره';
      case 'saved': return 'نهايي سازي';
      case 'finalized': return 'پرينت رسيد';
      default: return null;
    }
  };
  
  const getNextStatus = (status: string): 'draft' | 'saved' | 'finalized' | 'printed' => {
    switch (status) {
      case 'draft': return 'saved';
      case 'saved': return 'finalized';
      case 'finalized': return 'printed';
      default: return status as 'draft' | 'saved' | 'finalized' | 'printed';
    }
  };
  
  const printReceipt = (receipt: WarehouseReceipt) => {
  // محاسبه وزن مانده قرارداد
  const remainingWeight = calculateContractRemainingWeight(receipt.contractId || '');
  
  const printContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
    <head>
      <meta charset="UTF-8">
      <title>رسيد انبار - ${receipt.transactionNumber}</title>
      <style>
        @page { margin: 8mm; size: A4; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body { 
          font-family: 'Tahoma', 'B Nazanin', sans-serif; 
          direction: rtl; 
          text-align: right; 
          line-height: 1.5;
          margin: 0;
          padding: 5px;
          background: #f8f9fa;
          font-size: 14px;
          color: #1a1a1a;
        }
        .print-container {
          width: 100%;
          max-width: 190mm;
          margin: 0 auto;
          background: #ffffff;
          position: relative;
          border: 3px solid #2563eb;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          box-sizing: border-box;
        }
        .print-container::before {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          right: 2px;
          bottom: 2px;
          border: 1px solid #60a5fa;
          border-radius: 9px;
          pointer-events: none;
        }
        .header { 
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 0 0 15px 0;
          border-bottom: 2px solid #3b82f6;
          margin-bottom: 20px;
        }
        .header-left { 
          text-align: left; 
          flex: 1;
        }
        .header-right { 
          text-align: center; 
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .logo {
          max-height: 70px;
          max-width: 120px;
          object-fit: contain;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: white;
          padding: 5px;
          margin-bottom: 10px;
        }
        .header .company-name {
          font-size: 22px;
          font-weight: 700;
          color: #1e40af;
          margin-bottom: 6px;
          letter-spacing: -0.5px;
        }
        .header .transaction-number {
          background: #eff6ff;
          color: #1e40af;
          padding: 6px 14px;
          border-radius: 6px;
          display: inline-block;
          font-weight: 600;
          font-size: 15px;
          border: 1px solid #bfdbfe;
        }
        .header .print-date {
          font-size: 11px;
          color: #64748b;
        }
        .content { 
          margin-bottom: 15px;
          font-size: 12px;
          line-height: 1.6;
        }
        .details-table { 
          width: 100%; 
          border-collapse: collapse; 
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          font-size: 11px;
          margin: 20px 0;
        }
        .details-table thead {
          background: #f1f5f9;
        }
        .details-table th { 
          background: #f1f5f9;
          color: #475569; 
          padding: 10px 12px; 
          font-weight: 600;
          text-align: right;
          border-bottom: 1px solid #e2e8f0;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .details-table td { 
          border-bottom: 1px solid #f1f5f9; 
          padding: 10px 12px; 
          background: white;
          color: #1e293b;
          font-weight: 500;
          font-size: 12px;
        }
        .details-table tbody tr:hover {
          background: #f8fafc;
        }
        .details-table .amount-cell {
          font-weight: bold;
          background: #f0fdf4 !important;
          color: #166534;
        }
        .two-column {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
          gap: 15px;
        }
        .column {
          width: 48%;
        }
        .basis-note {
          background: #fffbeb;
          border: 1px solid #fbbf24;
          border-radius: 4px;
          padding: 8px 12px;
          margin-top: 10px;
          font-weight: bold;
          color: #92400e;
          font-size: 11px;
        }
        .footer { 
          text-align: center; 
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 9px;
        }
        .signature-section {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-top: 30px;
          padding-top: 15px;
          border-top: 2px solid #3b82f6;
        }
        .signature-box {
          text-align: center;
          padding: 15px 8px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: #fafbfc;
        }
        .signature-title {
          font-size: 11px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 15px;
        }
        .signature-line {
          border-top: 1px solid #94a3b8;
          height: 1px;
          width: 80%;
          margin: 30px auto 5px;
        }
      </style>
    </head>
    <body>
      <div class="print-container">
        <div class="header">
          <div class="header-left">
            <div class="print-date">
              ${isValidDate(new Date()) ? formatPersianDate(new Date()) : ''} - ${new Date().toLocaleTimeString('fa-IR')}
            </div>
          </div>
          <div class="header-right">
            <img src="https://z-cdn-media.chatglm.cn/files/7094d229-4d09-430e-98c1-73f61a7991d6_%D9%84%D9%88%DA%AF%D9%88%20%D8%B5%D9%86%D8%B9%D8%AA%20%D8%BA%D8%B0%D8%A7%DB%8C%DB%8C%20%DA%A9%D9%88%D8%B1%D8%B4.jpg?auth_key=1788869487-700454f4145444fcabf14d4109c175fd-0-531d677f789c51954e01f268eaedd559" alt="لوگو شرکت" class="logo" />
            <div class="company-name">شرکت صنعت غذايي کورش</div>
            <div class="transaction-number">رسيد انبار شماره: ${receipt.transactionNumber}</div>
          </div>
        </div>
        
        <div class="content">
          ${receipt.userType === 'consignment' 
            ? `عطف به درخواست شرکت طرف حساب <strong>${receipt.counterpartyName}</strong> ${receipt.deliveryType === 'second_party' ? `و مشتري طرف حساب <strong>${receipt.customerCounterpartyName}</strong>` : ''} مقدار <strong>${formatPersianNumber(receipt.receiptBasisAmount || receipt.finalAmount)} ${receipt.unit === 'kg' ? 'کيلوگرم' : 'تن'}</strong> کالاي <strong>${receipt.productName}</strong> در تاريخ <strong>${isValidDate(receipt.receiptDate) ? formatPersianDate(receipt.receiptDate) : ''}</strong> در سايت <strong>${receipt.siteName}</strong> از ${receipt.deliveryType === 'first_party' ? 'لوکيشن طرف حساب' : 'لوکيشن مشتري طرف حساب'} <strong>${receipt.deliveryType === 'first_party' ? receipt.counterpartyLocationName : receipt.customerCounterpartyLocationName}</strong> در مخزن <strong>${receipt.tankName}</strong> به صورت <strong>(اماني)</strong> دريافت گرديد.`
            : `عطف به دستور تخلیه و ترخیص شرکت صنعت غذایی کورش مقدار <strong>${formatPersianNumber(receipt.receiptBasisAmount || receipt.finalAmount)} ${receipt.unit === 'kg' ? 'کیلوگرم' : 'تن'}</strong> کالای <strong>${receipt.productName}</strong> در تاریخ <strong>${isValidDate(receipt.receiptDate) ? formatPersianDate(receipt.receiptDate) : ''}</strong> در سایت <strong>${receipt.siteName}</strong> در مخزن <strong>${receipt.tankName}</strong> به صورت <strong>(تملیکی)</strong> با مبنای <strong>${receipt.receiptBasis}</strong> دریافت گردید.`
          }
        </div>
        
        <div class="two-column">
          <div class="column">
            <table class="details-table">
              <thead>
                <tr>
                  <th>شرح</th>
                  <th>مقدار</th>
                  <th>واحد</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>مبناي رسيد</strong></td>
                  <td>${receipt.receiptBasis || '-'}</td>
                  <td>-</td>
                </tr>
                <tr>
                  <td><strong>مقدار مبناي رسيد</strong></td>
                  <td class="amount-cell">${formatPersianNumber(receipt.receiptBasisAmount || 0)}</td>
                  <td><strong>${receipt.unit === 'kg' ? 'کيلوگرم' : 'تن'}</strong></td>
                </tr>
                <tr>
                  <td><strong>وزن آلج کشتي</strong></td>
                  <td>${formatPersianNumber(receipt.shipUnloadingAmount || 0)}</td>
                  <td><strong>${receipt.unit === 'kg' ? 'کيلوگرم' : 'تن'}</strong></td>
                </tr>
                <tr>
                  <td><strong>وزن بارنامه</strong></td>
                  <td>${formatPersianNumber(receipt.shipBillOfLadingAmount || 0)}</td>
                  <td><strong>${receipt.unit === 'kg' ? 'کيلوگرم' : 'تن'}</strong></td>
                </tr>
                <tr>
                  <td><strong>وزن شور تانک</strong></td>
                  <td>${formatPersianNumber(receipt.tankShoreAmount || 0)}</td>
                  <td><strong>${receipt.unit === 'kg' ? 'کيلوگرم' : 'تن'}</strong></td>
                </tr>
                <tr>
                  <td><strong>وزن ناخالص</strong></td>
                  <td>${formatPersianNumber(receipt.weightGross || 0)}</td>
                  <td><strong>${receipt.unit === 'kg' ? 'کيلوگرم' : 'تن'}</strong></td>
                </tr>
                ${receipt.userType === 'consignment' ? `
                <tr>
                  <td><strong>درصد افت</strong></td>
                  <td>${formatPersianNumber(receipt.wastagePercentage || 0)}%</td>
                  <td><strong>درصد</strong></td>
                </tr>
                <tr>
                  <td><strong>وزن افت</strong></td>
                  <td style="background: #fee2e2; font-weight: bold; color: #991b1b;">${formatPersianNumber(Math.abs(receipt.wastageWeight || 0))}</td>
                  <td><strong>${receipt.unit === 'kg' ? 'کيلوگرم' : 'تن'}</strong></td>
                </tr>
                <tr>
                  <td><strong>مانده اماني</strong></td>
                  <td style="background: #dbeafe; font-weight: bold; color: #1e40af;">${formatPersianNumber(receipt.consignmentRemainder || 0)}</td>
                  <td><strong>${receipt.unit === 'kg' ? 'کيلوگرم' : 'تن'}</strong></td>
                </tr>
                <tr>
                  <td><strong>مانده انبار</strong></td>
                  <td style="background: #dbeafe; font-weight: bold; color: #1e40af;">${formatPersianNumber(receipt.inventoryRemainder || 0)}</td>
                  <td><strong>${receipt.unit === 'kg' ? 'کيلوگرم' : 'تن'}</strong></td>
                </tr>
                <tr>
                  <td><strong>وزن قرارداد</strong></td>
                  <td>${formatPersianNumber(receipt.contractWeight || 0)}</td>
                  <td><strong>${receipt.unit === 'kg' ? 'کيلوگرم' : 'تن'}</strong></td>
                </tr>
                <tr>
                  <td><strong>وزن رسيد انبار هاي قرارداد</strong></td>
                  <td>${formatPersianNumber(receipt.contractReceiptWeight || 0)}</td>
                  <td><strong>${receipt.unit === 'kg' ? 'کيلوگرم' : 'تن'}</strong></td>
                </tr>
                <tr>
                  <td><strong>وزن مانده قرارداد</strong></td>
                  <td style="background: #dbeafe; font-weight: bold; color: #1e40af;">${formatPersianNumber(remainingWeight)}</td>
                  <td><strong>${receipt.unit === 'kg' ? 'کيلوگرم' : 'تن'}</strong></td>
                </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
          
          <div class="column">
            <table class="details-table">
              <thead>
                <tr>
                  <th>شرح</th>
                  <th>مقدار</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>نوع کالا</strong></td>
                  <td>${receipt.productName}</td>
                </tr>
                <tr>
                  <td><strong>سايت مخازن</strong></td>
                  <td>${receipt.siteName}</td>
                </tr>
                <tr>
                  <td><strong>نام مخزن</strong></td>
                  <td>${receipt.tankName}</td>
                </tr>
                ${receipt.userType === 'consignment' ? `
                <tr>
                  <td><strong>طرف حساب</strong></td>
                  <td>${receipt.counterpartyName}</td>
                </tr>
                ${receipt.deliveryType === 'second_party' ? `
                <tr>
                  <td><strong>مشتري طرف حساب</strong></td>
                  <td>${receipt.customerCounterpartyName || '-'}</td>
                </tr>
                ` : ''}
                <tr>
                  <td><strong>لوکيشن طرف حساب</strong></td>
                  <td>${receipt.counterpartyLocationName || '-'}</td>
                </tr>
                ${receipt.deliveryType === 'second_party' ? `
                <tr>
                  <td><strong>لوکيشن مشتري طرف حساب</strong></td>
                  <td>${receipt.customerCounterpartyLocationName || '-'}</td>
                </tr>
                ` : ''}
                <tr>
                  <td><strong>قرارداد طرف حساب</strong></td>
                  <td>${receipt.contractNumber || '-'}</td>
                </tr>
                <tr>
                  <td><strong>وزن مانده قرارداد</strong></td>
                  <td style="background: #dbeafe; font-weight: bold; color: #1e40af;">${formatPersianNumber(remainingWeight)}</td>
                </tr>
                <tr>
                  <td><strong>تاريخ سررسيد</strong></td>
                  <td>${receipt.dueDate && isValidDate(receipt.dueDate) ? formatPersianDate(receipt.dueDate) : '-'}</td>
                </tr>
                ` : ''}
                <tr>
                  <td><strong>نام کشتي</strong></td>
                  <td>${receipt.shipName || '-'}</td>
                </tr>
                <tr>
                  <td><strong>شماره کوتاژ</strong></td>
                  <td>${receipt.cotageNumber || '-'}</td>
                </tr>
                <tr>
                  <td><strong>شماره شاخص/ثبت سفارش</strong></td>
                  <td>${receipt.indexNumber || '-'}</td>
                </tr>
                <tr>
                  <td><strong>راننده گان</strong></td>
                  <td>${receipt.driverName || '-'}</td>
                </tr>
                <tr>
                  <td><strong>نام شرکت داخلي</strong></td>
                  <td>${receipt.internalCompanyName || '-'}</td>
                </tr>
                <tr>
                  <td><strong>تاريخ رسيد</strong></td>
                  <td>${isValidDate(receipt.receiptDate) ? formatPersianDate(receipt.receiptDate) : ''}</td>
                </tr>
                <tr>
                  <td><strong>واحد سنجش</strong></td>
                  <td>${receipt.unit === 'kg' ? 'کيلوگرم' : 'تن'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        ${receipt.notes ? `
        <div style="margin: 10px 0; padding: 8px 12px; background: #fffbeb; border: 1px solid #fbbf24; border-radius: 4px;">
          <strong>توضيحات:</strong> ${receipt.notes}
        </div>
        ` : ''}
        
        <div class="basis-note">
          <strong>توجه:</strong> رسيد مذکور بر اساس <strong>${receipt.receiptBasis || 'مبلغ تعيين نشده'}</strong> رسيد شده است.
        </div>
        
        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-title">انباردار</div>
            <div class="signature-line"></div>
            <div>نام و امضا</div>
          </div>
          <div class="signature-box">
            <div class="signature-title">نماينده کشتي</div>
            <div class="signature-line"></div>
            <div>نام و امضا</div>
          </div>
          <div class="signature-box">
            <div class="signature-title">نماينده بازرگاني</div>
            <div class="signature-line"></div>
            <div>نام و امضا</div>
          </div>
          <div class="signature-box">
            <div class="signature-title">نماينده مستاجر</div>
            <div class="signature-line"></div>
            <div>نام و امضا</div>
          </div>
        </div>
        
        <div class="footer">
          اين رسيد توسط سيستم مديريت انبار مخازن شرکت صنعت غذايي کورش توليد شده است
        </div>
      </div>
    </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  }
};
  
  const exportToExcel = () => {
  const storage = DataStorage.getInstance();
  
  // Combined headers - شامل تمام ستون‌های رسیدهای انبار و تراکنش‌های افت
  const combinedHeaders = [
    'نوع رکورد',
    'شماره تراکنش',
    'نوع کاربري',
    'طرف حساب',
    'مشتري طرف حساب',
    'لوکيشن طرف حساب',
    'لوکيشن مشتري طرف حساب',
    'قرارداد طرف حساب',
    'وزن قرارداد',
    'وزن مانده قرارداد',
    'درصد افت',
    'وزن افت',
    'کد کالاي اماني',
    'مانده اماني',
    'مانده انبار',
    'وزن رسيد انبار هاي قرارداد',
    'وزن مانده قرارداد',
    'تاريخ سررسيد',
    'وضعيت سررسيد',
    'سايت مخازن',
    'نام مخزن',
    'ظرفيت مخزن',
    'نام کالا',
    'نام کشتي',
    'شماره کوتاژ',
    'شماره شاخص/ثبت سفارش',
    'راننده گان',
    'نام شرکت داخلي',
    'تاريخ رسيد',
    'واحد سنجش',
    'مبناي رسيد',
    'مقدار مبناي رسيد',
    'وزن آلج کشتي',
    'مقدار تراکنش افت',
    'وزن بارنامه',
    'وزن شور تانک',
    'وزن ناخالص',
    'توضيحات',
    'وضعيت',
    'تاريخ ايجاد',
    'تاريخ به‌روزرساني',
    'افت',
    'نوع تراکنش افت',
    'تاريخ تراکنش افت',
    'مرجع تراکنش افت',
    'شماره تراکنش رسيد انبار (افت)',
    'نام راننده',
    'نام خانوادگی راننده',
    'کد ملی راننده',
    'شماره بارنامه',
    'شماره پلاک',
    'وزن (مبنا)',
    'مبلغ بارنامه',
    'مبدا بارنامه',
    'تاریخ بارنامه',
    'شرکت حمل و نقل',
    'شماره موبایل راننده',
    'آدرس مبدا',
    'مبلغ پشت بارنامه',
    'کدپستی مبدا'
  ];
  
  // استفاده از receipts اصلی به جای filteredReceipts برای شامل کردن همه داده‌ها
  const receiptRows = receipts.map(receipt => {
    // محاسبه وزن مانده قرارداد
    const remainingWeight = calculateContractRemainingWeight(receipt.contractId || '');
    // بررسی وجود تراکنش افت
    const hasWastage = wastageTransactions.some(t => t.referenceId === receipt.id);
    
    return [
      'رسید انبار', // نوع رکورد
      receipt.transactionNumber,
      receipt.userType === 'consignment' ? 'امانی' : 'تملیکی',
      receipt.counterpartyName || '-',
      receipt.customerCounterpartyName || '-',
      receipt.counterpartyLocationName || '-',
      receipt.customerCounterpartyLocationName || '-',
      receipt.contractNumber || '-',
      receipt.contractWeight ? formatPersianNumber(receipt.contractWeight) : '-',
      formatPersianNumber(remainingWeight),
      receipt.wastagePercentage ? formatPersianNumber(receipt.wastagePercentage) : '-',
      receipt.wastageWeight ? formatPersianNumber(Math.abs(receipt.wastageWeight)) : '-',
      receipt.productCode || '-',
      receipt.consignmentRemainder ? formatPersianNumber(receipt.consignmentRemainder) : '-',
      receipt.inventoryRemainder ? formatPersianNumber(receipt.inventoryRemainder) : '-',
      receipt.contractReceiptWeight ? formatPersianNumber(receipt.contractReceiptWeight) : '-',
      formatPersianNumber(remainingWeight),
      receipt.dueDate && isValidDate(receipt.dueDate) ? formatPersianDate(receipt.dueDate) : '-',
      receipt.isOverdue ? 'سررسيد شده' : 'سررسيد نشده',
      receipt.siteName,
      receipt.tankName,
      receipt.tankCapacity ? formatPersianNumber(receipt.tankCapacity) : '-',
      receipt.productName,
      receipt.shipName || '-',
      receipt.cotageNumber || '-',
      receipt.indexNumber || '-',
      receipt.driverName || '-',
      receipt.internalCompanyName || '-',
      isValidDate(receipt.receiptDate) ? formatPersianDate(receipt.receiptDate) : '-',
      receipt.unit === 'kg' ? 'کيلوگرم' : 'تن',
      receipt.receiptBasis || '-',
      receipt.receiptBasisAmount ? formatPersianNumber(receipt.receiptBasisAmount) : '-',
      receipt.shipUnloadingAmount ? formatPersianNumber(receipt.shipUnloadingAmount) : '-',
      '-', // مقدار تراکنش افت (برای رسیدها)
      receipt.shipBillOfLadingAmount ? formatPersianNumber(receipt.shipBillOfLadingAmount) : '-',
      receipt.tankShoreAmount ? formatPersianNumber(receipt.tankShoreAmount) : '-',
      receipt.weightGross ? formatPersianNumber(receipt.weightGross) : '-',
      receipt.notes || '-',
      getStatusText(receipt.status),
      isValidDate(receipt.createdAt) ? formatPersianDate(receipt.createdAt) : '-',
      isValidDate(receipt.updatedAt) ? formatPersianDate(receipt.updatedAt) : '-',
      hasWastage ? 'دارد' : 'ندارد',
      '-', // نوع تراکنش افت (برای رسیدها)
      '-', // تاريخ تراکنش افت (برای رسیدها)
      '-', // مرجع تراکنش افت (برای رسیدها)
      '-', // شماره تراکنش رسيد انبار (افت) (برای رسیدها)
      receipt.additionalInfo?.driverFirstName || '-',
      receipt.additionalInfo?.driverLastName || '-',
      receipt.additionalInfo?.driverNationalId || '-',
      receipt.additionalInfo?.billOfLadingNumber || '-',
      receipt.additionalInfo?.plateNumber || '-',
      receipt.additionalInfo?.weight ? formatPersianNumber(receipt.additionalInfo.weight) : '-',
      receipt.additionalInfo?.billAmount ? formatPersianNumber(receipt.additionalInfo.billAmount) : '-',
      receipt.additionalInfo?.origin || '-',
      receipt.additionalInfo?.billDate && isValidDate(receipt.additionalInfo.billDate) ? formatPersianDate(receipt.additionalInfo.billDate) : '-',
      receipt.additionalInfo?.transportCompany || '-',
      receipt.additionalInfo?.driverMobile || '-',
      receipt.additionalInfo?.originAddress || '-',
      receipt.additionalInfo?.backBillAmount ? formatPersianNumber(receipt.additionalInfo.backBillAmount) : '-',
      receipt.additionalInfo?.originPostalCode || '-'
    ];
  });

  // استفاده از همه wastageTransactions از storage به جای sortedWastageTransactions برای شامل کردن همه داده‌ها
  const allWastageTransactions = ((storage.loadData('wastageTransactions') || []) as any[]);
  const wastageRows = allWastageTransactions.map(transaction => [
    'تراکنش افت کالای امانی', // نوع رکورد
    transaction.transactionNumber,
    '-', // نوع کاربري (برای تراکنش‌های افت)
    transaction.counterpartyName || '-',
    '-', // مشتري طرف حساب (برای تراکنش‌های افت)
    '-', // لوکيشن طرف حساب (برای تراکنش‌های افت)
    '-', // لوکيشن مشتري طرف حساب (برای تراکنش‌های افت)
    transaction.contractNumber || '-',
    '-', // وزن قرارداد (برای تراکنش‌های افت)
    '-', // وزن مانده قرارداد (برای تراکنش‌های افت)
    '-', // درصد افت (برای تراکنش‌های افت)
    '-', // وزن افت (برای تراکنش‌های افت)
    transaction.productCode || '-',
    '-', // مانده اماني (برای تراکنش‌های افت)
    '-', // مانده انبار (برای تراکنش‌های افت)
    '-', // وزن رسيد انبار هاي قرارداد (برای تراکنش‌های افت)
    '-', // وزن مانده قرارداد (برای تراکنش‌های افت)
    '-', // تاريخ سررسيد (برای تراکنش‌های افت)
    '-', // وضعيت سررسيد (برای تراکنش‌های افت)
    transaction.siteName || '-',
    transaction.tankName || '-',
    '-', // ظرفيت مخزن (برای تراکنش‌های افت)
    transaction.productName || '-',
    '-', // نام کشتي (برای تراکنش‌های افت)
    '-', // شماره کوتاژ (برای تراکنش‌های افت)
    '-', // شماره شاخص/ثبت سفارش (برای تراکنش‌های افت)
    '-', // راننده گان (برای تراکنش‌های افت)
    '-', // نام شرکت داخلي (برای تراکنش‌های افت)
    '-', // تاريخ رسيد (برای تراکنش‌های افت)
    transaction.unit || '-',
    '-', // مبناي رسيد (برای تراکنش‌های افت)
    '-', // مقدار مبناي رسيد (برای تراکنش‌های افت)
    transaction.amount ? formatPersianNumber(transaction.amount) : '-', // مقدار تراکنش افت
    '-', // وزن بارنامه (برای تراکنش‌های افت)
    '-', // وزن شور تانک (برای تراکنش‌های افت)
    '-', // وزن ناخالص (برای تراکنش‌های افت)
    transaction.description || '-',
    '-', // وضعيت (برای تراکنش‌های افت)
    '-', // تاريخ ايجاد (برای تراکنش‌های افت)
    '-', // تاريخ به‌روزرساني (برای تراکنش‌های افت)
    '-', // افت (برای تراکنش‌های افت)
    transaction.transactionType === 'consignment' ? 'کسر از امانی' : 'افزودن به تملیکی',
    transaction.transactionDate && isValidDate(transaction.transactionDate) ? formatPersianDate(transaction.transactionDate) : '-',
    transaction.referenceType || '-',
    transaction.receiptTransactionNumber || '-',
    '-', // نام راننده (برای تراکنش‌های افت)
    '-', // نام خانوادگی راننده (برای تراکنش‌های افت)
    '-', // کد ملی راننده (برای تراکنش‌های افت)
    '-', // شماره بارنامه (برای تراکنش‌های افت)
    '-', // شماره پلاک (برای تراکنش‌های افت)
    '-', // وزن (مبنا) (برای تراکنش‌های افت)
    '-', // مبلغ بارنامه (برای تراکنش‌های افت)
    '-', // مبدا بارنامه (برای تراکنش‌های افت)
    '-', // تاریخ بارنامه (برای تراکنش‌های افت)
    '-', // شرکت حمل و نقل (برای تراکنش‌های افت)
    '-', // شماره موبایل راننده (برای تراکنش‌های افت)
    '-', // آدرس مبدا (برای تراکنش‌های افت)
    '-', // مبلغ پشت بارنامه (برای تراکنش‌های افت)
    '-'  // کدپستی مبدا (برای تراکنش‌های افت)
  ]);
  
  // Combine all rows
  const allRows = [...receiptRows, ...wastageRows];
  
  // Create Excel workbook
  import('xlsx').then(XLSX => {
    const wb = XLSX.utils.book_new();
    
    // Single combined sheet with both receipt and wastage transactions
    const combinedWs = XLSX.utils.aoa_to_sheet([combinedHeaders, ...allRows]);
    const combinedColWidths = combinedHeaders.map(() => ({ wch: 15 }));
    combinedWs['!cols'] = combinedColWidths;
    XLSX.utils.book_append_sheet(wb, combinedWs, 'لیست رسیدهای انبار');
    
    XLSX.writeFile(wb, `warehouse_receipts_${formatPersianDate(new Date())}.xlsx`);
  }).catch(() => {
    // Fallback to CSV - export combined as single file
    const combinedCsvContent = [
      combinedHeaders.join(','),
      ...allRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Download combined file
    const combinedBlob = new Blob(['\ufeff' + combinedCsvContent], { type: 'text/csv;charset=utf-8;' });
    const combinedUrl = URL.createObjectURL(combinedBlob);
    const combinedLink = document.createElement('a');
    combinedLink.setAttribute('href', combinedUrl);
    combinedLink.setAttribute('download', `warehouse_receipts_${formatPersianDate(new Date())}.csv`);
    combinedLink.style.visibility = 'hidden';
    document.body.appendChild(combinedLink);
    combinedLink.click();
    document.body.removeChild(combinedLink);
  });
};
  
  const checkDueStatus = (dueDate?: Date): boolean => {
    if (!dueDate || !isValidDate(dueDate)) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return dueDate <= today;
  };
  
  // اصلاح تابع handleFieldChange براي اطمينان از به‌روزرساني صحيح فيلدها در حالت ويرايش
  const handleFieldChange = (fieldName: string, value: any) => {
    console.log(`?? تغيير فيلد: ${fieldName} = ${value}`);
    
    setNewReceipt(prev => {
      const updated = { ...prev, [fieldName]: value };

      // هم‌زمان پیش‌فرض‌های اطلاعات تکمیلی را در صورت نیاز تنظیم کن
      if (fieldName === 'receiptBasisAmount' && (!receiptExtraInfo.weight || receiptExtraInfo.weight === prev.receiptBasisAmount)) {
        setReceiptExtraInfo(extra => ({ ...extra, weight: value || 0 }));
      }
      if ((fieldName === 'siteName' || fieldName === 'tankName' || fieldName === 'siteId' || fieldName === 'tankId') && !showReceiptExtraInfo) {
        setReceiptExtraInfo(extra => ({
          ...extra,
          originAddress: updated.siteName && updated.tankName ? `${updated.siteName} - ${updated.tankName}` : extra.originAddress
        }));
      }
      if (fieldName === 'receiptDate' && receiptExtraInfo.billDate && isValidDate(receiptExtraInfo.billDate)) {
        const prevDate = prev.receiptDate;
        if (prevDate && receiptExtraInfo.billDate && new Date(prevDate).toDateString() === new Date(receiptExtraInfo.billDate).toDateString()) {
          setReceiptExtraInfo(extra => ({ ...extra, billDate: value }));
        }
      }

      return updated;
    });
    
    if (fieldName === 'deliveryType') {
      const deliveryType = value as 'first_party' | 'second_party';
      
      if (deliveryType === 'first_party') {
        setNewReceipt(prev => ({
          ...prev,
          customerCounterpartyId: '',
          customerCounterpartyName: '',
          customerCounterpartyLocationId: '',
          customerCounterpartyLocationName: ''
        }));
      }
    }
    
    if (fieldName === 'contractId') {
      handleContractChange(value);
    }
    
    if (fieldName === 'receiptBasis') {
      console.log(`?? تغيير مبناي رسيد به: ${value}`);
      
      setTimeout(() => {
        const receiptBasisAmount = calculateReceiptBasisAmount({
          ...newReceipt,
          receiptBasis: value
        });
        
        setNewReceipt(prev => ({
          ...prev,
          receiptBasisAmount
        }));
        
        calculateAmounts({
          ...newReceipt,
          receiptBasis: value,
          receiptBasisAmount
        });
      }, 100);
    }
    
    if (fieldName === 'wastagePercentage') {
      console.log(`?? تغيير درصد افت به: ${value}%`);
      
      setTimeout(() => {
        calculateAmounts({
          ...newReceipt,
          wastagePercentage: value
        });
      }, 100);
    }
    
    // Handle dropdown selections - اصلاح شده براي شامل فيلدهاي جديد
    if (['shipName', 'cotageNumber', 'indexNumber', 'driverName', 'internalCompanyName'].includes(fieldName)) {
      let selectedItem = null;
      if (fieldName === 'shipName') {
        selectedItem = baseData.shipNames?.find((item: any) => item.id === value);
      } else if (fieldName === 'cotageNumber') {
        selectedItem = baseData.cotageNumbers?.find((item: any) => item.id === value);
      } else if (fieldName === 'indexNumber') {
        selectedItem = baseData.indexNumbers?.find((item: any) => item.id === value);
      } else if (fieldName === 'driverName') {
        selectedItem = baseData.drivers?.find((item: any) => item.id === value);
      } else if (fieldName === 'internalCompanyName') {
        selectedItem = baseData.internalCompany?.find((item: any) => item.id === value);
      }
      
      if (selectedItem) {
        setTimeout(() => {
          setNewReceipt(prev => ({
            ...prev,
            [fieldName]: selectedItem.name
          }));
        }, 50);
      }
    }
    
    // Note: For productId, siteId, and tankId, we handle them directly in the onChange handlers
    // to ensure proper state updates and avoid conflicts
    
    // براي فيلدهاي مهم، محاسبات را مجدداً اجرا کن
    if (['productId', 'siteId', 'tankId'].includes(fieldName)) {
      setTimeout(() => {
        calculateAmounts(newReceipt);
      }, 100);
    }
    
    // به‌روزرساني تراکنش‌هاي افت در صورت تغيير مقدار مبناي رسيد يا وزن افت - اصلاح شده
    if (editingReceipt && (fieldName === 'receiptBasisAmount' || fieldName === 'wastagePercentage' || fieldName === 'receiptBasis')) {
      setTimeout(() => {
        // Get the updated receipt data
        const updatedReceipt = {
          ...newReceipt,
          [fieldName]: value
        };
        
        // Recalculate amounts
        calculateAmounts(updatedReceipt);
        
        // Get the updated gainedWeight
        const gainedWeight = updatedReceipt.gainedWeight || 0;
        
        // بررسي وجود تراکنش‌هاي افت براي اين رسيد
        const existingTransactions = wastageTransactions.filter(t => t.referenceId === editingReceipt);
        
        if (existingTransactions.length > 0) {
          console.log(`?? به‌روزرساني تراکنش‌هاي افت براي رسيد ${editingReceipt}`);
          
          // به‌روزرساني تراکنش کسر از اماني
          const consignmentTransaction = existingTransactions.find(t => t.transactionType === 'consignment');
          if (consignmentTransaction) {
            dispatchWastageTransactions({
              type: 'UPDATE_TRANSACTION',
              payload: {
                receiptId: editingReceipt,
                transactionData: {
                  ...updatedReceipt,
                  gainedWeight: gainedWeight
                },
                transactionType: 'consignment'
              }
            });
          }
          
          // به‌روزرسانی تراکنش افزودن به تملیکی
          const ownedTransaction = existingTransactions.find(t => t.transactionType === 'owned');
          if (ownedTransaction) {
            dispatchWastageTransactions({
              type: 'UPDATE_TRANSACTION',
              payload: {
                receiptId: editingReceipt,
                transactionData: {
                  ...updatedReceipt,
                  gainedWeight: gainedWeight
                },
                transactionType: 'owned'
              }
            });
          }
        }
      }, 200);
    }
  };
  
  // اصلاح تابع generateAnalyticsData براي حذف نمودار "درصد پر شدن مخازن"
  const generateAnalyticsData = () => {
    const ownedReceipts = receipts.filter(r => r.userType === 'owned');
    const consignmentReceipts = receipts.filter(r => r.userType === 'consignment');
    
    // محاسبه کل رسیدهای تملیکی شامل تراکنش‌های "افزودن به تملیکی" از طریق رسید امانی
    const totalOwnedReceipts = ownedReceipts.reduce((sum, r) => sum + (r.receiptBasisAmount || 0), 0) +
      wastageTransactions
        .filter(t => t.transactionType === 'owned')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const inventoryByType = [
      {
        label: 'رسیدهای تملیکی',
        value: totalOwnedReceipts
      },
      {
        label: 'رسيدهاي اماني',
        value: consignmentReceipts.reduce((sum, r) => sum + (r.receiptBasisAmount || 0), 0)
      }
    ];
    
    const statusDistribution = [
      {
        label: 'پيش‌نويس',
        value: receipts.filter(r => r.status === 'draft').length
      },
      {
        label: 'ذخيره شده',
        value: receipts.filter(r => r.status === 'saved').length
      },
      {
        label: 'نهايي شده',
        value: receipts.filter(r => r.status === 'finalized').length
      },
      {
        label: 'پرينت شده',
        value: receipts.filter(r => r.status === 'printed').length
      }
    ];
    
    return {
      inventoryByType,
      statusDistribution
    };
  };
  
  const analyticsData = generateAnalyticsData();
  
  // Calculate column totals for the receipt list table
  const calculateColumnTotals = () => {
    const receiptBasisAmountTotal = filteredReceipts.reduce((sum, r) => sum + (r.receiptBasisAmount || 0), 0);
    const finalAmountTotal = filteredReceipts.reduce((sum, r) => sum + (r.finalAmount || 0), 0);
    
    return {
      receiptBasisAmountTotal,
      finalAmountTotal
    };
  };
  
  const columnTotals = calculateColumnTotals();
  
  return (
    <div className={`p-6 bg-gray-50 min-h-screen ${currentUserType === 'consignment' ? 'max-w-6xl mx-auto' : ''}`}>
      <div className="max-w-7xl mx-auto">
        {/* User Type Selection Modal */}
        {showUserTypeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">انتخاب نوع رسيد</h3>
              
              <div className="space-y-4">
                <button
                  onClick={() => handleStartNewReceipt('consignment')}
                  className="w-full p-4 border-2 border-purple-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-lg font-medium text-purple-800">رسيد اماني</div>
                    <div className="text-sm text-purple-600 mt-1">براي کالاهاي اماني شرکت هاي طرف حساب</div>
                  </div>
                </button>
                <button
                  onClick={() => handleStartNewReceipt('owned')}
                  className="w-full p-4 border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-lg font-medium text-green-800">رسید تملیکی</div>
                    <div className="text-sm text-green-600 mt-1">برای کالاهای تملیکی شرکت</div>
                  </div>
                </button>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowUserTypeModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Wastage Alert Modal */}
        {showWastageAlerts && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {wastageAlertStep === 1 ? 'هشدار مرحله اول' : 'هشدار مرحله دوم'}
              </h3>
              <p className="text-gray-700 mb-6">
                {wastageAlertStep === 1 
                  ? `کاربر گرامي از محل رسيد اماني ${formatPersianNumber(currentReceiptRef.current?.receiptBasisAmount || 0)} ${currentReceiptRef.current?.unit === 'kg' ? 'کيلوگرم' : 'تن'} کالاي ${currentReceiptRef.current?.productName} از طرف حساب ${currentReceiptRef.current?.counterpartyName} معادل ${formatPersianNumber(currentReceiptRef.current?.gainedWeight || 0)} ${currentReceiptRef.current?.unit === 'kg' ? 'کيلوگرم' : 'تن'} افت از مانده اماني طرف حساب کسر ميگردد.`
                  : `کاربر گرامی از محل رسید امانی ${formatPersianNumber(currentReceiptRef.current?.receiptBasisAmount || 0)} ${currentReceiptRef.current?.unit === 'kg' ? 'کیلوگرم' : 'تن'} کالای ${currentReceiptRef.current?.productName} از طرف حساب ${currentReceiptRef.current?.counterpartyName} معادل ${formatPersianNumber(currentReceiptRef.current?.gainedWeight || 0)} ${currentReceiptRef.current?.unit === 'kg' ? 'کیلوگرم' : 'تن'} افت به مانده تملیکی شرکت اضافه می‌گردد.`
                }
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => handleWastageAlertClick(wastageAlertStep)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  پذيرفتن
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">رسيد انبار</h1>
            <p className="text-gray-600">مديريت رسيد هاي انبار و مخازن</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={forceRefreshBaseData}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              title="به‌روزرساني اطلاعات پايه"
            >
              <RefreshCw className="h-5 w-5" />
              به‌روزرساني
            </button>
            <img 
              src="https://z-cdn-media.chatglm.cn/files/7094d229-4d09-430e-98c1-73f61a7991d6_%D9%84%D9%88%DA%AF%D9%88%20%D8%B5%D9%86%D8%B9%D8%AA%20%D8%BA%D8%B0%D8%A7%DB%8C%DB%8C%20%DA%A9%D9%88%D8%B1%D8%B4.jpg?auth_key=1788869487-700454f4145444fcabf14d4109c175fd-0-531d677f789c51954e01f268eaedd559" 
              alt="لوگو شرکت" 
              className="h-16 w-auto"
            />
          </div>
        </div>
        
        {/* Error Display */}
        {baseDataError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-red-800">خطا در بارگذاري اطلاعات پايه</h3>
                <p className="text-sm text-red-700 mt-1">{baseDataError}</p>
                <button
                  onClick={() => loadBaseData(true)}
                  className="mt-2 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                >
                  تلاش مجدد
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">ليست رسيد هاي انبار</h2>
                <p className="text-gray-600 text-sm mt-1">
                  مجموع {receipts.length} رسيد
                  {dataLoaded && (
                    <span className="text-xs text-green-600 mr-2">
                      (آخرين به‌روزرساني: {new Date(lastUpdate).toLocaleTimeString('fa-IR')})
                    </span>
                  )}
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowUserTypeModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  رسيد جديد
                </button>
                <button
                  onClick={exportToExcel}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors flex items-center gap-2 text-lg font-bold shadow-lg transition-all transform hover:scale-105"
                >
                  <Download className="h-5 w-5" />
                  خروجي اکسل
                </button>
              </div>
            </div>
            
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="جستجو بر اساس تمامي اطلاعات رسيد..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-12 pl-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              />
            </div>
          </div>
          
          {(isAddingNew || editingReceipt) && (
            <div className="p-6 border-b border-gray-200 bg-blue-50 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <h3 className="font-medium text-blue-900">
                    {isAddingNew ? `افزودن رسید ${currentUserType === 'consignment' ? 'امانی' : 'تملیکی'}` : 'ویرایش رسید'}
                  </h3>
                </div>
                <button
                  onClick={() => loadBaseData(true)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="h-4 w-4" />
                  به‌روزرساني اطلاعات
                </button>
              </div>
              
              {/* Contract Remainder Warning */}
              {contractRemainderWarning && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                    <div>
                      <h3 className="text-sm font-medium text-yellow-800">هشدار محدوديت قرارداد</h3>
                      <p className="text-sm text-yellow-700 mt-1">{contractRemainderWarning}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Tank Capacity Warning */}
              {tankCapacityWarning && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                    <div>
                      <h3 className="text-sm font-medium text-red-800">هشدار ظرفيت مخزن</h3>
                      <p className="text-sm text-red-700 mt-1">{tankCapacityWarning}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Tank Capacity Info for Owned Receipts */}
              {currentUserType === 'owned' && newReceipt.siteId && newReceipt.tankId && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <Warehouse className="h-5 w-5" />
                    اطلاعات ظرفيت مخزن
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ظرفيت کل مخزن
                      </label>
                      <Tooltip text="ظرفيت کل مخزن بر اساس اطلاعات ثبت شده در اطلاعات پايه محاسبه مي‌شود">
                        <input
                          type="text"
                          value={formatPersianNumber(getTankCapacity(newReceipt.tankId))}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                        />
                      </Tooltip>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        جمع رسيدهاي مخزن در سايت
                      </label>
                      <Tooltip text="مجموع تمام رسيدهاي ثبت شده در اين مخزن و سايت (شامل تملکي و اماني) به جز رسيد فعلي">
                        <input
                          type="text"
                          value={formatPersianNumber(calculateTotalReceipts(newReceipt.siteId || '', newReceipt.tankId || '', editingReceipt || undefined))}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                        />
                      </Tooltip>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        جمع حواله هاي مخزن در سايت
                      </label>
                      <Tooltip text="مجموع تمام حواله‌هاي ثبت شده براي اين مخزن و سايت">
                        <input
                          type="text"
                          value={formatPersianNumber(calculateTotalOwnedDeliveries(newReceipt.siteId, newReceipt.tankId))}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                        />
                      </Tooltip>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ظرفيت آزاد موجودي مخزن
                      </label>
                      <Tooltip text="ظرفيت کل مخزن منهاي (مجموع رسيدهاي مخزن به جز رسيد فعلي منهاي مجموع حواله‌هاي مخزن)">
                        <input
                          type="text"
                          value={formatPersianNumber(calculateRemainingCapacity(newReceipt.siteId || '', newReceipt.tankId || '', editingReceipt || undefined))}
                          readOnly
                          className={`w-full px-3 py-2 border rounded-lg ${
                            calculateRemainingCapacity(newReceipt.siteId || '', newReceipt.tankId || '', editingReceipt || undefined) < 0 
                              ? 'bg-red-100 border-red-300 text-red-800' 
                              : 'bg-green-100 border-green-300 text-green-800'
                          }`}
                        />
                      </Tooltip>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {currentUserType === 'consignment' && (
                  <>
                    {/* Basic Information Section */}
                    <div className="md:col-span-3 border-2 border-blue-500 rounded-lg p-4 bg-blue-50 mb-4">
                      <h4 className="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
                        <BuildingIcon className="h-5 w-5" />
                        اطلاعات پايه
                        <span className="text-sm font-normal text-blue-600">(بارگذاري خودکار از صفحه اطلاعات پايه)</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Counterparty */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            طرف حساب <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={newReceipt.counterpartyId || ''}
                            onChange={(e) => {
                              const selectedCounterparty = baseData.counterparties?.find((c: any) => c.id === e.target.value);
                              handleFieldChange('counterpartyId', e.target.value);
                              handleFieldChange('counterpartyName', selectedCounterparty?.name || undefined);
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 text-green-800 font-bold ${
                              errors.counterpartyId ? 'border-red-500' : ''
                            }`}
                          >
                            <option value="">انتخاب کنيد</option>
                            {baseData.counterparties?.filter((counterparty: any) => 
                              contracts.some((contract: any) => contract.companyId === counterparty.id && contract.isActive)
                            ).map((counterparty: any) => (
                              <option key={counterparty.id} value={counterparty.id}>{counterparty.name}</option>
                            ))}
                          </select>
                          {errors.counterpartyId && (
                            <p className="text-red-500 text-xs mt-1">{errors.counterpartyId}</p>
                          )}
                        </div>
                        
                        {/* Delivery Type */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            تحويل دهنده <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={newReceipt.deliveryType || ''}
                            onChange={(e) => {
                              const deliveryType = e.target.value as 'first_party' | 'second_party';
                              handleFieldChange('deliveryType', deliveryType);
                            }}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="first_party">طرف اول (شرکت طرف حساب)</option>
                            <option value="second_party">طرف دوم (مشتري طرف حساب)</option>
                          </select>
                        </div>
                        
                        {/* Customer Counterparty */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            مشتري طرف حساب {newReceipt.deliveryType === 'second_party' && <span className="text-red-500">*</span>}
                          </label>
                          <select
                            value={newReceipt.customerCounterpartyId || ''}
                            onChange={(e) => {
                              const selectedCustomerCounterparty = baseData.customerCounterparties?.find((c: any) => c.id === e.target.value);
                              handleFieldChange('customerCounterpartyId', e.target.value);
                              handleFieldChange('customerCounterpartyName', selectedCustomerCounterparty?.name || undefined);
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors.customerCounterpartyId ? 'border-red-500' : 'border-gray-300'
                            }`}
                            disabled={newReceipt.deliveryType !== 'second_party'}
                          >
                            <option value="">انتخاب کنيد</option>
                            {baseData.customerCounterparties?.map((customer: any) => (
                              <option key={customer.id} value={customer.id}>{customer.name}</option>
                            ))}
                          </select>
                          {errors.customerCounterpartyId && (
                            <p className="text-red-500 text-xs mt-1">{errors.customerCounterpartyId}</p>
                          )}
                        </div>
                        
                        {/* Counterparty Location */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            لوکيشن طرف حساب <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={newReceipt.counterpartyLocationId || ''}
                            onChange={(e) => {
                              const selectedCounterpartyLocation = baseData.counterpartyLocations?.find((l: any) => l.id === e.target.value);
                              handleFieldChange('counterpartyLocationId', e.target.value);
                              handleFieldChange('counterpartyLocationName', selectedCounterpartyLocation?.name || undefined);
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors.counterpartyLocationId ? 'border-red-500' : 'border-gray-300'
                            }`}
                          >
                            <option value="">انتخاب کنيد</option>
                            {baseData.counterpartyLocations?.map((location: any) => (
                              <option key={location.id} value={location.id}>{location.name}</option>
                            ))}
                          </select>
                          {errors.counterpartyLocationId && (
                            <p className="text-red-500 text-xs mt-1">{errors.counterpartyLocationId}</p>
                          )}
                        </div>
                        
                        {/* Customer Counterparty Location */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            لوکيشن مشتري طرف حساب {newReceipt.deliveryType === 'second_party' && <span className="text-red-500">*</span>}
                          </label>
                          <select
                            value={newReceipt.customerCounterpartyLocationId || ''}
                            onChange={(e) => {
                              const selectedCustomerCounterpartyLocation = baseData.customerCounterpartyLocations?.find((l: any) => l.id === e.target.value);
                              handleFieldChange('customerCounterpartyLocationId', e.target.value);
                              handleFieldChange('customerCounterpartyLocationName', selectedCustomerCounterpartyLocation?.name || undefined);
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors.customerCounterpartyLocationId ? 'border-red-500' : 'border-gray-300'
                            }`}
                            disabled={newReceipt.deliveryType !== 'second_party'}
                          >
                            <option value="">انتخاب کنيد</option>
                            {baseData.customerCounterpartyLocations?.map((location: any) => (
                              <option key={location.id} value={location.id}>{location.name}</option>
                            ))}
                          </select>
                          {errors.customerCounterpartyLocationId && (
                            <p className="text-red-500 text-xs mt-1">{errors.customerCounterpartyLocationId}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Contract Information Section */}
                    <div className="md:col-span-3 border-2 border-purple-500 rounded-lg p-4 bg-purple-50 mb-4">
                      <h4 className="text-lg font-bold text-purple-800 mb-3 flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        اطلاعات قرارداد
                        <span className="text-sm font-normal text-purple-600">(بارگذاري خودکار از صفحه قراردادها)</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Contract */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            قرارداد طرف حساب <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={newReceipt.contractId || ''}
                            onChange={(e) => handleContractChange(e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 text-green-800 font-bold ${
                              errors.contractId ? 'border-red-500' : ''
                            }`}
                            disabled={!newReceipt.counterpartyId}
                          >
                            <option value="">انتخاب کنيد</option>
                            {contracts
                              .filter(c => c.isActive && c.companyId === newReceipt.counterpartyId)
                              .map(contract => (
                                <option key={contract.id} value={contract.id}>
                                  {contract.contractNumber}
                                </option>
                              ))}
                          </select>
                          {errors.contractId && (
                            <p className="text-red-500 text-xs mt-1">{errors.contractId}</p>
                          )}
                        </div>
                        
                        {/* Contract Weight */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            وزن قرارداد
                          </label>
                          <input
                            type="number"
                            value={newReceipt.contractWeight || ''}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                            placeholder="وزن قرارداد"
                          />
                        </div>
                        
                        {/* Receipt Basis */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            مبناي رسيد <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={newReceipt.receiptBasis || ''}
                            onChange={(e) => {
                              handleFieldChange('receiptBasis', e.target.value);
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors.receiptBasis ? 'border-red-500' : 'border-gray-300'
                            }`}
                            disabled={!!newReceipt.contractId}
                          >
                            <option value="">انتخاب کنيد</option>
                            {baseData.receiptBasis?.map((basis: any) => (
                              <option key={basis.id} value={basis.id}>{basis.name}</option>
                            ))}
                          </select>
                          {errors.receiptBasis && (
                            <p className="text-red-500 text-xs mt-1">{errors.receiptBasis}</p>
                          )}
                          {newReceipt.contractId && (
                            <p className="text-xs text-blue-600 mt-1">مبناي رسيد از قرارداد دريافت شده</p>
                          )}
                        </div>
                        
                        {/* Wastage Percentage */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            درصد افت <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={newReceipt.wastagePercentage || ''}
                            readOnly={!!newReceipt.contractId}
                            onChange={(e) => {
                              if (!newReceipt.contractId) {
                                const percentage = parseFloat(e.target.value) || 0;
                                handleFieldChange('wastagePercentage', percentage);
                              }
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              newReceipt.contractId ? 'bg-gray-100' : ''
                            } ${errors.wastagePercentage ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="درصد افت"
                            step="0.01"
                            min="0"
                            max="100"
                          />
                          {newReceipt.contractId && (
                            <p className="text-xs text-blue-600 mt-1">درصد افت از قرارداد دريافت شده</p>
                          )}
                          {errors.wastagePercentage && (
                            <p className="text-red-500 text-xs mt-1">{errors.wastagePercentage}</p>
                          )}
                        </div>
                        
                        {/* Wastage Weight */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            وزن افت
                          </label>
                          <Tooltip text="وزن افت = مقدار مبناي رسيد × درصد افت">
                            <input
                              type="number"
                              value={newReceipt.wastageWeight ? Math.abs(newReceipt.wastageWeight) : ''}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                              placeholder="وزن افت"
                            />
                          </Tooltip>
                        </div>
                        
                        {/* Consignment Remainder */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            مانده اماني
                          </label>
                          <Tooltip text="مانده اماني = مقدار مبناي رسيد + وزن افت">
                            <input
                              type="number"
                              value={newReceipt.consignmentRemainder || ''}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                              placeholder="مانده اماني"
                            />
                          </Tooltip>
                        </div>
                        
                                               {/* Contract Remainder */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            وزن مانده قرارداد
                          </label>
                          <Tooltip text="وزن مانده قرارداد = وزن قرارداد - (وزن رسید انبار + مقدار مبنا رسید + سند اضافه انبار - حواله انبار - سند کسر انبار)">
                            <input
                              type="number"
                              value={calculateContractRemainingWeight(newReceipt.contractId || '')}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                              placeholder="وزن مانده قرارداد"
                            />
                          </Tooltip>
                        </div>
                        
                        {/* Inventory Remainder */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            مانده انبار
                          </label>
                          <Tooltip text="مانده انبار = مقدار مبنای رسید + وزن افت + وزن تملیکی حاصل از افت">
                            <input
                              type="number"
                              value={newReceipt.inventoryRemainder || ''}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                              placeholder="مانده انبار"
                            />
                          </Tooltip>
                        </div>
                        
                        {/* Contract Receipt Weight */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            وزن رسيد انبار هاي قرارداد
                          </label>
                          <Tooltip text="مجموع تمام رسيدهاي انبار ثبت شده براي اين قرارداد">
                            <input
                              type="number"
                              value={newReceipt.contractReceiptWeight || ''}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                              placeholder="وزن رسيد انبار هاي قرارداد"
                            />
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                    
                    {/* Tank Capacity Information Section - New Table */}
                    <div className="md:col-span-3 border-2 border-orange-500 rounded-lg p-4 bg-orange-50 mb-4">
                      <h4 className="text-lg font-bold text-orange-800 mb-3 flex items-center gap-2">
                        <Warehouse className="h-5 w-5" />
                        اطلاعات ظرفيت مخزن
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ظرفيت کل مخزن
                          </label>
                          <Tooltip text="ظرفيت کل مخزن بر اساس اطلاعات ثبت شده در اطلاعات پايه محاسبه مي‌شود">
                            <input
                              type="text"
                              value={formatPersianNumber(getTankCapacity(newReceipt.tankId || ''))}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                            />
                          </Tooltip>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            جمع رسيدهاي مخزن در سايت
                          </label>
                          <Tooltip text="مجموع تمام رسیدهای ثبت شده در این مخزن و سایت (شامل تملیکی و امانی) به جز رسید فعلی">
                            <input
                              type="text"
                              value={formatPersianNumber(calculateTotalReceipts(newReceipt.siteId || '', newReceipt.tankId || '', editingReceipt || undefined))}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                            />
                          </Tooltip>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            جمع حواله هاي مخزن در سايت
                          </label>
                          <Tooltip text="مجموع تمام حواله‌هاي ثبت شده براي اين مخزن و سايت">
                            <input
                              type="text"
                              value={formatPersianNumber(calculateTotalOwnedDeliveries(newReceipt.siteId || '', newReceipt.tankId || ''))}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                            />
                          </Tooltip>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ظرفيت آزاد موجودي مخزن
                          </label>
                          <Tooltip text="ظرفيت کل مخزن منهاي (مجموع رسيدهاي مخزن به جز رسيد فعلي منهاي مجموع حواله‌هاي مخزن)">
                            <input
                              type="text"
                              value={formatPersianNumber(calculateRemainingCapacity(newReceipt.siteId || '', newReceipt.tankId || '', editingReceipt || undefined))}
                              readOnly
                              className={`w-full px-3 py-2 border rounded-lg ${
                                calculateRemainingCapacity(newReceipt.siteId || '', newReceipt.tankId || '', editingReceipt || undefined) < 0 
                                  ? 'bg-red-100 border-red-300 text-red-800' 
                                  : 'bg-green-100 border-green-300 text-green-800'
                              }`}
                            />
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                    
                    {/* Tank Capacity Information by Product Type - New Table */}
                    <div className="md:col-span-3 border-2 border-gray-400 rounded-lg p-4 bg-gray-100 mb-4">
                      <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <Warehouse className="h-5 w-5" />
                        اطلاعات ظرفيت مخزن با توجه به نوع کالا
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ظرفيت کل مخزن
                          </label>
                          <Tooltip text="ظرفيت کل مخزن بر اساس اطلاعات ثبت شده در اطلاعات پايه محاسبه مي‌شود">
                            <input
                              type="text"
                              value={formatPersianNumber(getTankCapacity(newReceipt.tankId || ''))}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                            />
                          </Tooltip>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            جمع رسيدهاي مخزن کالاي انتخابي در سايت
                          </label>
                          <Tooltip text="مجموع رسيدهاي ثبت شده براي کالاي انتخابي در اين مخزن و سايت به جز رسيد فعلي">
                            <input
                              type="text"
                              value={formatPersianNumber(calculateTotalReceiptsByProduct(newReceipt.siteId || '', newReceipt.tankId || '', newReceipt.productId || undefined, editingReceipt || undefined))}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                            />
                          </Tooltip>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            جمع حواله هاي مخزن کالاي انتخابي در سايت
                          </label>
                          <Tooltip text="مجموع حواله‌هاي ثبت شده براي کالاي انتخابي در اين مخزن و سايت">
                            <input
                              type="text"
                              value={formatPersianNumber(calculateTotalOwnedDeliveriesByProduct(newReceipt.siteId || '', newReceipt.tankId || '', newReceipt.productId || undefined))}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                            />
                          </Tooltip>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ظرفيت آزاد موجودي مخزن براي کالاي انتخابي
                          </label>
                          <Tooltip text="ظرفيت کل مخزن منهاي (مجموع رسيدهاي کالاي انتخابي به جز رسيد فعلي منهاي مجموع حواله‌هاي کالاي انتخابي)">
                            <input
                              type="text"
                              value={formatPersianNumber(calculateRemainingCapacityByProduct(newReceipt.siteId || '', newReceipt.tankId || '', newReceipt.productId || undefined, editingReceipt || undefined))}
                              readOnly
                              className={`w-full px-3 py-2 border rounded-lg ${
                                calculateRemainingCapacityByProduct(newReceipt.siteId || '', newReceipt.tankId || '', newReceipt.productId || undefined, editingReceipt || undefined) < 0 
                                  ? 'bg-red-100 border-red-300 text-red-800' 
                                  : 'bg-green-100 border-green-300 text-green-800'
                              }`}
                            />
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                {/* Weight Information Section */}
                <div className="md:col-span-3 border-2 border-blue-500 rounded-lg p-4 bg-blue-50 mb-4">
                  <h4 className="text-lg font-bold text-blue-800 mb-3">اطلاعات وزني</h4>
                  
                  {/* Receipt Basis - Added for owned receipts */}
                  {currentUserType === 'owned' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        مبناي رسيد <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newReceipt.receiptBasis || ''}
                        onChange={(e) => {
                          handleFieldChange('receiptBasis', e.target.value);
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.receiptBasis ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">انتخاب کنيد</option>
                        {baseData.receiptBasis?.map((basis: any) => (
                          <option key={basis.id} value={basis.id}>{basis.name}</option>
                        ))}
                      </select>
                      {errors.receiptBasis && (
                        <p className="text-red-500 text-xs mt-1">{errors.receiptBasis}</p>
                      )}
                    </div>
                  )}
                  
                  {/* Receipt Basis Amount - اصلاح شده برای هر دو نوع رسید (تملیکی و امانی) */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      مقدار مبناي رسيد
                    </label>
                    <Tooltip text="مقدار مبناي رسيد بر اساس مبناي انتخاب شده (بارنامه، آلج کشتي، شور تانک يا وزن ناخالص) به صورت سيستمي محاسبه مي‌شود">
                      <input
                        type="number"
                        value={newReceipt.receiptBasisAmount || ''}
                        readOnly
                        className="w-full px-3 py-2 border rounded-lg bg-gray-100"
                        placeholder="مقدار مبناي رسيد"
                      />
                    </Tooltip>
                    <div className="text-xs text-gray-500 mt-1">
                      مقدار بر اساس مبناي انتخاب شده به صورت سيستمي محاسبه مي‌شود
                    </div>
                    {errors.receiptBasisAmount && (
                      <p className="text-red-500 text-xs mt-1">{errors.receiptBasisAmount}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Bill of Lading Weight */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        وزن بارنامه (Bill of lading weight)
                      </label>
                      <input
                        type="number"
                        value={newReceipt.shipBillOfLadingAmount || ''}
                        onChange={(e) => {
                          const amount = parseFloat(e.target.value) || 0;
                          handleFieldChange('shipBillOfLadingAmount', amount);
                        }}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="مقدار بارنامه"
                      />
                    </div>
                    
                    {/* Ship Unloading Weight */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        وزن آلج کشتي (Ullage weight)
                      </label>
                      <input
                        type="number"
                        value={newReceipt.shipUnloadingAmount || ''}
                        onChange={(e) => {
                          const amount = parseFloat(e.target.value) || 0;
                          handleFieldChange('shipUnloadingAmount', amount);
                        }}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="مقدار به کيلوگرم"
                      />
                    </div>
                    
                    {/* Shore Tank Weight */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        وزن شور تانک (Shore tank)
                      </label>
                      <input
                        type="number"
                        value={newReceipt.tankShoreAmount || ''}
                        onChange={(e) => {
                          const amount = parseFloat(e.target.value) || 0;
                          handleFieldChange('tankShoreAmount', amount);
                        }}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="مقدار شور تانک"
                      />
                    </div>
                    
                    {/* Gross Weight */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        وزن ناخالص (Weight Gross)
                      </label>
                      <input
                        type="number"
                        value={newReceipt.weightGross || ''}
                        onChange={(e) => {
                          const amount = parseFloat(e.target.value) || 0;
                          handleFieldChange('weightGross', amount);
                        }}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="وزن ناخالص"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Wastage Products Table for Consignment Receipts - هميشه نمايش داده مي‌شود */}
                {currentUserType === 'consignment' && (
                  <div className="md:col-span-3 border-2 border-orange-500 rounded-lg p-4 bg-orange-50 mb-4">
                    <h4 className="text-lg font-bold text-orange-800 mb-3 flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      کالاهای تملیکی حاصل از افت
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-orange-100">
                            <th className="border border-orange-300 px-4 py-2 text-right text-sm font-medium text-orange-800">کد کالای تملیکی</th>
                            <th className="border border-orange-300 px-4 py-2 text-right text-sm font-medium text-orange-800">نام کالای تملیکی</th>
                            <th className="border border-orange-300 px-4 py-2 text-right text-sm font-medium text-orange-800">مقدار کالای تملیکی</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-orange-300 px-4 py-2 text-sm text-orange-900">
                              {newReceipt.gainedProductCode || '-'}
                            </td>
                            <td className="border border-orange-300 px-4 py-2 text-sm text-orange-900">
                              {newReceipt.gainedProductName || '-'}
                            </td>
                            <td className="border border-orange-300 px-4 py-2 text-sm text-orange-900">
                              {formatPersianNumber(newReceipt.gainedWeight || 0)} {newReceipt.unit}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {/* Product Name - اصلاح شده براي مشابهت با فيلد نام کشتي */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نام کالا {currentUserType === 'consignment' ? 'امانی' : 'تملیکی'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newReceipt.productId || ''}
                    onChange={(e) => {
                      const selectedProduct = (currentUserType === 'consignment' ? baseData.consignmentProducts : baseData.ownedProducts)?.find((p: any) => p.id === e.target.value);
                      if (selectedProduct) {
                        setNewReceipt(prev => ({
                          ...prev,
                          productId: selectedProduct.id,
                          productName: selectedProduct.name,
                          productCode: selectedProduct.code
                        }));
                        
                        // If it's a consignment product, also update the gained product info
                        if (currentUserType === 'consignment' && selectedProduct.code) {
                          const consignmentCode = selectedProduct.code || '';
                          const codeParts = consignmentCode.split('-');
                          const gainedProductCode = codeParts[0] || '';
                          
                          const ownedProduct = baseData.ownedProducts?.find((p: any) => p.code === gainedProductCode);
                          const gainedProductName = ownedProduct?.name || '';
                          
                          setNewReceipt(prev => ({
                            ...prev,
                            gainedProductCode: gainedProductCode,
                            gainedProductName: gainedProductName
                          }));
                        }
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.productId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">انتخاب کنيد</option>
                    {(currentUserType === 'consignment' ? (baseData.consignmentProducts || []) : (baseData.ownedProducts || []))?.map((product: any) => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                  {errors.productId && (
                    <p className="text-red-500 text-xs mt-1">{errors.productId}</p>
                  )}
                </div>
                
                {/* Site - اصلاح شده براي مشابهت با فيلد نام کشتي */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    سايت مخازن <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newReceipt.siteId || ''}
                    onChange={(e) => {
                      const selectedSite = baseData.sites?.find((site: any) => site.id === e.target.value);
                      if (selectedSite) {
                        setNewReceipt(prev => ({
                          ...prev,
                          siteId: selectedSite.id,
                          siteName: selectedSite.name
                        }));
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.siteId ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={!!newReceipt.contractId}
                  >
                    <option value="">انتخاب کنيد</option>
                    {(baseData.sites || [])?.map((site: any) => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                  {errors.siteId && (
                    <p className="text-red-500 text-xs mt-1">{errors.siteId}</p>
                  )}
                  {newReceipt.contractId && (
                    <p className="text-xs text-blue-600 mt-1">سايت از قرارداد دريافت شده</p>
                  )}
                </div>
                
                {/* Tank - اصلاح شده براي مشابهت با فيلد نام کشتي */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مخزن <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newReceipt.tankId || ''}
                    onChange={(e) => {
                      const selectedTank = baseData.tanks?.find((tank: any) => tank.id === e.target.value);
                      if (selectedTank) {
                        setNewReceipt(prev => ({
                          ...prev,
                          tankId: selectedTank.id,
                          tankName: selectedTank.name
                        }));
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.tankId ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={!!newReceipt.contractId}
                  >
                    <option value="">انتخاب کنيد</option>
                    {(baseData.tanks || [])?.map((tank: any) => (
                      <option key={tank.id} value={tank.id}>{tank.name}</option>
                    ))}
                  </select>
                  {errors.tankId && (
                    <p className="text-red-500 text-xs mt-1">{errors.tankId}</p>
                  )}
                  {newReceipt.contractId && (
                    <p className="text-xs text-blue-600 mt-1">مخزن از قرارداد دريافت شده</p>
                  )}
                </div>
                
                {/* Unit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">واحد</label>
                  <select
                    value={newReceipt.unit || 'kg'}
                    onChange={(e) => handleFieldChange('unit', e.target.value as 'kg' | 'ton')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="kg">کيلوگرم</option>
                    <option value="ton">تن</option>
                  </select>
                </div>
                
                {/* Receipt Date and Due Date */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Receipt Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تاريخ رسيد <span className="text-red-500">*</span>
                    </label>
                    {contractInfo && (
                      <div className="text-xs text-blue-600 mb-1">
                        بازه مجاز: {formatPersianDate(contractInfo.startDate)} تا {formatPersianDate(contractInfo.endDate)}
                      </div>
                    )}
                    <PersianDatePicker
                      value={newReceipt.receiptDate}
                      onChange={(date) => {
                        if (!isValidDate(date)) {
                          console.error("Invalid date selected:", date);
                          return;
                        }
                        
                        // بررسی تاریخ در بازه قرارداد
                        if (currentUserType === 'consignment' && newReceipt.contractId) {
                          if (!validateConsignmentTransactionDate(newReceipt.contractId, date)) {
                            setErrors(prev => ({
                              ...prev,
                              receiptDate: 'تاریخ رسید باید در بازه زمانی قرارداد باشد'
                            }));
                          } else {
                            setErrors(prev => {
                              const newErrors = {...prev};
                              delete newErrors.receiptDate;
                              return newErrors;
                            });
                          }
                        }
                        
                        handleFieldChange('receiptDate', date);
                        
                        const updatedReceipt = { ...newReceipt, receiptDate: date };
                        
                        if (currentUserType === 'consignment') {
                          try {
                            const dueDate = calculateDueDate(date);
                            if (isValidDate(dueDate)) {
                              updatedReceipt.dueDate = dueDate;
                            } else {
                              const defaultDate = new Date();
                              defaultDate.setMonth(defaultDate.getMonth() + 1);
                              updatedReceipt.dueDate = defaultDate;
                            }
                          } catch (error) {
                            console.error("Error calculating due date:", error);
                            const defaultDate = new Date();
                            defaultDate.setMonth(defaultDate.getMonth() + 1);
                            updatedReceipt.dueDate = defaultDate;
                          }
                        }
                        
                        setNewReceipt(updatedReceipt);
                      }}
                      placeholder="انتخاب تاریخ"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.receiptDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.receiptDate && (
                      <p className="text-red-500 text-xs mt-1">{errors.receiptDate}</p>
                    )}
                  </div>
                  
                  {/* Due Date (only for consignment) */}
                  {currentUserType === 'consignment' && newReceipt.receiptDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        تاريخ سررسيد
                      </label>
                      <input
                        type="text"
                        value={newReceipt.dueDate && isValidDate(newReceipt.dueDate) ? formatPersianDate(newReceipt.dueDate) : ''}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                        placeholder="محاسبه خودکار"
                      />
                      {errors.dueDate && (
                        <p className="text-red-500 text-xs mt-1">{errors.dueDate}</p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Ship Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نام کشتي
                  </label>
                  <select
                    value={baseData.shipNames?.find((ship: any) => ship.id === newReceipt.shipId)?.id || ''}
                    onChange={(e) => {
                      const selectedShip = baseData.shipNames?.find((ship: any) => ship.id === e.target.value);
                      handleFieldChange('shipId', selectedShip?.id || '');
                      handleFieldChange('shipName', selectedShip?.name || '');
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">انتخاب کنيد</option>
                    {baseData.shipNames?.map((ship: any) => (
                      <option key={ship.id} value={ship.id}>{ship.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Cotage Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    شماره کوتاژ
                  </label>
                  <select
                    value={baseData.cotageNumbers?.find((cotage: any) => cotage.id === newReceipt.cotageId)?.id || ''}
                    onChange={(e) => {
                      const selectedCotage = baseData.cotageNumbers?.find((cotage: any) => cotage.id === e.target.value);
                      handleFieldChange('cotageId', selectedCotage?.id || '');
                      handleFieldChange('cotageNumber', selectedCotage?.name || '');
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">انتخاب کنيد</option>
                    {baseData.cotageNumbers?.map((cotage: any) => (
                      <option key={cotage.id} value={cotage.id}>{cotage.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Index Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    شماره شاخص/ثبت سفارش
                  </label>
                  <select
                    value={baseData.indexNumbers?.find((index: any) => index.id === newReceipt.indexId)?.id || ''}
                    onChange={(e) => {
                      const selectedIndex = baseData.indexNumbers?.find((index: any) => index.id === e.target.value);
                      handleFieldChange('indexId', selectedIndex?.id || '');
                      handleFieldChange('indexNumber', selectedIndex?.name || '');
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">انتخاب کنيد</option>
                    {baseData.indexNumbers?.map((index: any) => (
                      <option key={index.id} value={index.id}>{index.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Driver */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    راننده گان
                  </label>
                  <select
                    value={baseData.drivers?.find((driver: any) => driver.id === newReceipt.driverId)?.id || ''}
                    onChange={(e) => {
                      const selectedDriver = baseData.drivers?.find((driver: any) => driver.id === e.target.value);
                      handleFieldChange('driverId', selectedDriver?.id || '');
                      handleFieldChange('driverName', selectedDriver?.name || '');
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">انتخاب کنيد</option>
                    {baseData.drivers?.map((driver: any) => (
                      <option key={driver.id} value={driver.id}>{driver.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Internal Company */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نام شرکت داخلي
                  </label>
                  <select
                    value={baseData.internalCompany?.find((company: any) => company.id === newReceipt.internalCompanyName)?.id || ''}
                    onChange={(e) => {
                      const selectedCompany = baseData.internalCompany?.find((company: any) => company.id === e.target.value);
                      handleFieldChange('internalCompanyName', selectedCompany?.name || '');
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">انتخاب کنيد</option>
                    {baseData.internalCompany?.map((company: any) => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">توضيحات</label>
                  <textarea
                    value={newReceipt.notes || ''}
                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="توضيحات اختياري..."
                  />
                </div>

                {/* اطلاعات تکمیلی رسید انبار */}
                <div className="md:col-span-3 border border-dashed border-blue-300 rounded-lg p-4 bg-blue-50/40">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        checked={showReceiptExtraInfo || enforceReceiptExtraInfo[currentUserType === 'consignment' ? 'consignment' : 'owned']}
                        onChange={(e) => setShowReceiptExtraInfo(e.target.checked)}
                        disabled={enforceReceiptExtraInfo[currentUserType === 'consignment' ? 'consignment' : 'owned']}
                      />
                      <span>ثبت اطلاعات تکمیلی رسید انبار</span>
                      {enforceReceiptExtraInfo[currentUserType === 'consignment' ? 'consignment' : 'owned'] && (
                        <span className="text-xs text-red-600">(اجباری توسط تنظیمات عملکرد)</span>
                      )}
                    </label>
                  </div>

                  {(showReceiptExtraInfo || enforceReceiptExtraInfo[currentUserType === 'consignment' ? 'consignment' : 'owned']) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">نام راننده</label>
                        <input
                          type="text"
                          value={receiptExtraInfo.driverFirstName || ''}
                          onChange={(e) => setReceiptExtraInfo(prev => ({ ...prev, driverFirstName: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg ${receiptExtraInfoErrors.driverFirstName ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">نام خانوادگی راننده</label>
                        <input
                          type="text"
                          value={receiptExtraInfo.driverLastName || ''}
                          onChange={(e) => setReceiptExtraInfo(prev => ({ ...prev, driverLastName: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg ${receiptExtraInfoErrors.driverLastName ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">کد ملی راننده</label>
                        <input
                          type="text"
                          value={receiptExtraInfo.driverNationalId || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setReceiptExtraInfo(prev => ({ ...prev, driverNationalId: value }));
                          }}
                          maxLength={10}
                          className={`w-full px-3 py-2 border rounded-lg ${receiptExtraInfoErrors.driverNationalId ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">شماره بارنامه</label>
                        <input
                          type="text"
                          value={receiptExtraInfo.billOfLadingNumber || ''}
                          onChange={(e) => setReceiptExtraInfo(prev => ({ ...prev, billOfLadingNumber: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg ${receiptExtraInfoErrors.billOfLadingNumber ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">شماره پلاک</label>
                        <input
                          type="text"
                          value={receiptExtraInfo.plateNumber || ''}
                          onChange={(e) => setReceiptExtraInfo(prev => ({ ...prev, plateNumber: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg ${receiptExtraInfoErrors.plateNumber ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">وزن (مبنا)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={receiptExtraInfo.weight ?? (newReceipt.receiptBasisAmount || 0)}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            const weight = parseFloat(value) || 0;
                            setReceiptExtraInfo(prev => ({ ...prev, weight }));
                            // همگام‌سازی با مقدار مبناي رسيد - فقط در صورت ویرایش دستی
                            // اگر وزن تغییر کرد، مقدار مبناي رسيد را نیز به‌روزرسانی کن
                            setNewReceipt(prev => ({ ...prev, receiptBasisAmount: weight }));
                          }}
                          onKeyPress={(e) => {
                            if (!/[0-9.]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-lg ${receiptExtraInfoErrors.weight ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">مبلغ بارنامه</label>
                        <input
                          type="number"
                          step="0.01"
                          value={receiptExtraInfo.billAmount ?? ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            setReceiptExtraInfo(prev => ({ ...prev, billAmount: parseFloat(value) || 0 }));
                          }}
                          onKeyPress={(e) => {
                            if (!/[0-9.]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-lg ${receiptExtraInfoErrors.billAmount ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">مبدا بارنامه</label>
                        <input
                          type="text"
                          value={receiptExtraInfo.origin || ''}
                          onChange={(e) => setReceiptExtraInfo(prev => ({ ...prev, origin: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg ${receiptExtraInfoErrors.origin ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ بارنامه</label>
                        <PersianDatePicker
                          value={receiptExtraInfo.billDate || newReceipt.receiptDate}
                          onChange={(date) => {
                            if (date && isValidDate(date)) {
                              setReceiptExtraInfo(prev => ({ ...prev, billDate: date }));
                            }
                          }}
                          placeholder="انتخاب تاریخ"
                          className={`w-full px-3 py-2 border rounded-lg ${receiptExtraInfoErrors.billDate ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">شرکت حمل و نقل</label>
                        <input
                          type="text"
                          value={receiptExtraInfo.transportCompany || ''}
                          onChange={(e) => setReceiptExtraInfo(prev => ({ ...prev, transportCompany: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg ${receiptExtraInfoErrors.transportCompany ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">شماره موبایل راننده</label>
                        <input
                          type="text"
                          value={receiptExtraInfo.driverMobile || ''}
                          onChange={(e) => setReceiptExtraInfo(prev => ({ ...prev, driverMobile: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg ${receiptExtraInfoErrors.driverMobile ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">آدرس مبدا</label>
                        <input
                          type="text"
                          value={receiptExtraInfo.originAddress || ''}
                          onChange={(e) => setReceiptExtraInfo(prev => ({ ...prev, originAddress: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg ${receiptExtraInfoErrors.originAddress ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">مبلغ پشت بارنامه</label>
                        <input
                          type="number"
                          step="0.01"
                          value={receiptExtraInfo.backBillAmount ?? ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            setReceiptExtraInfo(prev => ({ ...prev, backBillAmount: parseFloat(value) || 0 }));
                          }}
                          onKeyPress={(e) => {
                            if (!/[0-9.]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-lg ${receiptExtraInfoErrors.backBillAmount ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">کدپستی مبدا</label>
                        <input
                          type="text"
                          value={receiptExtraInfo.originPostalCode || ''}
                          onChange={(e) => setReceiptExtraInfo(prev => ({ ...prev, originPostalCode: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg ${receiptExtraInfoErrors.originPostalCode ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {errors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{errors.general}</p>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving || !!(contractRemainderWarning || tankCapacityWarning)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'در حال ذخيره...' : 'ذخيره رسيد'}
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  انصراف
                </button>
              </div>
            </div>
          )}

          {/* نمایش/عدم نمایش پکیج موجودی و فیلترها */}
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              checked={showInventoryPackage}
              onChange={(e) => setShowInventoryPackage(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="text-sm text-gray-700">نمایش پکیج موجودی مخازن و فیلترها</label>
          </div>

          {showInventoryPackage && (
            <React.Fragment>
              {/* فیلترهای گزارش موجودی */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline ml-1" />
                    تا تاریخ
                  </label>
                  <PersianDatePicker
                    value={upToDate}
                    onChange={(date) => {
                      if (date) {
                        setUpToDate(date);
                      }
                    }}
                    placeholder="تاریخ را انتخاب کنید"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Building2 className="w-4 h-4 inline ml-1" />
                    نام مخزن
                  </label>
                  <select
                    value={selectedTankForFilter}
                    onChange={(e) => setSelectedTankForFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">تمام مخازن</option>
                    {uniqueTanks.map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Truck className="w-4 h-4 inline ml-1" />
                    سایت مخازن
                  </label>
                  <select
                    value={selectedSiteForFilter}
                    onChange={(e) => setSelectedSiteForFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">تمام سایت‌ها</option>
                    {uniqueSites.map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => setUpToDate(new Date())}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Clock className="w-4 h-4" />
                    امروز
                  </button>
                  <button
                    onClick={() => {
                      setUpToDate(new Date());
                      setSelectedTankForFilter('');
                      setSelectedSiteForFilter('');
                    }}
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    بازنشانی فیلترها
                  </button>
                </div>
              </div>

              {/* جداول موجودی مخازن */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Table 1: موجودی مخازن امانی و تملیکی */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden lg:col-span-2">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
                <h2 className="text-xl font-semibold">موجودی مخازن امانی و تملیکی</h2>
              </div>
              <div className="p-4 space-y-4">
                {/* نتایج محاسبات */}
                <div className="bg-gray-50 rounded-lg p-4">
                  {(() => {
                    // استفاده از فیلترهای انتخاب شده برای محاسبه موجودی
                    const inventory = calculateConsignmentOwnedTanksInventory(selectedSiteForFilter || undefined, selectedTankForFilter || undefined);
                    // محاسبه ظرفیت کل بر اساس فیلترهای انتخاب شده
                    const totalCapacity = calculateTotalTankCapacity(selectedSiteForFilter || undefined, selectedTankForFilter || undefined);
                    // محاسبه ظرفیت خالی: ظرفیت - موجودی نهایی
                    const emptyCapacity = Math.max(0, totalCapacity - inventory.finalInventory);
                    
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex justify-between">
                          <span>رسیدهای تملیکی:</span>
                          <span className="font-semibold">{formatPersianNumber(inventory.ownedReceiptsAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>سند اضافه تملیکی:</span>
                          <span className="font-semibold">{formatPersianNumber(inventory.ownedAdditionDocuments)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>حواله‌های تملیکی:</span>
                          <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.ownedDeliveries)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>افزودن به تملیکی از محل افت:</span>
                          <span className="font-semibold">{formatPersianNumber(inventory.ownedGainedAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>سند کسر تملیکی:</span>
                          <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.ownedDeductionDocuments)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>رسیدهای امانی:</span>
                          <span className="font-semibold">{formatPersianNumber(inventory.consignmentReceiptsAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>سند اضافه امانی:</span>
                          <span className="font-semibold">{formatPersianNumber(inventory.consignmentAdditions)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>حواله‌های امانی:</span>
                          <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.consignmentDeliveries)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>کسر از امانی از محل افت:</span>
                          <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.consignmentDeductionAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>سند کسر امانی:</span>
                          <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.consignmentDeductionDocuments)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>کالای مصرفی امانی:</span>
                          <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.consignmentConsumedProducts || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>کالای تولیدی امانی:</span>
                          <span className="font-semibold text-green-600">+{formatPersianNumber(inventory.consignmentProducedProducts || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>کالای مصرفی تملیکی:</span>
                          <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.ownedConsumedProducts || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>کالای تولیدی تملیکی:</span>
                          <span className="font-semibold text-green-600">+{formatPersianNumber(inventory.ownedProducedProducts || 0)}</span>
                        </div>
                        <hr className="col-span-full border-gray-300" />
                        {/* ظرفیت مخازن */}
                        <div className="flex justify-between text-lg font-bold text-blue-900 col-span-full">
                          <span>ظرفیت مخازن:</span>
                          <span>{formatPersianNumber(totalCapacity)}</span>
                        </div>
                        {/* موجودی نهایی */}
                        <div className="flex justify-between text-lg font-bold text-green-900 col-span-full">
                          <span>موجودی نهایی (امانی + تملیکی):</span>
                          <span>{formatPersianNumber(inventory.finalInventory || 0)}</span>
                        </div>
                        {/* ظرفیت خالی مخازن */}
                        <div className="flex justify-between text-lg font-bold text-orange-900 col-span-full">
                          <span>ظرفیت خالی مخازن:</span>
                          <span>{formatPersianNumber(emptyCapacity)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Table 2: موجودی مخازن امانی */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4">
                <h2 className="text-xl font-semibold">موجودی مخازن امانی</h2>
              </div>
              <div className="p-4">
                {(() => {
                  const inventory = calculateConsignmentTanksInventory();
                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>رسیدهای امانی:</span>
                        <span className="font-semibold">{formatPersianNumber(inventory.consignmentReceiptsAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>سند اضافه امانی:</span>
                        <span className="font-semibold">{formatPersianNumber(inventory.consignmentAdditions)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>حواله‌های امانی:</span>
                        <span className="font-semibold">-{formatPersianNumber(inventory.consignmentDeliveries)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>کسر از امانی از محل افت:</span>
                        <span className="font-semibold">-{formatPersianNumber(inventory.consignmentDeductionAmount)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>سند کسر امانی:</span>
                        <span className="font-semibold">-{formatPersianNumber(inventory.consignmentDeductionDocuments)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>کالای مصرفی امانی:</span>
                        <span className="font-semibold">-{formatPersianNumber(inventory.consignmentConsumedProducts || 0)}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>کالای تولیدی امانی:</span>
                        <span className="font-semibold">+{formatPersianNumber(inventory.consignmentProducedProducts || 0)}</span>
                      </div>
                      <hr className="border-green-300" />
                      <div className="flex justify-between text-lg font-bold text-green-900">
                        <span>موجودی نهایی (امانی):</span>
                        <span>{formatPersianNumber(inventory.finalInventory)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Table 3: موجودی مخازن تملیکی */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4">
                <h2 className="text-xl font-semibold">موجودی مخازن تملیکی</h2>
              </div>
              <div className="p-4">
                {(() => {
                  const inventory = calculateOwnedTanksInventory();
                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>رسیدهای تملیکی:</span>
                        <span className="font-semibold">{formatPersianNumber(inventory.ownedReceiptsAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>سند اضافه تملیکی:</span>
                        <span className="font-semibold">{formatPersianNumber(inventory.ownedAdditionDocuments)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>حواله‌های تملیکی:</span>
                        <span className="font-semibold">-{formatPersianNumber(inventory.ownedDeliveries)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>افزودن به تملیکی از محل افت:</span>
                        <span className="font-semibold">{formatPersianNumber(inventory.ownedGainedAmount)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>سند کسر تملیکی:</span>
                        <span className="font-semibold">-{formatPersianNumber(inventory.ownedDeductionDocuments)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>کالای مصرفی تملیکی:</span>
                        <span className="font-semibold">-{formatPersianNumber(inventory.ownedConsumedProducts || 0)}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>کالای تولیدی تملیکی:</span>
                        <span className="font-semibold">+{formatPersianNumber(inventory.ownedProducedProducts || 0)}</span>
                      </div>
                      <hr className="border-purple-300" />
                      <div className="flex justify-between text-lg font-bold text-purple-900">
                        <span>موجودی نهایی (تملیکی):</span>
                        <span>{formatPersianNumber(inventory.finalInventory)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
            </React.Fragment>
          )}
          
          {/* لیست رسیدهای انبار */}
          <div className="bg-white rounded-xl border border-gray-200 mt-6">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">لیست رسیدهای انبار</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showExtraInfoInTable}
                      onChange={(e) => setShowExtraInfoInTable(e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">نمایش اطلاعات تکمیلی</span>
                  </label>
                </div>
                <button
                  onClick={() => setIsReceiptListMinimized(!isReceiptListMinimized)}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {isReceiptListMinimized ? (
                    <>
                      <Maximize2 className="h-4 w-4" />
                      <span>باز کردن</span>
                    </>
                  ) : (
                    <>
                      <Minimize2 className="h-4 w-4" />
                      <span>جمع کردن</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            {!isReceiptListMinimized && (
              <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestSort('transactionNumber')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          شماره تراکنش
                          {getSortDirectionIcon('transactionNumber')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestSort('userType')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          نوع کاربري
                          {getSortDirectionIcon('userType')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestSort('counterpartyName')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          طرف حساب
                          {getSortDirectionIcon('counterpartyName')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestSort('contractNumber')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          شماره قرارداد
                          {getSortDirectionIcon('contractNumber')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestSort('receiptBasisAmount')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          مقدار مبناي رسيد
                          {getSortDirectionIcon('receiptBasisAmount')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestSort('siteName')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          سايت مخازن
                          {getSortDirectionIcon('siteName')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestSort('tankName')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          نام مخزن
                          {getSortDirectionIcon('tankName')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestSort('productName')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          نام کالا
                          {getSortDirectionIcon('productName')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestSort('receiptDate')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          تاريخ رسيد
                          {getSortDirectionIcon('receiptDate')}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        افت
                      </th>
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestSort('status')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          وضعيت
                          {getSortDirectionIcon('status')}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        عمليات
                      </th>
                      {showExtraInfoInTable && (
                        <>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نام راننده</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نام خانوادگی راننده</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">کد ملی راننده</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">شماره بارنامه</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">شماره پلاک</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">وزن (مبنا)</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">مبلغ بارنامه</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">مبدا بارنامه</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاریخ بارنامه</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">شرکت حمل و نقل</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">شماره موبایل راننده</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">آدرس مبدا</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">مبلغ پشت بارنامه</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">کدپستی مبدا</th>
                        </>
                      )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedReceipts.map((receipt, index) => {
                  const isOverdue = receipt.userType === 'consignment' && checkDueStatus(receipt.dueDate);
                  const isSettled = receipt.invoiceStatus === 'settled';
                  const hasWastage = Array.isArray(wastageTransactions) && wastageTransactions.some((t: any) => t.referenceId === receipt.id);
                  let rowColor = '';
                  
                  if (isSettled) {
                    rowColor = 'bg-blue-50';
                  } else if (isOverdue) {
                    rowColor = 'bg-yellow-100';
                  } else if (receipt.userType === 'consignment') {
                    rowColor = 'bg-green-50';
                  }
                  
                  return (
                    <tr key={receipt.id} className={`hover:bg-gray-50 ${rowColor} ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{receipt.transactionNumber}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          receipt.userType === 'consignment' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {receipt.userType === 'consignment' ? 'امانی' : 'تملیکی'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{receipt.counterpartyName || 'شرکت صنعت غذايي کورش'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{receipt.contractNumber || '-'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {receipt.receiptBasisAmount ? formatPersianNumber(receipt.receiptBasisAmount) : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{receipt.siteName}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{receipt.tankName}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{receipt.productName}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {isValidDate(receipt.receiptDate) ? formatPersianDate(receipt.receiptDate) : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${hasWastage ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-700'}`}>
                          {hasWastage ? 'دارد' : 'ندارد'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(receipt.status)}`}>
                          {getStatusText(receipt.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex flex-col gap-1">
                          {getNextStageText(receipt.status) && (
                            <button
                              onClick={() => {
                                if (receipt.status === 'finalized') {
                                  printReceipt(receipt);
                                  handleStatusChange(receipt.id, 'printed');
                                } else {
                                  handleStatusChange(receipt.id, getNextStatus(receipt.status));
                                }
                              }}
                              className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors flex items-center gap-1"
                            >
                              {receipt.status === 'finalized' ? <Printer className="h-3 w-3" /> : <Save className="h-3 w-3" />}
                              {getNextStageText(receipt.status)}
                            </button>
                          )}
                          {receipt.status !== 'draft' && (
                            <button
                              onClick={() => handleBackToPreviousStage(receipt.id)}
                              className="bg-orange-600 text-white px-2 py-1 rounded text-xs hover:bg-orange-700 transition-colors flex items-center gap-1"
                            >
                              <ArrowLeft className="h-3 w-3" />
                              برگشت/ويرايش
                            </button>
                          )}
                          {receipt.status === 'draft' && (
                            <button
                              onClick={() => handleEdit(receipt.id)}
                              className="bg-yellow-600 text-white px-2 py-1 rounded text-xs hover:bg-yellow-700 transition-colors flex items-center gap-1"
                            >
                              <Edit2 className="h-3 w-3" />
                              ويرايش
                            </button>
                          )}
                          {receipt.status === 'printed' && (
                            <button
                              onClick={() => printReceipt(receipt)}
                              className="bg-gray-600 text-white px-2 py-1 rounded text-xs hover:bg-gray-700 transition-colors flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              پيش‌نمايز
                            </button>
                          )}
                          {(receipt.status === 'finalized' || receipt.status === 'printed') && (
                            <button
                              onClick={() => {
                                if (confirm('آیا از درخواست اصلاحیه برای این رسید اطمینان دارید؟')) {
                                  alert('درخواست اصلاحیه ثبت شد. این رسید برای اصلاح برگشت داده خواهد شد.');
                                  handleStatusChange(receipt.id, 'draft');
                                }
                              }}
                              className="bg-orange-600 text-white px-2 py-1 rounded text-xs hover:bg-orange-700 transition-colors flex items-center gap-1"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              درخواست اصلاحیه
                            </button>
                          )}
                          {receipt.status === 'draft' && (
                            <button
                              onClick={() => handleDelete(receipt.id)}
                              className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition-colors flex items-center gap-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              حذف
                            </button>
                          )}
                        </div>
                      </td>
                      {showExtraInfoInTable && (() => {
                        const extraInfo = receipt.additionalInfo || {};
                        return (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{extraInfo.driverFirstName || '-'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{extraInfo.driverLastName || '-'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{extraInfo.driverNationalId || '-'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{extraInfo.billOfLadingNumber || '-'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{extraInfo.plateNumber || '-'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">
                                {extraInfo.weight ? formatPersianNumber(extraInfo.weight) : '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">
                                {extraInfo.billAmount ? formatPersianNumber(extraInfo.billAmount) : '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{extraInfo.origin || '-'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">
                                {extraInfo.billDate && isValidDate(extraInfo.billDate) ? formatPersianDate(extraInfo.billDate) : '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{extraInfo.transportCompany || '-'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{extraInfo.driverMobile || '-'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{extraInfo.originAddress || '-'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">
                                {extraInfo.backBillAmount ? formatPersianNumber(extraInfo.backBillAmount) : '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{extraInfo.originPostalCode || '-'}</span>
                            </td>
                          </>
                        );
                      })()}
                    </tr>
                  );
                })}
              </tbody>
              {/* Table Footer with Column Totals */}
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-6 py-3 text-right text-sm font-medium text-gray-900" colSpan={4}>
                    جمع کل:
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-blue-600">
                    {formatPersianNumber(columnTotals.receiptBasisAmountTotal)}
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-gray-900" colSpan={4}>
                    مجموع نهايي:
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-green-600">
                    {formatPersianNumber(columnTotals.finalAmountTotal)}
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-gray-900" colSpan={2}></td>
                </tr>
              </tfoot>
              </table>
              {sortedReceipts.length === 0 && (
                <div className="p-12 text-center">
                  <div className="text-gray-400 mb-4">
                    <FileText className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">رسيدي يافت نشد</h3>
                  <p className="text-gray-600">
                    {searchTerm ? 'نتيجه اي براي جستجوي شما يافت نشد.' : 'هنوز رسيدي ثبت نشده است.'}
                  </p>
                </div>
              )}
            </div>
          )}
          {isReceiptListMinimized && (
            <div className="p-4">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">شماره تراکنش</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نوع کاربري</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">طرف حساب</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">شماره قرارداد</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">مقدار مبناي رسيد</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">سايت مخازن</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نام مخزن</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نام کالا</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ رسيد</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">وضعيت</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">افت</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">عمليات</th>
                  </tr>
                </thead>
              </table>
            </div>
          )}
        </div>
        
        {/* Wastage Transactions Table */}
        <div className="bg-white rounded-xl border border-gray-200 mt-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">تراکنش‌هاي افت کالاي اماني</h3>
                </div>
              </div>
              <button
                onClick={() => setIsWastageTableMinimized(!isWastageTableMinimized)}
                className="flex items-center gap-2 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {isWastageTableMinimized ? (
                  <>
                    <Maximize2 className="h-4 w-4" />
                    <span>باز کردن</span>
                  </>
                ) : (
                  <>
                    <Minimize2 className="h-4 w-4" />
                    <span>جمع کردن</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              نمایش تمام تراکنش‌های ثبت شده برای افت کالاهای امانی (شامل تراکنش‌های کسر از امانی و افزودن به تملیکی)
              <span className="text-xs text-blue-600 mr-2">
                (مجموع {sortedWastageTransactions.length} تراکنش)
              </span>
            </p>
            <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <p className="text-blue-800 text-sm font-medium">
                  توجه: برای هر رسید امانی حداکثر 2 تراکنش (یک تراکنش کسر از امانی و یک تراکنش افزودن به تملیکی) ثبت می‌شود.
                </p>
                <div className="flex items-center gap-2 mr-4">
                  <span className="text-blue-800 text-sm font-medium">افت اتوماتیک:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    automaticLossEnabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {automaticLossEnabled ? 'فعال' : 'غیرفعال'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {!isWastageTableMinimized && (
            <div className="p-6">
              <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestWastageSort('transactionNumber')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          شماره تراکنش
                          {getWastageSortDirectionIcon('transactionNumber')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestWastageSort('transactionType')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          نوع تراکنش
                          {getWastageSortDirectionIcon('transactionType')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestWastageSort('productCode')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          کد کالا
                          {getWastageSortDirectionIcon('productCode')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestWastageSort('productName')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          نام کالا
                          {getWastageSortDirectionIcon('productName')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestWastageSort('amount')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          مقدار
                          {getWastageSortDirectionIcon('amount')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestWastageSort('unit')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          واحد
                          {getWastageSortDirectionIcon('unit')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestWastageSort('siteName')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          سايت
                          {getWastageSortDirectionIcon('siteName')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestWastageSort('tankName')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          مخزن
                          {getWastageSortDirectionIcon('tankName')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestWastageSort('transactionDate')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          تاريخ تراکنش
                          {getWastageSortDirectionIcon('transactionDate')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestWastageSort('referenceType')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          مرجع
                          {getWastageSortDirectionIcon('referenceType')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestWastageSort('receiptTransactionNumber')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          شماره تراکنش رسيد انبار
                          {getWastageSortDirectionIcon('receiptTransactionNumber')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestWastageSort('contractNumber')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          شماره قرارداد
                          {getWastageSortDirectionIcon('contractNumber')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestWastageSort('counterpartyName')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          طرف حساب
                          {getWastageSortDirectionIcon('counterpartyName')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => requestWastageSort('description')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          توضيحات
                          {getWastageSortDirectionIcon('description')}
                        </div>
                      </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedWastageTransactions.map((transaction, index) => (
                    <tr key={transaction.id} className={`hover:bg-gray-50 ${
                      transaction.transactionType === 'consignment' ? 'bg-red-50' : 'bg-green-50'
                    } ${index % 2 === 0 ? '' : 'bg-gray-50'}`}>
                      <td className="px-4 py-3 text-sm text-gray-900">{transaction.transactionNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          transaction.transactionType === 'consignment' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {transaction.transactionType === 'consignment' ? 'کسر از امانی' : 'افزودن به تملیکی'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{transaction.productCode}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{transaction.productName}</td>
                      <td className={`px-4 py-3 text-sm font-medium ${
                        transaction.amount < 0 ? 'text-red-900' : 'text-green-900'
                      }`}>
                        {formatPersianNumber(Math.abs(transaction.amount))}
                        {transaction.amount < 0 && <span className="text-red-500 mr-1">-</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{transaction.unit === 'kg' ? 'کيلوگرم' : 'تن'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{transaction.siteName}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{transaction.tankName}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {isValidDate(new Date(transaction.transactionDate)) ? formatPersianDate(new Date(transaction.transactionDate)) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{transaction.referenceType}</td>
                      {/* ستون‌هاي جديد - منتقل شده به اين موقعيت */}
                      <td className="px-4 py-3 text-sm text-gray-900">{transaction.receiptTransactionNumber || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{transaction.contractNumber || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{transaction.counterpartyName || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{transaction.description}</td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
              {sortedWastageTransactions.length === 0 && (
                <div className="p-12 text-center">
                  <div className="text-gray-400 mb-4">
                    <TrendingUp className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">تراکنشي يافت نشد</h3>
                  <p className="text-gray-600">هنوز تراکنش افت کالاي اماني ثبت نشده است.</p>
                </div>
              )}
            </div>
          )}
          {isWastageTableMinimized && (
            <div className="p-4">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">شماره تراکنش</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">نوع تراکنش</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">کد کالا</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">نام کالا</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">مقدار</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">واحد</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">سايت</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">مخزن</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ تراکنش</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">مرجع</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">شماره تراکنش رسيد انبار</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">شماره قرارداد</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">طرف حساب</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">توضيحات</th>
                  </tr>
                </thead>
              </table>
            </div>
          )}
        </div>

        {/* Analytics and Charts Section */}
        <div className="mt-8 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">گزارش تحليلي رسيدهاي انبار</h3>
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">جمع خالص رسیدهای تملیکی</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatPersianNumber(
                        receipts.filter(r => r.userType === 'owned').reduce((sum, r) => sum + (r.receiptBasisAmount || 0), 0) +
                        wastageTransactions
                          .filter(t => t.transactionType === 'owned')
                          .reduce((sum, t) => sum + Math.abs(t.amount), 0)
                      )}
                    </p>
                    <p className="text-xs text-blue-600">کيلوگرم</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">جمع خالص رسيدهاي اماني</p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatPersianNumber(
                        receipts.filter(r => r.userType === 'consignment').reduce((sum, r) => sum + (r.receiptBasisAmount || 0), 0) -
                        wastageTransactions
                          .filter(t => t.transactionType === 'consignment')
                          .reduce((sum, t) => sum + Math.abs(t.amount), 0)
                      )}
                    </p>
                    <p className="text-xs text-green-600">کيلوگرم</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">تعداد کل رسيدها</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatPersianNumber(receipts.length)}
                    </p>
                    <p className="text-xs text-purple-600">رسيد</p>
                  </div>
                  <FileText className="h-8 w-8 text-purple-600" />
                </div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-600">تعداد تراکنش‌هاي افت</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {formatPersianNumber(wastageTransactions.length)}
                    </p>
                    <p className="text-xs text-yellow-600">تراکنش</p>
                  </div>
                  <Activity className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
            </div>
            
            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InventoryChart 
                data={analyticsData.inventoryByType} 
                title="توزیع موجودی بر اساس نوع کالا" 
                type="pie" 
                showValues={true} 
              />
              <InventoryChart 
                data={analyticsData.statusDistribution} 
                title="توزیع وضعیت رسیدها" 
                type="bar" 
                showValues={true} 
              />
            </div>
          </div>
        </div>
        </div>
          
        {/* Tree Inventory Report */}
        <TreeInventoryReport 
          receipts={receipts} 
          baseData={baseData} 
          wastageTransactions={wastageTransactions}
          deliveries={deliveries}
        />
      </div>
    </div>
  );
};
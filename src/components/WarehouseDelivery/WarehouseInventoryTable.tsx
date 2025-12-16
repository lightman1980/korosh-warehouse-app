// src/components/Warehouse/WarehouseInventoryTable.tsx

import React, { useMemo, useState } from 'react';
import { formatPersianNumber } from '../../utils/persian';
import { DataStorage } from '../../utils/dataStorage';
import { Package, Warehouse, Search, TrendingUp, Users, FileText, AlertCircle } from 'lucide-react';

interface WarehouseInventoryTableProps {
  // این را دیگر استفاده نمی‌شود و داده‌ها مستقیماً از DataStorage خوانده می‌شوند
  // اما برای حفظ سازگاری باقی می‌ماند.
  inventory?: any[];
}

const WarehouseInventoryTable: React.FC<WarehouseInventoryTableProps> = ({ inventory: propInventory }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // محاسبه موجودی بر اساس تراکنش‌ها با فرمول‌های مشخص شده
  const calculatedInventory = useMemo(() => {
    const storage = DataStorage.getInstance();
    const receipts = storage.loadData('receipts') || [];
    const consignmentSlips = storage.loadData('consignment-delivery-slips') || [];
    const ownershipSlips = storage.loadData('ownership-delivery-slips') || [];
    const tankAdjustmentSlips = storage.loadData('tank-adjustment-slips') || [];
    const inventoryAdjustments = storage.loadData('inventoryAdjustments') || [];
    
    const inventoryMap = new Map();
    
    // ردیابی رسیدهای انبار
    receipts.forEach((receipt: any) => {
      if (receipt.isVoided) return;
      
      const key = `${receipt.siteId}-${receipt.tankId}`;
      if (!inventoryMap.has(key)) {
        inventoryMap.set(key, {
          siteId: receipt.siteId,
          siteName: receipt.siteName,
          tankId: receipt.tankId,
          tankName: receipt.tankName,
          capacity: receipt.tankCapacity || 0,
          // مقادیر اولیه بر اساس فرمول‌ها
          consignmentInventory: 0, // موجودی امانی
          ownedInventory: 0, // موجودی تملیکی
          combinedInventory: 0, // موجودی تجمیعی
          emptyCapacity: receipt.tankCapacity || 0, // ظرفیت خالی
          products: {},
          consignmentProducts: {},
          ownedProducts: {},
          // اضافه کردن متغیرهای کمکی برای محاسبه دقیق ظرفیت خالی
          totalReceipts: 0,
          totalConsignmentDeliveries: 0,
          totalOwnershipDeliveries: 0,
          totalTankAdditions: 0,
          totalTankDeductions: 0,
          totalInventoryAdditions: 0,
          totalInventoryDeductions: 0,
          totalConsignmentLosses: 0
        });
      }
      
      const tank = inventoryMap.get(key);
      
      // فرمول موجودی امانی: (تمامی رسیدهای انبار امانی + تمامی سندهای اضافه انبار امانی) - (تمامی حواله‌های انبار امانی + تمامی سندهای کسر انبار امانی)
      if (receipt.userType === 'consignment') {
        tank.consignmentInventory += receipt.amount || 0;
        if (!tank.consignmentProducts[receipt.productName]) {
          tank.consignmentProducts[receipt.productName] = { 
            amount: 0, 
            counterparty: receipt.counterpartyName, 
            contractNumber: receipt.contractNumber 
          };
        }
        tank.consignmentProducts[receipt.productName].amount += receipt.amount || 0;
      } 
      // فرمول موجودی تملیکی: (تمامی رسیدهای انبار تملیکی + تمامی سندهای اضافه انبار تملیکی) - (تمامی حواله‌های انبار تملیکی + تمامی سندهای کسر انبار تملیکی)
      else {
        tank.ownedInventory += receipt.amount || 0;
        if (!tank.ownedProducts[receipt.productName]) {
          tank.ownedProducts[receipt.productName] = 0;
        }
        tank.ownedProducts[receipt.productName] += receipt.amount || 0;
      }
      
      // فرمول موجودی تجمیعی: (تمامی رسیدهای انبار امانی و تملیکی + تمامی سندهای اضافه انبار امانی و تملیکی) - (تمامی حواله‌های انبار امانی و تملیکی + تمامی سندهای کسر انبار امانی و تملیکی)
      tank.combinedInventory += receipt.amount || 0;
      
      // برای محاسبه ظرفیت خالی: جمع تمامی رسیدها
      tank.totalReceipts += receipt.amount || 0;
      
      if (!tank.products[receipt.productName]) {
        tank.products[receipt.productName] = 0;
      }
      tank.products[receipt.productName] += receipt.amount || 0;
      
      // محاسبه افت‌های امانی
      if (receipt.userType === 'consignment') {
        tank.totalConsignmentLosses += Math.abs(receipt.wastageWeight || 0);
      }
    });
    
    // ردیابی حواله‌های امانی
    consignmentSlips.forEach((delivery: any) => {
      if (delivery.isVoided) return;
      
      const key = `${delivery.siteId}-${delivery.tankId}`;
      if (inventoryMap.has(key)) {
        const tank = inventoryMap.get(key);
        
        // فرمول موجودی امانی: کسر حواله‌های امانی
        tank.consignmentInventory -= delivery.amount || 0;
        if (tank.consignmentProducts[delivery.productName]) {
          tank.consignmentProducts[delivery.productName].amount -= delivery.amount || 0;
        }
        
        // فرمول موجودی تجمیعی: کسر تمامی حواله‌ها
        tank.combinedInventory -= delivery.amount || 0;
        
        // برای محاسبه ظرفیت خالی: جمع تمامی حواله‌ها
        tank.totalConsignmentDeliveries += delivery.amount || 0;
        
        if (tank.products[delivery.productName]) {
          tank.products[delivery.productName] -= delivery.amount || 0;
        }
      }
    });
    
    // ردیابی حواله‌های تملیکی
    ownershipSlips.forEach((delivery: any) => {
      if (delivery.isVoided) return;
      
      const key = `${delivery.siteId}-${delivery.tankId}`;
      if (inventoryMap.has(key)) {
        const tank = inventoryMap.get(key);
        
        // فرمول موجودی تملیکی: کسر حواله‌های تملیکی
        tank.ownedInventory -= delivery.amount || 0;
        if (tank.ownedProducts[delivery.productName]) {
          tank.ownedProducts[delivery.productName] -= delivery.amount || 0;
        }
        
        // فرمول موجودی تجمیعی: کسر تمامی حواله‌ها
        tank.combinedInventory -= delivery.amount || 0;
        
        // برای محاسبه ظرفیت خالی: جمع تمامی حواله‌ها
        tank.totalOwnershipDeliveries += delivery.amount || 0;
        
        if (tank.products[delivery.productName]) {
          tank.products[delivery.productName] -= delivery.amount || 0;
        }
      }
    });
    
    // ردیابی اسناد اضافه/کسر انبار (tank-adjustment-slips)
    tankAdjustmentSlips.forEach((doc: any) => {
      if (doc.isVoided) return;
      
      const key = `${doc.siteId}-${doc.tankId}`;
      if (inventoryMap.has(key)) {
        const tank = inventoryMap.get(key);
        
        if (doc.type === 'add') {
          // فرمول موجودی امانی: اضافه کردن سندهای اضافه انبار امانی
          if (doc.userType === 'consignment') {
            tank.consignmentInventory += doc.amount || 0;
            if (!tank.consignmentProducts[doc.productName]) {
              tank.consignmentProducts[doc.productName] = { 
                amount: 0, 
                counterparty: doc.counterpartyName, 
                contractNumber: doc.contractNumber 
              };
            }
            tank.consignmentProducts[doc.productName].amount += doc.amount || 0;
          } 
          // فرمول موجودی تملیکی: اضافه کردن سندهای اضافه انبار تملیکی
          else {
            tank.ownedInventory += doc.amount || 0;
            if (!tank.ownedProducts[doc.productName]) {
              tank.ownedProducts[doc.productName] = 0;
            }
            tank.ownedProducts[doc.productName] += doc.amount || 0;
          }
          
          // فرمول موجودی تجمیعی: اضافه کردن تمامی سندهای اضافه انبار
          tank.combinedInventory += doc.amount || 0;
          
          // برای محاسبه ظرفیت خالی: جمع تمامی اسناد اضافه
          tank.totalTankAdditions += doc.amount || 0;
        } 
        else if (doc.type === 'deduct') {
          // فرمول موجودی امانی: کسر سندهای کسر انبار امانی
          if (doc.userType === 'consignment') {
            tank.consignmentInventory -= doc.amount || 0;
            if (tank.consignmentProducts[doc.productName]) {
              tank.consignmentProducts[doc.productName].amount -= doc.amount || 0;
            }
          } 
          // فرمول موجودی تملیکی: کسر سندهای کسر انبار تملیکی
          else {
            tank.ownedInventory -= doc.amount || 0;
            if (tank.ownedProducts[doc.productName]) {
              tank.ownedProducts[doc.productName] -= doc.amount || 0;
            }
          }
          
          // فرمول موجودی تجمیعی: کسر تمامی سندهای کسر انبار
          tank.combinedInventory -= doc.amount || 0;
          
          // برای محاسبه ظرفیت خالی: جمع تمامی اسناد کسر
          tank.totalTankDeductions += doc.amount || 0;
        }
        
        if (!tank.products[doc.productName]) {
          tank.products[doc.productName] = 0;
        }
        tank.products[doc.productName] += doc.type === 'add' ? (doc.amount || 0) : -(doc.amount || 0);
      }
    });
    
    // ردیابی اسناد اضافه/کسر انبار (inventoryAdjustments)
    inventoryAdjustments.forEach((doc: any) => {
      if (doc.isVoided) return;
      
      const key = `${doc.siteId}-${doc.tankId}`;
      if (inventoryMap.has(key)) {
        const tank = inventoryMap.get(key);
        
        if (doc.adjustmentType === 'addition') {
          // فرمول موجودی امانی: اضافه کردن سندهای اضافه انبار امانی
          if (doc.userType === 'consignment') {
            tank.consignmentInventory += doc.quantity || 0;
            if (!tank.consignmentProducts[doc.productName]) {
              tank.consignmentProducts[doc.productName] = { 
                amount: 0, 
                counterparty: doc.counterpartyName, 
                contractNumber: doc.contractNumber 
              };
            }
            tank.consignmentProducts[doc.productName].amount += doc.quantity || 0;
          } 
          // فرمول موجودی تملیکی: اضافه کردن سندهای اضافه انبار تملیکی
          else {
            tank.ownedInventory += doc.quantity || 0;
            if (!tank.ownedProducts[doc.productName]) {
              tank.ownedProducts[doc.productName] = 0;
            }
            tank.ownedProducts[doc.productName] += doc.quantity || 0;
          }
          
          // فرمول موجودی تجمیعی: اضافه کردن تمامی سندهای اضافه انبار
          tank.combinedInventory += doc.quantity || 0;
          
          // برای محاسبه ظرفیت خالی: جمع تمامی اسناد اضافه
          tank.totalInventoryAdditions += doc.quantity || 0;
        } 
        else if (doc.adjustmentType === 'deduction') {
          // فرمول موجودی امانی: کسر سندهای کسر انبار امانی
          if (doc.userType === 'consignment') {
            tank.consignmentInventory -= doc.quantity || 0;
            if (tank.consignmentProducts[doc.productName]) {
              tank.consignmentProducts[doc.productName].amount -= doc.quantity || 0;
            }
          } 
          // فرمول موجودی تملیکی: کسر سندهای کسر انبار تملیکی
          else {
            tank.ownedInventory -= doc.quantity || 0;
            if (tank.ownedProducts[doc.productName]) {
              tank.ownedProducts[doc.productName] -= doc.quantity || 0;
            }
          }
          
          // فرمول موجودی تجمیعی: کسر تمامی سندهای کسر انبار
          tank.combinedInventory -= doc.quantity || 0;
          
          // برای محاسبه ظرفیت خالی: جمع تمامی اسناد کسر
          tank.totalInventoryDeductions += doc.quantity || 0;
        }
        
        if (!tank.products[doc.productName]) {
          tank.products[doc.productName] = 0;
        }
        tank.products[doc.productName] += doc.adjustmentType === 'addition' ? (doc.quantity || 0) : -(doc.quantity || 0);
      }
    });
    
    // محاسبه نهایی ظرفیت خالی بر اساس فرمول درخواستی
    // (ظرفیت مخزن در سایت و مخزن مشخص شده - تمامی رسیدهای انبار امانی و تملیکی - تمامی سندهای اضافه انبار + تمامی حواله‌های انبار امانی و تملیکی + تمامی سندهای کسر انبار)
    // طبق فرمول کاربر: (مجموع ورودی‌ها - مجموع خروجی‌ها) + افت‌های امانی
    inventoryMap.forEach((tank) => {
      const totalInputs = tank.totalReceipts + tank.totalTankAdditions + tank.totalInventoryAdditions + tank.totalConsignmentLosses;
      const totalOutputs = tank.totalConsignmentDeliveries + tank.totalOwnershipDeliveries + tank.totalTankDeductions + tank.totalInventoryDeductions;
      tank.emptyCapacity = tank.capacity - (totalInputs - totalOutputs);
    });
    
    return Array.from(inventoryMap.values());
  }, []); // وابستی به propInventory حذف شد و داده‌ها از داخل کامپوننت خوانده می‌شوند

  // گروه‌بندی موجودی بر اساس سایت و نوع کالا
  const groupedInventory = useMemo(() => {
    const groupedBySite = new Map();
    
    calculatedInventory.forEach(item => {
      if (!groupedBySite.has(item.siteId)) {
        groupedBySite.set(item.siteId, {
          siteId: item.siteId,
          siteName: item.siteName,
          totalCapacity: 0,
          totalConsignmentInventory: 0,
          totalOwnedInventory: 0,
          totalCombinedInventory: 0,
          totalEmptyCapacity: 0,
          consignmentDetails: new Map(),
          ownedDetails: new Map(),
          tanks: []
        });
      }
      
      const siteGroup = groupedBySite.get(item.siteId);
      
      // اضافه کردن آمار کلی سایت
      siteGroup.totalCapacity += item.capacity;
      siteGroup.totalConsignmentInventory += item.consignmentInventory;
      siteGroup.totalOwnedInventory += item.ownedInventory;
      siteGroup.totalCombinedInventory += item.combinedInventory;
      siteGroup.totalEmptyCapacity += item.emptyCapacity;
      
      // گروه‌بندی محصولات امانی بر اساس نام کالا و قرارداد
      Object.entries(item.consignmentProducts).forEach(([productName, details]: [string, any]) => {
        const productKey = `${productName}-${details.contractNumber}-${details.counterparty}`;
        if (!siteGroup.consignmentDetails.has(productKey)) {
          siteGroup.consignmentDetails.set(productKey, {
            productName,
            contractNumber: details.contractNumber,
            counterparty: details.counterparty,
            totalAmount: 0,
            tanks: new Set()
          });
        }
        const productDetail = siteGroup.consignmentDetails.get(productKey);
        productDetail.totalAmount += details.amount;
        productDetail.tanks.add(item.tankName);
      });
      
      // گروه‌بندی محصولات تملیکی بر اساس نام کالا
      Object.entries(item.ownedProducts).forEach(([productName, amount]: [string, number]) => {
        if (!siteGroup.ownedDetails.has(productName)) {
          siteGroup.ownedDetails.set(productName, {
            productName,
            totalAmount: 0,
            tanks: new Set()
          });
        }
        const productDetail = siteGroup.ownedDetails.get(productName);
        productDetail.totalAmount += amount;
        productDetail.tanks.add(item.tankName);
      });
      
      // اضافه کردن جزئیات مخزن
      siteGroup.tanks.push({
        tankId: item.tankId,
        tankName: item.tankName,
        capacity: item.capacity,
        consignmentInventory: item.consignmentInventory,
        ownedInventory: item.ownedInventory,
        combinedInventory: item.combinedInventory,
        emptyCapacity: item.emptyCapacity
      });
    });
    
    return Array.from(groupedBySite.values());
  }, [calculatedInventory]);
  
  // فیلتر کردن گروه‌ها بر اساس عبارت جستجو شده
  const filteredInventory = useMemo(() => {
    if (!searchTerm) return groupedInventory;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return groupedInventory.filter(group =>
      group.siteName.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [groupedInventory, searchTerm]);

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">گزارش موجودی انبار</h1>
        <p className="text-gray-600">گزارش موجودی انبار بر اساس سایت، مخزن و نوع کالا (امانی/تملیکی) با جزئیات کامل موجودی هر مخزن</p>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-3">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">راهنمای استفاده برای ثبت حواله:</h3>
          <p className="text-blue-800 text-sm">
            هنگام ثبت حواله، از این گزارش برای بررسی موجودی استفاده کنید:
          </p>
          <ul className="text-blue-700 text-sm mt-2 list-disc list-inside space-y-1">
            <li><strong>در سایت [نام سایت]:</strong> موجودی کل را مشاهده کنید</li>
            <li><strong>در مخزن [نام مخزن]:</strong> موجودی تفکیکی امانی و تملیکی را ببینید</li>
            <li><strong>برای کالای [نام کالا]:</strong> مقدار دقیق موجودی و طرف حساب مربوطه</li>
            <li><strong>نوع امانی:</strong> موجودی متعلق به طرف حساب‌ها (با نمایش نام طرف حساب)</li>
            <li><strong>نوع تملیکی:</strong> موجودی متعلق به شرکت</li>
          </ul>
        </div>
      </div>

      {/* نوار جستجو */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
            placeholder="جستجو بر اساس نام سایت..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* جدول موجودی انبار */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">سایت</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مخزن</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">کالا</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نوع موجودی</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مقدار موجودی</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">طرف حساب / توضیحات</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ظرفیت خالی</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عملیات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInventory.length > 0 ? (
                filteredInventory.map((group: any) => (
                  group.tanks.map((tank: any, tankIndex: number) => (
                    <React.Fragment key={`${group.siteId}-${tank.tankId}`}>
                      {/* ردیف امانی */}
                      {tank.consignmentInventory > 0 && (
                        <tr className="hover:bg-blue-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            <div className="flex items-center">
                              <Warehouse className="w-4 h-4 ml-1 text-blue-600" />
                              {group.siteName}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                            {tank.tankName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {Object.keys(tank.consignmentProducts).map(productName => (
                              <div key={productName} className="text-xs">
                                {productName}
                              </div>
                            ))}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <div className="w-2 h-2 bg-blue-500 rounded-full ml-1"></div>
                              امانی
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-blue-700">
                            {formatPersianNumber(tank.consignmentInventory)}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {Object.values(tank.consignmentProducts).map((product: any, index: number) => (
                              <div key={index} className="mb-1">
                                <div className="font-medium">{product.counterparty}</div>
                                <div className="text-gray-500">قرارداد: {product.contractNumber}</div>
                              </div>
                            ))}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <div className="flex items-center">
                              <div className="w-2 h-2 bg-gray-400 rounded-full ml-1"></div>
                              {formatPersianNumber(tank.emptyCapacity)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            <button className="text-blue-600 hover:text-blue-800 font-medium">
                              ثبت حواله
                            </button>
                          </td>
                        </tr>
                      )}
                      
                      {/* ردیف تملیکی */}
                      {tank.ownedInventory > 0 && (
                        <tr className="hover:bg-green-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            <div className="flex items-center">
                              <Warehouse className="w-4 h-4 ml-1 text-green-600" />
                              {group.siteName}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                            {tank.tankName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {Object.keys(tank.ownedProducts).map(productName => (
                              <div key={productName} className="text-xs">
                                {productName}
                              </div>
                            ))}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <div className="w-2 h-2 bg-green-500 rounded-full ml-1"></div>
                              تملیکی
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-700">
                            {formatPersianNumber(tank.ownedInventory)}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            <span className="text-gray-500">موجودی متعلق به شرکت</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <div className="flex items-center">
                              <div className="w-2 h-2 bg-gray-400 rounded-full ml-1"></div>
                              {formatPersianNumber(tank.emptyCapacity)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            <button className="text-green-600 hover:text-green-800 font-medium">
                              ثبت حواله
                            </button>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {searchTerm ? 'هیچ سایتی با این مشخصات یافت نشد.' : 'هیچ اطلاعاتی برای نمایش وجود ندارد.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* بخش توضیحات فرمول‌ها */}
      <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">راهنمای محاسبه موجودی برای ثبت حواله</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-blue-700">موجودی امانی در مخزن:</h3>
              <p className="text-sm text-gray-600 mt-1">
                (رسیدهای امانی + اسناد اضافه امانی) - (حواله‌های امانی + اسناد کسر امانی)
              </p>
              <p className="text-xs text-blue-600 mt-1">
                <strong>برای ثبت:</strong> این مقدار نشان‌دهنده موجودی متعلق به طرف حساب‌ها است
              </p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-green-700">موجودی تملیکی در مخزن:</h3>
              <p className="text-sm text-gray-600 mt-1">
                (رسیدهای تملیکی + اسناد اضافه تملیکی) - (حواله‌های تملیکی + اسناد کسر تملیکی)
              </p>
              <p className="text-xs text-green-600 mt-1">
                <strong>برای ثبت:</strong> این مقدار نشان‌دهنده موجودی متعلق به شرکت است
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="border-l-4 border-gray-500 pl-4">
              <h3 className="font-semibold text-gray-700">ظرفیت خالی مخزن:</h3>
              <p className="text-sm text-gray-600 mt-1">
                (ظرفیت کل مخزن - مجموع موجودی امانی و تملیکی)
              </p>
              <p className="text-xs text-gray-500 mt-1">
                <strong>نکته:</strong> شامل افت‌های امانی در محاسبه ورودی
              </p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-semibold text-orange-700">نحوه استفاده هنگام ثبت حواله:</h3>
              <ul className="text-sm text-gray-600 mt-1 list-disc list-inside space-y-1">
                <li>سایت و مخزن مورد نظر را انتخاب کنید</li>
                <li>نوع حواله (امانی/تملیکی) را مشخص کنید</li>
                <li>موجودی مربوطه را از جدول مشاهده کنید</li>
                <li>مقدار حواله نباید از موجودی بیشتر باشد</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 ml-2" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">نکات مهم برای کاربران انبارداری:</h4>
              <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside space-y-1">
                <li>قبل از ثبت هر حواله، موجودی مربوطه را در این گزارش بررسی کنید</li>
                <li>برای حواله‌های امانی، حتماً طرف حساب و قرارداد مربوطه را چک کنید</li>
                <li>در صورت عدم تطابق موجودی با واقعیت، با مدیر سیستم تماس بگیرید</li>
                <li>ظرفیت خالی مخزن را نیز مد نظر داشته باشید</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseInventoryTable;

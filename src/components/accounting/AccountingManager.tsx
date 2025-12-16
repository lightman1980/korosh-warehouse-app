import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Download } from 'lucide-react';
import { useAccountingData } from '../../hooks/useAccountingData';
import { TabNavigation } from './TabNavigation';
import { UninvoicedReceiptsTab } from './UninvoicedReceiptsTab';
import { InvoicedReceiptsTab } from './InvoicedReceiptsTab';
import { DeliveryPermitsTab } from './DeliveryPermitsTab';
import { ActiveTab } from '../../types/accounting';
import { DataStorage } from '../../utils/dataStorage';
import { 
  formatPersianDate, 
  formatPersianDateTime,
  getGregorianToPersianYearMonth,
  generateTransactionNumber
} from '../../utils/persian';
import jalaali from 'jalaali-js';
// ... ايمپورت جديد را با مسير صحيح اضافه کنيد
import ConsignmentDeliverySlip from '../WarehouseDelivery/ConsignmentDeliverySlip';

interface AccountingManagerProps {
  lastAutoInvoiceCheck?: Date | null;
  isAutoChecking?: boolean;
}

const AccountingManager: React.FC<AccountingManagerProps> = ({
  lastAutoInvoiceCheck,
  isAutoChecking
}) => {
  const {
    receipts,
    contracts,
    invoices,
    deliveryPermits,
    loadData,
    setInvoices,
    setDeliveryPermits
  } = useAccountingData();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('uninvoiced');
  const [isLoading, setIsLoading] = useState(true);
  const [systemDate, setSystemDate] = useState<Date>(new Date());
  const [autoInvoiceEnabled, setAutoInvoiceEnabled] = useState(true);
  // استيت جديد براي نمايش حواله اماني
  const [showConsignmentSlip, setShowConsignmentSlip] = useState(false);
  const storage = DataStorage.getInstance();

  useEffect(() => {
    const savedSystemDate = localStorage.getItem('systemDate');
    if (savedSystemDate) {
      setSystemDate(new Date(savedSystemDate));
    }

    const handleSystemDateChange = (event: CustomEvent) => {
      setSystemDate(event.detail.date);
    };

    window.addEventListener('systemDateChanged', handleSystemDateChange as EventListener);
    return () => {
      window.removeEventListener('systemDateChanged', handleSystemDateChange as EventListener);
    };
  }, []);

  useEffect(() => {
    const handleNavigation = (event: CustomEvent) => {
      if (event.type === 'navigateToConsignmentSlip') {
        setShowConsignmentSlip(true);
      }
    };

    window.addEventListener('navigateToConsignmentSlip', handleNavigation as EventListener);
    return () => {
      window.removeEventListener('navigateToConsignmentSlip', handleNavigation as EventListener);
    };
  }, []);

  const generateInvoiceNumber = useCallback((year: number, month: number, day: number): string => {
    const paddedMonth = String(month).padStart(2, '0');
    const paddedDay = String(day).padStart(2, '0');
    const datePrefix = `I-${year}-${paddedMonth}-${paddedDay}`;
    
    const existingInvoices = invoices.filter(inv => 
      inv.transactionNumber && inv.transactionNumber.startsWith(datePrefix)
    );
    
    let sequence = 1;
    if (existingInvoices.length > 0) {
      const sequences = existingInvoices.map(inv => {
        const match = inv.transactionNumber.match(new RegExp(`^${datePrefix}-(\\d+)$`));
        return match ? parseInt(match[1], 10) : 0;
      });
      sequence = Math.max(...sequences) + 1;
    }
    
    const paddedSequence = String(sequence).padStart(4, '0');
    return `${datePrefix}-${paddedSequence}`;
  }, [invoices]);

  const generateUniquePermitNumber = useCallback((date: Date): string => {
    const persianDate = jalaali.toJalaali(date);
    const yearMonth = `${persianDate.jy}${persianDate.jm.toString().padStart(2, '0')}`;
    
    const existingPermits = deliveryPermits.filter(p => 
      p.systemPermitNumber && p.systemPermitNumber.startsWith(`M${yearMonth}`)
    );
    
    // شماره بعدی: از 000001 شروع می‌شود و به صورت پیوسته افزایش می‌یابد
    let counter = 1; // از 1 شروع شود
    if (existingPermits.length > 0) {
      const counters = existingPermits.map(p => {
        const match = p.systemPermitNumber.match(new RegExp(`^M${yearMonth}(\\d+)$`));
        return match ? parseInt(match[1], 10) : 0;
      });
      const maxCounter = Math.max(...counters);
      counter = maxCounter + 1; // افزایش پیوسته
    }
    
    const counterStr = counter.toString().padStart(6, '0');
    return `M${yearMonth}${counterStr}`;
  }, [deliveryPermits]);

  const isManagementLetterNumberUnique = useCallback((letterNumber: string, excludePermitId?: string): boolean => {
    return !deliveryPermits.some(permit => 
      permit.managementLetterNumber === letterNumber && 
      permit.id !== excludePermitId
    );
  }, [deliveryPermits]);

  const calculateRemainingTransferPermitForReceipt = useCallback((receiptId: string, contractId: string): number => {
    const receipt = receipts.find(r => r.id === receiptId);
    if (!receipt) return 0;

    const contract = contracts.find(c => c.id === contractId);
    const wastageRate = contract?.wastageRateValue || 0.5;

    const basis = receipt.receiptBasisAmount || 0;
    const wastage = basis * (wastageRate / 100);

    const deliveries = storage.loadData('deliveries') || [];
    const relatedDeliveries = deliveries.filter(d =>
      d.receiptId === receiptId &&
      (d.status === 'draft' || d.status === 'issued') &&
      d.event !== 'ابطال حواله انبار'
    );
    const totalDeliveries = relatedDeliveries.reduce((sum, d) => sum + (d.amount || 0), 0);

    return Math.max(0, basis - wastage - totalDeliveries);
  }, [receipts, contracts, storage]);

  const calculateRemainingPermitForReceipt = useCallback((receiptId: string, contractId: string): number => {
    const receipt = receipts.find(r => r.id === receiptId);
    if (!receipt) return 0;

    const contract = contracts.find(c => c.id === contractId);
    const wastageRate = contract?.wastageRateValue || 0.5;

    const basis = receipt.receiptBasisAmount || 0;
    const wastage = basis * (wastageRate / 100);

    const allPermits = storage.loadData('delivery-permits') || [];
    const relatedPermits = allPermits.filter(p =>
      p.receiptId === receiptId &&
      (p.status === 'draft' || p.status === 'issued') &&
      p.status !== 'cancelled'
    );
    const totalPermits = relatedPermits.reduce((sum, p) => sum + (p.permitAmount || 0), 0);

    return Math.max(0, basis - wastage - totalPermits);
  }, [receipts, contracts, storage]);

  const hasWarehouseReceiptForPermit = useCallback((permitId: string): boolean => {
    const deliveries = storage.loadData('deliveries') || [];
    return deliveries.some((delivery: any) => delivery.permitId === permitId);
  }, [storage]);

  // تابع جديد براي محاسبه "مانده رسيد فاقد مجوز حواله"
  const calculateRemainingReceiptWithoutTransferPermit = useCallback((receiptId: string, contractId: string): number => {
    const receipt = receipts.find(r => r.id === receiptId);
    if (!receipt) return 0;

    const contract = contracts.find(c => c.id === contractId);
    const wastageRate = contract?.wastageRateValue || 0.5;

    const basis = receipt.receiptBasisAmount || 0;
    const wastage = basis * (wastageRate / 100);
    const remainingTransferPermit = basis - wastage;

    // جمع تمام مقدار مجوز حواله‌هاي ثبت شده براي اين رسيد
    const allPermits = deliveryPermits.filter(p => 
      p.receiptId === receiptId && 
      p.contractId === contractId &&
      (p.status === 'draft' || p.status === 'issued') &&
      !p.isVoided
    );
    const totalPermitAmount = allPermits.reduce((sum, p) => sum + (p.permitAmount || 0), 0);

    // فرمول جديد: مانده رسيد فاقد مجوز حواله = مانده مجوز حواله - مجموع مقدار مجوز حواله‌هاي ثبت شده
    return Math.max(0, remainingTransferPermit - totalPermitAmount);
  }, [receipts, contracts, deliveryPermits]);

  const generateAutomaticInvoices = useCallback(() => {
    const currentPersianDate = jalaali.toJalaali(systemDate);
    
    receipts.forEach(receipt => {
      if (receipt.userType !== 'consignment' || receipt.status === 'draft') return;
      
      const contract = contracts.find(c => c.id === receipt.contractId);
      if (!contract) return;
      
      const receiptDate = new Date(receipt.receiptDate);
      const receiptPersianDate = jalaali.toJalaali(receiptDate);
      
      const receiptMonthInvoice = invoices.find(inv => 
        inv.receiptId === receipt.id &&
        inv.contractId === receipt.contractId &&
        inv.year === receiptPersianDate.jy &&
        inv.month === receiptPersianDate.jm &&
        inv.invoiceType === 'automatic'
      );
      
      if (!receiptMonthInvoice) {
        const basisAmount = receipt.receiptBasisAmount;
        const invoiceAmount = basisAmount * (contract.rentalRate || 0);
        
        const transactionNumber = generateInvoiceNumber(
          receiptPersianDate.jy, 
          receiptPersianDate.jm, 
          receiptPersianDate.jd
        );
        
        const newInvoice = {
          id: `invoice_${Date.now()}_receipt_month`,
          receiptId: receipt.id,
          contractId: receipt.contractId,
          transactionNumber,
          invoiceAmount,
          paidAmount: 0,
          remainingDebt: invoiceAmount,
          year: receiptPersianDate.jy,
          month: receiptPersianDate.jm,
          paymentDate: null,
          invoiceType: 'automatic' as const,
          calculationBasis: 'receiptBasis' as const,
          basisAmount,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'draft' as const
        };
        
        const updatedInvoices = [...invoices, newInvoice];
        storage.saveData('invoices', updatedInvoices);
        setInvoices(updatedInvoices);
      }
      
      const monthsDiff = (currentPersianDate.jy - receiptPersianDate.jy) * 12 + 
                        (currentPersianDate.jm - receiptPersianDate.jm);
      
      if (monthsDiff <= 0) return;
      
      for (let i = 1; i <= monthsDiff; i++) {
        let targetYear = receiptPersianDate.jy;
        let targetMonth = receiptPersianDate.jm + i;
        
        while (targetMonth > 12) {
          targetMonth -= 12;
          targetYear++;
        }
        
        const existingInvoice = invoices.find(inv => 
          inv.receiptId === receipt.id &&
          inv.contractId === receipt.contractId &&
          inv.year === targetYear &&
          inv.month === targetMonth &&
          inv.invoiceType === 'automatic'
        );
        
        if (existingInvoice) continue;
        
        const remainingPermit = calculateRemainingTransferPermitForReceipt(receipt.id, receipt.contractId);
        const basisAmount = remainingPermit;
        const invoiceAmount = basisAmount * (contract.rentalRate || 0);
        
        const transactionNumber = generateInvoiceNumber(
          targetYear, 
          targetMonth, 
          receiptPersianDate.jd
        );
        
        const newInvoice = {
          id: `invoice_${Date.now()}_${i}`,
          receiptId: receipt.id,
          contractId: receipt.contractId,
          transactionNumber,
          invoiceAmount,
          paidAmount: 0,
          remainingDebt: invoiceAmount,
          year: targetYear,
          month: targetMonth,
          paymentDate: null,
          invoiceType: 'automatic' as const,
          calculationBasis: 'remainingPermit' as const,
          basisAmount,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'draft' as const
        };
        
        const updatedInvoices = [...invoices, newInvoice];
        storage.saveData('invoices', updatedInvoices);
        setInvoices(updatedInvoices);
      }
    });
  }, [receipts, contracts, invoices, systemDate, storage, setInvoices, generateInvoiceNumber, calculateRemainingTransferPermitForReceipt]);

  useEffect(() => {
    const savedAutoInvoiceEnabled = localStorage.getItem('autoInvoiceEnabled');
    if (savedAutoInvoiceEnabled !== null) {
      setAutoInvoiceEnabled(savedAutoInvoiceEnabled === 'true');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('autoInvoiceEnabled', String(autoInvoiceEnabled));
  }, [autoInvoiceEnabled]);

  useEffect(() => {
    if (autoInvoiceEnabled && receipts.length > 0 && contracts.length > 0) {
      generateAutomaticInvoices();
    }
  }, [receipts, contracts, generateAutomaticInvoices, autoInvoiceEnabled]);

  useEffect(() => {
    loadData();
    setIsLoading(false);
  }, [loadData]);

  const handleSaveInvoice = useCallback((invoiceData: Partial<any>, editingInvoiceId: string | null) => {
    if (!invoiceData.receiptId) return;
    
    if (!editingInvoiceId) {
      const existingManualInvoice = invoices.find(inv => 
        inv.receiptId === invoiceData.receiptId &&
        inv.contractId === invoiceData.contractId &&
        inv.year === invoiceData.year &&
        inv.month === invoiceData.month &&
        inv.invoiceType === 'manual'
      );
      
      if (existingManualInvoice) {
        alert('فاکتور براي اين دوره ماهانه قبلا صادر شده است و نمي‌توانيد فاکتور تکراري ايجاد کنيد.');
        return;
      }
    }
    
    let updatedInvoices;
    const receipt = receipts.find(r => r.id === invoiceData.receiptId);
    
    let calculatedBasisAmount = invoiceData.basisAmount;
    if (calculatedBasisAmount === undefined && receipt && invoiceData.calculationBasis) {
      if (invoiceData.calculationBasis === 'receiptBasis') {
        calculatedBasisAmount = receipt.receiptBasisAmount;
      } else if (invoiceData.calculationBasis === 'remainingPermit') {
        calculatedBasisAmount = calculateRemainingTransferPermitForReceipt(receipt.id, receipt.contractId);
      }
    }

    if (editingInvoiceId) {
      const allStoredInvoices = storage.loadData('invoices') || [];
      updatedInvoices = allStoredInvoices.map(inv => {
        if (inv.id === editingInvoiceId) {
          const updatedInvoice = {
            ...inv, 
            ...invoiceData,
            basisAmount: calculatedBasisAmount,
            updatedAt: new Date(),
          };
          
          const newInvoiceAmount = updatedInvoice.invoiceAmount;
          const newPaidAmount = updatedInvoice.paidAmount || 0;
          updatedInvoice.remainingDebt = newInvoiceAmount - newPaidAmount;

          return updatedInvoice;
        }
        return inv; 
      });
      
      storage.saveData('invoices', updatedInvoices);
      setInvoices(updatedInvoices);
    }
    else {
      const transactionNumber = generateInvoiceNumber(
        invoiceData.year || new Date().getFullYear(), 
        invoiceData.month || new Date().getMonth() + 1, 
        new Date().getDate()
      );
      
      const newInvoice = {
        ...invoiceData,
        id: `invoice_${Date.now()}`,
        transactionNumber,
        basisAmount: calculatedBasisAmount,
        remainingDebt: (invoiceData.invoiceAmount || 0) - (invoiceData.paidAmount || 0),
        createdAt: new Date(),
        updatedAt: new Date(),
        invoiceType: 'manual' as const,
        status: invoiceData.status || 'draft'
      };
      
      updatedInvoices = [...invoices, newInvoice];
    }
    
    setInvoices(updatedInvoices);
    storage.saveData('invoices', updatedInvoices);
  }, [invoices, setInvoices, storage, generateInvoiceNumber, receipts, calculateRemainingTransferPermitForReceipt]); 

  const handleDeleteInvoice = useCallback((invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    const hasPermit = deliveryPermits.some(permit => permit.receiptId === invoice.receiptId);

    if (hasPermit) {
      alert('براي اين رسيد انبار مجوز صدور حواله صادر شده است. قبل از حذف فاکتور، بايد تمام مجوزهاي مربوطه را حذف کنيد.\n\nيا با ويرايش (ابطال/حذف) مجوز، وضعيت آن را به "حذف شده" تغيير دهيد.');
      return;
    }

    if (window.confirm('آيا از حذف اين فاکتور اطمينان داريد؟')) {
      const updatedInvoices = invoices.filter(inv => inv.id !== invoiceId);
      setInvoices(updatedInvoices);
      storage.saveData('invoices', updatedInvoices);
    }
  }, [invoices, setInvoices, storage, deliveryPermits]);

  const handlePrintInvoice = useCallback((invoice: any) => {
    const receipt = receipts.find(r => r.id === invoice.receiptId);
    if (!receipt) return;
    
    const contract = contracts.find(c => c.id === receipt.contractId);
    
    const printAmount = invoice.invoiceAmount || 0;
    const printPaidAmount = invoice.paidAmount || 0;
    const printRemainingDebt = invoice.remainingDebt || 0;
    const printBasisAmount = invoice.basisAmount || 0; 
    
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <title>فاکتور - ${invoice.transactionNumber}</title>
        <style>
          @page { margin: 0.5cm; size: A4; }
          body { 
            font-family: 'Tahoma', 'B Nazanin', sans-serif; 
            direction: rtl; 
            text-align: right; 
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background: white;
            font-size: 12px;
            color: #333;
          }
          .invoice-container {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            border: 2px solid #059669;
            border-radius: 8px;
            padding: 15px;
            box-sizing: border-box;
          }
          .header { 
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 15px;
            border-bottom: 2px solid #059669;
            margin-bottom: 15px;
          }
          .logo {
            max-height: 80px;
            max-width: 150px;
          }
          .company-info {
            text-align: center;
            flex-grow: 1;
          }
          .invoice-title {
            font-size: 24px;
            font-weight: bold;
            color: #059669;
            margin-bottom: 10px;
          }
          .details-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
            border: 1px solid #ddd;
          }
          .details-table th { 
            background: #059669; 
            color: white; 
            padding: 10px; 
            font-weight: bold;
            text-align: center;
            border: 1px solid #ddd;
          }
          .details-table td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: center;
          }
          .amount-row {
            background: #f0fdf4;
            font-weight: bold;
          }
          .total-section {
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px dashed #ccc;
          }
          .signature-box {
            width: 30%;
            text-align: center;
          }
          .signature-line {
            border-top: 1px solid #333;
            height: 1px;
            width: 80%;
            margin: 10px auto;
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <img src="/سازمان منطقه آزاد اروند.jpg" alt="سازمان اروند" class="logo" />
            <div class="company-info">
              <div class="invoice-title">فاکتور خدمات انبارداري</div>
              <div>سازمان منطقه آزاد اروند</div>
            </div>
            <div class="invoice-info">
              <div><strong>شماره فاکتور:</strong> ${invoice.transactionNumber}</div>
              <div><strong>تاريخ صدور:</strong> ${formatPersianDate(new Date())}</div>
              <div><strong>سال:</strong> ${invoice.year}</div>
              <div><strong>ماه:</strong> ${invoice.month}</div>
            </div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <strong>از:</strong> ${receipt.counterpartyName}<br>
            <strong>نوع کالا:</strong> خدمات انبارداري ضايعات ${receipt.productName}<br>
            <strong>شماره قرارداد:</strong> ${receipt.contractNumber}<br>
            <strong>شماره رسيد انبار:</strong> ${receipt.transactionNumber}
          </div>
          
          <table class="details-table">
            <thead>
              <tr>
                <th>شرح خدمات</th>
                <th>مقدار</th>
                <th>واحد</th>
                <th>مبلغ واحد</th>
                <th>مبلغ کل (ريال)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>خدمات انبارداري ضايعات ${receipt.productName}</td>
                <td>${printBasisAmount.toLocaleString('fa-IR')}</td>
                <td>${receipt.unit === 'kg' ? 'کيلوگرم' : 'تن'}</td>
                <td>${contract?.rentalRate?.toLocaleString('fa-IR') || 0}</td>
                <td class="amount-row">${printAmount.toLocaleString('fa-IR')}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="total-section">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span><strong>جمع کل:</strong></span>
              <span><strong>${printAmount.toLocaleString('fa-IR')} ريال</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>مبلغ پرداخت شده:</span>
              <span>${printPaidAmount.toLocaleString('fa-IR')} ريال</span>
            </div>
            <div style="display: flex; justify-content: space-between; color: ${printRemainingDebt > 0 ? '#dc2626' : '#059669'};">
              <span><strong>مانده بدهي:</strong></span>
              <span><strong>${printRemainingDebt.toLocaleString('fa-IR')} ريال</strong></span>
            </div>
          </div>
          
          <div class="signature-section">
            <div class="signature-box">
              <div>امضا مدير مالي</div>
              <div class="signature-line"></div>
              <div>نام و نام خانوادگي</div>
            </div>
            <div class="signature-box">
              <div>امضا انباردار</div>
              <div class="signature-line"></div>
              <div>نام و نام خانوادگي</div>
            </div>
            <div class="signature-box">
              <div>امضا صادر کننده</div>
              <div class="signature-line"></div>
              <div>نام و نام خانوادگي</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        setTimeout(() => {
          printWindow.print();
          setTimeout(() => {
            printWindow.close();
          }, 1000);
        }, 500);
      }
    } catch (error) {
      console.error('Error printing invoice:', error);
      alert('خطا در چاپ فاکتور. لطفاً تنظيمات مرورگر را بررسي کنيد.');
    }
  }, [receipts, contracts]); 

  const onTransferToWarehouseReceipt = useCallback((permitData: any) => {
    storage.saveData('permitTransfer', permitData);
    // اضافه پرچم براي نمايش اطلاعيه در صفحه حواله انبار
    storage.saveData('showPermitTransferNotification', true);
    alert('اطلاعات مجوز با موفقيت به بخش رسيد حواله انبار ارسال شد.');
  }, [storage]);

  const handleSavePermit = useCallback((permitData: Partial<any>, editingPermitId: string | null) => {
    if (!permitData.receiptId) return;
    
    const receipt = receipts.find(r => r.id === permitData.receiptId);
    if (!receipt) return;
    
    const contract = contracts.find(c => c.id === receipt.contractId);
    if (!contract) return;
    
    const wastagePercentage = contract?.wastageRateValue || 0.5;
    const wastageAmount = (permitData.permitAmount || 0) * (wastagePercentage / 100);
    const finalPermitAmount = (permitData.permitAmount || 0) - wastageAmount;
    
    const systemPermitNumber = editingPermitId 
      ? deliveryPermits.find(p => p.id === editingPermitId)?.systemPermitNumber || ''
      : generateUniquePermitNumber(new Date());
    
    let status = permitData.status || 'draft';
    if (editingPermitId && permitData.event === 'ابطال حواله انبار') {
      status = 'draft';
    } 
    else if (permitData.approvalDate) {
      status = 'issued';
    }
    
    const permitId = editingPermitId || permitData.id || `permit_${Date.now()}`;
    
    const newPermit = {
      ...permitData,
      id: permitId,
      systemPermitNumber,
      wastageAmount,
      finalPermitAmount,
      status,
      createdAt: editingPermitId 
        ? deliveryPermits.find(p => p.id === editingPermitId)?.createdAt || new Date() 
        : new Date(),
      updatedAt: new Date(),
      contractId: receipt.contractId,
      approvedCount: editingPermitId 
        ? (deliveryPermits.find(p => p.id === editingPermitId)?.approvedCount || 0)
        : 0
    };
    
    let updatedPermits;
    if (editingPermitId) {
      updatedPermits = deliveryPermits.map(permit => 
        permit.id === editingPermitId ? newPermit : permit
      );
    } else {
      updatedPermits = [...deliveryPermits, newPermit];
    }
    
    setDeliveryPermits(updatedPermits);
    storage.saveData('delivery-permits', updatedPermits);
    
    if (editingPermitId) {
      if (permitData.approvalDate && status === 'issued') {
        alert('مجوز با موفقيت تاييد و شماره گذاري شد. لطفاً با مراجعه به تب "مجوزهاي صادر شده" و دکمه "انتقال به حواله انبار"، اطلاعات را به رسيد حواله انبار منتقل کنيد.');
      } else {
        alert('مجوز با موفقيت ويرايش شد.');
      }
    } else {
      alert('مجوز با موفقيت ايجاد شد.');
    }
  }, [deliveryPermits, setDeliveryPermits, receipts, contracts, storage, generateUniquePermitNumber]);

  // *** MODIFIED / ADDED START ***
  const handleConfirmPermitTransfer = useCallback((permitId: string) => {
    const permit = deliveryPermits.find(p => p.id === permitId);
    if (!permit) {
      alert('مجوز مورد نظر يافت نشد.');
      return;
    }
  
    if (permit.status !== 'issued') {
      alert('فقط مجوزهاي تاييد شده (صادر شده) مي‌توانند به حواله انبار منتقل شوند.');
      return;
    }
  
    const receipt = receipts.find(r => r.id === permit.receiptId);
    if (!receipt) return;
  
    // محاسبه مانده مجوز حواله در لحظه انتقال
    const remainingPermitAmount = calculateRemainingTransferPermitForReceipt(permit.receiptId, receipt.contractId);
  
    const warehouseReceiptData = {
      permitId: permit.id,
      systemPermitNumber: permit.systemPermitNumber,
      managementLetterNumber: permit.managementLetterNumber,
      receiptNumber: receipt.transactionNumber,
      contractNumber: receipt.contractNumber,
      counterpartyName: receipt.counterpartyName,
      // اضافه فيلدهاي کليدي با نام‌هاي صحيح براي انتقال به WarehouseDeliveryManager
      permitAmount: permit.permitAmount, // مقدار مجوز حواله
      remainingTransferPermit: remainingPermitAmount, // مانده مجوز حواله
      wastageAmount: permit.wastageAmount,
      finalPermitAmount: permit.finalPermitAmount,
      contractId: receipt.contractId,
      receiptId: receipt.id,
      permitDate: permit.permitDate,
      approvalDate: permit.approvalDate,
      fromPermit: true,
      // اضافه فيلدهاي لازم براي پر کردن خودکار فرم حواله انبار
      productId: receipt.productId,
      productName: receipt.productName,
      siteId: receipt.siteId,
      siteName: receipt.siteName,
      tankId: receipt.tankId,
      tankName: receipt.tankName,
      unit: receipt.unit,
      companyId: receipt.counterpartyId,
      companyName: receipt.counterpartyName,
      
     
      // اضافه پرچم براي پر کردن خودکار فيلد مقدار
      autoFillAmount: true
    };
    
    // ذخيره جداگانه اطلاعات مجوز براي استفاده در صفحه حواله انبار
    storage.saveData(`permit_${permit.id}`, {
      ...permit,
      remainingTransferPermit: remainingPermitAmount, // اصلاح نام فيلد
      receipt
    });
    
    onTransferToWarehouseReceipt(warehouseReceiptData);
    
    alert('اطلاعات مجوز (شامل مقدار و مانده) با موفقيت به حواله انبار منتقل شد.');
  }, [deliveryPermits, receipts, onTransferToWarehouseReceipt, calculateRemainingTransferPermitForReceipt, storage]);
  // *** MODIFIED / ADDED END ***

  const handleDeletePermit = useCallback((permitId: string) => {
    const permit = deliveryPermits.find(p => p.id === permitId);
    if (!permit) return;
    
    const deliveries = storage.loadData('deliveries') || [];
    
    const hasDelivery = deliveries.some((d: any) => d.permitId === permitId);
    const canDelete = (
      (permit.status === 'draft' || permit.status === 'cancelled') && !hasDelivery
    ) || (
      permit.event === 'ابطال حواله انبار'
    );
    
    if (!canDelete) {
      if (permit.status === 'issued' && hasDelivery && permit.event !== 'ابطال حواله انبار') {
        alert('اين مجوز داراي حواله انبار ثبت شده است و وضعيت آن "صادر شده" مي‌باشد. قبل از حذف، بايد وضعيت آن را به "حذف شده" تغيير دهيد يا از طريق دکمه "ابطال" آن را لغو کنيد.');
      } else {
        alert('اين مجوز قابل حذف نيست. فقط مجوزهاي با وضعيت "پيشنويس" يا "لغو شده" (بدون حواله ثبت شده) يا با نوع رويداد "ابطال حواله انبار" قابل حذف هستند.');
      }
      return;
    }
    
    if (window.confirm('آيا از حذف اين مجوز اطمينان داريد؟')) {
      const updatedPermits = deliveryPermits.filter(p => p.id !== permitId);
      setDeliveryPermits(updatedPermits);
      storage.saveData('delivery-permits', updatedPermits);
      
      if (permit.event === 'ابطال حواله انبار') {
        const updatedDeliveries = deliveries.filter((d: any) => d.permitId !== permitId);
        storage.saveData('deliveries', updatedDeliveries);
      }
      
      alert('مجوز با موفقيت حذف شد.');
    }
  }, [deliveryPermits, setDeliveryPermits, storage]);

  const handleRefreshData = useCallback(() => {
    setIsLoading(true);
    loadData();
    generateAutomaticInvoices();
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, [loadData, generateAutomaticInvoices]);

  const uninvoicedCount = receipts.filter(r => 
    r.userType === 'consignment' && 
    r.status && r.status !== 'draft' && 
    r.status !== 'cancelled' && 
    r.status !== 'deleted'
  ).length;

  const invoicedCount = invoices.filter(invoice => {
    if (invoice.status === 'cancelled' || invoice.status === 'deleted') return false;
    if (invoice.transactionNumber?.startsWith('INV') && invoice.status === 'draft') return false;
    const receipt = receipts.find(r => r.id === invoice.receiptId);
    return receipt !== undefined;
  }).length;

  const permitsCount = deliveryPermits.length;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">مديريت و صدور فاکتور</h1>
            <p className="text-gray-600">مديريت فاکتورها، رسيدها و مجوزهاي تحويل</p>
            {lastAutoInvoiceCheck && (
              <p className="text-xs text-gray-500 mt-1">
                آخرين بررسي خودکار فاکتورها: {formatPersianDateTime(lastAutoInvoiceCheck)}
              </p>
            )}
            <p className="text-xs text-blue-600 mt-1">
               تاريخ سيستمي: {formatPersianDate(systemDate)}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleRefreshData}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              به‌روزرساني داده‌ها
            </button>
            <button
              onClick={() => {
                // خروجی اکسل برای داده‌های فعلی
                const allData = {
                  receipts: receipts.filter(r => !r.isVoided),
                  invoices: invoices,
                  deliveryPermits: deliveryPermits
                };
                const dataStr = JSON.stringify(allData, null, 2);
                const blob = new Blob(['\ufeff' + dataStr], { type: 'application/json;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', `گزارش_حسابداری_${formatPersianDate(new Date())}.json`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              title="خروجی اکسل"
            >
              <Download className="h-4 w-4 mr-1" />
              خروجی اکسل
            </button>
            <img 
              src="https://z-cdn-media.chatglm.cn/files/7094d229-4d09-430e-98c1-73f61a7991d6_%D9%84%D9%88%DA%AF%D9%88%20%D8%B5%D9%86%D8%B9%D8%AA%20%D8%BA%D8%B0%D8%A7%DB%8C%DB%8C%20%DA%A9%D9%88%D8%B1%D8%B4.jpg?auth_key=1788869487-700454f4145444fcabf14d4109c175fd-0-531d677f789c51954e01f268eaedd559" 
              alt="لوگو شرکت" 
              className="h-16 w-auto"
            />
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          {showConsignmentSlip ? (
            <ConsignmentDeliverySlip
              baseData={{} /* baseData را از جايي ديگر دريافت کنيد */}
              onBack={() => setShowConsignmentSlip(false)}
            />
          ) : (
            <>
              <TabNavigation 
                activeTab={activeTab} 
                setActiveTab={setActiveTab}
                uninvoicedCount={uninvoicedCount}
                invoicedCount={invoicedCount}
                permitsCount={permitsCount}
              />
              
              <div className="p-6">
                <div className="relative mb-6">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="جستجو در بين موارد..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-12 pl-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                      <p className="text-gray-600">در حال بارگذاري اطلاعات...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {activeTab === 'uninvoiced' && (
                      <UninvoicedReceiptsTab 
                        receipts={receipts}
                        contracts={contracts}
                        searchTerm={searchTerm}
                        handleSaveInvoice={handleSaveInvoice}
                        systemDate={systemDate}
                        calculateRemainingPermitAmount={calculateRemainingTransferPermitForReceipt}
                      />
                    )}
                    
                    {activeTab === 'invoiced' && (
                      <InvoicedReceiptsTab
                        receipts={receipts}
                        contracts={contracts}
                        invoices={invoices}
                        searchTerm={searchTerm}
                        handleSaveInvoice={handleSaveInvoice}
                        handleDeleteInvoice={handleDeleteInvoice}
                        handlePrintInvoice={handlePrintInvoice}
                        systemDate={systemDate}
                        calculateRemainingPermitAmount={calculateRemainingTransferPermitForReceipt}
                        calculateRemainingTransferPermit={calculateRemainingTransferPermitForReceipt}
                        calculateRemainingPermit={calculateRemainingPermitForReceipt}
                        generateUniquePermitNumber={generateUniquePermitNumber}
                        isManagementLetterNumberUnique={isManagementLetterNumberUnique}
                        handleSavePermit={handleSavePermit}
                        autoInvoiceEnabled={autoInvoiceEnabled}
                        setAutoInvoiceEnabled={setAutoInvoiceEnabled}
                      />
                    )}
                    
                    {activeTab === 'permits' && (
                      <DeliveryPermitsTab 
                        receipts={receipts}
                        contracts={contracts}
                        deliveryPermits={deliveryPermits}
                        searchTerm={searchTerm}
                        handleSavePermit={handleSavePermit}
                        handleDeletePermit={handleDeletePermit}
                        handleConfirmPermitTransfer={handleConfirmPermitTransfer}
                        generateUniquePermitNumber={generateUniquePermitNumber}
                        isManagementLetterNumberUnique={isManagementLetterNumberUnique}
                        calculateRemainingPermitAmount={calculateRemainingTransferPermitForReceipt}
                        calculateRemainingTransferPermit={calculateRemainingTransferPermitForReceipt}
                        calculateRemainingPermit={calculateRemainingPermitForReceipt}
                        calculateRemainingReceiptWithoutTransferPermit={calculateRemainingReceiptWithoutTransferPermit}
                        onTransferToWarehouseReceipt={onTransferToWarehouseReceipt}
                        hasWarehouseReceiptForPermit={hasWarehouseReceiptForPermit}
                      />
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountingManager;
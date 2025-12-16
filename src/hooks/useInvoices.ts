import { useCallback } from 'react';
import { InvoiceData, Receipt, Contract } from '../types/accounting';
import { generateTransactionNumber, formatPersianDate } from '../utils/persian';
import { DataStorage } from '../utils/dataStorage';

export const useInvoices = (
  invoices: InvoiceData[], 
  setInvoices: React.Dispatch<React.SetStateAction<InvoiceData[]>>,
  receipts: Receipt[],
  contracts: Contract[]
) => {
  const handleSaveInvoice = useCallback((
    invoiceData: Partial<InvoiceData>, 
    editingInvoiceId: string | null
  ) => {
    if (!invoiceData.receiptId) return;
    
    const newInvoice: InvoiceData = {
      ...invoiceData,
      id: editingInvoiceId || `invoice_${Date.now()}`,
      transactionNumber: generateTransactionNumber('invoice'),
      remainingDebt: (invoiceData.invoiceAmount || 0) - (invoiceData.paidAmount || 0),
      createdAt: editingInvoiceId 
        ? invoices.find(i => i.id === editingInvoiceId)?.createdAt || new Date() 
        : new Date(),
      updatedAt: new Date(),
      invoiceType: editingInvoiceId 
        ? (invoices.find(i => i.id === editingInvoiceId)?.invoiceType || 'manual') 
        : 'manual',
      contractId: invoiceData.contractId,
      paymentDate: invoiceData.paymentDate
    } as InvoiceData;
    
    if (editingInvoiceId) {
      setInvoices(prev => prev.map(inv => inv.id === editingInvoiceId ? newInvoice : inv));
      DataStorage.getInstance().saveData('invoices', invoices.map(inv => inv.id === editingInvoiceId ? newInvoice : inv));
    } else {
      setInvoices(prev => [...prev, newInvoice]);
      DataStorage.getInstance().saveData('invoices', [...invoices, newInvoice]);
    }
  }, [invoices, setInvoices]);

  const handleDeleteInvoice = useCallback((invoiceId: string) => {
    if (window.confirm('آیا از حذف این فاکتور اطمینان دارید؟')) {
      const updatedInvoices = invoices.filter(inv => inv.id !== invoiceId);
      setInvoices(updatedInvoices);
      DataStorage.getInstance().saveData('invoices', updatedInvoices);
    }
  }, [invoices, setInvoices]);

  const handlePrintInvoice = useCallback((invoice: InvoiceData) => {
    const receipt = receipts.find(r => r.id === invoice.receiptId);
    if (!receipt) return;
    
    const contract = contracts.find(c => c.id === receipt.contractId);
    
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
            <img src="/لوگو صنعت غذایی کورش.jpg" alt="لوگو شرکت" class="logo" />
            <div class="company-info">
              <div class="invoice-title">فاکتور خدمات انبارداری</div>
              <div>شرکت صنعت غذایی کورش</div>
            </div>
            <div class="invoice-info">
              <div><strong>شماره فاکتور:</strong> ${invoice.transactionNumber}</div>
              <div><strong>تاریخ صدور:</strong> ${formatPersianDate(new Date())}</div>
              <div><strong>سال:</strong> ${new Date(invoice.year, invoice.month - 1).toLocaleDateString('fa-IR', { year: 'numeric' })}</div>
              <div><strong>ماه:</strong> ${new Date(invoice.year, invoice.month - 1).toLocaleDateString('fa-IR', { month: 'long' })}</div>
            </div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <strong>به:</strong> ${receipt.counterpartyName}<br>
            <strong>بابت:</strong> خدمات انبارداری کالای ${receipt.productName}<br>
            <strong>قرارداد:</strong> ${receipt.contractNumber}<br>
            <strong>رسید انبار:</strong> ${receipt.transactionNumber}
          </div>
          
          <table class="details-table">
            <thead>
              <tr>
                <th>شرح خدمات</th>
                <th>مقدار</th>
                <th>واحد</th>
                <th>نرخ واحد</th>
                <th>مبلغ (ریال)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>خدمات انبارداری ${receipt.productName}</td>
                <td>${receipt.receiptBasisAmount.toLocaleString('fa-IR')}</td>
                <td>${receipt.unit === 'kg' ? 'کیلوگرم' : 'تن'}</td>
                <td>${contract?.rentalRate?.toLocaleString('fa-IR') || 0}</td>
                <td class="amount-row">${invoice.invoiceAmount.toLocaleString('fa-IR')}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="total-section">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span><strong>جمع کل:</strong></span>
              <span><strong>${invoice.invoiceAmount.toLocaleString('fa-IR')} ریال</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>مبلغ واریزی:</span>
              <span>${invoice.paidAmount.toLocaleString('fa-IR')} ریال</span>
            </div>
            <div style="display: flex; justify-content: space-between; color: ${invoice.remainingDebt > 0 ? '#dc2626' : '#059669'};">
              <span><strong>مانده بدهی:</strong></span>
              <span><strong>${invoice.remainingDebt.toLocaleString('fa-IR')} ریال</strong></span>
            </div>
          </div>
          
          <div class="signature-section">
            <div class="signature-box">
              <div>مدیر مالی</div>
              <div class="signature-line"></div>
              <div>نام و امضا</div>
            </div>
            <div class="signature-box">
              <div>مدیر انبار</div>
              <div class="signature-line"></div>
              <div>نام و امضا</div>
            </div>
            <div class="signature-box">
              <div>مدیر عامل</div>
              <div class="signature-line"></div>
              <div>نام و امضا</div>
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
      alert('خطا در چاپ فاکتور. لطفاً مجدداً تلاش کنید.');
    }
  }, [receipts, contracts]);

  return {
    handleSaveInvoice,
    handleDeleteInvoice,
    handlePrintInvoice
  };
};
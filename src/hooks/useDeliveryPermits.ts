import { useCallback } from 'react';
import { DeliveryPermit, Receipt, Contract, Delivery } from '../types/accounting';
import { generateSystemPermitNumber, formatPersianDate } from '../utils/persian';
import { DataStorage } from '../utils/dataStorage';

export const useDeliveryPermits = (
  deliveryPermits: DeliveryPermit[], 
  setDeliveryPermits: React.Dispatch<React.SetStateAction<DeliveryPermit[]>>,
  receipts: Receipt[],
  contracts: Contract[],
  deliveries: Delivery[],
  setDeliveries: React.Dispatch<React.SetStateAction<Delivery[]>>
) => {
  const handleSavePermit = useCallback((
    permitData: Partial<DeliveryPermit>, 
    editingPermitId: string | null
  ) => {
    if (!permitData.receiptId) return;
    
    const receipt = receipts.find(r => r.id === permitData.receiptId);
    if (!receipt) return;
    
    const contract = contracts.find(c => c.id === receipt.contractId);
    const wastagePercentage = contract?.wastageRateValue || 0.5;
    
    const wastageAmount = (permitData.permitAmount || 0) * (wastagePercentage / 100);
    const finalPermitAmount = (permitData.permitAmount || 0) - wastageAmount;
    
    const newPermit: DeliveryPermit = {
      ...permitData,
      wastageAmount,
      finalPermitAmount,
      remainingPermit: permitData.remainingPermit || 0,
      createdAt: editingPermitId 
        ? deliveryPermits.find(p => p.id === editingPermitId)?.createdAt || new Date() 
        : new Date(),
      updatedAt: new Date(),
      contractId: receipt.contractId
    } as DeliveryPermit;
    
    if (editingPermitId) {
      const updatedPermits = deliveryPermits.map(permit => 
        permit.id === editingPermitId ? newPermit : permit
      );
      setDeliveryPermits(updatedPermits);
      DataStorage.getInstance().saveData('delivery-permits', updatedPermits);
    } else {
      setDeliveryPermits(prev => [...prev, newPermit]);
      DataStorage.getInstance().saveData('delivery-permits', [...deliveryPermits, newPermit]);
    }
  }, [deliveryPermits, setDeliveryPermits, receipts, contracts]);

  const handleDeletePermit = useCallback((permitId: string) => {
    const permit = deliveryPermits.find(p => p.id === permitId);
    if (!permit) return;
    
    const allDeliveries = DataStorage.getInstance().loadData('deliveries') || [];
    
    const hasNoValidDelivery = !allDeliveries.some(d => 
      d.permitId === permitId && 
      (d.status === 'open' || d.status === 'saved' || d.status === 'draft' || d.status === 'finalized')
    );
    
    const deliveryInCorrectionStatus = allDeliveries.some(d => 
      d.permitId === permitId && 
      d.status === 'درخواست اصلاحیه'
    );
    
    const hasNoPermitDocument = !allDeliveries.some(d => 
      d.permitId === permitId && 
      d.documentType === 'صدور مجوز حواله'
    );
    
    const hasCorrectionEvent = permit.event === 'درخواست اصلاحیه کاربر انبار';
    
    const isCancelled = permit.status === 'cancelled';
    
    if (isCancelled) {
      alert('این تراکنش قبلاً ابطال شده و در محاسبات تأثیری ندارد.');
      return;
    }
    
    if ((hasNoValidDelivery && deliveryInCorrectionStatus) || hasNoPermitDocument || hasCorrectionEvent) {
      if (window.confirm('آیا از حذف این مجوز اطمینان دارید؟')) {
        const updatedPermits = deliveryPermits.filter(p => p.id !== permitId);
        setDeliveryPermits(updatedPermits);
        DataStorage.getInstance().saveData('delivery-permits', updatedPermits);
        
        if (hasCorrectionEvent) {
          const updatedDeliveries = allDeliveries.filter(d => d.permitId !== permitId);
          DataStorage.getInstance().saveData('deliveries', updatedDeliveries);
          setDeliveries(updatedDeliveries);
        }
        
        alert('مجوز با موفقیت حذف شد.');
      }
    } else {
      alert('این مجوز قابل حذف نیست. فقط مجوزهای با شرایط زیر قابل حذف هستند:\n' +
            '1. حواله انبار باز یا ذخیره شده یا پیش نویس یا نهایی نداشته باشد و وضعیت آن "درخواست اصلاحیه" باشد\n' +
            '2. هنوز سند "صدور مجوز حواله" برای آن صادر نشده باشد\n' +
            '3. در ستون "رخداد" تراکنش "درخواست اصلاحیه کاربر انبار" ثبت شده باشد');
    }
  }, [deliveryPermits, setDeliveryPermits, deliveries, setDeliveries]);

  const handleApprovePermit = useCallback((permitId: string) => {
    const permit = deliveryPermits.find(p => p.id === permitId);
    if (!permit) return;
    
    const receipt = receipts.find(r => r.id === permit.receiptId);
    if (!receipt) return;
    
    const updatedPermit = {
      ...permit,
      status: 'issued' as const,
      updatedAt: new Date()
    };
    
    const updatedPermits = deliveryPermits.map(p => 
      p.id === permitId ? updatedPermit : p
    );
    
    setDeliveryPermits(updatedPermits);
    DataStorage.getInstance().saveData('delivery-permits', updatedPermits);
    
    const newDelivery: Delivery = {
      id: `delivery_${Date.now()}`,
      transactionNumber: generateTransactionNumber('delivery', new Date()),
      userType: 'consignment',
      companyId: receipt.companyId,
      companyName: receipt.counterpartyName,
      productId: receipt.productId,
      productName: receipt.productName,
      siteId: receipt.siteId,
      siteName: receipt.siteName,
      tankId: receipt.tankId,
      tankName: receipt.tankName,
      amount: permit.permitAmount,
      unit: receipt.unit,
      deliveryDate: new Date(),
      recipientType: 'first_party',
      notes: `حواله امانی ایجاد شده از مجوز شماره ${permit.managementLetterNumber}`,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      contractId: receipt.contractId,
      contractNumber: receipt.contractNumber,
      permitId: permit.id,
      managementLetterNumber: permit.managementLetterNumber,
      fromPermit: true,
      permitAmount: permit.permitAmount,
      wastageAmount: permit.wastageAmount,
      finalPermitAmount: permit.finalPermitAmount,
      fullAmountTransferred: true
    };
    
    const allDeliveries = DataStorage.getInstance().loadData('deliveries') || [];
    allDeliveries.push(newDelivery);
    DataStorage.getInstance().saveData('deliveries', allDeliveries);
    setDeliveries(allDeliveries);
    
    alert('مجوز با موفقیت تایید شد و مقدار کامل مجوز حواله به صفحه حواله انبار منتقل گردید.');
  }, [deliveryPermits, setDeliveryPermits, receipts, setDeliveries]);

  const handlePrintPermit = useCallback((permit: DeliveryPermit) => {
    const receipt = receipts.find(r => r.id === permit.receiptId);
    if (!receipt) return;
    
    const contract = contracts.find(c => c.id === receipt.contractId);
    if (!contract) return;
    
    const contractPermits = deliveryPermits.filter(p => 
      p.receiptId && receipts.find(r => r.id === p.receiptId && r.contractId === contract.id)
    );
    
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <title>مجوز حواله - ${permit.managementLetterNumber}</title>
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
          .permit-container {
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
          .permit-title {
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
            width: 18%;
            text-align: center;
          }
          .signature-line {
            border-top: 1px solid #333;
            height: 1px;
            width: 80%;
            margin: 10px auto;
          }
          .permit-status {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
          }
          .status-draft {
            background-color: #f3f4f6;
            color: #4b5563;
          }
          .status-issued {
            background-color: #dbeafe;
            color: #1d4ed8;
          }
          .status-used {
            background-color: #d1fae5;
            color: #065f46;
          }
          .status-cancelled {
            background-color: #fee2e2;
            color: #b91c1c;
          }
        </style>
      </head>
      <body>
        <div class="permit-container">
          <div class="header">
            <img src="/لوگو صنعت غذایی کورش.jpg" alt="لوگو شرکت" class="logo" />
            <div class="company-info">
              <div class="permit-title">مجوز حواله انبار</div>
              <div>شرکت صنعت غذایی کورش</div>
            </div>
            <div class="permit-info">
              <div><strong>شماره سیستمی:</strong> ${permit.systemPermitNumber}</div>
              <div><strong>شماره مجوز:</strong> ${permit.managementLetterNumber}</div>
              <div><strong>تاریخ صدور:</strong> ${formatPersianDate(new Date())}</div>
              <div><strong>وضعیت:</strong> 
                <span class="permit-status ${
                  permit.status === 'draft' ? 'status-draft' : 
                  permit.status === 'issued' ? 'status-issued' : 
                  permit.status === 'used' ? 'status-used' : 'status-cancelled'
                }">
                  ${permit.status === 'draft' ? 'پیش‌نویس' : 
                    permit.status === 'issued' ? 'صادر شده' : 
                    permit.status === 'used' ? 'استفاده شده' : 'ابطال شده'}
                </span>
              </div>
            </div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <strong>به:</strong> ${receipt.counterpartyName}<br>
            <strong>بابت:</strong> حواله کالای ${receipt.productName}<br>
            <strong>قرارداد:</strong> ${contract.contractNumber}<br>
            <strong>رسید انبار:</strong> ${receipt.transactionNumber}
          </div>
          
          <table class="details-table">
            <thead>
              <tr>
                <th>شرح</th>
                <th>مقدار</th>
                <th>واحد</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>مقدار مجوز حواله</td>
                <td>${permit.permitAmount.toLocaleString('fa-IR')}</td>
                <td>${receipt.unit === 'kg' ? 'کیلوگرم' : 'تن'}</td>
                <td>-</td>
              </tr>
              <tr>
                <td>مقدار افت مجوز</td>
                <td>${permit.wastageAmount.toLocaleString('fa-IR')}</td>
                <td>${receipt.unit === 'kg' ? 'کیلوگرم' : 'تن'}</td>
                <td>${contract?.wastageRateValue || 0.5}%</td>
              </tr>
              <tr>
                <td>مقدار مجوز بعد از کسر افت</td>
                <td class="amount-row">${permit.finalPermitAmount.toLocaleString('fa-IR')}</td>
                <td>${receipt.unit === 'kg' ? 'کیلوگرم' : 'تن'}</td>
                <td>-</td>
              </tr>
              <tr>
                <td>مانده مجوز حواله</td>
                <td>${permit.remainingPermit.toLocaleString('fa-IR')}</td>
                <td>${receipt.unit === 'kg' ? 'کیلوگرم' : 'تن'}</td>
                <td>-</td>
              </tr>
            </tbody>
          </table>
          
          <div style="margin-top: 30px;">
            <h4 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #059669;">سایر مجوزهای صادر شده برای این قرارداد:</h4>
            <table class="details-table">
              <thead>
                <tr>
                  <th>شماره مجوز</th>
                  <th>مقدار مجوز</th>
                  <th>مقدار افت</th>
                  <th>مقدار نهایی</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                ${contractPermits.map(p => `
                  <tr>
                    <td>${p.managementLetterNumber}</td>
                    <td>${p.permitAmount.toLocaleString('fa-IR')}</td>
                    <td>${p.wastageAmount.toLocaleString('fa-IR')}</td>
                    <td>${p.finalPermitAmount.toLocaleString('fa-IR')}</td>
                    <td>
                      <span class="permit-status ${
                        p.status === 'draft' ? 'status-draft' : 
                        p.status === 'issued' ? 'status-issued' : 
                        p.status === 'used' ? 'status-used' : 'status-cancelled'
                      }">
                        ${p.status === 'draft' ? 'پیش‌نویس' : 
                          p.status === 'issued' ? 'صادر شده' : 
                          p.status === 'used' ? 'استفاده شده' : 'ابطال شده'}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="signature-section">
            <div class="signature-box">
              <div>انبار دار</div>
              <div class="signature-line"></div>
              <div>نام و امضا</div>
            </div>
            <div class="signature-box">
              <div>رئیس انبار</div>
              <div class="signature-line"></div>
              <div>نام و امضا</div>
            </div>
            <div class="signature-box">
              <div>نماینده بازرگانی</div>
              <div class="signature-line"></div>
              <div>نام و امضا</div>
            </div>
            <div class="signature-box">
              <div>نماینده مستاجر</div>
              <div class="signature-line"></div>
              <div>نام و امضا</div>
            </div>
            <div class="signature-box">
              <div>نمایده گمرک</div>
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
      console.error('Error printing permit:', error);
      alert('خطا در چاپ مجوز. لطفاً مجدداً تلاش کنید.');
    }
  }, [deliveryPermits, receipts, contracts]);

  return {
    handleSavePermit,
    handleDeletePermit,
    handleApprovePermit,
    handlePrintPermit
  };
};
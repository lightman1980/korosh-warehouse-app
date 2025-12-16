// لوگوی شرکت
export const COMPANY_LOGO_URL = "https://z-cdn-media.chatglm.cn/files/7094d229-4d09-430e-98c1-73f61a7991d6_%D9%84%D9%88%DA%AF%D9%88%20%D8%B5%D9%86%D8%B9%D8%AA%20%D8%BA%D8%B0%D8%A7%DB%8C%DB%8C%20%DA%A9%D9%88%D8%B1%D8%B4.jpg?auth_key=1788869487-700454f4145444fcabf14d4109c175fd-0-531d677f789c51954e01f268eaedd559";

// استایل‌های چاپ مدرن مشابه فرم مجوز
export const getModernPrintStyles = (direction: 'rtl' | 'ltr' = 'rtl') => `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  
  @page {
    margin: 8mm;
    size: A4;
  }
  
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  body {
    font-family: ${direction === 'rtl' ? "'Tahoma', 'B Nazanin', sans-serif" : "'Inter', sans-serif"};
    direction: ${direction};
    text-align: ${direction === 'rtl' ? 'right' : 'left'};
    line-height: 1.6;
    margin: 0;
    padding: 5px;
    background: #f8f9fa;
    color: #1a1a1a;
    font-size: 14px;
  }
  
  .document {
    width: 100%;
    max-width: 190mm;
    margin: 0 auto;
    background: #ffffff;
    position: relative;
    border: 3px solid #2563eb;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  }
  
  .document::before {
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
  
  .company-section {
    flex: 1;
    display: flex;
    align-items: flex-start;
    gap: 15px;
  }
  
  .company-logo {
    width: 70px;
    height: 70px;
    object-fit: contain;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    background: white;
    padding: 5px;
  }
  
  .company-info {
    flex: 1;
  }
  
  .company-name {
    font-size: 22px;
    font-weight: 700;
    color: #1e40af;
    margin-bottom: 6px;
    letter-spacing: -0.5px;
  }
  
  .company-address {
    font-size: 11px;
    color: #64748b;
    line-height: 1.3;
  }
  
  .document-title-section {
    text-align: center;
    flex: 1;
  }
  
  .document-type {
    font-size: 10px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 4px;
  }
  
  .document-title {
    font-size: 24px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 6px;
  }
  
  .document-number {
    font-size: 15px;
    font-weight: 600;
    color: #1e40af;
    background: #eff6ff;
    padding: 6px 14px;
    border-radius: 6px;
    display: inline-block;
    border: 1px solid #bfdbfe;
  }
  
  .document-details {
    flex: 1;
    text-align: ${direction === 'rtl' ? 'left' : 'right'};
  }
  
  .detail-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 11px;
  }
  
  .detail-label {
    color: #64748b;
    font-weight: 500;
  }
  
  .detail-value {
    color: #1e293b;
    font-weight: 600;
  }
  
  .content {
    margin-bottom: 25px;
  }
  
  .two-column {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
  }
  
  .info-section {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 15px;
  }
  
  .section-title {
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 6px;
  }
  
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  
  .info-item {
    display: flex;
    flex-direction: column;
  }
  
  .info-label {
    font-size: 10px;
    color: #64748b;
    margin-bottom: 2px;
    font-weight: 500;
  }
  
  .info-value {
    font-size: 12px;
    color: #1e293b;
    font-weight: 600;
  }
  
  .data-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    font-size: 11px;
    margin: 20px 0;
  }
  
  .data-table thead {
    background: #f1f5f9;
  }
  
  .data-table th {
    padding: 10px 12px;
    text-align: ${direction === 'rtl' ? 'right' : 'left'};
    font-weight: 600;
    color: #475569;
    border-bottom: 1px solid #e2e8f0;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .data-table td {
    padding: 10px 12px;
    text-align: ${direction === 'rtl' ? 'right' : 'left'};
    border-bottom: 1px solid #f1f5f9;
    color: #1e293b;
    font-weight: 500;
  }
  
  .data-table tbody tr:hover {
    background: #f8fafc;
  }
  
  .data-table tbody tr:last-child td {
    border-bottom: none;
  }
  
  .signature-section {
    display: flex;
    justify-content: space-between;
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
    flex: 1;
    margin: 0 8px;
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
  
  .signature-name {
    font-size: 9px;
    color: #64748b;
  }
  
  .watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-45deg);
    font-size: 120px;
    color: rgba(37, 99, 235, 0.04);
    font-weight: 900;
    z-index: 0;
    pointer-events: none;
    letter-spacing: 15px;
  }
  
  .footer {
    margin-top: 30px;
    padding-top: 15px;
    border-top: 2px solid #3b82f6;
    text-align: center;
    font-size: 9px;
    color: #94a3b8;
  }
  
  @media print {
    body {
      font-size: 13px;
      padding: 0;
    }
    
    .document {
      box-shadow: none;
      border: 2px solid #2563eb;
    }
  }
  
  .print-button {
    position: fixed;
    top: 20px;
    ${direction === 'rtl' ? 'left' : 'right'}: 20px;
    background: #3b82f6;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 5px;
    cursor: pointer;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 5px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 1000;
  }
  
  .print-button:hover {
    background: #2563eb;
  }
  
  @media print {
    .print-button {
      display: none;
    }
  }
`;

// تابع برای ایجاد لوگوی شرکت
export const getCompanyLogoHTML = () => `
  <img src="${COMPANY_LOGO_URL}" alt="لوگو شرکت صنعت غذایی کورش" class="company-logo" 
    onerror="this.src='/لوگو صنعت غذایی کورش.jpg'; this.onerror=function(){this.style.display='none';};" />
`;


/**
 * اسکریپت تست و اصلاح وضعیت تراکنش‌ها
 * 
 * این اسکریپت را در کنسول مرورگر (F12) کپی کنید و اجرا کنید
 * برای اطمینان از عملکرد صحیح سیستم تغییر وضعیت
 */

// 1. بررسی و نمایش وضعیت فعلی همه تراکنش‌ها
function checkAllStatuses() {
  console.log('=== بررسی وضعیت همه تراکنش‌ها ===');
  
  const deliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
  const consignmentSlips = JSON.parse(localStorage.getItem('consignment-delivery-slips') || '[]');
  const ownershipSlips = JSON.parse(localStorage.getItem('ownership-delivery-slips') || '[]');
  
  console.log('📦 Deliveries:', deliveries.length, 'items');
  deliveries.forEach((d, i) => {
    console.log(`  [${i}] ID: ${d.id}, Number: ${d.transactionNumber}, Status: ${d.status}, Type: ${d.userType}`);
  });
  
  console.log('📋 Consignment Slips:', consignmentSlips.length, 'items');
  consignmentSlips.forEach((s, i) => {
    console.log(`  [${i}] ID: ${s.id}, Number: ${s.transactionNumber}, Status: ${s.status}`);
  });
  
  console.log('📄 Ownership Slips:', ownershipSlips.length, 'items');
  ownershipSlips.forEach((s, i) => {
    console.log(`  [${i}] ID: ${s.id}, Number: ${s.transactionNumber}, Status: ${s.status}`);
  });
  
  return { deliveries, consignmentSlips, ownershipSlips };
}

// 2. ریست همه وضعیت‌ها به "draft" (پیش‌نویس)
function resetAllToDraft() {
  console.log('🔄 ریست همه وضعیت‌ها به draft...');
  
  const keys = ['deliveries', 'consignment-delivery-slips', 'ownership-delivery-slips'];
  let totalUpdated = 0;
  
  keys.forEach(key => {
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = arr.map(x => ({
      ...x,
      status: 'draft',
      updatedAt: new Date().toISOString()
    }));
    localStorage.setItem(key, JSON.stringify(updated));
    totalUpdated += updated.length;
    console.log(`  ✓ ${key}: ${updated.length} رکورد به‌روزرسانی شد`);
  });
  
  console.log(`✅ مجموع ${totalUpdated} رکورد به draft تغییر یافت`);
  alert(`✅ ${totalUpdated} تراکنش به وضعیت "پیش‌نویس" تغییر یافت.\n\nصفحه را رفرش کنید (F5).`);
}

// 3. تغییر وضعیت یک تراکنش خاص
function toggleStatusById(idOrNumber) {
  console.log(`🔄 Toggle status for: ${idOrNumber}`);
  
  const keys = ['deliveries', 'consignment-delivery-slips', 'ownership-delivery-slips'];
  let found = false;
  let newStatus = null;
  
  keys.forEach(key => {
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = arr.map(x => {
      const matchById = x.id === idOrNumber;
      const matchByNumber = x.transactionNumber === idOrNumber;
      
      if (matchById || matchByNumber) {
        found = true;
        const currentStatus = x.status || 'draft';
        newStatus = currentStatus === 'draft' ? 'issued' : 'draft';
        console.log(`  Found: ${x.id} (${x.transactionNumber})`);
        console.log(`  Status: ${currentStatus} → ${newStatus}`);
        return { ...x, status: newStatus, updatedAt: new Date().toISOString() };
      }
      return x;
    });
    
    localStorage.setItem(key, JSON.stringify(updated));
  });
  
  if (found) {
    const statusFa = newStatus === 'draft' ? 'پیش‌نویس' : 'صادر شده';
    console.log(`✅ وضعیت به "${statusFa}" تغییر یافت`);
    alert(`✅ وضعیت به "${statusFa}" تغییر یافت.\n\nصفحه را رفرش کنید (F5).`);
  } else {
    console.log('❌ تراکنش پیدا نشد');
    alert('❌ تراکنش با این شناسه یا شماره پیدا نشد.');
  }
}

// 4. نمایش تراکنش‌هایی که وضعیت "issued" دارند
function showIssuedTransactions() {
  console.log('=== تراکنش‌های صادر شده ===');
  
  const deliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
  const issued = deliveries.filter(d => d.status === 'issued');
  
  console.log(`📊 تعداد تراکنش‌های صادر شده: ${issued.length}`);
  issued.forEach((d, i) => {
    console.log(`  [${i}] ID: ${d.id}, Number: ${d.transactionNumber}, Type: ${d.userType}`);
  });
  
  return issued;
}

// 5. همگام‌سازی همه لیست‌ها (اطمینان از یکسان بودن داده‌ها)
function syncAllLists() {
  console.log('🔄 همگام‌سازی همه لیست‌ها...');
  
  const deliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
  const consignmentSlips = JSON.parse(localStorage.getItem('consignment-delivery-slips') || '[]');
  const ownershipSlips = JSON.parse(localStorage.getItem('ownership-delivery-slips') || '[]');
  
  // به‌روزرسانی consignment-delivery-slips از deliveries
  const updatedConsignmentSlips = consignmentSlips.map(slip => {
    const delivery = deliveries.find(d => 
      d.id === slip.id || d.transactionNumber === slip.transactionNumber
    );
    if (delivery) {
      console.log(`  Sync consignment slip ${slip.id}: ${slip.status} → ${delivery.status}`);
      return { ...slip, status: delivery.status, updatedAt: delivery.updatedAt };
    }
    return slip;
  });
  
  // به‌روزرسانی ownership-delivery-slips از deliveries
  const updatedOwnershipSlips = ownershipSlips.map(slip => {
    const delivery = deliveries.find(d => 
      d.id === slip.id || d.transactionNumber === slip.transactionNumber
    );
    if (delivery) {
      console.log(`  Sync ownership slip ${slip.id}: ${slip.status} → ${delivery.status}`);
      return { ...slip, status: delivery.status, updatedAt: delivery.updatedAt };
    }
    return slip;
  });
  
  localStorage.setItem('consignment-delivery-slips', JSON.stringify(updatedConsignmentSlips));
  localStorage.setItem('ownership-delivery-slips', JSON.stringify(updatedOwnershipSlips));
  
  console.log('✅ همگام‌سازی کامل شد');
  alert('✅ همه لیست‌ها همگام‌سازی شدند.\n\nصفحه را رفرش کنید (F5).');
}

// 6. پاک کردن کش مرورگر (بدون حذف localStorage)
async function clearCacheOnly() {
  console.log('🗑️ پاک کردن کش...');
  
  try {
    // پاکسازی CacheStorage
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      console.log(`  ✓ ${keys.length} cache پاک شد`);
    }
    
    // آنرجیستر سرویس‌ورکرها
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
      console.log(`  ✓ ${regs.length} service worker آنرجیستر شد`);
    }
    
    console.log('✅ کش پاک شد');
    alert('✅ کش برنامه پاک شد.\n\nصفحه اکنون رفرش می‌شود...');
    window.location.reload();
  } catch (e) {
    console.error('❌ خطا در پاکسازی کش:', e);
    alert('❌ خطا در پاکسازی کش. از Developer Tools استفاده کنید.');
  }
}

// نمایش راهنما
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║          اسکریپت تست و اصلاح وضعیت تراکنش‌ها                ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                 ║
║  دستورات موجود:                                               ║
║                                                                 ║
║  checkAllStatuses()           - نمایش وضعیت همه تراکنش‌ها     ║
║  resetAllToDraft()            - ریست همه به "پیش‌نویس"       ║
║  toggleStatusById('id')       - تغییر وضعیت یک تراکنش         ║
║  showIssuedTransactions()     - نمایش تراکنش‌های صادر شده    ║
║  syncAllLists()               - همگام‌سازی همه لیست‌ها        ║
║  clearCacheOnly()             - پاک کردن کش (حفظ داده‌ها)    ║
║                                                                 ║
║  مثال:                                                         ║
║  toggleStatusById('delivery_1731234567890')                    ║
║  toggleStatusById('WHD-2024-001')                              ║
║                                                                 ║
╚═══════════════════════════════════════════════════════════════╝
`);

// اجرای خودکار بررسی
console.log('🔍 بررسی خودکار...');
checkAllStatuses();


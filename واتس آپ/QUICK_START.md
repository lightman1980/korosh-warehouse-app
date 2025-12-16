# 📱 راهنمای کامل راه‌اندازی سیستم واتس‌اپ

## 🎯 خلاصه پروژه

شما اکنون یک **سیستم کامل ارسال هشدارهای واتس‌اپ** دارید که قابلیت‌های زیر را ارائه می‌دهد:

✅ **رابط کاربری کامل** برای مدیریت مخاطبین و پیام‌ها  
✅ **Backend API قوی** برای ارسال پیام‌ها  
✅ **پشتیبانی از سرویس‌های معتبر**: Twilio، 360Dialog، Green API  
✅ **قالب‌های پیام قابل تنظیم** با متغیرها  
✅ **ارسال انبوه** پیام‌ها  
✅ **پیگیری وضعیت** تحویل پیام‌ها  
✅ **آمار و گزارش‌گیری** کامل  
✅ **Docker Support** برای استقرار آسان  
✅ **سیستم تست خودکار**

## 🚀 شروع سریع (5 دقیقه)

### 1️⃣ نصب وابستگی‌ها
```bash
npm install
```

### 2️⃣ تنظیم محیط
```bash
# کپی فایل نمونه
cp .env.example .env

# ویرایش تنظیمات (ویرایشگر مورد علاقه شما)
nano .env
```

### 3️⃣ تنظیم کلیدهای API
در فایل `.env`، یکی از گزینه‌های زیر را تنظیم کنید:

**گزینه A: Twilio (توصیه می‌شود)**
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_API_KEY=your_api_key
TWILIO_PHONE_NUMBER_ID=your_whatsapp_number_id
```

**گزینه B: 360Dialog**
```env
THREESIXTY_API_KEY=your_360dialog_api_key
THREESIXTY_INSTANCE_ID=your_instance_id
```

**گزینه C: Green API**
```env
GREEN_API_INSTANCE_ID=your_instance_id
GREEN_API_TOKEN=your_api_token
```

### 4️⃣ راه‌اندازی سرویس
```bash
# راه‌اندازی سرویس‌های پایه (MongoDB, Redis)
./manage.sh start-dev

# در ترمینال جدید: اجرای API
npm run dev
```

### 5️⃣ تست سیستم
```bash
# تست عملکرد
npm test

# یا تست کامل
node test-whatsapp.js all
```

## 🏗️ فایل‌های ایجاد شده

```
📁 workspace/
├── 📄 WhatsAppIntegrationSystem.tsx    ← رابط کاربری React
├── 📄 whatsapp-backend.js             ← API Backend
├── 📄 package.json                    ← وابستگی‌ها
├── 📄 .env.example                    ← نمونه تنظیمات
├── 📄 README.md                       ← راهنمای کامل
├── 📄 test-whatsapp.js               ← سیستم تست
├── 📄 Dockerfile                      ← کانتینر Docker
├── 📄 docker-compose.yml             ← سرویس‌های Docker
└── 📄 manage.sh                      ← اسکریپت مدیریت
```

## 🔧 استفاده از سیستم

### افزودن به پروژه React موجود

```tsx
// در فایل اصلی پروژه شما
import { WhatsAppIntegrationSystem } from './WhatsAppIntegrationSystem';

function App() {
  return (
    <div>
      <h1>سیستم اعلان</h1>
      <WhatsAppIntegrationSystem />
    </div>
  );
}
```

### ارسال پیام از کد

```javascript
// ارسال پیام منفرد
const sendAlert = async (userPhone, productName, currentStock) => {
  const response = await fetch('http://localhost:3001/api/whatsapp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: userPhone,
      message: 'low_inventory_alert',
      templateVariables: {
        name: 'کاربر محترم',
        product: productName,
        amount: currentStock + ' کیلوگرم'
      },
      messageType: 'alert'
    })
  });
  
  const result = await response.json();
  console.log('Status:', result.success ? 'موفق' : 'ناموفق');
};

// استفاده در سیستم انبار
const checkInventory = async () => {
  const inventory = await fetchInventory();
  
  for (const item of inventory) {
    if (item.stock <= item.threshold) {
      await sendAlert(
        item.managerPhone,
        item.name,
        item.stock
      );
    }
  }
};
```

### اعلان‌های خودکار

```javascript
// هر روز ساعت 9 صبح
const cron = require('node-cron');

cron.schedule('0 9 * * *', async () => {
  // گزارش روزانه
  const report = await generateDailyReport();
  
  await fetch('http://localhost:3001/api/whatsapp/send-bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipients: await getManagers(),
      message: 'daily_report',
      templateVariables: report
    })
  });
});
```

## 📊 سرویس‌های پشتیبانی شده

### 1. Twilio (توصیه می‌شود)
- **مزایا**: رسمی، قابل اعتماد، پشتیبانی کامل
- **هزینه**: $0.005 به ازای هر پیام
- **راه‌اندازی**: [twilio.com/console](https://twilio.com/console)

### 2. 360Dialog
- **مزایا**: قیمت مناسب، رابط ساده
- **هزینه**: €0.004 به ازای هر پیام
- **راه‌اندازی**: [360dialog.io](https://360dialog.io)

### 3. Green API
- **مزایا**: پشتیبانی فارسی، قیمت ارزان
- **هزیاده**: $1.99 ماهانه + $0.0015 به ازای هر پیام
- **راه‌اندازی**: [green-api.com](https://green-api.com)

## 🔍 تست و عیب‌یابی

### تست سریع
```bash
# بررسی سلامت سیستم
curl http://localhost:3001/api/health

# تست اتصال واتس‌اپ
curl -X POST http://localhost:3001/api/whatsapp/test-connection

# دریافت آمار
curl http://localhost:3001/api/statistics
```

### تست کامل
```bash
# اجرای تمام تست‌ها
node test-whatsapp.js all

# یا با اسکریپت مدیریت
./manage.sh test
```

### مشاهده لاگ‌ها
```bash
# لاگ‌های API
./manage.sh logs api

# لاگ‌های پایگاه داده
./manage.sh logs db

# تمام لاگ‌ها
./manage.sh logs all
```

## 🚀 استقرار در تولید

### با Docker (توصیه می‌شود)
```bash
# راه‌اندازی کامل
./manage.sh start-prod

# با داشبورد نظارت
./manage.sh monitor
```

### با PM2
```bash
# نصب PM2
npm install -g pm2

# اجرای سرویس
npm run pm2:start

# مشاهده لاگ‌ها
npm run pm2:logs
```

## 💰 برآورد هزینه

### برای 1000 پیام در ماه:

**Twilio**: $5 + $1.99 ماهانه = **$6.99**  
**360Dialog**: €4 + €9.90 ماهانه = **€13.90**  
**Green API**: $1.99 + $1.50 = **$3.49**

### هزینه‌های اضافی:
- **سرور**: $5-20/ماه (بسته به حجم)
- **دامنه**: $10-15/سال
- **SSL**: رایگان (Let's Encrypt)

## 🔒 نکات امنیتی

1. **کلیدهای API**: در محیط امن ذخیره کنید
2. **Rate Limiting**: محدودیت 100 درخواست/15 دقیقه
3. **Validation**: اعتبارسنجی تمام ورودی‌ها
4. **HTTPS**: در تولید حتماً از HTTPS استفاده کنید
5. **Webhook Security**: امضای دیجیتال پیام‌ها

## 📈 بهینه‌سازی عملکرد

1. **Caching**: Redis برای cache
2. **Database Indexing**: ایندکس مناسب MongoDB
3. **Connection Pooling**: مدیریت اتصال‌ها
4. **Rate Limiting**: محدودیت نرخ مناسب
5. **Monitoring**: پایش عملکرد

## 🆘 رفع مشکلات متداول

### پیام‌ها ارسال نمی‌شوند
```bash
# بررسی اتصال
curl -X POST http://localhost:3001/api/whatsapp/test-connection

# بررسی کلیدهای API
cat .env | grep API_KEY
```

### خطای پایگاه داده
```bash
# بررسی وضعیت MongoDB
docker-compose exec mongodb mongosh

# ریستارت سرویس‌ها
./manage.sh restart
```

### عملکرد کند
```bash
# بررسی منابع سیستم
./manage.sh status

# بررسی لاگ‌های عملکرد
./manage.sh logs api | grep -E "(slow|error)"
```

## 📞 پشتیبانی

- **مستندات کامل**: فایل `README.md`
- **تست خودکار**: فایل `test-whatsapp.js`
- **لاگ‌های سیستم**: پوشه `logs/`
- **تنظیمات**: فایل `.env.example`

## 🎉 نتیجه‌گیری

شما اکنون یک **سیستم حرفه‌ای واتس‌اپ** دارید که:

✅ می‌تواند هشدارهای خودکار ارسال کند  
✅ قابلیت ارسال انبوه پیام‌ها را دارد  
✅ با سرویس‌های معتبر جهانی ادغام شده  
✅ رابط کاربری کامل و فارسی دارد  
✅ قابلیت‌های نظارت و گزارش‌گیری پیشرفته

**برای شروع**: فایل `.env` را تنظیم کرده و `./manage.sh start-dev` را اجرا کنید!

---

**توسعه‌دهنده**: MiniMax Agent  
**تاریخ**: نوامبر 2025  
**نسخه**: 1.0.0
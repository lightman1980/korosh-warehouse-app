# 📱 سیستم ارسال هشدارهای واتس‌اپ

سیستم کاملی برای ارسال هشدارها و پیام‌های واتس‌اپ به شماره‌های مختلف کاربران. این سیستم قابلیت‌های پیشرفته‌ای برای مدیریت مخاطبین، قالب‌های پیام، و پیگیری وضعیت پیام‌ها ارائه می‌دهد.

## ✨ ویژگی‌های کلیدی

- **🔗 اتصال به سرویس‌های معتبر**: پشتیبانی از Twilio، 360Dialog، و Green API
- **👥 مدیریت مخاطبین**: افزودن، ویرایش، و مدیریت شماره‌های کاربران
- **📝 قالب‌های پیام**: ایجاد و استفاده از قالب‌های قابل تنظیم
- **📊 پیگیری وضعیت**: مشاهده وضعیت ارسال و تحویل پیام‌ها
- **🚨 هشدارهای خودکار**: ارسال خودکار پیام‌های هشدار
- **📈 آمار و گزارش**: آمار کامل استفاده از سیستم
- **🔒 امنیت**: احراز هویت و محدودیت نرخ درخواست‌ها
- **🌐 چندزبانه**: پشتیبانی کامل از فارسی

## 🚀 راه‌اندازی سریع

### 1. نصب وابستگی‌ها

```bash
npm install
```

### 2. تنظیم متغیرهای محیطی

```bash
cp .env.example .env
```

فایل `.env` را ویرایش کنید و تنظیمات مورد نیاز خود را وارد کنید:

```env
# سرویس‌دهنده Twilio (توصیه می‌شود)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_API_KEY=your_api_key
TWILIO_PHONE_NUMBER_ID=your_phone_number_id
```

### 3. اجرای سرویس

```bash
# حالت توسعه
npm run dev

# حالت تولید
npm start

# با PM2
npm run pm2:start
```

### 4. تست اتصال

```bash
curl -X POST http://localhost:3001/api/whatsapp/test-connection
```

## 🏗️ معماری سیستم

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │        WhatsAppIntegrationSystem.tsx            │   │
│  │  - رابط کاربری گرافیکی                        │   │
│  │  - مدیریت مخاطبین                             │   │
│  │  - ارسال پیام‌های انبوه                       │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP/API
┌─────────────────────────────────────────────────────────┐
│                  Backend API (Node.js)                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │              whatsapp-backend.js                │   │
│  │  - Express.js Server                           │   │
│  │  - Rate Limiting                               │   │
│  │  - Authentication                              │   │
│  │  - Webhook Handling                            │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼ WhatsApp APIs
┌─────────────────────────────────────────────────────────┐
│                WhatsApp Providers                       │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐  │
│  │   Twilio    │ │  360Dialog   │ │   Green API     │  │
│  │  Business   │ │    WhatsApp  │ │   WhatsApp      │  │
│  │     API     │ │      API     │ │     API         │  │
│  └─────────────┘ └──────────────┘ └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 🔧 تنظیمات پیشرفته

### پیکربندی Twilio (توصیه می‌شود)

1. **ایجاد حساب Twilio**: [twilio.com](https://twilio.com)
2. **راه‌اندازی WhatsApp Business**: در کنسول Twilio
3. **دریافت کلیدهای API**:
   - Account SID
   - Auth Token  
   - API Key & Secret
   - WhatsApp Phone Number ID

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER_ID=your_phone_number_id
```

### پیکربندی 360Dialog

1. **ثبت‌نام در 360Dialog**: [360dialog.io](https://360dialog.io)
2. **دریافت کلید API**:
   - API Key
   - Instance ID

```env
THREESIXTY_API_KEY=your_360dialog_api_key
THREESIXTY_INSTANCE_ID=your_instance_id
```

### پیکربندی Green API

1. **ثبت‌نام در Green API**: [green-api.com](https://green-api.com)
2. **دریافت اطلاعات**:
   - Instance ID
   - API Token

```env
GREEN_API_INSTANCE_ID=your_instance_id
GREEN_API_TOKEN=your_api_token
```

## 📋 API Endpoints

### احراز هویت و سلامت

- `GET /api/health` - بررسی سلامت سیستم
- `POST /api/whatsapp/test-connection` - تست اتصال

### مدیریت مخاطبین

- `GET /api/users` - دریافت لیست مخاطبین
- `POST /api/users` - افزودن مخاطب جدید
- `PUT /api/users/:id` - ویرایش مخاطب
- `DELETE /api/users/:id` - حذف مخاطب

### ارسال پیام

- `POST /api/whatsapp/send` - ارسال پیام منفرد
- `POST /api/whatsapp/send-bulk` - ارسال پیام انبوه

### مدیریت قالب‌ها

- `GET /api/templates` - دریافت قالب‌ها
- `POST /api/templates` - ایجاد قالب جدید

### گزارش‌گیری

- `GET /api/messages` - تاریخچه پیام‌ها
- `GET /api/statistics` - آمار سیستم

### وب‌هوک‌ها

- `POST /api/webhooks/twilio` - وضعیت تحویل پیام‌های Twilio
- `POST /api/webhooks/green-api` - وضعیت پیام‌های Green API

## 🔄 استفاده از قالب‌ها

### ایجاد قالب

```javascript
const template = {
  name: 'هشدار کمبود موجودی',
  content: '🔔 سلام {name} عزیز! موجودی {product} به {amount} رسیده است.',
  category: 'alert',
  language: 'fa'
};
```

### متغیرهای قابل استفاده

- `{name}` - نام کاربر
- `{product}` - نام محصول
- `{amount}` - مقدار موجودی
- `{oldPrice}` - قیمت قبلی
- `{newPrice}` - قیمت جدید
- `{ipAddress}` - آدرس IP
- `{timestamp}` - زمان

## 📊 مثال استفاده

### ارسال پیام منفرد

```javascript
const response = await fetch('http://localhost:3001/api/whatsapp/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    phoneNumber: '+989123456789',
    message: '🔔 سلام احمد عزیز! موجودی گندم به 50 کیلوگرم رسیده است.',
    messageType: 'alert'
  })
});
```

### ارسال پیام انبوه

```javascript
const response = await fetch('http://localhost:3001/api/whatsapp/send-bulk', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    recipients: [
      { phoneNumber: '+989123456789', name: 'احمد محمدی' },
      { phoneNumber: '+989876543210', name: 'فاطمه احمدی' }
    ],
    message: '🎉 تخفیف ویژه! تمام محصولات با 20% تخفیف',
    messageType: 'marketing'
  })
});
```

### استفاده از قالب

```javascript
const response = await fetch('http://localhost:3001/api/whatsapp/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    phoneNumber: '+989123456789',
    message: 'low_inventory_alert', // ID قالب
    templateVariables: {
      name: 'احمد محمدی',
      product: 'گندم',
      amount: '50 کیلوگرم'
    },
    messageType: 'alert'
  })
});
```

## 🛠️ ادغام با سیستم موجود

### 1. افزودن به فایل اصلی React

```tsx
import { WhatsAppIntegrationSystem } from './WhatsAppIntegrationSystem';

// در کامپوننت اصلی
<WhatsAppIntegrationSystem />
```

### 2. پیکربندی خودکار

```javascript
// ارسال هشدار خودکار در صورت کمبود موجودی
const checkInventory = async (productId) => {
  const inventory = await getInventory(productId);
  
  if (inventory.amount < inventory.threshold) {
    await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: '+989123456789',
        message: 'low_inventory_alert',
        templateVariables: {
          name: inventory.managerName,
          product: inventory.productName,
          amount: inventory.amount + ' ' + inventory.unit
        }
      })
    });
  }
};
```

### 3. اعلان‌های خودکار

```javascript
// cron job برای ارسال گزارش روزانه
const cron = require('node-cron');

cron.schedule('0 9 * * *', async () => {
  const dailyReport = await generateDailyReport();
  
  await fetch('/api/whatsapp/send-bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipients: await getActiveManagers(),
      message: 'daily_report',
      templateVariables: dailyReport
    })
  });
});
```

## 🔍 عیب‌یابی

### مشکلات متداول

1. **خطای اتصال**
   ```bash
   # تست اتصال
   curl -X POST http://localhost:3001/api/whatsapp/test-connection
   ```

2. **پیام‌ها ارسال نمی‌شوند**
   - بررسی کلیدهای API
   - تأیید شماره تلفن در سرویس‌دهنده
   - بررسی محدودیت نرخ

3. **خطای اعتبارسنجی شماره تلفن**
   - اطمینان از فرمت صحیح: `+989123456789`
   - عدم وجود فاصله یا کاراکتر اضافی

### لاگ‌های سیستم

```bash
# مشاهده لاگ‌ها
tail -f logs/whatsapp-system.log

# با PM2
pm2 logs whatsapp-api
```

## 📈 نظارت و آمار

### آمار کلیدی

- **تعداد مخاطبین**: فعال/غیرفعال
- **پیام‌های ارسالی**: موفق/ناموفق/در انتظار
- **نرخ تحویل**: درصد موفقیت
- **استفاده روزانه**: محدودیت‌های سرویس‌دهنده

### داشبورد

```javascript
const getStatistics = async () => {
  const response = await fetch('/api/statistics');
  const stats = await response.json();
  
  return {
    users: stats.users.total,
    activeUsers: stats.users.active,
    messagesToday: stats.recentActivity.messagesToday,
    successRate: (stats.messages.delivered / stats.messages.total * 100).toFixed(1)
  };
};
```

## 🚀 استقرار در تولید

### با PM2

```bash
npm install -g pm2
pm2 start whatsapp-backend.js --name "whatsapp-api"
pm2 save
pm2 startup
```

### با Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### با Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔐 امنیت

- **Rate Limiting**: محدودیت 100 درخواست در 15 دقیقه
- **Input Validation**: اعتبارسنجی تمام ورودی‌ها
- **CORS**: کنترل دسترسی دامنه‌ها
- **Helmet**: هدرهای امنیتی
- **API Authentication**: احراز هویت با JWT (اختیاری)

## 📞 پشتیبانی

برای هرگونه سؤال یا مشکل:

1. **مستندات**: بررسی این فایل README
2. **لاگ‌ها**: بررسی فایل‌های لاگ
3. **API Testing**: استفاده از Postman یا curl
4. **Community**: [GitHub Issues](https://github.com/your-username/whatsapp-notification-system/issues)

## 📄 مجوز

MIT License - استفاده آزاد در پروژه‌های شخصی و تجاری

---

**توسعه‌دهنده**: MiniMax Agent  
**نسخه**: 1.0.0  
**آخرین بروزرسانی**: نوامبر 2025
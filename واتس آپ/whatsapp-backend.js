// WhatsApp Backend Service
// سرویس ارسال پیام واتس‌اپ با قابلیت‌های حرفه‌ای

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'تعداد درخواست‌ها بیش از حد مجاز است' }
});
app.use('/api/', limiter);

// In-memory database (برای تست - در پروژه واقعی از دیتابیس استفاده کنید)
const db = {
  users: [
    {
      id: '1',
      name: 'احمد محمدی',
      phone: '+989123456789',
      countryCode: 'IR',
      isActive: true,
      lastMessage: new Date('2025-11-22T10:30:00'),
      messageCount: 15,
      preferences: {
        language: 'fa',
        notificationTime: '09:00',
        timezone: 'Asia/Tehran'
      }
    },
    {
      id: '2',
      name: 'فاطمه احمدی',
      phone: '+989876543210',
      countryCode: 'IR',
      isActive: true,
      lastMessage: new Date('2025-11-22T09:15:00'),
      messageCount: 8,
      preferences: {
        language: 'fa',
        notificationTime: '10:00',
        timezone: 'Asia/Tehran'
      }
    }
  ],
  messages: [],
  templates: [
    {
      id: 'low_inventory_alert',
      name: 'هشدار کمبود موجودی',
      content: '🔔 سلام {name} عزیز! موجودی کالای {product} به {amount} رسیده است. برای سفارش مجدد اقدام کنید.',
      category: 'alert',
      language: 'fa',
      variables: ['name', 'product', 'amount']
    },
    {
      id: 'price_change_alert',
      name: 'تغییر قیمت',
      content: '💰 خبر مهم! قیمت {product} از {oldPrice} به {newPrice} تغییر یافت. برای مشاهده جزئیات کلیک کنید.',
      category: 'alert',
      language: 'fa',
      variables: ['product', 'oldPrice', 'newPrice']
    },
    {
      id: 'new_user_welcome',
      name: 'خوش‌آمدگویی کاربر جدید',
      content: '🎉 سلام {name}! به سیستم ما خوش آمدید. برای شروع کار با ما تماس بگیرید.',
      category: 'notification',
      language: 'fa',
      variables: ['name']
    },
    {
      id: 'security_alert',
      name: 'هشدار امنیتی',
      content: '🛡️ هشدار امنیتی! ورود مشکوکی از IP {ipAddress} در ساعت {timestamp} تشخیص داده شد.',
      category: 'security',
      language: 'fa',
      variables: ['ipAddress', 'timestamp']
    }
  ],
  settings: {
    provider: 'twilio',
    apiKey: process.env.TWILIO_API_KEY || '',
    phoneNumberId: process.env.TWILIO_PHONE_NUMBER_ID || '',
    businessAccountId: process.env.TWILIO_BUSINESS_ACCOUNT_ID || '',
    webhookUrl: process.env.WEBHOOK_URL || '',
    isEnabled: false,
    rateLimit: 100,
    retryAttempts: 3,
    deliveryReports: true,
    mediaUpload: true
  }
};

// Utility Functions

// ارسال پیام از طریق Twilio
async function sendTwilioMessage(phoneNumber, message, templateVariables = {}) {
  try {
    // Template processing
    let processedMessage = message;
    Object.keys(templateVariables).forEach(key => {
      const placeholder = `{${key}}`;
      processedMessage = processedMessage.replace(new RegExp(placeholder, 'g'), templateVariables[key]);
    });

    // Twilio API call (نمونه کد - نیاز به کلید واقعی دارد)
    const response = await axios.post('https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json', 
      new URLSearchParams({
        From: db.settings.phoneNumberId,
        To: phoneNumber,
        Body: processedMessage
      }), 
      {
        auth: {
          username: db.settings.apiKey,
          password: process.env.TWILIO_AUTH_TOKEN || ''
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return {
      success: true,
      messageId: response.data.sid,
      status: 'sent',
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Twilio Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      timestamp: new Date()
    };
  }
}

// ارسال پیام از طریق 360Dialog
async function send360DialogMessage(phoneNumber, message, templateVariables = {}) {
  try {
    let processedMessage = message;
    Object.keys(templateVariables).forEach(key => {
      const placeholder = `{${key}}`;
      processedMessage = processedMessage.replace(new RegExp(placeholder, 'g'), templateVariables[key]);
    });

    const response = await axios.post('https://api.360dialog.io/v1/whatsapp/send', 
      {
        to: phoneNumber,
        template: {
          name: 'basic_text',
          language: { code: 'fa' }
        },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: processedMessage }
            ]
          }
        ]
      }, 
      {
        headers: {
          'Authorization': `Bearer ${db.settings.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      messageId: response.data.id,
      status: 'sent',
      timestamp: new Date()
    };
  } catch (error) {
    console.error('360Dialog Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      timestamp: new Date()
    };
  }
}

// ارسال پیام از طریق Green API
async function sendGreenAPIMessage(phoneNumber, message, templateVariables = {}) {
  try {
    let processedMessage = message;
    Object.keys(templateVariables).forEach(key => {
      const placeholder = `{${key}}`;
      processedMessage = processedMessage.replace(new RegExp(placeholder, 'g'), templateVariables[key]);
    });

    const instanceId = process.env.GREEN_API_INSTANCE_ID;
    const token = db.settings.apiKey;
    
    const response = await axios.post(
      `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`, 
      {
        chatId: phoneNumber.replace('@c.us', ''),
        message: processedMessage
      }, 
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      messageId: response.data.idMessage,
      status: 'sent',
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Green API Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      timestamp: new Date()
    };
  }
}

// Main message sending function
async function sendWhatsAppMessage(phoneNumber, message, templateVariables = {}, messageType = 'notification') {
  if (!db.settings.isEnabled) {
    return {
      success: false,
      error: 'سیستم واتس‌اپ غیرفعال است',
      timestamp: new Date()
    };
  }

  let result;
  switch (db.settings.provider) {
    case 'twilio':
      result = await sendTwilioMessage(phoneNumber, message, templateVariables);
      break;
    case '360dialog':
      result = await send360DialogMessage(phoneNumber, message, templateVariables);
      break;
    case 'green_api':
      result = await sendGreenAPIMessage(phoneNumber, message, templateVariables);
      break;
    default:
      return {
        success: false,
        error: 'سرویس‌دهنده پشتیبانی نمی‌شود',
        timestamp: new Date()
      };
  }

  // Save message to database
  const messageRecord = {
    id: Date.now().toString(),
    recipient: phoneNumber,
    content: message,
    status: result.success ? result.status : 'failed',
    timestamp: new Date(),
    messageType,
    messageId: result.messageId,
    error: result.error
  };

  db.messages.push(messageRecord);

  // Update user statistics
  const user = db.users.find(u => u.phone === phoneNumber);
  if (user) {
    user.messageCount = (user.messageCount || 0) + 1;
    user.lastMessage = new Date();
  }

  return result;
}

// API Routes

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    version: '1.0.0',
    uptime: process.uptime(),
    whatsapp: {
      enabled: db.settings.isEnabled,
      provider: db.settings.provider,
      connected: !!db.settings.apiKey
    }
  });
});

// Test connection
app.post('/api/whatsapp/test-connection', (req, res) => {
  try {
    const isValidConfig = db.settings.apiKey && db.settings.phoneNumberId;
    
    res.json({
      success: isValidConfig,
      provider: db.settings.provider,
      message: isValidConfig ? 'اتصال موفقیت‌آمیز' : 'تنظیمات ناکامل',
      details: {
        hasApiKey: !!db.settings.apiKey,
        hasPhoneNumberId: !!db.settings.phoneNumberId,
        hasBusinessAccount: !!db.settings.businessAccountId
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send single message
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { phoneNumber, message, templateVariables = {}, messageType = 'notification' } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        error: 'شماره تلفن و پیام الزامی است'
      });
    }

    const result = await sendWhatsAppMessage(phoneNumber, message, templateVariables, messageType);
    
    res.json(result);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send bulk messages
app.post('/api/whatsapp/send-bulk', async (req, res) => {
  try {
    const { recipients, message, templateVariables = {}, messageType = 'notification' } = req.body;

    if (!recipients?.length || !message) {
      return res.status(400).json({
        error: 'لیست گیرندگان و پیام الزامی است'
      });
    }

    const results = [];
    for (const recipient of recipients) {
      try {
        const result = await sendWhatsAppMessage(
          recipient.phoneNumber || recipient, 
          message, 
          { ...templateVariables, name: recipient.name || '' }, 
          messageType
        );
        results.push({
          phoneNumber: recipient.phoneNumber || recipient,
          success: result.success,
          messageId: result.messageId,
          error: result.error
        });
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.push({
          phoneNumber: recipient.phoneNumber || recipient,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      total: recipients.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
  } catch (error) {
    console.error('Bulk send error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get users
app.get('/api/users', (req, res) => {
  try {
    const { filter = 'all', search = '' } = req.query;
    let filteredUsers = db.users;

    // Apply filter
    if (filter === 'active') {
      filteredUsers = filteredUsers.filter(user => user.isActive);
    } else if (filter === 'inactive') {
      filteredUsers = filteredUsers.filter(user => !user.isActive);
    }

    // Apply search
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.name.toLowerCase().includes(searchLower) ||
        user.phone.includes(search)
      );
    }

    res.json(filteredUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add user
app.post('/api/users', (req, res) => {
  try {
    const { name, phone, countryCode = 'IR', preferences = {} } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        error: 'نام و شماره تلفن الزامی است'
      });
    }

    // Validate phone number format
    const phoneRegex = /^\+\d{10,15}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        error: 'فرمت شماره تلفن نامعتبر است. مثال: +989123456789'
      });
    }

    const newUser = {
      id: Date.now().toString(),
      name,
      phone,
      countryCode,
      isActive: true,
      messageCount: 0,
      preferences: {
        language: 'fa',
        notificationTime: '09:00',
        timezone: 'Asia/Tehran',
        ...preferences
      }
    };

    db.users.push(newUser);
    res.json(newUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user
app.put('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const user = db.users.find(u => u.id === id);

    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }

    Object.assign(user, req.body, { id }); // Preserve ID
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const userIndex = db.users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }

    db.users.splice(userIndex, 1);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages
app.get('/api/messages', (req, res) => {
  try {
    const { status, messageType, limit = 50, offset = 0 } = req.query;
    let filteredMessages = db.messages;

    if (status) {
      filteredMessages = filteredMessages.filter(msg => msg.status === status);
    }

    if (messageType) {
      filteredMessages = filteredMessages.filter(msg => msg.messageType === messageType);
    }

    const paginatedMessages = filteredMessages
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit))
      .reverse(); // Most recent first

    res.json({
      messages: paginatedMessages,
      total: filteredMessages.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get templates
app.get('/api/templates', (req, res) => {
  try {
    res.json(db.templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add template
app.post('/api/templates', (req, res) => {
  try {
    const { name, content, category = 'general', language = 'fa' } = req.body;

    if (!name || !content) {
      return res.status(400).json({
        error: 'نام و محتوای قالب الزامی است'
      });
    }

    // Extract variables from content
    const variableMatches = content.match(/\{(\w+)\}/g) || [];
    const variables = variableMatches.map(match => match.slice(1, -1));

    const newTemplate = {
      id: Date.now().toString(),
      name,
      content,
      category,
      language,
      variables
    };

    db.templates.push(newTemplate);
    res.json(newTemplate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
app.put('/api/settings', (req, res) => {
  try {
    const newSettings = req.body;
    
    // Validate sensitive fields
    if (newSettings.apiKey && !newSettings.apiKey.startsWith(process.env.NODE_ENV === 'production' ? 'sk_' : 'test_')) {
      return res.status(400).json({
        error: 'فرمت کلید API نامعتبر است'
      });
    }

    Object.assign(db.settings, newSettings);
    res.json(db.settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get statistics
app.get('/api/statistics', (req, res) => {
  try {
    const stats = {
      users: {
        total: db.users.length,
        active: db.users.filter(u => u.isActive).length,
        inactive: db.users.filter(u => !u.isActive).length
      },
      messages: {
        total: db.messages.length,
        sent: db.messages.filter(m => m.status === 'sent').length,
        delivered: db.messages.filter(m => m.status === 'delivered').length,
        failed: db.messages.filter(m => m.status === 'failed').length,
        pending: db.messages.filter(m => m.status === 'pending').length
      },
      templates: db.templates.length,
      settings: {
        provider: db.settings.provider,
        enabled: db.settings.isEnabled,
        rateLimit: db.settings.rateLimit
      },
      recentActivity: {
        lastMessage: db.messages.length > 0 ? 
          Math.max(...db.messages.map(m => new Date(m.timestamp).getTime())) : null,
        messagesToday: db.messages.filter(m => {
          const today = new Date();
          const messageDate = new Date(m.timestamp);
          return messageDate.toDateString() === today.toDateString();
        }).length
      }
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook for delivery reports (Twilio)
app.post('/api/webhooks/twilio', (req, res) => {
  try {
    const { MessageSid, MessageStatus, To } = req.body;

    // Update message status
    const message = db.messages.find(m => m.messageId === MessageSid);
    if (message) {
      message.status = MessageStatus.toLowerCase();
      message.deliveredAt = new Date();

      // Update user activity
      const user = db.users.find(u => u.phone === To);
      if (user) {
        user.isActive = MessageStatus === 'delivered';
        user.lastMessage = new Date();
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'خطای داخلی سرور',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint یافت نشد',
    path: req.path
  });
});

app.listen(PORT, () => {
  console.log(`🚀 WhatsApp API Server running on port ${PORT}`);
  console.log(`📱 Provider: ${db.settings.provider}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚡ Rate limit: ${db.settings.rateLimit} requests per 15 minutes`);
  console.log(`🔒 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
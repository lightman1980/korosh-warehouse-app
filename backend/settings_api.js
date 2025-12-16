// settings_api.js - سیستم API برای ذخیره سازی تنظیمات
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// مسیر فایل دیتابیس
const DB_PATH = path.join(__dirname, 'tanksystem_settings.db');

// اتصال به دیتابیس
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('خطا در اتصال به دیتابیس:', err.message);
  } else {
    console.log('✅ اتصال به دیتابیس SQLite برقرار شد');
    initializeDatabase();
  }
});

// ایجاد جدول تنظیمات در صورت عدم وجود
function initializeDatabase() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      category TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, category, key)
    )
  `;
  
  db.run(createTableSQL, (err) => {
    if (err) {
      console.error('خطا در ایجاد جدول:', err.message);
    } else {
      console.log('✅ جدول settings ایجاد شد');
    }
  });
}

// API: دریافت تمام تنظیمات کاربر
app.get('/api/settings/:userId', (req, res) => {
  const { userId } = req.params;
  
  db.all(
    'SELECT category, key, value FROM settings WHERE user_id = ?',
    [userId],
    (err, rows) => {
      if (err) {
        console.error('خطا در خواندن تنظیمات:', err.message);
        return res.status(500).json({ 
          success: false, 
          error: 'خطا در خواندن تنظیمات' 
        });
      }
      
      // تبدیل نتایج به فرمت مناسب
      const settings = {};
      rows.forEach(row => {
        if (!settings[row.category]) {
          settings[row.category] = {};
        }
        try {
          settings[row.category][row.key] = JSON.parse(row.value);
        } catch (e) {
          settings[row.category][row.key] = row.value;
        }
      });
      
      res.json({ 
        success: true, 
        data: settings,
        timestamp: new Date().toISOString()
      });
    }
  );
});

// API: ذخیره تنظیمات کاربر
app.post('/api/settings/:userId', (req, res) => {
  const { userId } = req.params;
  const { settings } = req.body;
  
  if (!settings) {
    return res.status(400).json({ 
      success: false, 
      error: 'تنظیمات ارسال نشده است' 
    });
  }
  
  // شروع تراکنش
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO settings (user_id, category, key, value, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)'
    );
    
    let successCount = 0;
    let totalCount = 0;
    
    // ذخیره تمام تنظیمات
    for (const [category, categorySettings] of Object.entries(settings)) {
      if (typeof categorySettings === 'object' && categorySettings !== null) {
        for (const [key, value] of Object.entries(categorySettings)) {
          totalCount++;
          stmt.run([userId, category, key, JSON.stringify(value)], (err) => {
            if (err) {
              console.error(`خطا در ذخیره ${category}.${key}:`, err.message);
            } else {
              successCount++;
            }
          });
        }
      }
    }
    
    stmt.finalize((err) => {
      if (err) {
        console.error('خطا در نهایی کردن statement:', err.message);
        db.run('ROLLBACK');
        return res.status(500).json({ 
          success: false, 
          error: 'خطا در ذخیره تنظیمات' 
        });
      }
      
      // تکمیل تراکنش
      db.run('COMMIT', (err) => {
        if (err) {
          console.error('خطا در تکمیل تراکنش:', err.message);
          db.run('ROLLBACK');
          return res.status(500).json({ 
            success: false, 
            error: 'خطا در تکمیل تراکنش' 
          });
        }
        
        console.log(`✅ تنظیمات کاربر ${userId} ذخیره شد: ${successCount}/${totalCount} مورد`);
        res.json({ 
          success: true, 
          message: `تنظیمات با موفقیت ذخیره شد (${successCount}/${totalCount})`,
          savedCount: successCount,
          totalCount: totalCount,
          timestamp: new Date().toISOString()
        });
      });
    });
  });
});

// API: حذف تنظیمات کاربر
app.delete('/api/settings/:userId', (req, res) => {
  const { userId } = req.params;
  
  db.run(
    'DELETE FROM settings WHERE user_id = ?',
    [userId],
    function(err) {
      if (err) {
        console.error('خطا در حذف تنظیمات:', err.message);
        return res.status(500).json({ 
          success: false, 
          error: 'خطا در حذف تنظیمات' 
        });
      }
      
      res.json({ 
        success: true, 
        message: `تنظیمات کاربر ${userId} حذف شد (${this.changes} مورد)`,
        deletedCount: this.changes
      });
    }
  );
});

// API: تست اتصال
app.get('/api/health', (req, res) => {
  db.get('SELECT 1 as test', (err, row) => {
    if (err) {
      console.error('خطا در تست اتصال دیتابیس:', err.message);
      return res.status(500).json({ 
        success: false, 
        error: 'خطا در اتصال دیتابیس' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'API و دیتابیس در حال کار است',
      timestamp: new Date().toISOString()
    });
  });
});

// مدیریت خطای عمومی
app.use((err, req, res, next) => {
  console.error('خطای عمومی API:', err);
  res.status(500).json({ 
    success: false, 
    error: 'خطای داخلی سرور' 
  });
});

// مدیریت graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📴 در حال بستن اتصال دیتابیس...');
  db.close((err) => {
    if (err) {
      console.error('خطا در بستن دیتابیس:', err.message);
    } else {
      console.log('✅ اتصال دیتابیس بسته شد');
    }
    process.exit(0);
  });
});

app.listen(PORT, () => {
  console.log(`🚀 سرور API تنظیمات روی پورت ${PORT} در حال اجرا است`);
  console.log(`📊 دیتابیس: ${DB_PATH}`);
});

module.exports = app;



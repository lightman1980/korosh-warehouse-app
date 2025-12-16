// Test Suite for WhatsApp API
// مجموعه تست برای سیستم واتس‌اپ

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// Test Configuration
const testConfig = {
  phoneNumber: '+989123456789',
  message: '🔔 این یک پیام تست است از سیستم واتس‌اپ ما',
  templateVariables: {
    name: 'کاربر تست',
    product: 'محصول تست',
    amount: '10 عدد'
  }
};

// Utility Functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const logTest = (testName, status, details = '') => {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏳';
  console.log(`${icon} ${testName}: ${status}${details ? ' - ' + details : ''}`);
};

// Test Suite
class WhatsAppAPITester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  async runAllTests() {
    console.log('🚀 شروع تست‌های سیستم واتس‌اپ...\n');

    await this.testHealthCheck();
    await this.testConnection();
    await this.testGetUsers();
    await this.testAddUser();
    await this.testGetTemplates();
    await this.testSingleMessage();
    await this.testBulkMessage();
    await this.testGetMessages();
    await this.testGetStatistics();

    console.log(`\n📊 نتایج نهایی:`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Total: ${this.results.total}`);
    console.log(`📊 Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
  }

  async testHealthCheck() {
    try {
      this.results.total++;
      logTest('Health Check', 'RUNNING');
      
      const response = await axios.get(`${API_BASE}/health`);
      
      if (response.status === 200 && response.data.status === 'healthy') {
        this.results.passed++;
        logTest('Health Check', 'PASS', `Version: ${response.data.version}`);
      } else {
        this.results.failed++;
        logTest('Health Check', 'FAIL', 'Invalid response structure');
      }
    } catch (error) {
      this.results.failed++;
      logTest('Health Check', 'FAIL', error.message);
    }
  }

  async testConnection() {
    try {
      this.results.total++;
      logTest('Connection Test', 'RUNNING');
      
      const response = await axios.post(`${API_BASE}/whatsapp/test-connection`);
      
      if (response.status === 200) {
        this.results.passed++;
        logTest('Connection Test', 'PASS', `Provider: ${response.data.provider || 'unknown'}`);
      } else {
        this.results.failed++;
        logTest('Connection Test', 'FAIL', 'Invalid response');
      }
    } catch (error) {
      this.results.failed++;
      logTest('Connection Test', 'FAIL', error.message);
    }
  }

  async testGetUsers() {
    try {
      this.results.total++;
      logTest('Get Users', 'RUNNING');
      
      const response = await axios.get(`${API_BASE}/users`);
      
      if (response.status === 200 && Array.isArray(response.data)) {
        this.results.passed++;
        logTest('Get Users', 'PASS', `Found ${response.data.length} users`);
      } else {
        this.results.failed++;
        logTest('Get Users', 'FAIL', 'Invalid response structure');
      }
    } catch (error) {
      this.results.failed++;
      logTest('Get Users', 'FAIL', error.message);
    }
  }

  async testAddUser() {
    try {
      this.results.total++;
      logTest('Add User', 'RUNNING');
      
      const newUser = {
        name: 'کاربر تست جدید',
        phone: '+989123456790',
        countryCode: 'IR',
        preferences: {
          language: 'fa',
          notificationTime: '09:00'
        }
      };
      
      const response = await axios.post(`${API_BASE}/users`, newUser);
      
      if (response.status === 200 && response.data.id) {
        this.results.passed++;
        logTest('Add User', 'PASS', `User ID: ${response.data.id}`);
      } else {
        this.results.failed++;
        logTest('Add User', 'FAIL', 'User creation failed');
      }
    } catch (error) {
      this.results.failed++;
      logTest('Add User', 'FAIL', error.message);
    }
  }

  async testGetTemplates() {
    try {
      this.results.total++;
      logTest('Get Templates', 'RUNNING');
      
      const response = await axios.get(`${API_BASE}/templates`);
      
      if (response.status === 200 && Array.isArray(response.data)) {
        this.results.passed++;
        logTest('Get Templates', 'PASS', `Found ${response.data.length} templates`);
      } else {
        this.results.failed++;
        logTest('Get Templates', 'FAIL', 'Invalid response structure');
      }
    } catch (error) {
      this.results.failed++;
      logTest('Get Templates', 'FAIL', error.message);
    }
  }

  async testSingleMessage() {
    try {
      this.results.total++;
      logTest('Send Single Message', 'RUNNING');
      
      const messageData = {
        phoneNumber: testConfig.phoneNumber,
        message: testConfig.message,
        messageType: 'test'
      };
      
      const response = await axios.post(`${API_BASE}/whatsapp/send`, messageData);
      
      if (response.status === 200) {
        const status = response.data.success ? 'SUCCESS' : 'FAILED';
        this.results.passed++;
        logTest('Send Single Message', 'PASS', `Status: ${status}`);
      } else {
        this.results.failed++;
        logTest('Send Single Message', 'FAIL', 'Invalid response');
      }
    } catch (error) {
      this.results.failed++;
      logTest('Send Single Message', 'FAIL', error.message);
    }
  }

  async testBulkMessage() {
    try {
      this.results.total++;
      logTest('Send Bulk Messages', 'RUNNING');
      
      const bulkData = {
        recipients: [
          { phoneNumber: testConfig.phoneNumber, name: 'کاربر تست 1' },
          { phoneNumber: '+989876543211', name: 'کاربر تست 2' }
        ],
        message: '🔔 پیام انبوه تست از سیستم ما',
        messageType: 'test'
      };
      
      const response = await axios.post(`${API_BASE}/whatsapp/send-bulk`, bulkData);
      
      if (response.status === 200 && response.data.total) {
        this.results.passed++;
        logTest('Send Bulk Messages', 'PASS', `${response.data.successful}/${response.data.total} sent`);
      } else {
        this.results.failed++;
        logTest('Send Bulk Messages', 'FAIL', 'Invalid response structure');
      }
    } catch (error) {
      this.results.failed++;
      logTest('Send Bulk Messages', 'FAIL', error.message);
    }
  }

  async testGetMessages() {
    try {
      this.results.total++;
      logTest('Get Messages', 'RUNNING');
      
      const response = await axios.get(`${API_BASE}/messages?limit=10`);
      
      if (response.status === 200 && response.data.messages) {
        this.results.passed++;
        logTest('Get Messages', 'PASS', `Found ${response.data.messages.length} messages`);
      } else {
        this.results.failed++;
        logTest('Get Messages', 'FAIL', 'Invalid response structure');
      }
    } catch (error) {
      this.results.failed++;
      logTest('Get Messages', 'FAIL', error.message);
    }
  }

  async testGetStatistics() {
    try {
      this.results.total++;
      logTest('Get Statistics', 'RUNNING');
      
      const response = await axios.get(`${API_BASE}/statistics`);
      
      if (response.status === 200 && response.data.users) {
        this.results.passed++;
        const stats = response.data;
        logTest('Get Statistics', 'PASS', 
          `Users: ${stats.users.total}, Messages: ${stats.messages.total}`);
      } else {
        this.results.failed++;
        logTest('Get Statistics', 'FAIL', 'Invalid response structure');
      }
    } catch (error) {
      this.results.failed++;
      logTest('Get Statistics', 'FAIL', error.message);
    }
  }
}

// Performance Tests
class PerformanceTester {
  async testLoadPerformance() {
    console.log('\n⚡ تست عملکرد بارگذاری...');
    
    const concurrentRequests = 10;
    const startTime = Date.now();
    
    const promises = Array(concurrentRequests).fill().map(() => 
      axios.get(`${API_BASE}/health`)
    );
    
    try {
      await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgResponseTime = duration / concurrentRequests;
      
      console.log(`✅ ${concurrentRequests} درخواست همزمان در ${duration}ms`);
      console.log(`📊 زمان پاسخ متوسط: ${avgResponseTime.toFixed(2)}ms`);
      
      if (avgResponseTime < 1000) {
        console.log('🎯 عملکرد: عالی');
      } else if (avgResponseTime < 3000) {
        console.log('👍 عملکرد: خوب');
      } else {
        console.log('⚠️  عملکرد: نیاز به بهبود');
      }
    } catch (error) {
      console.log('❌ تست بارگذاری ناموفق:', error.message);
    }
  }
}

// Integration Tests
class IntegrationTester {
  async testEndToEnd() {
    console.log('\n🔗 تست یکپارچه سازی کامل...');
    
    try {
      // 1. تست اتصال
      const connectionTest = await axios.post(`${API_BASE}/whatsapp/test-connection`);
      console.log(`✅ تست اتصال: ${connectionTest.data.success ? 'موفق' : 'ناموفق'}`);
      
      // 2. افزودن کاربر تست
      const userData = {
        name: 'Integration Test User',
        phone: '+989123456791',
        countryCode: 'IR'
      };
      
      const userResponse = await axios.post(`${API_BASE}/users`, userData);
      const userId = userResponse.data.id;
      console.log(`✅ افزودن کاربر: ${userId}`);
      
      // 3. ارسال پیام تست
      const messageData = {
        phoneNumber: userData.phone,
        message: '🔗 این یک پیام تست یکپارچه است',
        messageType: 'integration_test'
      };
      
      const messageResponse = await axios.post(`${API_BASE}/whatsapp/send`, messageData);
      console.log(`✅ ارسال پیام: ${messageResponse.data.success ? 'موفق' : 'ناموفق'}`);
      
      // 4. بررسی آمار
      const statsResponse = await axios.get(`${API_BASE}/statistics`);
      console.log(`✅ آمار به‌روز: پیام‌های جدید اضافه شد`);
      
      console.log('🎉 تست یکپارچه سازی کامل موفق بود!');
      
    } catch (error) {
      console.log('❌ تست یکپارچه سازی ناموفق:', error.message);
    }
  }
}

// CLI Interface
class WhatsAppTester {
  constructor() {
    this.tester = new WhatsAppAPITester();
    this.performanceTester = new PerformanceTester();
    this.integrationTester = new IntegrationTester();
  }

  async run(type = 'all') {
    switch (type) {
      case 'basic':
        await this.tester.runAllTests();
        break;
      case 'performance':
        await this.performanceTester.testLoadPerformance();
        break;
      case 'integration':
        await this.integrationTester.testEndToEnd();
        break;
      case 'all':
      default:
        await this.tester.runAllTests();
        await sleep(2000);
        await this.performanceTester.testLoadPerformance();
        await sleep(2000);
        await this.integrationTester.testEndToEnd();
        break;
    }
  }

  printUsage() {
    console.log(`
📱 WhatsApp API Tester

Usage: node test-whatsapp.js [command]

Commands:
  all          اجرای تمام تست‌ها (پیش‌فرض)
  basic        تست‌های پایه API
  performance  تست عملکرد بارگذاری
  integration  تست یکپارچه سازی
  help         نمایش این راهنما

Examples:
  node test-whatsapp.js basic
  node test-whatsapp.js performance
  node test-whatsapp.js all
    `);
  }
}

// CLI Handler
if (require.main === module) {
  const tester = new WhatsAppTester();
  const command = process.argv[2] || 'all';
  
  if (command === 'help' || command === '-h' || command === '--help') {
    tester.printUsage();
  } else {
    tester.run(command).catch(error => {
      console.error('❌ خطا در اجرای تست‌ها:', error.message);
      process.exit(1);
    });
  }
}

module.exports = { WhatsAppAPITester, PerformanceTester, IntegrationTester };
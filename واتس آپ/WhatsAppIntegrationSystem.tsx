import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Users, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Phone,
  User,
  Clock,
  SendHorizonal,
  Loader2,
  Wifi,
  WifiOff,
  Database,
  Key,
  Globe,
  Shield,
  Zap
} from 'lucide-react';
import { Tooltip } from '../Common/Tooltip';

interface WhatsAppUser {
  id: string;
  name: string;
  phone: string;
  countryCode: string;
  isActive: boolean;
  lastMessage?: Date;
  messageCount: number;
  template?: string;
}

interface WhatsAppMessage {
  id: string;
  recipient: string;
  content: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  messageType: 'alert' | 'reminder' | 'marketing' | 'notification';
  template?: string;
}

interface WhatsAppSettings {
  provider: 'twilio' | '360dialog' | 'green_api' | 'meta';
  apiKey: string;
  phoneNumberId: string;
  businessAccountId?: string;
  webhookUrl?: string;
  isEnabled: boolean;
  rateLimit: number;
  retryAttempts: number;
  templates: {
    id: string;
    name: string;
    content: string;
    category: string;
    language: string;
  }[];
}

const defaultSettings: WhatsAppSettings = {
  provider: 'twilio',
  apiKey: '',
  phoneNumberId: '',
  businessAccountId: '',
  webhookUrl: '',
  isEnabled: false,
  rateLimit: 100,
  retryAttempts: 3,
  templates: [
    {
      id: 'low_inventory_alert',
      name: 'هشدار کمبود موجودی',
      content: '🔔 سلام {name} عزیز! موجودی کالای {product} به {amount} رسیده است. برای سفارش مجدد اقدام کنید.',
      category: 'alert',
      language: 'fa'
    },
    {
      id: 'price_change_alert',
      name: 'تغییر قیمت',
      content: '💰 خبر مهم! قیمت {product} از {oldPrice} به {newPrice} تغییر یافت. برای مشاهده جزئیات کلیک کنید.',
      category: 'alert',
      language: 'fa'
    },
    {
      id: 'new_user_welcome',
      name: 'خوش‌آمدگویی کاربر جدید',
      content: '🎉 سلام {name}! به سیستم ما خوش آمدید. برای شروع کار با ما تماس بگیرید.',
      category: 'notification',
      language: 'fa'
    }
  ]
};

export const WhatsAppIntegrationSystem: React.FC = () => {
  const [settings, setSettings] = useState<WhatsAppSettings>(defaultSettings);
  const [users, setUsers] = useState<WhatsAppUser[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'inactive'>('all');

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('whatsappSettings');
    if (savedSettings) {
      setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
    }
    loadMockData();
  }, []);

  // Load mock users and messages for demonstration
  const loadMockData = () => {
    const mockUsers: WhatsAppUser[] = [
      {
        id: '1',
        name: 'احمد محمدی',
        phone: '+989123456789',
        countryCode: 'IR',
        isActive: true,
        lastMessage: new Date('2025-11-22T10:30:00'),
        messageCount: 15
      },
      {
        id: '2',
        name: 'فاطمه احمدی',
        phone: '+989876543210',
        countryCode: 'IR',
        isActive: true,
        lastMessage: new Date('2025-11-22T09:15:00'),
        messageCount: 8
      },
      {
        id: '3',
        name: 'علی رضایی',
        phone: '+15551234567',
        countryCode: 'US',
        isActive: false,
        lastMessage: new Date('2025-11-21T16:45:00'),
        messageCount: 3
      }
    ];

    const mockMessages: WhatsAppMessage[] = [
      {
        id: '1',
        recipient: '+989123456789',
        content: '🔔 سلام احمد عزیز! موجودی گندم به 50 کیلوگرم رسیده است.',
        status: 'delivered',
        timestamp: new Date('2025-11-22T10:30:00'),
        messageType: 'alert',
        template: 'low_inventory_alert'
      },
      {
        id: '2',
        recipient: '+989876543210',
        content: '💰 خبر مهم! قیمت برنج از 50,000 تومان به 55,000 تومان تغییر یافت.',
        status: 'sent',
        timestamp: new Date('2025-11-22T09:15:00'),
        messageType: 'alert',
        template: 'price_change_alert'
      }
    ];

    setUsers(mockUsers);
    setMessages(mockMessages);
  };

  // Save settings
  const saveSettings = (newSettings: WhatsAppSettings) => {
    localStorage.setItem('whatsappSettings', JSON.stringify(newSettings));
    setSettings(newSettings);
  };

  // Test connection to WhatsApp API
  const testConnection = async () => {
    setIsLoading(true);
    try {
      // Simulate API connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsConnected(true);
    } catch (error) {
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Send message to selected users
  const sendMessage = async () => {
    if (!selectedUsers.length || !messageContent.trim()) return;

    setIsLoading(true);
    try {
      const newMessages: WhatsAppMessage[] = selectedUsers.map(userId => {
        const user = users.find(u => u.id === userId);
        return {
          id: Date.now().toString(),
          recipient: user?.phone || '',
          content: messageContent,
          status: 'pending' as const,
          timestamp: new Date(),
          messageType: 'alert' as const,
          template: selectedTemplate || undefined
        };
      });

      setMessages(prev => [...prev, ...newMessages]);

      // Simulate message sending
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          selectedUsers.includes(msg.recipient) && msg.status === 'pending'
            ? { ...msg, status: 'sent' }
            : msg
        ));
      }, 1000);

      setMessageContent('');
      setSelectedUsers([]);

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply template
  const applyTemplate = (templateId: string) => {
    const template = settings.templates.find(t => t.id === templateId);
    if (template) {
      setMessageContent(template.content);
      setSelectedTemplate(templateId);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    switch (filterBy) {
      case 'active': return user.isActive;
      case 'inactive': return !user.isActive;
      default: return true;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <MessageSquare className="h-8 w-8 text-green-600 ml-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">سیستم واتس‌اپ</h1>
              <p className="text-sm text-gray-600">ارسال هشدارها و پیام‌ها به شماره‌های مختلف کاربران</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full ml-2 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium text-gray-700">
                {isConnected ? 'متصل' : 'قطع اتصال'}
              </span>
            </div>
            <button
              onClick={testConnection}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4 ml-2" />
              )}
              تست اتصال
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="h-5 w-5 mr-2 text-blue-500" />
          تنظیمات اتصال
          <Tooltip 
            title="تنظیمات واتس‌اپ"
            text="در این بخش می‌توانید تنظیمات اتصال به سرویس واتس‌اپ را پیکربندی کنید."
          />
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              سرویس‌دهنده
            </label>
            <select
              value={settings.provider}
              onChange={(e) => saveSettings({ ...settings, provider: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="twilio">Twilio (توصیه می‌شود)</option>
              <option value="360dialog">360Dialog</option>
              <option value="green_api">Green API</option>
              <option value="meta">Meta Business API</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              کلید API
            </label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => saveSettings({ ...settings, apiKey: e.target.value })}
              placeholder="کلید API خود را وارد کنید"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              شماره تلفن ID
            </label>
            <input
              type="text"
              value={settings.phoneNumberId}
              onChange={(e) => saveSettings({ ...settings, phoneNumberId: e.target.value })}
              placeholder="شناسه شماره تلفن"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              حداکثر پیام در روز
            </label>
            <input
              type="number"
              value={settings.rateLimit}
              onChange={(e) => saveSettings({ ...settings, rateLimit: parseInt(e.target.value) || 100 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="1"
              max="10000"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center">
          <input
            type="checkbox"
            id="whatsappEnabled"
            checked={settings.isEnabled}
            onChange={(e) => saveSettings({ ...settings, isEnabled: e.target.checked })}
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label htmlFor="whatsappEnabled" className="mr-2 text-sm font-medium text-gray-900">
            فعال‌سازی ارسال واتس‌اپ
          </label>
        </div>
      </div>

      {/* Message Composition */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Send className="h-5 w-5 mr-2 text-green-500" />
          ارسال پیام
        </h2>

        <div className="space-y-4">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              انتخاب قالب پیام
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => applyTemplate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">بدون قالب</option>
              {settings.templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Message Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              متن پیام
            </label>
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="پیام خود را بنویسید... (می‌توانید از {name}, {product}, {amount} و سایر متغیرها استفاده کنید)"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              متغیرهای قابل استفاده: {'{name}'}, {'{product}'}, {'{amount}'}, {'{oldPrice}'}, {'{newPrice}'}
            </p>
          </div>

          {/* User Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              انتخاب گیرندگان
            </label>
            <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
              <div className="flex items-center mb-3">
                <button
                  onClick={() => setSelectedUsers(users.map(u => u.id))}
                  className="text-sm text-blue-600 hover:text-blue-800 ml-4"
                >
                  انتخاب همه
                </button>
                <button
                  onClick={() => setSelectedUsers([])}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  پاک کردن
                </button>
              </div>
              <div className="space-y-2">
                {filteredUsers.map(user => (
                  <div key={user.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(prev => [...prev, user.id]);
                        } else {
                          setSelectedUsers(prev => prev.filter(id => id !== user.id));
                        }
                      }}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <div className="mr-3 flex-1">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.phone}</div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={sendMessage}
            disabled={!messageContent.trim() || !selectedUsers.length || !isConnected || isLoading}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 ml-2 animate-spin" />
            ) : (
              <SendHorizonal className="h-5 w-5 ml-2" />
            )}
            ارسال به {selectedUsers.length} کاربر
          </button>
        </div>
      </div>

      {/* Users Management */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-500" />
            مدیریت مخاطبین ({users.length})
          </h2>
          <div className="flex items-center space-x-2">
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="px-3 py-1 text-sm border border-gray-300 rounded"
            >
              <option value="all">همه</option>
              <option value="active">فعال</option>
              <option value="inactive">غیرفعال</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  کاربر
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  شماره تلفن
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  وضعیت
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  آخرین پیام
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  تعداد پیام
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center ml-3">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">ID: {user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-gray-400 ml-2" />
                      <span className="text-sm text-gray-900">{user.phone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastMessage ? user.lastMessage.toLocaleString('fa-IR') : 'هیچ پیامی'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.messageCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Message History */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Database className="h-5 w-5 mr-2 text-purple-500" />
          تاریخچه پیام‌ها ({messages.length})
        </h2>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {messages.slice().reverse().map(message => (
            <div key={message.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Phone className="h-4 w-4 text-gray-400 ml-2" />
                  <span className="text-sm font-medium text-gray-900">{message.recipient}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    message.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    message.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                    message.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {message.status === 'delivered' ? 'تحویل شده' :
                     message.status === 'sent' ? 'ارسال شده' :
                     message.status === 'failed' ? 'ناموفق' : 'در انتظار'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {message.timestamp.toLocaleString('fa-IR')}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-700">{message.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Template Management */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Zap className="h-5 w-5 mr-2 text-yellow-500" />
          قالب‌های پیام ({settings.templates.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settings.templates.map(template => (
            <div key={template.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{template.name}</h3>
                <span className="text-xs text-gray-500">{template.language}</span>
              </div>
              <p className="text-sm text-gray-600 mb-3 line-clamp-3">{template.content}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{template.category}</span>
                <button
                  onClick={() => applyTemplate(template.id)}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                >
                  استفاده
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
          <BarChart className="h-5 w-5 ml-2" />
          آمار سیستم
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-900">{users.length}</div>
            <div className="text-sm text-blue-700">کل مخاطبین</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{users.filter(u => u.isActive).length}</div>
            <div className="text-sm text-blue-700">مخاطب فعال</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{messages.length}</div>
            <div className="text-sm text-blue-700">کل پیام‌ها</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {messages.filter(m => m.status === 'delivered').length}
            </div>
            <div className="text-sm text-blue-700">پیام تحویل شده</div>
          </div>
        </div>
      </div>
    </div>
  );
};
import React from 'react';
import { 
  Home, 
  Database, 
  FileText, 
  TrendingUp, 
  Package, 
  FileOutput,
  CreditCard,
  Settings,
  Users,
  BarChart3,
  Archive,
  MinusCircle,
  RefreshCw,
  Mic,
  FileAudio,
  FlaskConical
} from 'lucide-react';
import { checkAndFocusTab } from '../../utils/tabManager';

interface SidebarProps {
  activeModule: string;
  setActiveModule?: (module: string) => void;
  onModuleChange?: (module: string) => void;
  currentUser?: any;
  isDark?: boolean;
  isDarkMode?: boolean;
  settings?: any;
}

// منوهای اصلی
const menuItems = [
  { id: 'dashboard', name: 'داشبورد', icon: Home },
  { id: 'base-data', name: 'اطلاعات پایه', icon: Database },
  { id: 'contracts', name: 'قرارداد ها', icon: FileText },
  { id: 'warehouse-receipt', name: 'رسید انبار', icon: Package },
  { id: 'warehouse-delivery', name: 'حواله انبار', icon: FileOutput },
  { id: 'Deduction-Addition', name: 'کسر/اضافه انبار', icon: MinusCircle },
  { id: 'product-conversion', name: 'تبدیل کالا', icon: RefreshCw },
  { id: 'invoice-generation', name: 'صدور فاکتور', icon: CreditCard },
  { id: 'reports', name: 'گزارشات', icon: TrendingUp },
  { id: 'inventory-ledger', name: 'کاردکس موجودی', icon: Archive },
  { id: 'analytics', name: 'تحلیل و بررسی', icon: BarChart3 },
  //{ id: 'complete-system', name: 'سیستم پیشرفته یکپارچه', icon: FileAudio },
  { id: 'oil-product-creator', name: 'تحلیل محصول نهایی', icon: FlaskConical },
  { id: 'speech-to-text', name: 'امکانات ویژه', icon: Mic },
  { id: 'messaging', name: 'مکاتبات', icon: Users },
  { id: 'users', name: 'مدیریت کاربران', icon: Users },
  { id: 'settings', name: 'تنظیمات', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeModule, 
  setActiveModule, 
  onModuleChange, 
  isDark, 
  isDarkMode,
  settings
}) => {


  const handleModuleChange = async (module: string) => {
    // بررسی تنظیم "صفحه در صفحه"
    const openInNewTab = settings?.performance?.openInNewTab || false;
    
    if (openInNewTab) {
      // اگر تب فعلی خودش با همین ماژول باز است، کاری نکن
      if (activeModule === module) {
        // تب فعلی خودش با این ماژول است، فقط focus کن
        window.focus();
        return;
      }
      
      console.log(`🔍 بررسی وجود تب با ماژول ${module}...`);
      
      // بررسی اینکه آیا تب دیگری با این ماژول از قبل باز است
      const tabExists = await checkAndFocusTab(module);
      
      if (tabExists) {
        console.log(`✅ تب با ماژول ${module} پیدا شد، منتقل می‌شویم...`);
        // تب پیدا شد - modal در تب مقصد نمایش داده می‌شود
        return;
      }
      
      console.log(`❌ تب با ماژول ${module} پیدا نشد، تب جدید باز می‌کنیم...`);
      
      // تب با این ماژول وجود ندارد، تب جدید باز کن
      const currentUrl = window.location.href.split('#')[0];
      const newUrl = `${currentUrl}#module=${module}`;
      window.open(newUrl, '_blank');
    } else {
      // رفتار عادی: تغییر ماژول در همان صفحه
      if (setActiveModule) {
        setActiveModule(module);
      } else if (onModuleChange) {
        onModuleChange(module);
      }
    }
  };
  
  const darkMode = isDark !== undefined ? isDark : (isDarkMode !== undefined ? isDarkMode : false);
  return (
    <aside className={`w-64 h-screen overflow-y-auto ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-900 text-white'}`}>
      <div className="p-6">
        <div className="mb-8">
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-200'}`}>منوی اصلی</h2>
        </div>
        
        <nav className="space-y-2">
          {/* منوهای اصلی */}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleModuleChange(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' 
                    : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-300 hover:bg-gray-800'} hover:text-white`
                  }
                `}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">{item.name}</span>
              </button>
            );
          })}

        </nav>
      </div>
    </aside>
  );
};
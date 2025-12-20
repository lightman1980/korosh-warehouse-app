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
import { canView } from '../../utils/permissionHelpers';

interface SidebarProps {
  activeModule: string;
  setActiveModule?: (module: string) => void;
  onModuleChange?: (module: string) => void;
  currentUser?: any;
  isDark?: boolean;
  isDarkMode?: boolean;
  settings?: any;
}

// منوهای اصلی با mapping به moduleId در سیستم دسترسی
const menuItems = [
  { id: 'dashboard', name: 'داشبورد', icon: Home, permissionModuleId: 'dashboard' },
  { id: 'base-data', name: 'اطلاعات پایه', icon: Database, permissionModuleId: 'base_data' },
  { id: 'contracts', name: 'قرارداد ها', icon: FileText, permissionModuleId: 'contracts' },
  { id: 'warehouse-receipt', name: 'رسید انبار', icon: Package, permissionModuleId: 'consignment_receipt' },
  { id: 'warehouse-delivery', name: 'حواله انبار', icon: FileOutput, permissionModuleId: 'warehouse_delivery' },
  { id: 'Deduction-Addition', name: 'کسر/اضافه انبار', icon: MinusCircle, permissionModuleId: 'inventory_adjustment' },
  { id: 'product-conversion', name: 'تبدیل کالا', icon: RefreshCw, permissionModuleId: 'product_conversion' },
  { id: 'invoice-generation', name: 'صدور فاکتور', icon: CreditCard, permissionModuleId: 'invoice' },
  { id: 'reports', name: 'گزارشات', icon: TrendingUp, permissionModuleId: 'reports' },
  { id: 'inventory-ledger', name: 'کاردکس موجودی', icon: Archive, permissionModuleId: 'inventory_ledger' },
  { id: 'analytics', name: 'تحلیل و بررسی', icon: BarChart3, permissionModuleId: 'analytics' },
  { id: 'speech-to-text', name: 'امکانات ویژه', icon: Mic, permissionModuleId: 'speech-to-text' },
  { id: 'messaging', name: 'مکاتبات', icon: Users, permissionModuleId: 'correspondence' },
  { id: 'users', name: 'مدیریت کاربران', icon: Users, permissionModuleId: 'user_management' },
  { id: 'settings', name: 'تنظیمات', icon: Settings, permissionModuleId: 'settings' },
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
            
            // بررسی دسترسی view برای این ماژول
            // اگر permissionModuleId تعریف نشده باشد، دسترسی داده می‌شود (برای سازگاری)
            const hasAccess = item.permissionModuleId 
              ? canView(item.permissionModuleId) 
              : true;
            
            // اگر دسترسی نداشته باشد، منو را نمایش نده
            if (!hasAccess) {
              return null;
            }
            
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
import React from 'react';
import { RefreshCw } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  isDarkMode?: boolean;
  onRefresh?: () => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, isDarkMode = false, onRefresh }) => {
  const logoUrl = "https://z-cdn-media.chatglm.cn/files/7094d229-4d09-430e-98c1-73f61a7991d6_%D9%84%D9%88%DA%AF%D9%88%20%D8%B5%D9%86%D8%B9%D8%AA%20%D8%BA%D8%B0%D8%A7%DB%8C%DB%8C%20%DA%A9%D9%88%D8%B1%D8%B4.jpg?auth_key=1788869487-700454f4145444fcabf14d4109c175fd-0-531d677f789c51954e01f268eaedd559";
  
  // Default refresh handler if not provided
  const handleRefresh = onRefresh || (() => {
    window.dispatchEvent(new CustomEvent('refreshData'));
    window.location.reload();
  });

  return (
    <div className="mb-8 flex items-start justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          title="به‌روزرسانی اطلاعات"
        >
          <RefreshCw className="h-4 w-4" />
          به‌روزرسانی
        </button>
        <div>
          <h1 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            {title}
          </h1>
          {subtitle && (
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center">
        <img
          src={logoUrl}
          alt="لوگو شرکت صنعت غذایی کورش"
          className="h-16 w-auto"
          onError={(e) => {
            // Fallback to local image if URL fails
            const target = e.currentTarget as HTMLImageElement;
            target.src = "/لوگو صنعت غذایی کورش.jpg";
            target.onerror = () => {
              target.style.display = 'none';
            };
          }}
        />
      </div>
    </div>
  );
};

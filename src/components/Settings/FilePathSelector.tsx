import React from 'react';
import { FolderOpen } from 'lucide-react';

interface FilePathSelectorProps {
  value: string;
  onChange: (path: string) => void;
  type: 'database' | 'logs' | 'backup' | 'temp' | 'certificates' | 'uploads' | 'exports';
  title: string;
  description?: string;
  platform: 'windows' | 'linux' | 'macos' | string;
}

// یک کامپوننت کوچک و مستقل برای انتخاب و ویرایش مسیر پوشه‌ها
export const FilePathSelector: React.FC<FilePathSelectorProps> = ({
  value,
  onChange,
  type,
  title,
  description,
  platform,
}) => {
  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const selectFolder = async () => {
    const typeNames: Record<string, string> = {
      database: 'پایگاه داده',
      logs: 'لاگ‌ها',
      backup: 'پشتیبان',
      temp: 'فایل‌های موقت',
      certificates: 'گواهینامه‌های SSL',
      uploads: 'آپلود فایل‌ها',
      exports: 'خروجی گزارش‌ها',
    };

    const typeName = typeNames[type] || 'پوشه';
    const currentPath = value || '';

    try {
      // اگر مرورگر از File System Access API پشتیبانی کند
      if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
        try {
          const dirHandle = await (window as any).showDirectoryPicker({
            mode: 'readwrite',
          });

          const folderName = dirHandle.name;
          const baseDefault =
            platform === 'windows'
              ? `C:\\ProgramData\\TankSystem\\${folderName}`
              : platform === 'macos'
              ? `/Users/Shared/TankSystem/${folderName}`
              : `/var/opt/tanksystem/${folderName}`;

          const defaultPath =
            currentPath && currentPath.trim().length > 0
              ? currentPath
              : baseDefault;

          const fullPath = window.prompt(
            `پوشه "${folderName}" انتخاب شد.\n\nلطفاً مسیر کامل این پوشه را وارد کنید:`,
            defaultPath
          );

          if (fullPath && fullPath.trim()) {
            onChange(fullPath.trim());
          }
        } catch (error: any) {
          // اگر کاربر دیالوگ را بست، خطا نگیریم
          if (error?.name !== 'AbortError') {
            console.warn('خطا در انتخاب پوشه:', error);
          }
        }
      } else {
        // مرورگرهای قدیمی‌تر: فقط از prompt استفاده می‌کنیم
        const baseDefault =
          platform === 'windows'
            ? `C:\\ProgramData\\TankSystem\\${type}`
            : platform === 'macos'
            ? `/Users/Shared/TankSystem/${type}`
            : `/var/opt/tanksystem/${type}`;

        const defaultPath =
          currentPath && currentPath.trim().length > 0
            ? currentPath
            : baseDefault;

        const path = window.prompt(
          `لطفاً مسیر کامل پوشه ${typeName} را وارد کنید:`,
          defaultPath
        );

        if (path && path.trim()) {
          onChange(path.trim());
        }
      }
    } catch (error) {
      console.error('خطای انتخاب پوشه:', error);
      const path = window.prompt(
        `لطفاً مسیر کامل پوشه ${typeName} را وارد کنید:`,
        currentPath
      );
      if (path && path.trim()) {
        onChange(path.trim());
      }
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {title}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value || ''}
          onChange={handleManualChange}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          dir="ltr"
        />
        <button
          type="button"
          onClick={selectFolder}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <FolderOpen className="h-4 w-4" />
          انتخاب پوشه
        </button>
      </div>
      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
    </div>
  );
};



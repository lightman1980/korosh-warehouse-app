import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, Download, Upload, FolderOpen, AlertTriangle, 
  CheckCircle, XCircle, Info, HardDrive, Database, FileText,
  Save, Loader2, Shield, Archive, Copy, Trash2, RotateCcw
} from 'lucide-react';
import { DataStorage } from '../../utils/dataStorage';
import { formatPersianDate, formatPersianNumber } from '../../utils/persian';
// Update Settings Component
import { Tooltip } from '../Common/Tooltip';

interface UpdateSettingsProps {
  settings: any;
  setSettings: (settings: any) => void;
}

interface UpdateStatus {
  status: 'idle' | 'checking' | 'backing_up' | 'updating' | 'success' | 'error';
  message: string;
  progress: number;
}

export const UpdateSettings: React.FC<UpdateSettingsProps> = ({
  settings,
  setSettings
}) => {
  const [updatePath, setUpdatePath] = useState<string>('');
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.0');
  const [newVersion, setNewVersion] = useState<string>('');
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    status: 'idle',
    message: '',
    progress: 0
  });
  const [backupPath, setBackupPath] = useState<string>('');
  const [backupFilePath, setBackupFilePath] = useState<string>('');
  const [dataPaths, setDataPaths] = useState<{
    database: string;
    settings: string;
    logs: string;
    backup: string;
  }>({
    database: '',
    settings: '',
    logs: '',
    backup: ''
  });

  useEffect(() => {
    loadCurrentVersion();
  }, []);

  useEffect(() => {
    loadDataPaths();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const loadCurrentVersion = async () => {
    try {
      // Try to fetch package.json
      const response = await fetch('/package.json');
      if (response.ok) {
        const packageJson = await response.json();
        setCurrentVersion(packageJson.version || '1.0.0');
      } else {
        // Fallback: try to get from window or use default
        const appVersion = (window as any).APP_VERSION || '1.0.0';
        setCurrentVersion(appVersion);
      }
    } catch (error) {
      console.error('Error loading version:', error);
      // Fallback: try to get from window or use default
      const appVersion = (window as any).APP_VERSION || '1.0.0';
      setCurrentVersion(appVersion);
    }
  };

  const loadDataPaths = () => {
    try {
      const storage = DataStorage.getInstance();
      const savedSettings = storage.loadData('settings') as any;
      
      // Try to get paths from settings prop first, then from savedSettings
      const dataStoragePath = settings?.dataStoragePath || savedSettings?.dataStoragePath || 'C:\\ProgramData\\Makhazen\\Database';
      const backupPathValue = settings?.backupPath || savedSettings?.backupPath || 'C:\\ProgramData\\Makhazen\\Backup';
      
      if (savedSettings || settings) {
        setDataPaths({
          database: dataStoragePath,
          settings: backupPathValue.replace(/Backup$/, 'Config') || 'C:\\ProgramData\\Makhazen\\Config',
          logs: 'C:\\ProgramData\\Makhazen\\Logs',
          backup: backupPathValue
        });
        setBackupPath(backupPathValue);
      } else {
        const defaultPaths = {
          database: 'C:\\ProgramData\\Makhazen\\Database',
          settings: 'C:\\ProgramData\\Makhazen\\Config',
          logs: 'C:\\ProgramData\\Makhazen\\Logs',
          backup: 'C:\\ProgramData\\Makhazen\\Backup'
        };
        setDataPaths(defaultPaths);
        setBackupPath(defaultPaths.backup);
      }
      
      console.log('📁 مسیرهای داده لود شد:', {
        database: dataStoragePath,
        backup: backupPathValue
      });
    } catch (error) {
      console.error('Error loading data paths:', error);
      // Set default paths on error
      const defaultPaths = {
        database: 'C:\\ProgramData\\Makhazen\\Database',
        settings: 'C:\\ProgramData\\Makhazen\\Config',
        logs: 'C:\\ProgramData\\Makhazen\\Logs',
        backup: 'C:\\ProgramData\\Makhazen\\Backup'
      };
      setDataPaths(defaultPaths);
      setBackupPath(defaultPaths.backup);
    }
  };

  const selectUpdateFolder = async () => {
    try {
      // Check if File System Access API is available
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        // Get full path if possible, otherwise use name
        let path = dirHandle.name;
        
        // Try to get full path from the directory handle
        try {
          // For File System Access API, we can't directly get full path
          // But we can try to read package.json to verify it's the right folder
          const fileHandle = await dirHandle.getFileHandle('package.json');
          const file = await fileHandle.getFile();
          const text = await file.text();
          const packageJson = JSON.parse(text);
          setNewVersion(packageJson.version || '');
          // Use a descriptive path since we can't get full path
          path = `${dirHandle.name} (package.json version: ${packageJson.version || 'unknown'})`;
        } catch (error) {
          console.warn('Could not read package.json from selected folder:', error);
          // Still set the path even if package.json is not found
        }
        
        setUpdatePath(path);
      } else {
        // Fallback to prompt for older browsers
        const path = prompt('لطفا مسیر کامل فولدر برنامه جدید را وارد کنید:', updatePath);
        if (path) {
          setUpdatePath(path);
          // Try to fetch package.json if it's a URL path
          if (path.startsWith('http://') || path.startsWith('https://')) {
            try {
              const response = await fetch(`${path}/package.json`);
              if (response.ok) {
                const packageJson = await response.json();
                setNewVersion(packageJson.version || '');
              }
            } catch (error) {
              console.warn('Could not fetch package.json:', error);
            }
          }
        }
      }
    } catch (error: any) {
      // User cancelled the dialog
      if (error.name === 'AbortError' || error.message?.includes('cancel')) {
        console.log('User cancelled folder selection');
        return;
      }
      console.error('Error selecting folder:', error);
      alert('خطا در انتخاب پوشه: ' + (error.message || 'خطای نامشخص'));
    }
  };

  const createBackupBeforeUpdate = async (): Promise<boolean> => {
    setUpdateStatus({
      status: 'backing_up',
      message: 'در حال ایجاد پشتیبان از داده‌ها...',
      progress: 0
    });

    try {
      const storage = DataStorage.getInstance();
      const allData = storage.getAllData();
      
      // Create comprehensive backup
      const backupData = {
        timestamp: new Date().toISOString(),
        version: currentVersion,
        settings: settings,
        data: allData,
        dataPaths: dataPaths,
        type: 'pre_update_backup'
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + jsonStr], { 
        type: 'application/json;charset=utf-8' 
      });

      // Log backup info for debugging
      console.log('💾 اطلاعات پشتیبان:', {
        timestamp: backupData.timestamp,
        version: backupData.version,
        dataKeys: Object.keys(backupData.data || {}),
        dataPaths: backupData.dataPaths,
        size: blob.size
      });

      // Save backup file
      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: `pre_update_backup_${new Date().toISOString().split('T')[0]}.json`,
            types: [
              {
                description: 'JSON files',
                accept: {
                  'application/json': ['.json'],
                },
              },
            ],
          });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          
          console.log('✅ پشتیبان با موفقیت ذخیره شد:', fileHandle.name);
          
          setUpdateStatus({
            status: 'success',
            message: `پشتیبان با موفقیت ایجاد شد: ${fileHandle.name}`,
            progress: 100
          });
          
          // Auto-clear success message after 10 seconds
          setTimeout(() => {
            setUpdateStatus(prev => {
              if (prev.status === 'success' && prev.message.includes('پشتیبان با موفقیت ایجاد شد')) {
                return { status: 'idle', message: '', progress: 0 };
              }
              return prev;
            });
          }, 10000);
          
          return true;
        } catch (err) {
          console.error('Error saving backup file:', err);
          // Fallback to download
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `pre_update_backup_${new Date().toISOString().split('T')[0]}.json`;
          link.click();
          
          setUpdateStatus({
            status: 'success',
            message: 'پشتیبان برای دانلود آماده شد',
            progress: 100
          });
          
          // Auto-clear success message after 10 seconds
          setTimeout(() => {
            setUpdateStatus(prev => {
              if (prev.status === 'success' && prev.message.includes('پشتیبان برای دانلود آماده شد')) {
                return { status: 'idle', message: '', progress: 0 };
              }
              return prev;
            });
          }, 10000);
          
          return true;
        }
      } else {
        // Fallback to download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `pre_update_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        setUpdateStatus({
          status: 'success',
          message: 'پشتیبان برای دانلود آماده شد',
          progress: 100
        });
        
        // Auto-clear success message after 10 seconds
        setTimeout(() => {
          setUpdateStatus(prev => {
            if (prev.status === 'success' && prev.message.includes('پشتیبان برای دانلود آماده شد')) {
              return { status: 'idle', message: '', progress: 0 };
            }
            return prev;
          });
        }, 10000);
        
        return true;
      }
    } catch (error) {
      console.error('Backup error:', error);
      setUpdateStatus({
        status: 'error',
        message: 'خطا در ایجاد پشتیبان',
        progress: 0
      });
      return false;
    }
  };

  const generateUpdateScript = () => {
    if (!updatePath) {
      alert('لطفا ابتدا مسیر برنامه جدید را انتخاب کنید');
      return;
    }

    // Sanitize paths to prevent script injection
    const sanitizedUpdatePath = updatePath.replace(/[&|<>"]/g, '');
    const sanitizedDataPath = (dataPaths.database || '').replace(/[&|<>"]/g, '');
    const sanitizedBackupPath = (backupPath || '').replace(/[&|<>"]/g, '');

    const script = `@echo off
REM اسکریپت بروزرسانی برنامه - حفظ داده‌های کاربر
REM تاریخ ایجاد: ${formatPersianDate(new Date())}

echo ========================================
echo    اسکریپت بروزرسانی برنامه
echo ========================================
echo.

REM تعریف مسیرها
set "OLD_APP_PATH=%~dp0"
set "NEW_APP_PATH=${sanitizedUpdatePath.replace(/\\/g, '\\\\')}"
set "DATA_PATH=${sanitizedDataPath.replace(/\\/g, '\\\\')}"
set "BACKUP_PATH=${sanitizedBackupPath.replace(/\\/g, '\\\\')}"

echo مسیر برنامه فعلی: %OLD_APP_PATH%
echo مسیر برنامه جدید: %NEW_APP_PATH%
echo مسیر داده‌ها: %DATA_PATH%
echo.

REM بررسی وجود مسیر برنامه جدید
if not exist "%NEW_APP_PATH%" (
    echo خطا: مسیر برنامه جدید یافت نشد!
    pause
    exit /b 1
)

REM ایجاد پشتیبان از داده‌ها
echo در حال ایجاد پشتیبان از داده‌ها...
set "BACKUP_FILE=%BACKUP_PATH%\\backup_before_update_%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%.zip"
if not exist "%BACKUP_PATH%" mkdir "%BACKUP_PATH%"

REM کپی فایل‌های داده
xcopy "%DATA_PATH%\\*.*" "%BACKUP_FILE%\\" /E /I /Y
if errorlevel 1 (
    echo هشدار: خطا در ایجاد پشتیبان از داده‌ها
)

REM کپی فایل‌های تنظیمات
if exist "%OLD_APP_PATH%\\backend\\tanksystem_settings.db" (
    copy "%OLD_APP_PATH%\\backend\\tanksystem_settings.db" "%BACKUP_PATH%\\tanksystem_settings_backup.db" /Y
)

REM فهرست فایل‌ها و پوشه‌هایی که باید حفظ شوند
set "PRESERVE_FOLDERS=Database Config Logs Backup"
set "PRESERVE_FILES=tanksystem_settings.db"

echo.
echo در حال بروزرسانی برنامه...

REM کپی فایل‌های جدید (به جز داده‌ها)
for /d %%d in ("%NEW_APP_PATH%\\*") do (
    set "folder=%%~nxd"
    set "preserve=0"
    for %%p in (%PRESERVE_FOLDERS%) do (
        if "%%p"=="!folder!" set "preserve=1"
    )
    if "!preserve!"=="0" (
        echo کپی پوشه: !folder!
        xcopy "%NEW_APP_PATH%\\!folder!" "%OLD_APP_PATH%\\!folder!" /E /I /Y
    )
)

REM کپی فایل‌های جدید
for %%f in ("%NEW_APP_PATH%\\*.*") do (
    set "file=%%~nxf"
    set "preserve=0"
    for %%p in (%PRESERVE_FILES%) do (
        if "%%p"=="!file!" set "preserve=1"
    )
    if "!preserve!"=="0" (
        echo کپی فایل: !file!
        copy "%NEW_APP_PATH%\\!file!" "%OLD_APP_PATH%\\!file!" /Y
    )
)

echo.
echo ========================================
echo    بروزرسانی با موفقیت انجام شد!
echo ========================================
echo.
echo نکته مهم: داده‌های شما حفظ شده‌اند.
echo در صورت بروز مشکل، از پشتیبان ایجاد شده استفاده کنید.
echo.
pause
`;

    const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `update_script_${new Date().toISOString().split('T')[0]}.bat`;
    link.click();
    
    alert('اسکریپت بروزرسانی با موفقیت دانلود شد. لطفا آن را در مسیر نصب برنامه اجرا کنید.');
  };

  const generateUpdateInstructions = () => {
    const instructions = `راهنمای بروزرسانی برنامه
================================

تاریخ: ${formatPersianDate(new Date())}
نسخه فعلی: ${currentVersion || '1.0.0'}
نسخه جدید: ${newVersion || 'نامشخص'}

مراحل بروزرسانی:
-----------------

1. ایجاد پشتیبان:
   - قبل از هر بروزرسانی، حتما از تمام داده‌ها پشتیبان بگیرید
   - مسیر پشتیبان: ${backupPath}
   - فایل‌های مهم برای پشتیبان:
     * ${dataPaths.database} (فایل‌های پایگاه داده)
     * backend/tanksystem_settings.db (تنظیمات سیستم)
     * تمام فایل‌های در پوشه Config

2. مسیر برنامه جدید:
   ${updatePath || 'لطفا مسیر را انتخاب کنید'}

3. فایل‌ها و پوشه‌های که باید حفظ شوند:
   - پوشه Database: ${dataPaths.database}
   - پوشه Config: ${dataPaths.settings}
   - پوشه Logs: ${dataPaths.logs}
   - پوشه Backup: ${dataPaths.backup}
   - فایل tanksystem_settings.db در پوشه backend

4. مراحل بروزرسانی:
   a) برنامه را متوقف کنید
   b) از فایل‌های داده پشتیبان بگیرید
   c) فایل‌های جدید را در مسیر برنامه کپی کنید
   d) مطمئن شوید فایل‌های داده حفظ شده‌اند
   e) برنامه را مجددا راه‌اندازی کنید

5. بررسی پس از بروزرسانی:
   - بررسی کنید که تمام داده‌ها موجود هستند
   - تنظیمات سیستم را بررسی کنید
   - در صورت مشکل، از پشتیبان استفاده کنید

نکات مهم:
---------
- هرگز فایل‌های پایگاه داده را حذف یا جایگزین نکنید
- قبل از بروزرسانی، حتما پشتیبان کامل بگیرید
- در صورت بروز مشکل، می‌توانید از پشتیبان استفاده کنید
- فایل‌های .db و .sqlite را هرگز تغییر ندهید

`;

    const blob = new Blob([instructions], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `update_instructions_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  const handleUpdate = async () => {
    if (!updatePath) {
      alert('لطفا مسیر برنامه جدید را انتخاب کنید');
      return;
    }

    if (!confirm(`آیا از بروزرسانی برنامه از نسخه ${currentVersion} به نسخه ${newVersion || 'جدید'} اطمینان دارید؟\n\nتوجه: این عملیات نیاز به دسترسی به فایل سیستم دارد و باید به صورت دستی انجام شود.`)) {
      return;
    }

    setUpdateStatus({
      status: 'updating',
      message: 'در حال آماده‌سازی بروزرسانی...',
      progress: 0
    });

    // Create backup first
    const backupSuccess = await createBackupBeforeUpdate();
    if (!backupSuccess) {
      setUpdateStatus({
        status: 'error',
        message: 'خطا در ایجاد پشتیبان. لطفا قبل از ادامه، پشتیبان دستی بگیرید.',
        progress: 0
      });
      return;
    }

    setUpdateStatus({
      status: 'updating',
      message: 'در حال ایجاد اسکریپت بروزرسانی...',
      progress: 50
    });

    // Generate update script and instructions
    try {
      generateUpdateScript();
      setTimeout(() => {
        generateUpdateInstructions();
      }, 1000);

      setUpdateStatus({
        status: 'success',
        message: 'اسکریپت بروزرسانی و راهنما با موفقیت ایجاد شدند. لطفا مراحل را دنبال کنید.',
        progress: 100
      });
    } catch (error) {
      console.error('Error generating update files:', error);
      setUpdateStatus({
        status: 'error',
        message: 'خطا در ایجاد اسکریپت بروزرسانی',
        progress: 0
      });
    }
  };

  const checkUpdatePath = async () => {
    if (!updatePath) {
      alert('لطفا مسیر برنامه جدید را انتخاب کنید');
      return;
    }

    setUpdateStatus({
      status: 'checking',
      message: 'در حال بررسی مسیر برنامه جدید...',
      progress: 0
    });

    try {
      // Try to read package.json from the update path
      // Note: This is a simplified check. In a real scenario, you'd need server-side API
      setUpdateStatus({
        status: 'success',
        message: 'مسیر برنامه جدید معتبر است',
        progress: 100
      });
    } catch (error) {
      setUpdateStatus({
        status: 'error',
        message: 'خطا در بررسی مسیر برنامه جدید',
        progress: 0
      });
    }
  };

  const restoreFromBackup = async () => {
    if (!confirm('آیا از بازگردانی داده‌ها از پشتیبان اطمینان دارید؟\n\nتوجه: این عملیات تمام داده‌های فعلی را با داده‌های پشتیبان جایگزین می‌کند.')) {
      return;
    }

    setUpdateStatus({
      status: 'backing_up',
      message: 'در حال بارگذاری فایل پشتیبان...',
      progress: 0
    });

    try {
      // If backup file path is provided and it's a URL, fetch it directly
      if (backupFilePath && backupFilePath.trim() && (backupFilePath.startsWith('http://') || backupFilePath.startsWith('https://'))) {
        setUpdateStatus({
          status: 'backing_up',
          message: 'در حال خواندن فایل پشتیبان از مسیر مشخص شده...',
          progress: 30
        });

        try {
          const response = await fetch(backupFilePath);
          if (!response.ok) {
            throw new Error('نمی‌توان فایل پشتیبان را از آدرس مشخص شده بارگذاری کرد');
          }
          const fileContent = await response.text();

          setUpdateStatus({
            status: 'backing_up',
            message: 'در حال بازگردانی داده‌ها...',
            progress: 60
          });

          const backupData = JSON.parse(fileContent);
          
          // Validate backup file
          if (!backupData.type || backupData.type !== 'pre_update_backup') {
            throw new Error('فایل انتخاب شده یک پشتیبان معتبر نیست');
          }

          if (!backupData.data || !backupData.settings) {
            throw new Error('فایل پشتیبان ناقص است');
          }

          // Restore data
          const storage = DataStorage.getInstance();
          
          console.log('🔄 شروع بازگردانی از پشتیبان:', {
            version: backupData.version,
            timestamp: backupData.timestamp,
            dataKeys: Object.keys(backupData.data || {}),
            hasSettings: !!backupData.settings
          });
          
          // Restore all data
          if (backupData.data) {
            const dataKeys = Object.keys(backupData.data);
            console.log(`📦 بازگردانی ${dataKeys.length} کلید داده...`);
            
            Object.entries(backupData.data).forEach(([key, value]) => {
              storage.saveData(key, value);
              console.log(`✅ داده بازگردانی شد: ${key}`);
            });
          }

          // Restore settings
          if (backupData.settings) {
            setSettings(backupData.settings);
            storage.saveData('settings', backupData.settings);
            console.log('✅ تنظیمات بازگردانی شد');
          }

          // Restore data paths if available
          if (backupData.dataPaths) {
            setDataPaths(backupData.dataPaths);
            console.log('✅ مسیرهای داده بازگردانی شد:', backupData.dataPaths);
          }

          console.log('✅ بازگردانی با موفقیت انجام شد');

          setUpdateStatus({
            status: 'success',
            message: `داده‌ها با موفقیت از پشتیبان بازگردانی شدند. نسخه پشتیبان: ${backupData.version || 'نامشخص'}`,
            progress: 100
          });

          // Reload page after 3 seconds to apply changes
          setTimeout(() => {
            if (confirm('بازگردانی با موفقیت انجام شد. آیا می‌خواهید صفحه را بازخوانی کنید؟')) {
              window.location.reload();
            } else {
              // Auto-clear success message after 10 seconds if user doesn't reload
              setTimeout(() => {
                setUpdateStatus(prev => {
                  if (prev.status === 'success' && prev.message.includes('بازگردانی شدند')) {
                    return { status: 'idle', message: '', progress: 0 };
                  }
                  return prev;
                });
              }, 10000);
            }
          }, 3000);

          return; // Exit early if URL fetch was successful
        } catch (error) {
          console.error('Restore error:', error);
          setUpdateStatus({
            status: 'error',
            message: `خطا در بازگردانی: ${error instanceof Error ? error.message : 'خطای نامشخص'}`,
            progress: 0
          });
          return;
        }
      }

      // For local files or when no URL is provided, use file picker
      // Create file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.style.display = 'none';
      document.body.appendChild(input);
      
      input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) {
            setUpdateStatus({
              status: 'idle',
              message: '',
              progress: 0
            });
            return;
          }

        // Update backup file path with selected file name
        setBackupFilePath(file.name);

        // Validate file type
        if (!file.name.endsWith('.json')) {
          setUpdateStatus({
            status: 'error',
            message: 'فایل انتخاب شده باید از نوع JSON باشد',
            progress: 0
          });
          return;
        }

        setUpdateStatus({
          status: 'backing_up',
          message: 'در حال خواندن فایل پشتیبان...',
          progress: 30
        });

        try {
          const reader = new FileReader();
          
          reader.onload = async (event) => {
            try {
              setUpdateStatus({
                status: 'backing_up',
                message: 'در حال بازگردانی داده‌ها...',
                progress: 60
              });

              const backupData = JSON.parse(event.target?.result as string);
              
              // Validate backup file
              if (!backupData.type || backupData.type !== 'pre_update_backup') {
                throw new Error('فایل انتخاب شده یک پشتیبان معتبر نیست');
              }

              if (!backupData.data || !backupData.settings) {
                throw new Error('فایل پشتیبان ناقص است');
              }

              // Restore data
              const storage = DataStorage.getInstance();
              
              console.log('🔄 شروع بازگردانی از پشتیبان:', {
                version: backupData.version,
                timestamp: backupData.timestamp,
                dataKeys: Object.keys(backupData.data || {}),
                hasSettings: !!backupData.settings
              });
              
              // Restore all data
              if (backupData.data) {
                const dataKeys = Object.keys(backupData.data);
                console.log(`📦 بازگردانی ${dataKeys.length} کلید داده...`);
                
                Object.entries(backupData.data).forEach(([key, value]) => {
                  storage.saveData(key, value);
                  console.log(`✅ داده بازگردانی شد: ${key}`);
                });
              }

              // Restore settings
              if (backupData.settings) {
                setSettings(backupData.settings);
                storage.saveData('settings', backupData.settings);
                console.log('✅ تنظیمات بازگردانی شد');
              }

              // Restore data paths if available
              if (backupData.dataPaths) {
                setDataPaths(backupData.dataPaths);
                console.log('✅ مسیرهای داده بازگردانی شد:', backupData.dataPaths);
              }

              console.log('✅ بازگردانی با موفقیت انجام شد');

              setUpdateStatus({
                status: 'success',
                message: `داده‌ها با موفقیت از پشتیبان بازگردانی شدند. نسخه پشتیبان: ${backupData.version || 'نامشخص'}`,
                progress: 100
              });

              // Reload page after 3 seconds to apply changes
              setTimeout(() => {
                if (confirm('بازگردانی با موفقیت انجام شد. آیا می‌خواهید صفحه را بازخوانی کنید؟')) {
                  window.location.reload();
                } else {
                  // Auto-clear success message after 10 seconds if user doesn't reload
                  setTimeout(() => {
                    setUpdateStatus(prev => {
                      if (prev.status === 'success' && prev.message.includes('بازگردانی شدند')) {
                        return { status: 'idle', message: '', progress: 0 };
                      }
                      return prev;
                    });
                  }, 10000);
                }
              }, 3000);

            } catch (error) {
              console.error('Restore error:', error);
              setUpdateStatus({
                status: 'error',
                message: `خطا در بازگردانی: ${error instanceof Error ? error.message : 'خطای نامشخص'}`,
                progress: 0
              });
            }
          };

          reader.onerror = () => {
            setUpdateStatus({
              status: 'error',
              message: 'خطا در خواندن فایل پشتیبان',
              progress: 0
            });
          };

          reader.readAsText(file);
        } catch (error) {
          console.error('File read error:', error);
          setUpdateStatus({
            status: 'error',
            message: 'خطا در پردازش فایل پشتیبان',
            progress: 0
          });
        }
      };

      input.oncancel = () => {
        setUpdateStatus({
          status: 'idle',
          message: '',
          progress: 0
        });
        document.body.removeChild(input);
      };

      input.click();
      
      // Clean up after file selection
      setTimeout(() => {
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
      }, 1000);
    } catch (error) {
      console.error('Restore backup error:', error);
      setUpdateStatus({
        status: 'error',
        message: 'خطا در بازگردانی از پشتیبان',
        progress: 0
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* اطلاعات نسخه فعلی */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">اطلاعات نسخه فعلی</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700 font-medium">نسخه فعلی:</span>
            <span className="text-blue-900 mr-2">{currentVersion}</span>
          </div>
          <div>
            <span className="text-blue-700 font-medium">تاریخ بررسی:</span>
            <span className="text-blue-900 mr-2">{formatPersianDate(new Date())}</span>
          </div>
        </div>
      </div>

      {/* انتخاب مسیر برنامه جدید */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-blue-600" />
          انتخاب مسیر برنامه جدید
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              مسیر فولدر برنامه جدید
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={updatePath}
                onChange={(e) => setUpdatePath(e.target.value)}
                placeholder="مثال: C:\Program Files\Makhazen\NewVersion"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={selectUpdateFolder}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                انتخاب پوشه
              </button>
            </div>
          </div>

          {newVersion && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800">
                  نسخه جدید شناسایی شد: <strong>{newVersion}</strong>
                </span>
              </div>
            </div>
          )}

          <button
            onClick={checkUpdatePath}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            بررسی مسیر
          </button>
        </div>
      </div>

      {/* مسیرهای داده */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="h-5 w-5 text-green-600" />
          مسیرهای داده (که حفظ خواهند شد)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-gray-700">پایگاه داده</span>
            </div>
            <p className="text-sm text-gray-600 break-all">{dataPaths.database}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-purple-600" />
              <span className="font-medium text-gray-700">تنظیمات</span>
            </div>
            <p className="text-sm text-gray-600 break-all">{dataPaths.settings}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-gray-700">لاگ‌ها</span>
            </div>
            <p className="text-sm text-gray-600 break-all">{dataPaths.logs}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Archive className="h-4 w-4 text-red-600" />
              <span className="font-medium text-gray-700">پشتیبان</span>
            </div>
            <p className="text-sm text-gray-600 break-all">{dataPaths.backup}</p>
          </div>
        </div>
      </div>

      {/* وضعیت بروزرسانی */}
      {updateStatus.status !== 'idle' && (
        <div className={`border rounded-lg p-4 ${
          updateStatus.status === 'success' ? 'bg-green-50 border-green-200' :
          updateStatus.status === 'error' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            {updateStatus.status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
            {updateStatus.status === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
            {(updateStatus.status === 'checking' || updateStatus.status === 'backing_up' || updateStatus.status === 'updating') && (
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            )}
            <p className={`font-medium ${
              updateStatus.status === 'success' ? 'text-green-800' :
              updateStatus.status === 'error' ? 'text-red-800' :
              'text-blue-800'
            }`}>
              {updateStatus.message}
            </p>
          </div>
          {(updateStatus.status === 'checking' || updateStatus.status === 'backing_up' || updateStatus.status === 'updating') && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${updateStatus.progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* انتخاب فایل پشتیبان */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Archive className="h-5 w-5 text-teal-600" />
          فراخوانی از پشتیبان
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              مسیر فایل پشتیبان (اختیاری - برای فایل‌های محلی از دکمه انتخاب فایل استفاده کنید)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={backupFilePath}
                onChange={(e) => setBackupFilePath(e.target.value)}
                placeholder="مثال: https://example.com/backup.json یا نام فایل"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.style.display = 'none';
                  document.body.appendChild(input);
                  
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      setBackupFilePath(file.name);
                    }
                    document.body.removeChild(input);
                  };
                  
                  input.oncancel = () => {
                    document.body.removeChild(input);
                  };
                  
                  input.click();
                }}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                انتخاب فایل
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              می‌توانید آدرس URL فایل پشتیبان را وارد کنید یا از دکمه انتخاب فایل برای فایل‌های محلی استفاده کنید
            </p>
          </div>
        </div>
      </div>

      {/* هشدار مهم */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-900 mb-2">نکات مهم قبل از بروزرسانی</h4>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              <li>قبل از بروزرسانی، حتما از تمام داده‌ها پشتیبان کامل بگیرید</li>
              <li>برنامه را متوقف کنید قبل از شروع بروزرسانی</li>
              <li>فایل‌های پایگاه داده (.db, .sqlite) را هرگز حذف یا جایگزین نکنید</li>
              <li>پوشه‌های Database، Config، Logs و Backup را حفظ کنید</li>
              <li>پس از بروزرسانی، برنامه را مجددا راه‌اندازی کنید</li>
              <li>در صورت بروز مشکل، از پشتیبان استفاده کنید</li>
            </ul>
          </div>
        </div>
      </div>

      {/* دکمه‌های عملیات */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={createBackupBeforeUpdate}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <Archive className="h-5 w-5" />
          ایجاد پشتیبان قبل از بروزرسانی
        </button>
        
        <button
          onClick={restoreFromBackup}
          className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
        >
          <RotateCcw className="h-5 w-5" />
          فراخوانی از پشتیبان
        </button>
        
        <button
          onClick={generateUpdateScript}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Download className="h-5 w-5" />
          دانلود اسکریپت بروزرسانی
        </button>
        
        <button
          onClick={generateUpdateInstructions}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
        >
          <FileText className="h-5 w-5" />
          دانلود راهنمای بروزرسانی
        </button>
        
        <button
          onClick={handleUpdate}
          disabled={!updatePath || updateStatus.status === 'checking' || updateStatus.status === 'backing_up' || updateStatus.status === 'updating'}
          className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className="h-5 w-5" />
          شروع بروزرسانی
        </button>
      </div>
    </div>
  );
};

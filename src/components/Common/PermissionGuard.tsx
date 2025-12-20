import React from 'react';
import { canView, canCreate, canEdit, canDelete, getModulePermissions } from '../../utils/permissionHelpers';
import { AlertCircle } from 'lucide-react';

interface PermissionGuardProps {
  moduleId: string;
  action?: 'create' | 'edit' | 'view' | 'delete';
  fallback?: React.ReactNode;
  children: React.ReactNode;
  showMessage?: boolean;
}

/**
 * کامپوننت محافظت از دسترسی
 * فقط در صورت داشتن دسترسی، محتوا را نمایش می‌دهد
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  moduleId,
  action = 'view',
  fallback,
  children,
  showMessage = true
}) => {
  const hasPermission = (() => {
    switch (action) {
      case 'create':
        return canCreate(moduleId);
      case 'edit':
        return canEdit(moduleId);
      case 'view':
        return canView(moduleId);
      case 'delete':
        return canDelete(moduleId);
      default:
        return canView(moduleId);
    }
  })();

  if (hasPermission) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showMessage) {
    const actionNames = {
      create: 'ایجاد',
      edit: 'ویرایش',
      view: 'مشاهده',
      delete: 'حذف'
    };

    return (
      <div className="flex items-center justify-center p-8 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
          <p className="text-yellow-800 dark:text-yellow-200 font-medium">
            شما دسترسی {actionNames[action]} در این بخش را ندارید.
          </p>
          <p className="text-yellow-600 dark:text-yellow-300 text-sm mt-2">
            لطفاً با مدیر سیستم تماس بگیرید.
          </p>
        </div>
      </div>
    );
  }

  return null;
};

/**
 * Hook برای دریافت دسترسی‌های یک ماژول
 */
export const useModulePermissions = (moduleId: string) => {
  const permissions = getModulePermissions(moduleId);
  
  return {
    canView: permissions.view,
    canCreate: permissions.create,
    canEdit: permissions.edit,
    canDelete: permissions.delete,
    permissions
  };
};


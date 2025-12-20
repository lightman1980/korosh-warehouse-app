import { authService } from './AuthService';
import { DataStorage } from './dataStorage';

/**
 * Helper functions for permission checking
 */

export interface ModulePermissions {
  create: boolean;
  edit: boolean;
  view: boolean;
  delete: boolean;
}

/**
 * Get effective permissions for current user on a module
 * دسترسی فردی بر دسترسی گروهی ارجحیت دارد
 */
export function getModulePermissions(moduleId: string): ModulePermissions {
  const user = authService.getCurrentUser();
  if (!user) {
    return { create: false, edit: false, view: false, delete: false };
  }

  // Admin has all permissions
  if (user.permissions.includes('*') || user.role === 'admin') {
    return { create: true, edit: true, view: true, delete: true };
  }

  const storage = DataStorage.getInstance();
  const settings = storage.loadData('appSettings') || {};
  const userManagement = settings.userManagement || {};
  const userAccess = (userManagement.userAccess || []).find((ua: any) => ua.userId === user.id);
  const groups = userManagement.userGroups || [];

  // Step 1: Start with default permissions (deny all)
  let groupPermissions: ModulePermissions = {
    create: false,
    edit: false,
    view: false,
    delete: false
  };

  // Step 2: Collect group permissions (OR logic - if any group has permission, grant it)
  if (userAccess && userAccess.groups && Array.isArray(userAccess.groups)) {
    userAccess.groups.forEach((groupId: string) => {
      const group = groups.find((g: any) => g.id === groupId);
      if (group && group.isActive && group.permissions && Array.isArray(group.permissions)) {
        const groupPerm = group.permissions.find((p: any) => p.moduleId === moduleId);
        if (groupPerm) {
          // اگر هر گروهی دسترسی داشت، اعطا می‌شود (OR logic)
          groupPermissions.create = groupPermissions.create || groupPerm.create;
          groupPermissions.edit = groupPermissions.edit || groupPerm.edit;
          groupPermissions.view = groupPermissions.view || groupPerm.view;
          groupPermissions.delete = groupPermissions.delete || groupPerm.delete;
        }
      }
    });
  }

  // Step 3: Check individual overrides (highest priority - completely replaces group permissions)
  if (userAccess && userAccess.overrides && Array.isArray(userAccess.overrides)) {
    const override = userAccess.overrides.find((o: any) => o.moduleId === moduleId);
    if (override && override.actions) {
      const hasAnyOverride = override.actions.create !== undefined || 
                            override.actions.edit !== undefined || 
                            override.actions.view !== undefined || 
                            override.actions.delete !== undefined;
      
      if (hasAnyOverride) {
        // دسترسی فردی تعریف شده - اولویت کامل دارد و دسترسی گروهی را نادیده می‌گیرد
        return {
          create: override.actions.create ?? false,
          edit: override.actions.edit ?? false,
          view: override.actions.view ?? false,
          delete: override.actions.delete ?? false
        };
      }
    }
  }

  // Step 4: If no individual override, return group permissions
  return groupPermissions;
}

/**
 * Check if current user can perform action on module
 */
export function can(moduleId: string, action: 'create' | 'edit' | 'view' | 'delete'): boolean {
  const perms = getModulePermissions(moduleId);
  return perms[action] || false;
}

/**
 * Check if current user can view module
 */
export function canView(moduleId: string): boolean {
  return can(moduleId, 'view');
}

/**
 * Check if current user can create in module
 */
export function canCreate(moduleId: string): boolean {
  return can(moduleId, 'create');
}

/**
 * Check if current user can edit in module
 */
export function canEdit(moduleId: string): boolean {
  return can(moduleId, 'edit');
}

/**
 * Check if current user can delete in module
 */
export function canDelete(moduleId: string): boolean {
  return can(moduleId, 'delete');
}

/**
 * Get permission message for user
 */
export function getPermissionMessage(moduleId: string, action: 'create' | 'edit' | 'view' | 'delete'): string {
  if (can(moduleId, action)) {
    return '';
  }
  
  const actionNames = {
    create: 'ایجاد',
    edit: 'ویرایش',
    view: 'مشاهده',
    delete: 'حذف'
  };
  
  return `شما دسترسی ${actionNames[action]} در این بخش را ندارید.`;
}


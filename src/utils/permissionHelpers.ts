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

  const effective: ModulePermissions = {
    create: false,
    edit: false,
    view: false,
    delete: false
  };

  // Get permissions from groups
  if (userAccess && userAccess.groups) {
    userAccess.groups.forEach((groupId: string) => {
      const group = groups.find((g: any) => g.id === groupId);
      if (group && group.permissions) {
        const groupPerm = group.permissions.find((p: any) => p.moduleId === moduleId);
        if (groupPerm) {
          effective.create = effective.create || groupPerm.create;
          effective.edit = effective.edit || groupPerm.edit;
          effective.view = effective.view || groupPerm.view;
          effective.delete = effective.delete || groupPerm.delete;
        }
      }
    });
  }

  // Apply individual overrides (priority)
  if (userAccess && userAccess.overrides) {
    const override = userAccess.overrides.find((o: any) => o.moduleId === moduleId);
    if (override && override.actions) {
      const hasOverride = override.actions.create || override.actions.edit || 
                         override.actions.view || override.actions.delete;
      if (hasOverride) {
        return { ...override.actions };
      }
    }
  }

  return effective;
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


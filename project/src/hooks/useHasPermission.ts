import { User } from '../types';

/**
 * Hook to check if a user has a specific permission.
 * Includes automatic bypass for 'admin' role.
 */
export const useHasPermission = (user: User | null) => {
    const hasPermission = (permissionCode: string) => {
        if (!user) return false;

        // Admin role bypass - admins have all permissions
        if (user.role === 'admin') return true;

        // Check if permission code exists in user's permissions array
        const permissions = user.permissions || [];
        return permissions.includes(permissionCode);
    };

    /**
     * Checks if user has ANY of the provided permissions
     */
    const hasAnyPermission = (permissionCodes: string[]) => {
        if (!user) return false;
        if (user.role === 'admin') return true;

        const permissions = user.permissions || [];
        return permissionCodes.some(code => permissions.includes(code));
    };

    return { hasPermission, hasAnyPermission };
};

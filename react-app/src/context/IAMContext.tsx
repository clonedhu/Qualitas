import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, ReactNode } from 'react';
import api from '../services/api';
import { useErrorHandler } from '../hooks/useErrorHandler';

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'active' | 'inactive';
    createdAt: string;
}

export interface Role {
    id: string;
    name: string;
    description: string;
    permissions: string[];
}

interface IAMContextType {
    users: User[];
    roles: Role[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    addUser: (user: Omit<User, 'id'>) => Promise<User>;
    updateUser: (id: string, user: Partial<User>) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;
    addRole: (role: Omit<Role, 'id'>) => Promise<Role>;
    updateRole: (id: string, role: Partial<Role>) => Promise<void>;
    deleteRole: (id: string) => Promise<void>;
}

const IAMContext = createContext<IAMContextType | undefined>(undefined);

const STORAGE_KEY_USERS = 'qualitas_iam_users';
const STORAGE_KEY_ROLES = 'qualitas_iam_roles';

const defaultUsers: User[] = [
    { id: '1', name: 'Administrator', email: 'admin@example.com', role: 'admin', status: 'active', createdAt: '2024-01-01' },
    { id: '2', name: 'John Doe', email: 'john@example.com', role: 'user', status: 'active', createdAt: '2024-01-15' },
];

const defaultRoles: Role[] = [
    { id: '1', name: 'admin', description: '系統管理員，擁有所有權限', permissions: ['read', 'write', 'delete', 'manage_users', 'manage_roles'] },
    { id: '2', name: 'user', description: '一般使用者，擁有基本權限', permissions: ['read', 'write'] },
    { id: '3', name: 'viewer', description: '檢視者，僅有讀取權限', permissions: ['read'] },
    { id: '4', name: 'Quality Manager', description: '品質管理員，擁有所有權限', permissions: ['read', 'write', 'delete', 'manage_users', 'manage_roles'] },
];

const loadUsersFromStorage = (): User[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_USERS);
        if (raw) {
            const parsed = JSON.parse(raw) as User[];
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (_) { }
    return defaultUsers;
};

const loadRolesFromStorage = (): Role[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_ROLES);
        if (raw) {
            const parsed = JSON.parse(raw) as Role[];
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (_) { }
    return defaultRoles;
};

const saveUsersToStorage = (users: User[]) => {
    try {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } catch (_) { }
};

const saveRolesToStorage = (roles: Role[]) => {
    try {
        localStorage.setItem(STORAGE_KEY_ROLES, JSON.stringify(roles));
    } catch (_) { }
};

export const IAMProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { handleError } = useErrorHandler();

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [usersRes, rolesRes] = await Promise.all([
                api.get('/iam/users/'),
                api.get('/iam/roles/'),
            ]);
            setUsers(usersRes.data || []);
            setRoles(rolesRes.data || []);
        } catch (err: any) {
            console.warn('IAM API not available, using localStorage fallback');
            setUsers(loadUsersFromStorage());
            setRoles(loadRolesFromStorage());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // 同步到 localStorage
    useEffect(() => {
        if (!loading && users.length > 0) {
            saveUsersToStorage(users);
        }
    }, [users, loading]);

    useEffect(() => {
        if (!loading && roles.length > 0) {
            saveRolesToStorage(roles);
        }
    }, [roles, loading]);

    // User CRUD
    const addUser = useCallback(async (user: Omit<User, 'id'>): Promise<User> => {
        try {
            const response = await api.post('/iam/users/', user);
            const newUser = response.data;
            setUsers(prev => [...prev, newUser]);
            return newUser;
        } catch (err: any) {
            const newUser: User = {
                ...user,
                id: String(Date.now()),
            };
            setUsers(prev => [...prev, newUser]);
            return newUser;
        }
    }, []);

    const updateUser = useCallback(async (id: string, updates: Partial<User>) => {
        try {
            const response = await api.put(`/iam/users/${id}`, updates);
            setUsers(prev => prev.map(u => (u.id === id ? response.data : u)));
        } catch (err: any) {
            setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...updates } : u)));
        }
    }, []);

    const deleteUser = useCallback(async (id: string) => {
        try {
            await api.delete(`/iam/users/${id}`);
            setUsers(prev => prev.filter(u => u.id !== id));
        } catch (err: any) {
            setUsers(prev => prev.filter(u => u.id !== id));
        }
    }, []);

    // Role CRUD
    const addRole = useCallback(async (role: Omit<Role, 'id'>): Promise<Role> => {
        try {
            const response = await api.post('/iam/roles/', role);
            const newRole = response.data;
            setRoles(prev => [...prev, newRole]);
            return newRole;
        } catch (err: any) {
            const newRole: Role = {
                ...role,
                id: String(Date.now()),
            };
            setRoles(prev => [...prev, newRole]);
            return newRole;
        }
    }, []);

    const updateRole = useCallback(async (id: string, updates: Partial<Role>) => {
        try {
            const response = await api.put(`/iam/roles/${id}`, updates);
            setRoles(prev => prev.map(r => (r.id === id ? response.data : r)));
        } catch (err: any) {
            setRoles(prev => prev.map(r => (r.id === id ? { ...r, ...updates } : r)));
        }
    }, []);

    const deleteRole = useCallback(async (id: string) => {
        try {
            await api.delete(`/iam/roles/${id}`);
            setRoles(prev => prev.filter(r => r.id !== id));
        } catch (err: any) {
            setRoles(prev => prev.filter(r => r.id !== id));
        }
    }, []);

    const value = useMemo(
        () => ({ users, roles, loading, error, refetch: fetchData, addUser, updateUser, deleteUser, addRole, updateRole, deleteRole }),
        [users, roles, loading, error, fetchData, addUser, updateUser, deleteUser, addRole, updateRole, deleteRole]
    );

    return (
        <IAMContext.Provider value={value}>
            {children}
        </IAMContext.Provider>
    );
};

export const useIAM = () => {
    const context = useContext(IAMContext);
    if (context === undefined) {
        throw new Error('useIAM must be used within an IAMProvider');
    }
    return context;
};

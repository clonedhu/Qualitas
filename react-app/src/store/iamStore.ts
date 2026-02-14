import { create } from 'zustand';
import api from '../services/api';

export interface Permission {
    id: number;
    code: string;
    description: string;
}

export interface Role {
    id: string; // UI uses string for ID consistency with other modules
    name: string;
    description: string;
    permissions: string[];
}

export interface User {
    id: string;
    name: string;
    email: string;
    full_name: string;
    is_active: boolean;
    role: string;
    status: 'active' | 'inactive';
    created_at: string;
    role_id: number;
}

interface IAMState {
    users: User[];
    roles: Role[];
    permissions: Permission[];
    loading: boolean;
    error: string | null;

    // Actions
    fetchUsers: () => Promise<void>;
    fetchRoles: () => Promise<void>;
    fetchPermissions: () => Promise<void>;

    createUser: (user: any) => Promise<void>;
    updateUser: (id: number, user: any) => Promise<void>;
    deleteUser: (id: number, reason?: string) => Promise<void>;

    createRole: (role: any) => Promise<void>;
    updateRole: (id: number, role: any) => Promise<void>;
    deleteRole: (id: number, reason?: string) => Promise<void>;

    clearError: () => void;
}

export const useIAMStore = create<IAMState>((set, get) => ({
    users: [],
    roles: [],
    permissions: [],
    loading: false,
    error: null,

    clearError: () => set({ error: null }),

    fetchUsers: async () => {
        set({ loading: true, error: null });
        try {
            const response = await api.get('/iam/users/');
            const mappedUsers = (response.data || []).map((u: any) => ({
                id: (u.id || '').toString(),
                name: u.username || '',
                email: u.email || '',
                full_name: u.full_name || '',
                role: u.role_name || 'user',
                status: u.is_active ? 'active' : 'inactive',
                is_active: !!u.is_active,
                created_at: u.created_at || '',
                role_id: u.role_id || 0
            }));
            set({ users: mappedUsers, loading: false });
        } catch (err: any) {
            set({ error: err.response?.data?.detail || err.message || 'Failed to fetch users', loading: false });
        }
    },

    fetchRoles: async () => {
        set({ loading: true, error: null });
        try {
            const response = await api.get('/iam/roles/');
            const mappedRoles = (response.data || []).map((r: any) => ({
                id: (r.id || '').toString(),
                name: r.name || '',
                description: r.description || '',
                permissions: r.permissions || []
            }));
            set({ roles: mappedRoles, loading: false });
        } catch (err: any) {
            set({ error: err.response?.data?.detail || err.message || 'Failed to fetch roles', loading: false });
        }
    },

    fetchPermissions: async () => {
        set({ loading: true, error: null });
        try {
            const response = await api.get('/iam/permissions/');
            set({ permissions: response.data || [], loading: false });
        } catch (err: any) {
            set({ error: err.response?.data?.detail || err.message || 'Failed to fetch permissions', loading: false });
        }
    },

    createUser: async (user) => {
        set({ loading: true, error: null });
        try {
            const payload = {
                username: user.name,
                email: user.email,
                full_name: user.full_name,
                role_id: user.role_id,
                is_active: user.status === 'active',
                password: user.password,
                reason: user.reason
            };
            await api.post('/iam/users/', payload);
            await get().fetchUsers();
        } catch (err: any) {
            set({ error: err.response?.data?.detail || err.message || 'Failed to create user', loading: false });
            throw err;
        }
    },

    updateUser: async (id, user) => {
        set({ loading: true, error: null });
        try {
            const payload = {
                username: user.name,
                email: user.email,
                full_name: user.full_name,
                role_id: user.role_id,
                is_active: user.status === 'active',
                password: user.password || undefined,
                reason: user.reason
            };
            await api.put(`/iam/users/${id}/`, payload);
            await get().fetchUsers();
        } catch (err: any) {
            set({ error: err.response?.data?.detail || err.message || 'Failed to update user', loading: false });
            throw err;
        }
    },

    deleteUser: async (id, reason) => {
        set({ loading: true, error: null });
        try {
            await api.delete(`/iam/users/${id}/`, { params: { reason } });
            await get().fetchUsers();
        } catch (err: any) {
            set({ error: err.response?.data?.detail || err.message || 'Failed to delete user', loading: false });
            throw err;
        }
    },

    createRole: async (role) => {
        set({ loading: true, error: null });
        try {
            await api.post('/iam/roles/', role);
            await get().fetchRoles();
        } catch (err: any) {
            set({ error: err.response?.data?.detail || err.message || 'Failed to create role', loading: false });
            throw err;
        }
    },

    updateRole: async (id, role) => {
        set({ loading: true, error: null });
        try {
            await api.put(`/iam/roles/${id}/`, role);
            await get().fetchRoles();
        } catch (err: any) {
            set({ error: err.response?.data?.detail || err.message || 'Failed to update role', loading: false });
            throw err;
        }
    },

    deleteRole: async (id, reason) => {
        set({ loading: true, error: null });
        try {
            await api.delete(`/iam/roles/${id}/`, { params: { reason } });
            await get().fetchRoles();
        } catch (err: any) {
            set({ error: err.response?.data?.detail || err.message || 'Failed to delete role', loading: false });
            throw err;
        }
    },
}));

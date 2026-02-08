import axios from 'axios';

const baseURL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Don't override Content-Type if it's already set
    if (!config.headers['Content-Type'] && !config.headers['content-type']) {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface NamingRuleApi {
  id: number;
  doc_type: string;
  prefix: string;
  sequence_digits: number;
}

export const getNamingRules = async (): Promise<NamingRuleApi[]> => {
  const res = await api.get<NamingRuleApi[]>('/settings/naming-rules');
  return res.data;
};

export interface NamingRuleUpdatePayload {
  doc_type: string;
  prefix: string;
  sequence_digits: number;
}

export const updateNamingRules = async (
  rules: NamingRuleUpdatePayload[]
): Promise<NamingRuleApi[]> => {
  const response = await api.put<NamingRuleApi[]>('/settings/naming-rules', rules);
  return response.data;
};

// --- Contractors API ---

export interface Contractor {
  id: string;
  name: string;
  package: string;
  abbreviation: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  scope: string;
  status: 'Active' | 'Inactive' | 'active' | 'inactive';
}

export interface CreateContractorPayload {
  name: string;
  package: string;
  abbreviation: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  scope: string;
  status: 'Active' | 'Inactive';
}

export interface UpdateContractorPayload extends Partial<CreateContractorPayload> { }

export const getContractors = async (): Promise<Contractor[]> => {
  const response = await api.get<Contractor[]>('/contractors');
  return response.data;
};

export const createContractor = async (
  data: CreateContractorPayload
): Promise<Contractor> => {
  const response = await api.post<Contractor>('/contractors', data);
  return response.data;
};

export const updateContractor = async (
  id: string,
  data: UpdateContractorPayload
): Promise<Contractor> => {
  const response = await api.put<Contractor>(`/contractors/${id}`, data);
  return response.data;
};

export const deleteContractor = async (id: string): Promise<void> => {
  await api.delete(`/contractors/${id}`);
};

// --- IAM API (Users & Roles) ---

export interface User {
  id: number;
  username: string;
  email: string;
  role_id: number;
  role_name?: string;
  is_active: boolean;
  full_name?: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: string[]; // List of permission codes
}

export interface Permission {
  id: number;
  code: string;
  name: string;
  description?: string;
  module: string;
}

export const getUsers = async (): Promise<User[]> => {
  const response = await api.get<User[]>('/users');
  return response.data;
};

export const getRoles = async (): Promise<Role[]> => {
  const response = await api.get<Role[]>('/roles');
  return response.data;
};

export const getPermissions = async (): Promise<Permission[]> => {
  const response = await api.get<Permission[]>('/permissions');
  return response.data;
};

// ... (previous code)

export interface CreateUserPayload {
  username: string;
  email: string;
  password?: string; // Optional for now, or handle default
  role_id: number;
  is_active: boolean;
}

export interface UpdateUserPayload extends Partial<CreateUserPayload> { }

export const createUser = async (data: CreateUserPayload): Promise<User> => {
  const response = await api.post<User>('/users', data);
  return response.data;
};

export const updateUser = async (id: number, data: UpdateUserPayload): Promise<User> => {
  const response = await api.put<User>(`/users/${id}`, data);
  return response.data;
};

export interface CreateRolePayload {
  name: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRolePayload extends Partial<CreateRolePayload> { }

export const createRole = async (data: CreateRolePayload): Promise<Role> => {
  const response = await api.post<Role>('/roles', data);
  return response.data;
};

export const updateRole = async (id: number, data: UpdateRolePayload): Promise<Role> => {
  const response = await api.put<Role>(`/roles/${id}`, data);
  return response.data;
};

export const deleteUser = async (id: number): Promise<void> => {
  await api.delete(`/users/${id}`);
};

export const deleteRole = async (id: number): Promise<void> => {
  await api.delete(`/roles/${id}`);
};

export default api;

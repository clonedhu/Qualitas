import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, ReactNode } from 'react';
import api from '../services/api';
import { useErrorHandler } from '../hooks/useErrorHandler';

export interface AuditItem {
    id: string;
    auditNo: string;
    title: string;
    date: string;
    auditor: string;
    status: string;
    location: string;
    findings: string;
    contractor?: string;
}

interface AuditContextType {
    auditList: AuditItem[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    addAudit: (audit: Omit<AuditItem, 'id'>) => Promise<AuditItem>;
    updateAudit: (id: string, audit: Partial<AuditItem>) => Promise<void>;
    deleteAudit: (id: string) => Promise<void>;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

// 暫時使用 localStorage 作為後端 API 不存在時的備用方案
const STORAGE_KEY = 'qualitas_audit_list';

const loadFromStorage = (): AuditItem[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as AuditItem[];
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (_) { }
    return [{
        id: '1',
        auditNo: 'AUD-2026-001',
        title: 'Internal Quality Audit Q1',
        date: '2026-03-15',
        auditor: 'John Doe',
        status: 'Planned',
        location: 'Site Office',
        findings: '',
        contractor: 'Sample Contractor',
    }];
};

const saveToStorage = (list: AuditItem[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (_) { }
};

export const AuditProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [auditList, setAuditList] = useState<AuditItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { handleError } = useErrorHandler();

    const fetchAudits = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // 嘗試從 API 獲取資料
            const response = await api.get('/audit/');
            setAuditList(response.data || []);
        } catch (err: any) {
            // 如果 API 不存在（404）或其他錯誤，使用 localStorage
            console.warn('Audit API not available, using localStorage fallback');
            setAuditList(loadFromStorage());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAudits();
    }, [fetchAudits]);

    // 當清單變更時，同步到 localStorage（作為備用）
    useEffect(() => {
        if (!loading && auditList.length > 0) {
            saveToStorage(auditList);
        }
    }, [auditList, loading]);

    const addAudit = useCallback(async (audit: Omit<AuditItem, 'id'>): Promise<AuditItem> => {
        try {
            const response = await api.post('/audit/', audit);
            const newAudit = response.data;
            setAuditList(prev => [...prev, newAudit]);
            return newAudit;
        } catch (err: any) {
            // API 失敗時使用本地儲存
            const newAudit: AuditItem = {
                ...audit,
                id: String(Date.now()),
                auditNo: audit.auditNo || `AUD-${new Date().getFullYear()}-${String(auditList.length + 1).padStart(3, '0')}`,
            };
            setAuditList(prev => [...prev, newAudit]);
            return newAudit;
        }
    }, [auditList.length]);

    const updateAudit = useCallback(async (id: string, updates: Partial<AuditItem>) => {
        try {
            const response = await api.put(`/audit/${id}`, updates);
            setAuditList(prev => prev.map(a => (a.id === id ? response.data : a)));
        } catch (err: any) {
            // API 失敗時使用本地更新
            setAuditList(prev => prev.map(a => (a.id === id ? { ...a, ...updates } : a)));
        }
    }, []);

    const deleteAudit = useCallback(async (id: string) => {
        try {
            await api.delete(`/audit/${id}`);
            setAuditList(prev => prev.filter(a => a.id !== id));
        } catch (err: any) {
            // API 失敗時使用本地刪除
            setAuditList(prev => prev.filter(a => a.id !== id));
        }
    }, []);

    const value = useMemo(
        () => ({ auditList, loading, error, refetch: fetchAudits, addAudit, updateAudit, deleteAudit }),
        [auditList, loading, error, fetchAudits, addAudit, updateAudit, deleteAudit]
    );

    return (
        <AuditContext.Provider value={value}>
            {children}
        </AuditContext.Provider>
    );
};

export const useAudit = () => {
    const context = useContext(AuditContext);
    if (context === undefined) {
        throw new Error('useAudit must be used within an AuditProvider');
    }
    return context;
};

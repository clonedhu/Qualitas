import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { useErrorHandler } from '../hooks/useErrorHandler';

export interface PQPItem {
  id: string;
  pqpNo: string;
  title: string;
  description: string;
  vendor: string;
  status: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  attachments?: string[];
  dueDate?: string;
}

interface PQPContextType {
  pqpList: PQPItem[];
  error: string | null;
  addPQP: (pqp: Omit<PQPItem, 'id'>) => Promise<PQPItem>;
  updatePQP: (id: string, pqp: Partial<PQPItem>) => Promise<void>;
  deletePQP: (id: string) => Promise<void>;
  getPQPList: () => PQPItem[];
  getPQPByVendor: (vendor: string) => PQPItem[];
}

const PQPContext = createContext<PQPContextType | undefined>(undefined);

export const PQPProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pqpList, setPqpList] = useState<PQPItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { handleError } = useErrorHandler();

  useEffect(() => {
    const fetchPQPs = async () => {
      try {
        const response = await api.get('/pqp/');
        setPqpList(response.data || []);
      } catch (err) {
        const msg = handleError(err, 'Failed to fetch PQPs');
        setError(msg);
      }
    };
    fetchPQPs();
  }, [handleError]);

  const addPQP = async (pqp: Omit<PQPItem, 'id'>): Promise<PQPItem> => {
    try {
      const response = await api.post('/pqp/', pqp);
      const newPQP = response.data;
      setPqpList(prev => [...prev, newPQP]);
      return newPQP;
    } catch (error) {
      handleError(error, 'Failed to add PQP');
      throw error;
    }
  };

  const updatePQP = async (id: string, updates: Partial<PQPItem>) => {
    try {
      const response = await api.put(`/pqp/${id}`, updates);
      setPqpList(prev => prev.map(p => (p.id === id ? response.data : p)));
    } catch (error) {
      handleError(error, 'Failed to update PQP');
      throw error;
    }
  };

  const deletePQP = async (id: string) => {
    try {
      await api.delete(`/pqp/${id}`);
      setPqpList(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      handleError(error, 'Failed to delete PQP');
      throw error;
    }
  };

  const getPQPList = () => pqpList;
  const getPQPByVendor = (vendor: string) => pqpList.filter(pqp => pqp.vendor === vendor);

  const value = useMemo(
    () => ({ pqpList, error, addPQP, updatePQP, deletePQP, getPQPList, getPQPByVendor }),
    [pqpList, error]
  );

  return (
    <PQPContext.Provider value={value}>
      {children}
    </PQPContext.Provider>
  );
};

export const usePQP = () => {
  const context = useContext(PQPContext);
  if (context === undefined) {
    throw new Error('usePQP must be used within a PQPProvider');
  }
  return context;
};

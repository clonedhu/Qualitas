import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import api from '../services/api';
import { useErrorHandler } from '../hooks/useErrorHandler';

export interface Contractor {
  id: string;
  package: string;
  name: string;
  abbreviation: string;
  scope: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  status: 'active' | 'inactive';
}

interface ContractorsContextType {
  contractors: Contractor[];
  error: string | null;
  addContractor: (contractor: Omit<Contractor, 'id'>) => Promise<void>;
  updateContractor: (id: string, contractor: Partial<Contractor>) => Promise<void>;
  deleteContractor: (id: string) => Promise<void>;
  getActiveContractors: () => Contractor[];
}

const ContractorsContext = createContext<ContractorsContextType | undefined>(undefined);

export const ContractorsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { handleError } = useErrorHandler();

  useEffect(() => {
    const fetchContractors = async () => {
      try {
        const response = await api.get('/contractors/');
        setContractors(response.data || []);
      } catch (err) {
        const msg = handleError(err, 'Failed to fetch contractors');
        setError(msg);
      }
    };
    fetchContractors();
  }, [handleError]);

  const addContractor = async (contractor: Omit<Contractor, 'id'>) => {
    try {
      const response = await api.post('/contractors/', contractor);
      setContractors(prev => [...prev, response.data]);
    } catch (error) {
      handleError(error, 'Failed to add contractor');
      throw error;
    }
  };

  const updateContractor = async (id: string, updates: Partial<Contractor>) => {
    try {
      const response = await api.put(`/contractors/${id}`, updates);
      setContractors(prev => prev.map(c => (c.id === id ? response.data : c)));
    } catch (error) {
      handleError(error, 'Failed to update contractor');
      throw error;
    }
  };

  const deleteContractor = async (id: string) => {
    try {
      await api.delete(`/contractors/${id}`);
      setContractors(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      handleError(error, 'Failed to delete contractor');
      throw error;
    }
  };

  const getActiveContractors = () => contractors.filter(c => c.status === 'active');

  const value = useMemo(
    () => ({ contractors, error, addContractor, updateContractor, deleteContractor, getActiveContractors }),
    [contractors, error]
  );

  return (
    <ContractorsContext.Provider value={value}>
      {children}
    </ContractorsContext.Provider>
  );
};

export const useContractors = () => {
  const context = useContext(ContractorsContext);
  if (context === undefined) {
    throw new Error('useContractors must be used within a ContractorsProvider');
  }
  return context;
};

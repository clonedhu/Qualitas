import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContractors } from '../../context/ContractorsContext';
import { usePQP, PQPItem } from '../../context/PQPContext';
import { useLanguage } from '../../context/LanguageContext';
import ConfirmModal from '../Shared/ConfirmModal';
import styles from './PQP.module.css';
import { DataTable } from '@/components/Shared/DataTable/DataTable';
import { createColumns } from './columns';
import { PQPDetailModal, PQPDetailsViewModal } from './PQPModals';
import { BackButton } from '@/components/ui/BackButton';

type SortKey = keyof PQPItem;
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const getLocalizedStatus = (status: string, t: (key: string) => string) => {
  const s = (status || '').toLowerCase();
  if (s === 'approved') return t('pqp.status.approved');
  if (s === 'reject') return t('pqp.status.reject');
  if (s === 'not submit') return t('pqp.status.notSubmit');
  if (s === 'under review') return t('pqp.status.underReview');
  return status;
};

const PQP: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { getActiveContractors } = useContractors();
  const { pqpList, addPQP, updatePQP, deletePQP } = usePQP();


  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [currentPqpId, setCurrentPqpId] = useState<string | null>(null);
  const [viewingPqpId, setViewingPqpId] = useState<string | null>(null);

  // Delete Confirmation State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });

  // Filter by Date Range and Global Search
  const filteredList = useMemo(() => {
    let result = [...pqpList];


    // Global Search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(item =>
        (item.pqpNo && item.pqpNo.toLowerCase().includes(lowerQuery)) ||
        (item.title && item.title.toLowerCase().includes(lowerQuery)) ||
        (item.vendor && item.vendor.toLowerCase().includes(lowerQuery)) ||
        (item.status && item.status.toLowerCase().includes(lowerQuery))
      );
    }

    return result;
  }, [pqpList, searchQuery]);

  const statistics = useMemo(() => {
    const statusCounts = {
      approved: 0,
      reject: 0,
    };

    pqpList.forEach((item) => {
      const status = (item.status || 'Approved').toLowerCase();
      if (status === 'approved') {
        statusCounts.approved++;
      } else if (status === 'reject') {
        statusCounts.reject++;
      }
    });

    const total = pqpList.length;
    const activeRate = total > 0 ? Math.round((statusCounts.approved / total) * 100) : 0;

    return {
      ...statusCounts,
      total,
      activeRate,
    };
  }, [pqpList]);

  const handleEdit = (id: string) => {
    setCurrentPqpId(id);
    setIsEditModalOpen(true);
  };

  const handleViewDetails = (id: string) => {
    setViewingPqpId(id);
    setIsDetailsModalOpen(true);
  };

  const handleAddNew = () => {
    setCurrentPqpId('new');
    setIsEditModalOpen(true);
  };

  const handleSavePQPDetails = async (updates: Partial<PQPItem>) => {
    const existingItem = currentPqpId && currentPqpId !== 'new' ? pqpList.find(item => item.id === currentPqpId) : undefined;
    const today = new Date().toISOString().split('T')[0];
    if (existingItem) {
      const merged = { ...existingItem, ...updates, updatedAt: today };
      const { id: _omit, pqpNo: _pqpNo, ...payload } = merged;  // 移除 pqpNo，不允許更新
      await updatePQP(existingItem.id, payload);
    } else {
      // pqpNo 由後端自動產生，不需要前端送
      await addPQP({
        title: updates.title || '',
        description: updates.description || '',
        vendor: updates.vendor || '',
        status: updates.status || 'Approved',
        version: updates.version || 'Rev1.0',
        createdAt: today,
        updatedAt: today,
        attachments: updates.attachments || [],
      } as Omit<PQPItem, 'id'>);
    }
  };

  const confirmDelete = (id: string) => {
    setDeleteModal({ isOpen: true, id });
  };

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await deletePQP(deleteModal.id);
      setDeleteModal({ isOpen: false, id: null });
    } catch (err) {
      console.error('Delete PQP failed:', err);
      alert((err as Error)?.message || t('common.deleteFailed'));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <BackButton />
          <h1>{t('pqp.title') || t('pqp.titleShort')}</h1>
        </div>
        <div className={styles.headerRight}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('pqp.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.summarySection}>
        <h2 className={styles.summaryTitle}>{t('pqp.statsTitle')}</h2>
        <div className={styles.statsContainer}>
          <div className={styles.statusStatsGrid}>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.blueIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>{t('pqp.status.approved')}</div>
                <div className={styles.statValue}>{statistics.approved}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.orangeIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>{t('pqp.status.reject')}</div>
                <div className={styles.statValue}>{statistics.reject}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.grayIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M18 17V9M12 17V5M6 17v-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>{t('pqp.statTotal') || 'Total'}</div>
                <div className={styles.statValue}>{statistics.total}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.blueIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>{t('pqp.activeRate')}</div>
                <div className={styles.statValue}>{statistics.approved} ({statistics.activeRate}%)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <DataTable
          title={t('pqp.title')}
          actions={
            <button
              type="button"
              className={styles.addNewButton}
              onClick={handleAddNew}
            >
              {t('pqp.addNew')}
            </button>
          }
          columns={createColumns(handleEdit, handleViewDetails, confirmDelete, t, getActiveContractors)}
          data={filteredList}
          searchKey=""
          searchPlaceholder={t('pqp.searchPlaceholder')}
          getRowClassName={(row) =>
            (row.status || 'Approved').toLowerCase() === 'reject'
              ? 'bg-emerald-100/50 text-gray-500 hover:bg-emerald-200/50'
              : ''
          }
        />
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={t('common.confirmDelete')}
        message={t('pqp.confirmDeleteMessage') || t('common.confirmDelete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
      />

      {
        isEditModalOpen && currentPqpId && (
          <PQPDetailModal
            pqpId={currentPqpId}
            existingItem={currentPqpId !== 'new' ? pqpList.find(item => item.id === currentPqpId) : undefined}
            onSave={handleSavePQPDetails}
            onClose={() => {
              setIsEditModalOpen(false);
              setCurrentPqpId(null);
            }}
          />
        )
      }

      {
        isDetailsModalOpen && viewingPqpId && (
          <PQPDetailsViewModal
            pqpId={viewingPqpId}
            pqpItem={pqpList.find(item => item.id === viewingPqpId)}
            onClose={() => {
              setIsDetailsModalOpen(false);
              setViewingPqpId(null);
            }}
          />
        )
      }
    </div >
  );
};

export default PQP;


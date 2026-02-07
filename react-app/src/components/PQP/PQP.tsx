import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContractors } from '../../context/ContractorsContext';
import { usePQP } from '../../context/PQPContext';
import { useLanguage } from '../../context/LanguageContext';
import ConfirmModal from '../Shared/ConfirmModal';
import styles from './PQP.module.css';
import { DataTable } from '@/components/Shared/DataTable/DataTable';
import { createColumns } from './columns';

interface PQPItem {
  id: string;
  pqpNo: string;
  title: string;
  description: string;
  vendor: string;
  status: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

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
      alert((err as Error)?.message || '刪除失敗，請稍後再試');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button type="button" className={styles.backButton} onClick={() => navigate('/')}>
            ← {t('common.back') || 'Back'}
          </button>
          <h1>{t('pqp.titleShort')}</h1>
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
              + {t('pqp.addNew')}
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

interface PQPDetailModalProps {
  pqpId: string;
  existingItem?: PQPItem;
  onSave: (updates: Partial<PQPItem>) => void | Promise<void>;
  onClose: () => void;
}

const PQPDetailModal: React.FC<PQPDetailModalProps> = ({ pqpId, existingItem, onSave, onClose }) => {
  const { t } = useLanguage();
  const { getActiveContractors } = useContractors();
  const VERSION_OPTIONS = ['Rev1.0', 'Rev2.0', 'Rev3.0', 'Rev4.0'];
  const [formData, setFormData] = useState<Partial<PQPItem>>({
    pqpNo: existingItem?.pqpNo || '',
    title: existingItem?.title || '',
    description: existingItem?.description || '',
    vendor: existingItem?.vendor || '',
    status: existingItem?.status || 'Approved',
    // 將舊資料的 "V1.0" 正規化為 "Rev1.0"
    version: existingItem
      ? (existingItem.version === 'V1.0' ? 'Rev1.0' : existingItem.version)
      : 'Rev1.0',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [versionMode, setVersionMode] = useState<'select' | 'custom'>(() => {
    let currentVersion = existingItem?.version;
    if (currentVersion === 'V1.0') {
      currentVersion = 'Rev1.0';
    }
    if (currentVersion && !VERSION_OPTIONS.includes(currentVersion)) {
      return 'custom';
    }
    return 'select';
  });

  const handleFieldChange = (field: keyof PQPItem, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleDateButton = (field: keyof PQPItem) => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}_`;
    setFormData(prev => ({
      ...prev,
      [field]: prev[field] ? `${prev[field]}\n${dateStr}` : dateStr
    }));
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.title?.trim()) newErrors.title = t('pqp.titleRequired');
    if (!formData.vendor) newErrors.vendor = t('pqp.vendorRequired');
    if (!formData.version?.trim()) {
      newErrors.version = t('pqp.versionRequired');
    } else if (versionMode === 'custom') {
      // 防呆：必須是 Rev5.0 以上，例如 "Rev5.0", "Rev6.0"
      const match = /^Rev(\d+)(\.\d+)?$/.exec(formData.version.trim());
      if (!match) {
        newErrors.version = t('pqp.revFormatError');
      } else {
        const major = parseInt(match[1], 10);
        if (isNaN(major) || major < 5) {
          newErrors.version = t('pqp.revMinError');
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaveError('');
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setSaveError((err as Error)?.message || t('pqp.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{existingItem ? t('pqp.editTitle') : t('pqp.addTitle')}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.formRequiredHint}>{t('form.requiredHint')}</p>
          <div className={styles.formSections}>
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('pqp.infoSection')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('pqp.referenceNo')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.pqpNo || t('form.autoGenerated')}
                    readOnly
                    style={{ backgroundColor: '#D9D9D9', cursor: 'not-allowed', color: formData.pqpNo ? '#000000' : '#666666' }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.requiredLabel}>{t('pqp.subject')}</label>
                  <input
                    type="text"
                    className={`${styles.formInput} ${errors.title ? styles.errorInput : ''}`}
                    value={formData.title || ''}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                  />
                  {errors.title && <span className={styles.errorMessage}>{errors.title}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.requiredLabel}>{t('pqp.contractor')}</label>
                  <select
                    className={`${styles.formSelect} ${errors.vendor ? styles.errorInput : ''}`}
                    value={formData.vendor || ''}
                    onChange={(e) => handleFieldChange('vendor', e.target.value)}
                  >
                    <option value="">{t('common.selectContractor') || 'Select Contractor'}</option>
                    {getActiveContractors().map((contractor) => (
                      <option key={contractor.id} value={contractor.name}>
                        {contractor.name}
                      </option>
                    ))}
                  </select>
                  {errors.vendor && <span className={styles.errorMessage}>{errors.vendor}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.requiredLabel}>{t('pqp.version')}</label>
                  {versionMode === 'select' && (
                    <select
                      className={`${styles.formSelect} ${errors.version ? styles.errorInput : ''}`}
                      value={
                        VERSION_OPTIONS.includes(formData.version || '')
                          ? formData.version
                          : 'Rev1.0'
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'custom') {
                          setVersionMode('custom');
                          handleFieldChange('version', '');
                        } else {
                          setVersionMode('select');
                          handleFieldChange('version', value);
                        }
                      }}
                    >
                      {VERSION_OPTIONS.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                      <option value="custom">{t('pqp.revSelectCustom')}</option>
                    </select>
                  )}
                  {versionMode === 'custom' && (
                    <input
                      type="text"
                      className={`${styles.formInput} ${errors.version ? styles.errorInput : ''}`}
                      value={formData.version || ''}
                      onChange={(e) => handleFieldChange('version', e.target.value)}
                      placeholder={t('pqp.revPlaceholder')}
                    />
                  )}
                  {errors.version && <span className={styles.errorMessage}>{errors.version}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label>{t('common.status')}</label>
                  <select
                    className={styles.formSelect}
                    value={formData.status || 'Approved'}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                  >
                    <option value="Not Submit">{t('pqp.status.notSubmit')}</option>
                    <option value="Under Review">{t('pqp.status.underReview')}</option>
                    <option value="Approved">{t('pqp.status.approved')}</option>
                    <option value="Reject">{t('pqp.status.reject')}</option>
                  </select>
                </div>
                <div className={styles.formGroupFull}>
                  <div className={styles.labelWithButton}>
                    <label>{t('pqp.remark')}</label>
                    <button
                      type="button"
                      className={styles.tbcButton}
                      onClick={() => handleDateButton('description')}
                    >
                      {t('pqp.addDate')}
                    </button>
                  </div>
                  <textarea
                    className={styles.formTextarea}
                    value={formData.description || ''}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        {saveError && <p className={styles.saveError}>{saveError}</p>}
        <div className={styles.modalActions}>
          <button type="button" className={styles.saveButton} onClick={handleSave} disabled={saving}>
            {saving ? t('pqp.saving') : t('common.save')}
          </button>
          <button type="button" className={styles.cancelButton} onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

interface PQPDetailsViewModalProps {
  pqpId: string;
  pqpItem?: PQPItem;
  onClose: () => void;
}

const PQPDetailsViewModal: React.FC<PQPDetailsViewModalProps> = ({ pqpId, pqpItem, onClose }) => {
  const { t } = useLanguage();
  const handlePrint = () => {
    window.print();
  };

  if (!pqpItem) {
    return null;
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{t('pqp.detail.title')}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formSections}>
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('pqp.infoSection')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('pqp.referenceNo')}</label>
                  <div className={styles.readOnlyField}>{pqpItem.pqpNo || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('pqp.subject')}</label>
                  <div className={styles.readOnlyField}>{pqpItem.title || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('common.status')}</label>
                  <div className={styles.readOnlyField}>{getLocalizedStatus(pqpItem.status, t) || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('pqp.contractor')}</label>
                  <div className={styles.readOnlyField}>{pqpItem.vendor || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('pqp.version')}</label>
                  <div className={styles.readOnlyField}>{pqpItem.version || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('pqp.createdDate')}</label>
                  <div className={styles.readOnlyField}>{pqpItem.createdAt || '-'}</div>
                </div>
                {pqpItem.updatedAt && (
                  <div className={styles.formGroup}>
                    <label>{t('pqp.updatedDate')}</label>
                    <div className={styles.readOnlyField}>{pqpItem.updatedAt}</div>
                  </div>
                )}
                <div className={styles.formGroupFull}>
                  <label>{t('pqp.remark')}</label>
                  <div className={styles.readOnlyField}>{pqpItem.description || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.printButton} onClick={handlePrint}>
            {t('common.print') || 'Print'}
          </button>
          <button className={styles.cancelButton} onClick={onClose}>
            {t('common.close') || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PQP;

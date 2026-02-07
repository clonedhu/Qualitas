import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useContractors } from '../../context/ContractorsContext';
import { useOBS } from '../../context/OBSContext';
import type { OBSItem as ContextOBSItem } from '../../context/OBSContext';
import styles from './OBS.module.css';
import ConfirmModal from '../Shared/ConfirmModal';

interface OBSItem {
  id: string;
  vendor: string;
  documentNumber: string;
  description: string;
  rev: string;
  submit: string;
  status: string;
  remark: string;
  hasDetails?: boolean;
  // Additional fields from modal
  raiseDate?: string;
  closeoutDate?: string;
  aconex?: string;
  type?: string;
  subject?: string;
  foundBy?: string;
  raisedBy?: string;
  foundLocation?: string;
  productDisposition?: string;
  productIntegrityRelated?: string;
  permanentProductDeviation?: string;
  impactToOM?: string;
  defectPhotos?: string[];
  improvementPhotos?: string[];
  attachments?: string[];
}

type SortKey = keyof OBSItem;
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const OBS: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { getActiveContractors } = useContractors();
  const { obsList, loading, error, addOBS, updateOBS, deleteOBS } = useOBS();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // Sort State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'documentNumber', direction: 'asc' });

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [currentObsId, setCurrentObsId] = useState<string | null>(null);
  const [viewingObsId, setViewingObsId] = useState<string | null>(null);

  // Delete Confirmation State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; message: string }>({
    isOpen: false,
    id: null,
    message: '',
  });

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const filteredObsList = useMemo(() => {
    let filtered = [...obsList];

    // Filter by Vendor
    if (vendorFilter !== 'all') {
      filtered = filtered.filter(item => item.vendor === vendorFilter);
    }

    // Filter by Status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => (item.status || 'Open') === statusFilter);
    }

    // Filter by Date (Raise Date)
    if (dateFilter.start) {
      filtered = filtered.filter(item => item.raiseDate ? item.raiseDate >= dateFilter.start : true);
    }
    if (dateFilter.end) {
      filtered = filtered.filter(item => item.raiseDate ? item.raiseDate <= dateFilter.end : true);
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        (item.vendor || '').toLowerCase().includes(query) ||
        (item.documentNumber || '').toLowerCase().includes(query) ||
        (item.description || '').toLowerCase().includes(query) ||
        (item.subject || '').toLowerCase().includes(query) ||
        (item.status || '').toLowerCase().includes(query) ||
        (item.type || '').toLowerCase().includes(query) ||
        (item.foundBy || '').toLowerCase().includes(query) ||
        (item.raisedBy || '').toLowerCase().includes(query) ||
        (item.foundLocation || '').toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [obsList, searchQuery, vendorFilter, statusFilter, dateFilter, sortConfig]);

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <span className={styles.sortIcon}>↕</span>;
    return sortConfig.direction === 'asc' ? <span className={styles.sortIcon}>↑</span> : <span className={styles.sortIcon}>↓</span>;
  };

  const statistics = useMemo(() => {
    const statusCounts = {
      opening: 0,
      closed: 0,
    };

    obsList.forEach((item) => {
      const status = (item.status || '').toLowerCase();
      if (status === 'open') {
        statusCounts.opening++;
      } else if (status === 'closed') {
        statusCounts.closed++;
      }
    });

    const total = obsList.length;
    const openRate = total > 0 ? Math.round((statusCounts.opening / total) * 100) : 0;

    return {
      ...statusCounts,
      total,
      openRate,
    };
  }, [obsList]);

  const handleAdd = (id: string) => {
    navigate(`/obs/${id}`);
  };

  const handleViewDetails = (id: string) => {
    setViewingObsId(id);
    setIsDetailsModalOpen(true);
  };

  const handleEdit = (id: string) => {
    setCurrentObsId(id);
    setIsEditModalOpen(true);
  };

  const handleAddNew = () => {
    setCurrentObsId('new');
    setIsEditModalOpen(true);
  };

  const handleSaveOBSDetails = async (details: OBSDetailData) => {
    if (!currentObsId) return;
    const isNew = currentObsId === 'new';
    // documentNumber 由後端自動產生，新建時不送
    const payload: Record<string, unknown> = {
      vendor: details.contractor || '',
      description: details.detailsDescription || details.subject || '',
      rev: '',
      submit: 'v',
      status: details.status || 'Open',
      remark: details.remark || '',
      hasDetails: true,
      raiseDate: details.raiseDate || undefined,
      closeoutDate: details.closeoutDate || undefined,
      aconex: details.aconex || undefined,
      type: details.type || undefined,
      subject: details.subject || undefined,
      foundBy: details.foundBy || undefined,
      raisedBy: details.raisedBy || undefined,
      foundLocation: details.foundLocation || undefined,
      productDisposition: details.productDisposition || undefined,
      defectPhotos: details.defectPhotos,
      improvementPhotos: details.improvementPhotos,
      attachments: details.attachments,
    };
    try {
      if (isNew) {
        await addOBS(payload as Omit<ContextOBSItem, 'id'>);
      } else {
        await updateOBS(currentObsId, payload);
      }
    } catch (err) {
      console.error('Failed to save OBS:', err);
    }
    setIsEditModalOpen(false);
    setCurrentObsId(null);
  };

  const confirmDelete = (id: string) => {
    setDeleteModal({
      isOpen: true,
      id,
      message: '確定要刪除此 OBS 項目嗎？',
    });
  };

  const handleDelete = async () => {
    if (deleteModal.id) {
      try {
        await deleteOBS(deleteModal.id);
      } catch (err) {
        console.error('Failed to delete OBS:', err);
      }
      setDeleteModal({ isOpen: false, id: null, message: '' });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button type="button" className={styles.backButton} onClick={() => navigate('/')}>
            ← {t('common.back') || 'Back'}
          </button>
          <h1>{t('home.obs.description') || 'OBS'}</h1>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.filterGroup}>
            <select
              className={styles.vendorFilter}
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
            >
              <option value="all">{t('obs.allContractors')}</option>
              {getActiveContractors().map((contractor) => (
                <option key={contractor.id} value={contractor.name}>
                  {contractor.name}
                </option>
              ))}
            </select>
            <select
              className={styles.statusFilter}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t('obs.allStatus')}</option>
              <option value="Open">{t('status.open')}</option>
              <option value="Closed">{t('status.closed')}</option>
            </select>
            <input
              type="date"
              className={styles.dateInput}
              value={dateFilter.start}
              onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
              placeholder={t('obs.startDatePlaceholder')}
            />
            <span style={{ color: '#6b7280' }}>-</span>
            <input
              type="date"
              className={styles.dateInput}
              value={dateFilter.end}
              onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
              placeholder={t('obs.endDatePlaceholder')}
            />
          </div>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('obs.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}
      {loading && (
        <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>{t('common.loading') || 'Loading OBS list...'}</div>
      )}

      <div className={styles.summarySection}>
        <h2 className={styles.summaryTitle}>{t('obs.statsTitle')}</h2>
        <div className={styles.statsContainer}>
          <div className={styles.statusStatsGrid}>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.blueIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>{t('obs.statOpen')}</div>
                <div className={styles.statValue}>{statistics.opening}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.greenIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>{t('obs.statClosed')}</div>
                <div className={styles.statValue}>{statistics.closed}</div>
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
                <div className={styles.statLabel}>{t('obs.statTotal')}</div>
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
                <div className={styles.statLabel}>{t('obs.statOpenRate')}</div>
                <div className={styles.statValue}>{statistics.opening} ({statistics.openRate}%)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.listHeader}>
          <h2 className={styles.listTitle}>{t('obs.listTitle')}</h2>
          <button
            className={styles.addNewButton}
            onClick={handleAddNew}
          >
            {t('obs.addNew')}
          </button>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th onClick={() => handleSort('documentNumber')} className={styles.sortableHeader}>
                <div className={styles.headerContent}>
                  {t('obs.refNo')} {renderSortIcon('documentNumber')}
                </div>
              </th>
              <th onClick={() => handleSort('status')} className={styles.sortableHeader}>
                <div className={styles.headerContent}>
                  {t('obs.status')} {renderSortIcon('status')}
                </div>
              </th>
              <th onClick={() => handleSort('vendor')} className={styles.sortableHeader}>
                <div className={styles.headerContent}>
                  {t('obs.contractor')} {renderSortIcon('vendor')}
                </div>
              </th>
              <th onClick={() => handleSort('type')} className={styles.sortableHeader}>
                <div className={styles.headerContent}>
                  {t('obs.type')} {renderSortIcon('type')}
                </div>
              </th>
              <th onClick={() => handleSort('subject')} className={styles.sortableHeader}>
                <div className={styles.headerContent}>
                  {t('obs.subject')} {renderSortIcon('subject')}
                </div>
              </th>
              <th onClick={() => handleSort('raiseDate')} className={styles.sortableHeader}>
                <div className={styles.headerContent}>
                  {t('obs.raiseDate')} {renderSortIcon('raiseDate')}
                </div>
              </th>
              <th onClick={() => handleSort('closeoutDate')} className={styles.sortableHeader}>
                <div className={styles.headerContent}>
                  {t('obs.closeoutDate')} {renderSortIcon('closeoutDate')}
                </div>
              </th>
              <th onClick={() => handleSort('foundBy')} className={styles.sortableHeader}>
                <div className={styles.headerContent}>
                  {t('obs.foundBy')} {renderSortIcon('foundBy')}
                </div>
              </th>
              <th onClick={() => handleSort('raisedBy')} className={styles.sortableHeader}>
                <div className={styles.headerContent}>
                  {t('obs.raisedBy')} {renderSortIcon('raisedBy')}
                </div>
              </th>
              <th onClick={() => handleSort('productDisposition')} className={styles.sortableHeader}>
                <div className={styles.headerContent}>
                  {t('obs.productDisposition')} {renderSortIcon('productDisposition')}
                </div>
              </th>
              <th>{t('common.operations')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredObsList.map((obs, index) => {
              // Check if each cell should be highlighted in pink individually
              const isProductDispositionPink = obs.productDisposition === 'Use As Is';

              // Check if row should be green (Status is Closed)
              const isClosedRow = (obs.status || '').toLowerCase() === 'closed';

              return (
                <tr
                  key={obs.id}
                  className={isClosedRow ? styles.greenRow : styles.normalRow}
                >
                  <td>{index + 1}</td>
                  <td><span>{obs.documentNumber}</span></td>
                  <td><span>{obs.status}</span></td>
                  <td><span>{obs.vendor}</span></td>
                  <td><span>{obs.type || '-'}</span></td>
                  <td><span>{obs.subject || obs.description || '-'}</span></td>
                  <td><span>{obs.raiseDate || '-'}</span></td>
                  <td><span>{obs.closeoutDate || '-'}</span></td>
                  <td><span>{obs.foundBy || '-'}</span></td>
                  <td><span>{obs.raisedBy || '-'}</span></td>
                  <td className={isProductDispositionPink ? styles.pinkCell : ''}>
                    <span>{obs.productDisposition || '-'}</span>
                  </td>
                  <td>
                    <div className={styles.buttonGroup}>
                      <button
                        className={`${styles.actionBtn} ${styles.editBtn}`}
                        onClick={() => handleEdit(obs.id)}
                        title="Edit"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.detailsBtn}`}
                        onClick={() => handleViewDetails(obs.id)}
                        title="Details"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => confirmDelete(obs.id)}
                        title="Delete"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={t('common.confirmDelete')}
        message={deleteModal.message}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, message: '' })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
      />

      {isEditModalOpen && currentObsId && (
        <OBSDetailModal
          obsId={currentObsId}
          existingData={undefined}
          existingItem={currentObsId === 'new' ? undefined : obsList.find(item => item.id === currentObsId)}
          onSave={handleSaveOBSDetails}
          onClose={() => {
            setIsEditModalOpen(false);
            setCurrentObsId(null);
          }}
        />
      )}

      {isDetailsModalOpen && viewingObsId && (
        <OBSDetailsViewModal
          obsId={viewingObsId}
          obsItem={obsList.find(item => item.id === viewingObsId)}
          obsDetailData={undefined}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setViewingObsId(null);
          }}
        />
      )}
    </div>
  );
};

interface OBSDetailData {
  obsNumber: string;
  status: string;
  raiseDate: string;
  closeoutDate: string;
  aconex: string;
  type: string;
  contractor: string;
  remark: string;
  subject: string;
  referenceStandards: string;
  detailsDescription: string;
  foundLocation: string;
  foundBy: string;
  raisedBy: string;
  serialNumbers: string;
  productDisposition: string;
  repairMethodStatement: string;
  immediateCorrectionAction: string;
  rootCauseAnalysis: string;
  correctiveActions: string;
  preventiveAction: string;
  finalProductIntegrityStatement: string;
  reInspectionNumber: string;
  noiNumber: string;
  projectQualityManager: string;
  defectPhotos: string[];
  improvementPhotos: string[];
  attachments: string[];
}

interface OBSDetailModalProps {
  obsId: string | null;
  existingData?: OBSDetailData;
  existingItem?: OBSItem;
  onSave: (details: OBSDetailData) => void;
  onClose: () => void;
}

const OBSDetailModal: React.FC<OBSDetailModalProps> = ({ obsId, existingData, existingItem, onSave, onClose }) => {
  const { t } = useLanguage();
  const { getActiveContractors } = useContractors();

  // Initialize form data from existing data or existing item
  const getInitialData = (): OBSDetailData => {
    if (existingData) {
      return existingData;
    }
    if (existingItem) {
      return {
        obsNumber: existingItem.documentNumber || '',
        status: existingItem.status || 'Open',
        raiseDate: existingItem.raiseDate || '',
        closeoutDate: existingItem.closeoutDate || '',
        aconex: existingItem.aconex || '',
        type: existingItem.type || '',
        contractor: existingItem.vendor || '',
        remark: existingItem.remark || '',
        subject: existingItem.subject || existingItem.description || '',
        referenceStandards: '',
        detailsDescription: existingItem.description || '',
        foundLocation: existingItem.foundLocation || '',
        foundBy: existingItem.foundBy || '',
        raisedBy: existingItem.raisedBy || '',
        serialNumbers: '',
        productDisposition: existingItem.productDisposition || '',
        repairMethodStatement: '',
        immediateCorrectionAction: '',
        rootCauseAnalysis: '',
        correctiveActions: '',
        preventiveAction: '',
        finalProductIntegrityStatement: '',
        reInspectionNumber: '',
        noiNumber: '',
        projectQualityManager: '',
        defectPhotos: existingItem.defectPhotos || [],
        improvementPhotos: existingItem.improvementPhotos || [],
        attachments: existingItem.attachments || [],
      };
    }
    return {
      obsNumber: '',
      status: 'Open',
      raiseDate: '',
      closeoutDate: '',
      aconex: '',
      type: '',
      contractor: '',
      remark: '',
      subject: '',
      referenceStandards: '',
      detailsDescription: '',
      foundLocation: '',
      foundBy: '',
      raisedBy: '',
      serialNumbers: '',
      productDisposition: '',
      repairMethodStatement: '',
      immediateCorrectionAction: '',
      rootCauseAnalysis: '',
      correctiveActions: '',
      preventiveAction: '',
      finalProductIntegrityStatement: '',
      reInspectionNumber: '',
      noiNumber: '',
      projectQualityManager: '',
      defectPhotos: [],
      improvementPhotos: [],
      attachments: [],
    };
  };

  const [formData, setFormData] = useState<OBSDetailData>(getInitialData());

  const handleFieldChange = (field: keyof OBSDetailData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNAButton = (field: keyof OBSDetailData) => {
    setFormData(prev => ({ ...prev, [field]: 'Not Applicable' }));
  };

  const handleTBCButton = (field: keyof OBSDetailData) => {
    setFormData(prev => ({ ...prev, [field]: 'To be confirmed' }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, photoType: 'defect' | 'improvement') => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);

      fileArray.forEach((file) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            if (photoType === 'defect') {
              setFormData(prev => ({
                ...prev,
                defectPhotos: [...prev.defectPhotos, result]
              }));
            } else {
              setFormData(prev => ({
                ...prev,
                improvementPhotos: [...prev.improvementPhotos, result]
              }));
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }
    // Reset input
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number, photoType: 'defect' | 'improvement') => {
    if (photoType === 'defect') {
      setFormData(prev => ({
        ...prev,
        defectPhotos: prev.defectPhotos.filter((_, i) => i !== index)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        improvementPhotos: prev.improvementPhotos.filter((_, i) => i !== index)
      }));
    }
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      fileArray.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          setFormData(prev => ({
            ...prev,
            attachments: [...prev.attachments, result]
          }));
        };
        reader.readAsDataURL(file);
      });
    }
    e.target.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{existingData || existingItem ? t('obs.editTitle') : t('obs.addTitle')}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.formRequiredHint}>{t('form.requiredHint')}</p>
          <div className={styles.formSections}>
            {/* 不符合項目資訊 */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('obs.sectionInfo')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('obs.refNo')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.obsNumber || t('form.autoGenerated')}
                    readOnly
                    style={{ backgroundColor: '#D9D9D9', cursor: 'not-allowed', color: formData.obsNumber ? '#000000' : '#666666' }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('obs.subject')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.subject}
                    onChange={(e) => handleFieldChange('subject', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('obs.status')}</label>
                  <select
                    className={styles.formSelect}
                    value={formData.status}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                  >
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('obs.raiseDate')}</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={formData.raiseDate}
                    onChange={(e) => handleFieldChange('raiseDate', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('obs.closeoutDate')}</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={formData.closeoutDate}
                    onChange={(e) => handleFieldChange('closeoutDate', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('obs.type')}</label>
                  <select
                    className={styles.formSelect}
                    value={formData.type}
                    onChange={(e) => handleFieldChange('type', e.target.value)}
                  >
                    <option value="">{t('obs.typePlaceholder')}</option>
                    <option value="Design">Design</option>
                    <option value="Material">Material</option>
                    <option value="Workmanship">Workmanship</option>
                    <option value="Document">Document</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('obs.contractor')}</label>
                  <select
                    className={styles.formSelect}
                    value={formData.contractor}
                    onChange={(e) => handleFieldChange('contractor', e.target.value)}
                  >
                    <option value="">{t('obs.contractorPlaceholder')}</option>
                    {getActiveContractors().map((contractor) => (
                      <option key={contractor.id} value={contractor.name}>
                        {contractor.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('obs.refStandards')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.referenceStandards}
                    onChange={(e) => handleFieldChange('referenceStandards', e.target.value)}
                  />
                </div>
                <div className={styles.formGroupFull}>
                  <label>{t('obs.detailsDescription')}</label>
                  <textarea
                    className={styles.formTextarea}
                    value={formData.detailsDescription}
                    onChange={(e) => handleFieldChange('detailsDescription', e.target.value)}
                    rows={4}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('obs.foundLocation')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.foundLocation}
                    onChange={(e) => handleFieldChange('foundLocation', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 照片上傳 */}
            <div className={styles.formSection}>
              <div className={styles.photoSectionContainer}>
                <div className={styles.photoSection}>
                  <h3 className={styles.sectionTitle}>{t('obs.defectPhotos')}</h3>
                  <div className={styles.photoUploadContainer}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handlePhotoUpload(e, 'defect')}
                      className={styles.photoInput}
                      id="defect-photo-upload"
                    />
                    <label htmlFor="defect-photo-upload" className={styles.photoUploadButton}>
                      <span>{t('obs.uploadPhotos')}</span>
                    </label>
                    {formData.defectPhotos.length > 0 && (
                      <div className={styles.photoPreviewGrid}>
                        {formData.defectPhotos.map((photo, index) => (
                          <div key={index} className={styles.photoPreviewItem}>
                            <img src={photo} alt={`Defect Photo ${index + 1}`} className={styles.photoPreview} />
                            <button
                              type="button"
                              className={styles.photoRemoveButton}
                              onClick={() => handleRemovePhoto(index, 'defect')}
                              aria-label="Remove photo"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.photoSection}>
                  <h3 className={styles.sectionTitle}>{t('obs.improvementPhotos')}</h3>
                  <div className={styles.photoUploadContainer}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handlePhotoUpload(e, 'improvement')}
                      className={styles.photoInput}
                      id="improvement-photo-upload"
                    />
                    <label htmlFor="improvement-photo-upload" className={styles.photoUploadButton}>
                      <span>{t('obs.uploadPhotos')}</span>
                    </label>
                    {formData.improvementPhotos.length > 0 && (
                      <div className={styles.photoPreviewGrid}>
                        {formData.improvementPhotos.map((photo, index) => (
                          <div key={index} className={styles.photoPreviewItem}>
                            <img src={photo} alt={`Improvement Photo ${index + 1}`} className={styles.photoPreview} />
                            <button
                              type="button"
                              className={styles.photoRemoveButton}
                              onClick={() => handleRemovePhoto(index, 'improvement')}
                              aria-label="Remove photo"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Attachments */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('obs.attachments')}</h3>
              <div className={styles.photoUploadContainer}>
                <input
                  type="file"
                  accept="*"
                  multiple
                  onChange={handleAttachmentUpload}
                  className={styles.photoInput}
                  id="attachment-upload"
                />
                <label htmlFor="attachment-upload" className={styles.photoUploadButton}>
                  <span>{t('obs.uploadFiles')}</span>
                </label>
                {formData.attachments.length > 0 && (
                  <div className={styles.photoPreviewGrid}>
                    {formData.attachments.map((_, index) => (
                      <div key={index} className={styles.photoPreviewItem}>
                        <span style={{ fontSize: 12, wordBreak: 'break-all' }}>Attachment {index + 1}</span>
                        <a href={formData.attachments[index]} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, marginLeft: 4 }}>View</a>
                        <button
                          type="button"
                          className={styles.photoRemoveButton}
                          onClick={() => handleRemoveAttachment(index)}
                          aria-label="Remove attachment"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 人員與位置資訊 */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('obs.sectionPersonnelLocation')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('obs.foundBy')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.foundBy}
                    onChange={(e) => handleFieldChange('foundBy', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('obs.raisedBy')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.raisedBy}
                    onChange={(e) => handleFieldChange('raisedBy', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('obs.serialNumbers')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.serialNumbers}
                    onChange={(e) => handleFieldChange('serialNumbers', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('obs.productDisposition')}</label>
                  <select
                    className={styles.formSelect}
                    value={formData.productDisposition}
                    onChange={(e) => handleFieldChange('productDisposition', e.target.value)}
                  >
                    <option value="">{t('obs.productDispositionPlaceholder')}</option>
                    <option value="Use As Is">Use As Is</option>
                    <option value="Repair">Repair</option>
                    <option value="Rework">Rework</option>
                    <option value="Reject">Reject</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.modalActions}>
          <button type="button" className={styles.saveButton} onClick={handleSave}>
            {t('common.save')}
          </button>
          <button type="button" className={styles.printButton} onClick={handlePrint}>
            {t('common.print')}
          </button>
          <button type="button" className={styles.cancelButton} onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

interface OBSDetailsViewModalProps {
  obsId: string;
  obsItem: OBSItem | undefined;
  obsDetailData?: OBSDetailData;
  onClose: () => void;
}

const OBSDetailsViewModal: React.FC<OBSDetailsViewModalProps> = ({ obsItem, onClose }) => {
  const { t } = useLanguage();
  if (!obsItem) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{t('obs.viewTitle')}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formSections}>
            <div className={styles.formSection}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}><label>{t('obs.refNo')}</label><div className={styles.readOnlyField}>{obsItem.documentNumber}</div></div>
                <div className={styles.formGroup}><label>{t('obs.status')}</label><div className={styles.readOnlyField}>{obsItem.status}</div></div>
                <div className={styles.formGroup}><label>{t('obs.contractor')}</label><div className={styles.readOnlyField}>{obsItem.vendor}</div></div>
                <div className={styles.formGroup}><label>{t('obs.type')}</label><div className={styles.readOnlyField}>{obsItem.type || '-'}</div></div>
                <div className={styles.formGroup}><label>{t('obs.subject')}</label><div className={styles.readOnlyField}>{obsItem.subject || obsItem.description || '-'}</div></div>
                <div className={styles.formGroup}><label>{t('obs.raiseDate')}</label><div className={styles.readOnlyField}>{obsItem.raiseDate || '-'}</div></div>
                <div className={styles.formGroup}><label>{t('obs.closeoutDate')}</label><div className={styles.readOnlyField}>{obsItem.closeoutDate || '-'}</div></div>
                <div className={styles.formGroup}><label>{t('obs.foundBy')}</label><div className={styles.readOnlyField}>{obsItem.foundBy || '-'}</div></div>
                <div className={styles.formGroup}><label>{t('obs.raisedBy')}</label><div className={styles.readOnlyField}>{obsItem.raisedBy || '-'}</div></div>
                <div className={styles.formGroup}><label>{t('obs.productDisposition')}</label><div className={styles.readOnlyField}>{obsItem.productDisposition || '-'}</div></div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.modalActions}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  );
};

export default OBS;

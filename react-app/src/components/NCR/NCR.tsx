import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useContractors } from '../../context/ContractorsContext';
import { useNOI } from '../../context/NOIContext';
import { useNCR, NCRItem } from '../../context/NCRContext';
import { useITR } from '../../context/ITRContext';
import { checkNCRReferences, generateDeleteMessage } from '../../utils/cascadeDelete';
import ConfirmModal from '../Shared/ConfirmModal';
import styles from './NCR.module.css';

type SortKey = keyof NCRItem;
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const NCR: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { getActiveContractors, contractors } = useContractors();
  const { ncrList, loading, error, refetch, addNCR, updateNCR, deleteNCR } = useNCR();
  const { itrList } = useITR();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // Sort State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'raiseDate', direction: 'desc' });

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [currentNcrId, setCurrentNcrId] = useState<string | null>(null);
  const [viewingNcrId, setViewingNcrId] = useState<string | null>(null);
  const [ncrDetails, setNcrDetails] = useState<{ [key: string]: NCRDetailData }>({});

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

  const filteredNcrList = useMemo(() => {
    let filtered = [...ncrList];

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
      filtered = filtered.filter(item => item.raiseDate >= dateFilter.start);
    }
    if (dateFilter.end) {
      filtered = filtered.filter(item => item.raiseDate <= dateFilter.end);
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.vendor.toLowerCase().includes(query) ||
        item.documentNumber.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.subject?.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query) ||
        item.type?.toLowerCase().includes(query) ||
        item.foundBy?.toLowerCase().includes(query) ||
        item.raisedBy?.toLowerCase().includes(query) ||
        item.foundLocation?.toLowerCase().includes(query)
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
  }, [ncrList, searchQuery, vendorFilter, statusFilter, dateFilter, sortConfig]);

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <span className={styles.sortIcon}>↕</span>;
    return sortConfig.direction === 'asc' ? <span className={styles.sortIcon}>↑</span> : <span className={styles.sortIcon}>↓</span>;
  };

  const statistics = useMemo(() => {
    const statusCounts = {
      opening: 0,
      closed: 0,
    };

    ncrList.forEach((item) => {
      const status = item.status.toLowerCase();
      if (status === 'open') {
        statusCounts.opening++;
      } else if (status === 'closed') {
        statusCounts.closed++;
      }
    });

    const total = ncrList.length;
    const openRate = total > 0 ? Math.round((statusCounts.opening / total) * 100) : 0;

    return {
      ...statusCounts,
      total,
      openRate,
    };
  }, [ncrList]);

  const handleAdd = (id: string) => {
    navigate(`/ncr/${id}`);
  };

  const handleViewDetails = (id: string) => {
    setViewingNcrId(id);
    setIsDetailsModalOpen(true);
  };

  const handleEdit = (id: string) => {
    setCurrentNcrId(id);
    setIsEditModalOpen(true);
  };

  // Reference No (documentNumber) 由後端自動產生，前端不再處理產號邏輯

  const handleAddNew = () => {
    const newId = String(Date.now());
    setCurrentNcrId(newId);
    setIsEditModalOpen(true);
  };

  const handleSaveNCRDetails = async (details: NCRDetailData) => {
    if (currentNcrId) {
      setNcrDetails(prev => ({ ...prev, [currentNcrId]: details }));
      const existingItem = ncrList.find(item => item.id === currentNcrId);

      // documentNumber 由後端自動產生，新建時不送；更新時也不覆蓋
      const updatedItem: Record<string, unknown> = {
        vendor: details.contractor || '',
        description: details.subject || details.detailsDescription || '',
        rev: '',
        submit: 'v',
        status: details.status || 'Open',
        remark: details.remark || '',
        hasDetails: true,
        raiseDate: details.raiseDate,
        closeoutDate: details.closeoutDate,
        aconex: details.aconex,
        type: details.type,
        subject: details.subject,
        foundBy: details.foundBy,
        raisedBy: details.raisedBy,
        foundLocation: details.foundLocation,
        productDisposition: details.productDisposition,
        productIntegrityRelated: details.productIntegrityRelated,
        permanentProductDeviation: details.permanentProductDeviation,
        impactToOM: details.impactToOM,
        noiNumber: details.noiNumber,  // 連結到觸發此 NCR 的 NOI
      };

      if (existingItem) {
        await updateNCR(currentNcrId, updatedItem);
      } else {
        const newNCR = await addNCR(updatedItem as Omit<NCRItem, 'id'>);
        setNcrDetails(prev => {
          const newDetails = { ...prev };
          newDetails[newNCR.id] = details;
          return newDetails;
        });
      }
    }
    setIsEditModalOpen(false);
    setCurrentNcrId(null);
  };

  const confirmDelete = (id: string) => {
    const ncr = ncrList.find(item => item.id === id);
    if (!ncr) return;

    const references = checkNCRReferences(id, ncr.documentNumber, itrList);
    const message = generateDeleteMessage('NCR', ncr.documentNumber, references.references, t);

    setDeleteModal({
      isOpen: true,
      id,
      message,
    });
  };

  const handleDelete = async () => {
    if (deleteModal.id) {
      await deleteNCR(deleteModal.id);
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
          <h1>{t('home.ncr.description') || 'NCR'}</h1>
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
            placeholder={t('ncr.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

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
        {loading && <p className={styles.loadingMessage}>{t('common.loading')}</p>}
        {error && (
          <div className={styles.loadingError}>
            <p>{error}</p>
            <button type="button" className={styles.retryButton} onClick={() => refetch()}>{t('common.retry')}</button>
          </div>
        )}
        {!loading && !error && (
          <>
            <div className={styles.listHeader}>
              <h2 className={styles.listTitle}>{t('ncr.title')}</h2>
              <button
                className={styles.addNewButton}
                onClick={handleAddNew}
              >
                {t('ncr.addNew')}
              </button>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th onClick={() => handleSort('documentNumber')} className={styles.sortableHeader}>
                    <div className={styles.headerContent}>
                      {t('ncr.documentNumber')} {renderSortIcon('documentNumber')}
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
                  <th onClick={() => handleSort('subject')} className={styles.sortableHeader}>
                    <div className={styles.headerContent}>
                      {t('obs.subject')} {renderSortIcon('subject')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('type')} className={styles.sortableHeader}>
                    <div className={styles.headerContent}>
                      {t('ncr.type')} {renderSortIcon('type')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('raiseDate')} className={styles.sortableHeader}>
                    <div className={styles.headerContent}>
                      {t('ncr.raiseDate')} {renderSortIcon('raiseDate')}
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
                  <th>{t('ncr.refIntegrity')}</th>
                  <th>{t('ncr.refPermanentDeviation')}</th>
                  <th>{t('ncr.refImpactOM')}</th>
                  <th>{t('common.operations')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredNcrList.map((ncr, index) => {
                  // Check if each cell should be highlighted in pink individually
                  const isProductDispositionPink = ncr.productDisposition === 'Use As Is';
                  const isProductIntegrityPink = ncr.productIntegrityRelated === 'Yes';
                  const isPermanentDeviationPink = ncr.permanentProductDeviation === 'Yes';
                  const isImpactOMPink = ncr.impactToOM === 'Yes';

                  // Check if row should be green (Status is Closed)
                  const isClosedRow = (ncr.status || '').toLowerCase() === 'closed';

                  return (
                    <tr
                      key={ncr.id}
                      className={isClosedRow ? styles.greenRow : styles.normalRow}
                    >
                      <td>{index + 1}</td>
                      <td><span>{ncr.documentNumber}</span></td>
                      <td><span>{ncr.status.toLowerCase() === 'open' ? t('status.open') : t('status.closed')}</span></td>
                      <td><span>{ncr.vendor}</span></td>
                      <td><span>{ncr.subject || ncr.description || '-'}</span></td>
                      <td><span>{ncr.type ? t(`ncr.type.${ncr.type.toLowerCase()}`) : '-'}</span></td>
                      <td><span>{ncr.raiseDate || '-'}</span></td>
                      <td><span>{ncr.closeoutDate || '-'}</span></td>
                      <td><span>{ncr.foundBy || '-'}</span></td>
                      <td><span>{ncr.raisedBy || '-'}</span></td>
                      <td className={isProductDispositionPink ? styles.pinkCell : ''}>
                        <span>{ncr.productDisposition ? t(`ncr.disposition.${ncr.productDisposition.replace(/\s+/g, '').replace(/^./, str => str.toLowerCase())}`) : '-'}</span>
                      </td>
                      <td className={isProductIntegrityPink ? styles.pinkCell : ''}>
                        <span>{ncr.productIntegrityRelated ? (ncr.productIntegrityRelated === 'Yes' ? t('common.yes') : t('common.no')) : '-'}</span>
                      </td>
                      <td className={isPermanentDeviationPink ? styles.pinkCell : ''}>
                        <span>{ncr.permanentProductDeviation ? (ncr.permanentProductDeviation === 'Yes' ? t('common.yes') : t('common.no')) : '-'}</span>
                      </td>
                      <td className={isImpactOMPink ? styles.pinkCell : ''}>
                        <span>{ncr.impactToOM ? (ncr.impactToOM === 'Yes' ? t('common.yes') : t('common.no')) : '-'}</span>
                      </td>
                      <td>
                        <div className={styles.buttonGroup}>
                          <button
                            className={`${styles.actionBtn} ${styles.editBtn}`}
                            onClick={() => handleEdit(ncr.id)}
                            title={t('common.edit')}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.detailsBtn}`}
                            onClick={() => handleViewDetails(ncr.id)}
                            title={t('common.details')}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            onClick={() => confirmDelete(ncr.id)}
                            title={t('common.delete')}
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
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={t('common.confirmDeleteTitle')}
        message={deleteModal.message || t('ncr.confirmDelete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, message: '' })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
      />

      {isEditModalOpen && currentNcrId && (
        <NCRDetailModal
          ncrId={currentNcrId}
          existingData={ncrDetails[currentNcrId]}
          existingItem={ncrList.find(item => item.id === currentNcrId)}
          ncrList={ncrList}
          onSave={handleSaveNCRDetails}
          onClose={() => {
            setIsEditModalOpen(false);
            setCurrentNcrId(null);
          }}
        />
      )}

      {isDetailsModalOpen && viewingNcrId && (
        <NCRDetailsViewModal
          ncrId={viewingNcrId}
          ncrItem={ncrList.find(item => item.id === viewingNcrId)}
          ncrDetailData={ncrDetails[viewingNcrId]}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setViewingNcrId(null);
          }}
        />
      )}
    </div>
  );
};

interface NCRDetailData {
  ncrNumber: string;
  itrNumber: string;
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
  productIntegrityRelated: string;
  permanentProductDeviation: string;
  impactToOM: string;
  projectQualityManager: string;
  defectPhotos: string[];
  improvementPhotos: string[];
}

interface NCRDetailModalProps {
  ncrId: string | null;
  existingData?: NCRDetailData;
  existingItem?: NCRItem;
  ncrList: NCRItem[];
  onSave: (details: NCRDetailData) => void;
  onClose: () => void;
}

const NCRDetailModal: React.FC<NCRDetailModalProps> = ({ ncrId, existingData, existingItem, ncrList: propNcrList, onSave, onClose }) => {
  const { t } = useLanguage();
  const { getActiveContractors } = useContractors();
  const { ncrList: contextNcrList } = useNCR();
  const { getNOIList } = useNOI();

  // Use context list if available, otherwise use prop
  const ncrList = contextNcrList.length > 0 ? contextNcrList : propNcrList;

  // Reference No (documentNumber) 由後端自動產生，前端不再處理產號邏輯

  // Initialize form data from existing data or existing item
  const getInitialData = (): NCRDetailData => {
    if (existingData) {
      return { ...existingData, itrNumber: existingData.itrNumber || '' };
    }
    if (existingItem) {
      return {
        ncrNumber: existingItem.documentNumber || '',  // 既有編號，顯示用
        itrNumber: '',
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
        productIntegrityRelated: '',
        permanentProductDeviation: '',
        impactToOM: '',
        projectQualityManager: '',
        defectPhotos: existingItem.defectPhotos || [],
        improvementPhotos: existingItem.improvementPhotos || [],
      };
    }
    // 新項目：ncrNumber 留空，由後端自動產生
    return {
      ncrNumber: '',  // 由後端產生
      itrNumber: '',
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
      productIntegrityRelated: '',
      permanentProductDeviation: '',
      impactToOM: '',
      projectQualityManager: '',
      defectPhotos: [],
      improvementPhotos: [],
    };
  };

  const [formData, setFormData] = useState<NCRDetailData>(getInitialData());

  // Reference No 由後端自動產生，不再於前端自動更新

  const handleFieldChange = (field: keyof NCRDetailData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNAButton = (field: keyof NCRDetailData) => {
    setFormData(prev => ({ ...prev, [field]: 'Not Applicable' }));
  };

  const handleDateButton = (field: keyof NCRDetailData) => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}_`;
    setFormData(prev => ({
      ...prev,
      [field]: prev[field] ? `${prev[field]}\n${dateStr}` : dateStr
    }));
  };

  const handleTBCButton = (field: keyof NCRDetailData) => {
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

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{existingData || existingItem ? t('ncr.editTitle') : t('ncr.addTitle')}</h2>
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
                  <label>{t('ncr.documentNumber')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.ncrNumber || t('form.autoGenerated')}
                    readOnly
                    style={{ backgroundColor: '#D9D9D9', cursor: 'not-allowed', color: formData.ncrNumber ? '#000000' : '#666666' }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('ncr.itrNo')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.itrNumber}
                    onChange={(e) => handleFieldChange('itrNumber', e.target.value)}
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
                  <label>{t('ncr.raiseDate')}</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={formData.raiseDate}
                    onChange={(e) => handleFieldChange('raiseDate', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('ncr.type')}</label>
                  <select
                    className={styles.formSelect}
                    value={formData.type}
                    onChange={(e) => handleFieldChange('type', e.target.value)}
                  >
                    <option value="">{t('obs.typePlaceholder')}</option>
                    <option value="Design">{t('ncr.type.design')}</option>
                    <option value="Material">{t('ncr.type.material')}</option>
                    <option value="Workmanship">{t('ncr.type.workmanship')}</option>
                    <option value="Document">{t('ncr.type.document')}</option>
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

            {/* {t('obs.sectionPersonnelLocation')} */}
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
                    <option value="">{t('common.selectPlaceholder')}</option>
                    <option value="Use As Is">{t('ncr.disposition.useAsIs')}</option>
                    <option value="Repair">{t('ncr.disposition.repair')}</option>
                    <option value="Rework">{t('ncr.disposition.rework')}</option>
                    <option value="Reject">{t('ncr.disposition.reject')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* {t('ncr.sectionDisposition')} */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('ncr.sectionDisposition')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroupFull}>
                  <div className={styles.labelWithButton}>
                    <label>{t('ncr.repairMethod')}</label>
                    <div className={styles.buttonGroup}>
                      <button
                        type="button"
                        className={styles.tbcButton}
                        onClick={() => handleTBCButton('repairMethodStatement')}
                      >
                        {t('common.tbc')}
                      </button>
                      <button
                        type="button"
                        className={styles.naButton}
                        onClick={() => handleNAButton('repairMethodStatement')}
                      >
                        {t('common.na')}
                      </button>
                    </div>
                  </div>
                  <textarea
                    className={styles.formTextarea}
                    value={formData.repairMethodStatement}
                    onChange={(e) => handleFieldChange('repairMethodStatement', e.target.value)}
                    rows={3}
                  />
                </div>
                <div className={styles.formGroupFull}>
                  <div className={styles.labelWithButton}>
                    <label>{t('ncr.correctionAction')}</label>
                    <div className={styles.buttonGroup}>
                      <button
                        type="button"
                        className={styles.tbcButton}
                        onClick={() => handleTBCButton('immediateCorrectionAction')}
                      >
                        {t('common.tbc')}
                      </button>
                      <button
                        type="button"
                        className={styles.naButton}
                        onClick={() => handleNAButton('immediateCorrectionAction')}
                      >
                        {t('common.na')}
                      </button>
                    </div>
                  </div>
                  <textarea
                    className={styles.formTextarea}
                    value={formData.immediateCorrectionAction}
                    onChange={(e) => handleFieldChange('immediateCorrectionAction', e.target.value)}
                    rows={3}
                  />
                </div>
                <div className={styles.formGroupFull}>
                  <div className={styles.labelWithButton}>
                    <label>{t('ncr.rootCause')}</label>
                    <div className={styles.buttonGroup}>
                      <button
                        type="button"
                        className={styles.tbcButton}
                        onClick={() => handleTBCButton('rootCauseAnalysis')}
                      >
                        {t('common.tbc')}
                      </button>
                      <button
                        type="button"
                        className={styles.naButton}
                        onClick={() => handleNAButton('rootCauseAnalysis')}
                      >
                        {t('common.na')}
                      </button>
                    </div>
                  </div>
                  <textarea
                    className={styles.formTextarea}
                    value={formData.rootCauseAnalysis}
                    onChange={(e) => handleFieldChange('rootCauseAnalysis', e.target.value)}
                    rows={4}
                  />
                </div>
                <div className={styles.formGroupFull}>
                  <div className={styles.labelWithButton}>
                    <label>{t('ncr.correctiveActions')}</label>
                    <div className={styles.buttonGroup}>
                      <button
                        type="button"
                        className={styles.tbcButton}
                        onClick={() => handleTBCButton('correctiveActions')}
                      >
                        {t('common.tbc')}
                      </button>
                      <button
                        type="button"
                        className={styles.naButton}
                        onClick={() => handleNAButton('correctiveActions')}
                      >
                        {t('common.na')}
                      </button>
                    </div>
                  </div>
                  <textarea
                    className={styles.formTextarea}
                    value={formData.correctiveActions}
                    onChange={(e) => handleFieldChange('correctiveActions', e.target.value)}
                    rows={3}
                  />
                </div>
                <div className={styles.formGroupFull}>
                  <div className={styles.labelWithButton}>
                    <label>{t('ncr.preventiveAction')}</label>
                    <div className={styles.buttonGroup}>
                      <button
                        type="button"
                        className={styles.tbcButton}
                        onClick={() => handleTBCButton('preventiveAction')}
                      >
                        {t('common.tbc')}
                      </button>
                      <button
                        type="button"
                        className={styles.naButton}
                        onClick={() => handleNAButton('preventiveAction')}
                      >
                        {t('common.na')}
                      </button>
                    </div>
                  </div>
                  <textarea
                    className={styles.formTextarea}
                    value={formData.preventiveAction}
                    onChange={(e) => handleFieldChange('preventiveAction', e.target.value)}
                    rows={3}
                  />
                </div>
                <div className={styles.formGroupFull}>
                  <div className={styles.labelWithButton}>
                    <label>{t('ncr.integrityStatement')}</label>
                    <div className={styles.buttonGroup}>
                      <button
                        type="button"
                        className={styles.tbcButton}
                        onClick={() => handleTBCButton('finalProductIntegrityStatement')}
                      >
                        {t('common.tbc')}
                      </button>
                      <button
                        type="button"
                        className={styles.naButton}
                        onClick={() => handleNAButton('finalProductIntegrityStatement')}
                      >
                        {t('common.na')}
                      </button>
                    </div>
                  </div>
                  <textarea
                    className={styles.formTextarea}
                    value={formData.finalProductIntegrityStatement}
                    onChange={(e) => handleFieldChange('finalProductIntegrityStatement', e.target.value)}
                    rows={3}
                  />
                </div>
              </div >
            </div >

            {/* {t('ncr.sectionReinspection')} */}
            < div className={styles.formSection} >
              <h3 className={styles.sectionTitle}>{t('ncr.sectionReinspection')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('ncr.itrNo')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.itrNumber}
                    onChange={(e) => handleFieldChange('itrNumber', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('ncr.noiNo')}</label>
                  <select
                    className={styles.formInput}
                    value={formData.noiNumber}
                    onChange={(e) => handleFieldChange('noiNumber', e.target.value)}
                  >
                    <option value="">{t('ncr.noiNoPlaceholder')}</option>
                    {getNOIList().map((noi) => (
                      <option key={noi.id} value={noi.referenceNo}>
                        {noi.referenceNo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('ncr.reinspectionNo')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.reInspectionNumber}
                    onChange={(e) => handleFieldChange('reInspectionNumber', e.target.value)}
                  />
                </div>
              </div>
            </div >

            {/* {t('ncr.sectionQuality')} */}
            < div className={styles.formSection} >
              <h3 className={styles.sectionTitle}>{t('ncr.sectionQuality')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('common.status')}</label>
                  <select
                    className={styles.formSelect}
                    value={formData.status}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                  >
                    <option value="Open">{t('status.open')}</option>
                    <option value="Closed">{t('status.closed')}</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.optionalLabel}>{t('obs.closeoutDate')}</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={formData.closeoutDate}
                    onChange={(e) => handleFieldChange('closeoutDate', e.target.value)}
                    readOnly
                    style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('ncr.integrityRelated')}</label>
                  <select
                    className={styles.formSelect}
                    value={formData.productIntegrityRelated}
                    onChange={(e) => handleFieldChange('productIntegrityRelated', e.target.value)}
                  >
                    <option value="">{t('common.selectPlaceholder')}</option>
                    <option value="Yes">{t('common.yes')}</option>
                    <option value="No">{t('common.no')}</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('ncr.permanentDeviation')}</label>
                  <select
                    className={styles.formSelect}
                    value={formData.permanentProductDeviation}
                    onChange={(e) => handleFieldChange('permanentProductDeviation', e.target.value)}
                  >
                    <option value="">{t('common.selectPlaceholder')}</option>
                    <option value="Yes">{t('common.yes')}</option>
                    <option value="No">{t('common.no')}</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('ncr.impactOM')}</label>
                  <select
                    className={styles.formSelect}
                    value={formData.impactToOM}
                    onChange={(e) => handleFieldChange('impactToOM', e.target.value)}
                  >
                    <option value="">{t('common.selectPlaceholder')}</option>
                    <option value="Yes">{t('common.yes')}</option>
                    <option value="No">{t('common.no')}</option>
                  </select>
                </div>
                <div className={styles.formGroupFull}>
                  <div className={styles.labelWithButton}>
                    <label className={styles.optionalLabel}>{t('common.remark')}</label>
                    <button
                      type="button"
                      className={styles.tbcButton}
                      onClick={() => handleDateButton('remark')}
                    >
                      {t('common.addDate')}
                    </button>
                  </div>
                  <textarea
                    className={styles.formTextarea}
                    value={formData.remark}
                    onChange={(e) => handleFieldChange('remark', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div >
          </div >
          <div className={styles.modalActions}>
            <button className={styles.saveButton} onClick={handleSave}>
              {t('common.save')}
            </button>
            <button className={styles.cancelButton} onClick={onClose}>
              {t('common.cancel')}
            </button>
          </div>
        </div >
      </div >
    </div >
  );
};

interface NCRDetailsViewModalProps {
  ncrId: string;
  ncrItem?: NCRItem;
  ncrDetailData?: NCRDetailData;
  onClose: () => void;
}

const NCRDetailsViewModal: React.FC<NCRDetailsViewModalProps> = ({ ncrId, ncrItem, ncrDetailData, onClose }) => {
  const { t } = useLanguage();
  // Combine data from both sources, with detailData taking precedence
  const displayData: NCRDetailData = {
    ncrNumber: ncrDetailData?.ncrNumber || ncrItem?.documentNumber || '',
    itrNumber: ncrDetailData?.itrNumber || '',
    status: ncrDetailData?.status || ncrItem?.status || 'Open',
    raiseDate: ncrDetailData?.raiseDate || ncrItem?.raiseDate || '',
    closeoutDate: ncrDetailData?.closeoutDate || ncrItem?.closeoutDate || '',
    aconex: ncrDetailData?.aconex || ncrItem?.aconex || '',
    type: ncrDetailData?.type || ncrItem?.type || '',
    contractor: ncrDetailData?.contractor || ncrItem?.vendor || '',
    remark: ncrDetailData?.remark || ncrItem?.remark || '',
    subject: ncrDetailData?.subject || ncrItem?.subject || ncrItem?.description || '',
    referenceStandards: ncrDetailData?.referenceStandards || '',
    detailsDescription: ncrDetailData?.detailsDescription || ncrItem?.description || '',
    foundLocation: ncrDetailData?.foundLocation || ncrItem?.foundLocation || '',
    foundBy: ncrDetailData?.foundBy || ncrItem?.foundBy || '',
    raisedBy: ncrDetailData?.raisedBy || ncrItem?.raisedBy || '',
    serialNumbers: ncrDetailData?.serialNumbers || '',
    productDisposition: ncrDetailData?.productDisposition || ncrItem?.productDisposition || '',
    repairMethodStatement: ncrDetailData?.repairMethodStatement || '',
    immediateCorrectionAction: ncrDetailData?.immediateCorrectionAction || '',
    rootCauseAnalysis: ncrDetailData?.rootCauseAnalysis || '',
    correctiveActions: ncrDetailData?.correctiveActions || '',
    preventiveAction: ncrDetailData?.preventiveAction || '',
    finalProductIntegrityStatement: ncrDetailData?.finalProductIntegrityStatement || '',
    reInspectionNumber: ncrDetailData?.reInspectionNumber || '',
    noiNumber: ncrDetailData?.noiNumber || '',
    productIntegrityRelated: ncrDetailData?.productIntegrityRelated || ncrItem?.productIntegrityRelated || '',
    permanentProductDeviation: ncrDetailData?.permanentProductDeviation || ncrItem?.permanentProductDeviation || '',
    impactToOM: ncrDetailData?.impactToOM || ncrItem?.impactToOM || '',
    projectQualityManager: ncrDetailData?.projectQualityManager || '',
    defectPhotos: ncrDetailData?.defectPhotos || ncrItem?.defectPhotos || [],
    improvementPhotos: ncrDetailData?.improvementPhotos || ncrItem?.improvementPhotos || [],
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{t('ncr.viewTitle')}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formSections}>
            {/* 不符合項目資訊 */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('obs.sectionInfo')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('ncr.itrNo')}</label>
                  <div className={styles.readOnlyField}>{displayData.itrNumber || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('itr.ncrNo')}</label>
                  <div className={styles.readOnlyField}>{displayData.ncrNumber || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('obs.subject')}</label>
                  <div className={styles.readOnlyField}>{displayData.subject || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('ncr.raiseDate')}</label>
                  <div className={styles.readOnlyField}>{displayData.raiseDate || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('ncr.type')}</label>
                  <div className={styles.readOnlyField}>
                    {displayData.type ? t(`ncr.type.${displayData.type.toLowerCase()}`) : '-'}
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('common.contractor')}</label>
                  <div className={styles.readOnlyField}>{displayData.contractor || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('obs.refStandards')}</label>
                  <div className={styles.readOnlyField}>{displayData.referenceStandards || '-'}</div>
                </div>
                <div className={styles.formGroupFull}>
                  <label>{t('obs.detailsDescription')}</label>
                  <div className={styles.readOnlyField}>{displayData.detailsDescription || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('obs.foundLocation')}</label>
                  <div className={styles.readOnlyField}>{displayData.foundLocation || '-'}</div>
                </div>
              </div>
            </div>

            {/* 照片 */}
            {(displayData.defectPhotos?.length > 0 || displayData.improvementPhotos?.length > 0) && (
              <div className={styles.formSection}>
                <div className={styles.photoSectionContainer}>
                  {displayData.defectPhotos && displayData.defectPhotos.length > 0 && (
                    <div className={styles.photoSection}>
                      <h3 className={styles.sectionTitle}>{t('obs.defectPhotos')}</h3>
                      <div className={styles.photoPreviewGrid}>
                        {displayData.defectPhotos.map((photo, index) => (
                          <div key={index} className={styles.photoPreviewItem}>
                            <img src={photo} alt={`Defect Photo ${index + 1}`} className={styles.photoPreview} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {displayData.improvementPhotos && displayData.improvementPhotos.length > 0 && (
                    <div className={styles.photoSection}>
                      <h3 className={styles.sectionTitle}>{t('obs.improvementPhotos')}</h3>
                      <div className={styles.photoPreviewGrid}>
                        {displayData.improvementPhotos.map((photo, index) => (
                          <div key={index} className={styles.photoPreviewItem}>
                            <img src={photo} alt={`Improvement Photo ${index + 1}`} className={styles.photoPreview} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* {t('obs.sectionPersonnelLocation')} */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('obs.sectionPersonnelLocation')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('obs.foundBy')}</label>
                  <div className={styles.readOnlyField}>{displayData.foundBy || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('obs.raisedBy')}</label>
                  <div className={styles.readOnlyField}>{displayData.raisedBy || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('obs.serialNumbers')}</label>
                  <div className={styles.readOnlyField}>{displayData.serialNumbers || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('obs.productDisposition')}</label>
                  <div className={styles.readOnlyField}>
                    {displayData.productDisposition ? t(`ncr.disposition.${displayData.productDisposition.replace(/\s+/g, '').replace(/^./, str => str.toLowerCase())}`) : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* {t('ncr.sectionDisposition')} */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('ncr.sectionDisposition')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroupFull}>
                  <label>{t('ncr.repairMethod')}</label>
                  <div className={styles.readOnlyField}>{displayData.repairMethodStatement || '-'}</div>
                </div>
                <div className={styles.formGroupFull}>
                  <label>{t('ncr.correctionAction')}</label>
                  <div className={styles.readOnlyField}>{displayData.immediateCorrectionAction || '-'}</div>
                </div>
                <div className={styles.formGroupFull}>
                  <label>{t('ncr.rootCause')}</label>
                  <div className={styles.readOnlyField}>{displayData.rootCauseAnalysis || '-'}</div>
                </div>
                <div className={styles.formGroupFull}>
                  <label>{t('ncr.correctiveActions')}</label>
                  <div className={styles.readOnlyField}>{displayData.correctiveActions || '-'}</div>
                </div>
                <div className={styles.formGroupFull}>
                  <label>{t('ncr.preventiveAction')}</label>
                  <div className={styles.readOnlyField}>{displayData.preventiveAction || '-'}</div>
                </div>
                <div className={styles.formGroupFull}>
                  <label>{t('ncr.integrityStatement')}</label>
                  <div className={styles.readOnlyField}>{displayData.finalProductIntegrityStatement || '-'}</div>
                </div>
              </div>
            </div>

            {/* {t('ncr.sectionReinspection')} */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('ncr.sectionReinspection')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('ncr.itrNo')}</label>
                  <div className={styles.readOnlyField}>{displayData.itrNumber || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('itr.ncrNo')}</label>
                  <div className={styles.readOnlyField}>{displayData.ncrNumber || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('ncr.reinspectionNo')}</label>
                  <div className={styles.readOnlyField}>{displayData.reInspectionNumber || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('ncr.noiNo')}</label>
                  <div className={styles.readOnlyField}>{displayData.noiNumber || '-'}</div>
                </div>
              </div>
            </div>

            {/* {t('ncr.sectionQuality')} */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('ncr.sectionQuality')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('common.status')}</label>
                  <div className={styles.readOnlyField}>
                    {displayData.status.toLowerCase() === 'open' ? t('status.open') : t('status.closed')}
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('obs.closeoutDate')}</label>
                  <div className={styles.readOnlyField}>{displayData.closeoutDate || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('ncr.integrityRelated')}</label>
                  <div className={styles.readOnlyField}>{displayData.productIntegrityRelated || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('ncr.permanentDeviation')}</label>
                  <div className={styles.readOnlyField}>{displayData.permanentProductDeviation || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('ncr.impactOM')}</label>
                  <div className={styles.readOnlyField}>{displayData.impactToOM || '-'}</div>
                </div>
                <div className={styles.formGroupFull}>
                  <label>{t('common.remark')}</label>
                  <div className={styles.readOnlyField}>{displayData.remark || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.printButton} onClick={handlePrint}>
            {t('common.print')}
          </button>
          <button className={styles.cancelButton} onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NCR;

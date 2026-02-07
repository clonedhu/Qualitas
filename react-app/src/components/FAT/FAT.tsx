import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useContractors } from '../../context/ContractorsContext';
import { checkFATReferences, generateDeleteMessage } from '../../utils/cascadeDelete';
import ConfirmModal from '../Shared/ConfirmModal';
import styles from './FAT.module.css';

const STORAGE_KEY_FAT_LIST = 'qualitas_fat_list';
const STORAGE_KEY_FAT_DETAILS = 'qualitas_fat_details';

interface FATItem {
  id: string;
  equipment: string;
  supplier: string;
  procedure: string;
  location: string;
  startDate: string;
  endDate: string;
  deliveryFrom: string;
  deliveryTo: string;
  siteReadiness: string;
  moveInDate: string;
  hasDetails?: boolean;
}

interface FATDetailItem {
  id: string;
  sNo: string;
  itemName: string;
  specification: string;
  qty: string;
  unit: string;
  acceptanceCriteria: string;
  fatActualValue: string;
  fatJudgment: string;
  remarks: string;
}

const defaultFatList: FATItem[] = [
  {
    id: '1',
    equipment: 'Equipment A',
    supplier: '廠商A',
    procedure: 'Procedure 1',
    location: 'Location A',
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    deliveryFrom: 'Factory A',
    deliveryTo: 'Site A',
    siteReadiness: 'Ready',
    moveInDate: '2026-02-01',
    hasDetails: true,
  },
];

const defaultFatDetails: { [key: string]: FATDetailItem[] } = {
  '1': [
    {
      id: '1-1',
      sNo: '1',
      itemName: 'Item 1',
      specification: 'Spec 1',
      qty: '10',
      unit: 'pcs',
      acceptanceCriteria: 'Standard A',
      fatActualValue: '9.8',
      fatJudgment: 'Pass',
      remarks: 'Test passed',
    },
  ],
};

function loadFatListFromStorage(): FATItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FAT_LIST);
    if (raw) {
      const parsed = JSON.parse(raw) as FATItem[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) { }
  return defaultFatList;
}

function loadFatDetailsFromStorage(): { [key: string]: FATDetailItem[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FAT_DETAILS);
    if (raw) {
      const parsed = JSON.parse(raw) as { [key: string]: FATDetailItem[] };
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (_) { }
  return defaultFatDetails;
}

const FAT: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { getActiveContractors } = useContractors();
  const [fatList, setFatList] = useState<FATItem[]>(loadFatListFromStorage);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDetailsEditModalOpen, setIsDetailsEditModalOpen] = useState(false);
  const [currentFatId, setCurrentFatId] = useState<string | null>(null);
  const [viewingFatId, setViewingFatId] = useState<string | null>(null);
  const [fatDetails, setFatDetails] = useState<{ [key: string]: FATDetailItem[] }>(loadFatDetailsFromStorage);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; message: string }>({
    isOpen: false,
    id: null,
    message: '',
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FAT_LIST, JSON.stringify(fatList));
    } catch (_) { }
  }, [fatList]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FAT_DETAILS, JSON.stringify(fatDetails));
    } catch (_) { }
  }, [fatDetails]);

  const filteredFatList = useMemo(() => {
    let filtered = fatList;

    if (vendorFilter !== 'all') {
      filtered = filtered.filter(item => item.supplier === vendorFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.equipment.toLowerCase().includes(query) ||
        item.supplier.toLowerCase().includes(query) ||
        item.procedure.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query) ||
        item.deliveryFrom.toLowerCase().includes(query) ||
        item.deliveryTo.toLowerCase().includes(query) ||
        item.siteReadiness.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [fatList, searchQuery, vendorFilter]);

  const statistics = useMemo(() => {
    const total = fatList.length;
    const withDetails = fatList.filter(item => item.hasDetails).length;
    const detailsRate = total > 0 ? Math.round((withDetails / total) * 100) : 0;

    return {
      total,
      withDetails,
      detailsRate,
    };
  }, [fatList]);

  const handleAddNew = () => {
    const newId = String(Date.now());
    setCurrentFatId(newId);
    setIsEditModalOpen(true);
  };

  const handleSaveFATDetails = (updates: Partial<FATItem>) => {
    if (currentFatId) {
      const existingItem = fatList.find(item => item.id === currentFatId);
      if (existingItem) {
        setFatList(prevList =>
          prevList.map(item =>
            item.id === currentFatId ? { ...item, ...updates } : item
          )
        );
      } else {
        const activeContactors = getActiveContractors();
        const defaultSupplier = activeContactors.length > 0 ? activeContactors[0].name : '';
        const newItem: FATItem = {
          id: currentFatId,
          equipment: updates.equipment || '',
          supplier: updates.supplier || defaultSupplier,
          procedure: updates.procedure || '',
          location: updates.location || '',
          startDate: updates.startDate || '',
          endDate: updates.endDate || '',
          deliveryFrom: updates.deliveryFrom || '',
          deliveryTo: updates.deliveryTo || '',
          siteReadiness: updates.siteReadiness || '',
          moveInDate: updates.moveInDate || '',
        };
        setFatList(prevList => [...prevList, newItem]);
        setFatDetails(prev => ({ ...prev, [currentFatId]: [] }));
      }
    }
  };

  const handleAddDetails = (id: string) => {
    setCurrentFatId(id);
    setIsDetailsEditModalOpen(true);
  };

  const handleViewDetails = (id: string) => {
    setViewingFatId(id);
    setIsDetailsModalOpen(true);
  };

  const handleSaveDetails = (details: FATDetailItem[]) => {
    if (currentFatId) {
      setFatDetails(prev => ({ ...prev, [currentFatId]: details }));
      setFatList(prevList =>
        prevList.map(item =>
          item.id === currentFatId ? { ...item, hasDetails: details.length > 0 } : item
        )
      );
    }
    setIsDetailsEditModalOpen(false);
    setCurrentFatId(null);
  };

  const handleEdit = (id: string) => {
    setCurrentFatId(id);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    const fat = fatList.find(item => item.id === id);
    if (!fat) return;
    const fatIdentifier = fat.equipment || fat.id;
    const references = checkFATReferences(id, fatIdentifier);
    const message = generateDeleteMessage('FAT', fatIdentifier, references.references, t);
    setDeleteModal({ isOpen: true, id, message });
  };

  const handleDeleteConfirm = () => {
    if (deleteModal.id) {
      setFatList(prevList => prevList.filter(item => item.id !== deleteModal.id));
      setFatDetails(prev => {
        const newDetails = { ...prev };
        delete newDetails[deleteModal.id!];
        return newDetails;
      });
      setDeleteModal({ isOpen: false, id: null, message: '' });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button type="button" className={styles.backButton} onClick={() => navigate('/')}>
            ← {t('common.back')}
          </button>
          <h1>{t('fat.title')}</h1>
        </div>
        <div className={styles.headerRight}>
          <select
            className={styles.vendorFilter}
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
          >
            <option value="all">{t('pqp.allContractors') || 'All Contractors'}</option>
            {getActiveContractors().map((contractor) => (
              <option key={contractor.id} value={contractor.name}>
                {contractor.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('fat.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.summarySection}>
        <h2 className={styles.summaryTitle}>{t('common.filter') || '統計'}</h2>
        <div className={styles.statsContainer}>
          <div className={styles.statusStatsGrid}>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.grayIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M18 17V9M12 17V5M6 17v-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>{t('fat.stats.total')}</div>
                <div className={styles.statValue}>{statistics.total}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.blueIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>{t('fat.stats.withDetails')}</div>
                <div className={styles.statValue}>{statistics.withDetails}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.blueIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>{t('fat.stats.detailsRate')}</div>
                <div className={styles.statValue}>{statistics.detailsRate}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.listHeader}>
          <h2 className={styles.listTitle}>{t('fat.listTitle')}</h2>
          <button
            className={styles.addNewButton}
            onClick={handleAddNew}
          >
            + {t('fat.addNew')}
          </button>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>{t('fat.equipment')}</th>
              <th>{t('fat.supplier')}</th>
              <th>{t('fat.procedure')}</th>
              <th>{t('fat.location')}</th>
              <th>{t('fat.startDate')}</th>
              <th>{t('fat.endDate')}</th>
              <th>{t('fat.deliveryFrom')}</th>
              <th>{t('fat.deliveryTo')}</th>
              <th>{t('fat.siteReadiness')}</th>
              <th>{t('fat.moveInDate')}</th>
              <th>{t('common.operations')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredFatList.map((fat, index) => {
              return (
                <tr
                  key={fat.id}
                  className={styles.normalRow}
                >
                  <td>{index + 1}</td>
                  <td><span>{fat.equipment}</span></td>
                  <td><span>{fat.supplier}</span></td>
                  <td><span>{fat.procedure}</span></td>
                  <td><span>{fat.location}</span></td>
                  <td><span>{fat.startDate}</span></td>
                  <td><span>{fat.endDate}</span></td>
                  <td><span>{fat.deliveryFrom}</span></td>
                  <td><span>{fat.deliveryTo}</span></td>
                  <td><span>{fat.siteReadiness}</span></td>
                  <td><span>{fat.moveInDate}</span></td>
                  <td>
                    <div className={styles.buttonGroup}>
                      <button
                        className={`${styles.actionBtn} ${styles.editBtn}`}
                        onClick={() => handleEdit(fat.id)}
                        title={t('fat.tooltip.edit')}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.detailsBtn}`}
                        onClick={() => handleViewDetails(fat.id)}
                        title={t('fat.tooltip.details')}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.addDetailsBtn}`}
                        onClick={() => handleAddDetails(fat.id)}
                        title={t('fat.tooltip.addDetails')}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="12" y1="18" x2="12" y2="12"></line>
                          <line x1="9" y1="15" x2="15" y2="15"></line>
                        </svg>
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => handleDeleteClick(fat.id)}
                        title={t('fat.tooltip.delete')}
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

      {isEditModalOpen && currentFatId && (
        <FATEditModal
          fatId={currentFatId}
          existingItem={fatList.find(item => item.id === currentFatId)}
          onSave={handleSaveFATDetails}
          onClose={() => {
            setIsEditModalOpen(false);
            setCurrentFatId(null);
          }}
        />
      )}

      {isDetailsEditModalOpen && currentFatId && (
        <FATDetailModal
          fatId={currentFatId}
          details={fatDetails[currentFatId] || []}
          onSave={handleSaveDetails}
          onClose={() => {
            setIsDetailsEditModalOpen(false);
            setCurrentFatId(null);
          }}
        />
      )}

      {isDetailsModalOpen && viewingFatId && (
        <FATDetailsViewModal
          fatId={viewingFatId}
          fatItem={fatList.find(item => item.id === viewingFatId)}
          fatDetails={fatDetails[viewingFatId] || []}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setViewingFatId(null);
          }}
        />
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={t('common.confirmDeleteTitle')}
        message={deleteModal.message || t('fat.confirmDelete')}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, message: '' })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
      />
    </div>
  );
};

interface FATDetailModalProps {
  fatId: string;
  details: FATDetailItem[];
  onSave: (details: FATDetailItem[]) => void;
  onClose: () => void;
}

const FATDetailModal: React.FC<FATDetailModalProps> = ({ fatId, details, onSave, onClose }) => {
  const { t } = useLanguage();
  const [detailList, setDetailList] = useState<FATDetailItem[]>(details.length > 0 ? details : [{
    id: '1',
    sNo: '1',
    itemName: '',
    specification: '',
    qty: '',
    unit: '',
    acceptanceCriteria: '',
    fatActualValue: '',
    fatJudgment: '',
    remarks: '',
  }]);

  const handleAddRow = () => {
    const newId = `${fatId}-${Date.now()}`;
    const newSNo = String(detailList.length + 1);
    setDetailList([
      ...detailList,
      {
        id: newId,
        sNo: newSNo,
        itemName: '',
        specification: '',
        qty: '',
        unit: '',
        acceptanceCriteria: '',
        fatActualValue: '',
        fatJudgment: '',
        remarks: '',
      },
    ]);
  };

  const handleDeleteRow = (id: string) => {
    if (detailList.length <= 1) {
      return;
    }
    const newList = detailList.filter(item => item.id !== id);
    // 重新編號
    const renumberedList = newList.map((item, index) => ({
      ...item,
      sNo: String(index + 1),
    }));
    setDetailList(renumberedList);
  };

  const handleFieldChange = (id: string, field: keyof FATDetailItem, value: string) => {
    setDetailList(prevList =>
      prevList.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSave = () => {
    onSave(detailList);
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{t('fat.detailModalTitle')}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.tableContainer}>
            <table className={styles.detailTable}>
              <thead>
                <tr>
                  <th>{t('fat.colSNo')}<br />({t('fat.colSNo')})</th>
                  <th>{t('fat.colItemName')}<br />(Item Name)</th>
                  <th>{t('fat.colSpecification')}<br />(Specification)</th>
                  <th>{t('fat.colQty')}<br />(Qty)</th>
                  <th>{t('fat.colUnit')}<br />(Unit)</th>
                  <th>{t('fat.colAcceptanceCriteria')}<br />(Acceptance Criteria)</th>
                  <th>{t('fat.colActualValue')}<br />(FAT Actual Measured Value)</th>
                  <th>{t('fat.colJudgment')}<br />(FAT Judgment)</th>
                  <th>{t('fat.colRemarks')}<br />(Remarks)</th>
                  <th>{t('fat.colOperation')}<br />(Operation)</th>
                </tr>
              </thead>
              <tbody>
                {detailList.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="text"
                        className={styles.detailInput}
                        value={item.sNo}
                        onChange={(e) => handleFieldChange(item.id, 'sNo', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className={styles.detailInput}
                        value={item.itemName}
                        onChange={(e) => handleFieldChange(item.id, 'itemName', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className={styles.detailInput}
                        value={item.specification}
                        onChange={(e) => handleFieldChange(item.id, 'specification', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className={styles.detailInput}
                        value={item.qty}
                        onChange={(e) => handleFieldChange(item.id, 'qty', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className={styles.detailInput}
                        value={item.unit}
                        onChange={(e) => handleFieldChange(item.id, 'unit', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className={styles.detailInput}
                        value={item.acceptanceCriteria}
                        onChange={(e) => handleFieldChange(item.id, 'acceptanceCriteria', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className={styles.detailInput}
                        value={item.fatActualValue}
                        onChange={(e) => handleFieldChange(item.id, 'fatActualValue', e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        className={styles.detailSelect}
                        value={item.fatJudgment}
                        onChange={(e) => handleFieldChange(item.id, 'fatJudgment', e.target.value)}
                      >
                        <option value="">{t('common.selectPlaceholder')}</option>
                        <option value="Pass">Pass</option>
                        <option value="Fail">Fail</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        className={styles.detailInput}
                        value={item.remarks}
                        onChange={(e) => handleFieldChange(item.id, 'remarks', e.target.value)}
                      />
                    </td>
                    <td>
                      <button
                        className={styles.deleteRowButton}
                        onClick={() => handleDeleteRow(item.id)}
                        disabled={detailList.length <= 1}
                      >
                        {t('common.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.modalActions}>
            <button className={styles.addRowButton} onClick={handleAddRow}>
              + {t('fat.addRow')}
            </button>
            <div className={styles.actionButtons}>
              <button className={styles.saveButton} onClick={handleSave}>
                {t('common.save')}
              </button>
              <button className={styles.cancelButton} onClick={onClose}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FATEditModalProps {
  fatId: string;
  existingItem?: FATItem;
  onSave: (updates: Partial<FATItem>) => void;
  onClose: () => void;
}

const FATEditModal: React.FC<FATEditModalProps> = ({ fatId, existingItem, onSave, onClose }) => {
  const { t } = useLanguage();
  const { getActiveContractors } = useContractors();
  const [formData, setFormData] = useState<Partial<FATItem>>({
    equipment: existingItem?.equipment || '',
    supplier: existingItem?.supplier || '',
    procedure: existingItem?.procedure || '',
    location: existingItem?.location || '',
    startDate: existingItem?.startDate || '',
    endDate: existingItem?.endDate || '',
    deliveryFrom: existingItem?.deliveryFrom || '',
    deliveryTo: existingItem?.deliveryTo || '',
    siteReadiness: existingItem?.siteReadiness || '',
    moveInDate: existingItem?.moveInDate || '',
  });

  const handleFieldChange = (field: keyof FATItem, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{existingItem ? t('fat.editTitle') : t('fat.addTitle')}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formSections}>
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('fat.sectionInfo')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('fat.equipment')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.equipment || ''}
                    onChange={(e) => handleFieldChange('equipment', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('fat.supplier')}</label>
                  <select
                    className={styles.formSelect}
                    value={formData.supplier || ''}
                    onChange={(e) => handleFieldChange('supplier', e.target.value)}
                  >
                    <option value="">{t('common.selectContractor')}</option>
                    {getActiveContractors().map((contractor) => (
                      <option key={contractor.id} value={contractor.name}>
                        {contractor.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('fat.procedure')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.procedure || ''}
                    onChange={(e) => handleFieldChange('procedure', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('fat.location')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.location || ''}
                    onChange={(e) => handleFieldChange('location', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('fat.startDate')}</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={formData.startDate || ''}
                    onChange={(e) => handleFieldChange('startDate', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('fat.endDate')}</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={formData.endDate || ''}
                    onChange={(e) => handleFieldChange('endDate', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('fat.deliveryFrom')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.deliveryFrom || ''}
                    onChange={(e) => handleFieldChange('deliveryFrom', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('fat.deliveryTo')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.deliveryTo || ''}
                    onChange={(e) => handleFieldChange('deliveryTo', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('fat.siteReadiness')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.siteReadiness || ''}
                    onChange={(e) => handleFieldChange('siteReadiness', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('fat.moveInDate')}</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={formData.moveInDate || ''}
                    onChange={(e) => handleFieldChange('moveInDate', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.saveButton} onClick={handleSave}>
            {t('common.save')}
          </button>
          <button className={styles.cancelButton} onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

interface FATDetailsViewModalProps {
  fatId: string;
  fatItem?: FATItem;
  fatDetails: FATDetailItem[];
  onClose: () => void;
}

const FATDetailsViewModal: React.FC<FATDetailsViewModalProps> = ({ fatId, fatItem, fatDetails, onClose }) => {
  const { t } = useLanguage();
  const handlePrint = () => {
    window.print();
  };

  if (!fatItem) {
    return null;
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{t('fat.detailsTitle')}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formSections}>
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('fat.sectionBaseInfo')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('fat.equipment')}</label>
                  <div className={styles.readOnlyField}>{fatItem.equipment || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('fat.supplier')}</label>
                  <div className={styles.readOnlyField}>{fatItem.supplier || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('fat.procedure')}</label>
                  <div className={styles.readOnlyField}>{fatItem.procedure || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('fat.location')}</label>
                  <div className={styles.readOnlyField}>{fatItem.location || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('fat.startDate')}</label>
                  <div className={styles.readOnlyField}>{fatItem.startDate || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('fat.endDate')}</label>
                  <div className={styles.readOnlyField}>{fatItem.endDate || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('fat.deliveryFrom')}</label>
                  <div className={styles.readOnlyField}>{fatItem.deliveryFrom || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('fat.deliveryTo')}</label>
                  <div className={styles.readOnlyField}>{fatItem.deliveryTo || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('fat.siteReadiness')}</label>
                  <div className={styles.readOnlyField}>{fatItem.siteReadiness || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('fat.moveInDate')}</label>
                  <div className={styles.readOnlyField}>{fatItem.moveInDate || '-'}</div>
                </div>
              </div>
            </div>

            {fatDetails.length > 0 && (
              <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>{t('fat.sectionDetails')}</h3>
                <table className={styles.detailTable}>
                  <thead>
                    <tr>
                      <th>{t('fat.colSNo')}</th>
                      <th>{t('fat.colItemName')}</th>
                      <th>{t('fat.colSpecification')}</th>
                      <th>{t('fat.colQty')}</th>
                      <th>{t('fat.colUnit')}</th>
                      <th>{t('fat.colAcceptanceCriteria')}</th>
                      <th>{t('fat.colActualValue')}</th>
                      <th>{t('fat.colJudgment')}</th>
                      <th>{t('fat.colRemarks')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fatDetails.map((detail) => (
                      <tr key={detail.id}>
                        <td>{detail.sNo}</td>
                        <td>{detail.itemName}</td>
                        <td>{detail.specification}</td>
                        <td>{detail.qty}</td>
                        <td>{detail.unit}</td>
                        <td>{detail.acceptanceCriteria}</td>
                        <td>{detail.fatActualValue}</td>
                        <td>{detail.fatJudgment}</td>
                        <td>{detail.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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

export default FAT;

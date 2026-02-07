import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useContractors } from '../../context/ContractorsContext';
import { useNOI } from '../../context/NOIContext';
import { useNCR } from '../../context/NCRContext';
import { useITR, ITRItem } from '../../context/ITRContext';
import { useITP } from '../../context/ITPContext';
import { validateStatusTransition, ITRStatusTransitions } from '../../utils/statusValidation';
import { DataTable } from '@/components/Shared/DataTable/DataTable';
import { createColumns } from './columns';
import { RowSelectionState } from '@tanstack/react-table';
import ConfirmModal from '../Shared/ConfirmModal';
import styles from './ITR.module.css';

const ITR: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { getActiveContractors, contractors } = useContractors();
  const { itrList, loading, error, refetch, addITR, updateITR, deleteITR } = useITR();
  const [itrDetails, setItrDetails] = useState<{ [key: string]: ITRDetailData }>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [currentItrId, setCurrentItrId] = useState<string | null>(null);
  const [viewingItrId, setViewingItrId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; message: string }>({
    isOpen: false,
    id: null,
    message: '',
  });

  // Filter logic (replacing useTable)
  const filteredItrList = useMemo(() => {
    let data = [...itrList];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter(item =>
        (item.vendor?.toLowerCase().includes(query)) ||
        (item.documentNumber?.toLowerCase().includes(query)) ||
        (item.description?.toLowerCase().includes(query)) ||
        (item.subject?.toLowerCase().includes(query)) ||
        (item.status?.toLowerCase().includes(query)) ||
        (item.type?.toLowerCase().includes(query)) ||
        (item.ncrNumber?.toLowerCase().includes(query)) ||
        (item.foundLocation?.toLowerCase().includes(query)) ||
        (item.noiNumber?.toLowerCase().includes(query))
      );
    }
    return data;
  }, [itrList, searchQuery]);

  const statistics = useMemo(() => {
    const statusCounts = {
      approved: 0,
      reject: 0,
    };

    itrList.forEach((item) => {
      const status = item.status.toLowerCase();
      if (status === 'approved') {
        statusCounts.approved++;
      } else if (status === 'reject') {
        statusCounts.reject++;
      }
    });

    const total = itrList.length;
    const approveRate = total > 0 ? Math.round((statusCounts.approved / total) * 100) : 0;

    return {
      ...statusCounts,
      total,
      approveRate,
    };
  }, [itrList]);

  const handleViewDetails = (id: string) => {
    setViewingItrId(id);
    setIsDetailsModalOpen(true);
  };

  const handleEdit = (id: string) => {
    setCurrentItrId(id);
    setIsEditModalOpen(true);
  };

  // Reference No (documentNumber) 由後端自動產生，前端不再處理產號邏輯

  const handleAddNew = () => {
    const newId = String(Date.now());
    setCurrentItrId(newId);
    setIsEditModalOpen(true);
  };

  const handleSaveITRDetails = async (details: ITRDetailData): Promise<void> => {
    if (!currentItrId) return;
    try {
      setItrDetails(prev => ({ ...prev, [currentItrId]: details }));

      const existingItem = itrList.find(item => item.id === currentItrId);

      // documentNumber 由後端自動產生，新建時不送；更新時也不覆蓋
      const updatedItem: Record<string, unknown> = {
        vendor: details.contractor || '',
        description: details.subject || details.detailsDescription || '',
        rev: 'Rev1.0',
        submit: 'v',
        status: details.status || 'Approved',
        remark: details.remark || '',
        hasDetails: true,
        raiseDate: details.raiseDate,
        closeoutDate: details.closeoutDate,
        aconex: details.aconex,
        type: details.type,
        subject: details.subject,
        ncrNumber: details.ncrNumber,
        raisedBy: details.raisedBy,
        foundLocation: details.foundLocation,
        eventNumber: details.eventNumber,
        checkpoint: details.checkpoint,
        defectPhotos: details.defectPhotos,
        improvementPhotos: details.improvementPhotos,
      };

      if (existingItem) {
        await updateITR(currentItrId, updatedItem);
      } else {
        const newITR = await addITR(updatedItem as Omit<ITRItem, 'id'>);
        setItrDetails(prev => {
          const newDetails = { ...prev };
          newDetails[newITR.id] = details;
          return newDetails;
        });
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : (err instanceof Error ? err.message : '儲存失敗');
      alert(typeof msg === 'string' ? msg : 'ITR 儲存失敗，請確認後端已啟動（port 3001）並稍後再試。');
      throw err;
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModal({ isOpen: true, id, message: t('itr.confirmDelete') });
  };

  const getLocalizedStatus = (status: string, t: (key: string) => string) => {
    const s = (status || 'Approved').toLowerCase();
    if (s === 'approved') return t('itr.status.approved');
    if (s === 'reject') return t('itr.status.reject');
    if (s === 'in progress') return t('itr.status.inProgress');
    return status || t('itr.status.approved');
  };

  const handleDeleteConfirm = async () => {
    if (deleteModal.id) {
      await deleteITR(deleteModal.id);
      setDeleteModal({ isOpen: false, id: null, message: '' });
    }
  };

  // DataTable selection state
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [batchPrintData, setBatchPrintData] = useState<ITRItem[] | null>(null);

  // Derive selected items from rowSelection (keys are IDs)
  const selectedItems = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((id) => rowSelection[id])
      .map((id) => itrList.find((item) => item.id === id))
      .filter((item): item is ITRItem => item !== undefined);
  }, [rowSelection, itrList]);

  const handleBatchPrint = () => {
    if (selectedItems.length === 0) return;
    setBatchPrintData(selectedItems);
  };

  const handleSinglePrint = (item: ITRItem) => {
    setBatchPrintData([item]);
  };

  const groupedByContractor = useMemo(() => {
    if (!batchPrintData) return {};
    return batchPrintData.reduce((acc, itr) => {
      const key = itr.vendor || '未指定';
      if (!acc[key]) acc[key] = [];
      acc[key].push(itr);
      return acc;
    }, {} as Record<string, ITRItem[]>);
  }, [batchPrintData]);

  useEffect(() => {
    if (!batchPrintData) return;

    // Determine wait time: longer if data is large, but at least 500ms to ensure portal render
    const timer = setTimeout(() => {
      window.print();
    }, 500);

    const onAfterPrint = () => setBatchPrintData(null);
    window.addEventListener('afterprint', onAfterPrint);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, [batchPrintData]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button type="button" className={styles.backButton} onClick={() => navigate('/')}>
            ← {t('common.back')}
          </button>
          <h1>{t('itr.title')}</h1>
        </div>
        <div className={styles.headerRight}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('itr.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.summarySection}>
        <h2 className={styles.summaryTitle}>{t('common.statusStats')}</h2>
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
                <div className={styles.statLabel}>{t('itr.stats.approved')}</div>
                <div className={styles.statValue}>{statistics.approved}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.greenIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>{t('itr.stats.reject')}</div>
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
                <div className={styles.statLabel}>{t('itr.stats.total')}</div>
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
                <div className={styles.statLabel}>{t('itr.stats.approveRate')}</div>
                <div className={styles.statValue}>{statistics.approved} ({statistics.approveRate}%)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {loading && <p className={styles.loadingMessage}>載入中...</p>}
        {error && (
          <div className={styles.loadingError}>
            <p>{error}</p>
            <button type="button" className={styles.retryButton} onClick={() => refetch()}>重試</button>
          </div>
        )}
        {!loading && !error && (
          <>
            <DataTable
              title={t('itr.listTitle')}
              actions={
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className={styles.addNewButton}
                    onClick={handleAddNew}
                  >
                    + {t('itr.addNew')}
                  </button>
                  <button
                    className={styles.printButton}
                    onClick={handleBatchPrint}
                    disabled={selectedItems.length === 0}
                    title={selectedItems.length === 0 ? t('itr.tooltip.print') : t('itr.tooltip.printCount', { count: selectedItems.length })}
                  >
                    {t('itr.batchPrint') || 'Batch Print'}
                  </button>
                </div>
              }
              columns={createColumns(handleEdit, handleViewDetails, handleDeleteClick, navigate, t)}
              data={filteredItrList}
              searchKey=""
              getRowClassName={(row) =>
                row.status === 'Approved' ? 'bg-emerald-100/50 text-gray-500 hover:bg-emerald-200/50' :
                  row.status === 'Reject' ? 'bg-pink-100/50 text-gray-500 hover:bg-pink-200/50' : ''
              }
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              getRowId={(row) => row.id}
            />
          </>
        )}
      </div>

      {batchPrintData &&
        ReactDOM.createPortal(
          <div id="itr-batch-print-root" className={styles.itrBatchPrintRoot}>
            {Object.entries(groupedByContractor).map(([contractor, items], pageIndex) => (
              <div
                key={contractor}
                className={styles.itrBatchPrintPage}
                style={pageIndex > 0 ? { pageBreakBefore: 'always' } : undefined}
              >
                <div className={styles.itrBatchPrintTitle}>
                  <h1>批次檢驗與測試報告 (ITR)</h1>
                  <p>列印日期：{new Date().toLocaleDateString('zh-TW')}</p>
                </div>

                <div className={styles.itrBatchPrintCommon}>
                  <div className={styles.itrBatchPrintGrid}>
                    <div className={styles.itrBatchPrintField}>
                      <label>承包商 (Contractor)</label>
                      <div className={styles.itrBatchPrintValue}>{contractor}</div>
                    </div>
                    <div className={styles.itrBatchPrintField}>
                      <label>檢驗日期 (Inspection Date)</label>
                      <div className={styles.itrBatchPrintValue}>{items[0]?.raiseDate ?? '-'}</div>
                    </div>
                    <div className={styles.itrBatchPrintField}>
                      <label>聯絡人 (Contact)</label>
                      <div className={styles.itrBatchPrintValue}>-</div>
                    </div>
                    <div className={styles.itrBatchPrintField}>
                      <label>電話 (Phone)</label>
                      <div className={styles.itrBatchPrintValue}>-</div>
                    </div>
                  </div>
                </div>

                <div className={styles.itrBatchPrintList}>
                  <h3>ITR 資料列表</h3>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>共 {items.length} 筆</p>
                  <table className={styles.itrBatchPrintListTable}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Reference No.</th>
                        <th>Subject (Package)</th>
                        <th>NOI No.</th>
                        <th>NCR No.</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id}>
                          <td>{index + 1}</td>
                          <td>{item.documentNumber}</td>
                          <td>{item.subject || item.description || '-'}</td>
                          <td>{item.noiNumber || '-'}</td>
                          <td>{item.ncrNumber || '-'}</td>
                          <td>{getLocalizedStatus(item.status, t)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>,
          document.body
        )}

      {isEditModalOpen && currentItrId && (
        <ITRDetailModal
          itrId={currentItrId}
          existingData={itrDetails[currentItrId]}
          existingItem={itrList.find(item => item.id === currentItrId)}
          itrList={itrList}
          onSave={handleSaveITRDetails}
          onClose={() => {
            setIsEditModalOpen(false);
            setCurrentItrId(null);
          }}
        />
      )}

      {isDetailsModalOpen && viewingItrId && (
        <ITRDetailsViewModal
          itrId={viewingItrId}
          itrItem={itrList.find(item => item.id === viewingItrId)}
          itrDetailData={itrDetails[viewingItrId]}
          onClose={() => {
            setViewingItrId(null);
          }}
          onPrint={() => {
            const item = itrList.find(item => item.id === viewingItrId);
            if (item) handleSinglePrint(item);
          }}
        />
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={t('common.confirmDelete')}
        message={deleteModal.message}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, message: '' })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
      />
    </div>
  );
};

interface ITRDetailData {
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
  ncrNumber: string;  // 若檢驗失敗，連結到產生的 NCR
  raisedBy: string;
  serialNumbers: string;
  repairMethodStatement: string;
  immediateCorrectionAction: string;
  rootCauseAnalysis: string;
  correctiveActions: string;
  preventiveAction: string;
  finalProductIntegrityStatement: string;
  reInspectionNumber: string;
  noiNumber: string;  // 連結到產生此 ITR 的 NOI
  projectQualityManager: string;
  defectPhotos: string[];
  improvementPhotos: string[];
  eventNumber: string;
  checkpoint: string;
}

interface ITRDetailModalProps {
  itrId: string | null;
  existingData?: ITRDetailData;
  existingItem?: ITRItem;
  itrList: ITRItem[];
  onSave: (details: ITRDetailData) => void | Promise<void>;
  onClose: () => void;
}

const ITRDetailModal: React.FC<ITRDetailModalProps> = ({ itrId, existingData, existingItem, itrList: propItrList, onSave, onClose }) => {
  const { t } = useLanguage();
  const { getActiveContractors, contractors } = useContractors();

  if (!itrId) {
    return null;
  }
  const { getNOIList } = useNOI();
  const { getNCRList } = useNCR();
  const { itrList: contextItrList } = useITR();
  const { getITPList } = useITP();

  // Use context list if available, otherwise use prop
  const itrList = contextItrList.length > 0 ? contextItrList : propItrList;

  // Reference No (documentNumber) 由後端自動產生，前端不再處理產號邏輯

  // Initialize form data from existing data or existing item
  const getInitialData = (): ITRDetailData => {
    if (existingData) {
      return { ...existingData };
    }
    if (existingItem) {
      return {
        itrNumber: existingItem.documentNumber || '',  // 既有編號，顯示用
        status: existingItem.status || 'Approved',
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
        ncrNumber: existingItem.ncrNumber || '',
        raisedBy: existingItem.raisedBy || '',
        serialNumbers: '',
        repairMethodStatement: '',
        immediateCorrectionAction: '',
        rootCauseAnalysis: '',
        correctiveActions: '',
        preventiveAction: '',
        finalProductIntegrityStatement: '',
        reInspectionNumber: '',
        noiNumber: existingItem.noiNumber || '',  // 連結到產生此 ITR 的 NOI
        eventNumber: existingItem.eventNumber || '',
        checkpoint: existingItem.checkpoint || '',
        projectQualityManager: '',
        defectPhotos: existingItem.defectPhotos || [],
        improvementPhotos: existingItem.improvementPhotos || [],
      };
    }
    // 新項目：itrNumber 留空，由後端自動產生
    return {
      itrNumber: '',  // 由後端產生
      status: 'Approved',
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
      ncrNumber: '',
      raisedBy: '',
      serialNumbers: '',
      repairMethodStatement: '',
      immediateCorrectionAction: '',
      rootCauseAnalysis: '',
      correctiveActions: '',
      preventiveAction: '',
      finalProductIntegrityStatement: '',
      reInspectionNumber: '',
      noiNumber: '',  // 連結到產生此 ITR 的 NOI
      eventNumber: '',
      checkpoint: '',
      projectQualityManager: '',
      defectPhotos: [],
      improvementPhotos: [],
    };
  };

  const [formData, setFormData] = useState<ITRDetailData>(getInitialData());

  const VERSION_OPTIONS = ['Rev1.0', 'Rev2.0', 'Rev3.0', 'Rev4.0'];
  const [versionMode, setVersionMode] = useState<'select' | 'custom'>(() => {
    const currentVersion = formData.type;
    if (currentVersion && !VERSION_OPTIONS.includes(currentVersion)) {
      return 'custom';
    }
    return 'select';
  });

  // Reference No 由後端自動產生，不再於前端自動更新

  const handleFieldChange = (field: keyof ITRDetailData, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Status validation
      if (field === 'status' && prev.status) {
        const validation = validateStatusTransition(prev.status, value, ITRStatusTransitions);
        if (!validation.allowed) {
          alert(validation.message || t('common.invalidStatusTransition'));
          return prev;
        }
      }

      return updated;
    });
  };

  const handleDateButton = (field: keyof ITRDetailData) => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}_`;
    setFormData(prev => ({
      ...prev,
      [field]: prev[field] ? `${prev[field]}\n${dateStr}` : dateStr
    }));
  };

  const handleNAButton = (field: keyof ITRDetailData) => {
    setFormData(prev => ({ ...prev, [field]: 'Not Applicable' }));
  };

  const handleTBCButton = (field: keyof ITRDetailData) => {
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

  const handleSave = async () => {
    try {
      await onSave(formData);
      onClose();
    } catch (_) {
      // 錯誤已在父層 handleSaveITRDetails 以 alert 顯示，保持 modal 開啟
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{existingData || existingItem ? t('itr.editTitle') : t('itr.addTitle')}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.formRequiredHint}>{t('form.requiredHint')}</p>
          <div className={styles.formSections}>
            {/* {t('common.baseInfo') || '基本資訊'} */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('common.baseInfo') || '基本資訊'}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.optionalLabel}>{t('common.referenceNo')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.itrNumber || t('form.autoGenerated')}
                    readOnly
                    style={{ backgroundColor: '#D9D9D9', cursor: 'not-allowed' }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('itr.noiNo')} ({t('form.source')})</label>
                  <select
                    className={styles.formSelect}
                    value={formData.noiNumber}
                    onChange={(e) => {
                      const selectedRef = e.target.value;
                      handleFieldChange('noiNumber', selectedRef);

                      // Auto-fill Inspection Date from selected NOI
                      if (selectedRef) {
                        const selectedNOI = getNOIList().find(n => n.referenceNo === selectedRef);
                        if (selectedNOI) {
                          if (selectedNOI.inspectionDate) {
                            handleFieldChange('raiseDate', selectedNOI.inspectionDate);
                          }
                          if (selectedNOI.package) {
                            handleFieldChange('subject', `ITR-${selectedNOI.package}`);
                          }
                          if (selectedNOI.contractor) {
                            handleFieldChange('contractor', selectedNOI.contractor);
                          }
                        }
                      }
                    }}
                  >
                    <option value="">{t('itr.selectNOI')}</option>
                    {getNOIList().map((noi) => (
                      <option key={noi.id} value={noi.referenceNo || ''}>
                        {noi.referenceNo || `(${t('common.notGenerated')})`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={formData.noiNumber ? styles.optionalLabel : ''}>{t('common.contractor')}</label>
                  {formData.noiNumber ? (
                    <input
                      type="text"
                      className={styles.formInput}
                      value={formData.contractor}
                      readOnly
                      style={{ backgroundColor: '#D9D9D9', cursor: 'not-allowed' }}
                    />
                  ) : (
                    <select
                      className={styles.formSelect}
                      value={formData.contractor}
                      onChange={(e) => handleFieldChange('contractor', e.target.value)}
                    >
                      <option value="">{t('common.selectContractor')}</option>
                      {getActiveContractors().map((contractor) => (
                        <option key={contractor.id} value={contractor.name}>
                          {contractor.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label className={formData.noiNumber ? styles.optionalLabel : ''}>{t('noi.package')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.subject}
                    onChange={(e) => handleFieldChange('subject', e.target.value)}
                    readOnly={!!formData.noiNumber}
                    style={formData.noiNumber ? { backgroundColor: '#D9D9D9', cursor: 'not-allowed' } : {}}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={formData.noiNumber ? styles.optionalLabel : ''}>{t('itr.inspectionDate')}</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={formData.raiseDate}
                    onChange={(e) => handleFieldChange('raiseDate', e.target.value)}
                    lang="en"
                    readOnly={!!formData.noiNumber}
                    style={formData.noiNumber ? { backgroundColor: '#D9D9D9', cursor: 'not-allowed' } : {}}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('common.version')}</label>
                  {versionMode === 'select' && (
                    <select
                      className={styles.formSelect}
                      value={VERSION_OPTIONS.includes(formData.type || '') ? formData.type : 'Rev1.0'}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'custom') {
                          setVersionMode('custom');
                          handleFieldChange('type', '');
                        } else {
                          setVersionMode('select');
                          handleFieldChange('type', value);
                        }
                      }}
                    >
                      {VERSION_OPTIONS.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                      <option value="custom">{t('itr.revCustom')}</option>
                    </select>
                  )}
                  {versionMode === 'custom' && (
                    <input
                      type="text"
                      className={styles.formInput}
                      value={formData.type || ''}
                      onChange={(e) => handleFieldChange('type', e.target.value)}
                      placeholder={t('itr.revCustomPlaceholder')}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* 照片上傳 */}
            <div className={styles.formSection}>
              <div className={styles.photoSectionContainer}>
                <div className={styles.photoSection}>
                  <h3 className={styles.sectionTitle}>{t('itr.photo.defect')}</h3>
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
                      <span>+ {t('itr.photo.upload')}</span>
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
                              aria-label={t('common.delete')}
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
                  <h3 className={styles.sectionTitle}>{t('itr.photo.improvement')}</h3>
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
                      <span>+ {t('itr.photo.upload')}</span>
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
                              aria-label={t('common.delete')}
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

            {/* 人員與位置資訊 */}

            {/* 複檢資料 */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('itr.sectionReinspection')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('itr.reInspectionNo')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.reInspectionNumber}
                    onChange={(e) => handleFieldChange('reInspectionNumber', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 品質評估 */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('itr.sectionQuality')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('common.status')}</label>
                  <select
                    className={styles.formSelect}
                    value={formData.status}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                  >
                    <option value="Approved">{t('itr.status.approved')}</option>
                    <option value="Reject">{t('itr.status.reject')}</option>
                    <option value="In Progress">{t('itr.status.inProgress')}</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.optionalLabel}>{t('itr.closeoutDate')}</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={formData.closeoutDate}
                    onChange={(e) => handleFieldChange('closeoutDate', e.target.value)}
                    lang="en"
                  />
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
          </div>
        </div>
      </div>
    </div>
  );
};

interface ITRDetailsViewModalProps {
  itrId: string;
  itrItem?: ITRItem;
  itrDetailData?: ITRDetailData;
  onClose: () => void;
  onPrint: () => void;
}

const ITRDetailsViewModal: React.FC<ITRDetailsViewModalProps> = ({ itrId, itrItem, itrDetailData, onClose, onPrint }) => {
  const { t } = useLanguage();
  // Combine data from both sources, with detailData taking precedence
  const displayData: ITRDetailData = {
    itrNumber: itrDetailData?.itrNumber || itrItem?.documentNumber || '',
    status: itrDetailData?.status || itrItem?.status || 'Approved',
    raiseDate: itrDetailData?.raiseDate || itrItem?.raiseDate || '',
    closeoutDate: itrDetailData?.closeoutDate || itrItem?.closeoutDate || '',
    aconex: itrDetailData?.aconex || itrItem?.aconex || '',
    type: itrDetailData?.type || itrItem?.type || '',
    contractor: itrDetailData?.contractor || itrItem?.vendor || '',
    remark: itrDetailData?.remark || itrItem?.remark || '',
    subject: itrDetailData?.subject || itrItem?.subject || itrItem?.description || '',
    referenceStandards: itrDetailData?.referenceStandards || '',
    detailsDescription: itrDetailData?.detailsDescription || itrItem?.description || '',
    foundLocation: itrDetailData?.foundLocation || itrItem?.foundLocation || '',
    ncrNumber: itrDetailData?.ncrNumber || itrItem?.ncrNumber || '',
    raisedBy: itrDetailData?.raisedBy || itrItem?.raisedBy || '',
    serialNumbers: itrDetailData?.serialNumbers || '',
    repairMethodStatement: itrDetailData?.repairMethodStatement || '',
    immediateCorrectionAction: itrDetailData?.immediateCorrectionAction || '',
    rootCauseAnalysis: itrDetailData?.rootCauseAnalysis || '',
    correctiveActions: itrDetailData?.correctiveActions || '',
    preventiveAction: itrDetailData?.preventiveAction || '',
    finalProductIntegrityStatement: itrDetailData?.finalProductIntegrityStatement || '',
    reInspectionNumber: itrDetailData?.reInspectionNumber || '',
    noiNumber: itrDetailData?.noiNumber || itrItem?.noiNumber || '',  // 連結到產生此 ITR 的 NOI
    projectQualityManager: itrDetailData?.projectQualityManager || '',
    defectPhotos: itrDetailData?.defectPhotos || [],
    improvementPhotos: itrDetailData?.improvementPhotos || [],
    eventNumber: itrDetailData?.eventNumber || '',
    checkpoint: itrDetailData?.checkpoint || '',
  };

  const handlePrint = () => {
    onPrint();
  };

  const getLocalizedStatus = (status: string) => {
    const s = (status || 'Approved').toLowerCase();
    if (s === 'approved') return t('itr.status.approved');
    if (s === 'reject') return t('itr.status.reject');
    if (s === 'in progress') return t('itr.status.inProgress');
    return status || t('itr.status.approved');
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{t('itr.detailsTitle')}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formSections}>
            {/* {t('common.baseInfo') || '基本資訊'} */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('itr.sectionInfo')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('common.referenceNo')}</label>
                  <div className={styles.readOnlyField}>{displayData.itrNumber || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('noi.package')}</label>
                  <div className={styles.readOnlyField}>{displayData.subject || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('itr.inspectionDate')}</label>
                  <div className={styles.readOnlyField}>{displayData.raiseDate || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('common.version')}</label>
                  <div className={styles.readOnlyField}>{displayData.type || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('itr.noiNo')}</label>
                  <div className={styles.readOnlyField}>{displayData.noiNumber || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('common.contractor')}</label>
                  <div className={styles.readOnlyField}>{displayData.contractor || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('itr.ncrNo')}</label>
                  <div className={styles.readOnlyField}>{displayData.ncrNumber || '-'}</div>
                </div>
              </div>
            </div>

            {/* 照片 */}
            {(displayData.defectPhotos?.length > 0 || displayData.improvementPhotos?.length > 0) && (
              <div className={styles.formSection}>
                <div className={styles.photoSectionContainer}>
                  {displayData.defectPhotos && displayData.defectPhotos.length > 0 && (
                    <div className={styles.photoSection}>
                      <h3 className={styles.sectionTitle}>{t('itr.photo.defect')}</h3>
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
                      <h3 className={styles.sectionTitle}>{t('itr.photo.improvement')}</h3>
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

            {/* 人員與位置資訊 */}

            {/* 複檢資料 */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('itr.sectionReinspection')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('itr.reInspectionNo')}</label>
                  <div className={styles.readOnlyField}>{displayData.reInspectionNumber || '-'}</div>
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

export default ITR;


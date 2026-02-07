import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useContractors } from '../../context/ContractorsContext';
import { useNOI, NOIItem } from '../../context/NOIContext';
import { useITP } from '../../context/ITPContext';
import { useNCR } from '../../context/NCRContext';
import { useITR } from '../../context/ITRContext';
import { checkNOIReferences, generateDeleteMessage } from '../../utils/cascadeDelete';
import { validateStatusTransition, NOIStatusTransitions } from '../../utils/statusValidation';
import ConfirmModal from '../Shared/ConfirmModal';
import styles from './NOI.module.css';


const formatTime24h = (timeStr: string | undefined): string => {
  if (!timeStr) return '-';
  // If already matches HH:mm or HH:mm:ss, just ensure HH:mm
  const match = timeStr.match(/^(\d{1,2}):(\d{1,2})/);
  if (match) {
    const hours = match[1].padStart(2, '0');
    const minutes = match[2].padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  return timeStr;
};

const getLocalizedStatus = (status: string | undefined, t: any) => {
  const s = (status || 'Open').toLowerCase();
  if (s === 'open') return t('noi.status.open');
  if (s === 'closed') return t('noi.status.closed');
  if (s === 'under review') return t('noi.status.underReview');
  if (s === 'reject') return t('noi.status.reject');
  return status || t('noi.status.open');
};

type SortKey = keyof NOIItem;
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const NOI: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { getActiveContractors } = useContractors();
  const { noiList, loading, error, refetch, addNOI, addBulkNOI, updateNOI, deleteNOI } = useNOI();
  const { ncrList } = useNCR();
  const { itrList } = useITR();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [contractorFilter, setContractorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ncrFilter, setNcrFilter] = useState<string>('all'); // 'all' | 'ncr_only'
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // Sort State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'issueDate', direction: 'desc' });

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [currentNoiId, setCurrentNoiId] = useState<string | null>(null);
  const [viewingNoiId, setViewingNoiId] = useState<string | null>(null);
  const [noiDetails, setNoiDetails] = useState<{ [key: string]: NOIDetailData }>({});
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; message: string }>({
    isOpen: false,
    id: null,
    message: '',
  });
  const [selectedNoiIds, setSelectedNoiIds] = useState<Set<string>>(new Set());
  const [batchPrintData, setBatchPrintData] = useState<NOIItem[] | null>(null);

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const filteredNoiList = useMemo(() => {
    let filtered = [...noiList];

    // Filter by Contractor
    if (contractorFilter !== 'all') {
      filtered = filtered.filter(item => item.contractor === contractorFilter);
    }

    // Filter by Status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => (item.status || 'Open') === statusFilter);
    }

    // Filter: 僅 NCR 重新檢驗
    if (ncrFilter === 'ncr_only') {
      filtered = filtered.filter(item => !!(item.ncrNumber && item.ncrNumber.trim()));
    }

    // Filter by Date (Issue Date)
    if (dateFilter.start) {
      filtered = filtered.filter(item => item.issueDate >= dateFilter.start);
    }
    if (dateFilter.end) {
      filtered = filtered.filter(item => item.issueDate <= dateFilter.end);
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.package.toLowerCase().includes(query) ||
        item.referenceNo.toLowerCase().includes(query) ||
        item.itpNo.toLowerCase().includes(query) ||
        item.ncrNumber?.toLowerCase().includes(query) ||
        item.eventNumber?.toLowerCase().includes(query) ||
        item.checkpoint?.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query) ||
        item.contractor.toLowerCase().includes(query) ||
        (item.contacts && item.contacts.toLowerCase().includes(query))
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
  }, [noiList, searchQuery, contractorFilter, statusFilter, ncrFilter, dateFilter, sortConfig]);

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <span className={styles.sortIcon}>↕</span>;
    return sortConfig.direction === 'asc' ? <span className={styles.sortIcon}>↑</span> : <span className={styles.sortIcon}>↓</span>;
  };

  const toggleSelect = (id: string) => {
    setSelectedNoiIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedNoiIds.size === filteredNoiList.length) {
      setSelectedNoiIds(new Set());
    } else {
      setSelectedNoiIds(new Set(filteredNoiList.map(n => n.id)));
    }
  };

  const handleBatchPrint = () => {
    const items = noiList.filter(n => selectedNoiIds.has(n.id))
      .map(item => {
        // Merge with full details if available locally
        const details = noiDetails[item.id];
        if (details) {
          return { ...item, attachments: details.attachments || [] };
        }
        return item;
      });
    if (items.length === 0) return;
    setBatchPrintData(items);
  };

  const handleSinglePrint = (item: NOIItem) => {
    // Merge with full details if available locally
    const details = noiDetails[item.id];
    const itemToPrint = details
      ? { ...item, attachments: details.attachments || [] }
      : item;
    setBatchPrintData([itemToPrint]);
  };

  // 按 Contractor 分組（用於列印時每個廠商一頁）
  const groupedByContractor = useMemo(() => {
    if (!batchPrintData) return {};
    return batchPrintData.reduce((acc, noi) => {
      const key = noi.contractor || '未指定';
      if (!acc[key]) acc[key] = [];
      acc[key].push(noi);
      return acc;
    }, {} as Record<string, NOIItem[]>);
  }, [batchPrintData]);

  useEffect(() => {
    if (!batchPrintData) return;

    // Determine wait time: 1000ms to ensure portal render and image decoding
    const timer = setTimeout(() => {
      window.print();
    }, 1000);

    const onAfterPrint = () => setBatchPrintData(null);
    window.addEventListener('afterprint', onAfterPrint);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, [batchPrintData]);

  const statistics = useMemo(() => {
    const statusCounts: Record<string, number> = {
      opening: 0,
      closed: 0,
      reject: 0,
    };

    noiList.forEach((item) => {
      const status = (item.status || 'Open').toLowerCase();
      if (status === 'open') {
        statusCounts.opening++;
      } else if (status === 'closed') {
        statusCounts.closed++;
      } else if (status === 'reject') {
        statusCounts.reject = (statusCounts.reject || 0) + 1;
      }
    });

    const total = noiList.length;
    const openRate = total > 0 ? Math.round((statusCounts.opening / total) * 100) : 0;

    return {
      ...statusCounts,
      opening: statusCounts.opening,
      closed: statusCounts.closed,
      reject: statusCounts.reject || 0,
      total,
      openRate,
    };
  }, [noiList]);

  const handleEdit = (id: string) => {
    setCurrentNoiId(id);
    setIsModalOpen(true);
  };

  const handleViewDetails = (id: string) => {
    setViewingNoiId(id);
    setIsDetailsModalOpen(true);
  };

  const handleAddNew = () => {
    const newId = String(Date.now());
    setCurrentNoiId(newId);
    setIsModalOpen(true);
  };

  const handleSaveNOIDetails = async (details: NOIDetailData) => {
    if (currentNoiId) {
      // Save full details
      setNoiDetails(prev => ({ ...prev, [currentNoiId]: details }));

      const existingItem = noiList.find(item => item.id === currentNoiId);

      const updatedItem: NOIItem = {
        id: currentNoiId,
        package: details.package || '',
        referenceNo: details.referenceNo || '',
        issueDate: details.issueDate || '',
        inspectionDate: details.inspectionDate || '',
        inspectionTime: details.inspectionTime || '',
        itpNo: details.itpNo || '',
        eventNumber: details.eventNumber || '',
        checkpoint: details.checkpoint || '',
        type: details.type || '',
        contractor: details.contractor || '',
        contacts: details.contacts || '',
        phone: details.phone || '',
        email: details.email || '',
        status: details.status || 'Open',
        attachments: details.attachments || [],
        ncrNumber: details.ncrNumber || '',  // 若此 NOI 是針對 NCR 的重新檢驗
      };

      if (existingItem) {
        await updateNOI(currentNoiId, updatedItem);
      } else {
        await addNOI(updatedItem, currentNoiId);
      }
    }
    setIsModalOpen(false);
    setCurrentNoiId(null);
  };

  const handleDeleteClick = (id: string) => {
    const noi = noiList.find(item => item.id === id);
    if (!noi) return;
    const references = checkNOIReferences(id, noi.referenceNo, itrList, ncrList);
    const message = generateDeleteMessage('NOI', noi.referenceNo, references.references, t);
    setDeleteModal({ isOpen: true, id, message });
  };

  const handleDeleteConfirm = async () => {
    if (deleteModal.id) {
      await deleteNOI(deleteModal.id);
      setDeleteModal({ isOpen: false, id: null, message: '' });
    }
  };

  const handleAdd = (id: string) => {
    navigate(`/noi/${id}`);
  };



  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button type="button" className={styles.backButton} onClick={() => navigate('/')}>
            ← {t('common.back')}
          </button>
          <h1>{t('noi.title')}</h1>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.filterGroup} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select
              className={styles.contractorFilter}
              value={contractorFilter}
              onChange={(e) => setContractorFilter(e.target.value)}
            >
              <option value="all">{t('pqp.allContractors')}</option>
              {getActiveContractors().map((contractor) => (
                <option key={contractor.id} value={contractor.name}>
                  {contractor.name}
                </option>
              ))}
            </select>
            <select
              className={styles.contractorFilter}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t('pqp.allStatus')}</option>
              <option value="Open">{t('noi.status.open')}</option>
              <option value="Under Review">{t('noi.status.underReview')}</option>
              <option value="Closed">{t('noi.status.closed')}</option>
            </select>
            <select
              className={styles.contractorFilter}
              value={ncrFilter}
              onChange={(e) => setNcrFilter(e.target.value)}
            >
              <option value="all">{t('common.all')}</option>
              <option value="ncr_only">{t('noi.ncrOnly')}</option>
            </select>
            <input
              type="date"
              className={styles.contractorFilter}
              style={{ width: 'auto', minWidth: 'auto', paddingRight: '10px' }}
              value={dateFilter.start}
              onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
              placeholder={t('pqp.startDate')}
            />
            <span style={{ color: '#6b7280' }}>-</span>
            <input
              type="date"
              className={styles.contractorFilter}
              style={{ width: 'auto', minWidth: 'auto', paddingRight: '10px' }}
              value={dateFilter.end}
              onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
              placeholder={t('pqp.endDate')}
            />
          </div>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('noi.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.summarySection}>
        <h2 className={styles.summaryTitle}>{t('pqp.statusStats')}</h2>
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
                <div className={styles.statLabel}>{t('noi.stats.open')}</div>
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
                <div className={styles.statLabel}>{t('noi.stats.closed')}</div>
                <div className={styles.statValue}>{statistics.closed}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.redIcon}`} style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>{t('noi.status.reject')}</div>
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
                <div className={styles.statLabel}>{t('noi.stats.total')}</div>
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
                <div className={styles.statLabel}>{t('noi.stats.openRate')}</div>
                <div className={styles.statValue}>{statistics.opening} ({statistics.openRate}%)</div>
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
            <div className={styles.listHeader}>
              <h2 className={styles.listTitle}>{t('noi.listTitle')}</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={styles.addNewButton}
                  onClick={handleAddNew}
                >
                  + {t('noi.addNew')}
                </button>
                <button
                  className={styles.addNewButton}
                  onClick={() => setIsBulkModalOpen(true)}
                  style={{ backgroundColor: '#059669' }}
                >
                  + {t('noi.bulkAdd')}
                </button>
                <button
                  className={styles.printButton}
                  onClick={handleBatchPrint}
                  disabled={selectedNoiIds.size === 0}
                  title={selectedNoiIds.size === 0 ? t('noi.tooltip.print') : t('noi.tooltip.printCount', { count: selectedNoiIds.size })}
                >
                  {t('noi.batchPrint')}
                </button>
              </div>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.checkboxColumn}>
                    <input
                      type="checkbox"
                      checked={filteredNoiList.length > 0 && selectedNoiIds.size === filteredNoiList.length}
                      onChange={toggleSelectAll}
                      title={t('common.all')}
                    />
                  </th>
                  <th>#</th>
                  <th onClick={() => handleSort('referenceNo')} className={styles.sortableHeader}>
                    <div className={styles.headerContent}>
                      {t('common.referenceNo')} {renderSortIcon('referenceNo')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('status')} className={styles.sortableHeader}>
                    <div className={styles.headerContent}>
                      {t('common.status')} {renderSortIcon('status')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('contractor')} className={styles.sortableHeader}>
                    <div className={styles.headerContent}>
                      {t('common.contractor')} {renderSortIcon('contractor')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('package')} className={styles.sortableHeader}>
                    <div className={styles.headerContent}>
                      {t('noi.package')} {renderSortIcon('package')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('itpNo')} className={styles.sortableHeader}>
                    <div className={styles.headerContent}>
                      {t('noi.itpNo')} {renderSortIcon('itpNo')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('ncrNumber')} className={styles.sortableHeader}>
                    <div className={styles.headerContent}>
                      {t('itr.ncrNo')} {renderSortIcon('ncrNumber')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('issueDate')} className={styles.sortableHeader}>
                    <div className={styles.headerContent}>
                      {t('noi.issueDate')} {renderSortIcon('issueDate')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('inspectionDate')} className={styles.sortableHeader}>
                    <div className={styles.headerContent}>
                      {t('noi.inspectionDate')} {renderSortIcon('inspectionDate')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('inspectionTime')} className={styles.sortableHeader}>
                    <div className={styles.headerContent}>
                      {t('noi.inspectionTime')} {renderSortIcon('inspectionTime')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('eventNumber')} className={styles.sortableHeader}>
                    <div className={styles.headerContent}>
                      {t('noi.eventNo')} {renderSortIcon('eventNumber')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('checkpoint')} className={styles.sortableHeader}>
                    <div className={styles.headerContent}>
                      {t('noi.checkpoint')} {renderSortIcon('checkpoint')}
                    </div>
                  </th>
                  <th>{t('common.operations')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredNoiList.map((noi, index) => {
                  // Check if row should be green (Status is Closed)
                  const isClosedRow = (noi.status || 'Open').toLowerCase() === 'closed';

                  return (
                    <tr key={noi.id} className={isClosedRow ? styles.greenRow : styles.normalRow}>
                      <td className={styles.checkboxColumn}>
                        <input
                          type="checkbox"
                          checked={selectedNoiIds.has(noi.id)}
                          onChange={() => toggleSelect(noi.id)}
                        />
                      </td>
                      <td>{index + 1}</td>
                      <td><span>{noi.referenceNo}</span></td>
                      <td><span>{getLocalizedStatus(noi.status, t)}</span></td>
                      <td><span>{noi.contractor}</span></td>
                      <td><span>{noi.package}</span></td>
                      <td><span>{noi.itpNo}</span></td>
                      <td><span>{noi.ncrNumber || '-'}</span></td>
                      <td><span>{noi.issueDate}</span></td>
                      <td><span>{noi.inspectionDate}</span></td>
                      <td><span>{formatTime24h(noi.inspectionTime)}</span></td>
                      <td><span>{noi.eventNumber || '-'}</span></td>
                      <td><span>{noi.checkpoint || '-'}</span></td>
                      <td>
                        <div className={styles.buttonGroup}>
                          <button
                            className={`${styles.actionBtn} ${styles.editBtn}`}
                            onClick={() => handleEdit(noi.id)}
                            title={t('noi.tooltip.edit')}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.detailsBtn}`}
                            onClick={() => handleViewDetails(noi.id)}
                            title={t('noi.tooltip.details')}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                          {itrList.filter(itr => itr.noiNumber === noi.referenceNo).length > 0 && (
                            <button
                              className={styles.relatedBtn}
                              onClick={() => navigate('/itr')}
                              title={t('noi.tooltip.viewRelatedITR', { count: itrList.filter(itr => itr.noiNumber === noi.referenceNo).length })}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                              </svg>
                              {itrList.filter(itr => itr.noiNumber === noi.referenceNo).length}
                            </button>
                          )}
                          <button
                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            onClick={() => handleDeleteClick(noi.id)}
                            title={t('noi.tooltip.delete')}
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

      {isModalOpen && (
        <NOIDetailModal
          noiId={currentNoiId}
          existingData={currentNoiId ? noiDetails[currentNoiId] : undefined}
          existingItem={currentNoiId ? noiList.find(item => item.id === currentNoiId) : undefined}
          noiList={noiList}
          onSave={handleSaveNOIDetails}
          onClose={() => {
            setIsModalOpen(false);
            setCurrentNoiId(null);
          }}
        />
      )}

      {isDetailsModalOpen && viewingNoiId && (
        <NOIDetailsViewModal
          noiId={viewingNoiId}
          noiItem={noiList.find(item => item.id === viewingNoiId)}
          noiDetailData={noiDetails[viewingNoiId]}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setViewingNoiId(null);
          }}
          onPrint={(data) => {
            // Convert NOIDetailData back to NOIItem for the print logic
            const printItem: NOIItem = {
              ...data,
              id: viewingNoiId,
            } as NOIItem;
            handleSinglePrint(printItem);
          }}
        />
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="確認刪除"
        message={deleteModal.message || '確定要刪除此 NOI 項目嗎？'}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, message: '' })}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {batchPrintData &&
        ReactDOM.createPortal(
          <div id="noi-batch-print-root" className={styles.noiBatchPrintRoot}>
            {/* 每個 Contractor 一頁 */}
            {Object.entries(groupedByContractor).map(([contractor, items], pageIndex) => (
              <div
                key={contractor}
                className={styles.noiBatchPrintPage}
                style={pageIndex > 0 ? { pageBreakBefore: 'always' } : undefined}
              >
                {/* 標題 */}
                <div className={styles.noiBatchPrintTitle}>
                  <h1>批次檢驗通知 (NOI)</h1>
                  <p>列印日期：{new Date().toLocaleDateString('zh-TW')}</p>
                </div>

                {/* 共同欄位區 */}
                <div className={styles.noiBatchPrintCommon}>
                  <div className={styles.noiBatchPrintGrid}>
                    <div className={styles.noiBatchPrintField}>
                      <label>承包商</label>
                      <div className={styles.noiBatchPrintValue}>{contractor}</div>
                    </div>
                    <div className={styles.noiBatchPrintField}>
                      <label>發出日期 (Issue Date)</label>
                      <div className={styles.noiBatchPrintValue}>{items[0]?.issueDate ?? '-'}</div>
                    </div>
                    <div className={styles.noiBatchPrintField}>
                      <label>檢驗日期 (Inspection Date)</label>
                      <div className={styles.noiBatchPrintValue}>{items[0]?.inspectionDate ?? '-'}</div>
                    </div>
                    <div className={styles.noiBatchPrintField}>
                      <label>聯絡人</label>
                      <div className={styles.noiBatchPrintValue}>{items[0]?.contacts ?? '-'}</div>
                    </div>
                    <div className={styles.noiBatchPrintField}>
                      <label>電話</label>
                      <div className={styles.noiBatchPrintValue}>{items[0]?.phone ?? '-'}</div>
                    </div>
                    <div className={styles.noiBatchPrintField}>
                      <label>Email</label>
                      <div className={styles.noiBatchPrintValue}>{items[0]?.email ?? '-'}</div>
                    </div>
                  </div>
                </div>

                {/* 多筆資料表格 */}
                <div className={styles.noiBatchPrintList}>
                  <h3>各筆 NOI 資料</h3>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>共 {items.length} 筆</p>
                  <table className={styles.noiBatchPrintListTable}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Subject</th>
                        <th>ITP no.</th>
                        <th>Event #</th>
                        <th>Checkpoint</th>
                        <th>檢驗時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((noi, index) => (
                        <tr key={noi.id}>
                          <td>{index + 1}</td>
                          <td>{noi.package}</td>
                          <td>{noi.itpNo}</td>
                          <td>{noi.eventNumber ?? '-'}</td>
                          <td>{noi.checkpoint ?? '-'}</td>
                          <td>{formatTime24h(noi.inspectionTime)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 附件附錄 (Photo Record) */}
                {items.some(n => n.attachments && n.attachments.length > 0) && (
                  <div className={styles.noiBatchPrintPhotoSection}>
                    <h3>{t('itp.selfInspection.attachments')} (Photo Record)</h3>
                    <div className={styles.noiBatchPrintPhotoGrid}>
                      {items.flatMap(n =>
                        (n.attachments || []).map((img, imgIdx) => ({
                          img,
                          label: `${n.package} - #${imgIdx + 1}`
                        }))
                      ).map((item, idx) => (
                        <div key={idx} className={styles.noiBatchPrintPhotoItem}>
                          <img src={item.img} alt={item.label} className={styles.noiBatchPrintPhoto} />
                          <div className={styles.noiBatchPrintPhotoLabel}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>,
          document.body
        )}

      {isBulkModalOpen && (
        <NOIBulkAddModal
          onSave={async (nois) => {
            try {
              await addBulkNOI(nois);
              setIsBulkModalOpen(false);
            } catch (err) {
              alert('批次新增失敗：' + (err instanceof Error ? err.message : '未知錯誤'));
            }
          }}
          onClose={() => setIsBulkModalOpen(false)}
        />
      )}
    </div>
  );
};

interface NOIDetailData {
  package: string;
  referenceNo: string;
  issueDate: string;
  inspectionDate: string;
  inspectionTime: string;
  itpNo: string;  // 連結到 ITP referenceNo
  eventNumber: string;
  checkpoint: string;
  type: string;
  contractor: string;
  contacts: string;
  phone: string;
  email: string;
  status: string;
  remark: string;
  closeoutDate: string;
  attachments: string[];
  ncrNumber?: string;  // 若此 NOI 是針對 NCR 的重新檢驗
}

interface NOIDetailModalProps {
  noiId: string | null;
  existingData?: NOIDetailData;
  existingItem?: NOIItem;
  noiList: NOIItem[];
  onSave: (details: NOIDetailData) => void;
  onClose: () => void;
}


const NOIDetailModal: React.FC<NOIDetailModalProps> = ({ noiId, existingData, existingItem, noiList, onSave, onClose }) => {
  const { t } = useLanguage();
  const { getActiveContractors } = useContractors();
  const { getITPByVendor } = useITP();
  const { getNCRList } = useNCR();

  // Reference No 由後端自動產生，前端不再處理產號邏輯
  // 新項目：referenceNo 為空，送出後由後端產生並回傳
  // 編輯項目：顯示既有 referenceNo，不可修改

  // Initialize form data from existing data or existing item
  const getInitialData = (): NOIDetailData => {
    if (existingData) {
      return {
        ...existingData,
        attachments: existingData.attachments || []
      };
    }
    if (existingItem) {
      return {
        package: existingItem.package || '',
        referenceNo: existingItem.referenceNo || '',
        issueDate: existingItem.issueDate || '',
        inspectionDate: existingItem.inspectionDate || '',
        inspectionTime: existingItem.inspectionTime || '',
        itpNo: existingItem.itpNo || '',
        eventNumber: existingItem.eventNumber || '',
        checkpoint: existingItem.checkpoint || '',
        type: existingItem.type || '',
        contractor: existingItem.contractor || '',
        contacts: existingItem.contacts || '',
        phone: existingItem.phone || '',
        email: existingItem.email || '',
        status: existingItem.status || 'Open',
        remark: existingItem.remark || '',
        closeoutDate: existingItem.closeoutDate || '',
        attachments: existingItem.attachments || [],
        ncrNumber: existingItem.ncrNumber || '',
      };
    }
    // 新項目：referenceNo 留空，由後端自動產生
    const activeContactors = getActiveContractors();
    const defaultContractor = activeContactors.length > 0 ? activeContactors[0].name : '';
    return {
      package: '',
      referenceNo: '',  // 新項目，由後端產生
      issueDate: '',
      inspectionDate: '',
      inspectionTime: '',
      itpNo: '',
      eventNumber: '',
      checkpoint: '',
      type: '',
      contractor: defaultContractor,
      contacts: '',
      phone: '',
      email: '',
      status: 'Open',
      remark: '',
      closeoutDate: '',
      attachments: [],
      ncrNumber: '',  // 若此 NOI 是針對 NCR 的重新檢驗
    };
  };

  const [formData, setFormData] = useState<NOIDetailData>(getInitialData());

  // Get filtered ITP list based on selected contractor
  const filteredITPList = useMemo(() => {
    if (!formData.contractor) return [];
    return getITPByVendor(formData.contractor);
  }, [formData.contractor, getITPByVendor]);

  const handleFieldChange = (field: keyof NOIDetailData, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Status validation
      if (field === 'status' && prev.status) {
        const validation = validateStatusTransition(prev.status, value, NOIStatusTransitions);
        if (!validation.allowed) {
          alert(validation.message || t('common.invalidStatusTransition'));
          return prev;
        }

        // Rule: If NCR is present, status must be Reject
        if (value !== 'Reject' && updated.ncrNumber) {
          alert("NOI 含有 NCR，狀態必須為不通過（Reject）");
          return prev;
        }
      }

      // Rule: If NCR is set, auto-change status to Reject
      if (field === 'ncrNumber' && value) {
        updated.status = 'Reject';
      }

      // When contractor changes, reset ITP no.
      if (field === 'contractor' && value) {
        updated.itpNo = '';
      }

      return updated;
    });
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);

      fileArray.forEach((file) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            setFormData(prev => ({
              ...prev,
              attachments: [...prev.attachments, result]
            }));
          };
          reader.readAsDataURL(file);
        }
      });
    }
    // Reset input
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

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{existingData || existingItem ? t('noi.editTitle') : t('noi.addTitle')}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.formRequiredHint}>{t('form.requiredHint')}</p>
          <div className={styles.formSections}>
            {/* 檢驗通知資訊 */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('noi.detailsTitle')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('common.referenceNo')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.referenceNo || t('form.autoGenerated')}
                    readOnly
                    style={{ backgroundColor: '#D9D9D9', cursor: 'not-allowed', color: formData.referenceNo ? '#000000' : '#666666' }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('common.contractor')}</label>
                  <select
                    className={styles.formSelect}
                    value={formData.contractor}
                    onChange={(e) => handleFieldChange('contractor', e.target.value)}
                  >
                    <option value="">{t('common.selectPlaceholder')}</option>
                    {getActiveContractors().map((contractor) => (
                      <option key={contractor.id} value={contractor.name}>
                        {contractor.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('noi.ncrReference')}</label>
                  <select
                    className={styles.formSelect}
                    value={formData.ncrNumber}
                    onChange={(e) => handleFieldChange('ncrNumber', e.target.value)}
                  >
                    <option value="">{t('common.na')}</option>
                    {getNCRList().map((ncr) => (
                      <option key={ncr.id} value={ncr.documentNumber || ''}>
                        {ncr.documentNumber || `(${t('common.tbc')})`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('noi.package')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.package}
                    onChange={(e) => handleFieldChange('package', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('noi.itpNo')}</label>
                  <select
                    className={styles.formSelect}
                    value={formData.itpNo}
                    onChange={(e) => handleFieldChange('itpNo', e.target.value)}
                    disabled={!formData.contractor}
                  >
                    <option value="">{formData.contractor ? t('common.selectPlaceholder') : t('pqp.allContractors')}</option>
                    {filteredITPList.map((itp) => (
                      <option key={itp.id} value={itp.referenceNo || ''}>
                        {itp.referenceNo || `(${t('common.tbc')})`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('noi.issueDate')}</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={formData.issueDate}
                    onChange={(e) => handleFieldChange('issueDate', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('noi.inspectionDate')}</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={formData.inspectionDate}
                    onChange={(e) => handleFieldChange('inspectionDate', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('noi.inspectionTime')} (24h)</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="HH:mm"
                    value={formData.inspectionTime}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Allow only numbers and :
                      if (/^[0-9:]*$/.test(val)) {
                        handleFieldChange('inspectionTime', val);
                      }
                    }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('noi.eventNo')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.eventNumber}
                    onChange={(e) => handleFieldChange('eventNumber', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('noi.checkpoint')}</label>
                  <select
                    className={styles.formSelect}
                    value={formData.checkpoint}
                    onChange={(e) => handleFieldChange('checkpoint', e.target.value)}
                  >
                    <option value="">{t('common.selectPlaceholder')}</option>
                    <option value="R">R</option>
                    <option value="MS">MS</option>
                    <option value="W">W</option>
                    <option value="H">H</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 聯絡資訊 */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('common.contactors')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('contactors.contact')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.contacts}
                    onChange={(e) => handleFieldChange('contacts', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('contactors.phone')}</label>
                  <input
                    type="tel"
                    className={styles.formInput}
                    value={formData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                  />
                </div>
                <div className={styles.formGroupFull}>
                  <label>{t('contactors.email')}</label>
                  <input
                    type="email"
                    className={styles.formInput}
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 品質評估 */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('noi.sectionQuality')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('common.status')}</label>
                  <select
                    className={styles.formSelect}
                    value={formData.status}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                  >
                    <option value="Open">{t('noi.status.open')}</option>
                    <option value="Under Review">{t('noi.status.underReview')}</option>
                    <option value="Closed">{t('noi.status.closed')}</option>
                    <option value="Reject">{t('noi.status.reject')}</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.optionalLabel}>{t('noi.closeoutDate')}</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={formData.closeoutDate}
                    onChange={(e) => handleFieldChange('closeoutDate', e.target.value)}
                  />
                </div>
                <div className={styles.formGroupFull}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ marginBottom: 0 }}>{t('common.remark')}</label>
                    <button
                      type="button"
                      className={styles.addDateBtn}
                      style={{
                        padding: '4px 12px',
                        fontSize: '12px',
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        const dateStr = new Date().toLocaleDateString();
                        const newRemark = formData.remark ? `${formData.remark}\n${dateStr}: ` : `${dateStr}: `;
                        handleFieldChange('remark', newRemark);
                      }}
                    >
                      {t('common.addDate')}
                    </button>
                  </div>
                  <textarea
                    className={styles.formTextarea}
                    value={formData.remark}
                    onChange={(e) => handleFieldChange('remark', e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            </div>

            {/* 附件 */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('common.attachments')}</h3>
              <div className={styles.photoUploadContainer}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAttachmentUpload}
                  className={styles.photoInput}
                  id="noi-attachment-upload"
                />
                <label htmlFor="noi-attachment-upload" className={styles.photoUploadButton}>
                  <span>+ {t('common.add')}{t('common.attachments')}</span>
                </label>
                {formData.attachments.length > 0 && (
                  <div className={styles.photoPreviewGrid}>
                    {formData.attachments.map((attachment, index) => (
                      <div key={index} className={styles.photoPreviewItem}>
                        <img src={attachment} alt={`Attachment ${index + 1}`} className={styles.photoPreview} />
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

interface NOIDetailsViewModalProps {
  noiId: string;
  noiItem?: NOIItem;
  noiDetailData?: NOIDetailData;
  onClose: () => void;
  onPrint: (data: NOIDetailData) => void;
}

const NOIDetailsViewModal: React.FC<NOIDetailsViewModalProps> = ({ noiId, noiItem, noiDetailData, onClose, onPrint }) => {
  const { t } = useLanguage();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Combine data from both sources, with detailData taking precedence
  const displayData: NOIDetailData = {
    package: noiDetailData?.package || noiItem?.package || '',
    referenceNo: noiDetailData?.referenceNo || noiItem?.referenceNo || '',
    issueDate: noiDetailData?.issueDate || noiItem?.issueDate || '',
    inspectionDate: noiDetailData?.inspectionDate || noiItem?.inspectionDate || '',
    inspectionTime: noiDetailData?.inspectionTime || noiItem?.inspectionTime || '',
    itpNo: noiDetailData?.itpNo || noiItem?.itpNo || '',
    eventNumber: noiDetailData?.eventNumber || noiItem?.eventNumber || '',
    checkpoint: noiDetailData?.checkpoint || noiItem?.checkpoint || '',
    type: noiDetailData?.type || noiItem?.type || '',
    contractor: noiDetailData?.contractor || noiItem?.contractor || '',
    contacts: noiDetailData?.contacts || noiItem?.contacts || '',
    phone: noiDetailData?.phone || noiItem?.phone || '',
    email: noiDetailData?.email || noiItem?.email || '',
    status: noiDetailData?.status || noiItem?.status || 'Open',
    remark: noiDetailData?.remark || noiItem?.remark || '',
    closeoutDate: noiDetailData?.closeoutDate || noiItem?.closeoutDate || '',
    attachments: noiItem?.attachments || noiDetailData?.attachments || [],
    ncrNumber: noiDetailData?.ncrNumber || noiItem?.ncrNumber || '',
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{t('noi.detailsTitle')}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formSections}>
            {/* 檢驗通知資訊 */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('noi.detailsTitle')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('common.referenceNo')}</label>
                  <div className={styles.readOnlyField}>{displayData.referenceNo || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('common.contractor')}</label>
                  <div className={styles.readOnlyField}>{displayData.contractor || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('noi.ncrReference')}</label>
                  <div className={styles.readOnlyField}>{displayData.ncrNumber || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('noi.package')}</label>
                  <div className={styles.readOnlyField}>{displayData.package || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('noi.itpNo')}</label>
                  <div className={styles.readOnlyField}>{displayData.itpNo || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('noi.issueDate')}</label>
                  <div className={styles.readOnlyField}>{displayData.issueDate || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('noi.inspectionDate')}</label>
                  <div className={styles.readOnlyField}>{displayData.inspectionDate || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('noi.inspectionTime')}</label>
                  <div className={styles.readOnlyField}>{formatTime24h(displayData.inspectionTime)}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('noi.eventNo')}</label>
                  <div className={styles.readOnlyField}>{displayData.eventNumber || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('noi.checkpoint')}</label>
                  <div className={styles.readOnlyField}>{displayData.checkpoint || '-'}</div>
                </div>
              </div>
            </div>

            {/* 聯絡資訊 */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('common.contactors')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('contactors.contact')}</label>
                  <div className={styles.readOnlyField}>{displayData.contacts || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('contactors.phone')}</label>
                  <div className={styles.readOnlyField}>{displayData.phone || '-'}</div>
                </div>
                <div className={styles.formGroupFull}>
                  <label>{t('contactors.email')}</label>
                  <div className={styles.readOnlyField}>{displayData.email || '-'}</div>
                </div>
              </div>
            </div>

            {/* 品質評估 */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('noi.sectionQuality')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('common.status')}</label>
                  <div className={styles.readOnlyField}>{getLocalizedStatus(displayData.status, t)}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('noi.closeoutDate')}</label>
                  <div className={styles.readOnlyField}>{displayData.closeoutDate || '-'}</div>
                </div>
                <div className={styles.formGroupFull}>
                  <label>{t('common.remark')}</label>
                  <div className={styles.readOnlyField} style={{ whiteSpace: 'pre-wrap', minHeight: '80px' }}>{displayData.remark || '-'}</div>
                </div>
              </div>
            </div>

            {/* 附件 */}
            {displayData.attachments && displayData.attachments.length > 0 && (
              <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>{t('common.attachments')}</h3>
                <div className={styles.photoPreviewGrid}>
                  {displayData.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className={`${styles.photoPreviewItem} ${styles.previewItemClickable}`}
                      onClick={() => setPreviewUrl(attachment)}
                    >
                      <img src={attachment} alt={`Attachment ${index + 1}`} className={styles.photoPreview} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.printButton} onClick={() => onPrint(displayData)}>
            {t('common.print')}
          </button>
          <button className={styles.cancelButton} onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>

      {/* 附件預覽 Overlay */}
      {previewUrl && (
        <div className={styles.previewOverlay} onClick={() => setPreviewUrl(null)}>
          <div className={styles.previewContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.previewCloseButton}
              onClick={() => setPreviewUrl(null)}
            >
              ×
            </button>
            {previewUrl.startsWith('data:application/pdf') ? (
              <iframe
                src={previewUrl}
                className={styles.previewIframe}
                title="PDF Preview"
              />
            ) : (
              <img src={previewUrl} alt="Preview" className={styles.previewImage} />
            )}
            <div className={styles.previewLabel}>
              {displayData.package || t('itp.selfInspection.attachments')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 批次新增 NOI Modal
interface NOIBulkAddModalProps {
  onSave: (nois: Omit<NOIItem, 'id'>[]) => Promise<void>;
  onClose: () => void;
}

interface BulkNOIRow {
  id: string;
  package: string;        // Subject
  itpNo: string;
  eventNumber: string;    // Event #
  checkpoint: string;     // W or H
  inspectionTime: string;
}

const NOIBulkAddModal: React.FC<NOIBulkAddModalProps> = ({ onSave, onClose }) => {
  const { t } = useLanguage();
  const { getActiveContractors } = useContractors();
  const { getITPByVendor } = useITP();
  const activeContactors = getActiveContractors();

  // 共同欄位
  const [commonData, setCommonData] = useState({
    contractor: activeContactors.length > 0 ? activeContactors[0].name : '',
    issueDate: new Date().toISOString().split('T')[0],
    inspectionDate: new Date().toISOString().split('T')[0],
    contacts: '',
    phone: '',
    email: '',
  });

  // 多筆資料（各自不同的欄位）
  const [rows, setRows] = useState<BulkNOIRow[]>([
    { id: '1', package: '', itpNo: '', eventNumber: '', checkpoint: '', inspectionTime: '09:00' },
  ]);

  const [saving, setSaving] = useState(false);

  // 根據選擇的承包商取得 ITP 清單
  const filteredITPList = useMemo(() => {
    if (!commonData.contractor) return [];
    return getITPByVendor(commonData.contractor);
  }, [commonData.contractor, getITPByVendor]);

  const handleCommonChange = (field: string, value: string) => {
    setCommonData(prev => ({ ...prev, [field]: value }));
  };

  const handleRowChange = (rowId: string, field: keyof BulkNOIRow, value: string) => {
    setRows(prev => prev.map(row =>
      row.id === rowId ? { ...row, [field]: value } : row
    ));
  };

  const addRow = () => {
    const newId = String(Date.now());
    setRows(prev => [...prev, {
      id: newId,
      package: '',
      itpNo: '',
      eventNumber: '',
      checkpoint: '',
      inspectionTime: '09:00'
    }]);
  };

  const removeRow = (rowId: string) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter(row => row.id !== rowId));
  };

  const handleSave = async () => {
    // 驗證
    if (!commonData.contractor) {
      alert(t('common.selectContractor'));
      return;
    }
    if (!commonData.issueDate) {
      alert(t('common.selectDate'));
      return;
    }

    const validRows = rows.filter(row => row.package.trim() || row.itpNo || row.checkpoint);
    if (validRows.length === 0) {
      alert(t('common.fillAtLeastOne'));
      return;
    }

    setSaving(true);
    try {
      const nois: Omit<NOIItem, 'id'>[] = validRows.map(row => ({
        package: row.package,
        referenceNo: '',  // 由後端自動產生
        issueDate: commonData.issueDate,
        inspectionDate: commonData.inspectionDate,
        inspectionTime: row.inspectionTime,
        itpNo: row.itpNo,
        eventNumber: row.eventNumber,
        checkpoint: row.checkpoint,
        type: '',  // 不再使用
        contractor: commonData.contractor,
        contacts: commonData.contacts,
        phone: commonData.phone,
        email: commonData.email,
        status: 'Open',
      }));
      await onSave(nois);
    } catch (err) {
      console.error('Bulk add failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ maxWidth: '900px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{t('noi.bulkAdd')}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.formRequiredHint}>{t('form.requiredHint')}</p>
          {/* 共同欄位 */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>{t('noi.print.commonSection')}</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.requiredLabel}>{t('common.contractor')}</label>
                <select
                  className={styles.formSelect}
                  value={commonData.contractor}
                  onChange={(e) => handleCommonChange('contractor', e.target.value)}
                >
                  <option value="">{t('common.selectPlaceholder')}</option>
                  {activeContactors.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.requiredLabel}>{t('noi.issueDate')}</label>
                <input
                  type="date"
                  className={styles.formInput}
                  value={commonData.issueDate}
                  onChange={(e) => handleCommonChange('issueDate', e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t('noi.inspectionDate')}</label>
                <input
                  type="date"
                  className={styles.formInput}
                  value={commonData.inspectionDate}
                  onChange={(e) => handleCommonChange('inspectionDate', e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t('contactors.contact')}</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={commonData.contacts}
                  onChange={(e) => handleCommonChange('contacts', e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t('contactors.phone')}</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={commonData.phone}
                  onChange={(e) => handleCommonChange('phone', e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t('contactors.email')}</label>
                <input
                  type="email"
                  className={styles.formInput}
                  value={commonData.email}
                  onChange={(e) => handleCommonChange('email', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 多筆資料 */}
          <div className={styles.formSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className={styles.sectionTitle} style={{ margin: 0 }}>{t('noi.print.listTitle')}</h3>
              <button
                type="button"
                onClick={addRow}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                + {t('common.add')}
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>#</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', minWidth: '150px' }}>{t('noi.package')}</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', minWidth: '150px' }}>{t('noi.itpNo')}</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', minWidth: '80px' }}>{t('noi.eventNo')}</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', minWidth: '80px' }}>{t('noi.checkpoint')}</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', minWidth: '100px' }}>{t('noi.inspectionTime')}</th>
                    <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: '50px' }}>{t('common.operations')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{index + 1}</td>
                      <td style={{ padding: '4px', borderBottom: '1px solid #e5e7eb' }}>
                        <input
                          type="text"
                          value={row.package}
                          onChange={(e) => handleRowChange(row.id, 'package', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                          placeholder="Subject"
                        />
                      </td>
                      <td style={{ padding: '4px', borderBottom: '1px solid #e5e7eb' }}>
                        <select
                          value={row.itpNo}
                          onChange={(e) => handleRowChange(row.id, 'itpNo', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                          disabled={!commonData.contractor}
                        >
                          <option value="">{commonData.contractor ? t('common.selectPlaceholder') : t('pqp.allContractors')}</option>
                          {filteredITPList.map((itp) => (
                            <option key={itp.id} value={itp.referenceNo || ''}>
                              {itp.referenceNo || '(未產生)'}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '4px', borderBottom: '1px solid #e5e7eb' }}>
                        <input
                          type="text"
                          value={row.eventNumber}
                          onChange={(e) => handleRowChange(row.id, 'eventNumber', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                          placeholder="Event #"
                        />
                      </td>
                      <td style={{ padding: '4px', borderBottom: '1px solid #e5e7eb' }}>
                        <select
                          value={row.checkpoint}
                          onChange={(e) => handleRowChange(row.id, 'checkpoint', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                        >
                          <option value="">選擇</option>
                          <option value="W">W</option>
                          <option value="H">H</option>
                        </select>
                      </td>
                      <td style={{ padding: '4px', borderBottom: '1px solid #e5e7eb' }}>
                        <input
                          type="text"
                          className={styles.formInput}
                          style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                          placeholder="HH:mm"
                          value={row.inspectionTime}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^[0-9:]*$/.test(val)) {
                              handleRowChange(row.id, 'inspectionTime', val);
                            }
                          }}
                        />
                      </td>
                      <td style={{ padding: '4px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          disabled={rows.length <= 1}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: rows.length <= 1 ? '#e5e7eb' : '#ef4444',
                            color: rows.length <= 1 ? '#9ca3af' : 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: rows.length <= 1 ? 'not-allowed' : 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          {t('common.delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '12px', color: '#6b7280', fontSize: '13px' }}>
              {t('noi.bulkAddSummary', { count: rows.length })}
            </div>
          </div>
        </div>
        <div className={styles.modalActions}>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? t('noi.bulkAddSaving') : t('noi.bulkAddAction', { count: rows.length })}
          </button>
          <button className={styles.cancelButton} onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NOI;

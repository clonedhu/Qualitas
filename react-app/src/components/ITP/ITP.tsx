import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useContractors } from '../../context/ContractorsContext';
import { useITP, ITPItem } from '../../context/ITPContext';
import { useNOI } from '../../context/NOIContext';
import { checkITPReferences, generateDeleteMessage } from '../../utils/cascadeDelete';
import ConfirmModal from '../Shared/ConfirmModal';
import styles from './ITP.module.css';

type SortKey = keyof ITPItem;
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const ITP: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { getActiveContractors } = useContractors();
  const { itpList, loading, error, refetch, addITP, updateITP, deleteITP } = useITP();
  const { noiList } = useNOI();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // Sort State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'referenceNo', direction: 'asc' });

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [currentItpId, setCurrentItpId] = useState<string | null>(null);
  const [viewingItpId, setViewingItpId] = useState<string | null>(null);

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

  const filteredItpList = useMemo(() => {
    let filtered = [...itpList];

    // Filter by Vendor
    if (vendorFilter !== 'all') {
      filtered = filtered.filter(item => item.vendor === vendorFilter);
    }

    // Filter by Status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Filter by Date (Updated Date)
    if (dateFilter.start) {
      filtered = filtered.filter(item => item.submissionDate ? item.submissionDate >= dateFilter.start : true);
    }
    if (dateFilter.end) {
      filtered = filtered.filter(item => item.submissionDate ? item.submissionDate <= dateFilter.end : true);
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.vendor.toLowerCase().includes(query) ||
        (item.referenceNo || '').toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.rev.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query)
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
  }, [itpList, searchQuery, vendorFilter, statusFilter, dateFilter, sortConfig]);

  const statistics = useMemo(() => {
    const statusCounts = {
      approved: 0,
      approvedWithComments: 0,
      reviseResubmit: 0,
      rejected: 0,
      pending: 0,
      noSubmit: 0,
      void: 0,
    };

    itpList.forEach((item) => {
      const status = item.status.toLowerCase();
      if (status === 'void') {
        statusCounts.void++;
      } else if (status === 'approved') {
        statusCounts.approved++;
      } else if (status === 'approved with comments') {
        statusCounts.approvedWithComments++;
      } else if (status === 'revise & resubmit' || status === 'revise and resubmit') {
        statusCounts.reviseResubmit++;
      } else if (status === 'rejected') {
        statusCounts.rejected++;
      } else if (status === 'pending') {
        statusCounts.pending++;
      } else if (status === 'no submit' || status === 'nosubmit') {
        statusCounts.noSubmit++;
      }
    });

    const total = itpList.filter(item => item.status.toLowerCase() !== 'void').length;
    const submission = itpList.filter(item => {
      const status = item.status.toLowerCase();
      return status !== 'void' && status !== 'no submit' && status !== 'nosubmit';
    }).length;
    const submissionMaturity = total > 0 ? Math.round((submission / total) * 100) : 0;
    const approvalMaturity = total > 0 ? Math.round(((statusCounts.approved + statusCounts.approvedWithComments) / total) * 100) : 0;

    return {
      ...statusCounts,
      total,
      submission,
      submissionMaturity,
      approvalMaturity,
    };
  }, [itpList]);

  const handleAdd = (id: string) => {
    navigate(`/itp/${id}`);
  };

  const handleViewDetails = (id: string) => {
    setViewingItpId(id);
    setIsDetailsModalOpen(true);
  };

  const handleEdit = (id: string) => {
    setCurrentItpId(id);
    setIsEditModalOpen(true);
  };

  const handleAddNew = async () => {
    const activeContactors = getActiveContractors();
    const defaultVendor = activeContactors.length > 0 ? activeContactors[0].name : 'N/A';
    try {
      const newItem = await addITP({
        vendor: defaultVendor,
        description: '',
        rev: '',
        submit: '',
        status: 'Pending',
        remark: '',
        submissionDate: new Date().toISOString().split('T')[0],
      } as Omit<ITPItem, 'id'>);
      setCurrentItpId(newItem.id);
      setIsEditModalOpen(true);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((e: any) => e?.msg || JSON.stringify(e)).join(', ') : err.message || t('itp.addError');
      alert(t('itp.addError') + '：' + msg);
    }
  };

  const confirmDelete = (id: string) => {
    const itp = itpList.find(item => item.id === id);
    if (!itp) return;

    // Check for references
    const references = checkITPReferences(id, noiList);
    const message = generateDeleteMessage('ITP', itp.referenceNo || itp.id, references.references, t);

    setDeleteModal({
      isOpen: true,
      id,
      message,
    });
  };

  const handleDelete = async () => {
    if (deleteModal.id) {
      try {
        await deleteITP(deleteModal.id);
        setDeleteModal({ isOpen: false, id: null, message: '' });
      } catch (error) {
        alert(t('itp.deleteError'));
      }
    }
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <span className={styles.sortIcon}>↕</span>;
    return sortConfig.direction === 'asc' ? <span className={styles.sortIcon}>↑</span> : <span className={styles.sortIcon}>↓</span>;
  };

  const getLocalizedStatus = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'approved') return t('itp.status.approved');
    if (s === 'approved with comments') return t('itp.status.approvedWithComments');
    if (s === 'revise & resubmit' || s === 'revise and resubmit') return t('itp.status.reviseResubmit');
    if (s === 'rejected') return t('itp.status.rejected');
    if (s === 'pending') return t('itp.status.pending');
    if (s === 'no submit' || s === 'nosubmit') return t('itp.status.noSubmit');
    if (s === 'void') return t('itp.status.void');
    return status;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button type="button" className={styles.backButton} onClick={() => navigate('/')}>
            ← {t('common.back') || 'Back'}
          </button>
          <h1>{t('itp.title')}</h1>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.filterGroup}>
            <select
              className={styles.vendorFilter}
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
            >
              <option value="all">{t('pqp.allContractors')}</option>
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
              <option value="all">{t('pqp.allStatus')}</option>
              <option value="Approved">{t('itp.status.approved')}</option>
              <option value="Approved with comments">{t('itp.status.approvedWithComments')}</option>
              <option value="Revise & Resubmit">{t('itp.status.reviseResubmit')}</option>
              <option value="Rejected">{t('itp.status.rejected')}</option>
              <option value="Pending">{t('itp.status.pending')}</option>
              <option value="No submit">{t('itp.status.noSubmit')}</option>
              <option value="Void">{t('itp.status.void')}</option>
            </select>
            <input
              type="date"
              className={styles.dateInput}
              value={dateFilter.start}
              onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
              placeholder={t('pqp.startDate')}
            />
            <span style={{ color: '#6b7280' }}>-</span>
            <input
              type="date"
              className={styles.dateInput}
              value={dateFilter.end}
              onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
              placeholder={t('pqp.endDate')}
            />
          </div>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('itp.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.summarySection}>
        {/* ... stats display ... */}
        <h2 className={styles.summaryTitle}>{t('itp.statsTitle')}</h2>
        <div className={styles.statsContainer}>
          <div className={styles.statusStatsGrid}>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.greenIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>{t('itp.status.approved')}</div>
                <div className={styles.statValue}>{statistics.approved}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.greenIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 17h6" strokeLinecap="round" />
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>{t('itp.status.approvedWithComments')}</div>
                <div className={styles.statValue}>{statistics.approvedWithComments}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.yellowIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>{t('itp.status.pending')}</div>
                <div className={styles.statValue}>{statistics.pending}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.yellowIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>{t('itp.status.noSubmit')}</div>
                <div className={styles.statValue}>{statistics.noSubmit}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.pinkIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 21v-5h5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>{t('itp.status.reviseResubmit')}</div>
                <div className={styles.statValue}>{statistics.reviseResubmit}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.pinkIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m15 9-6 6M9 9l6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>{t('itp.status.rejected')}</div>
                <div className={styles.statValue}>{statistics.rejected}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.orangeIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 9v4M12 17h.01" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>{t('itp.status.void')}</div>
                <div className={styles.statValue}>{statistics.void}</div>
              </div>
            </div>
          </div>
          <div className={styles.summaryStatsGrid}>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.grayIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M18 17V9M12 17V5M6 17v-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>{t('pqp.total')}</div>
                <div className={styles.statValue}>{statistics.total}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.grayIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>{t('itp.stats.submission')}</div>
                <div className={styles.statValue}>{statistics.submission}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.blueIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>{t('itp.stats.submissionMaturity')}</div>
                <div className={styles.statValue}>{statistics.submissionMaturity}%</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.blueIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>{t('itp.stats.approvalMaturity')}</div>
                <div className={styles.statValue}>{statistics.approvalMaturity}%</div>
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
              <h2 className={styles.listTitle}>{t('itp.title')}</h2>
              <button
                className={styles.addNewButton}
                onClick={handleAddNew}
              >
                {t('itp.addNew')}
              </button>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th onClick={() => handleSort('referenceNo')} className={styles.sortableHeader}>
                    <div className={styles.headerContent}>
                      {t('itp.referenceNo')} {renderSortIcon('referenceNo')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('status')} className={styles.sortableHeader}>
                    <div className={styles.headerContent}>
                      {t('itp.status')} {renderSortIcon('status')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('vendor')} className={styles.sortableHeader}>
                    <div className={styles.headerContent}>
                      {t('itp.vendor')} {renderSortIcon('vendor')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('description')} className={styles.sortableHeader}>
                    <div className={styles.headerContent}>
                      {t('itp.description')} {renderSortIcon('description')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('rev')} className={styles.sortableHeader}>
                    <div className={styles.headerContent}>
                      {t('itp.rev')} {renderSortIcon('rev')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('submissionDate')} className={styles.sortableHeader}>
                    <div className={styles.headerContent}>
                      {t('itp.submissionDate')} {renderSortIcon('submissionDate')}
                    </div>
                  </th>
                  <th className={styles.operationsHeader}>{t('common.operations')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredItpList.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
                      {t('common.noData')}
                    </td>
                  </tr>
                ) : (
                  filteredItpList.map((itp, index) => {
                    return (
                      <tr
                        key={itp.id}
                        className={itp.status.toLowerCase() === 'void' ? styles.voidRow : styles.normalRow}
                      >
                        <td>{index + 1}</td>
                        <td>
                          <span className={itp.status.toLowerCase() === 'void' ? styles.strikethrough : ''}>
                            {itp.referenceNo || '-'}
                          </span>
                        </td>
                        <td>
                          <span className={itp.status.toLowerCase() === 'void' ? styles.strikethrough : ''}>
                            {getLocalizedStatus(itp.status)}
                          </span>
                        </td>
                        <td>
                          <span className={itp.status.toLowerCase() === 'void' ? styles.strikethrough : ''}>
                            {itp.vendor}
                          </span>
                        </td>
                        <td>
                          <span className={itp.status.toLowerCase() === 'void' ? styles.strikethrough : ''}>
                            {itp.description}
                          </span>
                        </td>
                        <td>
                          <span className={itp.status.toLowerCase() === 'void' ? styles.strikethrough : ''}>
                            {itp.rev}
                          </span>
                        </td>
                        <td>
                          <span className={itp.status.toLowerCase() === 'void' ? styles.strikethrough : ''}>
                            {itp.submissionDate || '-'}
                          </span>
                        </td>
                        <td className={styles.operationsCell}>
                          <div className={styles.buttonGroup}>
                            <button
                              className={`${styles.actionBtn} ${styles.editBtn}`}
                              onClick={() => handleEdit(itp.id)}
                              title={t('itp.tooltip.edit')}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button
                              className={`${styles.actionBtn} ${styles.detailsBtn}`}
                              onClick={() => handleViewDetails(itp.id)}
                              title={t('itp.tooltip.details')}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            <button
                              className={`${styles.actionBtn} ${styles.reviewBtn}`}
                              onClick={() => handleAdd(itp.id)}
                              title={t('itp.tooltip.review')}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <path d="M9 15l2 2 4-4"></path>
                              </svg>
                            </button>
                            {(() => {
                              const relatedNoiCount = noiList.filter(noi => noi.itpNo === itp.referenceNo).length;
                              return (
                                <button
                                  type="button"
                                  className={`${styles.relatedBtn} ${relatedNoiCount === 0 ? styles.relatedBtnDisabled : ''}`}
                                  onClick={() => relatedNoiCount > 0 && navigate('/noi')}
                                  title={relatedNoiCount > 0 ? t('itp.tooltip.viewRelatedNOI').replace('{count}', relatedNoiCount.toString()) : t('itp.tooltip.noRelatedNOI')}
                                  disabled={relatedNoiCount === 0}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                  </svg>
                                  {relatedNoiCount}
                                </button>
                              );
                            })()}
                            <button
                              className={`${styles.actionBtn} ${styles.deleteBtn}`}
                              onClick={() => confirmDelete(itp.id)}
                              title={t('itp.tooltip.delete')}
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
                  })
                )}
              </tbody>
            </table>
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={t('common.confirmDeleteTitle')}
        message={deleteModal.message || t('itp.confirmDelete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, message: '' })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
      />

      {isEditModalOpen && currentItpId && (
        <ITPDetailModal
          itpId={currentItpId}
          existingItem={itpList.find(item => item.id === currentItpId)}
          onSave={async (updates) => {
            try {
              await updateITP(currentItpId, updates);
              setIsEditModalOpen(false);
              setCurrentItpId(null);
            } catch (error) {
              alert(t('itp.updateError'));
            }
          }}
          onClose={() => {
            setIsEditModalOpen(false);
            setCurrentItpId(null);
          }}
        />
      )}

      {isDetailsModalOpen && viewingItpId && (
        <ITPDetailsViewModal
          itpId={viewingItpId}
          itpItem={itpList.find(item => item.id === viewingItpId)}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setViewingItpId(null);
          }}
        />
      )}
    </div>
  );
};

interface ITPDetailModalProps {
  itpId: string;
  existingItem?: ITPItem;
  onSave: (updates: Partial<ITPItem>) => void;
  onClose: () => void;
}

const ITPDetailModal: React.FC<ITPDetailModalProps> = ({ itpId, existingItem, onSave, onClose }) => {
  const { t } = useLanguage();
  const { getActiveContractors } = useContractors();
  const REV_OPTIONS = ['Rev1.0', 'Rev2.0', 'Rev3.0', 'Rev4.0'];
  const [formData, setFormData] = useState<Partial<ITPItem>>({
    vendor: existingItem?.vendor || '',
    referenceNo: existingItem?.referenceNo || '',  // 由後端自動產生
    description: existingItem?.description || '',
    rev: existingItem?.rev || 'Rev1.0',
    submit: existingItem?.submit || '',
    status: existingItem?.status || 'Pending',
    remark: existingItem?.remark || '',
    submissionDate: existingItem?.submissionDate || new Date().toISOString().split('T')[0],
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [revMode, setRevMode] = useState<'select' | 'custom'>(() => {
    const currentRev = existingItem?.rev;
    if (currentRev && !REV_OPTIONS.includes(currentRev)) {
      return 'custom';
    }
    return 'select';
  });

  const handleFieldChange = (field: keyof ITPItem, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleDateButton = (field: keyof ITPItem) => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}_`;
    setFormData(prev => ({
      ...prev,
      [field]: prev[field] ? `${prev[field]}\n${dateStr}` : dateStr
    }));
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.vendor) newErrors.vendor = 'Contractor is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(formData);
      // onClose is handled by parent after async operation
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{existingItem ? t('itp.editTitle') : t('itp.addTitle')}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.formRequiredHint}>{t('form.requiredHint')}</p>
          <div className={styles.formSections}>
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('itp.infoSection')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('itp.referenceNo')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.referenceNo || t('form.autoGenerated')}
                    readOnly
                    style={{ backgroundColor: '#D9D9D9', cursor: 'not-allowed', color: formData.referenceNo ? '#000000' : '#666666' }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('itp.description')}</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.description || ''}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.requiredLabel}>{t('itp.vendor')}</label>
                  <select
                    className={`${styles.formSelect} ${errors.vendor ? styles.errorInput : ''}`}
                    value={formData.vendor || ''}
                    onChange={(e) => handleFieldChange('vendor', e.target.value)}
                  >
                    <option value="">{t('itp.selectContractor')}</option>
                    {getActiveContractors().map((contractor) => (
                      <option key={contractor.id} value={contractor.name}>
                        {contractor.name}
                      </option>
                    ))}
                  </select>
                  {errors.vendor && <span className={styles.errorMessage}>{errors.vendor}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label>{t('itp.submissionDate')}</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={formData.submissionDate || ''}
                    onChange={(e) => handleFieldChange('submissionDate', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t('itp.rev')}</label>
                  {revMode === 'select' && (
                    <select
                      className={styles.formSelect}
                      value={REV_OPTIONS.includes(formData.rev || '') ? formData.rev : 'Rev1.0'}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'custom') {
                          setRevMode('custom');
                          handleFieldChange('rev', '');
                        } else {
                          setRevMode('select');
                          handleFieldChange('rev', value);
                        }
                      }}
                    >
                      {REV_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                      <option value="custom">{t('itp.revSelectCustom')}</option>
                    </select>
                  )}
                  {revMode === 'custom' && (
                    <input
                      type="text"
                      className={styles.formInput}
                      value={formData.rev || ''}
                      onChange={(e) => handleFieldChange('rev', e.target.value)}
                      placeholder={t('itp.revPlaceholder')}
                    />
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label>{t('itp.status')}</label>
                  <select
                    className={styles.formSelect}
                    value={formData.status || 'Pending'}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                  >
                    <option value="Approved with comments">Approved with comments</option>
                    <option value="Revise & Resubmit">Revise & Resubmit</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Pending">Pending</option>
                    <option value="No submit">No submit</option>
                    <option value="Void">Void</option>
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
                    value={formData.remark || ''}
                    onChange={(e) => handleFieldChange('remark', e.target.value)}
                    rows={3}
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

interface ITPDetailsViewModalProps {
  itpId: string;
  itpItem?: ITPItem;
  onClose: () => void;
}

const ITPDetailsViewModal: React.FC<ITPDetailsViewModalProps> = ({ itpId, itpItem, onClose }) => {
  const { t } = useLanguage();
  const handlePrint = () => {
    window.print();
  };

  if (!itpItem) {
    return null;
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{t('itp.detail.title')}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formSections}>
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{t('itp.infoSection')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('itp.referenceNo')}</label>
                  <div className={styles.readOnlyField}>{itpItem.referenceNo || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('itp.status')}</label>
                  <div className={styles.readOnlyField}>{itpItem.status || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('itp.vendor')}</label>
                  <div className={styles.readOnlyField}>{itpItem.vendor || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('itp.description')}</label>
                  <div className={styles.readOnlyField}>{itpItem.description || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('itp.rev')}</label>
                  <div className={styles.readOnlyField}>{itpItem.rev || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('itp.submissionDate')}</label>
                  <div className={styles.readOnlyField}>{itpItem.submissionDate || '-'}</div>
                </div>
                {itpItem.remark && (
                  <div className={styles.formGroupFull}>
                    <label>{t('common.remark')}</label>
                    <div className={styles.readOnlyField}>{itpItem.remark}</div>
                  </div>
                )}
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

export default ITP;

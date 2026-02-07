import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useContractors } from '../../context/ContractorsContext';
import ConfirmModal from '../Shared/ConfirmModal';
import styles from './Audit.module.css';

const STORAGE_KEY_AUDIT_LIST = 'qualitas_audit_list';

interface AuditItem {
    id: string;
    auditNo: string;
    title: string;
    date: string;
    auditor: string;
    status: string;
    location: string;
    findings: string;
    contractor?: string;
}

const defaultAuditList: AuditItem[] = [
    {
        id: '1',
        auditNo: 'AUD-2026-001',
        title: 'Internal Quality Audit Q1',
        date: '2026-03-15',
        auditor: 'John Doe',
        status: 'Planned',
        location: 'Site Office',
        findings: '',
        contractor: 'Sample Contractor',
    },
];

function loadAuditListFromStorage(): AuditItem[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_AUDIT_LIST);
        if (raw) {
            const parsed = JSON.parse(raw) as AuditItem[];
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (_) { }
    return defaultAuditList;
}

const Audit: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [auditList, setAuditList] = useState<AuditItem[]>(loadAuditListFromStorage);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentAuditId, setCurrentAuditId] = useState<string | null>(null);
    const { getActiveContractors } = useContractors();
    const [selectedVendorFilter, setSelectedVendorFilter] = useState<string | null>(null);

    // Get active contractors
    const activeContractors = useMemo(() => getActiveContractors(), [getActiveContractors]);

    // Compute vendor stats and schedule
    const { vendorStats, sortedAudits } = useMemo(() => {
        const stats: Record<string, number> = {};
        const sorted = [...auditList].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        auditList.forEach(audit => {
            if (audit.contractor) {
                stats[audit.contractor] = (stats[audit.contractor] || 0) + 1;
            }
        });

        return { vendorStats: stats, sortedAudits: sorted };
    }, [auditList]);

    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; message: string }>({
        isOpen: false,
        id: null,
        message: '',
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_AUDIT_LIST, JSON.stringify(auditList));
        } catch (_) { }
    }, [auditList]);

    // Calendar logic
    const [viewDate, setViewDate] = useState(new Date());

    const calendarDays = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const days = [];

        // Prev month padding
        const startPadding = firstDay.getDay();
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startPadding - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonthLastDay - i),
                isCurrentMonth: false
            });
        }

        // Current month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push({
                date: new Date(year, month, i),
                isCurrentMonth: true
            });
        }

        // Next month padding
        const endPadding = 42 - days.length;
        for (let i = 1; i <= endPadding; i++) {
            days.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false
            });
        }

        return days;
    }, [viewDate]);

    const changeMonth = (offset: number) => {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const getAuditsForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return auditList.filter(a => a.date === dateStr);
    };

    const maxAudits = useMemo(() => {
        const counts = Object.values(vendorStats);
        return counts.length > 0 ? Math.max(...counts) : 1;
    }, [vendorStats]);

    const filteredList = useMemo(() => {
        let filtered = auditList;

        if (statusFilter !== 'all') {
            filtered = filtered.filter(item => item.status === statusFilter);
        }

        if (selectedVendorFilter) {
            filtered = filtered.filter(item => item.contractor === selectedVendorFilter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item =>
                item.auditNo.toLowerCase().includes(query) ||
                item.title.toLowerCase().includes(query) ||
                item.auditor.toLowerCase().includes(query) ||
                item.location.toLowerCase().includes(query) ||
                item.date.includes(query) || // Date search support
                (item.contractor || '').toLowerCase().includes(query)
            );
        } else {
            // Default: filter by current month/year if no search query
            filtered = filtered.filter(item => {
                const dateObj = new Date(item.date);
                return dateObj.getMonth() === viewDate.getMonth() &&
                    dateObj.getFullYear() === viewDate.getFullYear();
            });
        }

        return filtered;
    }, [auditList, searchQuery, statusFilter, selectedVendorFilter, viewDate]);

    // Matrix Logic
    const matrixDates = useMemo(() => {
        // Extract unique dates from the FILTERED list to show only relevant columns
        const uniqueDates = Array.from(new Set(filteredList.map(a => a.date)))
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        return uniqueDates.map(dateStr => {
            const date = new Date(dateStr);
            return {
                date,
                isToday: date.toDateString() === new Date().toDateString(),
                isWeekend: date.getDay() === 0 || date.getDay() === 6,
                dayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
                dateLabel: `${date.getMonth() + 1}/${date.getDate()}`
            };
        });
    }, [filteredList]);

    const getAuditForMatrix = (vendorName: string, date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return auditList.find(a => a.contractor === vendorName && a.date === dateStr);
    };

    const handleAddNew = () => {
        const newId = String(Date.now());
        setCurrentAuditId(newId);
        setIsEditModalOpen(true);
    };

    const handleSaveAudit = (updates: Partial<AuditItem>) => {
        if (currentAuditId) {
            const existingItem = auditList.find(item => item.id === currentAuditId);
            if (existingItem) {
                setAuditList(prevList =>
                    prevList.map(item =>
                        item.id === currentAuditId ? { ...item, ...updates } : item
                    )
                );
            } else {
                const newItem: AuditItem = {
                    id: currentAuditId,
                    auditNo: updates.auditNo || `AUD-${new Date().getFullYear()}-${String(auditList.length + 1).padStart(3, '0')}`,
                    title: updates.title || '',
                    date: updates.date || '',
                    auditor: updates.auditor || '',
                    status: updates.status || 'Planned',
                    location: updates.location || '',
                    findings: updates.findings || '',
                    contractor: updates.contractor || '',
                };
                setAuditList(prevList => [...prevList, newItem]);
            }
        }
    };

    const handleEdit = (id: string) => {
        setCurrentAuditId(id);
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setDeleteModal({ isOpen: true, id, message: t('audit.confirmDelete') || 'Are you sure you want to delete this audit?' });
    };

    const handleDeleteConfirm = () => {
        if (deleteModal.id) {
            setAuditList(prevList => prevList.filter(item => item.id !== deleteModal.id));
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
                    <h1>{t('audit.title') || 'Internal Audit'}</h1>
                </div>
                <div className={styles.headerRight}>
                    <select
                        className={styles.filterSelect}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">{t('common.allStatus') || 'All Status'}</option>
                        <option value="Planned">Planned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Closed">Closed</option>
                    </select>
                    <div className={styles.searchContainer}>
                        <input
                            type="date"
                            className={styles.datePicker}
                            value={viewDate.toISOString().split('T')[0]}
                            onChange={(e) => setViewDate(new Date(e.target.value))}
                            title="Jump to date"
                        />
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder={t('audit.searchPlaceholder') || 'Search Date, Vendor, No...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className={styles.topSection}>
                {/* Left: Vendor Statistics (Visual) */}
                <div className={styles.panel}>
                    <div className={styles.panelTitle}>
                        <span>{t('common.contractor') || 'Vendors'}</span>
                        <span style={{ fontSize: '12px', fontWeight: 400 }}>{t('audit.total') || 'Total'}: {auditList.length}</span>
                    </div>
                    <div className={styles.vendorList}>
                        <div
                            className={`${styles.vendorItem} ${selectedVendorFilter === null ? styles.active : ''}`}
                            onClick={() => setSelectedVendorFilter(null)}
                        >
                            <div className={styles.vendorHeader}>
                                <span className={styles.vendorName}>{t('common.all') || 'All'}</span>
                                <span className={styles.auditCount}>{auditList.length}</span>
                            </div>
                            <div className={styles.chartTrack}>
                                <div className={styles.chartBar} style={{ width: '100%' }}></div>
                            </div>
                        </div>
                        {activeContractors.map(vendor => {
                            const count = vendorStats[vendor.name] || 0;
                            const percentage = (count / maxAudits) * 100;
                            return (
                                <div
                                    key={vendor.id}
                                    className={`${styles.vendorItem} ${selectedVendorFilter === vendor.name ? styles.active : ''}`}
                                    onClick={() => setSelectedVendorFilter(vendor.name === selectedVendorFilter ? null : vendor.name)}
                                >
                                    <div className={styles.vendorHeader}>
                                        <span className={styles.vendorName}>{vendor.name}</span>
                                        <span className={styles.auditCount}>{count}</span>
                                    </div>
                                    <div className={styles.chartTrack}>
                                        <div
                                            className={styles.chartBar}
                                            style={{
                                                width: `${percentage}%`,
                                                background: selectedVendorFilter === vendor.name ? 'linear-gradient(90deg, #059669, #10b981)' : ''
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Audit Matrix View (Visual) */}
                <div className={styles.panel}>
                    <div className={styles.panelTitle}>
                        <span>{t('audit.schedule') || 'Audit Schedule'}</span>
                        <div className={styles.navGroup}>
                            <button className={styles.navBtn} onClick={() => changeMonth(-1)}>&lt;</button>
                            <button className={styles.navBtn} onClick={() => setViewDate(new Date())}>{t('common.today') || 'Today'}</button>
                            <button className={styles.navBtn} onClick={() => changeMonth(1)}>&gt;</button>
                        </div>
                    </div>

                    <div className={styles.matrixContainer}>
                        <div className={styles.matrixNav}>
                            <div className={styles.monthDisplay}>
                                {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </div>
                        </div>

                        <div className={styles.matrixScroll}>
                            <table className={styles.matrixTable}>
                                <thead>
                                    <tr>
                                        <th className={`${styles.matrixHeaderCell} ${styles.indexCorner}`}>
                                            #
                                        </th>
                                        <th className={`${styles.matrixHeaderCell} ${styles.corner}`}>
                                            {t('common.contractor') || 'Vendor'}
                                        </th>
                                        {matrixDates.map((d, i) => (
                                            <th key={i} className={`${styles.matrixHeaderCell} ${d.isToday ? styles.today : ''}`}>
                                                <span className={styles.dayLabel}>{d.dayLabel}</span>
                                                <span className={styles.dateLabel}>{d.dateLabel}</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(selectedVendorFilter ? activeContractors.filter(v => v.name === selectedVendorFilter) : activeContractors).map((vendor, vIdx) => (
                                        <tr key={vendor.id} className={styles.matrixRow}>
                                            <td className={styles.indexStickyCell}>{vIdx + 1}</td>
                                            <td className={styles.vendorStickyCell}>{vendor.name}</td>
                                            {matrixDates.map((d, i) => {
                                                const audit = getAuditForMatrix(vendor.name, d.date);
                                                return (
                                                    <td
                                                        key={i}
                                                        className={`${styles.matrixCell} ${d.isToday ? styles.today : ''} ${d.isWeekend ? styles.weekend : ''}`}
                                                    >
                                                        {audit && (
                                                            <div
                                                                className={`${styles.auditIndicator} ${audit.status.toLowerCase().replace(' ', '')} ${styles.iconIndicator}`}
                                                                title={`${audit.auditNo}: ${audit.title}`}
                                                                onClick={() => handleEdit(audit.id)}
                                                            >
                                                                {audit.status === 'Planned' ? (
                                                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                                                    </svg>
                                                                ) : audit.status === 'In Progress' ? (
                                                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                                                                        {/* Left Shoe Print */}
                                                                        <path d="M8 5c-1.8 0-3 1.5-3 4s1.2 3.5 3 3.5 3-1 3-3.5-1.2-4-3-4z" />
                                                                        <path d="M8 13.5c-1.2 0-2 .5-2 1.5s.8 1.5 2 1.5 2-.5 2-1.5-.8-1.5-2-1.5z" />

                                                                        {/* Right Shoe Print */}
                                                                        <path d="M16 10c-1.8 0-3 1.5-3 4s1.2 3.5 3 3.5 3-1 3-3.5-1.2-4-3-4z" />
                                                                        <path d="M16 18.5c-1.2 0-2 .5-2 1.5s.8 1.5 2 1.5 2-.5 2-1.5-.8-1.5-2-1.5z" />
                                                                    </svg>
                                                                ) : audit.status === 'Completed' ? (
                                                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                                    </svg>
                                                                ) : audit.status === 'Closed' ? (
                                                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                                                    </svg>
                                                                ) : (
                                                                    audit.auditNo.split('-').pop()
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.content}>
                <div className={styles.listHeader}>
                    <h2 className={styles.listTitle}>{t('audit.listTitle') || 'Audit List'}</h2>
                    <button
                        className={styles.addNewButton}
                        onClick={handleAddNew}
                    >
                        + {t('audit.addNew') || 'Add Audit'}
                    </button>
                </div>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>{t('audit.auditNo') || 'Audit No.'}</th>
                            <th>{t('audit.auditTitle') || 'Title'}</th>
                            <th>{t('audit.date') || 'Date'}</th>
                            <th>{t('common.contractor') || 'Vendor'}</th>
                            <th>{t('audit.location') || 'Location'}</th>
                            <th>{t('audit.auditor') || 'Auditor'}</th>
                            <th>{t('common.status')}</th>
                            <th>{t('common.operations')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredList.map((item, index) => (
                            <tr key={item.id} className={styles.normalRow}>
                                <td>{index + 1}</td>
                                <td>{item.auditNo}</td>
                                <td>{item.title}</td>
                                <td>{item.date}</td>
                                <td>{item.contractor || '-'}</td>
                                <td>{item.location}</td>
                                <td>{item.auditor}</td>
                                <td>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        backgroundColor: item.status === 'Closed' ? '#d1fae5' : '#f3f4f6',
                                        color: item.status === 'Closed' ? '#065f46' : '#374151'
                                    }}>
                                        {item.status}
                                    </span>
                                </td>
                                <td>
                                    <div className={styles.buttonGroup}>
                                        <button
                                            className={`${styles.actionBtn} ${styles.editBtn}`}
                                            onClick={() => handleEdit(item.id)}
                                            title={t('common.edit')}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                        </button>
                                        <button
                                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                            onClick={() => handleDeleteClick(item.id)}
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
                        ))}
                    </tbody>
                </table>
            </div>

            {
                isEditModalOpen && currentAuditId && (
                    <AuditEditModal
                        auditId={currentAuditId}
                        existingItem={auditList.find(item => item.id === currentAuditId)}
                        onSave={handleSaveAudit}
                        onClose={() => {
                            setIsEditModalOpen(false);
                            setCurrentAuditId(null);
                        }}
                    />
                )
            }

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                title={t('common.confirmDeleteTitle')}
                message={deleteModal.message}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteModal({ isOpen: false, id: null, message: '' })}
                confirmText={t('common.delete')}
                cancelText={t('common.cancel')}
            />
        </div >
    );
};

interface AuditEditModalProps {
    auditId: string;
    existingItem?: AuditItem;
    onSave: (updates: Partial<AuditItem>) => void;
    onClose: () => void;
}

const AuditEditModal: React.FC<AuditEditModalProps> = ({ auditId, existingItem, onSave, onClose }) => {
    const { t } = useLanguage();
    const { getActiveContractors } = useContractors();
    const activeContractors = getActiveContractors();

    const [formData, setFormData] = useState<Partial<AuditItem>>({
        auditNo: existingItem?.auditNo || '',
        title: existingItem?.title || '',
        date: existingItem?.date || '',
        auditor: existingItem?.auditor || '',
        status: existingItem?.status || 'Planned',
        location: existingItem?.location || '',
        findings: existingItem?.findings || '',
        contractor: existingItem?.contractor || '',
    });

    const handleFieldChange = (field: keyof AuditItem, value: string) => {
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
                    <h2>{existingItem ? (t('audit.editTitle') || 'Edit Audit') : (t('audit.addTitle') || 'New Audit')}</h2>
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>
                <div className={styles.modalBody}>
                    <div className={styles.formSections}>
                        <div className={styles.formSection}>
                            <h3 className={styles.sectionTitle}>{t('common.baseInfo')}</h3>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>{t('audit.auditNo') || 'Audit No.'}</label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        value={formData.auditNo}
                                        readOnly
                                        disabled
                                        placeholder={t('form.autoGenerated')}
                                        style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>{t('common.contractor') || 'Vendor'}</label>
                                    <select
                                        className={styles.formSelect}
                                        value={formData.contractor}
                                        onChange={(e) => handleFieldChange('contractor', e.target.value)}
                                    >
                                        <option value="">{t('common.selectPlaceholder') || 'Select Vendor'}</option>
                                        {activeContractors.map(vendor => (
                                            <option key={vendor.id} value={vendor.name}>{vendor.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>{t('audit.auditTitle') || 'Title'}</label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        value={formData.title}
                                        onChange={(e) => handleFieldChange('title', e.target.value)}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>{t('audit.date') || 'Date'}</label>
                                    <input
                                        type="date"
                                        className={styles.formInput}
                                        value={formData.date}
                                        onChange={(e) => handleFieldChange('date', e.target.value)}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>{t('audit.location') || 'Location'}</label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        value={formData.location}
                                        onChange={(e) => handleFieldChange('location', e.target.value)}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>{t('audit.auditor') || 'Auditor'}</label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        value={formData.auditor}
                                        onChange={(e) => handleFieldChange('auditor', e.target.value)}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>{t('common.status')}</label>
                                    <select
                                        className={styles.formSelect}
                                        value={formData.status}
                                        onChange={(e) => handleFieldChange('status', e.target.value)}
                                    >
                                        <option value="Planned">Planned</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Closed">Closed</option>
                                    </select>
                                </div>
                                <div className={styles.formGroupFull}>
                                    <label className={styles.optionalLabel}>{t('audit.findings') || 'Findings / Remarks'}</label>
                                    <textarea
                                        className={styles.formTextarea}
                                        value={formData.findings}
                                        onChange={(e) => handleFieldChange('findings', e.target.value)}
                                        rows={4}
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

export default Audit;

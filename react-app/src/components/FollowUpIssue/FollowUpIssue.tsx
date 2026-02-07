import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import ConfirmModal from '../Shared/ConfirmModal';
import styles from './FollowUpIssue.module.css';

const STORAGE_KEY_ISSUES = 'qualitas_follow_up_issues';

interface FollowUpIssueItem {
  id: string;
  issueNo: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedTo: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  action?: string;
}

const defaultIssues: FollowUpIssueItem[] = [
  {
    id: '1',
    issueNo: 'FUI-001',
    title: '範例問題',
    description: '這是一個範例問題描述',
    status: 'Open',
    priority: '高',
    assignedTo: '管理員',
    dueDate: '2026-02-01',
    createdAt: '2026-01-20',
    updatedAt: '2026-01-25',
    action: '',
  },
];

function loadIssuesFromStorage(): FollowUpIssueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ISSUES);
    if (raw) {
      const parsed = JSON.parse(raw) as FollowUpIssueItem[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return defaultIssues;
}

const FollowUpIssue: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [issues, setIssues] = useState<FollowUpIssueItem[]>(loadIssuesFromStorage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ISSUES, JSON.stringify(issues));
    } catch (_) {}
  }, [issues]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [currentIssueId, setCurrentIssueId] = useState<string | null>(null);
  const [viewingIssueId, setViewingIssueId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; message: string }>({
    isOpen: false,
    id: null,
    message: '',
  });

  const filteredIssues = useMemo(() => {
    return issues.filter(issue =>
      issue.issueNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.status.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [issues, searchQuery]);

  const statistics = useMemo(() => {
    const statusCounts = {
      opening: 0,
      closed: 0,
    };

    issues.forEach((item) => {
      const status = (item.status || 'Open').toLowerCase();
      if (status === 'open') {
        statusCounts.opening++;
      } else if (status === 'closed') {
        statusCounts.closed++;
      }
    });

    const total = issues.length;
    const openRate = total > 0 ? Math.round((statusCounts.opening / total) * 100) : 0;

    const closedRate = total > 0 ? Math.round((statusCounts.closed / total) * 100) : 0;
    return {
      ...statusCounts,
      total,
      openRate,
      closedRate,
    };
  }, [issues]);

  const pieData = useMemo(() => [
    { name: 'Open', value: statistics.opening, color: '#f59e0b' },
    { name: 'Closed', value: statistics.closed, color: '#10b981' },
  ], [statistics.opening, statistics.closed]);

  const handleEdit = (id: string) => {
    setCurrentIssueId(id);
    setIsEditModalOpen(true);
  };

  const handleViewDetails = (id: string) => {
    setViewingIssueId(id);
    setIsDetailsModalOpen(true);
  };

  const handleAddNew = () => {
    const newId = String(Date.now());
    setCurrentIssueId(newId);
    setIsEditModalOpen(true);
  };

  const handleSaveIssueDetails = (updates: Partial<FollowUpIssueItem>) => {
    if (currentIssueId) {
      const existingItem = issues.find(item => item.id === currentIssueId);
      if (existingItem) {
        setIssues(prev =>
          prev.map(issue =>
            issue.id === currentIssueId
              ? { ...issue, ...updates, updatedAt: new Date().toISOString().split('T')[0] }
              : issue
          )
        );
      } else {
        const newIssueNo = `FUI-${String(issues.length + 1).padStart(3, '0')}`;
        const newItem: FollowUpIssueItem = {
          id: currentIssueId,
          issueNo: newIssueNo,
          title: '', // 保留欄位但設為空，因為已從表格移除
          description: updates.description || '',
          status: updates.status || 'Open',
          priority: '', // 保留欄位但設為空，因為已從表格移除
          assignedTo: updates.assignedTo || '',
          dueDate: updates.dueDate || '',
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0],
          action: updates.action || '',
        };
        setIssues(prev => [...prev, newItem]);
      }
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModal({ isOpen: true, id, message: '確定要刪除此問題嗎？' });
  };

  const handleDeleteConfirm = () => {
    if (deleteModal.id) {
      setIssues(prev => prev.filter(issue => issue.id !== deleteModal.id));
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
          <h1>Follow up Issue</h1>
        </div>
        <div className={styles.headerRight}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="搜尋問題..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className={styles.summaryRow}>
        <div className={styles.summarySection}>
          <h2 className={styles.summaryTitle}>狀態統計</h2>
          <div className={styles.statusStatsGrid}>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.blueIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Open</div>
                <div className={styles.statValue}>{statistics.opening}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.grayIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Closed</div>
                <div className={styles.statValue}>{statistics.closed}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.grayIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18 17V9M12 17V5M6 17v-3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Total</div>
                <div className={styles.statValue}>{statistics.total}</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIcon} ${styles.blueIcon}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Open Rate</div>
                <div className={styles.statValue}>{statistics.opening} ({statistics.openRate}%)</div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.chartSection}>
          <div className={styles.pieChartInner}>
            {statistics.total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 4, right: 24, bottom: 4, left: 24 }}>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={64}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ cx, cy, midAngle, outerRadius, name, value, percent }) => {
                      const RADIAN = Math.PI / 180;
                      const extendLen = 14;   // 徑向延伸長度
                      const hLen = 24;       // 水平轉折後長度
                      const sx = cx + outerRadius * Math.cos(-midAngle * RADIAN);
                      const sy = cy + outerRadius * Math.sin(-midAngle * RADIAN);
                      const bx = sx + extendLen * Math.cos(-midAngle * RADIAN);
                      const by = sy + extendLen * Math.sin(-midAngle * RADIAN);
                      const toRight = bx >= cx;
                      const tx = bx + (toRight ? hLen : -hLen);
                      const pct = Math.round((percent ?? 0) * 100);
                      return (
                        <g>
                          <polyline
                            points={`${sx},${sy} ${bx},${by} ${tx},${by}`}
                            fill="none"
                            stroke="#9ca3af"
                            strokeWidth={1}
                          />
                          <text
                            x={tx}
                            y={by}
                            textAnchor={toRight ? 'start' : 'end'}
                            dominantBaseline="middle"
                            fill="#1f2937"
                            fontSize={13}
                            fontWeight={500}
                          >
                            <tspan x={tx} dy="-0.4em" display="block">{name}</tspan>
                            <tspan x={tx} dy="1.2em" fontSize={12} fill="#6b7280" fontWeight={400}>
                              {value} 筆 · {pct}%
                            </tspan>
                          </text>
                        </g>
                      );
                    }}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.pieChartEmpty}>無資料</div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.listHeader}>
          <h2 className={styles.listTitle}>問題列表</h2>
          <button
            className={styles.addNewButton}
            onClick={handleAddNew}
          >
            + 新增問題
          </button>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Reference no.</th>
              <th>Status</th>
              <th>Description</th>
              <th>Action</th>
              <th>Assigned To</th>
              <th>Created Date</th>
              <th>Due Date</th>
              <th>Operations</th>
            </tr>
          </thead>
          <tbody>
            {filteredIssues.map((issue, index) => {
              // Check if row should be green (Status is Closed)
              const isClosedRow = (issue.status || 'Open').toLowerCase() === 'closed';

              return (
                <tr key={issue.id} className={isClosedRow ? styles.greenRow : styles.normalRow}>
                  <td>{index + 1}</td>
                  <td>{issue.issueNo}</td>
                  <td><span>{issue.status}</span></td>
                  <td><span>{issue.description}</span></td>
                  <td><span>{issue.action || '-'}</span></td>
                  <td><span>{issue.assignedTo}</span></td>
                  <td>{issue.createdAt}</td>
                  <td><span>{issue.dueDate}</span></td>
                  <td>
                    <div className={styles.buttonGroup}>
                      <button
                        className={`${styles.actionBtn} ${styles.editBtn}`}
                        onClick={() => handleEdit(issue.id)}
                        title="Edit"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.detailsBtn}`}
                        onClick={() => handleViewDetails(issue.id)}
                        title="Details"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => handleDeleteClick(issue.id)}
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

      {isEditModalOpen && currentIssueId && (
        <FollowUpIssueDetailModal
          issueId={currentIssueId}
          existingItem={issues.find(item => item.id === currentIssueId)}
          onSave={handleSaveIssueDetails}
          onClose={() => {
            setIsEditModalOpen(false);
            setCurrentIssueId(null);
          }}
        />
      )}

      {isDetailsModalOpen && viewingIssueId && (
        <FollowUpIssueDetailsViewModal
          issueId={viewingIssueId}
          issueItem={issues.find(item => item.id === viewingIssueId)}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setViewingIssueId(null);
          }}
        />
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="確認刪除"
        message={deleteModal.message || '確定要刪除此問題嗎？'}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, message: '' })}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

interface FollowUpIssueDetailModalProps {
  issueId: string;
  existingItem?: FollowUpIssueItem;
  onSave: (updates: Partial<FollowUpIssueItem>) => void;
  onClose: () => void;
}

const FollowUpIssueDetailModal: React.FC<FollowUpIssueDetailModalProps> = ({ issueId, existingItem, onSave, onClose }) => {
  const [formData, setFormData] = useState<Partial<FollowUpIssueItem>>({
    issueNo: existingItem?.issueNo || '',
    description: existingItem?.description || '',
    status: existingItem?.status || 'Open',
    assignedTo: existingItem?.assignedTo || '',
    dueDate: existingItem?.dueDate || '',
    action: existingItem?.action || '',
  });
  const actionTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFieldChange = (field: keyof FollowUpIssueItem, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInsertDate = () => {
    const textarea = actionTextareaRef.current;
    if (!textarea) return;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const dateWithUnderscore = today + '_'; // 日期後添加下底線
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = formData.action || '';
    
    // 在游標位置插入日期和下底線
    const newValue = currentValue.substring(0, start) + dateWithUnderscore + currentValue.substring(end);
    
    setFormData(prev => ({ ...prev, action: newValue }));
    
    // 設置游標位置到插入日期和下底線之後
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + dateWithUnderscore.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{existingItem ? '編輯 Follow Up Issue' : '新增 Follow Up Issue'}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formSections}>
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>問題資訊</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Reference no.</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.issueNo || ''}
                    onChange={(e) => handleFieldChange('issueNo', e.target.value)}
                    readOnly={!!existingItem}
                    style={existingItem ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Status</label>
                  <select
                    className={styles.formSelect}
                    value={formData.status || 'Open'}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                  >
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Assigned To</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.assignedTo || ''}
                    onChange={(e) => handleFieldChange('assignedTo', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Created Date</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={existingItem?.createdAt || ''}
                    readOnly
                    style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Due Date</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={formData.dueDate || ''}
                    onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                  />
                </div>
                <div className={styles.formGroupFull}>
                  <label>Description</label>
                  <textarea
                    className={styles.formTextarea}
                    value={formData.description || ''}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    rows={4}
                  />
                </div>
                <div className={styles.formGroupFull}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label>Action</label>
                    <button
                      type="button"
                      onClick={handleInsertDate}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#45a049';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#4CAF50';
                      }}
                    >
                      Date
                    </button>
                  </div>
                  <textarea
                    ref={actionTextareaRef}
                    className={styles.formTextarea}
                    value={formData.action || ''}
                    onChange={(e) => handleFieldChange('action', e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.saveButton} onClick={handleSave}>
            保存
          </button>
          <button className={styles.cancelButton} onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

interface FollowUpIssueDetailsViewModalProps {
  issueId: string;
  issueItem?: FollowUpIssueItem;
  onClose: () => void;
}

const FollowUpIssueDetailsViewModal: React.FC<FollowUpIssueDetailsViewModalProps> = ({ issueId, issueItem, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  if (!issueItem) {
    return null;
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Follow Up Issue Details</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formSections}>
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>問題資訊</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Reference no.</label>
                  <div className={styles.readOnlyField}>{issueItem.issueNo || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>Status</label>
                  <div className={styles.readOnlyField}>{issueItem.status || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>Assigned To</label>
                  <div className={styles.readOnlyField}>{issueItem.assignedTo || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>Created Date</label>
                  <div className={styles.readOnlyField}>{issueItem.createdAt || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>Due Date</label>
                  <div className={styles.readOnlyField}>{issueItem.dueDate || '-'}</div>
                </div>
                <div className={styles.formGroupFull}>
                  <label>Description</label>
                  <div className={styles.readOnlyField}>{issueItem.description || '-'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>Action</label>
                  <div className={styles.readOnlyField}>{issueItem.action || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.printButton} onClick={handlePrint}>
            Print
          </button>
          <button className={styles.cancelButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FollowUpIssue;

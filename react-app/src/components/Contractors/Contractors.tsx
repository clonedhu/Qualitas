import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useContractors, Contractor } from '../../context/ContractorsContext';
import ConfirmModal from '../Shared/ConfirmModal';
import styles from './Contractors.module.css';

const Contractors: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { contractors, addContractor, updateContractor, deleteContractor } = useContractors();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; message: string }>({
    isOpen: false,
    id: null,
    message: '',
  });
  const [formData, setFormData] = useState({
    package: '',
    name: '',
    abbreviation: '',
    scope: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    status: 'active' as 'active' | 'inactive',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateContractor(editingId, formData);
    } else {
      await addContractor(formData);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleEdit = (contractor: Contractor) => {
    setEditingId(contractor.id);
    setFormData({
      package: contractor.package || '',
      name: contractor.name,
      abbreviation: contractor.abbreviation || '',
      scope: contractor.scope,
      contactPerson: contractor.contactPerson,
      email: contractor.email,
      phone: contractor.phone,
      address: contractor.address,
      status: contractor.status,
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModal({ isOpen: true, id, message: t('contractors.confirmDelete') });
  };

  const handleDeleteConfirm = async () => {
    if (deleteModal.id) {
      await deleteContractor(deleteModal.id);
      setDeleteModal({ isOpen: false, id: null, message: '' });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      package: '',
      name: '',
      abbreviation: '',
      scope: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      status: 'active',
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button type="button" className={styles.backButton} onClick={() => navigate('/')}>
          ← {t('common.back') || 'Back'}
        </button>
        <h1>{t('contractors.title')}</h1>
        <button className={styles.addButton} onClick={() => { resetForm(); setIsModalOpen(true); }}>
          + {t('contractors.addContractor')}
        </button>
      </div>
      <div className={styles.content}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('contractors.package')}</th>
              <th>{t('contractors.abbreviation')}</th>
              <th>{t('contractors.name')}</th>
              <th>{t('contractors.scope')}</th>
              <th>{t('contractors.contactPerson')}</th>
              <th>{t('contractors.email')}</th>
              <th>{t('contractors.phone')}</th>
              <th>{t('contractors.status')}</th>
              <th>{t('contractors.operations')}</th>
            </tr>
          </thead>
          <tbody>
            {contractors.map((contractor) => (
              <tr key={contractor.id}>
                <td>{contractor.package || '-'}</td>
                <td>{contractor.abbreviation || '-'}</td>
                <td>{contractor.name}</td>
                <td>{contractor.scope}</td>
                <td>{contractor.contactPerson}</td>
                <td>{contractor.email}</td>
                <td>{contractor.phone}</td>
                <td>
                  <span className={`${styles.status} ${styles[contractor.status]}`}>
                    {contractor.status === 'active' ? t('contractors.status.active') : t('contractors.status.inactive')}
                  </span>
                </td>
                <td>
                  <div className={styles.buttonGroup}>
                    <button
                      className={`${styles.actionBtn} ${styles.editBtn}`}
                      onClick={() => handleEdit(contractor)}
                      title={t('common.edit')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.deleteBtn}`}
                      onClick={() => handleDeleteClick(contractor.id)}
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

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={t('common.confirmDeleteTitle')}
        message={deleteModal.message || t('contractors.confirmDelete')}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, message: '' })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
      />

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? t('contractors.editContractor') : t('contractors.addContractor')}</h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>{t('contractors.package')}</label>
                <input
                  type="text"
                  value={formData.package}
                  onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t('contractors.name')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t('contractors.abbreviation')}</label>
                <input
                  type="text"
                  value={formData.abbreviation}
                  onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t('contractors.scope')}</label>
                <input
                  type="text"
                  value={formData.scope}
                  onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t('contractors.contactPerson')}</label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t('contractors.email')}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t('contractors.phone')}</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t('contractors.address')}</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t('contractors.status')}</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                >
                  <option value="active">{t('contractors.status.active')}</option>
                  <option value="inactive">{t('contractors.status.inactive')}</option>
                </select>
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.submitButton}>
                  {editingId ? t('common.edit') : t('common.add')}
                </button>
                <button type="button" className={styles.cancelButton} onClick={() => { setIsModalOpen(false); resetForm(); }}>
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contractors;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import styles from './OSD.module.css';

const OSD: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button type="button" className={styles.backButton} onClick={() => navigate('/')}>
            ← {t('common.back') || 'Back'}
          </button>
          <h1>OSD (Over, Short and Damaged)</h1>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.placeholder}>
          <h2>Over, Short and Damaged Management</h2>
          <p>OSD 模組</p>
          <p className={styles.description}>
            此模組用於管理超短損壞相關紀錄與追蹤，功能開發中。
          </p>
        </div>
      </div>
    </div>
  );
};

export default OSD;

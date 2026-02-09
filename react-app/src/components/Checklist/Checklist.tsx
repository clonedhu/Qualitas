import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { BackButton } from '../ui/BackButton';
import styles from './Checklist.module.css';

const Checklist: React.FC = () => {
    const { t } = useLanguage();

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <BackButton />
                    <h1>{t('home.checklist.description') || 'Checklist'}</h1>
                </div>
            </div>
            <div className={styles.content}>
                <div className={styles.placeholderCard}>
                    <div className={styles.placeholderIcon}>✅</div>
                    <h2>Checklist Module</h2>
                    <p>This module is currently under development. Quality checklists will be managed here.</p>
                </div>
            </div>
        </div>
    );
};

export default Checklist;

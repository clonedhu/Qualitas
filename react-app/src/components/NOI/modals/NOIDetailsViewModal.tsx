import React, { useState } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { useContractors } from '../../../context/ContractorsContext';
import { useITP } from '../../../context/ITPContext';
import { NOIItem } from '../../../context/NOIContext';
import FileAttachment from '../../Shared/FileAttachment';
import styles from '../NOI.module.css';
import { NOIDetailData } from '../NOITypes';
import { formatTime24h, getLocalizedStatus } from '../../../utils/formatters';
import { StatusBadge } from '../../Shared/StatusBadge';

export interface NOIDetailsViewModalProps {
    noiId: string;
    noiItem?: NOIItem;
    noiDetailData?: NOIDetailData;
    onClose: () => void;
    onPrint: (data: NOIDetailData) => void;
}

export const NOIDetailsViewModal: React.FC<NOIDetailsViewModalProps> = ({ noiId, noiItem, noiDetailData, onClose, onPrint }) => {
    const { t } = useLanguage();
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
                        <div className={styles.formSection}>
                            <h3 className={styles.sectionTitle}>{t('noi.detailsTitle')}</h3>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}><label>{t('common.referenceNo')}</label><div className={styles.readOnlyField}>{displayData.referenceNo || '-'}</div></div>
                                <div className={styles.formGroup}><label>{t('common.contractor')}</label><div className={styles.readOnlyField}>{displayData.contractor || '-'}</div></div>
                                <div className={styles.formGroup}><label>{t('noi.ncrReference')}</label><div className={styles.readOnlyField}>{displayData.ncrNumber || '-'}</div></div>
                                <div className={styles.formGroup}><label>{t('noi.package')}</label><div className={styles.readOnlyField}>{displayData.package || '-'}</div></div>
                                <div className={styles.formGroup}><label>{t('noi.itpNo')}</label><div className={styles.readOnlyField}>{displayData.itpNo || '-'}</div></div>
                                <div className={styles.formGroup}><label>{t('noi.issueDate')}</label><div className={styles.readOnlyField}>{displayData.issueDate || '-'}</div></div>
                                <div className={styles.formGroup}><label>{t('noi.inspectionDate')}</label><div className={styles.readOnlyField}>{displayData.inspectionDate || '-'}</div></div>
                                <div className={styles.formGroup}><label>{t('noi.inspectionTime')}</label><div className={styles.readOnlyField}>{formatTime24h(displayData.inspectionTime)}</div></div>
                                <div className={styles.formGroup}><label>{t('noi.eventNo')}</label><div className={styles.readOnlyField}>{displayData.eventNumber || '-'}</div></div>
                                <div className={styles.formGroup}><label>{t('noi.checkpoint')}</label><div className={styles.readOnlyField}>{displayData.checkpoint || '-'}</div></div>
                            </div>
                        </div>
                        <div className={styles.formSection}>
                            <h3 className={styles.sectionTitle}>{t('common.contactInfo')}</h3>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}><label>{t('contractors.contact')}</label><div className={styles.readOnlyField}>{displayData.contacts || '-'}</div></div>
                                <div className={styles.formGroup}><label>{t('contractors.phone')}</label><div className={styles.readOnlyField}>{displayData.phone || '-'}</div></div>
                                <div className={styles.formGroupFull}><label>{t('contractors.email')}</label><div className={styles.readOnlyField}>{displayData.email || '-'}</div></div>
                            </div>
                        </div>
                        <div className={styles.formSection}>
                            <h3 className={styles.sectionTitle}>{t('noi.sectionQuality')}</h3>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}><label>{t('common.status')}</label><div className={styles.readOnlyField} style={{ border: 'none', padding: 0 }}><StatusBadge status={displayData.status} label={getLocalizedStatus(displayData.status, t)} /></div></div>
                                <div className={styles.formGroup}><label>{t('noi.closeoutDate')}</label><div className={styles.readOnlyField}>{displayData.closeoutDate || '-'}</div></div>
                                <div className={styles.formGroupFull}><label>{t('common.remark')}</label><div className={styles.readOnlyField} style={{ whiteSpace: 'pre-wrap', minHeight: '80px' }}>{displayData.remark || '-'}</div></div>
                            </div>
                        </div>
                        <FileAttachment
                            attachments={displayData.attachments || []}
                            onUpload={() => { }}
                            onRemove={() => { }}
                            id="noi-view"
                            readOnly={true}
                        />
                    </div>
                </div>
                <div className={styles.modalActions}>
                    <button className={styles.printButton} onClick={() => onPrint(displayData)}>{t('common.print')}</button>
                    <button className={styles.cancelButton} onClick={onClose}>{t('common.close')}</button>
                </div>
            </div>
            {previewUrl && (
                <div className={styles.previewOverlay} onClick={() => setPreviewUrl(null)}>
                    <div className={styles.previewContent} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.previewCloseButton} onClick={() => setPreviewUrl(null)}>×</button>
                        {previewUrl.startsWith('data:application/pdf') ? <iframe src={previewUrl} className={styles.previewIframe} title="PDF Preview" /> : <img src={previewUrl} alt="Preview" className={styles.previewImage} />}
                        <div className={styles.previewLabel}>{displayData.package || t('itp.selfInspection.attachments')}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

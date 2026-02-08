
import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface FileAttachmentProps {
    attachments: string[];
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: (index: number) => void;
    id: string;
    title?: string;
    buttonText?: string;
    readOnly?: boolean;
    accept?: string;
}

const FileAttachment: React.FC<FileAttachmentProps> = ({
    attachments,
    onUpload,
    onRemove,
    id,
    title,
    buttonText,
    readOnly = false,
    accept = "image/*"
}) => {
    const { t } = useLanguage();

    // Original thumbnail grid style matching OBS.module.css
    const styles = {
        container: {
            marginBottom: '24px'
        },
        sectionTitle: {
            fontSize: '14px',
            fontWeight: 600,
            color: '#374151',
            marginBottom: '12px',
            paddingLeft: '12px',
            borderLeft: '3px solid #3b82f6'
        },
        photoUploadContainer: {
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '12px'
        },
        photoInput: {
            display: 'none'
        },
        photoUploadButton: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 20px',
            border: '2px dashed #d1d5db',
            borderRadius: '8px',
            backgroundColor: '#ffffff',
            color: '#6b7280',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontSize: '14px',
            fontWeight: 500,
            width: 'fit-content'
        },
        photoPreviewGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '12px',
            marginTop: '8px'
        },
        photoPreviewItem: {
            position: 'relative' as const,
            width: '100%',
            aspectRatio: '1',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb'
        },
        photoPreview: {
            width: '100%',
            height: '100%',
            objectFit: 'cover' as const,
            display: 'block'
        },
        photoRemoveButton: {
            position: 'absolute' as const,
            top: '4px',
            right: '4px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            lineHeight: 1
        },
        labelSpan: {
            fontSize: '14px',
            fontWeight: 500
        }
    };

    return (
        <div style={styles.container}>
            <h3 style={styles.sectionTitle}>
                {title || t('common.attachments')}
            </h3>
            <div style={styles.photoUploadContainer}>
                {!readOnly && (
                    <>
                        <input
                            type="file"
                            accept={accept}
                            multiple
                            onChange={onUpload}
                            style={styles.photoInput}
                            id={`attachment-upload-${id}`}
                        />
                        <label htmlFor={`attachment-upload-${id}`} style={styles.photoUploadButton}>
                            <span style={styles.labelSpan}>
                                {buttonText || t('common.uploadFiles')}
                            </span>
                        </label>
                    </>
                )}

                {attachments && attachments.length > 0 && (
                    <div style={styles.photoPreviewGrid}>
                        {attachments.map((attachment, index) => (
                            <div key={index} style={styles.photoPreviewItem}>
                                <img
                                    src={attachment}
                                    alt={`Attachment ${index + 1}`}
                                    style={styles.photoPreview}
                                />
                                {!readOnly && (
                                    <button
                                        type="button"
                                        style={styles.photoRemoveButton}
                                        onClick={() => onRemove(index)}
                                        aria-label={t('common.delete')}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileAttachment;

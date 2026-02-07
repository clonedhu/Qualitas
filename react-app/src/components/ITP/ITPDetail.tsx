import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import styles from './ITPDetail.module.css';

const MIN_TEXTAREA_HEIGHT = 40;

function resizeTextarea(el: HTMLTextAreaElement) {
  el.style.height = 'auto';
  el.style.height = Math.max(el.scrollHeight, MIN_TEXTAREA_HEIGHT) + 'px';
}

interface ITPItem {
  id: string;
  eventNo: string;
  activity: string;
  standard: string;
  acceptanceCriteria: string;
  checkTiming: string;
  inspectionMethod: string;
  frequency: string;
  nonconformityTreatment: string;
  records: string;
  subcon: string;
  epci: string;
  employer: string;
  hse: string;
}

interface ITPData {
  a: ITPItem[];
  b: ITPItem[];
  c: ITPItem[];
}

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface SelfInspectionHeader {
  organizingUnit: string;
  supervisingUnit: string;
  contractor: string;
  constructionLocation: string;
  applicationDate: string;
  entryType: string;
  entrySequenceNo: string;
}

interface QuantityRow {
  id: string;
  name: string;
  contractQty: string;
  previous: string;
  current: string;
  accumulated: string;
}

interface ChecklistQuestion {
  id: string;
  text: string;
  value: '' | 'yes' | 'no' | 'na';
  quantityInput?: string;
  quantityInput2?: string;
}

interface SelfInspectionAttachments {
  spec: boolean;
  submission: boolean;
  drawing: boolean;
  other: boolean;
}

type AuditResult = '' | 'approved' | 'resample' | 'reject';

interface SelfInspectionSignatures {
  siteSupervisor: string;
  fieldEngineer: string;
}

interface MaterialDetailRow {
  id: string;
  inspectionItem: string;
  brand: string;
  heatNo: string;
  model: string;
  number: string;
  subtotal: string;
  sampleQty: string;
  location: string;
}

interface SelfInspectionData {
  header: SelfInspectionHeader;
  quantityRows: QuantityRow[];
  materialDetails: MaterialDetailRow[];
  questions: ChecklistQuestion[];
  attachments: SelfInspectionAttachments;
  auditResult: AuditResult;
  auditComment: string;
  signatures: SelfInspectionSignatures;
  q7SubItems: { customs: boolean; materialCert: boolean; testReport: boolean; equipmentList: boolean; other: boolean };
}

const DEFAULT_SELF_INSPECTION: SelfInspectionData = {
  header: {
    organizingUnit: '',
    supervisingUnit: '',
    contractor: '',
    constructionLocation: '',
    applicationDate: '',
    entryType: '',
    entrySequenceNo: '',
  },
  quantityRows: [
    { id: 'qty-1', name: 'SD280W', contractQty: '', previous: '', current: '', accumulated: '' },
    { id: 'qty-2', name: 'SD420W', contractQty: '', previous: '', current: '', accumulated: '' },
  ],
  materialDetails: [
    { id: 'md1', inspectionItem: '竹節鋼筋', brand: '', heatNo: '', model: 'SD280W', number: '#3', subtotal: '', sampleQty: '', location: '' },
    { id: 'md2', inspectionItem: '', brand: '', heatNo: '', model: '', number: '合計', subtotal: '', sampleQty: '', location: '' },
    { id: 'md3', inspectionItem: '竹節鋼筋', brand: '', heatNo: '', model: 'SD420W', number: '#4', subtotal: '', sampleQty: '', location: '' },
    { id: 'md4', inspectionItem: '竹節鋼筋', brand: '', heatNo: '', model: 'SD420W', number: '#5', subtotal: '', sampleQty: '', location: '' },
    { id: 'md5', inspectionItem: '竹節鋼筋', brand: '', heatNo: '', model: 'SD420W', number: '#6', subtotal: '', sampleQty: '', location: '' },
    { id: 'md6', inspectionItem: '竹節鋼筋', brand: '', heatNo: '', model: 'SD420W', number: '#8', subtotal: '', sampleQty: '', location: '' },
    { id: 'md7', inspectionItem: '', brand: '', heatNo: '', model: '', number: '合計', subtotal: '', sampleQty: '', location: '' },
    { id: 'md8', inspectionItem: '續接器', brand: '', heatNo: '', model: 'SD420W', number: '續接器', subtotal: '', sampleQty: '', location: '' },
    { id: 'md9', inspectionItem: '', brand: '', heatNo: '', model: '', number: '合計', subtotal: '', sampleQty: '', location: '' },
  ],
  questions: [
    { id: 'q1', text: '本項進場設備材料，其廠牌型號是否符合規定', value: '' },
    { id: 'q2', text: '本項進場設備材料，其數量為 SD280W【 】噸；SD420W【 】噸', value: '', quantityInput: '', quantityInput2: '' },
    { id: 'q3', text: '本項進場設備材料，其規格尺寸是否符合規定', value: '' },
    { id: 'q4', text: '本項進場設備材料，其顏色、附屬配件是否齊全符合要求', value: '' },
    { id: 'q5', text: '本項進場設備材料，其外觀是否無不當損壞', value: '' },
    { id: 'q6', text: '本項進場設備材料，貯放位置及保存方式是否符合要求', value: '' },
    { id: 'q7', text: '本項進場設備材料，其檢附資料是否齊全', value: '' },
  ],
  attachments: { spec: false, submission: false, drawing: false, other: false },
  auditResult: '',
  auditComment: '',
  signatures: { siteSupervisor: '', fieldEngineer: '' },
  q7SubItems: { customs: false, materialCert: false, testReport: false, equipmentList: false, other: false },
};

const ITPDetail: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { id: itpId } = useParams<{ id: string }>();
  const [itpTitle, setItpTitle] = useState<string>('');

  const defaultItpData: ITPData = {
    a: [{ id: 'a1', eventNo: 'A1', activity: '', standard: '', acceptanceCriteria: '', checkTiming: '', inspectionMethod: '', frequency: '', nonconformityTreatment: '', records: '', subcon: '', epci: '', employer: '', hse: '' }],
    b: [{ id: 'b1', eventNo: 'B1', activity: '', standard: '', acceptanceCriteria: '', checkTiming: '', inspectionMethod: '', frequency: '', nonconformityTreatment: '', records: '', subcon: '', epci: '', employer: '', hse: '' }],
    c: [{ id: 'c1', eventNo: 'C1', activity: '', standard: '', acceptanceCriteria: '', checkTiming: '', inspectionMethod: '', frequency: '', nonconformityTreatment: '', records: '', subcon: '', epci: '', employer: '', hse: '' }],
  };

  const [itpData, setItpData] = useState<ITPData>(defaultItpData);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [selfInspection, setSelfInspection] = useState<SelfInspectionData>(DEFAULT_SELF_INSPECTION);
  const contentRef = useRef<HTMLDivElement>(null);
  const loadedFromApiRef = useRef(false);

  const autoResizeTextarea = (e: React.FormEvent<HTMLTextAreaElement>) => {
    resizeTextarea(e.currentTarget);
  };

  const handleTextareaChange = (
    section: 'a' | 'b' | 'c',
    itemId: string,
    field: keyof ITPItem,
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    updateItem(section, itemId, field, e.target.value);
    resizeTextarea(e.target);
  };

  const norm = (arr: ITPItem[] | undefined, section: 'a' | 'b' | 'c'): ITPItem[] => {
    const def = defaultItpData[section];
    if (!Array.isArray(arr) || arr.length === 0) return def;
    const pre = section.toUpperCase();
    return arr.map((x: Partial<ITPItem>, i: number) => ({
      id: x.id ?? `${section}${i + 1}`,
      eventNo: x.eventNo ?? `${pre}${i + 1}`,
      activity: x.activity ?? '',
      standard: x.standard ?? '',
      acceptanceCriteria: x.acceptanceCriteria ?? '',
      checkTiming: x.checkTiming ?? '',
      inspectionMethod: x.inspectionMethod ?? '',
      frequency: x.frequency ?? '',
      nonconformityTreatment: x.nonconformityTreatment ?? '',
      records: x.records ?? '',
      subcon: x.subcon ?? '',
      epci: x.epci ?? '',
      employer: x.employer ?? '',
      hse: x.hse ?? '',
    }));
  };

  const parseDetailData = (raw: unknown): { a?: ITPItem[]; b?: ITPItem[]; c?: ITPItem[]; checklist?: ChecklistItem[]; self_inspection?: unknown } | null => {
    if (raw == null) return null;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as { a?: ITPItem[]; b?: ITPItem[]; c?: ITPItem[]; checklist?: ChecklistItem[]; self_inspection?: unknown };
      } catch {
        return null;
      }
    }
    if (typeof raw === 'object' && raw !== null && ('a' in raw || 'b' in raw || 'c' in raw)) {
      return raw as { a?: ITPItem[]; b?: ITPItem[]; c?: ITPItem[]; checklist?: ChecklistItem[]; self_inspection?: unknown };
    }
    return null;
  };

  const normChecklist = (arr: unknown): ChecklistItem[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map((x: Partial<ChecklistItem>, i: number) => ({
      id: x.id ?? `cl-${i + 1}`,
      label: typeof x.label === 'string' ? x.label : '',
      checked: !!x.checked,
    }));
  };

  const normSelfInspection = (raw: unknown): SelfInspectionData => {
    if (raw == null || typeof raw !== 'object') return DEFAULT_SELF_INSPECTION;
    const o = raw as Record<string, unknown>;
    const h = o.header as Record<string, unknown> | undefined;
    const header: SelfInspectionHeader = {
      organizingUnit: typeof h?.organizingUnit === 'string' ? h.organizingUnit : '',
      supervisingUnit: typeof h?.supervisingUnit === 'string' ? h.supervisingUnit : '',
      contractor: typeof h?.contractor === 'string' ? h.contractor : '',
      constructionLocation: typeof h?.constructionLocation === 'string' ? h.constructionLocation : '',
      applicationDate: typeof h?.applicationDate === 'string' ? h.applicationDate : '',
      entryType: typeof h?.entryType === 'string' ? h.entryType : '',
      entrySequenceNo: typeof h?.entrySequenceNo === 'string' ? h.entrySequenceNo : '',
    };
    const qRows = Array.isArray(o.quantityRows) ? o.quantityRows : DEFAULT_SELF_INSPECTION.quantityRows;
    const quantityRows: QuantityRow[] = qRows.map((r: Partial<QuantityRow>, i: number) => ({
      id: r?.id ?? `qty-${i + 1}`,
      name: typeof r?.name === 'string' ? r.name : '',
      contractQty: typeof r?.contractQty === 'string' ? r.contractQty : '',
      previous: typeof r?.previous === 'string' ? r.previous : '',
      current: typeof r?.current === 'string' ? r.current : '',
      accumulated: typeof r?.accumulated === 'string' ? r.accumulated : '',
    }));
    const mdList = Array.isArray(o.materialDetails) ? o.materialDetails : DEFAULT_SELF_INSPECTION.materialDetails;
    const materialDetails: MaterialDetailRow[] = mdList.map((r: Partial<MaterialDetailRow>, i: number) => ({
      id: r?.id ?? `md-${i + 1}`,
      inspectionItem: typeof r?.inspectionItem === 'string' ? r.inspectionItem : '',
      brand: typeof r?.brand === 'string' ? r.brand : '',
      heatNo: typeof r?.heatNo === 'string' ? r.heatNo : '',
      model: typeof r?.model === 'string' ? r.model : '',
      number: typeof r?.number === 'string' ? r.number : '',
      subtotal: typeof r?.subtotal === 'string' ? r.subtotal : '',
      sampleQty: typeof r?.sampleQty === 'string' ? r.sampleQty : '',
      location: typeof r?.location === 'string' ? r.location : '',
    }));
    const qList = Array.isArray(o.questions) ? o.questions : DEFAULT_SELF_INSPECTION.questions;
    const questions: ChecklistQuestion[] = qList.map((q: Partial<ChecklistQuestion>, i: number) => ({
      id: q?.id ?? `q${i + 1}`,
      text: typeof q?.text === 'string' ? q.text : DEFAULT_SELF_INSPECTION.questions[i]?.text ?? '',
      value: (q?.value === 'yes' || q?.value === 'no' || q?.value === 'na' ? q.value : '') as '' | 'yes' | 'no' | 'na',
      quantityInput: typeof (q as ChecklistQuestion).quantityInput === 'string' ? (q as ChecklistQuestion).quantityInput : '',
      quantityInput2: typeof (q as ChecklistQuestion).quantityInput2 === 'string' ? (q as ChecklistQuestion).quantityInput2 : '',
    }));
    const att = o.attachments as Record<string, unknown> | undefined;
    const attachments: SelfInspectionAttachments = {
      spec: !!att?.spec,
      submission: !!att?.submission,
      drawing: !!att?.drawing,
      other: !!att?.other,
    };
    const sig = o.signatures as Record<string, unknown> | undefined;
    const signatures: SelfInspectionSignatures = {
      siteSupervisor: typeof sig?.siteSupervisor === 'string' ? sig.siteSupervisor : '',
      fieldEngineer: typeof sig?.fieldEngineer === 'string' ? sig.fieldEngineer : '',
    };
    const q7 = o.q7SubItems as Record<string, unknown> | undefined;
    const q7SubItems = {
      customs: !!q7?.customs,
      materialCert: !!q7?.materialCert,
      testReport: !!q7?.testReport,
      equipmentList: !!q7?.equipmentList,
      other: !!q7?.other,
    };
    const auditResult: AuditResult = (o.auditResult === 'approved' || o.auditResult === 'resample' || o.auditResult === 'reject') ? o.auditResult : '';
    const auditComment = typeof o.auditComment === 'string' ? o.auditComment : '';
    return { header, quantityRows, materialDetails, questions, attachments, auditResult, auditComment, signatures, q7SubItems };
  };

  useEffect(() => {
    if (!itpId) return;
    const fetchItp = async () => {
      try {
        const res = await api.get(`/itp/${itpId}`);
        // 標題使用 Title (description)，不用 Reference no. (workingFlow)
        setItpTitle((res.data?.description ?? '').trim());
        const parsed = parseDetailData(res.data?.detail_data);
        if (parsed) {
          loadedFromApiRef.current = true;
          setItpData({
            a: norm(parsed.a, 'a'),
            b: norm(parsed.b, 'b'),
            c: norm(parsed.c, 'c'),
          });
          setChecklist(normChecklist(parsed.checklist));
          setSelfInspection(normSelfInspection(parsed.self_inspection));
        }
      } catch {
        setItpTitle('');
      }
    };
    fetchItp();
  }, [itpId]);

  useEffect(() => {
    if (!loadedFromApiRef.current || !contentRef.current) return;
    loadedFromApiRef.current = false;
    contentRef.current.querySelectorAll('textarea').forEach((el) => resizeTextarea(el as HTMLTextAreaElement));
  }, [itpData]);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const addItem = (section: 'a' | 'b' | 'c') => {
    const items = itpData[section];
    const lastItem = items[items.length - 1];
    const lastEventNo = lastItem.eventNo;
    const prefix = section.toUpperCase();
    const nextNum = parseInt(lastEventNo.substring(1)) + 1;
    const newEventNo = `${prefix}${nextNum}`;

    const newItem: ITPItem = {
      id: `${section}${nextNum}`,
      eventNo: newEventNo,
      activity: '',
      standard: '',
      acceptanceCriteria: '',
      checkTiming: '',
      inspectionMethod: '',
      frequency: '',
      nonconformityTreatment: '',
      records: '',
      subcon: '',
      epci: '',
      employer: '',
      hse: '',
    };

    setItpData({
      ...itpData,
      [section]: [...items, newItem],
    });
  };

  const deleteItem = (section: 'a' | 'b' | 'c', id: string) => {
    if (itpData[section].length <= 1) {
      return; // 至少保留一行
    }
    setItpData({
      ...itpData,
      [section]: itpData[section].filter(item => item.id !== id),
    });
    if (editingItemId === id) {
      setEditingItemId(null);
    }
  };

  const handleEditItem = (id: string) => {
    setEditingItemId(editingItemId === id ? null : id);
  };

  const handleSaveItem = () => {
    setEditingItemId(null);
  };

  const updateItem = (section: 'a' | 'b' | 'c', id: string, field: keyof ITPItem, value: string) => {
    setItpData({
      ...itpData,
      [section]: itpData[section].map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    });
  };

  const handlePrintPreview = () => {
    window.print();
  };

  const setSelfInspectionHeader = (field: keyof SelfInspectionHeader, value: string) => {
    setSelfInspection(prev => ({ ...prev, header: { ...prev.header, [field]: value } }));
  };
  const setQuantityRow = (id: string, field: keyof QuantityRow, value: string) => {
    setSelfInspection(prev => ({
      ...prev,
      quantityRows: prev.quantityRows.map(r => r.id === id ? { ...r, [field]: value } : r),
    }));
  };
  const setQuestion = (id: string, field: keyof ChecklistQuestion, value: string | '' | 'yes' | 'no' | 'na') => {
    setSelfInspection(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === id ? { ...q, [field]: value } : q),
    }));
  };
  const setAttachments = (field: keyof SelfInspectionAttachments, value: boolean) => {
    setSelfInspection(prev => ({ ...prev, attachments: { ...prev.attachments, [field]: value } }));
  };
  const setAuditResult = (value: AuditResult) => {
    setSelfInspection(prev => ({ ...prev, auditResult: value }));
  };
  const setSignatures = (field: keyof SelfInspectionSignatures, value: string) => {
    setSelfInspection(prev => ({ ...prev, signatures: { ...prev.signatures, [field]: value } }));
  };
  const setQ7SubItem = (field: keyof SelfInspectionData['q7SubItems'], value: boolean) => {
    setSelfInspection(prev => ({ ...prev, q7SubItems: { ...prev.q7SubItems, [field]: value } }));
  };
  const setMaterialDetailRow = (id: string, field: keyof MaterialDetailRow, value: string) => {
    setSelfInspection(prev => ({
      ...prev,
      materialDetails: prev.materialDetails.map(r => r.id === id ? { ...r, [field]: value } : r),
    }));
  };
  const setAuditComment = (value: string) => {
    setSelfInspection(prev => ({ ...prev, auditComment: value }));
  };

  const handleSaveAll = async () => {
    if (!itpId) {
      alert(t('itp.detail.missingId'));
      return;
    }
    try {
      const payload = { a: itpData.a, b: itpData.b, c: itpData.c, checklist, self_inspection: selfInspection };
      await api.put(`/itp/${itpId}/detail`, payload);
      alert(t('itp.detail.saveSuccess'));
      navigate('/itp');
    } catch (err) {
      console.error('Save ITP detail failed:', err);
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      alert(msg ? `${t('itp.detail.saveError')}${typeof msg === 'string' ? msg : JSON.stringify(msg)}` : t('itp.detail.saveErrorGeneric'));
    }
  };

  const renderSection = (section: 'a' | 'b' | 'c', title: string) => {
    const items = itpData[section];
    return (
      <>
        <tr className={styles.sectionHeader}>
          <td colSpan={14} className={styles.sectionHeaderCell}>
            <div className={styles.sectionHeaderContent}>
              <span className={styles.sectionTitle}>{title}</span>
              <button
                className={styles.addButton}
                onClick={() => addItem(section)}
                type="button"
              >
                <span className={styles.addIcon}>+</span>
                {t('common.add')}
              </button>
            </div>
          </td>
        </tr>
        {items.map((item, index) => (
          <tr key={item.id} className={styles.dataRow}>
            <td className={styles.eventNoCell}>
              <input
                type="text"
                value={item.eventNo}
                onChange={(e) => updateItem(section, item.id, 'eventNo', e.target.value)}
                className={styles.input}
                disabled={editingItemId !== item.id}
              />
            </td>
            <td>
              <textarea
                value={item.activity}
                onChange={(e) => handleTextareaChange(section, item.id, 'activity', e)}
                onInput={autoResizeTextarea}
                className={styles.input}
                disabled={editingItemId !== item.id}
                rows={2}
              />
            </td>
            <td>
              <textarea
                value={item.standard}
                onChange={(e) => handleTextareaChange(section, item.id, 'standard', e)}
                onInput={autoResizeTextarea}
                className={styles.input}
                disabled={editingItemId !== item.id}
                rows={2}
              />
            </td>
            <td>
              <textarea
                value={item.acceptanceCriteria}
                onChange={(e) => handleTextareaChange(section, item.id, 'acceptanceCriteria', e)}
                onInput={autoResizeTextarea}
                className={styles.input}
                disabled={editingItemId !== item.id}
                rows={2}
              />
            </td>
            <td>
              <textarea
                value={item.checkTiming}
                onChange={(e) => handleTextareaChange(section, item.id, 'checkTiming', e)}
                onInput={autoResizeTextarea}
                className={styles.input}
                disabled={editingItemId !== item.id}
                rows={2}
              />
            </td>
            <td>
              <textarea
                value={item.inspectionMethod}
                onChange={(e) => handleTextareaChange(section, item.id, 'inspectionMethod', e)}
                onInput={autoResizeTextarea}
                className={styles.input}
                disabled={editingItemId !== item.id}
                rows={2}
              />
            </td>
            <td>
              <textarea
                value={item.frequency}
                onChange={(e) => handleTextareaChange(section, item.id, 'frequency', e)}
                onInput={autoResizeTextarea}
                className={styles.input}
                disabled={editingItemId !== item.id}
                rows={2}
              />
            </td>
            <td>
              <textarea
                value={item.nonconformityTreatment}
                onChange={(e) => handleTextareaChange(section, item.id, 'nonconformityTreatment', e)}
                onInput={autoResizeTextarea}
                className={styles.input}
                disabled={editingItemId !== item.id}
                rows={2}
              />
            </td>
            <td>
              <textarea
                value={item.records}
                onChange={(e) => handleTextareaChange(section, item.id, 'records', e)}
                onInput={autoResizeTextarea}
                className={styles.input}
                disabled={editingItemId !== item.id}
                rows={2}
              />
            </td>
            <td className={styles.verticalHeaderCell}>
              {editingItemId === item.id ? (
                <select
                  value={item.subcon}
                  onChange={(e) => updateItem(section, item.id, 'subcon', e.target.value)}
                  className={styles.input}
                >
                  <option value="">-</option>
                  <option value="W">W</option>
                  <option value="H">H</option>
                </select>
              ) : (
                <span className={styles.readOnlyValue}>{item.subcon || '-'}</span>
              )}
            </td>
            <td className={styles.verticalHeaderCell}>
              {editingItemId === item.id ? (
                <select
                  value={item.epci}
                  onChange={(e) => updateItem(section, item.id, 'epci', e.target.value)}
                  className={styles.input}
                >
                  <option value="">-</option>
                  <option value="W">W</option>
                  <option value="H">H</option>
                </select>
              ) : (
                <span className={styles.readOnlyValue}>{item.epci || '-'}</span>
              )}
            </td>
            <td className={styles.verticalHeaderCell}>
              {editingItemId === item.id ? (
                <select
                  value={item.employer}
                  onChange={(e) => updateItem(section, item.id, 'employer', e.target.value)}
                  className={styles.input}
                >
                  <option value="">-</option>
                  <option value="W">W</option>
                  <option value="H">H</option>
                </select>
              ) : (
                <span className={styles.readOnlyValue}>{item.employer || '-'}</span>
              )}
            </td>
            <td className={styles.verticalHeaderCell}>
              {editingItemId === item.id ? (
                <select
                  value={item.hse}
                  onChange={(e) => updateItem(section, item.id, 'hse', e.target.value)}
                  className={styles.input}
                >
                  <option value="">-</option>
                  <option value="W">W</option>
                  <option value="H">H</option>
                </select>
              ) : (
                <span className={styles.readOnlyValue}>{item.hse || '-'}</span>
              )}
            </td>
            <td className={styles.actionCell}>
              <div className={styles.actionButtons}>
                {editingItemId === item.id ? (
                  <button
                    className={styles.saveButton}
                    onClick={handleSaveItem}
                    type="button"
                  >
                    {t('common.save')}
                  </button>
                ) : (
                  <button
                    className={styles.editButton}
                    onClick={() => handleEditItem(item.id)}
                    type="button"
                  >
                    {t('common.edit')}
                  </button>
                )}
                <button
                  className={styles.deleteButton}
                  onClick={() => deleteItem(section, item.id)}
                  type="button"
                  disabled={items.length <= 1}
                  title={items.length <= 1 ? '至少需要保留一行' : ''}
                >
                  {t('common.delete')}
                </button>
              </div>
            </td>
          </tr>
        ))}
      </>
    );
  };

  return (
    <div className={styles.container}>
      <div ref={contentRef} className={styles.detailModalContent}>
        <div className={styles.header}>
          <h2>{t('itp.detail.title')}{itpTitle ? ` - ${itpTitle}` : ''}</h2>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHeader}>
                <th rowSpan={2} className={styles.eventNoHeader}>
                  <div className={styles.verticalText}>{t('itp.detail.eventNo')}</div>
                </th>
                <th rowSpan={2}>{t('itp.detail.activity')}</th>
                <th rowSpan={2}>{t('itp.detail.standard')}</th>
                <th rowSpan={2}>{t('itp.detail.acceptanceCriteria')}</th>
                <th rowSpan={2}>{t('itp.detail.checkTiming')}</th>
                <th rowSpan={2}>{t('itp.detail.inspectionMethod')}</th>
                <th rowSpan={2}>{t('itp.detail.frequency')}</th>
                <th rowSpan={2}>{t('itp.detail.nonconformityTreatment')}</th>
                <th rowSpan={2}>{t('itp.detail.records')}</th>
                <th colSpan={4} className={styles.verificationHeader}>
                  <div className={styles.verificationTitle}>{t('itp.detail.verificationPoint')}</div>
                  <div className={styles.verificationSubtitle}>H, W, R, MS</div>
                </th>
                <th rowSpan={2} className={styles.operationsHeader}>{t('common.operations')}</th>
              </tr>
              <tr className={styles.tableHeader}>
                <th className={styles.verticalHeader}>
                  <div className={styles.verticalText}>{t('itp.detail.subcon')}</div>
                </th>
                <th className={styles.verticalHeader}>
                  <div className={styles.verticalText}>{t('itp.detail.epci')}</div>
                </th>
                <th className={styles.verticalHeader}>
                  <div className={styles.verticalText}>{t('itp.detail.employer')}</div>
                </th>
                <th className={styles.verticalHeader}>
                  <div className={styles.verticalText}>{t('itp.detail.hse')}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {renderSection('a', t('itp.detail.beforeConstruction'))}
              {renderSection('b', t('itp.detail.duringConstruction'))}
              {renderSection('c', t('itp.detail.afterConstruction'))}
            </tbody>
          </table>
        </div>

        <section className={styles.checklistSection} id="self-inspection">
          <h3 className={styles.selfInspectionMainTitle}>{t('selfInspection.title')}</h3>

          <div className={styles.selfInspectionHeaderRow}>
            <table className={styles.selfInspectionTable}>
              <tbody>
                <tr><th className={styles.selfInspectionTh}>{t('itp.selfInspection.organizingUnit')}</th><td><input type="text" className={styles.selfInspectionInput} value={selfInspection.header.organizingUnit} onChange={(e) => setSelfInspectionHeader('organizingUnit', e.target.value)} /></td></tr>
                <tr><th className={styles.selfInspectionTh}>{t('itp.selfInspection.supervisingUnit')}</th><td><input type="text" className={styles.selfInspectionInput} value={selfInspection.header.supervisingUnit} onChange={(e) => setSelfInspectionHeader('supervisingUnit', e.target.value)} /></td></tr>
                <tr><th className={styles.selfInspectionTh}>{t('itp.selfInspection.contractor')}</th><td><input type="text" className={styles.selfInspectionInput} value={selfInspection.header.contractor} onChange={(e) => setSelfInspectionHeader('contractor', e.target.value)} /></td></tr>
                <tr><th className={styles.selfInspectionTh}>{t('itp.selfInspection.location')}</th><td><input type="text" className={styles.selfInspectionInput} value={selfInspection.header.constructionLocation} onChange={(e) => setSelfInspectionHeader('constructionLocation', e.target.value)} /></td></tr>
                <tr><th className={styles.selfInspectionTh}>{t('itp.selfInspection.applicationDate')}</th><td><input type="text" className={styles.selfInspectionInput} placeholder={t('itp.selfInspection.datePlaceholder')} value={selfInspection.header.applicationDate} onChange={(e) => setSelfInspectionHeader('applicationDate', e.target.value)} /></td></tr>
              </tbody>
            </table>
            <table className={styles.selfInspectionTable}>
              <tbody>
                <tr><td className={styles.selfInspectionTdLabel}>{t('itp.selfInspection.sd280')}</td><th className={styles.selfInspectionTh}>{t('itp.selfInspection.entryType')}</th><td><input type="text" className={styles.selfInspectionInputShort} value={selfInspection.header.entryType} onChange={(e) => setSelfInspectionHeader('entryType', e.target.value)} /></td></tr>
                <tr><td className={styles.selfInspectionTdLabel}>{t('itp.selfInspection.sd420')}</td><th className={styles.selfInspectionTh}>{t('itp.selfInspection.entrySequence')}</th><td><input type="text" className={styles.selfInspectionInputShort} value={selfInspection.header.entrySequenceNo} onChange={(e) => setSelfInspectionHeader('entrySequenceNo', e.target.value)} /></td></tr>
              </tbody>
            </table>
          </div>

          <table className={styles.selfInspectionTable}>
            <thead>
              <tr><th className={styles.selfInspectionTh}></th><th className={styles.selfInspectionTh}>{t('itp.selfInspection.contractQty')}</th><th className={styles.selfInspectionTh}>{t('itp.selfInspection.previous')}</th><th className={styles.selfInspectionTh}>{t('itp.selfInspection.current')}</th><th className={styles.selfInspectionTh}>{t('itp.selfInspection.accumulated')}</th></tr>
            </thead>
            <tbody>
              {selfInspection.quantityRows.map((row) => (
                <tr key={row.id}>
                  <td className={styles.selfInspectionTdLabel}>{row.name}</td>
                  <td><input type="text" className={styles.selfInspectionInput} value={row.contractQty} onChange={(e) => setQuantityRow(row.id, 'contractQty', e.target.value)} /></td>
                  <td><input type="text" className={styles.selfInspectionInput} value={row.previous} onChange={(e) => setQuantityRow(row.id, 'previous', e.target.value)} /></td>
                  <td><input type="text" className={styles.selfInspectionInput} value={row.current} onChange={(e) => setQuantityRow(row.id, 'current', e.target.value)} /></td>
                  <td><input type="text" className={styles.selfInspectionInput} value={row.accumulated} onChange={(e) => setQuantityRow(row.id, 'accumulated', e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          <table className={styles.selfInspectionTable}>
            <thead>
              <tr>
                <th className={styles.selfInspectionTh}>{t('itp.selfInspection.inspectionItem')}</th><th className={styles.selfInspectionTh}>{t('itp.selfInspection.brand')}</th><th className={styles.selfInspectionTh}>{t('itp.selfInspection.heatNo')}</th><th className={styles.selfInspectionTh}>{t('itp.selfInspection.model')}</th><th className={styles.selfInspectionTh}>{t('itp.selfInspection.number')}</th><th className={styles.selfInspectionTh}>{t('itp.selfInspection.subtotal')}</th><th className={styles.selfInspectionTh}>{t('itp.selfInspection.sampleQty')}</th><th className={styles.selfInspectionTh}>{t('itp.selfInspection.inspectionLocation')}</th>
              </tr>
            </thead>
            <tbody>
              {selfInspection.materialDetails.map((r) => (
                <tr key={r.id}>
                  <td className={styles.selfInspectionTdLabel}>
                    {r.inspectionItem === '竹節鋼筋' ? t('itp.selfInspection.deformedBar') :
                      r.inspectionItem === '續接器' ? t('itp.selfInspection.coupler') :
                        r.inspectionItem}
                  </td>
                  <td><input type="text" className={styles.selfInspectionInput} value={r.brand} onChange={(e) => setMaterialDetailRow(r.id, 'brand', e.target.value)} /></td>
                  <td><input type="text" className={styles.selfInspectionInput} value={r.heatNo} onChange={(e) => setMaterialDetailRow(r.id, 'heatNo', e.target.value)} /></td>
                  <td className={styles.selfInspectionTdLabel}>{r.model}</td>
                  <td className={styles.selfInspectionTdLabel}>{r.number === '合計' ? t('common.total') : r.number}</td>
                  <td><input type="text" className={styles.selfInspectionInput} value={r.subtotal} onChange={(e) => setMaterialDetailRow(r.id, 'subtotal', e.target.value)} /></td>
                  <td><input type="text" className={styles.selfInspectionInput} value={r.sampleQty} onChange={(e) => setMaterialDetailRow(r.id, 'sampleQty', e.target.value)} /></td>
                  <td><input type="text" className={styles.selfInspectionInput} value={r.location} onChange={(e) => setMaterialDetailRow(r.id, 'location', e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.selfInspectionBlock}>
            <span className={styles.selfInspectionLabel}>{t('itp.selfInspection.attachments')}</span>
            <div className={styles.selfInspectionCheckRow}>
              <label><input type="checkbox" checked={selfInspection.attachments.spec} onChange={(e) => setAttachments('spec', e.target.checked)} /> {t('itp.selfInspection.attachment.spec')}</label>
              <label><input type="checkbox" checked={selfInspection.attachments.submission} onChange={(e) => setAttachments('submission', e.target.checked)} /> {t('itp.selfInspection.attachment.submission')}</label>
              <label><input type="checkbox" checked={selfInspection.attachments.drawing} onChange={(e) => setAttachments('drawing', e.target.checked)} /> {t('itp.selfInspection.attachment.drawing')}</label>
              <label><input type="checkbox" checked={selfInspection.attachments.other} onChange={(e) => setAttachments('other', e.target.checked)} /> {t('itp.selfInspection.attachment.other')}</label>
            </div>
          </div>

          <table className={styles.selfInspectionTable}>
            <thead>
              <tr><th className={styles.selfInspectionTh}>{t('itp.selfInspection.questionNo')}</th><th className={styles.selfInspectionTh}>{t('itp.selfInspection.inspectionItem')}</th><th className={styles.selfInspectionTh}>{t('common.yes')}</th><th className={styles.selfInspectionTh}>{t('common.no')}</th><th className={styles.selfInspectionTh}>{t('itp.selfInspection.na')}</th></tr>
            </thead>
            <tbody>
              {selfInspection.questions.map((q, idx) => (
                <tr key={q.id}>
                  <td className={styles.selfInspectionTdCenter}>{idx + 1}</td>
                  <td className={styles.selfInspectionTdQuestion}>
                    {t(`itp.selfInspection.${q.id}`)}
                    {q.id === 'q2' && (
                      <span className={styles.selfInspectionInline}>
                        SD280W【<input type="text" className={styles.selfInspectionInputTiny} value={q.quantityInput ?? ''} onChange={(e) => setQuestion(q.id, 'quantityInput', e.target.value)} />】噸；SD420W【<input type="text" className={styles.selfInspectionInputTiny} value={q.quantityInput2 ?? ''} onChange={(e) => setQuestion(q.id, 'quantityInput2', e.target.value)} />】噸
                      </span>
                    )}
                  </td>
                  {idx === 0 ? (
                    <><td className={styles.selfInspectionTdRadio}><input type="radio" name={`si-${q.id}`} checked={q.value === 'yes'} onChange={() => setQuestion(q.id, 'value', 'yes')} /> {t('common.yes')}</td><td className={styles.selfInspectionTdRadio}><input type="radio" name={`si-${q.id}`} checked={q.value === 'no'} onChange={() => setQuestion(q.id, 'value', 'no')} /> {t('common.no')}</td><td className={styles.selfInspectionTdRadio}></td></>
                  ) : (
                    <><td className={styles.selfInspectionTdRadio}><input type="radio" name={`si-${q.id}`} checked={q.value === 'yes'} onChange={() => setQuestion(q.id, 'value', 'yes')} /></td><td className={styles.selfInspectionTdRadio}><input type="radio" name={`si-${q.id}`} checked={q.value === 'no'} onChange={() => setQuestion(q.id, 'value', 'no')} /></td><td className={styles.selfInspectionTdRadio}><input type="radio" name={`si-${q.id}`} checked={q.value === 'na'} onChange={() => setQuestion(q.id, 'value', 'na')} /></td></>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.selfInspectionQ7Sub}>
            <span className={styles.selfInspectionQ7SubLabel}>{t('itp.selfInspection.attachedInfo')}:</span>
            <label><input type="checkbox" checked={selfInspection.q7SubItems.customs} onChange={(e) => setQ7SubItem('customs', e.target.checked)} /> {t('itp.selfInspection.attachment.customs')}</label>
            <label><input type="checkbox" checked={selfInspection.q7SubItems.materialCert} onChange={(e) => setQ7SubItem('materialCert', e.target.checked)} /> {t('itp.selfInspection.attachment.materialCert')}</label>
            <label><input type="checkbox" checked={selfInspection.q7SubItems.testReport} onChange={(e) => setQ7SubItem('testReport', e.target.checked)} /> {t('itp.selfInspection.attachment.testReport')}</label>
            <label><input type="checkbox" checked={selfInspection.q7SubItems.equipmentList} onChange={(e) => setQ7SubItem('equipmentList', e.target.checked)} /> {t('itp.selfInspection.attachment.equipmentList')}</label>
            <label><input type="checkbox" checked={selfInspection.q7SubItems.other} onChange={(e) => setQ7SubItem('other', e.target.checked)} /> {t('itp.selfInspection.attachment.other')}</label>
          </div>

          <div className={styles.selfInspectionBlock}>
            <span className={styles.selfInspectionAuditTitle}>{t('itp.selfInspection.auditResult')}：</span>
            <div className={styles.selfInspectionCheckRow}>
              <label className={styles.selfInspectionAuditLabel}>
                <input type="radio" name="auditResult" checked={selfInspection.auditResult === 'approved'} onChange={() => setAuditResult('approved')} />
                <span className={styles.auditStatusApproved}>{t('itp.selfInspection.audit.approved')}</span>
              </label>
              <label className={styles.selfInspectionAuditLabel}>
                <input type="radio" name="auditResult" checked={selfInspection.auditResult === 'resample'} onChange={() => setAuditResult('resample')} />
                <span className={styles.auditStatusResample}>{t('itp.selfInspection.audit.resample')}</span>
              </label>
              <label className={styles.selfInspectionAuditLabel}>
                <input type="radio" name="auditResult" checked={selfInspection.auditResult === 'reject'} onChange={() => setAuditResult('reject')} />
                <span className={styles.auditStatusReject}>{t('itp.selfInspection.audit.reject')}</span>
              </label>
            </div>
            <textarea className={styles.selfInspectionComment} value={selfInspection.auditComment} onChange={(e) => setAuditComment(e.target.value)} placeholder={t('itp.selfInspection.auditComment')} rows={3} />
          </div>

          <div className={styles.selfInspectionSignaturesRow}>
            <div className={styles.selfInspectionSignatureCol}><span className={styles.selfInspectionLabel}>{t('itp.selfInspection.siteSupervisor')}</span><input type="text" className={styles.selfInspectionInput} value={selfInspection.signatures.siteSupervisor} onChange={(e) => setSignatures('siteSupervisor', e.target.value)} /></div>
            <div className={styles.selfInspectionSignatureCol}><span className={styles.selfInspectionLabel}>{t('itp.selfInspection.fieldEngineer')}</span><input type="text" className={styles.selfInspectionInput} value={selfInspection.signatures.fieldEngineer} onChange={(e) => setSignatures('fieldEngineer', e.target.value)} /></div>
          </div>
        </section>

        <p className={styles.saveHint}>
          請按下方「Save」按鈕將資料儲存至伺服器，否則重新整理或重新登入後會消失。
        </p>
        <div className={styles.buttonGroup}>
          <button
            className={styles.printButton}
            onClick={handlePrintPreview}
            type="button"
          >
            Print Preview
          </button>
          <button type="button" className={styles.saveAllButton} onClick={handleSaveAll}>{t('common.save')}</button>
          <button type="button" className={styles.printButton} onClick={handlePrintPreview}>{t('common.print')}</button>
          <button type="button" className={styles.closeButton} onClick={() => navigate('/itp')}>{t('common.close')}</button>
        </div>
      </div>
    </div>
  );
};

export default ITPDetail;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { getNamingRules, updateNamingRules, NamingRuleApi } from '../../services/api';
import styles from './DocumentNamingRules.module.css';

export interface NamingRule {
  id: string;
  moduleName: string;
  prefix: string;
  sequenceDigits: number;
  description: string;
}

const DEFAULT_RULES: NamingRule[] = [
  { id: 'itp', moduleName: 'ITP', prefix: 'QTS-[ABBREV]-ITP-', sequenceDigits: 6, description: '專案-廠商縮寫-ITP-6位流水號' },
  { id: 'noi', moduleName: 'NOI', prefix: 'QTS-[ABBREV]-NOI-', sequenceDigits: 6, description: '專案-廠商縮寫-NOI-6位流水號' },
  { id: 'itr', moduleName: 'ITR', prefix: 'QTS-[ABBREV]-ITR-', sequenceDigits: 6, description: '專案-廠商縮寫-ITR-6位流水號' },
  { id: 'ncr', moduleName: 'NCR', prefix: 'QTS-[ABBREV]-NCR-', sequenceDigits: 6, description: '專案-廠商縮寫-NCR-6位流水號' },
  { id: 'obs', moduleName: 'OBS', prefix: 'QTS-[ABBREV]-OBS-', sequenceDigits: 6, description: '專案-廠商縮寫-OBS-6位流水號' },
  { id: 'pqp', moduleName: 'PQP', prefix: 'QTS-[ABBREV]-PQP-', sequenceDigits: 6, description: '專案-廠商縮寫-PQP-6位流水號' },
  { id: 'followup', moduleName: 'Follow up Issue', prefix: 'QTS-[ABBREV]-FUI-', sequenceDigits: 6, description: '專案-廠商縮寫-FUI-6位流水號' },
  { id: 'fat', moduleName: 'FAT', prefix: 'QTS-[ABBREV]-FAT-', sequenceDigits: 6, description: '專案-廠商縮寫-FAT-6位流水號' },
];

const DocumentNamingRules: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [rules, setRules] = useState<NamingRule[]>(DEFAULT_RULES);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const apiRules: NamingRuleApi[] = await getNamingRules();
        const map = new Map<string, NamingRuleApi>();
        apiRules.forEach((r) => {
          map.set(r.doc_type.toLowerCase(), r);
        });
        setRules(
          DEFAULT_RULES.map((rule) => {
            const apiRule = map.get(rule.id.toLowerCase());
            if (!apiRule) {
              return { ...rule };
            }
            return {
              ...rule,
              prefix: apiRule.prefix,
              sequenceDigits: apiRule.sequence_digits,
            };
          })
        );
      } catch (e) {
        // 若後端尚未提供或發生錯誤，維持預設規則
        console.error('Failed to load document naming rules', e);
      }
    };

    fetchRules();
  }, []);

  const handlePrefixChange = (id: string, value: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, prefix: value } : r));
    setSaved(false);
  };

  const handleSequenceDigitsChange = (id: string, value: number) => {
    const n = Math.max(1, Math.min(6, Math.floor(value) || 1));
    setRules(prev => prev.map(r => r.id === id ? { ...r, sequenceDigits: n } : r));
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      const payload = rules.map((rule) => ({
        doc_type: rule.id,
        prefix: rule.prefix ?? '',
        sequence_digits: Math.min(6, Math.max(1, Number(rule.sequenceDigits) || 6)),
      }));
      await updateNamingRules(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      console.error('Failed to save document naming rules', e);
      const err = e as { response?: { data?: { detail?: string }; status?: number }; message?: string };
      const msg = err.response?.data?.detail ?? err.message ?? '請確認後端已啟動（port 3001）且網路連線正常。';
      alert(`命名規則儲存失敗：${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    }
  };

  const getExample = (rule: NamingRule): string => {
    const seq = String(1).padStart(rule.sequenceDigits, '0');
    return rule.prefix.replace('[ABBREV]', 'A') + seq;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button type="button" className={styles.backButton} onClick={() => navigate('/')}>
            ← {t('common.back') || 'Back'}
          </button>
          <h1 className={styles.title}>文件命名規則</h1>
          <p className={styles.subtitle}>設定各模組文件編號的前綴與流水號格式，重新開啟後仍會保留。</p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>命名規則一覽</h2>
          <button className={styles.saveButton} onClick={handleSave}>
            {saved ? '已儲存' : '儲存'}
          </button>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>模組</th>
                <th>前綴／格式</th>
                <th>流水號位數</th>
                <th>範例</th>
                <th>說明</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td className={styles.cellModule}>{rule.moduleName}</td>
                  <td>
                    <input
                      type="text"
                      className={styles.input}
                      value={rule.prefix}
                      onChange={(e) => handlePrefixChange(rule.id, e.target.value)}
                      placeholder="e.g. FUI- 或 [ABBREV]-NCR-"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className={styles.inputNum}
                      min={1}
                      max={6}
                      value={rule.sequenceDigits}
                      onChange={(e) => handleSequenceDigitsChange(rule.id, Number(e.target.value))}
                    />
                  </td>
                  <td className={styles.cellExample}>{getExample(rule)}</td>
                  <td className={styles.cellDesc}>{rule.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.hint}>
          <strong>前綴說明：</strong>使用 <code>[ABBREV]</code> 表示依廠商／承包商縮寫自動帶入（如 NOI、ITR、NCR、OBS）。其餘模組可自訂固定前綴（如 FUI-、PQP-）。流水號位數為 1～6。
        </p>
      </div>
    </div>
  );
};

export default DocumentNamingRules;

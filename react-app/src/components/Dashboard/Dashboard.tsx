import { useNavigate } from 'react-router-dom';
import { useAuth, User } from '../../context/AuthContext';
import { useITP } from '../../context/ITPContext';
import { useNCR } from '../../context/NCRContext';
import { useNOI } from '../../context/NOIContext';
import { useITR } from '../../context/ITRContext';
import { usePQP } from '../../context/PQPContext';
import { useOBS } from '../../context/OBSContext';
import { useContractors, Contractor } from '../../context/ContractorsContext';
import { DashboardFilterProvider, useDashboardFilter } from '../../context/DashboardFilterContext';
import { useLanguage } from '../../context/LanguageContext';
import { useMemo, useState } from 'react';
import ITPGaugeChart from './ITPGaugeChart';
import ITPStatsCard from './ITPStatsCard';
import PQPGaugeChart from './PQPGaugeChart';
import PQPStatsCard from './PQPStatsCard';
import NCRParetoChart from './NCRParetoChart';
import NCRStatsCard from './NCRStatsCard';
import OBSParetoChart from './OBSParetoChart';
import OBSStatsCard from './OBSStatsCard';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { getActiveContractors } = useContractors();

  return (
    <DashboardFilterProvider>
      <DashboardContent
        navigate={navigate}
        user={user}
        getActiveContractors={getActiveContractors}
      />
    </DashboardFilterProvider>
  );
};

const DashboardContent: React.FC<{
  navigate: (path: string) => void;
  user: User | null;
  getActiveContractors: () => Contractor[];
}> = ({ navigate, user, getActiveContractors }) => {
  const [kpiCollapsed, setKpiCollapsed] = useState(false);
  const { selectedVendor, setSelectedVendor } = useDashboardFilter();
  const { t } = useLanguage();
  const { itpList } = useITP();
  const { ncrList } = useNCR();
  const { noiList } = useNOI();
  const { itrList } = useITR();
  const { pqpList } = usePQP();
  const { obsList } = useOBS();

  // 計算統計數據
  const statistics = useMemo(() => {
    // 根据选中的厂商过滤数据
    const filterByVendor = <T extends { vendor?: string; contractor?: string }>(list: T[]): T[] => {
      if (selectedVendor === 'all') return list;
      return list.filter(item =>
        (item.vendor && item.vendor === selectedVendor) ||
        (item.contractor && item.contractor === selectedVendor)
      );
    };

    const filteredItpList = filterByVendor(itpList);
    const filteredNcrList = filterByVendor(ncrList);
    const filteredNoiList = filterByVendor(noiList);
    const filteredItrList = filterByVendor(itrList);
    const filteredObsList = filterByVendor(obsList);
    const filteredPqpList = filterByVendor(pqpList);

    // ITP 統計
    const itpTotal = filteredItpList.filter(item => item.status.toLowerCase() !== 'void').length;
    const itpSubmitted = filteredItpList.filter(item => {
      const status = item.status.toLowerCase();
      return status !== 'void' && status !== 'no submit' && status !== 'nosubmit';
    }).length;
    const itpSubmissionRate = itpTotal > 0 ? Math.round((itpSubmitted / itpTotal) * 100) : 0;
    const itpApproved = filteredItpList.filter(item => {
      const status = item.status.toLowerCase();
      return status === 'approved' || status === 'approved with comments';
    }).length;
    const itpApprovalRate = itpTotal > 0 ? Math.round((itpApproved / itpTotal) * 100) : 0;

    // NCR 統計
    const ncrTotal = filteredNcrList.length;
    const ncrOpen = filteredNcrList.filter(item => item.status.toLowerCase() === 'open' || item.status.toLowerCase() === 'opening').length;
    const ncrClosed = filteredNcrList.filter(item => item.status.toLowerCase() === 'closed').length;
    const ncrCloseRate = ncrTotal > 0 ? Math.round((ncrClosed / ncrTotal) * 100) : 0;

    // NOI 統計
    const noiTotal = filteredNoiList.length;
    const noiOpen = filteredNoiList.filter(item => {
      const status = (item.status || 'Open').toLowerCase();
      return status === 'open' || status === 'opening';
    }).length;
    const noiClosed = filteredNoiList.filter(item => {
      const status = (item.status || 'Open').toLowerCase();
      return status === 'closed';
    }).length;
    const noiCloseRate = noiTotal > 0 ? Math.round((noiClosed / noiTotal) * 100) : 0;

    // ITR 統計
    const itrTotal = filteredItrList.length;
    const itrApproved = filteredItrList.filter(item => item.status.toLowerCase() === 'approved').length;
    const itrRejected = filteredItrList.filter(item => item.status.toLowerCase() === 'reject').length;
    const itrApprovalRate = itrTotal > 0 ? Math.round((itrApproved / itrTotal) * 100) : 0;

    // OBS 統計
    const obsTotal = filteredObsList.length;
    const obsOpen = filteredObsList.filter(item => {
      const status = (item.status || '').toLowerCase();
      return status !== 'closed';
    }).length;
    const obsClosed = filteredObsList.filter(item => {
      const status = (item.status || '').toLowerCase();
      return status === 'closed';
    }).length;
    const obsCloseRate = obsTotal > 0 ? Math.round((obsClosed / obsTotal) * 100) : 0;

    // PQP 統計
    const pqpTotal = filteredPqpList.length;
    const pqpApproved = filteredPqpList.filter(item => {
      const status = (item.status || '').toLowerCase();
      return status === 'approved';
    }).length;
    const pqpReject = filteredPqpList.filter(item => {
      const status = (item.status || '').toLowerCase();
      return status === 'reject';
    }).length;
    const pqpMaturity = pqpTotal > 0 ? Math.round((pqpApproved / pqpTotal) * 100) : 0;

    return {
      itp: {
        total: itpTotal,
        submitted: itpSubmitted,
        submissionRate: itpSubmissionRate,
        approved: itpApproved,
        approvalRate: itpApprovalRate,
      },
      ncr: {
        total: ncrTotal,
        open: ncrOpen,
        closed: ncrClosed,
        closeRate: ncrCloseRate,
      },
      obs: {
        total: obsTotal,
        open: obsOpen,
        closed: obsClosed,
        closeRate: obsCloseRate,
      },
      noi: {
        total: noiTotal,
        open: noiOpen,
        closed: noiClosed,
        closeRate: noiCloseRate,
      },
      itr: {
        total: itrTotal,
        approved: itrApproved,
        rejected: itrRejected,
        approvalRate: itrApprovalRate,
      },
      pqp: {
        total: pqpTotal,
        approved: pqpApproved,
        reject: pqpReject,
        maturity: pqpMaturity,
      },
    };
  }, [itpList, ncrList, noiList, itrList, pqpList, obsList, selectedVendor]);
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button type="button" className={styles.backButton} onClick={() => navigate('/')}>
            ← {t('common.back') || 'Back'}
          </button>
          <h1 className={styles.title}>{t('dashboard.title') || 'Dashboard'}</h1>
        </div>
        <div className={styles.headerRight}>
          <label className={styles.vendorLabel}>
            {t('common.contractor') || 'Contractor'}
            <select
              className={styles.vendorSelect}
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
            >
              <option value="all">{t('common.all')} {t('common.contractor') || 'All Contractors'}</option>
              {getActiveContractors().map((contractor) => (
                <option key={contractor.id} value={contractor.name}>
                  {contractor.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className={styles.subtitle}>
        {t('dashboard.subtitle') || 'Overview of PQP, ITP, OBS, NCR, NOI and ITR. Filter by contractor to see module statistics.'}
      </p>

      {/* KPI 卡片區域 */}
      <div className={styles.kpiSection}>
        <h2
          className={styles.sectionTitleCollapsible}
          onClick={() => setKpiCollapsed(c => !c)}
          role="button"
          aria-expanded={!kpiCollapsed}
        >
          <span className={styles.sectionTitleChevron}>{kpiCollapsed ? '▶' : '▼'}</span>
          {t('dashboard.kpiOverview') || 'Key Performance Indicators'}
        </h2>
        {!kpiCollapsed && (
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard} onClick={() => navigate('/pqp')}>
              <div className={styles.kpiCardContent}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>{t('dashboard.pqpMaturity')}</span>
                  <span className={styles.kpiValue} style={{ color: '#10b981' }}>100%</span>
                </div>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>{t('dashboard.qualityPlan')}</span>
                  <span className={styles.kpiValue} style={{ color: '#6b7280', fontSize: '20px' }}>-</span>
                </div>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>{t('dashboard.completion')}</span>
                  <span className={styles.kpiValue} style={{ color: '#6b7280', fontSize: '20px' }}>-</span>
                </div>
              </div>
              <button className={styles.viewButton} onClick={(e) => { e.stopPropagation(); navigate('/pqp'); }}>
                {t('common.viewDetails')}
              </button>
            </div>

            <div className={styles.kpiCard} onClick={() => navigate('/itp')}>
              <div className={styles.kpiCardContent}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>{t('dashboard.itpTotal')}</span>
                  <span className={styles.kpiValue} style={{ color: '#3b82f6' }}>{statistics.itp.total}</span>
                </div>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>{t('dashboard.submitted')}</span>
                  <span className={styles.kpiValue} style={{ color: '#3b82f6', fontSize: '20px' }}>
                    {statistics.itp.submitted} ({statistics.itp.submissionRate}%)
                  </span>
                </div>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>已批准</span>
                  <span className={styles.kpiValue} style={{ color: '#10b981', fontSize: '20px' }}>
                    {statistics.itp.approved} ({statistics.itp.approvalRate}%)
                  </span>
                </div>
              </div>
              <button className={styles.viewButton} onClick={(e) => { e.stopPropagation(); navigate('/itp'); }}>
                {t('common.viewDetails')}
              </button>
            </div>

            <div className={styles.kpiCard} onClick={() => navigate('/obs')}>
              <div className={styles.kpiCardContent}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>{t('dashboard.obsTotal')}</span>
                  <span className={styles.kpiValue} style={{ color: '#3b82f6' }}>{statistics.obs.total}</span>
                </div>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>{t('dashboard.open')}</span>
                  <span className={styles.kpiValue} style={{ color: '#f59e0b', fontSize: '20px' }}>
                    {statistics.obs.open} ({statistics.obs.total > 0 ? Math.round((statistics.obs.open / statistics.obs.total) * 100) : 0}%)
                  </span>
                </div>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>{t('dashboard.closed')}</span>
                  <span className={styles.kpiValue} style={{ color: '#10b981', fontSize: '20px' }}>
                    {statistics.obs.closed} ({statistics.obs.closeRate}%)
                  </span>
                </div>
              </div>
              <button className={styles.viewButton} onClick={(e) => { e.stopPropagation(); navigate('/obs'); }}>
                {t('common.viewDetails')}
              </button>
            </div>

            <div className={styles.kpiCard} onClick={() => navigate('/ncr')}>
              <div className={styles.kpiCardContent}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>{t('dashboard.ncrTotal')}</span>
                  <span className={styles.kpiValue} style={{ color: '#3b82f6' }}>{statistics.ncr.total}</span>
                </div>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>{t('dashboard.open')}</span>
                  <span className={styles.kpiValue} style={{ color: '#f59e0b', fontSize: '20px' }}>
                    {statistics.ncr.open} ({statistics.ncr.total > 0 ? Math.round((statistics.ncr.open / statistics.ncr.total) * 100) : 0}%)
                  </span>
                </div>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>{t('dashboard.closed')}</span>
                  <span className={styles.kpiValue} style={{ color: '#10b981', fontSize: '20px' }}>
                    {statistics.ncr.closed} ({statistics.ncr.closeRate}%)
                  </span>
                </div>
              </div>
              <button className={styles.viewButton} onClick={(e) => { e.stopPropagation(); navigate('/ncr'); }}>
                {t('common.viewDetails')}
              </button>
            </div>

            <div className={styles.kpiCard} onClick={() => navigate('/noi')}>
              <div className={styles.kpiCardContent}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>{t('dashboard.noiTotal')}</span>
                  <span className={styles.kpiValue} style={{ color: '#3b82f6' }}>{statistics.noi.total}</span>
                </div>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>{t('dashboard.open')}</span>
                  <span className={styles.kpiValue} style={{ color: '#f59e0b', fontSize: '20px' }}>
                    {statistics.noi.open} ({statistics.noi.total > 0 ? Math.round((statistics.noi.open / statistics.noi.total) * 100) : 0}%)
                  </span>
                </div>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>{t('dashboard.closed')}</span>
                  <span className={styles.kpiValue} style={{ color: '#10b981', fontSize: '20px' }}>
                    {statistics.noi.closed} ({statistics.noi.closeRate}%)
                  </span>
                </div>
              </div>
              <button className={styles.viewButton} onClick={(e) => { e.stopPropagation(); navigate('/noi'); }}>
                {t('common.viewDetails')}
              </button>
            </div>

            <div className={styles.kpiCard} onClick={() => navigate('/itr')}>
              <div className={styles.kpiCardContent}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>{t('dashboard.itrTotal')}</span>
                  <span className={styles.kpiValue} style={{ color: '#3b82f6' }}>{statistics.itr.total}</span>
                </div>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>已批准</span>
                  <span className={styles.kpiValue} style={{ color: '#10b981', fontSize: '20px' }}>
                    {statistics.itr.approved} ({statistics.itr.approvalRate}%)
                  </span>
                </div>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>已拒絕</span>
                  <span className={styles.kpiValue} style={{ color: '#ef4444', fontSize: '20px' }}>
                    {statistics.itr.rejected} ({statistics.itr.total > 0 ? Math.round((statistics.itr.rejected / statistics.itr.total) * 100) : 0}%)
                  </span>
                </div>
              </div>
              <button className={styles.viewButton} onClick={(e) => { e.stopPropagation(); navigate('/itr'); }}>
                {t('common.viewDetails')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PQP 和 ITP 趨勢圖表區域 */}
      <div className={styles.chartSection}>
        <div className={styles.dualChartContainer}>
          {/* PQP 成熟度分析 */}
          <div className={styles.singleChartSection}>
            <h2 className={styles.sectionTitle}>{t('dashboard.pqpMaturityAnalysis')}</h2>
            <div className={styles.pqpChartWrapper}>
              <PQPStatsCard />
              <div className={styles.chartContainer}>
                <PQPGaugeChart
                  approved={statistics.pqp.approved}
                  total={statistics.pqp.total}
                  maturity={statistics.pqp.maturity}
                />
              </div>
            </div>
          </div>

          {/* ITP 和 PQP 之间的分隔线 */}
          <div className={styles.verticalDivider}></div>

          {/* ITP 成熟度分析 */}
          <div className={styles.singleChartSection}>
            <h2 className={styles.sectionTitle}>{t('dashboard.itpMaturityAnalysis')}</h2>
            <div className={styles.itpChartWrapper}>
              <ITPStatsCard />
              <div className={styles.chartContainer}>
                <ITPGaugeChart
                  approved={statistics.itp.approved}
                  total={statistics.itp.total}
                  maturity={statistics.itp.approvalRate}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 分隔线 */}
      <div className={styles.sectionDivider}></div>

      {/* OBS Pareto 圖表區域 */}
      <div className={styles.chartSection}>
        <h2 className={styles.sectionTitle}>{t('dashboard.obsStatusAnalysis')}</h2>
        <div className={styles.obsChartWrapper}>
          <OBSStatsCard />
          <div className={styles.chartContainer}>
            <OBSParetoChart />
          </div>
        </div>
        <button className={styles.obsSectionButton} onClick={() => navigate('/obs')}>
          查看詳情 →
        </button>
      </div>

      {/* 分隔线 */}
      <div className={styles.sectionDivider}></div>

      {/* NCR Pareto 圖表區域 */}
      <div className={styles.chartSection}>
        <h2 className={styles.sectionTitle}>{t('dashboard.ncrStatusAnalysis') || 'NCR Status Analysis'}</h2>
        <div className={styles.ncrChartWrapper}>
          <NCRStatsCard />
          <div className={styles.chartContainer}>
            <NCRParetoChart />
          </div>
        </div>
        <button className={styles.ncrSectionButton} onClick={() => navigate('/ncr')}>
          查看詳情 →
        </button>
      </div>

    </div>
  );
};

export default Dashboard;

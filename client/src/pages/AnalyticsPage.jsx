import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../services/api';
import MetricCard from '../components/MetricCard';
import EmptyState from '../components/EmptyState';
import {
  BarChart3,
  TrendingUp,
  ArrowLeftRight,
  Layers,
  PieChart as PieIcon,
  RefreshCw,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const res = await analyticsApi.getSummary();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading market analytics...
      </div>
    );
  }

  const { stats, distribution, allocation, topStocks, activityTrend } = data || {};

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">
            Trading Analytics & Telemetry
          </h1>
          <p className="page-subtitle">
            Quantitative analysis of execution frequency, buy/sell ratios, volume, and portfolio allocations.
          </p>
        </div>

        <button
          onClick={() => fetchAnalytics(true)}
          className="btn btn-secondary"
          disabled={refreshing}
        >
          <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
          Refresh Analytics
        </button>
      </div>

      {/* High-Agency Metric Ribbon */}
      <div className="metric-ribbon" style={{ marginBottom: '24px' }}>
        <div className="metric-ribbon-item">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              TOTAL EXECUTIONS
            </span>
            <ArrowLeftRight size={16} color="var(--primary-green)" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: '10px 0 4px' }}>
            {stats?.totalTrades || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {stats?.buyOrdersCount || 0} buys • {stats?.sellOrdersCount || 0} sells
          </div>
        </div>

        <div className="metric-ribbon-item">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              SHARE VOLUME
            </span>
            <Activity size={16} color="var(--primary-green)" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: '10px 0 4px' }}>
            {(stats?.totalVolumeTraded || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Turnover: ${(stats?.totalValueTraded || 0).toLocaleString()}
          </div>
        </div>

        <div className="metric-ribbon-item">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              PORTFOLIO VALUATION
            </span>
            <PieIcon size={16} color="var(--primary-green)" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: '10px 0 4px' }}>
            ${stats?.portfolioValue?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '100,000.00'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            <span className={stats?.totalPnL >= 0 ? 'text-positive' : 'text-negative'}>
              {stats?.totalPnL >= 0 ? '+' : ''}${stats?.totalPnL?.toFixed(2)}
            </span> net change
          </div>
        </div>

        <div className="metric-ribbon-item">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              UNREALIZED P&L
            </span>
            <TrendingUp size={16} color="var(--primary-green)" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: '10px 0 4px' }}>
            ${stats?.unrealizedPnL?.toFixed(2) || '0.00'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Mark-to-market positions
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '24px',
      }}>
        {/* Buy / Sell Distribution Pie Chart */}
        <div className="card">
          <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
            Trade Side Distribution
          </h2>

          {stats?.totalTrades > 0 ? (
            <div style={{ height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--border-main)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="No Executed Trades"
              message="Trade distribution will populate once you begin matching orders."
            />
          )}
        </div>

        {/* Most Traded Stocks */}
        <div className="card">
          <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
            Most Frequently Traded Stocks
          </h2>

          {topStocks && topStocks.length > 0 ? (
            <div className="table-responsive">
              <table className="financial-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th className="numeric">Executions</th>
                    <th className="numeric">Volume</th>
                    <th className="numeric">Turnover ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {topStocks.map((stock) => (
                    <tr key={stock.symbol}>
                      <td style={{ fontWeight: '700', color: 'var(--primary-green)' }}>
                        {stock.symbol}
                      </td>
                      <td className="numeric" style={{ fontWeight: '600' }}>{stock.trades}</td>
                      <td className="numeric">{stock.volume}</td>
                      <td className="numeric">${stock.value.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No Stock Activity"
              message="Submit orders across multiple symbols to analyze trading frequency."
            />
          )}
        </div>
      </div>

      {/* Daily Volume Trend Bar Chart */}
      <div className="card">
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
          Execution Volume Activity
        </h2>

        {activityTrend && activityTrend.length > 0 ? (
          <div style={{ height: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--border-main)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                  }}
                  formatter={(val, name) => [val, name === 'volume' ? 'Shares Traded' : 'Trades']}
                />
                <Bar dataKey="volume" fill="#087A3C" radius={[4, 4, 0, 0]} name="Volume" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            title="No Activity Telemetry"
            message="Daily volume trends will graph your executed shares over time."
          />
        )}
      </div>
    </div>
  );
}


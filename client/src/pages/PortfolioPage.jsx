import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { portfolioApi } from '../services/api';
import MetricCard from '../components/MetricCard';
import EmptyState from '../components/EmptyState';
import {
  PieChart as PieIcon,
  Wallet,
  Lock,
  Layers,
  TrendingUp,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const ALLOCATION_COLORS = ['#087A3C', '#2563EB', '#CA8A04', '#9333EA', '#0D9488', '#E11D48', '#475569'];

export default function PortfolioPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchPortfolio = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const res = await portfolioApi.getSummary();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load portfolio:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    const interval = setInterval(() => {
      fetchPortfolio(false);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading portfolio telemetry...
      </div>
    );
  }

  const { summary, holdings } = data || {};

  // Prepare allocation chart data
  const chartData = holdings && holdings.length > 0
    ? holdings.map((h) => ({
        name: h.symbol,
        value: h.holdingValue,
      }))
    : [];

  // Add cash to chart if greater than 0
  if (summary?.availableCash + summary?.reservedCash > 0) {
    chartData.push({
      name: 'Simulated Cash',
      value: summary.availableCash + summary.reservedCash,
    });
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">
            Portfolio & Holdings
          </h1>
          <p className="page-subtitle">
            Asset allocations, cost basis, realized and unrealized profit and loss.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="live-badge">
            <span className="live-pulse-dot"></span>
            <span>Live Valuation</span>
          </div>

          <button
            onClick={() => fetchPortfolio(true)}
            className="btn btn-secondary"
            disabled={refreshing}
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            Refresh Portfolio
          </button>
        </div>
      </div>

      {/* High-Agency Metric Ribbon */}
      <div className="metric-ribbon" style={{ marginBottom: '24px' }}>
        <div className="metric-ribbon-item">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              PORTFOLIO NET VALUE
            </span>
            <PieIcon size={16} color="var(--primary-green)" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: '10px 0 4px' }}>
            ${summary?.totalPortfolioValue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '100,000.00'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
            <span className={summary?.totalPnL >= 0 ? 'text-positive' : 'text-negative'}>
              {summary?.totalPnL >= 0 ? '+' : ''}${summary?.totalPnL?.toFixed(2)} ({summary?.totalPnLPercent >= 0 ? '+' : ''}${summary?.totalPnLPercent?.toFixed(2)}%)
            </span>
            <span style={{ color: 'var(--text-muted)' }}>since inception</span>
          </div>
        </div>

        <div className="metric-ribbon-item">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              AVAILABLE CAPITAL
            </span>
            <Wallet size={16} color="var(--primary-green)" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: '10px 0 4px' }}>
            ${summary?.availableCash?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '100,000.00'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Unallocated liquidity
          </div>
        </div>

        <div className="metric-ribbon-item">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              RESERVED IN ORDERS
            </span>
            <Lock size={16} color="var(--color-warning)" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: '10px 0 4px' }}>
            ${summary?.reservedCash?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Locked in pending bids
          </div>
        </div>

        <div className="metric-ribbon-item">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              HOLDINGS VALUE
            </span>
            <Layers size={16} color="var(--primary-green)" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: '10px 0 4px' }}>
            ${summary?.holdingsValue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            <span className={summary?.unrealizedPnL >= 0 ? 'text-positive' : 'text-negative'}>
              {summary?.unrealizedPnL >= 0 ? '+' : ''}${summary?.unrealizedPnL?.toFixed(2)}
            </span> unrealized
          </div>
        </div>

        <div className="metric-ribbon-item">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              REALIZED P&L
            </span>
            <TrendingUp size={16} color="var(--primary-green)" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: '10px 0 4px' }}>
            ${summary?.realizedPnL?.toFixed(2) || '0.00'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Closed sales profit/loss
          </div>
        </div>
      </div>

      {/* Main Grid: Holdings Table & Allocation Chart */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: chartData.length > 0 ? '2fr 1fr' : '1fr',
        gap: '20px',
        marginBottom: '24px',
      }}>
        {/* Holdings Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(166, 180, 200, 0.35)', boxShadow: 'inset 0 -1px 0 rgba(255, 255, 255, 0.8)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Stock Holdings Breakdown ({holdings?.length || 0})
            </h2>
          </div>

          {holdings && holdings.length > 0 ? (
            <div className="table-responsive">
              <table className="financial-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th className="numeric">Shares Owned</th>
                    <th className="numeric">Reserved</th>
                    <th className="numeric">Avg Cost</th>
                    <th className="numeric">Current Price</th>
                    <th className="numeric">Holding Value</th>
                    <th className="numeric">Unrealized P&L</th>
                    <th style={{ textAlign: 'center' }}>Trade</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => {
                    const isPositive = h.unrealizedPnL >= 0;
                    return (
                      <tr key={h.id}>
                        <td>
                          <div style={{ fontWeight: '700', color: 'var(--primary-green)' }}>
                            {h.symbol}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {h.companyName}
                          </div>
                        </td>
                        <td className="numeric" style={{ fontWeight: '600' }}>
                          {h.quantity}
                        </td>
                        <td className="numeric" style={{ color: h.reservedQuantity > 0 ? 'var(--color-warning)' : 'var(--text-muted)' }}>
                          {h.reservedQuantity}
                        </td>
                        <td className="numeric">${h.averagePurchasePrice.toFixed(2)}</td>
                        <td className="numeric" style={{ fontWeight: '600' }}>${h.currentPrice.toFixed(2)}</td>
                        <td className="numeric" style={{ fontWeight: '700' }}>${h.holdingValue.toFixed(2)}</td>
                        <td className="numeric">
                          <span className={isPositive ? 'text-positive' : 'text-negative'}>
                            {isPositive ? '+' : ''}${h.unrealizedPnL.toFixed(2)} ({isPositive ? '+' : ''}{h.unrealizedPnLPercent}%)
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => navigate('/trade', { state: { stock: { id: h.stockId, symbol: h.symbol, currentPrice: h.currentPrice }, side: 'SELL' } })}
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                          >
                            Sell
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '24px' }}>
              <EmptyState
                title="No Stock Holdings Yet"
                message="Your portfolio consists entirely of simulated cash. Place your first buy order to acquire shares."
                action={
                  <Link to="/trade" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '13px' }}>
                    Go to Trade Terminal
                  </Link>
                }
              />
            </div>
          )}
        </div>

        {/* Portfolio Allocation Donut Chart */}
        {chartData.length > 0 && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
              Asset Allocation
            </h2>
            <div style={{ flex: 1, minHeight: '260px' }}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [`$${parseFloat(val).toLocaleString()}`, 'Value']}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--border-main)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardApi } from '../services/api';
import StockChart from '../components/StockChart';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import {
  Wallet,
  PieChart,
  Layers,
  TrendingUp,
  ArrowLeftRight,
  RefreshCw,
  PlusCircle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Zap,
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [flashMap, setFlashMap] = useState({});
  const previousPricesRef = useRef({});
  const navigate = useNavigate();

  const fetchDashboard = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const res = await dashboardApi.getSummary();
      if (res.success) {
        // Flash animation detection on popular stocks
        if (res.popularStocks) {
          const newFlashes = {};
          res.popularStocks.forEach((st) => {
            const oldP = previousPricesRef.current[st.symbol];
            if (oldP !== undefined && oldP !== null) {
              if (st.currentPrice > oldP) newFlashes[st.symbol] = 'flash-up';
              else if (st.currentPrice < oldP) newFlashes[st.symbol] = 'flash-down';
            }
            previousPricesRef.current[st.symbol] = st.currentPrice;
          });

          if (Object.keys(newFlashes).length > 0) {
            setFlashMap(newFlashes);
            setTimeout(() => setFlashMap({}), 1200);
          }
        }

        setData(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard(false);
    const interval = setInterval(() => {
      fetchDashboard(false);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
        Loading exchange telemetry...
      </div>
    );
  }

  const { summary, chartData, featuredSymbol, recentTrades, openOrders, popularStocks } = data || {};

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">
            Trading Terminal Overview
          </h1>
          <p className="page-subtitle">
            Simulated portfolio telemetry, market depth, and continuous execution log.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="live-badge">
            <span className="live-pulse-dot"></span>
            <span>Live Feed</span>
          </div>

          <button
            onClick={() => fetchDashboard(true)}
            className="btn btn-secondary"
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            Refresh Telemetry
          </button>
          <Link to="/trade" className="btn btn-primary">
            <PlusCircle size={15} />
            Create Limit Order
          </Link>
        </div>
      </div>

      {error && (
        <div className="glass-alert glass-alert-danger">
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* High-Agency Metric Ribbon (Anti-Card Overuse: Clean breathing telemetry) */}
      <div className="metric-ribbon" style={{ marginBottom: '24px' }}>
        <div className="metric-ribbon-item">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              PORTFOLIO NET VALUE
            </span>
            <PieChart size={16} color="var(--primary-green)" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: '10px 0 4px' }}>
            ${summary?.portfolioValue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '100,000.00'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
            <span className={summary?.totalPnL >= 0 ? 'text-positive' : 'text-negative'}>
              {summary?.totalPnL >= 0 ? '+' : ''}${summary?.totalPnL?.toFixed(2) || '0.00'} ({summary?.totalPnLPercent >= 0 ? '+' : ''}${summary?.totalPnLPercent?.toFixed(2) || '0.00'}%)
            </span>
            <span style={{ color: 'var(--text-muted)' }}>all-time</span>
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
            {summary?.reservedCash > 0 ? (
              <span style={{ color: 'var(--color-warning)', fontWeight: '600' }}>
                ${summary.reservedCash.toFixed(2)} reserved in open bids
              </span>
            ) : (
              '100% unallocated liquidity'
            )}
          </div>
        </div>

        <div className="metric-ribbon-item">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              HOLDINGS VALUATION
            </span>
            <Layers size={16} color="var(--primary-green)" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: '10px 0 4px' }}>
            ${summary?.holdingsValue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {summary?.unrealizedPnL !== 0 ? (
              <span className={summary?.unrealizedPnL >= 0 ? 'text-positive' : 'text-negative'}>
                {summary?.unrealizedPnL >= 0 ? '+' : ''}${summary?.unrealizedPnL?.toFixed(2)} unrealized
              </span>
            ) : (
              'No active stock positions'
            )}
          </div>
        </div>

        <div className="metric-ribbon-item">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              ACTIVE EXECUTION QUEUE
            </span>
            <Activity size={16} color="var(--primary-green)" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: '10px 0 4px' }}>
            {summary?.totalOpenOrders || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {summary?.totalTrades || 0} completed matches on record
          </div>
        </div>
      </div>

      {/* Middle Grid: Stock Price Chart & Popular Markets */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '20px',
        marginBottom: '24px',
      }}>
        {/* Featured Stock Price Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                MARKET BENCHMARK
              </span>
              <h2 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.02em', marginTop: '2px' }}>
                {featuredSymbol} Price Performance
              </h2>
            </div>
            <Link to="/markets" style={{ fontSize: '12px', color: 'var(--primary-green)', fontWeight: '600' }}>
              Explore All Markets →
            </Link>
          </div>

          <StockChart data={chartData} height={260} symbol={featuredSymbol} />
        </div>

        {/* Popular Active Stocks */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Simulated Markets
            </h2>
            <Link to="/markets" style={{ fontSize: '12px', color: 'var(--primary-green)', fontWeight: '600' }}>
              View All
            </Link>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {popularStocks && popularStocks.map((stock) => {
              const isPositive = stock.change >= 0;
              return (
                <div
                  key={stock.id}
                  onClick={() => navigate('/trade', { state: { stock } })}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-main)',
                    border: '1px solid var(--border-light)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.borderColor = 'var(--border-main)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-main)';
                    e.currentTarget.style.borderColor = 'var(--border-light)';
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {stock.symbol}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {stock.companyName}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className={flashMap[stock.symbol] || ''} style={{ fontSize: '13px', fontWeight: '700', fontFamily: 'var(--font-mono)', padding: '1px 4px', transition: 'background-color 0.3s ease' }}>
                      ${stock.currentPrice.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: isPositive ? 'var(--color-positive)' : 'var(--color-negative)', fontFamily: 'var(--font-mono)' }}>
                      {isPositive ? '+' : ''}{stock.changePercent}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Open Orders and Recent Executions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
      }}>
        {/* Open Orders */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Resting Limit Orders ({openOrders?.length || 0})
            </h2>
            <Link to="/orders" style={{ fontSize: '12px', color: 'var(--primary-green)', fontWeight: '600' }}>
              Order Book →
            </Link>
          </div>

          {openOrders && openOrders.length > 0 ? (
            <div className="table-responsive">
              <table className="financial-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th className="numeric">Limit Price</th>
                    <th className="numeric">Remaining</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {openOrders.map((order) => (
                    <tr key={order.id}>
                      <td style={{ fontWeight: '700' }}>{order.symbol}</td>
                      <td>
                        <StatusBadge side={order.side} />
                      </td>
                      <td className="numeric">${order.limitPrice.toFixed(2)}</td>
                      <td className="numeric">{order.remainingQuantity} / {order.quantity}</td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '24px' }}>
              <EmptyState
                title="No Resting Orders"
                message="You currently have no open bids or asks in the order book."
                action={
                  <Link to="/trade" className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 14px' }}>
                    Place Limit Order
                  </Link>
                }
              />
            </div>
          )}
        </div>

        {/* Recent Executions */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Recent Matches
            </h2>
            <Link to="/history" style={{ fontSize: '12px', color: 'var(--primary-green)', fontWeight: '600' }}>
              Execution Log →
            </Link>
          </div>

          {recentTrades && recentTrades.length > 0 ? (
            <div className="table-responsive">
              <table className="financial-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th className="numeric">Exec Price</th>
                    <th className="numeric">Shares</th>
                    <th className="numeric">Turnover</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((trade) => (
                    <tr key={trade.id}>
                      <td style={{ fontWeight: '700' }}>{trade.symbol}</td>
                      <td>
                        <StatusBadge side={trade.side} />
                      </td>
                      <td className="numeric">${trade.price.toFixed(2)}</td>
                      <td className="numeric">{trade.quantity}</td>
                      <td className="numeric" style={{ fontWeight: '700' }}>${trade.totalValue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '24px' }}>
              <EmptyState
                title="No Matched Trades"
                message="When your limit orders match resting liquidity, executions will appear here."
                action={
                  <Link to="/trade" className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 14px' }}>
                    Trade Now
                  </Link>
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

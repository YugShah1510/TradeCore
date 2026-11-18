import React, { useState, useEffect } from 'react';
import { tradesApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { History, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

export default function HistoryPage() {
  const [trades, setTrades] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [symbolSearch, setSymbolSearch] = useState('');
  const [sideFilter, setSideFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrades = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const res = await tradesApi.getAll({
        page,
        limit: 15,
        symbol: symbolSearch || undefined,
        side: sideFilter || undefined,
      });

      if (res.success) {
        setTrades(res.trades);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      }
    } catch (err) {
      console.error('Failed to load trade log:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, [page, sideFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTrades();
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">
            Trade Execution Log
          </h1>
          <p className="page-subtitle">
            Immutable records of all filled limit order transactions from your perspective.
          </p>
        </div>

        <button
          onClick={() => fetchTrades(true)}
          className="btn btn-secondary"
          disabled={refreshing}
        >
          <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
          Refresh Log
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search symbol (e.g. AAPL, MSFT)..."
              value={symbolSearch}
              onChange={(e) => setSymbolSearch(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { label: 'All Sides', value: '' },
              { label: 'BUY', value: 'BUY' },
              { label: 'SELL', value: 'SELL' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => { setSideFilter(item.value); setPage(1); }}
                className={`glass-pill ${sideFilter === item.value ? 'active' : ''}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '8px 18px' }}>
            Search
          </button>
        </form>
      </div>

      {/* Trades Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading trade history...
          </div>
        ) : trades.length > 0 ? (
          <div className="table-responsive">
            <table className="financial-table">
              <thead>
                <tr>
                  <th>Trade ID</th>
                  <th>Stock Symbol</th>
                  <th>Perspective</th>
                  <th className="numeric">Execution Price</th>
                  <th className="numeric">Quantity</th>
                  <th className="numeric">Total Value</th>
                  <th>Timestamp</th>
                  <th>Related Order ID</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {t.id.substring(0, 8)}...
                    </td>
                    <td>
                      <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                        {t.symbol}
                      </span>
                    </td>
                    <td>
                      <StatusBadge side={t.side} />
                    </td>
                    <td className="numeric" style={{ fontWeight: '600' }}>
                      ${t.executionPrice.toFixed(2)}
                    </td>
                    <td className="numeric">{t.quantity}</td>
                    <td className="numeric" style={{ fontWeight: '700' }}>
                      ${t.totalValue.toFixed(2)}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {new Date(t.executedAt).toLocaleString()}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {t.orderId ? `${t.orderId.substring(0, 8)}...` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{
                padding: '14px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid rgba(166, 180, 200, 0.35)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                backgroundColor: 'var(--neu-base)',
              }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Page {page} of {totalPages} ({total} total trades)
                </span>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '32px' }}>
            <EmptyState
              icon={History}
              title="No Trades Executed Yet"
              message="When limit buy and sell quotes match on the engine, your completed execution records will be cataloged here."
            />
          </div>
        )}
      </div>
    </div>
  );
}


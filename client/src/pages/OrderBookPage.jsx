import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { stocksApi, orderBookApi } from '../services/api';
import { BookOpen, RefreshCw, ArrowLeftRight, TrendingUp } from 'lucide-react';

export default function OrderBookPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const symbolParam = searchParams.get('symbol') || 'AAPL';

  const [stocks, setStocks] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState(symbolParam);
  const [orderBook, setOrderBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load stock list for selector
  useEffect(() => {
    async function loadStocks() {
      try {
        const res = await stocksApi.getAll();
        if (res.success) {
          setStocks(res.stocks);
          if (!symbolParam && res.stocks.length > 0) {
            setSelectedSymbol(res.stocks[0].symbol);
          }
        }
      } catch (err) {
        console.error('Failed to load stock list:', err);
      }
    }
    loadStocks();
  }, []);

  // Load order book data
  const fetchOrderBook = async (symbol, isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const res = await orderBookApi.getBySymbol(symbol);
      if (res.success) {
        setOrderBook(res);
      }
    } catch (err) {
      console.error('Failed to load order book:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedSymbol) {
      fetchOrderBook(selectedSymbol);
      setSearchParams({ symbol: selectedSymbol });

      const interval = setInterval(() => {
        fetchOrderBook(selectedSymbol, false);
      }, 3500);

      return () => clearInterval(interval);
    }
  }, [selectedSymbol]);

  // Compute maximum cumulative depth for visual background bars
  const maxBidDepth = orderBook?.bids?.length ? Math.max(...orderBook.bids.map((b) => b.cumulativeDepth)) : 1;
  const maxAskDepth = orderBook?.asks?.length ? Math.max(...orderBook.asks.map((a) => a.cumulativeDepth)) : 1;

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">
            Aggregated Order Book
          </h1>
          <p className="page-subtitle">
            Market depth, resting limit orders, and immediate counterparty liquidity.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="live-badge">
            <span className="live-pulse-dot"></span>
            <span>Live Depth</span>
          </div>

          {/* Stock Selector */}
          <select
            className="form-select"
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            style={{ width: '160px', fontWeight: '600' }}
          >
            {stocks.map((s) => (
              <option key={s.id} value={s.symbol}>
                {s.symbol} — {s.companyName}
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchOrderBook(selectedSymbol, true)}
            className="btn btn-secondary"
            disabled={refreshing}
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            Refresh Book
          </button>

          <Link
            to="/trade"
            state={{ stock: orderBook?.stock }}
            className="btn btn-primary"
          >
            <ArrowLeftRight size={15} />
            Place Order
          </Link>
        </div>
      </div>

      {/* Top Telemetry Ribbon */}
      <div className="metric-ribbon" style={{ marginBottom: '24px' }}>
        <div className="metric-ribbon-item">
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>CURRENT MID PRICE</div>
          <div style={{ fontSize: '26px', fontWeight: '800', fontFamily: 'var(--font-mono)', margin: '8px 0 2px' }}>
            ${orderBook?.stock?.currentPrice.toFixed(2) || '0.00'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {orderBook?.stock?.companyName}
          </div>
        </div>

        <div className="metric-ribbon-item">
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary-green)', letterSpacing: '0.06em' }}>BEST BID (HIGHEST)</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--primary-green)', fontFamily: 'var(--font-mono)', margin: '8px 0 2px' }}>
            {orderBook?.bestBid ? `$${orderBook.bestBid.toFixed(2)}` : 'No Bids'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Immediate buyer depth
          </div>
        </div>

        <div className="metric-ribbon-item">
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-sell)', letterSpacing: '0.06em' }}>BEST ASK (LOWEST)</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--color-sell)', fontFamily: 'var(--font-mono)', margin: '8px 0 2px' }}>
            {orderBook?.bestAsk ? `$${orderBook.bestAsk.toFixed(2)}` : 'No Asks'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Immediate seller liquidity
          </div>
        </div>

        <div className="metric-ribbon-item">
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>BID-ASK SPREAD</div>
          <div style={{ fontSize: '26px', fontWeight: '800', fontFamily: 'var(--font-mono)', margin: '8px 0 2px' }}>
            {orderBook?.spread !== null && orderBook?.spread !== undefined
              ? `$${orderBook.spread.toFixed(2)}`
              : 'N/A'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Market crossing gap
          </div>
        </div>
      </div>

      {/* Main Dual Order Book Grid: Bids (Left) & Asks (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '24px',
      }}>
        {/* BIDS TABLE */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '16px 20px',
            backgroundColor: 'var(--neu-base)',
            borderBottom: '1px solid rgba(166, 180, 200, 0.35)',
            boxShadow: 'inset 0 -1px 0 rgba(255, 255, 255, 0.8)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-buy)', letterSpacing: '0.04em' }}>
              BUY ORDERS (BIDS)
            </span>
            <span style={{
              fontSize: '11px',
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--neu-base)',
              boxShadow: 'var(--neu-inset-xs)',
              color: 'var(--color-buy)',
              fontWeight: '700',
            }}>
              {orderBook?.bids?.length || 0} price levels
            </span>
          </div>

          <div className="table-responsive">
            <table className="financial-table">
              <thead>
                <tr>
                  <th>Price ($)</th>
                  <th className="numeric">Orders</th>
                  <th className="numeric">Remaining Shares</th>
                  <th className="numeric">Cumulative Depth</th>
                </tr>
              </thead>
              <tbody>
                {orderBook?.bids && orderBook.bids.length > 0 ? (
                  orderBook.bids.map((level) => {
                    const depthPercent = Math.min(100, Math.round((level.cumulativeDepth / maxBidDepth) * 100));
                    return (
                      <tr
                        key={level.price}
                        style={{
                          position: 'relative',
                          background: `linear-gradient(to left, rgba(5, 150, 105, 0.12) ${depthPercent}%, transparent ${depthPercent}%)`,
                        }}
                      >
                        <td style={{ color: 'var(--color-buy)', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
                          ${level.price.toFixed(2)}
                        </td>
                        <td className="numeric">{level.orderCount}</td>
                        <td className="numeric" style={{ fontWeight: '600' }}>{level.remainingQuantity}</td>
                        <td className="numeric" style={{ color: 'var(--text-muted)' }}>{level.cumulativeDepth}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No active buy bids in the book.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ASKS TABLE */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '16px 20px',
            backgroundColor: 'var(--neu-base)',
            borderBottom: '1px solid rgba(166, 180, 200, 0.35)',
            boxShadow: 'inset 0 -1px 0 rgba(255, 255, 255, 0.8)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-sell)', letterSpacing: '0.04em' }}>
              SELL ORDERS (ASKS)
            </span>
            <span style={{
              fontSize: '11px',
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--neu-base)',
              boxShadow: 'var(--neu-inset-xs)',
              color: 'var(--color-sell)',
              fontWeight: '700',
            }}>
              {orderBook?.asks?.length || 0} price levels
            </span>
          </div>

          <div className="table-responsive">
            <table className="financial-table">
              <thead>
                <tr>
                  <th>Price ($)</th>
                  <th className="numeric">Orders</th>
                  <th className="numeric">Remaining Shares</th>
                  <th className="numeric">Cumulative Depth</th>
                </tr>
              </thead>
              <tbody>
                {orderBook?.asks && orderBook.asks.length > 0 ? (
                  orderBook.asks.map((level) => {
                    const depthPercent = Math.min(100, Math.round((level.cumulativeDepth / maxAskDepth) * 100));
                    return (
                      <tr
                        key={level.price}
                        style={{
                          position: 'relative',
                          background: `linear-gradient(to right, rgba(220, 38, 38, 0.08) ${depthPercent}%, transparent ${depthPercent}%)`,
                        }}
                      >
                        <td style={{ color: 'var(--color-sell)', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
                          ${level.price.toFixed(2)}
                        </td>
                        <td className="numeric">{level.orderCount}</td>
                        <td className="numeric" style={{ fontWeight: '600' }}>{level.remainingQuantity}</td>
                        <td className="numeric" style={{ color: 'var(--text-muted)' }}>{level.cumulativeDepth}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No active sell asks in the book.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Public Executions on this Stock */}
      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px' }}>
          Recent Matched Executions for {selectedSymbol}
        </h3>
        {orderBook?.recentExecutions && orderBook.recentExecutions.length > 0 ? (
          <div className="table-responsive">
            <table className="financial-table">
              <thead>
                <tr>
                  <th>Execution ID</th>
                  <th>Price</th>
                  <th className="numeric">Shares Executed</th>
                  <th className="numeric">Total Value</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {orderBook.recentExecutions.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {t.id.substring(0, 8)}...
                    </td>
                    <td style={{ fontWeight: '700' }}>${t.price.toFixed(2)}</td>
                    <td className="numeric">{t.quantity}</td>
                    <td className="numeric" style={{ fontWeight: '600' }}>${t.total.toFixed(2)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {new Date(t.executedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No trades have executed yet for this stock.
          </div>
        )}
      </div>
    </div>
  );
}


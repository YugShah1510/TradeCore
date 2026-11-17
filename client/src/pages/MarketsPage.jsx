import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { stocksApi } from '../services/api';
import Modal from '../components/Modal';
import StockChart from '../components/StockChart';
import StatusBadge from '../components/StatusBadge';
import { Search, TrendingUp, TrendingDown, ArrowLeftRight, Clock, Info, Zap } from 'lucide-react';

export default function MarketsPage() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockDetail, setStockDetail] = useState(null);
  const [chartHistory, setChartHistory] = useState([]);
  const [timeRange, setTimeRange] = useState('1M');
  const [modalLoading, setModalLoading] = useState(false);
  const [flashMap, setFlashMap] = useState({});

  const previousStocksRef = useRef({});
  const navigate = useNavigate();

  const categories = ['All', 'Technology', 'Semiconductors', 'Automotive', 'E-Commerce'];

  // Silent or initial stock fetch
  const fetchStocks = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await stocksApi.getAll({ search, category });
      if (res.success) {
        // Detect price changes to trigger flash animations
        const newFlashMap = {};
        res.stocks.forEach((newS) => {
          const oldPrice = previousStocksRef.current[newS.symbol];
          if (oldPrice !== undefined && oldPrice !== null) {
            if (newS.currentPrice > oldPrice) {
              newFlashMap[newS.symbol] = 'flash-up';
            } else if (newS.currentPrice < oldPrice) {
              newFlashMap[newS.symbol] = 'flash-down';
            }
          }
          previousStocksRef.current[newS.symbol] = newS.currentPrice;
        });

        if (Object.keys(newFlashMap).length > 0) {
          setFlashMap(newFlashMap);
          setTimeout(() => {
            setFlashMap({});
          }, 1200);
        }

        setStocks(res.stocks);

        // If a stock is currently open in modal, refresh its detail
        if (selectedStock) {
          const updatedSelected = res.stocks.find((s) => s.symbol === selectedStock.symbol);
          if (updatedSelected) {
            setStockDetail((prev) => (prev ? { ...prev, ...updatedSelected } : updatedSelected));
          }
        }
      }
    } catch (err) {
      console.error('Failed to load stocks:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  // Initial load and live background polling
  useEffect(() => {
    fetchStocks(true);
    const interval = setInterval(() => {
      fetchStocks(false);
    }, 3500);

    return () => clearInterval(interval);
  }, [search, category]);

  // When selectedStock is open and timeRange is 1D, update chart history periodically
  useEffect(() => {
    if (!selectedStock || timeRange !== '1D') return;

    const historyInterval = setInterval(async () => {
      try {
        const historyRes = await stocksApi.getHistory(selectedStock.symbol, '1D');
        if (historyRes.success) setChartHistory(historyRes.history);
      } catch (e) {
        // ignore
      }
    }, 4000);

    return () => clearInterval(historyInterval);
  }, [selectedStock, timeRange]);

  // Load stock details when selected
  const handleSelectStock = async (stock) => {
    setSelectedStock(stock);
    setModalLoading(true);
    try {
      const [detailRes, historyRes] = await Promise.all([
        stocksApi.getBySymbol(stock.symbol),
        stocksApi.getHistory(stock.symbol, timeRange),
      ]);

      if (detailRes.success) setStockDetail(detailRes.stock);
      if (historyRes.success) setChartHistory(historyRes.history);
    } catch (err) {
      console.error('Failed to load stock details:', err);
    } finally {
      setModalLoading(false);
    }
  };

  // Change chart time range
  const handleRangeChange = async (range) => {
    setTimeRange(range);
    if (!selectedStock) return;
    try {
      const historyRes = await stocksApi.getHistory(selectedStock.symbol, range);
      if (historyRes.success) setChartHistory(historyRes.history);
    } catch (err) {
      console.error('Failed to load chart history:', err);
    }
  };

  return (
    <div>
      {/* Page Header with Live Pulsing Badge */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">
            Simulated Stock Markets
          </h1>
          <p className="page-subtitle">
            Real-time quotes, continuous price action, and order book depth for simulated assets.
          </p>
        </div>

        <div className="live-badge">
          <span className="live-pulse-dot"></span>
          <span>Live Market Active</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search by symbol or company name (e.g. AAPL, Tesla)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`glass-pill ${category === cat ? 'active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stocks Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="financial-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Company Name</th>
                <th>Sector</th>
                <th className="numeric">Last Price ($)</th>
                <th className="numeric">Top-of-Book (Bid / Ask)</th>
                <th className="numeric">Change</th>
                <th className="numeric">Volume</th>
                <th style={{ textAlign: 'center' }}>Trade</th>
              </tr>
            </thead>
            <tbody>
              {stocks.length === 0 && !loading && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No stocks matched your search criteria.
                  </td>
                </tr>
              )}

              {stocks.map((stock) => {
                const isPositive = stock.change >= 0;
                const flashClass = flashMap[stock.symbol] || '';

                return (
                  <tr
                    key={stock.id}
                    onClick={() => handleSelectStock(stock)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span style={{ fontWeight: '700', color: 'var(--primary-green)', fontSize: '15px' }}>
                        {stock.symbol}
                      </span>
                    </td>
                    <td style={{ fontWeight: '500' }}>{stock.companyName}</td>
                    <td>
                      <span className="badge badge-neutral">{stock.category}</span>
                    </td>
                    <td className={`numeric ${flashClass}`} style={{ fontWeight: '700', fontSize: '15px', transition: 'background-color 0.3s ease' }}>
                      ${stock.currentPrice.toFixed(2)}
                    </td>
                    <td className="numeric" style={{ fontSize: '12px' }}>
                      {stock.bestBid && stock.bestAsk ? (
                        <span>
                          <strong style={{ color: 'var(--color-buy)' }}>${stock.bestBid.toFixed(2)}</strong>
                          <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/</span>
                          <strong style={{ color: 'var(--color-sell)' }}>${stock.bestAsk.toFixed(2)}</strong>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="numeric">
                      <span className={isPositive ? 'text-positive' : 'text-negative'} style={{ fontWeight: '600' }}>
                        {isPositive ? '+' : ''}${stock.change.toFixed(2)} ({isPositive ? '+' : ''}{stock.changePercent}%)
                      </span>
                    </td>
                    <td className="numeric" style={{ color: 'var(--text-secondary)' }}>
                      {stock.volume.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/trade', { state: { stock } });
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '5px 12px', fontSize: '12px' }}
                      >
                        Trade
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Stock Modal */}
      <Modal
        isOpen={!!selectedStock}
        onClose={() => setSelectedStock(null)}
        title={selectedStock ? `${selectedStock.symbol} — ${selectedStock.companyName}` : ''}
        maxWidth="680px"
        footer={
          <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'space-between' }}>
            <button
              onClick={() => {
                const sym = selectedStock.symbol;
                setSelectedStock(null);
                navigate(`/order-book?symbol=${sym}`);
              }}
              className="btn btn-secondary"
            >
              Inspect Order Book
            </button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  const s = selectedStock;
                  setSelectedStock(null);
                  navigate('/trade', { state: { stock: s, side: 'BUY' } });
                }}
                className="btn btn-buy"
              >
                Buy {selectedStock?.symbol}
              </button>
              <button
                onClick={() => {
                  const s = selectedStock;
                  setSelectedStock(null);
                  navigate('/trade', { state: { stock: s, side: 'SELL' } });
                }}
                className="btn btn-sell"
              >
                Sell {selectedStock?.symbol}
              </button>
            </div>
          </div>
        }
      >
        {modalLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading market depth and telemetry...
          </div>
        ) : (
          <div>
            {/* Price Header inside Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'var(--font-mono)' }}>
                    ${stockDetail?.currentPrice?.toFixed(2)}
                  </div>
                  <div className="live-badge" style={{ padding: '2px 8px', fontSize: '10px' }}>
                    <span className="live-pulse-dot" style={{ width: '6px', height: '6px' }}></span>
                    Live
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span className={stockDetail?.change >= 0 ? 'text-positive' : 'text-negative'} style={{ fontWeight: '600' }}>
                    {stockDetail?.change >= 0 ? '+' : ''}${stockDetail?.change?.toFixed(2)} ({stockDetail?.change >= 0 ? '+' : ''}{stockDetail?.changePercent}%)
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Intraday Movement</span>
                </div>
              </div>

              {/* Time Range Selector */}
              <div className="glass-segmented">
                {['1D', '1W', '1M', '1Y'].map((range) => (
                  <button
                    key={range}
                    onClick={() => handleRangeChange(range)}
                    className={`glass-segmented-btn ${timeRange === range ? 'active' : ''}`}
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Performance Candlestick Chart */}
            <div style={{ marginBottom: '20px' }}>
              <StockChart
                data={chartHistory}
                height={240}
                symbol={selectedStock?.symbol}
              />
            </div>

            {/* Telemetry Stats Grid */}
            <div className="glass-panel" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              padding: '14px',
              textAlign: 'center',
            }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>PREV CLOSE</div>
                <div style={{ fontWeight: '700', fontFamily: 'var(--font-mono)' }}>${stockDetail?.previousClose?.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>BEST BID</div>
                <div style={{ fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--color-buy)' }}>
                  {stockDetail?.bestBid ? `$${stockDetail.bestBid.toFixed(2)}` : '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>BEST ASK</div>
                <div style={{ fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--color-sell)' }}>
                  {stockDetail?.bestAsk ? `$${stockDetail.bestAsk.toFixed(2)}` : '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>VOLUME</div>
                <div style={{ fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{stockDetail?.volume?.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { stocksApi, ordersApi, portfolioApi } from '../services/api';
import Modal from '../components/Modal';
import StockChart from '../components/StockChart';
import {
  ArrowLeftRight,
  Wallet,
  Layers,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Info,
  Zap,
  Clock,
  ExternalLink,
} from 'lucide-react';

export default function TradePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [stocks, setStocks] = useState([]);
  const [selectedStockId, setSelectedStockId] = useState('');
  const [side, setSide] = useState('BUY'); // 'BUY' or 'SELL'
  const [quantity, setQuantity] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [userHoldings, setUserHoldings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [chartHistory, setChartHistory] = useState([]);
  const [chartRange, setChartRange] = useState('1D');

  // Load stocks and user holdings on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [stocksRes, holdingsRes] = await Promise.all([
          stocksApi.getAll(),
          portfolioApi.getHoldings(),
        ]);

        if (stocksRes.success && stocksRes.stocks.length > 0) {
          setStocks(stocksRes.stocks);

          const passedStock = location.state?.stock;
          const passedSide = location.state?.side;
          const initialSide = passedSide || 'BUY';
          if (passedSide) setSide(passedSide);

          const targetStock = passedStock
            ? stocksRes.stocks.find((s) => s.id === passedStock.id) || stocksRes.stocks[0]
            : stocksRes.stocks[0];

          setSelectedStockId(targetStock.id);

          // Prefill price based on side: Best Ask for instant BUY, Best Bid for instant SELL
          const defaultPrice = initialSide === 'BUY'
            ? (targetStock.bestAsk || targetStock.currentPrice)
            : (targetStock.bestBid || targetStock.currentPrice);
          setLimitPrice(defaultPrice.toFixed(2));
        }

        if (holdingsRes.success) {
          setUserHoldings(holdingsRes.holdings);
        }
      } catch (err) {
        console.error('Failed to load trading data:', err);
      }
    }
    loadData();

    // Silently poll top-of-book market quotes
    const interval = setInterval(async () => {
      try {
        const stocksRes = await stocksApi.getAll();
        if (stocksRes.success) setStocks(stocksRes.stocks);
      } catch (e) {
        // silent
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [location.state]);

  const currentStock = stocks.find((s) => s.id === selectedStockId);

  // Load Candlestick chart history for selected stock
  useEffect(() => {
    if (!currentStock?.symbol) return;
    let isCancelled = false;
    async function loadStockHistory() {
      try {
        const res = await stocksApi.getHistory(currentStock.symbol, chartRange);
        if (!isCancelled && res.success) {
          setChartHistory(res.history);
        }
      } catch (e) {
        console.warn('Could not load candlestick history for trade page', e);
      }
    }
    loadStockHistory();
    return () => {
      isCancelled = true;
    };
  }, [currentStock?.symbol, chartRange]);

  // When side switches, re-evaluate limit price and refresh holdings
  const handleSideToggle = async (newSide) => {
    setSide(newSide);
    setError('');
    if (currentStock) {
      const targetPrice = newSide === 'BUY'
        ? (currentStock.bestAsk || currentStock.currentPrice)
        : (currentStock.bestBid || currentStock.currentPrice);
      setLimitPrice(targetPrice.toFixed(2));
    }
    try {
      const [holdingsRes] = await Promise.all([
        portfolioApi.getHoldings(),
        refreshUser(),
      ]);
      if (holdingsRes.success) setUserHoldings(holdingsRes.holdings);
    } catch (e) {
      // ignore
    }
  };

  // When stock selection changes, prefill limit price with top-of-book quote
  const handleStockChange = (newStockId) => {
    setSelectedStockId(newStockId);
    const st = stocks.find((s) => s.id === newStockId);
    if (st) {
      const targetPrice = side === 'BUY'
        ? (st.bestAsk || st.currentPrice)
        : (st.bestBid || st.currentPrice);
      setLimitPrice(targetPrice.toFixed(2));
    }
    setError('');
  };

  const parsedQty = parseInt(quantity, 10) || 0;
  const parsedPrice = parseFloat(limitPrice) || 0;
  const estimatedTotal = parseFloat((parsedQty * parsedPrice).toFixed(2));

  // Determine available resources
  const availableCash = user?.cashAccount ? parseFloat(user.cashAccount.availableBalance) : 100000;
  const currentHolding = userHoldings.find((h) => h.stockId === selectedStockId);
  const availableShares = currentHolding ? currentHolding.availableQuantity : 0;

  // Compute execution prediction
  const isInstantExecution = (() => {
    if (!currentStock || parsedPrice <= 0) return false;
    if (side === 'BUY') {
      return currentStock.bestAsk != null && parsedPrice >= currentStock.bestAsk;
    } else {
      return currentStock.bestBid != null && parsedPrice <= currentStock.bestBid;
    }
  })();

  // Validation before opening review modal
  const handleReviewOrder = (e) => {
    e.preventDefault();
    setError('');

    if (!selectedStockId) {
      setError('Please select a stock to trade.');
      return;
    }

    if (parsedQty <= 0) {
      setError('Quantity must be at least 1 whole share.');
      return;
    }

    if (parsedPrice <= 0) {
      setError('Limit price must be greater than $0.00.');
      return;
    }

    if (side === 'BUY' && estimatedTotal > availableCash) {
      setError(
        `Insufficient available cash. Estimated cost is $${estimatedTotal.toLocaleString()}, but you have $${availableCash.toLocaleString()} available.`
      );
      return;
    }

    if (side === 'SELL' && parsedQty > availableShares) {
      setError(
        `Insufficient available shares. You wish to sell ${parsedQty} shares, but only own ${availableShares} available shares of ${currentStock?.symbol}.`
      );
      return;
    }

    setIsReviewModalOpen(true);
  };

  // Submit order to matching engine
  const handleConfirmOrder = async () => {
    setIsReviewModalOpen(false);
    setLoading(true);
    setError('');

    try {
      const res = await ordersApi.create({
        stockId: selectedStockId,
        side,
        quantity: parsedQty,
        limitPrice: parsedPrice,
      });

      if (res.success) {
        setSuccessResult(res);
        setQuantity('');
        // Refresh global user cash balance, stocks (quotes), and local holdings
        await refreshUser();
        const [holdingsRes, stocksRes] = await Promise.all([
          portfolioApi.getHoldings(),
          stocksApi.getAll(),
        ]);
        if (holdingsRes.success) setUserHoldings(holdingsRes.holdings);
        if (stocksRes.success) setStocks(stocksRes.stocks);
      }
    } catch (err) {
      setError(err.message || 'Order failed. Please check parameters and balance.');
    } finally {
      setLoading(false);
    }
  };

  // Switch to SELL tab for current stock immediately after a BUY fill
  const handleSwitchToSell = () => {
    setSide('SELL');
    setSuccessResult(null);
    if (currentStock) {
      const targetPrice = currentStock.bestBid || currentStock.currentPrice;
      setLimitPrice(targetPrice.toFixed(2));
    }
  };

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      {/* Page Header with Live Badge */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">
            Trade Execution Terminal
          </h1>
          <p className="page-subtitle">
            Submit buy and sell limit orders into the deterministic matching engine with real-time price discovery.
          </p>
        </div>

        <div className="live-badge">
          <span className="live-pulse-dot"></span>
          <span>Live Depth</span>
        </div>
      </div>

      {error && (
        <div className="glass-alert glass-alert-danger">
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Success / Status Banner with Instant Execution Explanations */}
      {successResult && (
        <div
          className={`glass-alert ${
            successResult.order.status === 'FILLED'
              ? 'glass-alert-success'
              : successResult.order.status === 'PARTIALLY_FILLED'
              ? 'glass-alert-info'
              : 'glass-alert-warning'
          }`}
          style={{ flexDirection: 'column', alignItems: 'stretch' }}
        >
          {successResult.order.status === 'FILLED' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-green)', fontWeight: '700', fontSize: '15px', marginBottom: '6px' }}>
                <CheckCircle2 size={20} />
                <span>Order Executed Immediately! All {successResult.order.quantity} Shares Filled</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Your <strong>{successResult.order.side}</strong> order for <strong>{successResult.order.quantity} shares of {currentStock?.symbol}</strong> has been completely filled and settled.
                {successResult.order.side === 'BUY'
                  ? ' The acquired shares have been added to your Portfolio and are immediately available to hold or sell.'
                  : ' The cash proceeds have been deposited directly into your Available Virtual Capital.'}
              </p>
            </>
          ) : successResult.order.status === 'PARTIALLY_FILLED' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-info)', fontWeight: '700', fontSize: '15px', marginBottom: '6px' }}>
                <Zap size={20} />
                <span>Partially Executed: {successResult.order.filledQuantity} of {successResult.order.quantity} Shares Filled</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                {successResult.order.filledQuantity} shares matched immediately. The remaining {successResult.order.quantity - successResult.order.filledQuantity} shares are resting in the order book awaiting matching sellers.
              </p>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-warning)', fontWeight: '700', fontSize: '15px', marginBottom: '6px' }}>
                <Clock size={20} />
                <span>Order Resting in Order Book (0 of {successResult.order.quantity} Shares Filled)</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.5' }}>
                Your <strong>BUY</strong> limit order was placed at <strong>${parseFloat(successResult.order.limitPrice).toFixed(2)}</strong>.
                Because this price is below the lowest seller ask
                {currentStock?.bestAsk ? ` ($${currentStock.bestAsk.toFixed(2)})` : ''},
                it is <strong>resting open in the order book</strong> waiting for a seller.
                <br />
                <span style={{ fontWeight: '600' }}>Note:</span> Shares will <strong>only</strong> be added to your available portfolio balance once a seller matches your price.
              </p>
            </>
          )}

          {/* Trade executions list */}
          {successResult.trades && successResult.trades.length > 0 && (
            <div className="glass-panel" style={{ padding: '10px 14px', fontSize: '12px', marginBottom: '10px' }}>
              <strong>Execution Breakdown:</strong>
              {successResult.trades.map((t) => (
                <div key={t.tradeId} style={{ marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                  Matched {t.quantity} sh @ <strong>${t.executionPrice.toFixed(2)}</strong> (Total: ${t.totalValue.toFixed(2)})
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
            {successResult.order.status === 'FILLED' && successResult.order.side === 'BUY' && (
              <button
                type="button"
                onClick={handleSwitchToSell}
                className="btn btn-sell"
                style={{ fontSize: '12px', padding: '6px 14px' }}
              >
                Sell These Shares Now
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/portfolio')}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              View in Portfolio
            </button>
            <button
              type="button"
              onClick={() => navigate('/orders')}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              View in Order History
            </button>
            <button
              type="button"
              onClick={() => setSuccessResult(null)}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 14px', marginLeft: 'auto' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Order Entry Card */}
      <div className="card" style={{ padding: '32px' }}>
        {/* Buy / Sell Side Selector Tabs — Apple-style Segmented Glass Control */}
        <div className="glass-segmented glass-segmented-full" style={{ marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => handleSideToggle('BUY')}
            className={`glass-segmented-btn ${side === 'BUY' ? 'active-buy' : ''}`}
          >
            BUY (Bids)
          </button>

          <button
            type="button"
            onClick={() => handleSideToggle('SELL')}
            className={`glass-segmented-btn ${side === 'SELL' ? 'active-sell' : ''}`}
          >
            SELL (Asks)
          </button>
        </div>

        <form onSubmit={handleReviewOrder}>
          {/* Stock Selection */}
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label">Select Stock Asset</label>
            <select
              className="form-select"
              value={selectedStockId}
              onChange={(e) => handleStockChange(e.target.value)}
            >
              {stocks.map((stock) => (
                <option key={stock.id} value={stock.id}>
                  {stock.symbol} — {stock.companyName} (Mid: ${stock.currentPrice.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* Top-of-Book Telemetry Strip */}
          {currentStock && (
            <div
              className="glass-panel"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                padding: '14px 18px',
                marginBottom: '20px',
                textAlign: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Last / Mid
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)' }}>
                  ${currentStock.currentPrice.toFixed(2)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Best Bid (Buy)
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', fontSize: '15px', color: 'var(--color-buy)' }}>
                  {currentStock.bestBid ? `$${currentStock.bestBid.toFixed(2)}` : 'None'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Best Ask (Sell)
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', fontSize: '15px', color: 'var(--color-sell)' }}>
                  {currentStock.bestAsk ? `$${currentStock.bestAsk.toFixed(2)}` : 'None'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Spread
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', fontSize: '15px', color: 'var(--text-secondary)' }}>
                  {currentStock.bestAsk && currentStock.bestBid
                    ? `$${(currentStock.bestAsk - currentStock.bestBid).toFixed(2)}`
                    : '—'}
                </div>
              </div>
            </div>
          )}

          {/* Real-Time Candlestick Chart */}
          {currentStock && (
            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {currentStock.symbol} Live Candlestick Stream
                </span>
                <div className="glass-segmented" style={{ padding: '2px' }}>
                  {['1D', '1W', '1M', '1Y'].map((rng) => (
                    <button
                      key={rng}
                      type="button"
                      onClick={() => setChartRange(rng)}
                      className={`glass-segmented-btn ${chartRange === rng ? 'active' : ''}`}
                      style={{ padding: '3px 8px', fontSize: '10px' }}
                    >
                      {rng}
                    </button>
                  ))}
                </div>
              </div>
              <StockChart
                data={chartHistory}
                height={230}
                symbol={currentStock.symbol}
              />
            </div>
          )}

          {/* Current Balance / Holding Context Badge */}
          <div className="glass-panel" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 18px',
            marginBottom: '20px',
            fontSize: '13px',
          }}>
            {side === 'BUY' ? (
              <>
                <span style={{ color: 'var(--text-secondary)' }}>Available Virtual Capital:</span>
                <strong style={{ color: 'var(--primary-green)', fontFamily: 'var(--font-mono)', fontSize: '15px' }}>
                  ${availableCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </strong>
              </>
            ) : (
              <>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Available Shares of {currentStock?.symbol}:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <strong style={{ color: availableShares > 0 ? 'var(--color-buy)' : 'var(--color-sell)', fontFamily: 'var(--font-mono)', fontSize: '15px' }}>
                    {availableShares} shares
                  </strong>
                  {availableShares > 0 && (
                    <button
                      type="button"
                      onClick={() => setQuantity(availableShares.toString())}
                      className="badge badge-info"
                      style={{ cursor: 'pointer', border: 'none' }}
                    >
                      Sell Max
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Quantity & Limit Price Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '8px' }}>
            <div className="form-group" style={{ marginBottom: '8px' }}>
              <label className="form-label">Number of Shares (Quantity)</label>
              <input
                type="number"
                min="1"
                step="1"
                className="form-input"
                placeholder="e.g. 10"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Limit Price ($ USD)</label>
                {/* Quick Fill Action Pill */}
                {side === 'BUY' && currentStock?.bestAsk && (
                  <button
                    type="button"
                    onClick={() => setLimitPrice(currentStock.bestAsk.toFixed(2))}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--primary-green)',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <Zap size={12} />
                    Fill Now: ${currentStock.bestAsk.toFixed(2)}
                  </button>
                )}
                {side === 'SELL' && currentStock?.bestBid && (
                  <button
                    type="button"
                    onClick={() => setLimitPrice(currentStock.bestBid.toFixed(2))}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--color-sell)',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <Zap size={12} />
                    Sell Now: ${currentStock.bestBid.toFixed(2)}
                  </button>
                )}
              </div>

              <input
                type="number"
                min="0.01"
                step="0.01"
                className="form-input"
                placeholder="e.g. 225.50"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Execution Prediction Badge */}
          <div style={{ marginBottom: '20px' }}>
            {parsedPrice > 0 ? (
              isInstantExecution ? (
                <div
                  className="badge badge-positive"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: '500',
                    lineHeight: '1.4',
                  }}
                >
                  <Zap size={14} style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Instant Execution:</strong> Price matches current market depth. Order will fill immediately against resting {side === 'BUY' ? 'asks' : 'bids'}.
                  </span>
                </div>
              ) : (
                <div
                  className="badge badge-warning"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: '500',
                    lineHeight: '1.4',
                  }}
                >
                  <Clock size={14} style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Resting Order:</strong> Price is {side === 'BUY' ? 'below the lowest ask' : 'above the highest bid'}. Order will enter the book as an OPEN {side === 'BUY' ? 'bid' : 'ask'} and will NOT fill immediately.
                  </span>
                </div>
              )
            ) : null}
          </div>

          {/* Estimated Value Computation */}
          <div className="glass-panel" style={{
            padding: '18px 20px',
            marginBottom: '26px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                Estimated Order Value:
              </span>
              <span style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                ${estimatedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Formula: {parsedQty} shares × ${parsedPrice.toFixed(2)} limit price
            </div>
          </div>

          {/* Submit / Review Button */}
          <button
            type="submit"
            className={`btn ${side === 'BUY' ? 'btn-buy' : 'btn-sell'}`}
            style={{ width: '100%', padding: '14px', fontSize: '16px' }}
            disabled={loading}
          >
            Review {side} Order ({parsedQty} {currentStock?.symbol || 'Shares'})
          </button>
        </form>
      </div>

      {/* Confirmation / Review Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={`Confirm ${side} Limit Order`}
        footer={
          <>
            <button
              onClick={() => setIsReviewModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmOrder}
              className={`btn ${side === 'BUY' ? 'btn-buy' : 'btn-sell'}`}
              disabled={loading}
            >
              {loading ? 'Submitting to Engine...' : `Confirm & Place ${side} Order`}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Action:</span>
              <strong style={{ color: side === 'BUY' ? 'var(--color-buy)' : 'var(--color-sell)' }}>
                {side} {parsedQty} shares of {currentStock?.symbol}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Limit Price:</span>
              <strong>${parsedPrice.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Execution Expected:</span>
              <strong style={{ color: isInstantExecution ? 'var(--primary-green)' : 'var(--color-warning)' }}>
                {isInstantExecution ? '⚡ Immediate Fill' : '⏳ Resting in Order Book'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: '10px' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Total Value to Reserve:</span>
              <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '17px' }}>
                ${estimatedTotal.toFixed(2)}
              </strong>
            </div>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
            {side === 'BUY'
              ? `Submitting this order will temporarily reserve $${estimatedTotal.toFixed(2)} from your available cash. If executed at a lower resting price, the difference will be refunded immediately.`
              : `Submitting this order will temporarily reserve ${parsedQty} shares from your holdings to prevent double-selling.`}
          </p>
        </div>
      </Modal>
    </div>
  );
}

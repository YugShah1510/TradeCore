import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { stocksApi } from '../services/api';
import StockChart from '../components/StockChart';
import Logo from '../components/Logo';
import {
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Zap,
  Activity,
  Layers,
  BarChart3,
  BookOpen,
  Cpu,
  Lock,
} from 'lucide-react';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [previewStock, setPreviewStock] = useState(null);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    async function loadPreview() {
      try {
        const res = await stocksApi.getAll();
        if (res.success && res.stocks.length > 0) {
          const first = res.stocks[0];
          setPreviewStock(first);
          const historyRes = await stocksApi.getHistory(first.symbol, '1M');
          if (historyRes.success) {
            setChartData(historyRes.history);
          }
        }
      } catch (err) {
        console.warn('Could not load preview stock:', err.message);
      }
    }
    loadPreview();
  }, []);

  const handleLaunchTerminal = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--neu-base)', minHeight: '100vh' }}>
      {/* Institutional Top Status Notice */}
      <div style={{
        backgroundColor: 'var(--neu-base)',
        borderBottom: '1px solid rgba(166, 180, 200, 0.35)',
        boxShadow: 'inset 0 -1px 0 rgba(255, 255, 255, 0.8)',
        padding: '10px 24px',
        fontSize: '12px',
        fontWeight: '600',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}>
        <span style={{
          display: 'inline-block',
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: 'var(--primary-green)',
          boxShadow: '0 0 6px rgba(5, 150, 105, 0.6)',
        }} />
        <span>Simulated Exchange Environment</span>
        <span style={{ color: 'var(--border-main)' }}>|</span>
        <span style={{ color: 'var(--text-muted)' }}>Educational capital allocation: $100,000.00 virtual cash per account</span>
      </div>

      {/* Hero Section: Left-aligned High-Agency Split Structure */}
      <section style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '80px 24px 64px',
        display: 'grid',
        gridTemplateColumns: '1.15fr 0.85fr',
        gap: '56px',
        alignItems: 'center',
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--neu-base)',
            color: 'var(--primary-green)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            boxShadow: 'var(--neu-inset-sm)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            fontSize: '12px',
            fontWeight: '700',
            marginBottom: '20px',
            letterSpacing: '0.04em',
          }}>
            <Activity size={14} />
            DETERMINISTIC MATCHING ENGINE
          </div>

          <h1 style={{
            fontSize: '52px',
            fontWeight: '800',
            color: 'var(--text-primary)',
            lineHeight: '1.08',
            letterSpacing: '-0.04em',
            marginBottom: '20px',
          }}>
            Experience the <span style={{ color: 'var(--primary-green)' }}>Mechanics of the Market</span>
          </h1>

          <p style={{
            fontSize: '17px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            marginBottom: '32px',
            maxWidth: '540px',
            letterSpacing: '-0.01em',
          }}>
            TradeCore is an institutional-grade virtual stock simulator. Test limit orders, price-time priority execution, order book depth, and double-entry balance accounting without financial exposure.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={handleLaunchTerminal}
              className="btn btn-primary"
              style={{ padding: '12px 24px', fontSize: '14px' }}
            >
              Launch Trading Terminal
              <ArrowRight size={16} />
            </button>

            <a
              href="#mechanics"
              className="btn btn-secondary"
              style={{ padding: '12px 22px', fontSize: '14px' }}
            >
              Inspect Architecture
            </a>
          </div>

          {/* Hairline Telemetry Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            marginTop: '44px',
            paddingTop: '32px',
            borderTop: '1px solid rgba(166, 180, 200, 0.35)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          }}>
            <div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--primary-green)', fontFamily: 'var(--font-mono)' }}>
                $100,000
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '2px' }}>
                Virtual Cash Balance
              </div>
            </div>

            <div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                FIFO
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '2px' }}>
                Price-Time Priority
              </div>
            </div>

            <div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                100%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '2px' }}>
                Double-Entry Isolation
              </div>
            </div>
          </div>
        </div>

        {/* Live Terminal Preview Widget — Neumorphic Extruded Surface */}
        <div className="card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {previewStock ? previewStock.symbol : 'AAPL'}
                </span>
                <span className="badge badge-neutral">NASDAQ SIM</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {previewStock ? previewStock.companyName : 'Apple Inc.'}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                ${previewStock ? previewStock.currentPrice.toFixed(2) : '228.50'}
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-positive)', fontFamily: 'var(--font-mono)' }}>
                +{previewStock ? previewStock.changePercent : '1.92'}%
              </div>
            </div>
          </div>

          {/* Price Candlestick Graph */}
          <StockChart data={chartData} height={220} symbol={previewStock ? previewStock.symbol : 'AAPL'} />

          {/* Terminal Mini Quotes */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(166, 180, 200, 0.3)',
          }}>
            <div style={{
              padding: '10px 14px',
              backgroundColor: 'var(--neu-base)',
              boxShadow: 'var(--neu-inset-sm)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
            }}>
              <div style={{ fontSize: '11px', color: 'var(--primary-green)', fontWeight: '700' }}>RESTING BID</div>
              <div style={{ fontSize: '15px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--primary-green)' }}>
                ${previewStock ? (previewStock.currentPrice * 0.995).toFixed(2) : '227.35'}
              </div>
            </div>

            <div style={{
              padding: '10px 14px',
              backgroundColor: 'var(--neu-base)',
              boxShadow: 'var(--neu-inset-sm)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
            }}>
              <div style={{ fontSize: '11px', color: 'var(--color-sell)', fontWeight: '700' }}>RESTING ASK</div>
              <div style={{ fontSize: '15px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--color-sell)' }}>
                ${previewStock ? (previewStock.currentPrice * 1.005).toFixed(2) : '229.64'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Asymmetric Bento Architecture Grid (Neumorphic) */}
      <section id="mechanics" style={{
        backgroundColor: 'var(--neu-base)',
        borderTop: '1px solid rgba(166, 180, 200, 0.35)',
        borderBottom: '1px solid rgba(166, 180, 200, 0.35)',
        boxShadow: 'inset 0 6px 14px rgba(166, 180, 200, 0.25), inset 0 -6px 14px rgba(255, 255, 255, 0.7)',
        padding: '80px 24px',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ marginBottom: '48px', maxWidth: '640px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary-green)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              EXCHANGE INFRASTRUCTURE
            </span>
            <h2 style={{ fontSize: '36px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.03em', marginTop: '6px' }}>
              Engineered for Algorithmic Clarity
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.6' }}>
              Built from the ground up without simulated randomness. Real order queues, real priority resolution, and real double-entry balance enforcement.
            </p>
          </div>

          {/* Asymmetric Bento 70/30 & 30/70 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
            {/* Bento Tile 1: 7 Cols - Matching Engine Walkthrough */}
            <div className="card" style={{
              gridColumn: 'span 7',
              padding: '30px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ padding: '8px', backgroundColor: 'var(--neu-base)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--neu-raised-sm)', border: '1px solid rgba(255, 255, 255, 0.8)', color: 'var(--primary-green)' }}>
                  <Cpu size={20} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.02em' }}>
                  Deterministic Price-Time Priority
                </h3>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
                When buyers and sellers place limit orders, quotes are queued by limit price and arrival timestamp. Incoming orders execute against resting orders at the resting quote price, granting automatic price improvement.
              </p>

              <div style={{
                backgroundColor: 'var(--neu-base)',
                boxShadow: 'var(--neu-inset)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ color: 'var(--color-sell)' }}>
                  1. Resting Ask: 10 shares @ $50.00
                </div>
                <div style={{ color: 'var(--color-buy)' }}>
                  2. Incoming Bid: 15 shares @ $55.00 limit
                </div>
                <div style={{ color: 'var(--text-primary)', borderTop: '1px solid rgba(166, 180, 200, 0.3)', paddingTop: '8px' }}>
                  Execution: 10 shares filled @ $50.00 (Resting price) | 5 shares remain open in book @ $55.00
                </div>
                <div style={{ color: 'var(--primary-green)', fontWeight: '700' }}>
                  Refund: Buyer saved $5.00/share on 10 shares ($50 refund credited to cash)
                </div>
              </div>
            </div>

            {/* Bento Tile 2: 5 Cols - Order Book Liquidity */}
            <div className="card" style={{
              gridColumn: 'span 5',
              padding: '30px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ padding: '8px', backgroundColor: 'var(--neu-base)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--neu-raised-sm)', border: '1px solid rgba(255, 255, 255, 0.8)', color: 'var(--color-info)' }}>
                  <BookOpen size={20} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.02em' }}>
                  Multi-Level Market Depth
                </h3>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
                Inspect aggregated liquidity across all price levels. Watch bids and asks dynamically update as simulator orders are entered and filled.
              </p>
              <div style={{
                padding: '14px',
                backgroundColor: 'var(--neu-base)',
                boxShadow: 'var(--neu-inset-sm)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '700' }}>
                  <span>LEVEL</span>
                  <span>PRICE</span>
                  <span>SHARES</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-sell)', fontFamily: 'var(--font-mono)' }}>
                  <span>Ask 01</span>
                  <span>$229.64</span>
                  <span>25</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-buy)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  <span>Bid 01</span>
                  <span>$227.35</span>
                  <span>10</span>
                </div>
              </div>
            </div>

            {/* Bento Tile 3: 6 Cols - Double-Entry Accounting */}
            <div className="card" style={{
              gridColumn: 'span 6',
              padding: '30px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ padding: '8px', backgroundColor: 'var(--neu-base)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--neu-raised-sm)', border: '1px solid rgba(255, 255, 255, 0.8)', color: 'var(--primary-green)' }}>
                  <Lock size={20} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.02em' }}>
                  Double-Entry Capital Isolation
                </h3>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Cash and shares are atomically locked in reserved accounts during order placement. No double-spending, phantom balances, or floating-point discrepancies.
              </p>
            </div>

            {/* Bento Tile 4: 6 Cols - Realized vs Unrealized Analytics */}
            <div className="card" style={{
              gridColumn: 'span 6',
              padding: '30px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ padding: '8px', backgroundColor: 'var(--neu-base)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--neu-raised-sm)', border: '1px solid rgba(255, 255, 255, 0.8)', color: 'var(--color-warning)' }}>
                  <BarChart3 size={20} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.02em' }}>
                  Quantitative Telemetry
                </h3>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Complete visibility into realized vs. unrealized P&L, weighted average purchase prices, execution turnover, and portfolio asset allocation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step Interactive Execution Lifecycle — Neumorphic Tiles */}
      <section style={{ padding: '80px 24px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ marginBottom: '40px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary-green)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            USER LIFECYCLE
          </span>
          <h2 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.03em', marginTop: '6px' }}>
            How to Trade on TradeCore
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          <div style={{ padding: '24px', backgroundColor: 'var(--neu-base)', boxShadow: 'var(--neu-raised-sm)', border: '1px solid rgba(255, 255, 255, 0.7)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary-green)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
              01
            </div>
            <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>Account Registration</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Sign up and instantly receive \$100,000 in virtual trading capital.
            </p>
          </div>

          <div style={{ padding: '24px', backgroundColor: 'var(--neu-base)', boxShadow: 'var(--neu-raised-sm)', border: '1px solid rgba(255, 255, 255, 0.7)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary-green)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
              02
            </div>
            <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>Market Inspection</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Inspect stock quotes, historical area charts, and active order book queues.
            </p>
          </div>

          <div style={{ padding: '24px', backgroundColor: 'var(--neu-base)', boxShadow: 'var(--neu-raised-sm)', border: '1px solid rgba(255, 255, 255, 0.7)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary-green)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
              03
            </div>
            <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>Place Limit Orders</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Submit buy and sell orders. Watch the engine execute matches or rest quotes in the book.
            </p>
          </div>

          <div style={{ padding: '24px', backgroundColor: 'var(--neu-base)', boxShadow: 'var(--neu-raised-sm)', border: '1px solid rgba(255, 255, 255, 0.7)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary-green)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
              04
            </div>
            <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>Track Performance</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Monitor portfolio net worth, unrealized P&L, trade logs, and asset allocations.
            </p>
          </div>
        </div>

        <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-start' }}>
          <Link to="/register" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '14px' }}>
            Open Virtual Account ($100k Capital)
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Institutional Footer */}
      <footer style={{
        backgroundColor: 'var(--neu-base)',
        borderTop: '1px solid rgba(166, 180, 200, 0.35)',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        padding: '36px 24px',
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <Logo size={30} withText textProps={{ fontSize: '15px' }} />

          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            TradeCore Simulation Engine. All funds and orders are virtual. Built strictly for educational and development use.
          </div>

          <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <Link to="/markets">Markets</Link>
            <Link to="/order-book">Order Book</Link>
            <Link to="/login">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

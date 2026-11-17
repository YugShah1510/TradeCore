import React, { useState, useRef, useEffect, useMemo } from 'react';

/**
 * Professional Interactive Candlestick (OHLC) Chart Component
 * 
 * Strict React Hooks Rule Compliance:
 * - All hooks called unconditionally at top of component
 * - Zero hooks after early returns
 * - Smooth fallback when data is loading or empty
 */
export default function StockChart({
  data = [],
  height = 260,
  color = '#10B981',
  symbol,
  showControls = true,
  showVolume = true,
  defaultMode = 'candles', // 'candles' | 'line'
}) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(600);
  const [chartMode, setChartMode] = useState(defaultMode);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [mousePos, setMousePos] = useState(null);

  // Measure container width responsively
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          setContainerWidth(Math.floor(rect.width));
        }
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    window.addEventListener('resize', updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // Normalize data to ensure consistent OHLC structure
  const candleData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return [];

    return data.map((d, i) => {
      const close = Number(
        d.close !== undefined ? d.close : (d.price !== undefined ? d.price : 100)
      );

      // Derive realistic open, high, low if missing
      const prevClose = i > 0
        ? (data[i - 1].close ?? data[i - 1].price ?? close)
        : close * 0.998;

      const open = Number(d.open !== undefined ? d.open : prevClose);

      let high = Number(
        d.high !== undefined
          ? d.high
          : Math.max(open, close) + Math.max(0.05, Math.abs(close - open) * 0.4)
      );

      let low = Number(
        d.low !== undefined
          ? d.low
          : Math.min(open, close) - Math.max(0.05, Math.abs(close - open) * 0.4)
      );

      // Ensure boundary validity
      if (high < Math.max(open, close)) high = Math.max(open, close) + 0.02;
      if (low > Math.min(open, close)) low = Math.min(open, close) - 0.02;

      const volume = Number(
        d.volume !== undefined ? d.volume : 3500 + Math.abs(Math.sin(i * 1.7)) * 12000
      );

      const isBullish = close >= open;
      const change = close - open;
      const changePercent = open > 0 ? (change / open) * 100 : 0;
      const dateLabel = d.date || d.time || `T${i + 1}`;
      const timeLabel = d.time || dateLabel;

      return {
        open,
        high,
        low,
        close,
        price: close,
        volume,
        isBullish,
        change,
        changePercent,
        date: dateLabel,
        time: timeLabel,
      };
    });
  }, [data]);

  // STRICT RULE OF HOOKS: No hooks after this point!
  if (!candleData || candleData.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '13px',
          backgroundColor: 'var(--neu-base)',
          boxShadow: 'var(--neu-inset-sm)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(166, 180, 200, 0.25)',
        }}
      >
        Loading price history...
      </div>
    );
  }

  // Chart Dimensions & Margins
  const width = Math.max(300, containerWidth);
  const marginTop = 36;
  const marginBottom = 28;
  const marginLeft = 12;
  const marginRight = 60; // Room for price axis values

  const plotWidth = Math.max(50, width - marginLeft - marginRight);
  const plotHeight = Math.max(50, height - marginTop - marginBottom);

  const volHeight = showVolume ? Math.floor(plotHeight * 0.22) : 0;
  const priceHeight = showVolume ? plotHeight - volHeight - 8 : plotHeight;
  const priceTop = marginTop;
  const volTop = marginTop + priceHeight + 8;

  // Price Domain Calculations
  const allLows = candleData.map((c) => c.low);
  const allHighs = candleData.map((c) => c.high);
  const rawMinPrice = Math.min(...allLows);
  const rawMaxPrice = Math.max(...allHighs);
  const priceSpread = Math.max(0.2, rawMaxPrice - rawMinPrice);
  const domainMin = rawMinPrice - priceSpread * 0.04;
  const domainMax = rawMaxPrice + priceSpread * 0.04;
  const domainRange = Math.max(0.1, domainMax - domainMin);

  // Volume Domain Calculations
  const maxVolume = Math.max(...candleData.map((c) => c.volume), 1000);

  // Coordinate Mapping Helpers
  const slotWidth = plotWidth / candleData.length;
  const candleBodyWidth = Math.max(2, Math.min(18, slotWidth * 0.68));

  const getYForPrice = (p) => {
    return priceTop + priceHeight - ((p - domainMin) / domainRange) * priceHeight;
  };

  const getPriceForY = (y) => {
    const clampedY = Math.min(priceTop + priceHeight, Math.max(priceTop, y));
    const ratio = 1 - (clampedY - priceTop) / priceHeight;
    return domainMin + ratio * domainRange;
  };

  // Active Candle for HUD: hovered candle, or default to the latest candle
  const activeIndex = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < candleData.length
    ? hoverIndex
    : candleData.length - 1;
  const activeCandle = candleData[activeIndex];

  // Mouse Interaction Handlers
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mouseX >= marginLeft && mouseX <= width - marginRight && mouseY >= marginTop && mouseY <= height - marginBottom) {
      const relX = mouseX - marginLeft;
      const idx = Math.min(candleData.length - 1, Math.max(0, Math.floor(relX / slotWidth)));
      setHoverIndex(idx);
      setMousePos({ x: mouseX, y: mouseY });
    } else {
      setHoverIndex(null);
      setMousePos(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setMousePos(null);
  };

  // Grid Levels (4 horizontal ticks)
  const gridTicks = [0, 0.33, 0.66, 1].map((pct) => {
    const priceVal = domainMin + pct * domainRange;
    const y = getYForPrice(priceVal);
    return { priceVal, y };
  });

  // Time Ticks (5-6 evenly spaced X markers)
  const timeTickCount = Math.min(6, Math.max(3, Math.floor(plotWidth / 90)));
  const timeTicks = [];
  for (let t = 0; t < timeTickCount; t++) {
    const idx = Math.floor((t / (timeTickCount - 1)) * (candleData.length - 1));
    const x = marginLeft + (idx + 0.5) * slotWidth;
    timeTicks.push({
      x,
      label: candleData[idx]?.date || candleData[idx]?.time || '',
    });
  }

  // Generate SVG Line Path for Line Chart Mode (pure string mapping, 0 hooks)
  const linePath = candleData
    .map((c, i) => {
      const x = marginLeft + (i + 0.5) * slotWidth;
      const y = getYForPrice(c.close);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const firstX = marginLeft + 0.5 * slotWidth;
  const lastX = marginLeft + (candleData.length - 0.5) * slotWidth;
  const bottomY = priceTop + priceHeight;
  const areaPath = linePath
    ? `${linePath} L ${lastX.toFixed(1)} ${bottomY.toFixed(1)} L ${firstX.toFixed(1)} ${bottomY.toFixed(1)} Z`
    : '';

  const bullishColor = '#10B981';
  const bearishColor = '#F43F5E';
  const activeColor = activeCandle?.isBullish ? bullishColor : bearishColor;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        width: '100%',
        height,
        userSelect: 'none',
        overflow: 'hidden',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'var(--neu-base)',
        border: '1px solid rgba(166, 180, 200, 0.25)',
      }}
    >
      {/* Top HUD & Mode Toggle Bar */}
      <div
        style={{
          position: 'absolute',
          top: 6,
          left: 12,
          right: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          fontFamily: 'var(--font-mono, monospace)',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        {/* Candle Telemetry HUD */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {symbol && (
            <span style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '12px' }}>
              {symbol}
            </span>
          )}
          <span style={{ color: 'var(--text-muted)' }}>
            O: <strong style={{ color: 'var(--text-primary)' }}>${activeCandle.open.toFixed(2)}</strong>
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            H: <strong style={{ color: 'var(--text-primary)' }}>${activeCandle.high.toFixed(2)}</strong>
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            L: <strong style={{ color: 'var(--text-primary)' }}>${activeCandle.low.toFixed(2)}</strong>
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            C: <strong style={{ color: activeColor }}>${activeCandle.close.toFixed(2)}</strong>
          </span>
          <span
            style={{
              fontWeight: '700',
              color: activeColor,
              backgroundColor: activeCandle.isBullish ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
              padding: '1px 6px',
              borderRadius: '4px',
            }}
          >
            {activeCandle.change >= 0 ? '+' : ''}
            {activeCandle.change.toFixed(2)} ({activeCandle.changePercent >= 0 ? '+' : ''}
            {activeCandle.changePercent.toFixed(2)}%)
          </span>
        </div>

        {/* Chart View Toggle Controls */}
        {showControls && (
          <div
            style={{
              display: 'flex',
              gap: '4px',
              pointerEvents: 'auto',
              backgroundColor: 'var(--neu-base)',
              padding: '2px',
              borderRadius: '6px',
              boxShadow: 'var(--neu-raised-sm)',
              border: '1px solid rgba(166, 180, 200, 0.3)',
            }}
          >
            <button
              type="button"
              onClick={() => setChartMode('candles')}
              style={{
                border: 'none',
                background: chartMode === 'candles' ? 'var(--neu-inset-sm, rgba(16, 185, 129, 0.15))' : 'transparent',
                color: chartMode === 'candles' ? 'var(--primary-green)' : 'var(--text-muted)',
                fontWeight: chartMode === 'candles' ? '700' : '500',
                fontSize: '10px',
                padding: '2px 7px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
              title="Candlestick Chart"
            >
              <span>🕯️</span> Candles
            </button>
            <button
              type="button"
              onClick={() => setChartMode('line')}
              style={{
                border: 'none',
                background: chartMode === 'line' ? 'var(--neu-inset-sm, rgba(16, 185, 129, 0.15))' : 'transparent',
                color: chartMode === 'line' ? 'var(--primary-green)' : 'var(--text-muted)',
                fontWeight: chartMode === 'line' ? '700' : '500',
                fontSize: '10px',
                padding: '2px 7px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
              title="Line Chart"
            >
              <span>📈</span> Line
            </button>
          </div>
        )}
      </div>

      {/* Main SVG Render Engine */}
      <svg
        width={width}
        height={height}
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <defs>
          <linearGradient id="chartLineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={activeColor} stopOpacity="0.25" />
            <stop offset="95%" stopColor={activeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal Price Grid Lines & Y-Axis Labels */}
        {gridTicks.map((tick, idx) => (
          <g key={`grid-${idx}`}>
            <line
              x1={marginLeft}
              y1={tick.y}
              x2={width - marginRight}
              y2={tick.y}
              stroke="var(--border-subtle, rgba(166, 180, 200, 0.25))"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            <text
              x={width - marginRight + 8}
              y={tick.y + 3.5}
              fill="var(--text-muted)"
              fontSize="10"
              fontFamily="var(--font-mono, monospace)"
              textAnchor="start"
            >
              ${tick.priceVal.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Volume Separator Line */}
        {showVolume && (
          <line
            x1={marginLeft}
            y1={volTop - 4}
            x2={width - marginRight}
            y2={volTop - 4}
            stroke="var(--border-subtle, rgba(166, 180, 200, 0.18))"
            strokeDasharray="2 2"
            strokeWidth="0.8"
          />
        )}

        {/* Bottom Time Ticks (X-Axis) */}
        {timeTicks.map((tick, idx) => (
          <text
            key={`timetick-${idx}`}
            x={tick.x}
            y={height - 8}
            fill="var(--text-muted)"
            fontSize="10"
            fontFamily="var(--font-mono, monospace)"
            textAnchor="middle"
          >
            {tick.label}
          </text>
        ))}

        {/* Render Volume Histogram Bars (Bottom Sub-chart) */}
        {showVolume &&
          candleData.map((c, i) => {
            const cx = marginLeft + (i + 0.5) * slotWidth;
            const barH = Math.max(2, (c.volume / maxVolume) * (volHeight - 2));
            const barY = volTop + volHeight - barH;
            const barColor = c.isBullish ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)';

            return (
              <rect
                key={`vol-${i}`}
                x={cx - candleBodyWidth / 2}
                y={barY}
                width={candleBodyWidth}
                height={barH}
                fill={barColor}
                rx="1"
              />
            );
          })}

        {/* Render CANDLESTICK Mode */}
        {chartMode === 'candles' &&
          candleData.map((c, i) => {
            const cx = marginLeft + (i + 0.5) * slotWidth;
            const yOpen = getYForPrice(c.open);
            const yClose = getYForPrice(c.close);
            const yHigh = getYForPrice(c.high);
            const yLow = getYForPrice(c.low);

            const topY = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
            const cColor = c.isBullish ? bullishColor : bearishColor;

            return (
              <g key={`candle-${i}`}>
                {/* Candle Wick (High-Low Line) */}
                <line
                  x1={cx}
                  y1={yHigh}
                  x2={cx}
                  y2={yLow}
                  stroke={cColor}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />

                {/* Candle Body (Open-Close Rect) */}
                <rect
                  x={cx - candleBodyWidth / 2}
                  y={topY}
                  width={candleBodyWidth}
                  height={bodyHeight}
                  fill={cColor}
                  rx="1.5"
                />
              </g>
            );
          })}

        {/* Render LINE Mode */}
        {chartMode === 'line' && (
          <g>
            <path d={areaPath} fill="url(#chartLineGradient)" />
            <path
              d={linePath}
              fill="none"
              stroke={activeColor}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* Dot on active candle */}
            {activeCandle && (
              <circle
                cx={marginLeft + (activeIndex + 0.5) * slotWidth}
                cy={getYForPrice(activeCandle.close)}
                r="4"
                fill={activeColor}
                stroke="var(--neu-base)"
                strokeWidth="2"
              />
            )}
          </g>
        )}

        {/* Interactive Crosshair & Price Callout */}
        {hoverIndex !== null && mousePos && (
          <g pointerEvents="none">
            {/* Vertical Crosshair Line */}
            <line
              x1={marginLeft + (hoverIndex + 0.5) * slotWidth}
              y1={priceTop}
              x2={marginLeft + (hoverIndex + 0.5) * slotWidth}
              y2={height - marginBottom}
              stroke="var(--text-muted)"
              strokeOpacity="0.5"
              strokeDasharray="3 3"
              strokeWidth="1"
            />

            {/* Horizontal Crosshair Line */}
            <line
              x1={marginLeft}
              y1={mousePos.y}
              x2={width - marginRight}
              y2={mousePos.y}
              stroke="var(--text-muted)"
              strokeOpacity="0.5"
              strokeDasharray="3 3"
              strokeWidth="1"
            />

            {/* Right Y-Axis Price Callout Pill */}
            <g transform={`translate(${width - marginRight + 2}, ${mousePos.y - 10})`}>
              <rect
                x="0"
                y="0"
                width="54"
                height="20"
                rx="4"
                fill="var(--text-primary)"
              />
              <text
                x="27"
                y="14"
                fill="var(--neu-base)"
                fontSize="10"
                fontWeight="700"
                fontFamily="var(--font-mono, monospace)"
                textAnchor="middle"
              >
                ${getPriceForY(mousePos.y).toFixed(2)}
              </text>
            </g>

            {/* Bottom X-Axis Time Callout Pill */}
            <g transform={`translate(${marginLeft + (hoverIndex + 0.5) * slotWidth - 30}, ${height - marginBottom + 4})`}>
              <rect
                x="0"
                y="0"
                width="60"
                height="18"
                rx="4"
                fill="var(--text-primary)"
              />
              <text
                x="30"
                y="13"
                fill="var(--neu-base)"
                fontSize="10"
                fontWeight="700"
                fontFamily="var(--font-mono, monospace)"
                textAnchor="middle"
              >
                {activeCandle.date}
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}

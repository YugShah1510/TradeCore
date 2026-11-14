import React from 'react';
import logoImg from '../assets/logo.png';

/**
 * TradeCore Brand Logo Component
 * 
 * Displays the official hexagonal chart logo with responsive sizing,
 * optional typography branding, and neumorphic badge styling.
 */
export default function Logo({
  size = 36,
  withText = false,
  textProps = {},
  variant = 'badge', // 'badge' (inside neumorphic pill) or 'plain' (just the mark)
  style = {},
  className = '',
}) {
  const imageSize = variant === 'badge' ? Math.round(size * 0.72) : size;

  const mark = (
    <div
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...(variant === 'badge'
          ? {
              backgroundColor: 'var(--neu-base)',
              borderRadius: 'var(--radius-sm, 10px)',
              boxShadow: 'var(--neu-raised-sm)',
              border: '1px solid var(--border-light, rgba(255, 255, 255, 0.7))',
            }
          : {}),
        ...style,
      }}
    >
      <img
        src={logoImg}
        alt="TradeCore Logo"
        style={{
          width: `${imageSize}px`,
          height: `${imageSize}px`,
          objectFit: 'contain',
          display: 'block',
          filter: 'drop-shadow(0 1px 2px rgba(8, 122, 60, 0.25))',
        }}
      />
    </div>
  );

  if (!withText) {
    return mark;
  }

  const { fontSize = '18px', fontWeight = '800', ...restTextProps } = textProps;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      {mark}
      <span
        style={{
          fontSize,
          fontWeight,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
          ...restTextProps,
        }}
      >
        Trade<span style={{ color: 'var(--primary-green)' }}>Core</span>
      </span>
    </div>
  );
}

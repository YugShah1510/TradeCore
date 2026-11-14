import React from 'react';

export default function StatusBadge({ status, side, text }) {
  if (side) {
    const isBuy = side.toUpperCase() === 'BUY';
    return (
      <span className={`badge ${isBuy ? 'badge-buy' : 'badge-sell'}`}>
        {side.toUpperCase()}
      </span>
    );
  }

  if (status) {
    const normalized = status.toUpperCase();
    let badgeClass = 'badge-neutral';

    if (normalized === 'FILLED') {
      badgeClass = 'badge-positive';
    } else if (normalized === 'PARTIALLY_FILLED') {
      badgeClass = 'badge-info';
    } else if (normalized === 'OPEN') {
      badgeClass = 'badge-warning';
    } else if (normalized === 'CANCELLED' || normalized === 'REJECTED') {
      badgeClass = 'badge-negative';
    }

    return (
      <span className={`badge ${badgeClass}`}>
        {normalized.replace('_', ' ')}
      </span>
    );
  }

  return <span className="badge badge-neutral">{text}</span>;
}


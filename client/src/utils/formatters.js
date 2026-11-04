/**
 * Financial Formatting Utilities
 * 
 * Provides consistent currency, percentage, and date/time formatters
 * across the TradeCore client application.
 */

export function formatCurrency(amount, decimals = 2) {
  if (amount === null || amount === undefined || isNaN(amount)) return '$0.00';
  return `$${Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatPercent(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return '0.00%';
  const num = Number(value);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(decimals)}%`;
}

export function formatDateTime(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}


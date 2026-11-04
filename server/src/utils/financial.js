/**
 * Financial Calculation Helpers
 * 
 * Standardizes monetary decimal rounding and percentage computations.
 */

function roundCurrency(val) {
  return parseFloat(Number(val).toFixed(2));
}

function calculatePnL(currentVal, costBasis) {
  const pnl = currentVal - costBasis;
  const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
  return {
    pnl: roundCurrency(pnl),
    pnlPercent: parseFloat(pnlPercent.toFixed(2)),
  };
}

module.exports = {
  roundCurrency,
  calculatePnL,
};


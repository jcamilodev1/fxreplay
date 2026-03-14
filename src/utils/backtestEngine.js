/**
 * Simple Backtesting Engine
 * Iterates through candles and executes a demonstration strategy.
 */
export const runBacktest = (data, options = {}) => {
  const {
    initialBalance = 10000,
    riskPerTrade = 0.01, // 1%
    stopLossPips = 20,
    takeProfitPips = 40,
  } = options;

  let balance = initialBalance;
  let equity = initialBalance;
  const trades = [];
  const equityCurve = [];

  // Simulate candle by candle
  for (let i = 20; i < data.length; i++) {
    const currentCandle = data[i];
    const prevCandles = data.slice(i - 20, i);
    
    // Simple Strategy: Breakout of 20-period High/Low
    const high20 = Math.max(...prevCandles.map(c => c.high));
    const low20 = Math.min(...prevCandles.map(c => c.low));

    // Entry Logic
    if (currentCandle.close > high20) {
      // Long Signal
      const entryPrice = currentCandle.close;
      const result = Math.random() > 0.45 ? 'win' : 'loss'; // Simulated win/loss for demo
      const pnl = result === 'win' ? (balance * riskPerTrade * 2) : -(balance * riskPerTrade);
      
      balance += pnl;
      trades.push({
        type: 'BUY',
        entry: entryPrice,
        exit: entryPrice + (result === 'win' ? 0.0040 : -0.0020),
        pnl: pnl.toFixed(2),
        status: result,
        time: currentCandle.time
      });
    } else if (currentCandle.close < low20) {
      // Short Signal
      const entryPrice = currentCandle.close;
      const result = Math.random() > 0.45 ? 'win' : 'loss';
      const pnl = result === 'win' ? (balance * riskPerTrade * 2) : -(balance * riskPerTrade);
      
      balance += pnl;
      trades.push({
        type: 'SELL',
        entry: entryPrice,
        exit: entryPrice - (result === 'win' ? 0.0040 : -0.0020),
        pnl: pnl.toFixed(2),
        status: result,
        time: currentCandle.time
      });
    }

    equityCurve.push({ time: currentCandle.time, value: balance });
  }

  return {
    finalBalance: balance,
    totalTrades: trades.length,
    winRate: (trades.filter(t => t.status === 'win').length / trades.length) * 100,
    trades,
    equityCurve
  };
};

export const calculateMetrics = (trades, initialBalance) => {
  if (trades.length === 0) {
    return { profit: 0, winRate: 0, drawdown: 0, grossProfit: 0, grossLoss: 0, maxLoss: 0 };
  }

  const pnls = trades.map(t => parseFloat(t.pnl));
  const totalProfit = pnls.reduce((a, b) => a + b, 0);
  const wins = pnls.filter(p => p > 0).length;

  const grossProfit = pnls.filter(p => p > 0).reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(pnls.filter(p => p < 0).reduce((a, b) => a + b, 0));
  const maxLoss = pnls.length > 0 ? Math.abs(Math.min(...pnls, 0)) : 0;

  let maxBalance = initialBalance;
  let maxDrawdown = 0;
  let currentBalance = initialBalance;

  pnls.forEach(p => {
    currentBalance += p;
    if (currentBalance > maxBalance) maxBalance = currentBalance;
    const dd = ((maxBalance - currentBalance) / maxBalance) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
  });

  return {
    profit: totalProfit,
    winRate: (wins / trades.length) * 100,
    drawdown: maxDrawdown,
    grossProfit,
    grossLoss,
    maxLoss,
  };
};

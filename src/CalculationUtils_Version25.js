/**
 * 计算工具函数
 * 包含所有与合约交易计算相关的功能
 */

// 翻译方向和保证金类型
export const translateDirection = (dir) => dir === 'long' ? '多单' : '空单';
export const translateMarginType = (type) => type === 'cross' ? '全仓' : '逐仓';

// 计算未实现盈亏
export const calculateUnrealizedPnL = (pos, contractValue) => {
  if (pos.closed) return "0.00";
  
  const delta = pos.direction === 'long' 
    ? pos.currentPrice - pos.entryPrice 
    : pos.entryPrice - pos.currentPrice;
  
  return (delta * pos.quantity * contractValue).toFixed(2);
};

// 计算所有仓位的DEX
export const calculateAllDEX = (positions, currentBalance, contractValue) => {
  // DEX计算需要考虑所有仓位信息，返回每个仓位对应的DEX值
  const activePositions = positions.filter(p => !p.closed);
  
  // 计算总的维持保证金、总手续费和总逐仓保证金
  const totalMaintenanceMargin = activePositions.reduce(
    (sum, p) => sum + parseFloat(p.maintenanceMargin || 0), 0);
  const totalFees = activePositions.reduce(
    (sum, p) => sum + parseFloat(p.openFee || 0), 0);
  const totalIsolatedMargin = activePositions
    .filter(p => p.marginType === 'isolated')
    .reduce((sum, p) => sum + parseFloat(p.margin || 0), 0);
  
  // 计算每个仓位的DEX
  return activePositions.map(pos => {
    // 计算除本仓位外其他仓位的未实现盈亏
    const otherPositionsUnrealizedPnl = activePositions.reduce((sum, p) => {
      if (p !== pos) { // 不同的对象引用
        return sum + parseFloat(p.unrealizedPnl || 0);
      }
      return sum;
    }, 0);
    
    // 当前仓位的DEX
    const dex = currentBalance - totalMaintenanceMargin - totalFees - totalIsolatedMargin + otherPositionsUnrealizedPnl;
    
    return {
      ...pos,
      dex: dex.toFixed(2)
    };
  });
};

// 计算爆仓价，基于最新的DEX值
export const calculateLiquidationPrices = (positionsWithDex, contractValue) => {
  return positionsWithDex.map(pos => {
    // 如果已平仓，不再计算爆仓价
    if (pos.closed) return pos;
    
    const positionValue = parseFloat(pos.positionValue);
    const dex = parseFloat(pos.dex);
    let liquidationPrice;
    
    if (pos.direction === 'long') {
      liquidationPrice = (positionValue - dex) / (pos.quantity * contractValue);
    } else {
      liquidationPrice = (positionValue + dex) / (pos.quantity * contractValue);
    }
    
    return {
      ...pos,
      liquidationPrice: liquidationPrice.toFixed(4)
    };
  });
};

// 计算仓位信息
export const calculatePositionValues = (pos, currentPrice, contractValue, feeRate, maintenanceMarginRate) => {
  if (pos.closed) return pos;
  
  const positionValue = pos.quantity * contractValue * pos.entryPrice;
  const margin = positionValue / pos.leverage;
  const openFee = positionValue * feeRate;
  const maintenanceMargin = pos.quantity * pos.entryPrice * contractValue * maintenanceMarginRate;
  
  // 计算未实现盈亏
  const delta = pos.direction === 'long' ? currentPrice - pos.entryPrice : pos.entryPrice - currentPrice;
  const unrealizedPnl = (delta * pos.quantity * contractValue).toFixed(2);
  
  return {
    ...pos,
    currentPrice,
    positionValue: positionValue.toFixed(4),
    margin: margin.toFixed(2),
    openFee: openFee.toFixed(4),
    maintenanceMargin: maintenanceMargin.toFixed(4),
    unrealizedPnl
  };
};

// 计算账户信息
export const calculateAccountInfo = (positions, initialBalance, currentBalance) => {
  const totalMarginCross = positions.filter(p => p.marginType === 'cross' && !p.closed).reduce((sum, p) => sum + parseFloat(p.margin), 0);
  const totalMarginIsolated = positions.filter(p => p.marginType === 'isolated' && !p.closed).reduce((sum, p) => sum + parseFloat(p.margin), 0);
  const totalMargin = totalMarginCross + totalMarginIsolated;
  const totalOpenFee = positions.reduce((sum, p) => sum + parseFloat(p.openFee), 0);
  const totalCloseFee = positions.filter(p => p.closed && p.closeFee).reduce((sum, p) => sum + parseFloat(p.closeFee), 0);
  const totalFee = totalOpenFee + totalCloseFee;
  const totalUnrealizedPnl = positions.filter(p => !p.closed).reduce((sum, p) => sum + parseFloat(p.unrealizedPnl), 0);
  const totalRealizedPnl = positions.filter(p => p.closed && p.realizedPnl).reduce((sum, p) => sum + parseFloat(p.realizedPnl), 0);
  
  // 可用资金 = 当前余额 - 保证金占用
  const availableBalance = currentBalance - totalMargin;
  
  return { 
    totalMarginCross, 
    totalMarginIsolated, 
    totalMargin,
    totalOpenFee,
    totalCloseFee,
    totalFee, 
    totalUnrealizedPnl,
    totalRealizedPnl,
    availableBalance
  };
};
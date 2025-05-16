
/**
 * 计算工具函数
 * 包含所有与合约交易计算相关的功能
 */

// 翻译方向和保证金类型
export const translateDirection = (dir) => dir === 'long' ? '多单' : '空单';
export const translateMarginType = (type) => type === 'cross' ? '全仓' : '逐仓';

// 计算未实现盈亏
export const calculateUnrealizedPnL = (pos, contractValue) => {
  if (pos.status === 'closed') return "0.00";  // 修改这里

  const delta = pos.direction === 'long'
      ? pos.currentPrice - pos.entryPrice
      : pos.entryPrice - pos.currentPrice;

  return (delta * pos.quantity * contractValue).toFixed(2);
};

// 计算所有仓位的DEX


// Add this function to CalculationUtils.js
export const calculatePositionValues = (pos, currentPrice, contractValue, feeRate, maintenanceMarginRate) => {
  if (isPositionClosed(pos)) return pos;
  // Update position value based on current price
  const positionValue = pos.quantity * contractValue * currentPrice;

  // Calculate margin based on position value and leverage
  const margin = positionValue / pos.leverage;

  // Calculate maintenance margin
  const maintenanceMargin = pos.quantity * currentPrice * contractValue * maintenanceMarginRate;

  // Calculate unrealized PnL
  const delta = pos.direction === 'long'
      ? currentPrice - pos.entryPrice
      : pos.entryPrice - currentPrice;
  const unrealizedPnl = (delta * pos.quantity * contractValue).toFixed(2);

  return {
    ...pos,
    currentPrice,
    positionValue: positionValue.toFixed(4),
    margin: margin.toFixed(2),
    maintenanceMargin: maintenanceMargin.toFixed(4),
    unrealizedPnl
  };
};
export const isPositionClosed = (position) => {
  return position.closed === true;
};
/**
 * 合并同一交易对的全仓仓位
 * @param {Array} positions 所有仓位
 * @return {Array} 处理后的仓位数组，相同交易对的全仓仓位被合并
 */
export const mergePositionsBySymbol = (positions) => {
  // 分离全仓和逐仓仓位
  const crossPositions = positions.filter(p => p.marginType === 'cross' && !isPositionClosed(p));
  const otherPositions = positions.filter(p => p.marginType !== 'cross' || isPositionClosed(p));

  // 按交易对分组全仓仓位
  const symbolGroups = {};
  crossPositions.forEach(pos => {
    if (!symbolGroups[pos.symbol]) {
      symbolGroups[pos.symbol] = [];
    }
    symbolGroups[pos.symbol].push(pos);
  });

  // 合并结果数组
  const mergedPositions = [...otherPositions];

  // 处理每个交易对的全仓仓位组
  Object.keys(symbolGroups).forEach(symbol => {
    const positions = symbolGroups[symbol];

    // 如果只有一个仓位，无需合并
    if (positions.length === 1) {
      mergedPositions.push(positions[0]);
      return;
    }

    // 分离多空仓位并计算总量
    let longQuantity = 0;
    let longValue = 0;
    let shortQuantity = 0;
    let shortValue = 0;

    positions.forEach(pos => {
      if (pos.direction === 'long') {
        longQuantity += parseFloat(pos.quantity);
        longValue += parseFloat(pos.quantity) * parseFloat(pos.entryPrice);
      } else {
        shortQuantity += parseFloat(pos.quantity);
        shortValue += parseFloat(pos.quantity) * parseFloat(pos.entryPrice);
      }
    });

    // 计算净仓位
    const netQuantity = longQuantity - shortQuantity;

    // 如果净仓位为0，不添加合并仓位
    if (Math.abs(netQuantity) < 0.00001) {
      return;
    }

    // 确定方向和计算均价
    const direction = netQuantity > 0 ? 'long' : 'short';
    let avgEntryPrice;

    if (direction === 'long') {
      // 多仓占优，计算均价
      avgEntryPrice = (longValue - shortValue) / netQuantity;
    } else {
      // 空仓占优，计算均价
      avgEntryPrice = (shortValue - longValue) / Math.abs(netQuantity);
    }

    // 创建合并仓位
    // 使用第一个仓位作为基础，修改关键属性
    const mergedPosition = {
      ...positions[0],
      direction,
      quantity: Math.abs(netQuantity),
      entryPrice: avgEntryPrice,
      isMerged: true, // 标记为合并仓位
      mergeInfo: {
        longQuantity,
        longValue,
        shortQuantity,
        shortValue,
        netQuantity,
        originalPositions: positions
      }
    };

    // 重新计算合并仓位的关键数据
    const positionValue = Math.abs(netQuantity) * avgEntryPrice;
    mergedPosition.positionValue = positionValue.toFixed(4);

    // 计算保证金 - 使用所有合并仓位的保证金之和
    const totalMargin = positions.reduce((sum, pos) => sum + parseFloat(pos.margin), 0);
    mergedPosition.margin = totalMargin.toFixed(2);

    // 计算杠杆 - 使用仓位价值除以保证金
    mergedPosition.leverage = (positionValue / totalMargin).toFixed(2);

    // 添加合并后的仓位
    mergedPositions.push(mergedPosition);
  });

  return mergedPositions;
};

// 修改计算所有仓位的DEX函数，加入合并逻辑
export const calculateAllDEX = (positions, currentBalance, contractValue) => {
  // DEX计算需要考虑所有仓位信息，返回每个仓位对应的DEX值
  const activePositions = positions.filter(p => p.status !== 'closed');

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
    if (isPositionClosed(pos)) return pos;
    
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
export const recalculateAllPositions = (props) => {
  const {
    positions, currentPrice, contractValue, feeRate,
    maintenanceMarginRate, currentBalance, addToLog,
    currentUser, currentDateTime, isAutoRefresh = false
  } = props;

  if (!isAutoRefresh) {
    addToLog(`--- 重新计算所有仓位 ---`);
    addToLog(`用户: ${currentUser}`);
    addToLog(`时间: ${currentDateTime} (UTC)`);
  }

  // 重新计算所有仓位的基础值：仓位价值、保证金、手续费、维持保证金和未实现盈亏
  let updatedPositions = positions.map(pos => {
    if (isPositionClosed(pos)) return pos;

    return calculatePositionValues(
        pos, currentPrice, contractValue, feeRate, maintenanceMarginRate
    );
  });

  // 计算所有仓位的DEX(会进行同交易对全仓仓位合并)
  if (!isAutoRefresh) {
    addToLog(`--- 更新所有仓位DEX ---`);

    // 在计算前显示合并计算过程
    const crossPositions = updatedPositions.filter(p => p.marginType === 'cross' && !isPositionClosed(p));
    const crossSymbols = [...new Set(crossPositions.map(p => p.symbol))];

    // 对每个有多个全仓仓位的交易对显示合并计算过程
    crossSymbols.forEach(symbol => {
      const positionsForSymbol = crossPositions.filter(p => p.symbol === symbol);
      if (positionsForSymbol.length > 1) {
        logMergedPositionCalculation(positionsForSymbol, addToLog,contractValue);
      }
    });
  }

  const positionsWithDex = calculateAllDEX(updatedPositions, currentBalance, contractValue);

  // 基于更新的DEX计算爆仓价
  if (!isAutoRefresh) {
    addToLog(`--- 计算爆仓价格 ---`);
  }

  const finalPositions = calculateLiquidationPrices(positionsWithDex, contractValue);

  // 显示每个仓位的DEX和爆仓价更新
  if (!isAutoRefresh) {
    // 对于合并后的仓位也要显示DEX和爆仓价
    finalPositions.filter(p => !isPositionClosed(p)).forEach(pos => {
      const positionValue = parseFloat(pos.positionValue);

      // 如果是合并仓位特殊标记
      addToLog(`\n仓位: ${pos.symbol} ${translateDirection(pos.direction)} ${pos.quantity}张 ${pos.isMerged ? "(合并仓位)" : ""}:`);
      addToLog(`  DEX: ${pos.dex}`);

      if (pos.direction === 'long') {
        addToLog(`  多仓爆仓价计算: (${positionValue.toFixed(4)} - ${pos.dex}) ÷ (${pos.quantity} × ${contractValue}) = ${pos.liquidationPrice}`);
      } else {
        addToLog(`  空仓爆仓价计算: (${positionValue.toFixed(4)} + ${pos.dex}) ÷ (${pos.quantity} × ${contractValue}) = ${pos.liquidationPrice}`);
      }
    });
  }

  return finalPositions;
};
// 计算仓位信息
// 修改 calculateAccountInfo 函数
// 修改 calculateAccountInfo 函数
export const calculateAccountInfo = (positions, initialBalance, currentBalance) => {
  const totalMarginCross = positions.filter(p => p.marginType === 'cross' && !isPositionClosed(p)).reduce((sum, p) => sum + parseFloat(p.margin), 0);
  const totalMarginIsolated = positions.filter(p => p.marginType === 'isolated' && !isPositionClosed(p)).reduce((sum, p) => sum + parseFloat(p.margin), 0);
  const totalMargin = totalMarginCross + totalMarginIsolated;

  const totalOpenFee = positions.reduce((sum, p) => sum + parseFloat(p.openFee), 0);
  const totalCloseFee = positions.filter(p => isPositionClosed(p) && p.closeFee).reduce((sum, p) => sum + parseFloat(p.closeFee), 0);
  const totalFee = totalOpenFee + totalCloseFee;

  const totalUnrealizedPnl = positions.filter(p => !isPositionClosed(p)).reduce((sum, p) => sum + parseFloat(p.unrealizedPnl), 0);
  const totalRealizedPnl = positions.filter(p => isPositionClosed(p) && p.realizedPnl).reduce((sum, p) => sum + parseFloat(p.realizedPnl), 0);

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
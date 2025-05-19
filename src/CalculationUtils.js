/**
 * 计算工具函数
 * 包含所有与合约交易计算相关的功能
 */

// 翻译方向和保证金类型
export const translateDirection = (dir) => dir === 'long' ? '多单' : '空单';
export const translateMarginType = (type) => type === 'cross' ? '全仓' : '逐仓';

// 计算未实现盈亏
export const calculateUnrealizedPnL = (pos, contractValue) => {
  if (isPositionClosed(pos)) return "0.00";

  const delta = pos.direction === 'long'
      ? pos.currentPrice - pos.entryPrice
      : pos.entryPrice - pos.currentPrice;

  return (delta * pos.quantity * contractValue).toFixed(2);
};

// 计算仓位基础值
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

// 修改计算DEX函数，区分全仓和逐仓DEX计算逻辑
export const calculateAllDEX = (positions, currentBalance, contractValue) => {
  // 过滤有效仓位
  const activePositions = positions.filter(p => !isPositionClosed(p));

  // 分离全仓和逐仓仓位
  const crossPositions = activePositions.filter(p => p.marginType === 'cross');
  const isolatedPositions = activePositions.filter(p => p.marginType === 'isolated');

  // 创建一个结果数组
  const result = [];

  // 按交易对分组全仓仓位以确保同一交易对使用相同的DEX计算
  const crossSymbolGroups = {};
  crossPositions.forEach(pos => {
    if (!crossSymbolGroups[pos.symbol]) {
      crossSymbolGroups[pos.symbol] = [];
    }
    crossSymbolGroups[pos.symbol].push(pos);
  });

  // 计算全仓仓位的DEX
  if (crossPositions.length > 0) {
    // 计算全局数据
    const totalMaintenanceMargin = activePositions.reduce(
        (sum, p) => sum + parseFloat(p.maintenanceMargin || 0), 0);
    const totalOpenFees = activePositions.reduce(
        (sum, p) => sum + parseFloat(p.openFee || 0), 0);
    const totalIsolatedMargin = isolatedPositions.reduce(
        (sum, p) => sum + parseFloat(p.margin || 0), 0);

    // 处理每个交易对组
    Object.keys(crossSymbolGroups).forEach(symbol => {
      const positionsForSymbol = crossSymbolGroups[symbol];

      // 计算除此交易对外其他仓位的未实现盈亏
      const otherPositionsUnrealizedPnl = activePositions.reduce((sum, p) => {
        if (p.symbol !== symbol) {
          return sum + parseFloat(p.unrealizedPnl || 0);
        }
        return sum;
      }, 0);

      // 计算全仓DEX
      const crossDex = currentBalance - totalMaintenanceMargin - totalOpenFees - totalIsolatedMargin + otherPositionsUnrealizedPnl;

      // 将DEX应用到此交易对的所有全仓仓位
      positionsForSymbol.forEach(pos => {
        result.push({
          ...pos,
          dex: crossDex.toFixed(2)
        });
      });
    });
  }

  // 计算逐仓仓位的DEX
  isolatedPositions.forEach(pos => {
    // 逐仓DEX = 仓位保证金 - 仓位维持保证金 - 仓位手续费
    const isolatedDex = parseFloat(pos.margin) -
        parseFloat(pos.maintenanceMargin) -
        parseFloat(pos.openFee);

    result.push({
      ...pos,
      dex: isolatedDex.toFixed(2)
    });
  });

  // 添加已关闭的仓位（无需计算DEX）
  positions.filter(isPositionClosed).forEach(pos => {
    result.push(pos);
  });

  return result;
};

// 修改爆仓价计算函数，确保同一交易对的全仓仓位爆仓价一致
export const calculateLiquidationPrices = (positionsWithDex, contractValue) => {
  // 按交易对分组全仓仓位
  const crossSymbolGroups = {};
  positionsWithDex.filter(p => p.marginType === 'cross' && !isPositionClosed(p)).forEach(pos => {
    if (!crossSymbolGroups[pos.symbol]) {
      crossSymbolGroups[pos.symbol] = [];
    }
    crossSymbolGroups[pos.symbol].push(pos);
  });

  // 计算每组全仓的统一爆仓价
  Object.keys(crossSymbolGroups).forEach(symbol => {
    const positions = crossSymbolGroups[symbol];
    if (positions.length === 0) return;

    // 如果是合并后的仓位，使用该仓位计算爆仓价
    const mergedPos = positions.find(p => p.isMerged);
    let liquidationPrice;

    if (mergedPos) {
      // 使用合并仓位计算爆仓价
      const positionValue = parseFloat(mergedPos.positionValue);
      const dex = parseFloat(mergedPos.dex);

      if (mergedPos.direction === 'long') {
        liquidationPrice = (positionValue - dex) / (mergedPos.quantity * contractValue);
      } else {
        liquidationPrice = (positionValue + dex) / (mergedPos.quantity * contractValue);
      }

      // 将相同的爆仓价应用于所有相关仓位
      const formattedPrice = liquidationPrice.toFixed(4);
      positions.forEach(pos => {
        pos.liquidationPrice = formattedPrice;
      });
    }
    // 如果没有合并仓位但有多个仓位，需要单独合并计算
    else if (positions.length > 1) {
      // 分离多空仓位并计算总量
      let longQuantity = 0, shortQuantity = 0;
      let longValue = 0, shortValue = 0;

      positions.forEach(pos => {
        if (pos.direction === 'long') {
          longQuantity += parseFloat(pos.quantity);
          longValue += parseFloat(pos.positionValue);
        } else {
          shortQuantity += parseFloat(pos.quantity);
          shortValue += parseFloat(pos.positionValue);
        }
      });

      // 计算净仓位和方向
      const netQuantity = longQuantity - shortQuantity;
      const netDirection = netQuantity > 0 ? 'long' : 'short';
      const absNetQuantity = Math.abs(netQuantity);
      const dex = parseFloat(positions[0].dex); // 所有仓位DEX相同，取第一个

      if (netDirection === 'long') {
        // 净多仓
        const netPositionValue = longValue - shortValue;
        liquidationPrice = (netPositionValue - dex) / (absNetQuantity * contractValue);
      } else {
        // 净空仓
        const netPositionValue = shortValue - longValue;
        liquidationPrice = (netPositionValue + dex) / (absNetQuantity * contractValue);
      }

      // 将统一爆仓价应用于所有仓位
      const formattedPrice = liquidationPrice.toFixed(4);
      positions.forEach(pos => {
        pos.liquidationPrice = formattedPrice;
      });
    }
    // 只有一个仓位的情况
    else {
      const pos = positions[0];
      const positionValue = parseFloat(pos.positionValue);
      const dex = parseFloat(pos.dex);

      if (pos.direction === 'long') {
        liquidationPrice = (positionValue - dex) / (pos.quantity * contractValue);
      } else {
        liquidationPrice = (positionValue + dex) / (pos.quantity * contractValue);
      }

      pos.liquidationPrice = liquidationPrice.toFixed(4);
    }
  });

  // 处理逐仓仓位的爆仓价
  positionsWithDex.filter(p => p.marginType === 'isolated' && !isPositionClosed(p)).forEach(pos => {
    const positionValue = parseFloat(pos.positionValue);
    const dex = parseFloat(pos.dex);
    let liquidationPrice;

    if (pos.direction === 'long') {
      liquidationPrice = (positionValue - dex) / (pos.quantity * contractValue);
    } else {
      liquidationPrice = (positionValue + dex) / (pos.quantity * contractValue);
    }

    pos.liquidationPrice = liquidationPrice.toFixed(4);
  });

  return positionsWithDex;
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

  // 计算所有仓位的DEX
  if (!isAutoRefresh) {
    addToLog(`--- 更新所有仓位DEX ---`);

    // 在计算前显示合并计算过程
    const crossPositions = updatedPositions.filter(p => p.marginType === 'cross' && !isPositionClosed(p));
    const crossSymbols = [...new Set(crossPositions.map(p => p.symbol))];

    // 对每个有多个全仓仓位的交易对显示合并计算过程
    crossSymbols.forEach(symbol => {
      const positionsForSymbol = crossPositions.filter(p => p.symbol === symbol);
      if (positionsForSymbol.length > 1) {
        logMergedPositionCalculation(positionsForSymbol, addToLog, contractValue);
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
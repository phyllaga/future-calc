/**
 * 日志工具函数
 * 包含所有与日志记录相关的功能
 */
import { translateDirection } from './CalculationUtils';

// 记录余额变更历史

// 添加记录合并仓位计算过程的函数
export const logMergedPositionCalculation = (positions, addToLog,contractValue) => {
  const crossPositions = positions.filter(p => p.marginType === 'cross' && !p.closed);

  // 按交易对分组
  const symbolGroups = {};
  crossPositions.forEach(pos => {
    if (!symbolGroups[pos.symbol]) {
      symbolGroups[pos.symbol] = [];
    }
    symbolGroups[pos.symbol].push(pos);
  });

  // 处理每个有多个仓位的交易对
  Object.keys(symbolGroups).forEach(symbol => {
    const positions = symbolGroups[symbol];
    if (positions.length <= 1) return;

    addToLog(`\n--- ${symbol} 全仓仓位合并计算 ---`);

    // 分离多空仓位并计算总量
    let longQuantity = 0;
    let longValue = 0;
    let shortQuantity = 0;
    let shortValue = 0;

    positions.forEach((pos, idx) => {
      if (pos.direction === 'long') {
        addToLog(`[多仓 ${idx+1}] ${pos.quantity}张 × ${pos.entryPrice} × ${contractValue} = ${(pos.quantity * pos.entryPrice * contractValue).toFixed(4)}`);
        longQuantity += parseFloat(pos.quantity);
        longValue += parseFloat(pos.quantity) * parseFloat(pos.entryPrice) * contractValue;
      } else {
        addToLog(`[空仓 ${idx+1}] ${pos.quantity}张 × ${pos.entryPrice} × ${contractValue} = ${(pos.quantity * pos.entryPrice * contractValue).toFixed(4)}`);
        shortQuantity += parseFloat(pos.quantity);
        shortValue += parseFloat(pos.quantity) * parseFloat(pos.entryPrice) * contractValue;
      }
    });

    addToLog(`\n多仓总量: ${longQuantity}张, 价值: ${longValue.toFixed(4)}`);
    addToLog(`空仓总量: ${shortQuantity}张, 价值: ${shortValue.toFixed(4)}`);

    // 计算净仓位
    const netQuantity = longQuantity - shortQuantity;
    addToLog(`净仓位: ${netQuantity}张 (${netQuantity > 0 ? "多" : "空"}方向)`);

    if (Math.abs(netQuantity) < 0.00001) {
      addToLog(`多空仓位抵消，净仓位为0，无需计算DEX和爆仓价`);
      return;
    }

    // 确定方向和计算均价
    const direction = netQuantity > 0 ? 'long' : 'short';
    let avgEntryPrice;

    if (direction === 'long') {
      // 多仓占优，计算均价
      avgEntryPrice = (longValue - shortValue) / netQuantity;
      addToLog(`\n合并后计算公式: (多仓价值 - 空仓价值) ÷ 净多仓量`);
      addToLog(`计算过程: (${longValue.toFixed(4)} - ${shortValue.toFixed(4)}) ÷ ${netQuantity}`);
      addToLog(`= ${(longValue - shortValue).toFixed(4)} ÷ ${netQuantity}`);
      addToLog(`= ${avgEntryPrice.toFixed(4)}`);
    } else {
      // 空仓占优，计算均价
      avgEntryPrice = (shortValue - longValue) / Math.abs(netQuantity);
      addToLog(`\n合并后计算公式: (空仓价值 - 多仓价值) ÷ 净空仓量`);
      addToLog(`计算过程: (${shortValue.toFixed(4)} - ${longValue.toFixed(4)}) ÷ ${Math.abs(netQuantity)}`);
      addToLog(`= ${(shortValue - longValue).toFixed(4)} ÷ ${Math.abs(netQuantity)}`);
      addToLog(`= ${avgEntryPrice.toFixed(4)}`);
    }

    addToLog(`\n合并后仓位: ${Math.abs(netQuantity)}张 ${direction === 'long' ? "多单" : "空单"} @${avgEntryPrice.toFixed(4)}`);

    // 计算保证金总和
    const totalMargin = positions.reduce((sum, pos) => sum + parseFloat(pos.margin), 0);
    addToLog(`保证金总和: ${totalMargin.toFixed(2)}`);

    // 计算仓位价值和杠杆
    const positionValue = Math.abs(netQuantity) * avgEntryPrice;
    const leverage = positionValue / totalMargin;
    addToLog(`仓位价值: ${positionValue.toFixed(4)}`);
    addToLog(`实际杠杆: ${leverage.toFixed(2)}x`);
  });
};

// 记录余额变更历史
export const logBalanceHistory = (positions, initialBalance, currentBalance, addToLog) => {
  addToLog(`--- 余额变更历史 ---`);
  addToLog(`初始余额: ${initialBalance.toFixed(2)}`);

  // 查找所有已平仓的仓位
  const closedPositions = positions.filter(p => p.closed);

  if (closedPositions.length > 0) {
    let runningBalance = initialBalance;

    closedPositions.forEach((pos, index) => {
      const posRealizedPnl = parseFloat(pos.realizedPnl);
      const posOpenFee = parseFloat(pos.openFee);
      const posCloseFee = parseFloat(pos.closeFee);

      // 详细展示这笔交易对余额的影响
      addToLog(`\n[${index + 1}] ${pos.symbol} ${translateDirection(pos.direction)} ${pos.quantity}张`);
      addToLog(`  开仓价: ${pos.entryPrice} → 平仓价: ${pos.closePrice}`);
      addToLog(`  已实现盈亏: ${posRealizedPnl >= 0 ? '+' : ''}${posRealizedPnl.toFixed(2)}`);
      addToLog(`  开仓手续费: -${posOpenFee.toFixed(4)}`);
      addToLog(`  平仓手续费: -${posCloseFee.toFixed(4)}`);

      // 计算影响
      const totalFees = posOpenFee + posCloseFee;
      const netImpact = posRealizedPnl - totalFees;

      addToLog(`  --- 余额计算过程 ---`);
      addToLog(`  交易前余额: ${runningBalance.toFixed(2)}`);
      addToLog(`  计算公式: 交易前余额 + 已实现盈亏 - 总手续费`);
      addToLog(`  计算过程: ${runningBalance.toFixed(2)} + ${posRealizedPnl.toFixed(2)} - ${totalFees.toFixed(4)}`);

      // 更新运行中的余额
      runningBalance = runningBalance + netImpact;

      addToLog(`  = ${runningBalance.toFixed(2)}`);
      addToLog(`  交易后余额: ${runningBalance.toFixed(2)}`);
    });

    // 确认最终余额
    if (Math.abs(runningBalance - currentBalance) < 0.0001) {
      addToLog(`\n最终余额: ${currentBalance.toFixed(2)} (计算正确)`);
    } else {
      addToLog(`\n最终余额: ${currentBalance.toFixed(2)}`);
      addToLog(`计算所得余额: ${runningBalance.toFixed(2)}`);
      addToLog(`注意: 最终余额与计算所得余额有差异，可能存在其他因素影响`);
    }
  } else {
    addToLog(`尚无平仓记录，当前余额与初始余额相同: ${currentBalance.toFixed(2)}`);
  }
};

// DEX计算过程日志记录
export const logDEXCalculation = (pos, positions, currentBalance, addToLog,contractValue) => {
  // 先检查是否为合并仓位，如果是则先显示合并计算过程
  if (pos.isMerged) {
    addToLog(`--- 该仓位是合并仓位，先展示合并计算过程 ---`);
    logMergedPositionCalculation([...pos.mergeInfo.originalPositions], addToLog,contractValue);
    addToLog(`\n--- 使用合并后的仓位计算DEX ---`);
  }

  addToLog(`DEX计算公式：余额 - 维持保证金之和 - 手续费之和 - 逐仓保证金之和 + 除本交易对以外其他仓位的未实现盈亏之和`);

  // 合并仓位后的活跃仓位列表
  const mergedPositions = mergePositionsBySymbol(positions);
  const activePositions = mergedPositions.filter(p => !p.closed);

  // 计算总的维持保证金
  const totalMaintenanceMargin = activePositions.reduce(
      (sum, p) => sum + parseFloat(p.maintenanceMargin || 0), 0);
  addToLog(`维持保证金之和：${totalMaintenanceMargin.toFixed(4)}`);

  // 计算总手续费
  const totalFees = activePositions.reduce(
      (sum, p) => sum + parseFloat(p.openFee || 0), 0);
  addToLog(`手续费之和：${totalFees.toFixed(4)}`);

  // 计算总逐仓保证金
  const totalIsolatedMargin = activePositions
      .filter(p => p.marginType === 'isolated')
      .reduce((sum, p) => sum + parseFloat(p.margin || 0), 0);
  addToLog(`逐仓保证金之和：${totalIsolatedMargin.toFixed(2)}`);

  // 计算除本仓位外其他仓位的未实现盈亏
  const otherPositionsUnrealizedPnl = activePositions.reduce((sum, p) => {
    if (p !== pos) {
      addToLog(`  ${p.symbol} ${translateDirection(p.direction)} ${p.quantity}张 未实现盈亏: ${p.unrealizedPnl}`);
      return sum + parseFloat(p.unrealizedPnl || 0);
    }
    return sum;
  }, 0);
  addToLog(`除本交易对以外其他仓位的未实现盈亏之和：${otherPositionsUnrealizedPnl.toFixed(2)}`);

  // 当前仓位的DEX
  const dex = currentBalance - totalMaintenanceMargin - totalFees - totalIsolatedMargin + otherPositionsUnrealizedPnl;

  addToLog(`计算过程：${currentBalance} - ${totalMaintenanceMargin.toFixed(4)} - ${totalFees.toFixed(4)} - ${totalIsolatedMargin.toFixed(2)} + ${otherPositionsUnrealizedPnl.toFixed(2)}`);
  addToLog(`= ${(currentBalance - totalMaintenanceMargin - totalFees - totalIsolatedMargin).toFixed(4)} + ${otherPositionsUnrealizedPnl.toFixed(2)}`);
  addToLog(`= ${dex.toFixed(4)}`);

  return dex;
};

// 记录各种计算
export const logCalculation = (type, pos, currentPrice, contractValue, feeRate, maintenanceMarginRate, positions, addToLog, currentUser, currentDateTime) => {
  addToLog(`用户: ${currentUser}`);
  addToLog(`时间: ${currentDateTime} (UTC)`);

  if (type === 'unrealizedPnl') {
    if (pos.closed) {
      addToLog(`该仓位已平仓，未实现盈亏为0`);
    } else {
      const formula = pos.direction === 'long' ? '(当前价 - 开仓价)' : '(开仓价 - 当前价)';
      const delta = pos.direction === 'long'
          ? currentPrice - pos.entryPrice
          : pos.entryPrice - currentPrice;

      addToLog(`未实现盈亏计算公式：${formula} × 数量 × 合约面值`);
      addToLog(`计算过程：${pos.direction === 'long' ? `(${currentPrice} - ${pos.entryPrice})` : `(${pos.entryPrice} - ${currentPrice})`} × ${pos.quantity} × ${contractValue}`);
      addToLog(`= ${delta.toFixed(4)} × ${pos.quantity} × ${contractValue}`);
      addToLog(`= ${pos.unrealizedPnl}`);
    }
  } else if (type === 'realizedPnl') {
    if (!pos.closed || pos.realizedPnl === null) {
      addToLog(`该仓位尚未平仓，暂无已实现盈亏`);
    } else {
      const formula = pos.direction === 'long' ? '(平仓价 - 开仓价)' : '(开仓价 - 平仓价)';
      const delta = pos.direction === 'long'
          ? pos.closePrice - pos.entryPrice
          : pos.entryPrice - pos.closePrice;

      addToLog(`已实现盈亏计算公式：${formula} × 数量 × 合约面值`);
      addToLog(`计算过程：${pos.direction === 'long' ? `(${pos.closePrice} - ${pos.entryPrice})` : `(${pos.entryPrice} - ${pos.closePrice})`} × ${pos.quantity} × ${contractValue}`);
      addToLog(`= ${delta.toFixed(4)} × ${pos.quantity} × ${contractValue}`);
      addToLog(`= ${pos.realizedPnl}`);
    }
  } else if (type === 'liq') {
    if (pos.closed) {
      addToLog(`该仓位已平仓，无爆仓价格`);
      return;
    }

    const positionValue = parseFloat(pos.positionValue);
    const dex = parseFloat(pos.dex);

    if (pos.direction === 'long') {
      addToLog(`多仓爆仓价计算公式：(仓位价值 - DEX) ÷ (持仓张数 × 面值)`);
      addToLog(`计算过程：(${positionValue.toFixed(4)} - ${dex.toFixed(4)}) ÷ (${pos.quantity} × ${contractValue})`);
      addToLog(`= ${(positionValue - dex).toFixed(4)} ÷ ${(pos.quantity * contractValue).toFixed(4)}`);
      addToLog(`= ${pos.liquidationPrice}`);
    } else {
      addToLog(`空仓爆仓价计算公式：(仓位价值 + DEX) ÷ (持仓张数 × 面值)`);
      addToLog(`计算过程：(${positionValue.toFixed(4)} + ${dex.toFixed(4)}) ÷ (${pos.quantity} × ${contractValue})`);
      addToLog(`= ${(positionValue + dex).toFixed(4)} ÷ ${(pos.quantity * contractValue).toFixed(4)}`);
      addToLog(`= ${pos.liquidationPrice}`);
    }
  } else if (type === 'margin') {
    const positionValue = pos.quantity * contractValue * pos.entryPrice;

    addToLog(`保证金计算公式：仓位价值 ÷ 杠杆`);
    addToLog(`计算过程：${positionValue.toFixed(4)} ÷ ${pos.leverage} = ${pos.margin}`);
  } else if (type === 'maintenanceMargin') {
    addToLog(`维持保证金计算公式：持仓张数 × 开仓均价 × 面值 × 维持保证金率`);
    addToLog(`计算过程：${pos.quantity} × ${pos.entryPrice} × ${contractValue} × ${maintenanceMarginRate} = ${pos.maintenanceMargin}`);
  } else if (type === 'openFee') {
    const positionValue = pos.quantity * contractValue * pos.entryPrice;

    addToLog(`开仓手续费计算公式：仓位价值 × 手续费率`);
    addToLog(`计算过程：${positionValue.toFixed(4)} × ${feeRate} = ${pos.openFee}`);
  } else if (type === 'closeFee') {
    if (!pos.closed) {
      addToLog(`该仓位尚未平仓，暂无平仓手续费`);
    } else {
      const closingValue = pos.quantity * contractValue * pos.closePrice;
      addToLog(`平仓手续费计算公式：仓位价值(平仓时) × 手续费率`);
      addToLog(`计算过程：${closingValue.toFixed(4)} × ${feeRate} = ${pos.closeFee}`);
    }
  } else if (type === 'positionValue') {
    addToLog(`仓位价值计算公式：数量 × 合约面值 × 开仓价`);
    addToLog(`计算过程：${pos.quantity} × ${contractValue} × ${pos.entryPrice} = ${pos.positionValue}`);
  } else if (type === 'dex') {
    // 显示DEX计算过程
    if (pos.closed) {
      addToLog(`该仓位已平仓，无DEX值`);
    } else {
      logDEXCalculation(pos, positions, currentPrice, addToLog,contractValue);
    }
  }
};

// 账户信息计算日志记录
export const logAccountMetrics = (props) => {
  const {
    positions, initialBalance, currentBalance, currentUser, currentDateTime,
    totalMarginCross, totalMarginIsolated, totalMargin, totalOpenFee,
    totalCloseFee, totalFee, totalUnrealizedPnl, totalRealizedPnl,
    availableBalance, contractValue, addToLog, logBalanceHistoryFn
  } = props;

  addToLog(`--- 账户指标计算 ---`);
  addToLog(`用户: ${currentUser}`);
  addToLog(`时间: ${currentDateTime} (UTC)`);

  const activePositions = positions.filter(p => !p.closed);
  const closedPositions = positions.filter(p => p.closed);

  addToLog(`初始余额: ${initialBalance.toFixed(2)}`);
  addToLog(`当前余额: ${currentBalance.toFixed(2)}`);

  addToLog(`全仓仓位数: ${activePositions.filter(p => p.marginType === 'cross').length}`);
  addToLog(`逐仓仓位数: ${activePositions.filter(p => p.marginType === 'isolated').length}`);

  // 全仓保证金详细计算
  if (activePositions.filter(p => p.marginType === 'cross').length > 0) {
    addToLog(`全仓保证金计算公式：仓位1保证金 + 仓位2保证金 + ... + 仓位n保证金`);
    const crossMarginDetails = activePositions
        .filter(p => p.marginType === 'cross')
        .map(p => `${p.symbol} ${translateDirection(p.direction)} ${p.quantity}张: ${p.margin}`);
    addToLog(`全仓保证金明细: ${crossMarginDetails.join(', ')}`);
    addToLog(`计算过程：${activePositions.filter(p => p.marginType === 'cross').map(p => p.margin).join(' + ')} = ${totalMarginCross.toFixed(2)}`);
  } else {
    addToLog(`全仓保证金: 0`);
  }

  // 逐仓保证金详细计算
  if (activePositions.filter(p => p.marginType === 'isolated').length > 0) {
    addToLog(`逐仓保证金计算公式：仓位1保证金 + 仓位2保证金 + ... + 仓位n保证金`);
    const isolatedMarginDetails = activePositions
        .filter(p => p.marginType === 'isolated')
        .map(p => `${p.symbol} ${translateDirection(p.direction)} ${p.quantity}张: ${p.margin}`);
    addToLog(`逐仓保证金明细: ${isolatedMarginDetails.join(', ')}`);
    addToLog(`计算过程：${activePositions.filter(p => p.marginType === 'isolated').map(p => p.margin).join(' + ')} = ${totalMarginIsolated.toFixed(2)}`);
  } else {
    addToLog(`逐仓保证金: 0`);
  }

  // 开仓手续费详细计算
  if (activePositions.length > 0) {
    addToLog(`开仓手续费总和计算公式：仓位1开仓手续费 + 仓位2开仓手续费 + ... + 仓位n开仓手续费`);
    const openFeeDetails = activePositions.map(p => `${p.symbol} ${translateDirection(p.direction)} ${p.quantity}张: ${p.openFee}`);
    addToLog(`开仓手续费明细: ${openFeeDetails.join(', ')}`);
    addToLog(`计算过程：${activePositions.map(p => p.openFee).join(' + ')} = ${totalOpenFee.toFixed(4)}`);

    // 未实现盈亏详细计算
    addToLog(`未实现盈亏总和计算公式：仓位1未实现盈亏 + 仓位2未实现盈亏 + ... + 仓位n未实现盈亏`);
    const unrealizedPnlDetails = activePositions.map(p => `${p.symbol} ${translateDirection(p.direction)} ${p.quantity}张: ${p.unrealizedPnl}`);
    addToLog(`未实现盈亏明细: ${unrealizedPnlDetails.join(', ')}`);
    addToLog(`计算过程：${activePositions.map(p => p.unrealizedPnl).join(' + ')} = ${totalUnrealizedPnl.toFixed(2)}`);
  } else {
    addToLog(`开仓手续费总和: 0`);
    addToLog(`未实现盈亏总和: 0`);
  }

  // 平仓手续费和已实现盈亏详细计算
  if (closedPositions.length > 0) {
    addToLog(`平仓手续费总和计算公式：仓位1平仓手续费 + 仓位2平仓手续费 + ... + 仓位n平仓手续费`);
    const closeFeeDetails = closedPositions.map(p => `${p.symbol} ${translateDirection(p.direction)} ${p.quantity}张: ${p.closeFee}`);
    addToLog(`平仓手续费明细: ${closeFeeDetails.join(', ')}`);
    addToLog(`计算过程：${closedPositions.map(p => p.closeFee).join(' + ')} = ${totalCloseFee.toFixed(4)}`);

    addToLog(`总手续费计算公式：开仓手续费总和 + 平仓手续费总和`);
    addToLog(`计算过程：${totalOpenFee.toFixed(4)} + ${totalCloseFee.toFixed(4)} = ${totalFee.toFixed(4)}`);

    addToLog(`已实现盈亏总和计算公式：仓位1已实现盈亏 + 仓位2已实现盈亏 + ... + 仓位n已实现盈亏`);
    const realizedPnlDetails = closedPositions.map(p => `${p.symbol} ${translateDirection(p.direction)} ${p.quantity}张: ${p.realizedPnl}`);
    addToLog(`已实现盈亏明细: ${realizedPnlDetails.join(', ')}`);
    addToLog(`计算过程：${closedPositions.map(p => p.realizedPnl).join(' + ')} = ${totalRealizedPnl.toFixed(2)}`);
  } else {
    addToLog(`平仓手续费总和: 0`);
    addToLog(`总手续费: ${totalOpenFee.toFixed(4)}`);
    addToLog(`已实现盈亏总和: 0`);
  }

  // 总保证金和可用资金计算
  addToLog(`总保证金占用计算公式：全仓保证金 + 逐仓保证金`);
  addToLog(`计算过程：${totalMarginCross.toFixed(2)} + ${totalMarginIsolated.toFixed(2)} = ${totalMargin.toFixed(2)}`);

  addToLog(`可用资金计算公式：当前余额 - 总保证金占用`);
  addToLog(`计算过程：${currentBalance.toFixed(2)} - ${totalMargin.toFixed(2)} = ${availableBalance.toFixed(2)}`);

  // 如果有余额变更历史，也记录
  if (closedPositions.length > 0) {
    logBalanceHistoryFn(positions, initialBalance, currentBalance, addToLog);
  }

  // DEX计算公式展示
  addToLog(`DEX计算公式：余额 - 维持保证金之和 - 手续费之和 - 逐仓保证金之和 + 除本交易对以外其他仓位的未实现盈亏之和`);

  // 展示每个仓位的DEX值和维持保证金值
  if (activePositions.length > 0) {
    addToLog(`各仓位DEX值和维持保证金:`);
    activePositions.forEach(pos => {
      addToLog(`${pos.symbol} ${translateDirection(pos.direction)} ${pos.quantity}张:`);
      addToLog(`  维持保证金 = ${pos.maintenanceMargin}`);
      addToLog(`  DEX = ${pos.dex}`);

      const positionValue = parseFloat(pos.positionValue);
      if (pos.direction === 'long') {
        addToLog(`  多仓爆仓价计算: (${positionValue.toFixed(4)} - ${pos.dex}) ÷ (${pos.quantity} × ${contractValue}) = ${pos.liquidationPrice}`);
      } else {
        addToLog(`  空仓爆仓价计算: (${positionValue.toFixed(4)} + ${pos.dex}) ÷ (${pos.quantity} × ${contractValue}) = ${pos.liquidationPrice}`);
      }
    });
  }
};
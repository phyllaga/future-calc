import React, { useState, useEffect } from 'react';

export default function ContractFormulaCalculator() {
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [currentPrice, setCurrentPrice] = useState(20000);
  const [maintenanceMarginRate, setMaintenanceMarginRate] = useState(0.005);
  const [contractValue, setContractValue] = useState(1);
  const [initialBalance, setInitialBalance] = useState(1000);
  const [currentBalance, setCurrentBalance] = useState(1000); // 新增当前余额状态
  const [feeRate, setFeeRate] = useState(0.0004);
  const [logs, setLogs] = useState([]);

  const [entryPrice, setEntryPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [direction, setDirection] = useState('long');
  const [leverage, setLeverage] = useState(10);
  const [marginType, setMarginType] = useState('cross');
  const [positions, setPositions] = useState([]);

  // 记录计算过程到日志
  const addToLog = (message) => {
    setLogs(prev => [...prev, message]);
  };

  const createPosition = () => {
    if (!entryPrice || !quantity) return;
    
    const ep = parseFloat(entryPrice);
    const qty = parseFloat(quantity);
    
    // 详细记录计算过程
    addToLog(`--- 创建新仓位 ---`);
    
    const positionValue = qty * contractValue * ep;
    addToLog(`仓位价值 = 数量 × 合约面值 × 开仓价 = ${qty} × ${contractValue} × ${ep} = ${positionValue.toFixed(4)}`);
    
    const margin = positionValue / leverage;
    addToLog(`保证金 = 仓位价值 ÷ 杠杆 = ${positionValue.toFixed(4)} ÷ ${leverage} = ${margin.toFixed(4)}`);
    
    const fee = positionValue * feeRate;
    addToLog(`手续费 = 仓位价值 × 手续费率 = ${positionValue.toFixed(4)} × ${feeRate} = ${fee.toFixed(4)}`);
    
    const maintenanceMargin = positionValue * maintenanceMarginRate;
    addToLog(`维持保证金 = 仓位价值 × 维持保证金率 = ${positionValue.toFixed(4)} × ${maintenanceMarginRate} = ${maintenanceMargin.toFixed(4)}`);
    
    // 使用当前余额而不是初始余额
    const dex = currentBalance - maintenanceMargin - fee;
    addToLog(`可用余额(DEX) = 当前余额 - 维持保证金 - 手续费 = ${currentBalance} - ${maintenanceMargin.toFixed(4)} - ${fee.toFixed(4)} = ${dex.toFixed(4)}`);
    
    // 从当前余额中扣除margin和fee
    const newBalance = currentBalance - margin - fee;
    addToLog(`扣除保证金和手续费后的余额 = ${currentBalance} - ${margin.toFixed(4)} - ${fee.toFixed(4)} = ${newBalance.toFixed(4)}`);
    setCurrentBalance(newBalance);
    
    let liquidationPrice;
    if (marginType === 'isolated') {
      if (direction === 'long') {
        liquidationPrice = ((maintenanceMargin - (margin - fee)) + positionValue) / (qty * contractValue);
        addToLog(`逐仓多单爆仓价 = (维持保证金 - (保证金 - 手续费) + 仓位价值) ÷ (数量 × 合约面值)`);
        addToLog(`= (${maintenanceMargin.toFixed(4)} - (${margin.toFixed(4)} - ${fee.toFixed(4)}) + ${positionValue.toFixed(4)}) ÷ (${qty} × ${contractValue})`);
        addToLog(`= ${liquidationPrice.toFixed(4)}`);
      } else {
        liquidationPrice = (((margin - fee) - maintenanceMargin + positionValue) / (qty * contractValue));
        addToLog(`逐仓空单爆仓价 = ((保证金 - 手续费) - 维持保证金 + 仓位价值) ÷ (数量 × 合约面值)`);
        addToLog(`= ((${margin.toFixed(4)} - ${fee.toFixed(4)}) - ${maintenanceMargin.toFixed(4)} + ${positionValue.toFixed(4)}) ÷ (${qty} × ${contractValue})`);
        addToLog(`= ${liquidationPrice.toFixed(4)}`);
      }
    } else {
      if (direction === 'long') {
        liquidationPrice = ((positionValue - dex) / (qty * contractValue));
        addToLog(`全仓多单爆仓价 = (仓位价值 - 可用余额) ÷ (数量 × 合约面值)`);
        addToLog(`= (${positionValue.toFixed(4)} - ${dex.toFixed(4)}) ÷ (${qty} × ${contractValue})`);
        addToLog(`= ${liquidationPrice.toFixed(4)}`);
      } else {
        liquidationPrice = ((positionValue + dex) / (qty * contractValue));
        addToLog(`全仓空单爆仓价 = (仓位价值 + 可用余额) ÷ (数量 × 合约面值)`);
        addToLog(`= (${positionValue.toFixed(4)} + ${dex.toFixed(4)}) ÷ (${qty} × ${contractValue})`);
        addToLog(`= ${liquidationPrice.toFixed(4)}`);
      }
    }
    
    liquidationPrice = liquidationPrice.toFixed(4);
    
    const pnl = calculatePnLWithLog(ep, currentPrice, qty, direction);
    
    const pos = {
      symbol,
      direction,
      entryPrice: ep,
      quantity: qty,
      currentPrice,
      leverage,
      marginType,
      closed: false,
      positionValue: positionValue.toFixed(4),
      margin: margin.toFixed(2),
      fee: fee.toFixed(2),
      maintenanceMargin: maintenanceMargin.toFixed(2),
      dex: dex.toFixed(2),
      liquidationPrice,
      pnl,
      createdAt: new Date().toISOString(),
    };
    
    setPositions([...positions, pos]);
    addToLog(`仓位创建成功: ${symbol} ${translateDirection(direction)} ${qty}张 @${ep}，当前余额=${newBalance.toFixed(2)}`);
  };

  const calculatePnL = (ep, mp, qty, dir) => {
    const delta = dir === 'long' ? mp - ep : ep - mp;
    return (delta * qty * contractValue).toFixed(2);
  };
  
  const calculatePnLWithLog = (ep, mp, qty, dir) => {
    const delta = dir === 'long' ? mp - ep : ep - mp;
    const pnl = (delta * qty * contractValue).toFixed(2);
    
    addToLog(`盈亏计算 = ${dir === 'long' ? '(当前价 - 开仓价)' : '(开仓价 - 当前价)'} × 数量 × 合约面值`);
    addToLog(`= ${dir === 'long' ? `(${mp} - ${ep})` : `(${ep} - ${mp})`} × ${qty} × ${contractValue}`);
    addToLog(`= ${delta.toFixed(4)} × ${qty} × ${contractValue} = ${pnl}`);
    
    return pnl;
  };

  const recalculateAllPositions = () => {
    addToLog(`--- 重新计算所有仓位 ---`);
    
    setPositions(positions.map(pos => {
      addToLog(`重新计算仓位: ${pos.symbol} ${translateDirection(pos.direction)} ${pos.quantity}张 @${pos.entryPrice}`);
      
      const positionValue = pos.quantity * contractValue * pos.entryPrice;
      addToLog(`仓位价值 = ${pos.quantity} × ${contractValue} × ${pos.entryPrice} = ${positionValue.toFixed(4)}`);
      
      const margin = positionValue / pos.leverage;
      addToLog(`保证金 = ${positionValue.toFixed(4)} ÷ ${pos.leverage} = ${margin.toFixed(4)}`);
      
      const fee = positionValue * feeRate;
      addToLog(`手续费 = ${positionValue.toFixed(4)} × ${feeRate} = ${fee.toFixed(4)}`);
      
      const maintenanceMargin = positionValue * maintenanceMarginRate;
      addToLog(`维持保证金 = ${positionValue.toFixed(4)} × ${maintenanceMarginRate} = ${maintenanceMargin.toFixed(4)}`);
      
      // 使用当前余额
      const dex = currentBalance - maintenanceMargin - fee;
      addToLog(`可用余额(DEX) = ${currentBalance} - ${maintenanceMargin.toFixed(4)} - ${fee.toFixed(4)} = ${dex.toFixed(4)}`);
      
      let liquidationPrice;
      if (pos.marginType === 'isolated') {
        if (pos.direction === 'long') {
          liquidationPrice = ((maintenanceMargin - (margin - fee)) + positionValue) / (pos.quantity * contractValue);
          addToLog(`逐仓多单爆仓价 = (${maintenanceMargin.toFixed(4)} - (${margin.toFixed(4)} - ${fee.toFixed(4)}) + ${positionValue.toFixed(4)}) ÷ (${pos.quantity} × ${contractValue}) = ${liquidationPrice.toFixed(4)}`);
        } else {
          liquidationPrice = (((margin - fee) - maintenanceMargin + positionValue) / (pos.quantity * contractValue));
          addToLog(`逐仓空单爆仓价 = ((${margin.toFixed(4)} - ${fee.toFixed(4)}) - ${maintenanceMargin.toFixed(4)} + ${positionValue.toFixed(4)}) ÷ (${pos.quantity} × ${contractValue}) = ${liquidationPrice.toFixed(4)}`);
        }
      } else {
        if (pos.direction === 'long') {
          liquidationPrice = ((positionValue - dex) / (pos.quantity * contractValue));
          addToLog(`全仓多单爆仓价 = (${positionValue.toFixed(4)} - ${dex.toFixed(4)}) ÷ (${pos.quantity} × ${contractValue}) = ${liquidationPrice.toFixed(4)}`);
        } else {
          liquidationPrice = ((positionValue + dex) / (pos.quantity * contractValue));
          addToLog(`全仓空单爆仓价 = (${positionValue.toFixed(4)} + ${dex.toFixed(4)}) ÷ (${pos.quantity} × ${contractValue}) = ${liquidationPrice.toFixed(4)}`);
        }
      }
      
      liquidationPrice = liquidationPrice.toFixed(4);
      
      const pnl = calculatePnL(pos.entryPrice, currentPrice, pos.quantity, pos.direction);
      addToLog(`盈亏 = ${pos.direction === 'long' ? `(${currentPrice} - ${pos.entryPrice})` : `(${pos.entryPrice} - ${currentPrice})`} × ${pos.quantity} × ${contractValue} = ${pnl}`);
      
      return {
        ...pos,
        currentPrice,
        positionValue: positionValue.toFixed(4),
        margin: margin.toFixed(2),
        fee: fee.toFixed(2),
        maintenanceMargin: maintenanceMargin.toFixed(2),
        dex: dex.toFixed(2),
        liquidationPrice,
        pnl,
      };
    }));
  };

  const closePosition = (index) => {
    const closePrice = parseFloat(prompt('请输入平仓价格', currentPrice));
    if (isNaN(closePrice)) return;
    
    const updated = [...positions];
    const pos = updated[index];
    
    // 计算平仓盈亏
    const delta = pos.direction === 'long' ? closePrice - pos.entryPrice : pos.entryPrice - closePrice;
    const pnl = delta * pos.quantity * contractValue;
    const fee = parseFloat(pos.fee); // 平仓也需要手续费
    const margin = parseFloat(pos.margin); // 平仓时返还保证金
    
    // 更新当前余额 = 当前余额 + 保证金 + 盈亏 - 平仓手续费
    const closingFee = pos.quantity * contractValue * closePrice * feeRate;
    const newBalance = currentBalance + margin + pnl - closingFee;
    
    addToLog(`--- 平仓操作 ---`);
    addToLog(`仓位: ${pos.symbol} ${translateDirection(pos.direction)} ${pos.quantity}张 @${pos.entryPrice}`);
    addToLog(`平仓价格: ${closePrice}`);
    addToLog(`盈亏计算 = ${pos.direction === 'long' ? `(平仓价 - 开仓价)` : `(开仓价 - 平仓价)`} × 数量 × 合约面值`);
    addToLog(`= ${pos.direction === 'long' ? `(${closePrice} - ${pos.entryPrice})` : `(${pos.entryPrice} - ${closePrice})`} × ${pos.quantity} × ${contractValue}`);
    addToLog(`= ${delta.toFixed(4)} × ${pos.quantity} × ${contractValue} = ${pnl.toFixed(2)}`);
    addToLog(`平仓手续费 = ${pos.quantity} × ${contractValue} × ${closePrice} × ${feeRate} = ${closingFee.toFixed(4)}`);
    addToLog(`余额变化 = 当前余额 + 保证金 + 盈亏 - 平仓手续费`);
    addToLog(`= ${currentBalance.toFixed(2)} + ${margin} + ${pnl.toFixed(2)} - ${closingFee.toFixed(4)}`);
    addToLog(`= ${newBalance.toFixed(2)}`);
    
    // 更新仓位状态
    pos.closed = true;
    pos.closePrice = closePrice;
    pos.realizedPnl = pnl.toFixed(2);
    pos.closingFee = closingFee.toFixed(4);
    pos.closedAt = new Date().toISOString();
    
    setCurrentBalance(newBalance);
    setPositions(updated);
    
    addToLog(`仓位已平仓，新余额: ${newBalance.toFixed(2)}`);
  };

  const deletePosition = (index) => {
    const posToDelete = positions[index];
    
    // 如果删除未平仓的仓位，返还保证金
    if (!posToDelete.closed) {
      const margin = parseFloat(posToDelete.margin);
      const newBalance = currentBalance + margin;
      
      addToLog(`--- 删除仓位 ---`);
      addToLog(`删除未平仓位，返还保证金: ${margin}`);
      addToLog(`新余额 = ${currentBalance.toFixed(2)} + ${margin} = ${newBalance.toFixed(2)}`);
      
      setCurrentBalance(newBalance);
    }
    
    setPositions(positions.filter((_, i) => i !== index));
    
    addToLog(`仓位已删除: ${posToDelete.symbol} ${translateDirection(posToDelete.direction)} ${posToDelete.quantity}张 @${posToDelete.entryPrice}`);
  };

  // 重置余额为初始余额
  const resetBalance = () => {
    setCurrentBalance(initialBalance);
    addToLog(`余额已重置为初始值: ${initialBalance.toFixed(2)}`);
  };

  // 原有的logCalculation函数保留，但增强功能
  const logCalculation = (type, pos) => {
    let message = '';
    if (type === 'pnl') {
      const delta = pos.direction === 'long'
        ? `${pos.currentPrice} - ${pos.entryPrice}`
        : `${pos.entryPrice} - ${pos.currentPrice}`;
      message = `盈亏计算: (${delta}) * ${pos.quantity} * ${contractValue} = ${pos.pnl}`;
    } else if (type === 'liq') {
      message = `爆仓价计算: ${
        pos.direction === 'long'
          ? `(${pos.quantity} * ${contractValue} * ${pos.entryPrice} - ${pos.dex}) / (${pos.quantity} * ${contractValue})`
          : `(${pos.quantity} * ${contractValue} * ${pos.entryPrice} + ${pos.dex}) / (${pos.quantity} * ${contractValue})`
      } = ${pos.liquidationPrice}`;
    } else if (type === 'margin') {
      const positionValue = pos.quantity * contractValue * pos.entryPrice;
      message = `保证金计算: 仓位价值 ÷ 杠杆 = ${positionValue.toFixed(4)} ÷ ${pos.leverage} = ${pos.margin}`;
    } else if (type === 'fee') {
      const positionValue = pos.quantity * contractValue * pos.entryPrice;
      message = `手续费计算: 仓位价值 × 手续费率 = ${positionValue.toFixed(4)} × ${feeRate} = ${pos.fee}`;
    } else if (type === 'positionValue') {
      message = `仓位价值计算: 数量 × 合约面值 × 开仓价 = ${pos.quantity} × ${contractValue} × ${pos.entryPrice} = ${pos.positionValue}`;
    }
    
    addToLog(message);
  };

  const clearLogs = () => setLogs([]);

  const translateDirection = (dir) => dir === 'long' ? '多单' : '空单';
  const translateMarginType = (type) => type === 'cross' ? '全仓' : '逐仓';

  const accountInfo = () => {
    const totalMarginCross = positions.filter(p => p.marginType === 'cross' && !p.closed).reduce((sum, p) => sum + parseFloat(p.margin), 0);
    const totalMarginIsolated = positions.filter(p => p.marginType === 'isolated' && !p.closed).reduce((sum, p) => sum + parseFloat(p.margin), 0);
    const totalFee = positions.filter(p => !p.closed).reduce((sum, p) => sum + parseFloat(p.fee), 0);
    const totalUnrealizedPnl = positions.filter(p => !p.closed).reduce((sum, p) => sum + parseFloat(p.pnl), 0);
    const totalRealizedPnl = positions.filter(p => p.closed && p.realizedPnl).reduce((sum, p) => sum + parseFloat(p.realizedPnl), 0);
    
    // 使用当前余额计算可用余额
    const dex = currentBalance - totalFee - totalMarginCross - totalMarginIsolated;
    const availableMargin = dex;
    
    return { 
      totalMarginCross, 
      totalMarginIsolated, 
      totalFee, 
      totalUnrealizedPnl,
      totalRealizedPnl,
      dex, 
      availableMargin 
    };
  };

  const { 
    totalMarginCross, 
    totalMarginIsolated, 
    totalFee, 
    totalUnrealizedPnl,
    totalRealizedPnl,
    dex, 
    availableMargin 
  } = accountInfo();

  // 添加账户指标计算逻辑日志函数
  const logAccountMetrics = () => {
    addToLog(`--- 账户指标计算 ---`);
    const activePositions = positions.filter(p => !p.closed);
    const closedPositions = positions.filter(p => p.closed);
    
    addToLog(`初始余额: ${initialBalance.toFixed(2)}`);
    addToLog(`当前余额: ${currentBalance.toFixed(2)}`);
    
    addToLog(`全仓仓位数: ${activePositions.filter(p => p.marginType === 'cross').length}`);
    addToLog(`逐仓仓位数: ${activePositions.filter(p => p.marginType === 'isolated').length}`);
    
    if (activePositions.filter(p => p.marginType === 'cross').length > 0) {
      addToLog(`全仓保证金计算: ${activePositions.filter(p => p.marginType === 'cross').map(p => parseFloat(p.margin)).join(' + ')} = ${totalMarginCross.toFixed(2)}`);
    } else {
      addToLog(`全仓保证金: 0`);
    }
    
    if (activePositions.filter(p => p.marginType === 'isolated').length > 0) {
      addToLog(`逐仓保证金计算: ${activePositions.filter(p => p.marginType === 'isolated').map(p => parseFloat(p.margin)).join(' + ')} = ${totalMarginIsolated.toFixed(2)}`);
    } else {
      addToLog(`逐仓保证金: 0`);
    }
    
    if (activePositions.length > 0) {
      addToLog(`手续费总和计算: ${activePositions.map(p => parseFloat(p.fee)).join(' + ')} = ${totalFee.toFixed(2)}`);
      addToLog(`未实现盈亏总和计算: ${activePositions.map(p => parseFloat(p.pnl)).join(' + ')} = ${totalUnrealizedPnl.toFixed(2)}`);
    } else {
      addToLog(`手续费总和: 0`);
      addToLog(`未实现盈亏总和: 0`);
    }
    
    if (closedPositions.length > 0) {
      addToLog(`已实现盈亏总和计算: ${closedPositions.map(p => parseFloat(p.realizedPnl || 0)).join(' + ')} = ${totalRealizedPnl.toFixed(2)}`);
    } else {
      addToLog(`已实现盈亏总和: 0`);
    }
    
    addToLog(`DEX计算: 当前余额 - 手续费总和 - 全仓保证金 - 逐仓保证金`);
    addToLog(`= ${currentBalance.toFixed(2)} - ${totalFee.toFixed(2)} - ${totalMarginCross.toFixed(2)} - ${totalMarginIsolated.toFixed(2)}`);
    addToLog(`= ${dex.toFixed(2)}`);
    
    addToLog(`可用保证金 = DEX = ${availableMargin.toFixed(2)}`);
  };

  useEffect(() => {
    recalculateAllPositions();
  }, [currentPrice, maintenanceMarginRate, feeRate]);
  
  // 初始余额更改时，保持当前余额与初始余额一致（仅用于初始设置）
  useEffect(() => {
    if (positions.length === 0) {
      setCurrentBalance(initialBalance);
    }
  }, [initialBalance]);

  return (
    <>
      {/* 顶部基础参数设置区 */}
      <div className="col-span-3 bg-gray-100 p-4 rounded mb-4">
        <div className="grid grid-cols-6 gap-4">
          <div>
            <label className="block mb-1">交易对</label>
            <input value={symbol} onChange={e => setSymbol(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block mb-1">当前价格</label>
            <input 
              type="number" 
              value={currentPrice} 
              onChange={e => setCurrentPrice(parseFloat(e.target.value))} 
              className="w-full p-2 border rounded" 
              onClick={() => addToLog(`当前价格设置为 ${currentPrice}`)}
            />
          </div>
          <div>
            <label className="block mb-1">维持保证金率</label>
            <input 
              type="number" 
              value={maintenanceMarginRate} 
              onChange={e => setMaintenanceMarginRate(parseFloat(e.target.value))} 
              className="w-full p-2 border rounded"
              onClick={() => addToLog(`维持保证金率设置为 ${maintenanceMarginRate} (${maintenanceMarginRate*100}%)`)}
            />
          </div>
          <div>
            <label className="block mb-1">合约面值</label>
            <input 
              type="number" 
              value={contractValue} 
              onChange={e => setContractValue(parseFloat(e.target.value))} 
              className="w-full p-2 border rounded" 
              placeholder="1"
              onClick={() => addToLog(`合约面值设置为 ${contractValue}`)}
            />
          </div>
          <div>
            <label className="block mb-1">初始余额</label>
            <input 
              type="number" 
              value={initialBalance} 
              onChange={e => setInitialBalance(parseFloat(e.target.value))} 
              className="w-full p-2 border rounded"
              onClick={() => addToLog(`初始余额设置为 ${initialBalance}`)}
            />
          </div>
          <div>
            <label className="block mb-1">手续费率</label>
            <input 
              type="number" 
              value={feeRate} 
              onChange={e => setFeeRate(parseFloat(e.target.value))} 
              className="w-full p-2 border rounded"
              onClick={() => addToLog(`手续费率设置为 ${feeRate} (${feeRate*100}%)`)}
            />
          </div>
        </div>
        <div className="mt-4 flex space-x-2">
          <button 
            onClick={() => {
              addToLog(`--- 触发参数更改重新计算 ---`);
              recalculateAllPositions();
            }} 
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            重新计算
          </button>
          <button 
            onClick={resetBalance} 
            className="bg-yellow-500 text-white px-4 py-2 rounded"
          >
            重置余额
          </button>
        </div>
      </div>

      {/* 仓位创建区 */}
      <div className="col-span-3 bg-white p-4 border rounded mb-4">
        <h3 className="text-lg font-bold mb-2">新增仓位</h3>
        <div className="grid grid-cols-6 gap-4">
          <div>
            <label className="block mb-1">开仓价格</label>
            <input type="number" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block mb-1">张数</label>
            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block mb-1">杠杆倍数</label>
            <input 
              type="number" 
              value={leverage} 
              onChange={e => {
                setLeverage(parseFloat(e.target.value));
                addToLog(`杠杆倍数设置为 ${e.target.value}x`);
              }} 
              className="w-full p-2 border rounded" 
            />
          </div>
          <div>
            <label className="block mb-1">方向</label>
            <select 
              value={direction} 
              onChange={e => {
                setDirection(e.target.value);
                addToLog(`交易方向设置为 ${e.target.value === 'long' ? '多单' : '空单'}`);
              }} 
              className="w-full p-2 border rounded"
            >
              <option value="long">多单</option>
              <option value="short">空单</option>
            </select>
          </div>
          <div>
            <label className="block mb-1">仓位类型</label>
            <select 
              value={marginType} 
              onChange={e => {
                setMarginType(e.target.value);
                addToLog(`保证金类型设置为 ${e.target.value === 'cross' ? '全仓' : '逐仓'}`);
              }} 
              className="w-full p-2 border rounded"
            >
              <option value="cross">全仓</option>
              <option value="isolated">逐仓</option>
            </select>
          </div>
          <div className="flex items-end">
            <button 
              onClick={createPosition} 
              className="bg-green-600 text-white px-4 py-2 rounded w-full"
              disabled={currentBalance <= 0 || !entryPrice || !quantity}
            >
              创建持仓
            </button>
          </div>
        </div>
      </div>
      
      {/* 账户信息和持仓列表 */}
      <div className="col-span-3 grid grid-cols-3 gap-4">
        <div className="col-span-1 bg-white p-4 border rounded mb-4">
          <h3 className="text-lg font-bold mb-2">账户信息</h3>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="cursor-pointer" onClick={() => addToLog(`初始余额 = ${initialBalance.toFixed(2)}`)}>
              初始余额：<span className="text-blue-500 hover:underline">{initialBalance.toFixed(2)}</span>
            </div>
            <div className="cursor-pointer" onClick={() => addToLog(`当前余额 = ${currentBalance.toFixed(2)}`)}>
              当前余额：<span className="text-blue-500 hover:underline font-bold">{currentBalance.toFixed(2)}</span>
            </div>
            <div className="cursor-pointer" onClick={() => addToLog(`逐仓保证金 = ${totalMarginIsolated.toFixed(2)}`)}>
              逐仓保证金占用：<span className="text-blue-500 hover:underline">{totalMarginIsolated.toFixed(2)}</span>
            </div>
            <div className="cursor-pointer" onClick={() => addToLog(`全仓保证金 = ${totalMarginCross.toFixed(2)}`)}>
              全仓保证金占用：<span className="text-blue-500 hover:underline">{totalMarginCross.toFixed(2)}</span>
            </div>
            <div className="cursor-pointer" onClick={() => addToLog(`手续费总和 = ${totalFee.toFixed(2)}`)}>
              手续费总和：<span className="text-blue-500 hover:underline">{totalFee.toFixed(2)}</span>
            </div>
            <div className="cursor-pointer" onClick={() => addToLog(`未实现盈亏 = ${totalUnrealizedPnl.toFixed(2)}`)}>
              未实现盈亏总和：<span className="text-blue-500 hover:underline">{totalUnrealizedPnl.toFixed(2)}</span>
            </div>
            <div className="cursor-pointer" onClick={() => addToLog(`已实现盈亏 = ${totalRealizedPnl.toFixed(2)}`)}>
              已实现盈亏总和：<span className="text-blue-500 hover:underline">{totalRealizedPnl.toFixed(2)}</span>
            </div>
            <div className="cursor-pointer" onClick={() => addToLog(`DEX = 当前余额(${currentBalance.toFixed(2)}) - 手续费(${totalFee.toFixed(2)}) - 保证金(${(totalMarginCross + totalMarginIsolated).toFixed(2)}) = ${dex.toFixed(2)}`)}>
              当前账户 DEX：<span className="text-blue-500 hover:underline">{dex.toFixed(2)}</span>
            </div>
            <div className="cursor-pointer" onClick={() => addToLog(`可开保证金 = DEX = ${availableMargin.toFixed(2)}`)}>
              当前可用保证金：<span className="text-blue-500 hover:underline">{availableMargin.toFixed(2)}</span>
            </div>
            <button onClick={logAccountMetrics} className="mt-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
              显示全部计算过程
            </button>
          </div>
        </div>

        <div className="col-span-2 bg-white p-4 border rounded">
          <h3 className="text-lg font-bold mb-4">持仓列表</h3>
          <table className="w-full text-sm border">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 border">交易对</th>
                <th className="p-2 border">方向</th>
                <th className="p-2 border">类型</th>
                <th className="p-2 border">杠杆</th>
                <th className="p-2 border">开仓价</th>
                <th className="p-2 border">当前价</th>
                <th className="p-2 border">爆仓价</th>
                <th className="p-2 border">盈亏</th>
                <th className="p-2 border">张数</th>
                <th className="p-2 border">保证金</th>
                <th className="p-2 border">维持保证金</th>
                <th className="p-2 border">操作</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos, idx) => {
                const positionValue = pos.entryPrice * pos.quantity * contractValue;
                const maintenanceMargin = positionValue * maintenanceMarginRate;
                const margin = positionValue / pos.leverage;
                const fee = positionValue * feeRate;
                const liquidationPrice = pos.marginType === 'isolated'
                  ? (pos.direction === 'long'
                      ? ((maintenanceMargin - (margin - fee) + positionValue) / (pos.quantity * contractValue)).toFixed(4)
                      : (((margin - fee) - maintenanceMargin + positionValue) / (pos.quantity * contractValue)).toFixed(4))
                  : (pos.direction === 'long'
                      ? ((positionValue - dex) / (pos.quantity * contractValue)).toFixed(4)
                      : ((positionValue + dex) / (pos.quantity * contractValue)).toFixed(4));

                return (
                  <tr key={idx} className={pos.closed ? "bg-gray-100" : ""}>
                    <td className="p-2 border text-center">{pos.symbol}</td>
                    <td className="p-2 border text-center">{translateDirection(pos.direction)}</td>
                    <td className="p-2 border text-center">{translateMarginType(pos.marginType)}</td>
                    <td className="p-2 border text-center cursor-pointer text-blue-500 hover:underline" onClick={() => addToLog(`杠杆倍数: ${pos.leverage}x`)}>
                      {pos.leverage}
                    </td>
                    <td className="p-2 border text-center cursor-pointer text-blue-500 hover:underline" onClick={() => addToLog(`开仓价: ${pos.entryPrice}`)}>
                      {pos.entryPrice}
                    </td>
                    <td className="p-2 border text-center cursor-pointer text-blue-500 hover:underline" onClick={() => addToLog(`当前价: ${pos.currentPrice}`)}>
                      {pos.currentPrice}
                    </td>
                    <td 
                      className="p-2 border text-blue-500 text-center cursor-pointer hover:underline" 
                      onClick={() => {
                        const log = pos.marginType === 'isolated'
                          ? (pos.direction === 'long'
                              ? `逐仓多单爆仓价 = (${maintenanceMargin.toFixed(4)} - (${margin.toFixed(4)} - ${fee.toFixed(4)}) + ${positionValue.toFixed(4)}) / (${pos.quantity} * ${contractValue}) = ${liquidationPrice}`
                              : `逐仓空单爆仓价 = ((${margin.toFixed(4)} - ${fee.toFixed(4)}) - ${maintenanceMargin.toFixed(4)} + ${positionValue.toFixed(4)}) / (${pos.quantity} * ${contractValue}) = ${liquidationPrice}`)
                          : (pos.direction === 'long'
                              ? `全仓多单爆仓价 = (${positionValue.toFixed(4)} - ${dex.toFixed(4)}) / (${pos.quantity} * ${contractValue}) = ${liquidationPrice}`
                              : `全仓空单爆仓价 = (${positionValue.toFixed(4)} + ${dex.toFixed(4)}) / (${pos.quantity} * ${contractValue}) = ${liquidationPrice}`);
                        addToLog(log);
                      }}
                    >
                      {liquidationPrice}
                    </td>
                    <td className="p-2 border text-blue-500 text-center cursor-pointer hover:underline" onClick={() => logCalculation('pnl', pos)}>
                      {pos.pnl}
                    </td>
                    <td className="p-2 border text-center">{pos.quantity}</td>
                    <td className="p-2 border text-center cursor-pointer text-blue-500 hover:underline" onClick={() => logCalculation('margin', pos)}>
                      {pos.margin}
                    </td>
                    <td 
                      className="p-2 border text-center text-blue-500 cursor-pointer hover:underline" 
                      onClick={() => addToLog(`维持保证金 = ${pos.quantity} * ${pos.entryPrice} * ${contractValue} * ${maintenanceMarginRate} = ${maintenanceMargin.toFixed(4)}`)}>
                      {maintenanceMargin.toFixed(4)}
                    </td>
                    <td className="p-2 border text-center">
                      {pos.closed ? (
                        <span className="text-gray-400">
                          已平仓@{pos.closePrice}
                          <div className="text-xs text-green-500">{parseFloat(pos.realizedPnl) >= 0 ? '+' : ''}{pos.realizedPnl}</div>
                        </span>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <button onClick={() => closePosition(idx)} className="bg-red-500 text-white px-2 py-1 rounded">平仓</button>
                          <button onClick={() => deletePosition(idx)} className="bg-gray-500 text-white px-2 py-1 rounded">删除</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 日志控制台 */}
      <div className="col-span-3 mt-4 bg-black text-green-400 p-4 rounded font-mono text-sm">
        <div className="flex justify-between items-center mb-2">
          <strong>计算日志:</strong>
          <button onClick={clearLogs} className="bg-gray-700 text-white px-2 py-1 rounded">清空日志</button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {logs.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap">
              {line.startsWith('---') ? 
                <div className="text-yellow-300 font-bold mt-2 mb-1">{line}</div> : 
                <div>{line}</div>
              }
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
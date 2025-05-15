import React, { useState, useEffect } from 'react';

export default function ContractFormulaCalculator() {
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [currentPrice, setCurrentPrice] = useState(20000);
  const [maintenanceMarginRate, setMaintenanceMarginRate] = useState(0.005);
  const [contractValue, setContractValue] = useState(0.0001);
  const [startingBalance, setStartingBalance] = useState(1000);
  const [currentBalance, setCurrentBalance] = useState(1000);
  const [feeRate, setFeeRate] = useState(0.0004);
  const [logs, setLogs] = useState([]);

  const [entryPrice, setEntryPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [direction, setDirection] = useState('long');
  const [leverage, setLeverage] = useState(10);
  const [marginType, setMarginType] = useState('cross');
  const [positions, setPositions] = useState([]);

  // 添加日志说明计算逻辑
  const logCalculation = (label, formula, result) => {
    setLogs(prev => [...prev, `计算说明 - ${label}: ${formula} = ${result}`]);
  };

  const calculatePnL = (ep, mp, qty, dir) => {
    const delta = dir === 'long' ? mp - ep : ep - mp;
    return (delta * qty * contractValue).toFixed(2);
  };

  const createPosition = () => {
    if (!entryPrice || !quantity) return;
    const ep = parseFloat(entryPrice);
    const qty = parseFloat(quantity);
    const positionValue = qty * contractValue * ep;
    const margin = positionValue / leverage;
    const fee = positionValue * feeRate;
    const maintenanceMargin = positionValue * maintenanceMarginRate;
    const dex = currentBalance - maintenanceMargin - fee;
    const liquidationPrice = marginType === 'isolated'
      ? (direction === 'long'
          ? ((maintenanceMargin - (margin - fee)) + positionValue) / (qty * contractValue)
          : (((margin - fee) - maintenanceMargin + positionValue) / (qty * contractValue))
        ).toFixed(4)
      : (direction === 'long'
          ? ((positionValue - dex) / (qty * contractValue))
          : ((positionValue + dex) / (qty * contractValue))
        ).toFixed(4);

    const pos = {
      symbol,
      direction,
      entryPrice: ep,
      quantity: qty,
      currentPrice,
      leverage,
      marginType,
      closed: false,
      margin: margin.toFixed(2),
      fee: fee.toFixed(2),
      maintenanceMargin: maintenanceMargin.toFixed(2),
      dex: dex.toFixed(2),
      liquidationPrice,
      pnl: calculatePnL(ep, currentPrice, qty, direction),
      closePrice: null,
      realizedPnl: null
    };
    setPositions([...positions, pos]);
    setLogs(prev => [...prev, `新建仓位：${symbol} ${translateDirection(direction)} @${ep}，当前余额=${currentBalance.toFixed(2)}`]);
  };

  const closePosition = (index) => {
    const closePrice = parseFloat(prompt('请输入平仓价格'));
    if (isNaN(closePrice)) return;

    const updated = [...positions];
    const pos = updated[index];
    const pnl = parseFloat(calculatePnL(pos.entryPrice, closePrice, pos.quantity, pos.direction));
    const fee = parseFloat(pos.fee);

    pos.closed = true;
    pos.closePrice = closePrice;
    pos.realizedPnl = pnl;

    setCurrentBalance(prev => {
      const newBalance = prev + pnl - fee;
      setLogs(prevLogs => [
        ...prevLogs,
        `平仓：${pos.symbol} ${translateDirection(pos.direction)} @${closePrice}，盈亏=${pnl}，手续费=${fee}，当前余额=${newBalance.toFixed(2)}`
      ]);
      return newBalance;
    });

    setPositions(updated);
  };

  const deletePosition = (index) => {
    setPositions(positions.filter((_, i) => i !== index));
  };

  const clearLogs = () => setLogs([]);
  const translateDirection = (dir) => dir === 'long' ? '多单' : '空单';
  const translateMarginType = (type) => type === 'cross' ? '全仓' : '逐仓';

  const accountInfo = () => {
    const totalMarginCross = positions.filter(p => p.marginType === 'cross' && !p.closed).reduce((sum, p) => sum + parseFloat(p.margin), 0);
    const totalMarginIsolated = positions.filter(p => p.marginType === 'isolated' && !p.closed).reduce((sum, p) => sum + parseFloat(p.margin), 0);
    const totalFee = positions.filter(p => !p.closed).reduce((sum, p) => sum + parseFloat(p.fee), 0);
    const totalUnrealizedPnl = positions.filter(p => !p.closed).reduce((sum, p) => sum + parseFloat(p.pnl), 0);
    const totalRealizedPnl = positions.filter(p => p.closed && p.realizedPnl !== null).reduce((sum, p) => sum + parseFloat(p.realizedPnl), 0);
    const totalBalance = currentBalance + totalUnrealizedPnl;
    const dex = currentBalance - totalFee - totalMarginCross - totalMarginIsolated;
    const availableMargin = dex;
    return { totalMarginCross, totalMarginIsolated, totalFee, totalUnrealizedPnl, totalRealizedPnl, totalBalance, dex, availableMargin };
  };

  const {
    totalMarginCross,
    totalMarginIsolated,
    totalFee,
    totalUnrealizedPnl,
    totalRealizedPnl,
    totalBalance,
    dex,
    availableMargin
  } = accountInfo();

  useEffect(() => {
    recalculateAllPositions();
  }, [currentPrice, maintenanceMarginRate, feeRate, currentBalance]);

  const recalculateAllPositions = () => {
    setPositions(positions.map(pos => {
      const positionValue = pos.quantity * contractValue * pos.entryPrice;
      const margin = positionValue / pos.leverage;
      const fee = positionValue * feeRate;
      const maintenanceMargin = positionValue * maintenanceMarginRate;
      const dex = currentBalance - maintenanceMargin - fee;
      const liquidationPrice = pos.marginType === 'isolated'
        ? (pos.direction === 'long'
            ? ((maintenanceMargin - (margin - fee)) + positionValue) / (pos.quantity * contractValue)
            : (((margin - fee) - maintenanceMargin + positionValue) / (pos.quantity * contractValue))
          ).toFixed(4)
        : (pos.direction === 'long'
            ? ((positionValue - dex) / (pos.quantity * contractValue))
            : ((positionValue + dex) / (pos.quantity * contractValue))
          ).toFixed(4);

      return {
        ...pos,
        currentPrice,
        margin: margin.toFixed(2),
        fee: fee.toFixed(2),
        maintenanceMargin: maintenanceMargin.toFixed(2),
        dex: dex.toFixed(2),
        liquidationPrice,
        pnl: calculatePnL(pos.entryPrice, currentPrice, pos.quantity, pos.direction),
      };
    }));
  };

  // 点击价格值时显示计算逻辑
  const showLiquidationPriceLogic = (pos) => {
    const positionValue = pos.quantity * contractValue * pos.entryPrice;
    const margin = positionValue / pos.leverage;
    const fee = positionValue * feeRate;
    const maintenanceMargin = positionValue * maintenanceMarginRate;
    const dex = currentBalance - maintenanceMargin - fee;
    
    if (pos.marginType === 'isolated') {
      if (pos.direction === 'long') {
        logCalculation('逐仓多单爆仓价', 
          `(维持保证金 - (保证金 - 手续费) + 仓位价值) / (数量 * 合约面值)`, 
          `((${maintenanceMargin.toFixed(2)} - (${margin.toFixed(2)} - ${fee.toFixed(2)})) + ${positionValue.toFixed(2)}) / (${pos.quantity} * ${contractValue}) = ${pos.liquidationPrice}`);
      } else {
        logCalculation('逐仓空单爆仓价', 
          `((保证金 - 手续费) - 维持保证金 + 仓位价值) / (数量 * 合约面值)`, 
          `(((${margin.toFixed(2)} - ${fee.toFixed(2)}) - ${maintenanceMargin.toFixed(2)} + ${positionValue.toFixed(2)}) / (${pos.quantity} * ${contractValue}) = ${pos.liquidationPrice}`);
      }
    } else {
      if (pos.direction === 'long') {
        logCalculation('全仓多单爆仓价', 
          `(仓位价值 - 可用余额) / (数量 * 合约面值)`, 
          `(${positionValue.toFixed(2)} - ${dex.toFixed(2)}) / (${pos.quantity} * ${contractValue}) = ${pos.liquidationPrice}`);
      } else {
        logCalculation('全仓空单爆仓价', 
          `(仓位价值 + 可用余额) / (数量 * 合约面值)`, 
          `(${positionValue.toFixed(2)} + ${dex.toFixed(2)}) / (${pos.quantity} * ${contractValue}) = ${pos.liquidationPrice}`);
      }
    }
  };

  const showPnlLogic = (pos) => {
    const delta = pos.direction === 'long' ? pos.currentPrice - pos.entryPrice : pos.entryPrice - pos.currentPrice;
    logCalculation('盈亏计算', 
      `${pos.direction === 'long' ? '当前价格 - 开仓价格' : '开仓价格 - 当前价格'} × 数量 × 合约面值`,
      `${delta.toFixed(2)} × ${pos.quantity} × ${contractValue} = ${pos.pnl}`);
  };

  const showMarginLogic = (pos) => {
    const positionValue = pos.quantity * contractValue * pos.entryPrice;
    logCalculation('保证金计算', 
      '仓位价值 ÷ 杠杆倍数', 
      `${positionValue.toFixed(2)} ÷ ${pos.leverage} = ${pos.margin}`);
  };

  const showMaintenanceMarginLogic = (pos) => {
    const positionValue = pos.quantity * contractValue * pos.entryPrice;
    logCalculation('维持保证金计算', 
      '仓位价值 × 维持保证金率', 
      `${positionValue.toFixed(2)} × ${maintenanceMarginRate} = ${pos.maintenanceMargin}`);
  };

  const showFeeLogic = (pos) => {
    const positionValue = pos.quantity * contractValue * pos.entryPrice;
    logCalculation('手续费计算', 
      '仓位价值 × 手续费率', 
      `${positionValue.toFixed(2)} × ${feeRate} = ${pos.fee}`);
  };

  const showTotalBalanceLogic = () => {
    logCalculation('总资产计算', 
      '当前余额 + 未实现盈亏', 
      `${currentBalance.toFixed(2)} + ${totalUnrealizedPnl.toFixed(2)} = ${totalBalance.toFixed(2)}`);
  };

  const showAvailableMarginLogic = () => {
    logCalculation('可用保证金计算', 
      '当前余额 - 手续费总和 - 全仓保证金占用 - 逐仓保证金占用', 
      `${currentBalance.toFixed(2)} - ${totalFee.toFixed(2)} - ${totalMarginCross.toFixed(2)} - ${totalMarginIsolated.toFixed(2)} = ${availableMargin.toFixed(2)}`);
  };

  return (
    <div className="p-6 text-sm">
      <h1 className="text-xl font-bold mb-4">合约持仓计算器</h1>

      {/* 顶部基础参数设置区 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block mb-1">交易对</label>
          <input value={symbol} onChange={e => setSymbol(e.target.value)} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block mb-1">当前价格</label>
          <input type="number" value={currentPrice} onChange={e => setCurrentPrice(parseFloat(e.target.value))} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block mb-1">维持保证金率</label>
          <input type="number" value={maintenanceMarginRate} onChange={e => setMaintenanceMarginRate(parseFloat(e.target.value))} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block mb-1">合约面值</label>
          <input type="number" value={contractValue} onChange={e => setContractValue(parseFloat(e.target.value))} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block mb-1">手续费率</label>
          <input type="number" value={feeRate} onChange={e => setFeeRate(parseFloat(e.target.value))} className="w-full p-2 border rounded" />
        </div>
      </div>

      {/* 仓位创建区 */}
      <div className="bg-white p-4 border rounded mb-6">
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
            <input type="number" value={leverage} onChange={e => setLeverage(parseFloat(e.target.value))} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block mb-1">方向</label>
            <select value={direction} onChange={e => setDirection(e.target.value)} className="w-full p-2 border rounded">
              <option value="long">多单</option>
              <option value="short">空单</option>
            </select>
          </div>
          <div>
            <label className="block mb-1">仓位类型</label>
            <select value={marginType} onChange={e => setMarginType(e.target.value)} className="w-full p-2 border rounded">
              <option value="cross">全仓</option>
              <option value="isolated">逐仓</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={createPosition} className="bg-green-600 text-white px-4 py-2 rounded w-full">创建持仓</button>
          </div>
        </div>
      </div>

      {/* 账户信息 */}
      <div className="bg-white p-4 border rounded mb-6">
        <h3 className="text-lg font-bold mb-2">账户信息</h3>
        <div className="grid gap-1 text-sm">
          <div>当前余额：<span className="cursor-pointer text-blue-600">{currentBalance.toFixed(2)}</span></div>
          <div>初始余额：<span className="cursor-pointer text-blue-600">{startingBalance.toFixed(2)}</span></div>
          <div>总资产（含浮盈）：<span className="cursor-pointer text-blue-600" onClick={showTotalBalanceLogic}>{totalBalance.toFixed(2)}</span></div>
          <div>已实现盈亏：<span className="cursor-pointer text-blue-600">{totalRealizedPnl.toFixed(2)}</span></div>
          <div>未实现盈亏：<span className="cursor-pointer text-blue-600">{totalUnrealizedPnl.toFixed(2)}</span></div>
          <div>手续费总和：<span className="cursor-pointer text-blue-600">{totalFee.toFixed(2)}</span></div>
          <div>全仓保证金占用：<span className="cursor-pointer text-blue-600">{totalMarginCross.toFixed(2)}</span></div>
          <div>逐仓保证金占用：<span className="cursor-pointer text-blue-600">{totalMarginIsolated.toFixed(2)}</span></div>
          <div>可开保证金：<span className="cursor-pointer text-blue-600" onClick={showAvailableMarginLogic}>{availableMargin.toFixed(2)}</span></div>
        </div>
      </div>

      {/* 持仓列表 */}
      <div className="bg-white p-4 border rounded mb-6">
        <h3 className="text-lg font-bold mb-2">持仓列表</h3>
        <table className="w-full text-sm border text-center">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-1 border">交易对</th>
              <th className="p-1 border">方向</th>
              <th className="p-1 border">类型</th>
              <th className="p-1 border">杠杆</th>
              <th className="p-1 border">开仓价</th>
              <th className="p-1 border">当前价</th>
              <th className="p-1 border">爆仓价</th>
              <th className="p-1 border">盈亏</th>
              <th className="p-1 border">张数</th>
              <th className="p-1 border">维持保证金</th>
              <th className="p-1 border">平仓价</th>
              <th className="p-1 border">已实现盈亏</th>
              <th className="p-1 border">操作</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos, idx) => (
              <tr key={idx} className={pos.closed ? 'text-gray-400' : ''}>
                <td className="border p-1">{pos.symbol}</td>
                <td className="border p-1">{translateDirection(pos.direction)}</td>
                <td className="border p-1">{translateMarginType(pos.marginType)}</td>
                <td className="border p-1">{pos.leverage}</td>
                <td className="border p-1">{pos.entryPrice}</td>
                <td className="border p-1">{pos.currentPrice}</td>
                <td className="border p-1 cursor-pointer text-blue-600" onClick={() => showLiquidationPriceLogic(pos)}>{pos.liquidationPrice}</td>
                <td className="border p-1 cursor-pointer text-blue-600" onClick={() => showPnlLogic(pos)}>{pos.pnl}</td>
                <td className="border p-1">{pos.quantity}</td>
                <td className="border p-1 cursor-pointer text-blue-600" onClick={() => showMaintenanceMarginLogic(pos)}>{pos.maintenanceMargin}</td>
                <td className="border p-1">{pos.closePrice ?? '-'}</td>
                <td className="border p-1">{pos.realizedPnl ?? '-'}</td>
                <td className="border p-1">
                  {pos.closed ? '已平仓' : (
                    <div className="flex flex-col items-center gap-1">
                      <button onClick={() => closePosition(idx)} className="bg-red-500 text-white px-2 py-1 rounded text-xs">平仓</button>
                      <button onClick={() => deletePosition(idx)} className="bg-gray-500 text-white px-2 py-1 rounded text-xs">删除</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 日志区 */}
      <div className="bg-black text-green-400 p-4 rounded font-mono">
        <div className="flex justify-between items-center mb-2">
          <strong>计算日志</strong>
          <button onClick={clearLogs} className="bg-gray-700 text-white px-2 py-1 rounded">清空</button>
        </div>
        <div className="text-xs whitespace-pre-wrap">
          {logs.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      </div>
    </div>
  );
}
（保留顶部设置区和创建持仓区）

  {/* 原有内容 */}
 import React, { useState, useEffect } from 'react';

export default function ContractFormulaCalculator() {
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [currentPrice, setCurrentPrice] = useState(20000);
  const [maintenanceMarginRate, setMaintenanceMarginRate] = useState(0.005);
  const [contractValue, setContractValue] = useState(1);
  const [initialBalance, setInitialBalance] = useState(1000);
  const [feeRate, setFeeRate] = useState(0.0004);
  const [logs, setLogs] = useState([]);

  const [entryPrice, setEntryPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [direction, setDirection] = useState('long');
  const [leverage, setLeverage] = useState(10);
  const [marginType, setMarginType] = useState('cross');
  const [positions, setPositions] = useState([]);

  const createPosition = () => {
    if (!entryPrice || !quantity) return;
    const ep = parseFloat(entryPrice);
    const qty = parseFloat(quantity);
    const positionValue = qty * contractValue * ep;
    const margin = positionValue / leverage;
    const fee = positionValue * feeRate;
    const maintenanceMargin = positionValue * maintenanceMarginRate;
    const dex = initialBalance - maintenanceMargin - fee;
    const liquidationPrice = marginType === 'isolated'
      ? (direction === 'long'
          ? ((maintenanceMargin - (margin - fee)) + positionValue) / (qty * contractValue)
          : (((margin - fee) - maintenanceMargin + positionValue) / (qty * contractValue))).toFixed(4)
      : (direction === 'long'
          ? ((positionValue - dex) / (qty * contractValue)).toFixed(4)
          : ((positionValue + dex) / (qty * contractValue)).toFixed(4));const pos = {
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
    };
    setPositions([...positions, pos]);
  };

  const calculatePnL = (ep, mp, qty, dir) => {
    const delta = dir === 'long' ? mp - ep : ep - mp;
    return (delta * qty * contractValue).toFixed(2);
  };

  const recalculateAllPositions = () => {
    setPositions(positions.map(pos => {
      const positionValue = pos.quantity * contractValue * pos.entryPrice;
      const margin = positionValue / pos.leverage;
      const fee = positionValue * feeRate;
      const maintenanceMargin = positionValue * maintenanceMarginRate;
      const dex = initialBalance - maintenanceMargin - fee;
      const liquidationPrice = pos.marginType === 'isolated'
        ? (pos.direction === 'long'
            ? ((maintenanceMargin - (margin - fee)) + positionValue) / (pos.quantity * contractValue)
            : (((margin - fee) - maintenanceMargin + positionValue) / (pos.quantity * contractValue))).toFixed(4)
        : (pos.direction === 'long'
            ? ((positionValue - dex) / (pos.quantity * contractValue)).toFixed(4)
            : ((positionValue + dex) / (pos.quantity * contractValue)).toFixed(4));return {
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

  const closePosition = (index) => {
    const updated = [...positions];
    updated[index].closed = true;
    setPositions(updated);
  };

  const deletePosition = (index) => {
    setPositions(positions.filter((_, i) => i !== index));
  };

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
    }
    setLogs(prev => [...prev, message]);
  };

  const clearLogs = () => setLogs([]);

  const translateDirection = (dir) => dir === 'long' ? '多单' : '空单';
  const translateMarginType = (type) => type === 'cross' ? '全仓' : '逐仓';

  const accountInfo = () => {
    const totalMarginCross = positions.filter(p => p.marginType === 'cross' && !p.closed).reduce((sum, p) => sum + parseFloat(p.margin), 0);
    const totalMarginIsolated = positions.filter(p => p.marginType === 'isolated' && !p.closed).reduce((sum, p) => sum + parseFloat(p.margin), 0);
    const totalFee = positions.filter(p => !p.closed).reduce((sum, p) => sum + parseFloat(p.fee), 0);
    const totalUnrealizedPnl = positions.filter(p => !p.closed).reduce((sum, p) => sum + parseFloat(p.pnl), 0);
    const dex = initialBalance - totalFee - totalMarginCross - totalMarginIsolated;
    const availableMargin = dex;
    return { totalMarginCross, totalMarginIsolated, totalFee, totalUnrealizedPnl, dex, availableMargin };
  };

  const { totalMarginCross, totalMarginIsolated, totalFee, totalUnrealizedPnl, dex, availableMargin } = accountInfo();

  useEffect(() => {
    recalculateAllPositions();
  }, [currentPrice, maintenanceMarginRate, feeRate, initialBalance]);

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
        <input type="number" value={currentPrice} onChange={e => setCurrentPrice(parseFloat(e.target.value))} className="w-full p-2 border rounded" />
      </div>
      <div>
        <label className="block mb-1">维持保证金率</label>
        <input type="number" value={maintenanceMarginRate} onChange={e => setMaintenanceMarginRate(parseFloat(e.target.value))} className="w-full p-2 border rounded" />
      </div>
      <div>
        <label className="block mb-1">合约面值</label>
        <input type="number" value={contractValue} onChange={e => setContractValue(parseFloat(e.target.value))} className="w-full p-2 border rounded" placeholder="0.0001" />
      </div>
      <div>
        <label className="block mb-1">初始余额</label>
        <input type="number" value={initialBalance} onChange={e => setInitialBalance(parseFloat(e.target.value))} className="w-full p-2 border rounded" />
      </div>
      <div>
        <label className="block mb-1">手续费率</label>
        <input type="number" value={feeRate} onChange={e => setFeeRate(parseFloat(e.target.value))} className="w-full p-2 border rounded" />
      </div>
    </div>
    <div className="mt-4">
      <button onClick={recalculateAllPositions} className="bg-blue-500 text-white px-4 py-2 rounded">重新计算</button>
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
{/* 原有内容 */}
   <div className="col-span-3 grid grid-cols-3 gap-4">
    <div className="col-span-1 bg-white p-4 border rounded mb-4">
      <h3 className="text-lg font-bold mb-2">账户信息</h3>
      <div className="grid grid-cols-1 gap-2 text-sm">
        <div className="cursor-pointer" onClick={() => setLogs(prev => [...prev, `当前余额 = 初始余额 = ${initialBalance.toFixed(2)}`])}>当前余额：{initialBalance.toFixed(2)}</div>
        <div className="cursor-pointer" onClick={() => setLogs(prev => [...prev, `逐仓保证金 = ${totalMarginIsolated.toFixed(2)}`])}>逐仓保证金占用：{totalMarginIsolated.toFixed(2)}</div>
        <div className="cursor-pointer" onClick={() => setLogs(prev => [...prev, `全仓保证金 = ${totalMarginCross.toFixed(2)}`])}>全仓保证金占用：{totalMarginCross.toFixed(2)}</div>
        <div className="cursor-pointer" onClick={() => setLogs(prev => [...prev, `手续费总和 = ${totalFee.toFixed(2)}`])}>手续费总和：{totalFee.toFixed(2)}</div>
        <div className="cursor-pointer" onClick={() => setLogs(prev => [...prev, `未实现盈亏 = ${totalUnrealizedPnl.toFixed(2)}`])}>未实现盈亏总和：{totalUnrealizedPnl.toFixed(2)}</div>
        <div className="cursor-pointer" onClick={() => setLogs(prev => [...prev, `DEX = 初始余额(${initialBalance}) - 手续费(${totalFee.toFixed(2)}) - 保证金(${(totalMarginCross + totalMarginIsolated).toFixed(2)}) = ${dex.toFixed(2)}`])}>当前账户 DEX：{dex.toFixed(2)}</div>
        <div className="cursor-pointer" onClick={() => setLogs(prev => [...prev, `可开保证金 = DEX = ${availableMargin.toFixed(2)}`])}>当前可开保证金：{availableMargin.toFixed(2)}</div>
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
            <th className="p-2 border">维持保证金</th>
            <th className="p-2 border">强平价</th>
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

            const forcedPrice = pos.direction === 'long'
              ? ((maintenanceMargin - (margin - fee) + positionValue) / (pos.quantity * contractValue)).toFixed(4)
              : (((margin - fee) - maintenanceMargin + positionValue) / (pos.quantity * contractValue)).toFixed(4);

            return (
              <tr key={idx}>
                <td className="p-2 border text-center">{pos.symbol}</td>
                <td className="p-2 border text-center">{translateDirection(pos.direction)}</td>
                <td className="p-2 border text-center">{translateMarginType(pos.marginType)}</td>
                <td className="p-2 border text-center">{pos.leverage}</td>
                <td className="p-2 border text-center">{pos.entryPrice}</td>
                <td className="p-2 border text-center">{pos.currentPrice}</td>
                <td className="p-2 border text-blue-500 text-center cursor-pointer" onClick={() => {
                  const log = pos.marginType === 'isolated'
                    ? (pos.direction === 'long'
                        ? `逐仓爆仓价 = (${maintenanceMargin.toFixed(4)} - (${margin.toFixed(4)} - ${fee.toFixed(4)}) + ${positionValue.toFixed(4)}) / (${pos.quantity} * ${contractValue}) = ${liquidationPrice}`
                        : `逐仓爆仓价 = ((${margin.toFixed(4)} - ${fee.toFixed(4)}) - ${maintenanceMargin.toFixed(4)} + ${positionValue.toFixed(4)}) / (${pos.quantity} * ${contractValue}) = ${liquidationPrice}`)
                    : (pos.direction === 'long'
                        ? `全仓爆仓价 = (${positionValue.toFixed(4)} - ${dex.toFixed(4)}) / (${pos.quantity} * ${contractValue}) = ${liquidationPrice}`
                        : `全仓爆仓价 = (${positionValue.toFixed(4)} + ${dex.toFixed(4)}) / (${pos.quantity} * ${contractValue}) = ${liquidationPrice}`);
                  setLogs(prev => [...prev, log]);
                }}>{liquidationPrice}</td>
                <td className="p-2 border text-blue-500 text-center cursor-pointer" onClick={() => logCalculation('pnl', pos)}>{pos.pnl}</td>
                <td className="p-2 border text-center">{pos.quantity}</td>
                <td className="p-2 border text-center text-blue-500 cursor-pointer" onClick={() => setLogs(prev => [...prev, `维持保证金 = ${pos.quantity} * ${pos.entryPrice} * ${contractValue} * ${maintenanceMarginRate} = ${maintenanceMargin.toFixed(4)}`])}>{maintenanceMargin.toFixed(4)}</td>
                <td className="p-2 border text-center text-blue-500 cursor-pointer" onClick={() => setLogs(prev => [...prev, `强平价 = ${forcedPrice}`])}>{forcedPrice}</td>
                <td className="p-2 border text-center">
                  {pos.closed ? (
                    <span className="text-gray-400">已平仓</span>
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
    <pre>{logs.map((line, i) => <div key={i}>{line}</div>)}</pre>
  </div>
</>
  );
}

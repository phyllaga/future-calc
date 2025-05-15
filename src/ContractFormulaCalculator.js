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
    const liquidationPrice =
      direction === 'long'
        ? ((positionValue - dex) / (qty * contractValue)).toFixed(2)
        : ((positionValue + dex) / (qty * contractValue)).toFixed(2);

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
    };
    setPositions([...positions, pos]);
  };

  const calculatePnL = (ep, mp, qty, dir) => {
    const delta = dir === 'long' ? mp - ep : ep - mp;
    const pnl = delta * qty * contractValue;
    return pnl.toFixed(2);
  };

  const recalculateAllPositions = () => {
    setPositions(positions.map(pos => {
      const positionValue = pos.quantity * contractValue * pos.entryPrice;
      const margin = positionValue / pos.leverage;
      const fee = positionValue * feeRate;
      const maintenanceMargin = positionValue * maintenanceMarginRate;
      const dex = initialBalance - maintenanceMargin - fee;
      const liquidationPrice =
        pos.direction === 'long'
          ? ((positionValue - dex) / (pos.quantity * contractValue)).toFixed(2)
          : ((positionValue + dex) / (pos.quantity * contractValue)).toFixed(2);

      return {
        ...pos,
        currentPrice,
        margin: margin.toFixed(2),
        fee: fee.toFixed(2),
        maintenanceMargin: maintenanceMargin.toFixed(2),
        dex: dex.toFixed(2),
        liquidationPrice,
        pnl: calculatePnL(pos.entryPrice, currentPrice, pos.quantity, pos.direction),
      }
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
      const delta = pos.direction === 'long' ? `${pos.currentPrice} - ${pos.entryPrice}` : `${pos.entryPrice} - ${pos.currentPrice}`;
      message = `盈亏计算: (${delta}) * ${pos.quantity} * ${contractValue} = ${pos.pnl}`;
    } else if (type === 'liq') {
      message = `爆仓价计算: ${(pos.direction === 'long' ? `(${pos.quantity} * ${contractValue} * ${pos.entryPrice} - ${pos.dex}) / (${pos.quantity} * ${contractValue})` : `(${pos.quantity} * ${contractValue} * ${pos.entryPrice} + ${pos.dex}) / (${pos.quantity} * ${contractValue})`)} = ${pos.liquidationPrice}`;
    }
    setLogs(prev => [...prev, message]);
  };

  const clearLogs = () => setLogs([]);

  useEffect(() => {
    recalculateAllPositions();
  }, [currentPrice, maintenanceMarginRate, feeRate, initialBalance]);

  const translateDirection = (dir) => dir === 'long' ? '多单' : '空单';
  const translateMarginType = (type) => type === 'cross' ? '全仓' : '逐仓';

  const accountInfo = () => {
    const totalMarginCross = positions.filter(p => p.marginType === 'cross' && !p.closed).reduce((sum, p) => sum + parseFloat(p.margin), 0);
    const totalMarginIsolated = positions.filter(p => p.marginType === 'isolated' && !p.closed).reduce((sum, p) => sum + parseFloat(p.margin), 0);
    const totalFee = positions.filter(p => !p.closed).reduce((sum, p) => sum + parseFloat(p.fee), 0);
    const totalUnrealizedPnl = positions.filter(p => !p.closed).reduce((sum, p) => sum + parseFloat(p.pnl), 0);
    const dex = initialBalance - totalFee - (totalMarginCross + totalMarginIsolated);
    const availableMargin = dex;
    return { totalMarginCross, totalMarginIsolated, totalFee, totalUnrealizedPnl, dex, availableMargin };
  };

  const { totalMarginCross, totalMarginIsolated, totalFee, totalUnrealizedPnl, dex, availableMargin } = accountInfo();

  return (
    <div className="grid grid-cols-3 gap-4 p-6">
      {/* 顶部基础参数区 */}
      <div className="col-span-3 bg-gray-100 p-4 rounded mb-4">
        <div className="grid grid-cols-8 gap-4 items-end">
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
            <label className="block mb-1">初始余额</label>
            <input type="number" value={initialBalance} onChange={e => setInitialBalance(parseFloat(e.target.value))} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block mb-1">手续费率</label>
            <input type="number" value={feeRate} onChange={e => setFeeRate(parseFloat(e.target.value))} className="w-full p-2 border rounded" />
          </div>
          <div className="col-span-2">
            <button onClick={recalculateAllPositions} className="bg-blue-500 text-white px-4 py-2 rounded w-full">重新计算</button>
          </div>
        </div>
      </div>

      {/* 账户信息展示区 */}
      <div className="col-span-3 bg-white p-4 border rounded mb-4">
        <h3 className="text-lg font-bold mb-2">账户信息</h3>
        <div className="grid grid-cols-6 gap-4 text-sm">
          <div>当前余额：{initialBalance.toFixed(2)}</div>
          <div>逐仓保证金占用：{totalMarginIsolated.toFixed(2)}</div>
          <div>全仓保证金占用：{totalMarginCross.toFixed(2)}</div>
          <div>手续费总和：{totalFee.toFixed(2)}</div>
          <div>未实现盈亏总和：{totalUnrealizedPnl.toFixed(2)}</div>
          <div>当前账户 DEX：{dex.toFixed(2)}</div>
          <div>当前可开保证金：{availableMargin.toFixed(2)}</div>
        </div>
      </div>

      {/* 持仓列表展示区 */}
      <div className="col-span-3 bg-white p-4 border rounded">
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
              <th className="p-2 border">操作</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos, idx) => (
              <tr key={idx}>
                <td className="p-2 border text-center">{pos.symbol}</td>
                <td className="p-2 border text-center">{translateDirection(pos.direction)}</td>
                <td className="p-2 border text-center">{translateMarginType(pos.marginType)}</td>
                <td className="p-2 border text-center">{pos.leverage}</td>
                <td className="p-2 border text-center">{pos.entryPrice}</td>
                <td className="p-2 border text-center">{pos.currentPrice}</td>
                <td className="p-2 border text-center text-blue-500 cursor-pointer" onClick={() => logCalculation('liq', pos)}>{pos.liquidationPrice}</td>
                <td className="p-2 border text-center text-blue-500 cursor-pointer" onClick={() => logCalculation('pnl', pos)}>{pos.pnl}</td>
                <td className="p-2 border text-center">{pos.quantity}</td>
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
            ))}
          </tbody>
        </table>
      </div>

      {/* 底部 Console 输出区 */}
      <div className="col-span-3 mt-4 bg-black text-green-400 p-4 rounded font-mono text-sm">
        <div className="flex justify-between items-center mb-2">
          <strong>计算日志:</strong>
          <button onClick={clearLogs} className="bg-gray-700 text-white px-2 py-1 rounded">清空日志</button>
        </div>
        <pre>{logs.map((line, i) => <div key={i}>{line}</div>)}</pre>
      </div>
    </div>
  );
}
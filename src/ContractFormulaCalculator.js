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
    const liquidationPrice = direction === 'long'
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
    return (delta * qty * contractValue).toFixed(2);
  };

  const recalculateAllPositions = () => {
    setPositions(positions.map(pos => {
      const positionValue = pos.quantity * contractValue * pos.entryPrice;
      const margin = positionValue / pos.leverage;
      const fee = positionValue * feeRate;
      const maintenanceMargin = positionValue * maintenanceMarginRate;
      const dex = initialBalance - maintenanceMargin - fee;
      const liquidationPrice = pos.direction === 'long'
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
      {/* 可选：顶部参数输入区 + 仓位创建区（已在上文定义） */}

      {/* 账户信息与持仓列表并排显示 */}
      <div className="col-span-3 grid grid-cols-3 gap-4">
        {/* 账户信息展示区 */}
        <div className="col-span-1 bg-white p-4 border rounded mb-4">
          <h3 className="text-lg font-bold mb-2">账户信息</h3>
          <div className="grid grid-cols-1 gap-2 text-sm">
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
                  <td className="p-2 border text-blue-500 text-center cursor-pointer" onClick={() => logCalculation('liq', pos)}>{pos.liquidationPrice}</td>
                  <td className="p-2 border text-blue-500 text-center cursor-pointer" onClick={() => logCalculation('pnl', pos)}>{pos.pnl}</td>
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

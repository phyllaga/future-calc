import React, { useState, useEffect } from 'react';

export default function ContractFormulaCalculator() {
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [currentPrice, setCurrentPrice] = useState(20000);
  const [maintenanceMarginRate, setMaintenanceMarginRate] = useState(0.005);
  const [contractValue, setContractValue] = useState(1);
  const [balance, setBalance] = useState(1000);
  const [openFeeRate, setOpenFeeRate] = useState(0.0003);
  const [closeFeeRate, setCloseFeeRate] = useState(0.0005);

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
    const pos = {
      symbol,
      direction,
      entryPrice: ep,
      quantity: qty,
      currentPrice,
      leverage,
      marginType,
      closed: false,
      liquidationPrice: calculateLiquidationPrice(ep, qty, direction, leverage),
      pnl: calculatePnL(ep, currentPrice, qty, direction),
    };
    setPositions([...positions, pos]);
  };

  const calculatePnL = (ep, mp, qty, dir) => {
    const delta = dir === 'long' ? mp - ep : ep - mp;
    return (delta * qty * contractValue).toFixed(2);
  };

  const calculateLiquidationPrice = (ep, qty, dir, lvg) => {
    const mmr = maintenanceMarginRate;
    const val = contractValue;
    const liqPrice = dir === 'long'
      ? ep * (1 - (1 / lvg) + mmr)
      : ep * (1 + (1 / lvg) - mmr);
    return liqPrice.toFixed(2);
  };

  const recalculateAllPositions = () => {
    setPositions(positions.map(pos => ({
      ...pos,
      currentPrice,
      liquidationPrice: calculateLiquidationPrice(pos.entryPrice, pos.quantity, pos.direction, pos.leverage),
      pnl: calculatePnL(pos.entryPrice, currentPrice, pos.quantity, pos.direction),
    })));
  };

  const closePosition = (index) => {
    const updated = [...positions];
    updated[index].closed = true;
    setPositions(updated);
  };

  useEffect(() => {
    recalculateAllPositions();
  }, [currentPrice, maintenanceMarginRate]);

  const translateDirection = (dir) => dir === 'long' ? '多单' : '空单';
  const translateMarginType = (type) => type === 'cross' ? '全仓' : '逐仓';

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
            <label className="block mb-1">账户余额</label>
            <input type="number" value={balance} onChange={e => setBalance(parseFloat(e.target.value))} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block mb-1">开仓费率</label>
            <input type="number" value={openFeeRate} onChange={e => setOpenFeeRate(parseFloat(e.target.value))} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block mb-1">平仓费率</label>
            <input type="number" value={closeFeeRate} onChange={e => setCloseFeeRate(parseFloat(e.target.value))} className="w-full p-2 border rounded" />
          </div>
          <button onClick={recalculateAllPositions} className="bg-blue-500 text-white px-4 py-2 rounded">重新计算</button>
        </div>
      </div>

      {/* 左侧参数设置区 */}
      <div className="bg-white p-4 border rounded">
        <h3 className

import React, { useState, useEffect } from 'react';

export default function ContractFormulaCalculator() {
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [currentPrice, setCurrentPrice] = useState(20000);
  const [maintenanceMarginRate, setMaintenanceMarginRate] = useState(0.005);
  const [contractValue, setContractValue] = useState(1);
  const [balance, setBalance] = useState(1000);

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

  useEffect(() => {
    recalculateAllPositions();
  }, [currentPrice, maintenanceMarginRate]);

  const translateDirection = (dir) => dir === 'long' ? '多单' : '空单';
  const translateMarginType = (type) => type === 'cross' ? '全仓' : '逐仓';

  return (
    <div className="grid grid-cols-3 gap-4 p-6">
      {/* 顶部基础参数区 */}
      <div className="col-span-3 bg-gray-100 p-4 rounded mb-4">
        <div className="grid grid-cols-6 gap-4 items-end">
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
          <button onClick={recalculateAllPositions} className="bg-blue-500 text-white px-4 py-2 rounded">重新计算</button>
        </div>
      </div>

      {/* 左侧参数设置区 */}
      <div className="bg-white p-4 border rounded">
        <h3 className="text-lg font-bold mb-2">参数设置</h3>
        <label className="block mb-1">开仓价格</label>
        <input type="number" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} className="w-full p-2 border rounded mb-2" />

        <label className="block mb-1">张数</label>
        <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full p-2 border rounded mb-2" />

        <label className="block mb-1">杠杆倍数</label>
        <input type="number" value={leverage} onChange={e => setLeverage(parseFloat(e.target.value))} className="w-full p-2 border rounded mb-2" />

        <label className="block mb-1">方向</label>
        <select value={direction} onChange={e => setDirection(e.target.value)} className="w-full p-2 border rounded mb-2">
          <option value="long">多单</option>
          <option value="short">空单</option>
        </select>

        <label className="block mb-1">仓位类型</label>
        <select value={marginType} onChange={e => setMarginType(e.target.value)} className="w-full p-2 border rounded mb-2">
          <option value="cross">全仓</option>
          <option value="isolated">逐仓</option>
        </select>

        <button onClick={createPosition} className="bg-blue-600 text-white px-4 py-2 rounded mt-2">创建持仓</button>
      </div>

      {/* 右侧持仓展示区 */}
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
                <td className="p-2 border text-center">{pos.liquidationPrice}</td>
                <td className="p-2 border text-center">{pos.pnl}</td>
                <td className="p-2 border text-center">{pos.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

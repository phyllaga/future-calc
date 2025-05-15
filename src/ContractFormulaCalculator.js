import React, { useState } from 'react';

export default function ContractFormulaCalculator() {
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [currentPrice, setCurrentPrice] = useState(20000);
  const [maintenanceMarginRate, setMaintenanceMarginRate] = useState(0.005);
  const [contractValue, setContractValue] = useState(1);
  const [leverage, setLeverage] = useState(10);

  const [entryPrice, setEntryPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [direction, setDirection] = useState('long');
  const [positions, setPositions] = useState([]);

  const createPosition = () => {
    if (!entryPrice || !quantity) return;
    const ep = parseFloat(entryPrice);
    const qty = parseFloat(quantity);
    const pos = {
      symbol,
      entryPrice: ep,
      quantity: qty,
      direction,
      currentPrice,
      liquidationPrice: calculateLiquidationPrice(ep, qty, direction),
    };
    setPositions([...positions, pos]);
  };

  const calculateLiquidationPrice = (ep, qty, dir) => {
    const mmr = maintenanceMarginRate;
    const lvg = leverage;
    const val = contractValue;
    const margin = (ep * qty * val) / lvg;
    const liqPrice = dir === 'long'
      ? ep * (1 - (1 / lvg) + mmr)
      : ep * (1 + (1 / lvg) - mmr);
    return liqPrice.toFixed(2);
  };

  return (
    <div className="grid grid-cols-3 gap-4 p-6">
      {/* 顶部基础参数区 */}
      <div className="col-span-3 bg-gray-100 p-4 rounded mb-4">
        <div className="grid grid-cols-5 gap-4">
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
            <label className="block mb-1">杠杆倍数</label>
            <input type="number" value={leverage} onChange={e => setLeverage(parseFloat(e.target.value))} className="w-full p-2 border rounded" />
          </div>
        </div>
      </div>

      {/* 左侧参数设置区 */}
      <div className="bg-white p-4 border rounded">
        <h3 className="text-lg font-bold mb-2">参数设置</h3>
        <label className="block mb-1">开仓价格</label>
        <input type="number" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} className="w-full p-2 border rounded mb-2" />

        <label className="block mb-1">张数</label>
        <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full p-2 border rounded mb-2" />

        <label className="block mb-1">方向</label>
        <select value={direction} onChange={e => setDirection(e.target.value)} className="w-full p-2 border rounded mb-2">
          <option value="long">多单</option>
          <option value="short">空单</option>
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
              <th className="p-2 border">开仓价</th>
              <th className="p-2 border">当前价</th>
              <th className="p-2 border">爆仓价</th>
              <th className="p-2 border">张数</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos, idx) => (
              <tr key={idx}>
                <td className="p-2 border text-center">{pos.symbol}</td>
                <td className="p-2 border text-center">{pos.direction}</td>
                <td className="p-2 border text-center">{pos.entryPrice}</td>
                <td className="p-2 border text-center">{pos.currentPrice}</td>
                <td className="p-2 border text-center">{pos.liquidationPrice}</td>
                <td className="p-2 border text-center">{pos.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

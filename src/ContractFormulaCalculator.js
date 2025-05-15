import React, { useState } from 'react';

export default function ContractFormulaCalculator() {
  const [entryPrice, setEntryPrice] = useState('');
  const [markPrice, setMarkPrice] = useState('');
  const [positionSize, setPositionSize] = useState('');
  const [leverage, setLeverage] = useState('');
  const [direction, setDirection] = useState('long');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const e = parseFloat(entryPrice);
    const m = parseFloat(markPrice);
    const s = parseFloat(positionSize);
    const l = parseFloat(leverage);

    if (!e || !m || !s || !l) {
      setResult('请输入完整的参数');
      return;
    }

    let pnl;
    if (direction === 'long') {
      pnl = (m - e) * s;
    } else {
      pnl = (e - m) * s;
    }

    const initialMargin = (e * s) / l;
    const roe = (pnl / initialMargin) * 100;

    setResult({
      pnl: pnl.toFixed(2),
      roe: roe.toFixed(2),
      margin: initialMargin.toFixed(2),
    });
  };

  return (
    <div className="p-4 max-w-md mx-auto border rounded shadow">
      <h2 className="text-xl font-bold mb-4">合约盈亏计算器</h2>

      <label className="block mb-2">开仓价格</label>
      <input type="number" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} className="w-full mb-4 p-2 border rounded" />

      <label className="block mb-2">当前价格（标记价格）</label>
      <input type="number" value={markPrice} onChange={e => setMarkPrice(e.target.value)} className="w-full mb-4 p-2 border rounded" />

      <label className="block mb-2">仓位数量（张/合约数）</label>
      <input type="number" value={positionSize} onChange={e => setPositionSize(e.target.value)} className="w-full mb-4 p-2 border rounded" />

      <label className="block mb-2">杠杆倍数</label>
      <input type="number" value={leverage} onChange={e => setLeverage(e.target.value)} className="w-full mb-4 p-2 border rounded" />

      <label className="block mb-2">方向</label>
      <select value={direction} onChange={e => setDirection(e.target.value)} className="w-full mb-4 p-2 border rounded">
        <option value="long">多单</option>
        <option value="short">空单</option>
      </select>

      <button onClick={calculate} className="bg-blue-500 text-white px-4 py-2 rounded">计算</button>

      {result && typeof result === 'object' && (
        <div className="mt-4 bg-gray-100 p-4 rounded">
          <p><strong>已实现盈亏（P&L）:</strong> {result.pnl} USDT</p>
          <p><strong>收益率（ROE）:</strong> {result.roe} %</p>
          <p><strong>初始保证金:</strong> {result.margin} USDT</p>
        </div>
      )}
      {typeof result === 'string' && (
        <div className="mt-4 text-red-500">{result}</div>
      )}
    </div>
  );
}

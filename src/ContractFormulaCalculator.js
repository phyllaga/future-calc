import React, { useState, useEffect, useRef } from 'react';

export default function ContractFormulaCalculator() {
  const [symbol, setSymbol] = useState('btc_usdt');
  const [currentPrice, setCurrentPrice] = useState(20000);
  const [maintenanceMarginRate, setMaintenanceMarginRate] = useState(0.005);
  const [contractValue, setContractValue] = useState(0.0001);
  const [initialBalance, setInitialBalance] = useState(1000);
  const [currentBalance, setCurrentBalance] = useState(1000);
  const [feeRate, setFeeRate] = useState(0.0004);
  const [logs, setLogs] = useState([]);

  const [entryPrice, setEntryPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [direction, setDirection] = useState('long');
  const [leverage, setLeverage] = useState(10);
  const [marginType, setMarginType] = useState('cross');
  const [positions, setPositions] = useState([]);
  
  // 自动刷新相关状态
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // 合约列表和行情数据
  const [contractList, setContractList] = useState([]);
  const [marketData, setMarketData] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  
  // 自动刷新定时器引用
  const refreshTimerRef = useRef(null);

  // 当前日期和时间，用户名
  const currentDateTime = "2025-05-16 02:02:43";
  const currentUser = "phyllaga";

  // 静态合约数据
  const contractsData = [
    {
      "id": 1,
      "symbol": "btc_usdt",
      "contractType": "PERPETUAL",
      "underlyingType": "U_BASED",
      "contractSize": "0.0001",
      "tradeSwitch": true,
      "state": 0,
      "initLeverage": 100,
      "initPositionType": "CROSSED",
      "baseCoin": "btc",
      "quoteCoin": "usdt",
      "baseCoinPrecision": 6,
      "baseCoinDisplayPrecision": 5,
      "quoteCoinPrecision": 4,
      "quoteCoinDisplayPrecision": 4,
      "quantityPrecision": 0,
      "pricePrecision": 1,
      "enName": "BTCUSDT ",
      "cnName": "BTCUSDT 永续",
      "minStepPrice": "0.1"
    },
    {
      "id": 2,
      "symbol": "eth_usdt",
      "contractType": "PERPETUAL",
      "underlyingType": "U_BASED",
      "contractSize": "0.01",
      "tradeSwitch": true,
      "state": 0,
      "initLeverage": 100,
      "initPositionType": "CROSSED",
      "baseCoin": "eth",
      "quoteCoin": "usdt",
      "baseCoinPrecision": 8,
      "baseCoinDisplayPrecision": 4,
      "quoteCoinPrecision": 4,
      "quoteCoinDisplayPrecision": 4,
      "quantityPrecision": 0,
      "pricePrecision": 2,
      "enName": "ETHUSDT ",
      "cnName": "ETHUSDT 永续",
      "minStepPrice": "0.01"
    },
    {
      "id": 4,
      "symbol": "xrp_usdt",
      "contractType": "PERPETUAL",
      "underlyingType": "U_BASED",
      "contractSize": "10",
      "tradeSwitch": true,
      "state": 0,
      "initLeverage": 200,
      "initPositionType": "CROSSED",
      "baseCoin": "xrp",
      "quoteCoin": "usdt",
      "baseCoinPrecision": 6,
      "baseCoinDisplayPrecision": 5,
      "quoteCoinPrecision": 4,
      "quoteCoinDisplayPrecision": 4,
      "quantityPrecision": 0,
      "pricePrecision": 4,
      "enName": "xrpusdt",
      "cnName": "xrpusdt",
      "minStepPrice": "0.0001"
    },
    {
      "id": 5,
      "symbol": "sol_usdt",
      "contractType": "PERPETUAL",
      "underlyingType": "U_BASED",
      "contractSize": "0.01",
      "tradeSwitch": true,
      "state": 0,
      "initLeverage": 200,
      "initPositionType": "CROSSED",
      "baseCoin": "sol",
      "quoteCoin": "usdt",
      "baseCoinPrecision": 6,
      "baseCoinDisplayPrecision": 4,
      "quoteCoinPrecision": 4,
      "quoteCoinDisplayPrecision": 4,
      "quantityPrecision": 0,
      "pricePrecision": 2,
      "enName": "solusdt",
      "cnName": "solusdt",
      "minStepPrice": "0.01"
    },
    {
      "id": 7,
      "symbol": "ltc_usdt",
      "contractType": "PERPETUAL",
      "underlyingType": "U_BASED",
      "contractSize": "0.1",
      "tradeSwitch": true,
      "state": 0,
      "initLeverage": 100,
      "initPositionType": "CROSSED",
      "baseCoin": "ltc",
      "quoteCoin": "usdt",
      "baseCoinPrecision": 6,
      "baseCoinDisplayPrecision": 4,
      "quoteCoinPrecision": 4,
      "quoteCoinDisplayPrecision": 4,
      "quantityPrecision": 0,
      "pricePrecision": 2,
      "enName": "ltcusdt",
      "cnName": "ltcusdt",
      "minStepPrice": "0.01"
    },
    {
      "id": 8,
      "symbol": "bnb_usdt",
      "contractType": "PERPETUAL",
      "underlyingType": "U_BASED",
      "contractSize": "0.01",
      "tradeSwitch": true,
      "state": 0,
      "initLeverage": 200,
      "initPositionType": "CROSSED",
      "baseCoin": "bnb",
      "quoteCoin": "usdt",
      "baseCoinPrecision": 6,
      "baseCoinDisplayPrecision": 4,
      "quoteCoinPrecision": 4,
      "quoteCoinDisplayPrecision": 4,
      "quantityPrecision": 0,
      "pricePrecision": 2,
      "enName": "bnbusdt",
      "cnName": "bnbusdt",
      "minStepPrice": "0.01"
    },
    {
      "id": 9,
      "symbol": "doge_usdt",
      "contractType": "PERPETUAL",
      "underlyingType": "U_BASED",
      "contractSize": "10",
      "tradeSwitch": true,
      "state": 0,
      "initLeverage": 200,
      "initPositionType": "CROSSED",
      "baseCoin": "doge",
      "quoteCoin": "usdt",
      "baseCoinPrecision": 6,
      "baseCoinDisplayPrecision": 4,
      "quoteCoinPrecision": 4,
      "quoteCoinDisplayPrecision": 4,
      "quantityPrecision": 0,
      "pricePrecision": 5,
      "enName": "dogeusdt",
      "cnName": "dogeusdt",
      "minStepPrice": "0.00001"
    },
    {
      "id": 10,
      "symbol": "dot_usdt",
      "contractType": "PERPETUAL",
      "underlyingType": "U_BASED",
      "contractSize": "0.1",
      "tradeSwitch": true,
      "state": 0,
      "initLeverage": 100,
      "initPositionType": "CROSSED",
      "baseCoin": "dot",
      "quoteCoin": "usdt",
      "baseCoinPrecision": 6,
      "baseCoinDisplayPrecision": 8,
      "quoteCoinPrecision": 4,
      "quoteCoinDisplayPrecision": 4,
      "quantityPrecision": 0,
      "pricePrecision": 3,
      "enName": "dotusdt",
      "cnName": "dotusdt",
      "minStepPrice": "0.001"
    }
  ];

  // 自动刷新价格定时器
  useEffect(() => {
    // 清除之前的定时器
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    // 如果启用自动刷新，设置新的定时器
    if (autoRefresh) {
      addToLog(`--- 已开启自动刷新价格 (每秒) ---`);
      refreshTimerRef.current = setInterval(() => {
        fetchMarketData(true);
      }, 1000);
    } else if (refreshTimerRef.current) {
      addToLog(`--- 已关闭自动刷新价格 ---`);
    }
    
    // 组件卸载时清除定时器
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh]);

  // 初始化时设置合约列表
  useEffect(() => {
    setContractList(contractsData);
    fetchMarketData();
  }, []);

  // 获取行情数据
  const fetchMarketData = async (isAutoRefresh = false) => {
    // 如果是手动刷新或首次加载，显示加载状态
    if (!isAutoRefresh) {
      setIsLoading(true);
      addToLog(`--- 正在获取行情数据 ---`);
    }
    
    try {
      const response = await fetch('https://mgbx.com/futures/fapi/market/v1/public/m/allticker');
      const data = await response.json();
      
      if (data && data.data && Array.isArray(data.data)) {
        setMarketData(data.data);
        
        // 更新最后刷新时间
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        setLastUpdated(timeString);
        
        // 如果不是自动刷新，添加日志
        if (!isAutoRefresh) {
          addToLog(`成功获取 ${data.data.length} 个交易对行情数据`);
        }
        
        // 如果已经选择了合约，更新价格
        if (selectedContract) {
          updatePriceForSelectedContract(selectedContract.symbol, data.data, isAutoRefresh);
        }
      }
    } catch (error) {
      if (!isAutoRefresh) {
        addToLog(`获取行情数据失败: ${error.message}`);
      }
    }
    
    // 手动刷新时才需要设置加载状态为false
    if (!isAutoRefresh) {
      setIsLoading(false);
    }
  };
  
  // 更新所选合约的价格和合约面值
  const updatePriceForSelectedContract = (symbolCode, marketDataArray, isAutoRefresh = false) => {
    // 查找匹配的行情数据
    const matchingMarket = marketDataArray.find(item => item.symbol === symbolCode);
    
    if (matchingMarket) {
      const price = parseFloat(matchingMarket.last);
      setCurrentPrice(price);
      
      if (!isAutoRefresh) {
        // 查找合约数据来获取contractSize
        const contract = contractList.find(c => c.symbol === symbolCode);
        if (contract) {
          const contractSizeValue = parseFloat(contract.contractSize);
          setContractValue(contractSizeValue);
          setSelectedContract(contract);
          
          // 设置杠杆倍数为合约初始杠杆
          setLeverage(contract.initLeverage);
          
          addToLog(`更新交易对 ${symbolCode} 信息:`);
          addToLog(`最新价格: ${price}`);
          addToLog(`面值(contractSize): ${contractSizeValue}`);
          addToLog(`初始杠杆: ${contract.initLeverage}x`);
        }
      } else {
        // 自动刷新时只记录一条简洁的日志
        // addToLog(`自动更新价格: ${price} (${new Date().toLocaleTimeString()})`);
      }
      
      // 无论是自动还是手动，只要价格变化就重新计算所有仓位
      if (positions.length > 0) {
        recalculateAllPositions(isAutoRefresh);
      }
    }
  };

  // 处理合约选择
  const handleContractChange = (e) => {
    const selectedSymbol = e.target.value;
    if (!selectedSymbol) return;
    
    setSymbol(selectedSymbol);
    
    // 更新价格和合约面值
    updatePriceForSelectedContract(selectedSymbol, marketData);
  };
  
  // 处理自动刷新开关
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  // 记录计算过程到日志
  const addToLog = (message) => {
    setLogs(prev => [...prev, message]);
  };

  // 计算特定仓位的未实现盈亏
  const calculateUnrealizedPnL = (pos) => {
    if (pos.closed) return "0.00";
    
    const delta = pos.direction === 'long' 
      ? pos.currentPrice - pos.entryPrice 
      : pos.entryPrice - pos.currentPrice;
    
    return (delta * pos.quantity * contractValue).toFixed(2);
  };

  // 计算所有仓位的DEX
  const calculateAllDEX = (allPositions) => {
    // DEX计算需要考虑所有仓位信息，返回每个仓位对应的DEX值
    const activePositions = allPositions.filter(p => !p.closed);
    
    // 计算总的维持保证金、总手续费和总逐仓保证金
    const totalMaintenanceMargin = activePositions.reduce(
      (sum, p) => sum + parseFloat(p.maintenanceMargin || 0), 0);
    const totalFees = activePositions.reduce(
      (sum, p) => sum + parseFloat(p.openFee || 0), 0);
    const totalIsolatedMargin = activePositions
      .filter(p => p.marginType === 'isolated')
      .reduce((sum, p) => sum + parseFloat(p.margin || 0), 0);
    
    // 计算每个仓位的DEX
    return activePositions.map(pos => {
      // 计算除本仓位外其他仓位的未实现盈亏
      const otherPositionsUnrealizedPnl = activePositions.reduce((sum, p) => {
        if (p !== pos) { // 不同的对象引用
          return sum + parseFloat(p.unrealizedPnl || 0);
        }
        return sum;
      }, 0);
      
      // 当前仓位的DEX
      const dex = currentBalance - totalMaintenanceMargin - totalFees - totalIsolatedMargin + otherPositionsUnrealizedPnl;
      
      return {
        ...pos,
        dex: dex.toFixed(2)
      };
    });
  };

  // 计算爆仓价，基于最新的DEX值
  const calculateLiquidationPrices = (positionsWithDex) => {
    return positionsWithDex.map(pos => {
      const positionValue = parseFloat(pos.positionValue);
      const dex = parseFloat(pos.dex);
      let liquidationPrice;
      
      if (pos.direction === 'long') {
        liquidationPrice = (positionValue - dex) / (pos.quantity * contractValue);
      } else {
        liquidationPrice = (positionValue + dex) / (pos.quantity * contractValue);
      }
      
      return {
        ...pos,
        liquidationPrice: liquidationPrice.toFixed(4)
      };
    });
  };

  // 记录DEX计算过程
  const logDEXCalculation = (pos, allPositions) => {
    addToLog(`DEX计算公式：余额 - 维持保证金之和 - 手续费之和 - 逐仓保证金之和 + 除本交易对以外其他仓位的未实现盈亏之和`);
    
    const activePositions = allPositions.filter(p => !p.closed);
    
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

  const createPosition = () => {
    if (!entryPrice || !quantity) return;
    
    const ep = parseFloat(entryPrice);
    const qty = parseFloat(quantity);
    
    // 详细记录计算过程
    addToLog(`--- 创建新仓位 ---`);
    addToLog(`用户: ${currentUser}`);
    addToLog(`时间: ${currentDateTime} (UTC)`);
    
    const positionValue = qty * contractValue * ep;
    addToLog(`仓位价值计算公式：数量 × 合约面值 × 开仓价`);
    addToLog(`计算过程：${qty} × ${contractValue} × ${ep} = ${positionValue.toFixed(4)}`);
    
    const margin = positionValue / leverage;
    addToLog(`保证金计算公式：仓位价值 ÷ 杠杆`);
    addToLog(`计算过程：${positionValue.toFixed(4)} ÷ ${leverage} = ${margin.toFixed(4)}`);
    
    const openFee = positionValue * feeRate;
    addToLog(`开仓手续费计算公式：仓位价值 × 手续费率`);
    addToLog(`计算过程：${positionValue.toFixed(4)} × ${feeRate} = ${openFee.toFixed(4)}`);
    
    // 计算维持保证金
    const maintenanceMargin = qty * ep * contractValue * maintenanceMarginRate;
    addToLog(`维持保证金计算公式：持仓张数 × 开仓均价 × 面值 × 维持保证金率`);
    addToLog(`计算过程：${qty} × ${ep} × ${contractValue} × ${maintenanceMarginRate} = ${maintenanceMargin.toFixed(4)}`);
    
    // 先计算未实现盈亏
    const delta = direction === 'long' ? currentPrice - ep : ep - currentPrice;
    const unrealizedPnl = (delta * qty * contractValue).toFixed(2);
    
    addToLog(`未实现盈亏计算公式：${direction === 'long' ? '(当前价 - 开仓价)' : '(开仓价 - 当前价)'} × 数量 × 合约面值`);
    addToLog(`计算过程：${direction === 'long' ? `(${currentPrice} - ${ep})` : `(${ep} - ${currentPrice})`} × ${qty} × ${contractValue}`);
    addToLog(`= ${delta.toFixed(4)} × ${qty} × ${contractValue}`);
    addToLog(`= ${unrealizedPnl}`);
    
    // 创建临时仓位
    const newPos = {
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
      openFee: openFee.toFixed(4),
      closeFee: null,
      maintenanceMargin: maintenanceMargin.toFixed(4),
      unrealizedPnl,
      realizedPnl: null,
      createdAt: new Date().toISOString(),
    };
    
    // 注意：开仓时不改变当前余额，只是计算所需的保证金
    addToLog(`开仓操作不改变当前余额，当前余额保持为: ${currentBalance.toFixed(2)}`);
    
    // 获取包括新仓位在内的所有仓位
    const allPositions = [...positions, newPos];
    
    // 计算所有仓位的DEX
    addToLog(`--- 更新所有仓位DEX ---`);
    const positionsWithDex = calculateAllDEX(allPositions);
    
    // 基于更新的DEX计算爆仓价
    addToLog(`--- 计算爆仓价格 ---`);
    const finalPositions = calculateLiquidationPrices(positionsWithDex);
    
    // 找到新创建的仓位
    const createdPos = finalPositions[finalPositions.length - 1];
    
    // 记录新仓位的DEX和爆仓价计算过程
    addToLog(`新仓位DEX值: ${createdPos.dex}`);
    
    // 记录爆仓价计算过程
    if (direction === 'long') {
      addToLog(`多仓爆仓价计算公式：(仓位价值 - DEX) ÷ (持仓张数 × 面值)`);
      addToLog(`计算过程：(${positionValue.toFixed(4)} - ${createdPos.dex}) ÷ (${qty} × ${contractValue})`);
      addToLog(`= ${(positionValue - parseFloat(createdPos.dex)).toFixed(4)} ÷ ${(qty * contractValue).toFixed(4)}`);
      addToLog(`= ${createdPos.liquidationPrice}`);
    } else {
      addToLog(`空仓爆仓价计算公式：(仓位价值 + DEX) ÷ (持仓张数 × 面值)`);
      addToLog(`计算过程：(${positionValue.toFixed(4)} + ${createdPos.dex}) ÷ (${qty} × ${contractValue})`);
      addToLog(`= ${(positionValue + parseFloat(createdPos.dex)).toFixed(4)} ÷ ${(qty * contractValue).toFixed(4)}`);
      addToLog(`= ${createdPos.liquidationPrice}`);
    }
    
    setPositions(finalPositions);
    addToLog(`仓位创建成功: ${symbol} ${translateDirection(direction)} ${qty}张 @${ep}，当前余额保持为 ${currentBalance.toFixed(2)}`);
  };

  const calculatePnL = (ep, mp, qty, dir) => {
    const delta = dir === 'long' ? mp - ep : ep - mp;
    return (delta * qty * contractValue).toFixed(2);
  };
  
  const calculatePnLWithLog = (ep, mp, qty, dir) => {
    const formula = dir === 'long' ? '(当前价 - 开仓价)' : '(开仓价 - 当前价)';
    addToLog(`盈亏计算公式：${formula} × 数量 × 合约面值`);
    
    const delta = dir === 'long' ? mp - ep : ep - mp;
    const pnl = (delta * qty * contractValue).toFixed(2);
    
    addToLog(`计算过程：${dir === 'long' ? `(${mp} - ${ep})` : `(${ep} - ${mp})`} × ${qty} × ${contractValue}`);
    addToLog(`= ${delta.toFixed(4)} × ${qty} × ${contractValue}`);
    addToLog(`= ${pnl}`);
    
    return pnl;
  };

  const recalculateAllPositions = (isAutoRefresh = false) => {
    if (!isAutoRefresh) {
      addToLog(`--- 重新计算所有仓位 ---`);
      addToLog(`用户: ${currentUser}`);
      addToLog(`时间: ${currentDateTime} (UTC)`);
    }
    
    // 重新计算所有仓位的基础值：仓位价值、保证金、手续费、维持保证金和未实现盈亏
    let updatedPositions = positions.map(pos => {
      if (pos.closed) return pos;
      
      if (!isAutoRefresh) {
        addToLog(`重新计算仓位: ${pos.symbol} ${translateDirection(pos.direction)} ${pos.quantity}张 @${pos.entryPrice}`);
      }
      
      const positionValue = pos.quantity * contractValue * pos.entryPrice;
      
      if (!isAutoRefresh) {
        addToLog(`仓位价值计算公式：数量 × 合约面值 × 开仓价`);
        addToLog(`计算过程：${pos.quantity} × ${contractValue} × ${pos.entryPrice} = ${positionValue.toFixed(4)}`);
      }
      
      const margin = positionValue / pos.leverage;
      
      if (!isAutoRefresh) {
        addToLog(`保证金计算公式：仓位价值 ÷ 杠杆`);
        addToLog(`计算过程：${positionValue.toFixed(4)} ÷ ${pos.leverage} = ${margin.toFixed(4)}`);
      }
      
      const openFee = positionValue * feeRate;
      
      if (!isAutoRefresh) {
        addToLog(`开仓手续费计算公式：仓位价值 × 手续费率`);
        addToLog(`计算过程：${positionValue.toFixed(4)} × ${feeRate} = ${openFee.toFixed(4)}`);
      }
      
      // 计算维持保证金
      const maintenanceMargin = pos.quantity * pos.entryPrice * contractValue * maintenanceMarginRate;
      
      if (!isAutoRefresh) {
        addToLog(`维持保证金计算公式：持仓张数 × 开仓均价 × 面值 × 维持保证金率`);
        addToLog(`计算过程：${pos.quantity} × ${pos.entryPrice} × ${contractValue} × ${maintenanceMarginRate} = ${maintenanceMargin.toFixed(4)}`);
      }
      
      // 计算未实现盈亏
      const delta = pos.direction === 'long' ? currentPrice - pos.entryPrice : pos.entryPrice - currentPrice;
      const unrealizedPnl = (delta * pos.quantity * contractValue).toFixed(2);
      
      if (!isAutoRefresh) {
        addToLog(`未实现盈亏计算公式：${pos.direction === 'long' ? '(当前价 - 开仓价)' : '(开仓价 - 当前价)'} × 数量 × 合约面值`);
        addToLog(`计算过程：${pos.direction === 'long' ? `(${currentPrice} - ${pos.entryPrice})` : `(${pos.entryPrice} - ${currentPrice})`} × ${pos.quantity} × ${contractValue}`);
        addToLog(`= ${delta.toFixed(4)} × ${pos.quantity} × ${contractValue}`);
        addToLog(`= ${unrealizedPnl}`);
      }
      
      return {
        ...pos,
        currentPrice,
        positionValue: positionValue.toFixed(4),
        margin: margin.toFixed(2),
        openFee: openFee.toFixed(4),
        maintenanceMargin: maintenanceMargin.toFixed(4),
        unrealizedPnl
      };
    });
    
    // 计算所有仓位的DEX
    if (!isAutoRefresh) {
      addToLog(`--- 更新所有仓位DEX ---`);
    }
    
    const positionsWithDex = calculateAllDEX(updatedPositions);
    
    // 基于更新的DEX计算爆仓价
    if (!isAutoRefresh) {
      addToLog(`--- 计算爆仓价格 ---`);
    }
    
    const finalPositions = calculateLiquidationPrices(positionsWithDex);
    
    // 显示每个仓位的DEX和爆仓价更新
    if (!isAutoRefresh) {
      finalPositions.filter(p => !p.closed).forEach(pos => {
        const positionValue = parseFloat(pos.positionValue);
        
        addToLog(`仓位: ${pos.symbol} ${translateDirection(pos.direction)} ${pos.quantity}张:`);
        addToLog(`  DEX: ${pos.dex}`);
        
        if (pos.direction === 'long') {
          addToLog(`  多仓爆仓价计算: (${positionValue.toFixed(4)} - ${pos.dex}) ÷ (${pos.quantity} × ${contractValue}) = ${pos.liquidationPrice}`);
        } else {
          addToLog(`  空仓爆仓价计算: (${positionValue.toFixed(4)} + ${pos.dex}) ÷ (${pos.quantity} × ${contractValue}) = ${pos.liquidationPrice}`);
        }
      });
    }
    
    setPositions(finalPositions);
  };

  const closePosition = (index) => {
    const closePrice = parseFloat(prompt('请输入平仓价格', currentPrice));
    if (isNaN(closePrice)) return;
    
    const updated = [...positions];
    const pos = updated[index];
    
    // 计算平仓盈亏
    const delta = pos.direction === 'long' ? closePrice - pos.entryPrice : pos.entryPrice - closePrice;
    const pnl = delta * pos.quantity * contractValue;
    
    // 计算平仓手续费
    const closingFee = pos.quantity * contractValue * closePrice * feeRate;
    
    // 平仓后更新当前余额 = 当前余额 + 盈亏 - 开仓手续费 - 平仓手续费
    const openFee = parseFloat(pos.openFee);
    const newBalance = currentBalance + parseFloat(pnl) - openFee - closingFee;
    
    addToLog(`--- 平仓操作 ---`);
    addToLog(`用户: ${currentUser}`);
    addToLog(`时间: ${currentDateTime} (UTC)`);
    addToLog(`仓位: ${pos.symbol} ${translateDirection(pos.direction)} ${pos.quantity}张 @${pos.entryPrice}`);
    addToLog(`平仓价格: ${closePrice}`);
    
    const formula = pos.direction === 'long' ? '(平仓价 - 开仓价)' : '(开仓价 - 平仓价)';
    addToLog(`已实现盈亏计算公式：${formula} × 数量 × 合约面值`);
    addToLog(`计算过程：${pos.direction === 'long' ? `(${closePrice} - ${pos.entryPrice})` : `(${pos.entryPrice} - ${closePrice})`} × ${pos.quantity} × ${contractValue}`);
    addToLog(`= ${delta.toFixed(4)} × ${pos.quantity} × ${contractValue}`);
    addToLog(`= ${pnl.toFixed(2)}`);
    
    addToLog(`开仓手续费计算公式：仓位价值(开仓时) × 手续费率`);
    addToLog(`计算过程：${pos.quantity} × ${contractValue} × ${pos.entryPrice} × ${feeRate} = ${openFee.toFixed(4)}`);
    
    addToLog(`平仓手续费计算公式：仓位价值(平仓时) × 手续费率`);
    addToLog(`计算过程：${pos.quantity} × ${contractValue} × ${closePrice} × ${feeRate} = ${closingFee.toFixed(4)}`);
    
    addToLog(`余额变化计算公式：当前余额 + 盈亏 - 开仓手续费 - 平仓手续费`);
    addToLog(`计算过程：${currentBalance.toFixed(2)} + ${pnl.toFixed(2)} - ${openFee.toFixed(4)} - ${closingFee.toFixed(4)}`);
    addToLog(`= ${currentBalance.toFixed(2)} + ${pnl.toFixed(2)} - ${(openFee + closingFee).toFixed(4)}`);
    addToLog(`= ${newBalance.toFixed(2)}`);
    
    // 更新仓位状态
    pos.closed = true;
    pos.closePrice = closePrice;
    pos.realizedPnl = pnl.toFixed(2);  // 设置已实现盈亏
    pos.unrealizedPnl = "0.00";        // 平仓后未实现盈亏为0
    pos.closeFee = closingFee.toFixed(4);
    pos.closedAt = new Date().toISOString();
    pos.totalFee = (openFee + closingFee).toFixed(4);
    
    setCurrentBalance(newBalance);
    setPositions(updated);
    
    addToLog(`仓位已平仓，新余额: ${newBalance.toFixed(2)}`);
    
    // 平仓后需要重新计算所有仓位的DEX和爆仓价
    addToLog(`--- 平仓后重新计算所有仓位 ---`);
    setTimeout(() => recalculateAllPositions(), 100);
  };

  const deletePosition = (index) => {
    const posToDelete = positions[index];
    addToLog(`--- 删除仓位 ---`);
    addToLog(`用户: ${currentUser}`);
    addToLog(`时间: ${currentDateTime} (UTC)`);
    addToLog(`仓位已删除: ${posToDelete.symbol} ${translateDirection(posToDelete.direction)} ${posToDelete.quantity}张 @${posToDelete.entryPrice}`);
    // 注意：删除仓位不会影响余额，因为开仓时没有实际扣除余额
    const newPositions = positions.filter((_, i) => i !== index);
    setPositions(newPositions);
    
    // 删除仓位后需要重新计算所有仓位的DEX和爆仓价
    addToLog(`--- 删除后重新计算所有仓位 ---`);
    setTimeout(() => {
      if (newPositions.filter(p => !p.closed).length > 0) {
        recalculateAllPositions();
      }
    }, 100);
  };

  // 重置余额为初始余额
  const resetBalance = () => {
    setCurrentBalance(initialBalance);
    addToLog(`余额已重置为初始值: ${initialBalance.toFixed(2)}`);
  };

  // 日志计算功能
  const logCalculation = (type, pos) => {
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
    } else if (type === 'fee') {
      const positionValue = pos.quantity * contractValue * pos.entryPrice;
      
      addToLog(`开仓手续费计算公式：仓位价值 × 手续费率`);
      addToLog(`计算过程：${positionValue.toFixed(4)} × ${feeRate} = ${pos.openFee}`);
      
      if (pos.closed && pos.closeFee) {
        const closingValue = pos.quantity * contractValue * pos.closePrice;
        addToLog(`平仓手续费计算公式：仓位价值(平仓时) × 手续费率`);
        addToLog(`计算过程：${closingValue.toFixed(4)} × ${feeRate} = ${pos.closeFee}`);
        
        addToLog(`总手续费计算公式：开仓手续费 + 平仓手续费`);
        addToLog(`计算过程：${pos.openFee} + ${pos.closeFee} = ${pos.totalFee}`);
      }
    } else if (type === 'positionValue') {
      addToLog(`仓位价值计算公式：数量 × 合约面值 × 开仓价`);
      addToLog(`计算过程：${pos.quantity} × ${contractValue} × ${pos.entryPrice} = ${pos.positionValue}`);
    } else if (type === 'dex') {
      // 显示DEX计算过程
      logDEXCalculation(pos, positions);
    }
  };

  const clearLogs = () => setLogs([]);

  const translateDirection = (dir) => dir === 'long' ? '多单' : '空单';
  const translateMarginType = (type) => type === 'cross' ? '全仓' : '逐仓';

  // 手动刷新价格
  const refreshPrice = async () => {
    addToLog(`--- 手动刷新行情价格 ---`);
    try {
      await fetchMarketData();
      addToLog(`行情价格刷新成功`);
    } catch (error) {
      addToLog(`行情价格刷新失败: ${error.message}`);
    }
  };

  const accountInfo = () => {
    const totalMarginCross = positions.filter(p => p.marginType === 'cross' && !p.closed).reduce((sum, p) => sum + parseFloat(p.margin), 0);
    const totalMarginIsolated = positions.filter(p => p.marginType === 'isolated' && !p.closed).reduce((sum, p) => sum + parseFloat(p.margin), 0);
    const totalMargin = totalMarginCross + totalMarginIsolated;
    const totalOpenFee = positions.filter(p => !p.closed).reduce((sum, p) => sum + parseFloat(p.openFee), 0);
    const totalCloseFee = positions.filter(p => p.closed && p.closeFee).reduce((sum, p) => sum + parseFloat(p.closeFee), 0);
    const totalFee = totalOpenFee + totalCloseFee;
    const totalUnrealizedPnl = positions.filter(p => !p.closed).reduce((sum, p) => sum + parseFloat(p.unrealizedPnl), 0);
    const totalRealizedPnl = positions.filter(p => p.closed && p.realizedPnl).reduce((sum, p) => sum + parseFloat(p.realizedPnl), 0);
    
    // 可用资金 = 当前余额 - 保证金占用
    const availableBalance = currentBalance - totalMargin;
    
    return { 
      totalMarginCross, 
      totalMarginIsolated, 
      totalMargin,
      totalOpenFee,
      totalCloseFee,
      totalFee, 
      totalUnrealizedPnl,
      totalRealizedPnl,
      availableBalance
    };
  };

  const { 
    totalMarginCross, 
    totalMarginIsolated,
    totalMargin,
    totalOpenFee,
    totalCloseFee,
    totalFee, 
    totalUnrealizedPnl,
    totalRealizedPnl,
    availableBalance
  } = accountInfo();

  // 账户指标计算逻辑日志
  const logAccountMetrics = () => {
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
      <div className="container mx-auto max-w-[1680px] p-4">
  {/* 顶部基础参数设置区 */}
  <div className="grid grid-cols-12 gap-4 bg-gray-100 p-4 rounded mb-4">
    <div className="col-span-2">
      <label className="block mb-1">交易对</label>
      <div className="flex gap-2">
        <select
          value={symbol}
          onChange={handleContractChange}
          className="w-full p-2 border rounded"
          disabled={isLoading}
        >
          <option value="">选择交易对</option>
          {contractList.map(contract => (
            <option key={contract.id} value={contract.symbol}>
              {contract.enName} ({contract.baseCoin}/{contract.quoteCoin})
            </option>
          ))}
        </select>
        <button 
          onClick={refreshPrice} 
          className="bg-gray-300 px-2 py-1 rounded hover:bg-gray-400"
          disabled={isLoading}
        >
          {isLoading ? "加载中..." : "刷新"}
        </button>
      </div>
    </div>
    <div className="col-span-2">
      <label className="block mb-1">当前价格</label>
      <div className="flex flex-col gap-1">
        <div className="flex gap-2">
          <input 
            type="number" 
            value={currentPrice} 
            onChange={e => setCurrentPrice(parseFloat(e.target.value))} 
            className="w-full p-2 border rounded" 
            disabled={autoRefresh}
          />
          <button 
            onClick={refreshPrice} 
            className="bg-gray-300 px-2 py-1 rounded hover:bg-gray-400"
            disabled={autoRefresh || isLoading}
          >
            刷新价格
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={toggleAutoRefresh} 
              className="mr-1"
            />
            自动刷新
          </label>
          {autoRefresh && (
            <span className="text-green-600">
              {lastUpdated ? `最后更新: ${lastUpdated}` : "准备更新..."}
            </span>
          )}
        </div>
      </div>
    </div>
    <div className="col-span-2">
      <label className="block mb-1">维持保证金率</label>
      <input 
        type="number" 
        value={maintenanceMarginRate} 
        onChange={e => setMaintenanceMarginRate(parseFloat(e.target.value))} 
        className="w-full p-2 border rounded"
        onClick={() => addToLog(`维持保证金率设置为 ${maintenanceMarginRate} (${maintenanceMarginRate*100}%)`)}
      />
    </div>
    <div className="col-span-2">
      <label className="block mb-1">合约面值</label>
      <input 
        type="number" 
        value={contractValue} 
        onChange={e => setContractValue(parseFloat(e.target.value))} 
        className="w-full p-2 border rounded" 
        placeholder="0.0001"
        onClick={() => addToLog(`合约面值设置为 ${contractValue}`)}
      />
    </div>
    <div className="col-span-2">
      <label className="block mb-1">初始余额</label>
      <input 
        type="number" 
        value={initialBalance} 
        onChange={e => setInitialBalance(parseFloat(e.target.value))} 
        className="w-full p-2 border rounded"
        onClick={() => addToLog(`初始余额设置为 ${initialBalance}`)}
      />
    </div>
    <div className="col-span-2">
      <label className="block mb-1">手续费率</label>
      <input 
        type="number" 
        value={feeRate} 
        onChange={e => setFeeRate(parseFloat(e.target.value))} 
        className="w-full p-2 border rounded"
        onClick={() => addToLog(`手续费率设置为 ${feeRate} (${feeRate*100}%)`)}
      />
    </div>
    <div className="col-span-12 mt-4 flex space-x-4">
      <button 
        onClick={() => {
          addToLog(`--- 触发参数更改重新计算 ---`);
          recalculateAllPositions();
        }} 
        className="bg-blue-500 text-white px-6 py-2 rounded"
      >
        重新计算
      </button>
      <button 
        onClick={resetBalance} 
        className="bg-yellow-500 text-white px-6 py-2 rounded"
      >
        重置余额
      </button>
    </div>
  </div>

  {/* 仓位创建区 */}
  <div className="grid grid-cols-12 gap-4 bg-white p-4 border rounded mb-4">
    <div className="col-span-12">
      <h3 className="text-lg font-bold mb-2">新增仓位</h3>
    </div>
    <div className="col-span-2">
      <label className="block mb-1">开仓价格</label>
      <input type="number" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} className="w-full p-2 border rounded" />
    </div>
    <div className="col-span-2">
      <label className="block mb-1">张数</label>
      <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full p-2 border rounded" />
    </div>
    <div className="col-span-2">
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
    <div className="col-span-2">
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
    <div className="col-span-2">
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
    <div className="col-span-2 flex items-end">
      <button 
        onClick={createPosition} 
        className="bg-green-600 text-white px-6 py-2 rounded w-full"
        disabled={!entryPrice || !quantity}
      >
        创建持仓
      </button>
    </div>
  </div>
  
  {/* 账户信息和持仓列表 */}
  <div className="grid grid-cols-12 gap-4">
    <div className="col-span-3 bg-white p-4 border rounded mb-4 h-fit">
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
        <div className="cursor-pointer" onClick={() => {
          addToLog(`总保证金占用计算公式：全仓保证金 + 逐仓保证金`);
          addToLog(`计算过程：${totalMarginCross.toFixed(2)} + ${totalMarginIsolated.toFixed(2)} = ${totalMargin.toFixed(2)}`);
        }}>
          总保证金占用：<span className="text-blue-500 hover:underline">{totalMargin.toFixed(2)}</span>
        </div>
        <div className="cursor-pointer" onClick={() => {
          addToLog(`可用资金计算公式：当前余额 - 总保证金占用`);
          addToLog(`计算过程：${currentBalance.toFixed(2)} - ${totalMargin.toFixed(2)} = ${availableBalance.toFixed(2)}`);
        }}>
          可用资金：<span className="text-blue-500 hover:underline">{availableBalance.toFixed(2)}</span>
        </div>
        <div className="cursor-pointer" onClick={() => addToLog(`开仓手续费总和 = ${totalOpenFee.toFixed(4)}`)}>
          开仓手续费总和：<span className="text-blue-500 hover:underline">{totalOpenFee.toFixed(4)}</span>
        </div>
        <div className="cursor-pointer" onClick={() => addToLog(`平仓手续费总和 = ${totalCloseFee.toFixed(4)}`)}>
          平仓手续费总和：<span className="text-blue-500 hover:underline">{totalCloseFee.toFixed(4)}</span>
        </div>
        <div className="cursor-pointer" onClick={() => {
          addToLog(`手续费总和计算公式：开仓手续费总和 + 平仓手续费总和`);
          addToLog(`计算过程：${totalOpenFee.toFixed(4)} + ${totalCloseFee.toFixed(4)} = ${totalFee.toFixed(4)}`);
        }}>
          手续费总和：<span className="text-blue-500 hover:underline">{totalFee.toFixed(4)}</span>
        </div>
        <div className="cursor-pointer" onClick={() => addToLog(`未实现盈亏总和 = ${totalUnrealizedPnl.toFixed(2)}`)}>
          未实现盈亏总和：<span className="text-blue-500 hover:underline">{totalUnrealizedPnl.toFixed(2)}</span>
        </div>
        <div className="cursor-pointer" onClick={() => addToLog(`已实现盈亏总和 = ${totalRealizedPnl.toFixed(2)}`)}>
          已实现盈亏总和：<span className="text-blue-500 hover:underline">{totalRealizedPnl.toFixed(2)}</span>
        </div>
        <div className="text-right mt-2">
          <span className="text-xs text-gray-500">当前用户: {currentUser}</span><br/>
          <span className="text-xs text-gray-500">当前时间: {currentDateTime}</span>
        </div>
        <button onClick={logAccountMetrics} className="mt-2 bg-blue-500 text-white px-4 py-2 rounded">
          显示全部计算过程
        </button>
      </div>
    </div>

    <div className="col-span-9 bg-white p-4 border rounded overflow-auto">
      <h3 className="text-lg font-bold mb-4">持仓列表</h3>
      <div className="w-full overflow-x-auto">
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
              <th className="p-2 border">维持保证金</th>
              <th className="p-2 border">DEX</th>
              <th className="p-2 border">未实现盈亏</th>
              <th className="p-2 border">已实现盈亏</th>
              <th className="p-2 border">张数</th>
              <th className="p-2 border">保证金</th>
              <th className="p-2 border">手续费</th>
              <th className="p-2 border">操作</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos, idx) => (
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
                  onClick={() => logCalculation('liq', pos)}
                >
                  {pos.liquidationPrice}
                </td>
                <td 
                  className="p-2 border text-blue-500 text-center cursor-pointer hover:underline" 
                  onClick={() => logCalculation('maintenanceMargin', pos)}
                >
                  {pos.maintenanceMargin}
                </td>
                <td 
                  className="p-2 border text-blue-500 text-center cursor-pointer hover:underline" 
                  onClick={() => logCalculation('dex', pos)}
                >
                  {pos.dex}
                </td>
                <td className="p-2 border text-blue-500 text-center cursor-pointer hover:underline" onClick={() => logCalculation('unrealizedPnl', pos)}>
                  {pos.unrealizedPnl}
                </td>
                <td className="p-2 border text-center">
                  {pos.realizedPnl ? (
                    <span className={`text-blue-500 hover:underline cursor-pointer ${parseFloat(pos.realizedPnl) >= 0 ? 'text-green-500' : 'text-red-500'}`} onClick={() => logCalculation('realizedPnl', pos)}>
                      {parseFloat(pos.realizedPnl) >= 0 ? '+' : ''}{pos.realizedPnl}
                    </span>
                  ) : "-"}
                </td>
                <td className="p-2 border text-center">{pos.quantity}</td>
                <td className="p-2 border text-center cursor-pointer text-blue-500 hover:underline" onClick={() => logCalculation('margin', pos)}>
                  {pos.margin}
                </td>
                <td className="p-2 border text-center cursor-pointer text-blue-500 hover:underline" onClick={() => logCalculation('fee', pos)}>
                  {pos.closed ? pos.totalFee : pos.openFee}
                </td>
                <td className="p-2 border text-center">
                  {pos.closed ? (
                    <span className="text-gray-400">
                      已平仓@{pos.closePrice}
                    </span>
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
  </div>

  {/* 日志控制台 */}
  <div className="mt-4 bg-black text-green-400 p-4 rounded font-mono text-sm h-[300px]">
    <div className="flex justify-between items-center mb-2">
      <strong>计算日志:</strong>
      <button onClick={clearLogs} className="bg-gray-700 text-white px-2 py-1 rounded">清空日志</button>
    </div>
    <div className="h-[250px] overflow-y-auto">
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
</div>
    </>
  );
}
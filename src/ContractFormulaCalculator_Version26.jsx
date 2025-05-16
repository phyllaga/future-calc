import React, { useState, useEffect, useRef } from 'react';
import contractsData from './ContractsData.json';
import { calculateAccountInfo, translateDirection, translateMarginType } from './CalculationUtils';
import { createNewPosition, closePosition, recalculateAllPositions } from './PositionHandlers';
import { logBalanceHistory, logCalculation, logAccountMetrics } from './LoggingUtils';

/**
 * 合约计算器主组件
 */
export default function ContractFormulaCalculator() {
  // 基本参数状态
  const [symbol, setSymbol] = useState('btc_usdt');
  const [currentPrice, setCurrentPrice] = useState(20000);
  const [maintenanceMarginRate, setMaintenanceMarginRate] = useState(0.005);
  const [contractValue, setContractValue] = useState(0.0001);
  const [initialBalance, setInitialBalance] = useState(1000);
  const [currentBalance, setCurrentBalance] = useState(1000);
  const [feeRate, setFeeRate] = useState(0.0004);
  
  // 仓位相关状态
  const [entryPrice, setEntryPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [direction, setDirection] = useState('long');
  const [leverage, setLeverage] = useState(10);
  const [marginType, setMarginType] = useState('cross');
  const [positions, setPositions] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // 自动刷新相关状态
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contractList, setContractList] = useState([]);
  const [marketData, setMarketData] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  
  // 自动刷新定时器引用
  const refreshTimerRef = useRef(null);

  // 当前日期和时间，用户名
  const currentDateTime = "2025-05-16 03:17:58";
  const currentUser = "phyllaga";

  // 添加日志
  const addToLog = (message) => {
    setLogs(prev => [...prev, message]);
  };

  // 初始化合约列表
  useEffect(() => {
    setContractList(contractsData);
    fetchMarketData();
  }, []);

  // 自动刷新价格定时器
  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    if (autoRefresh) {
      addToLog(`--- 已开启自动刷新价格 (每秒) ---`);
      refreshTimerRef.current = setInterval(() => {
        fetchMarketData(true);
      }, 1000);
    } else if (refreshTimerRef.current) {
      addToLog(`--- 已关闭自动刷新价格 ---`);
    }
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh]);

  // 参数变化时重新计算
  useEffect(() => {
    recalculatePositions();
  }, [currentPrice, maintenanceMarginRate, feeRate]);
  
  // 初始余额更改时，保持当前余额与初始余额一致（仅用于初始设置）
  useEffect(() => {
    if (positions.length === 0) {
      setCurrentBalance(initialBalance);
    }
  }, [initialBalance]);

  // 获取行情数据
  const fetchMarketData = async (isAutoRefresh = false) => {
    if (!isAutoRefresh) {
      setIsLoading(true);
      addToLog(`--- 正在获取行情数据 ---`);
    }
    
    try {
      const response = await fetch('https://mgbx.com/futures/fapi/market/v1/public/m/allticker');
      const data = await response.json();
      
      if (data && data.data && Array.isArray(data.data)) {
        setMarketData(data.data);
        
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        setLastUpdated(timeString);
        
        if (!isAutoRefresh) {
          addToLog(`成功获取 ${data.data.length} 个交易对行情数据`);
        }
        
        if (selectedContract) {
          updatePriceForSelectedContract(selectedContract.symbol, data.data, isAutoRefresh);
        }
      }
    } catch (error) {
      if (!isAutoRefresh) {
        addToLog(`获取行情数据失败: ${error.message}`);
      }
    }
    
    if (!isAutoRefresh) {
      setIsLoading(false);
    }
  };
  
  // 更新所选合约的价格和合约面值
  const updatePriceForSelectedContract = (symbolCode, marketDataArray, isAutoRefresh = false) => {
    const matchingMarket = marketDataArray.find(item => item.symbol === symbolCode);
    
    if (matchingMarket) {
      const price = parseFloat(matchingMarket.last);
      setCurrentPrice(price);
      
      if (!isAutoRefresh) {
        const contract = contractList.find(c => c.symbol === symbolCode);
        if (contract) {
          const contractSizeValue = parseFloat(contract.contractSize);
          setContractValue(contractSizeValue);
          setSelectedContract(contract);
          setLeverage(contract.initLeverage);
          
          addToLog(`更新交易对 ${symbolCode} 信息:`);
          addToLog(`最新价格: ${price}`);
          addToLog(`面值(contractSize): ${contractSizeValue}`);
          addToLog(`初始杠杆: ${contract.initLeverage}x`);
        }
      }
      
      if (positions.length > 0) {
        recalculatePositions(isAutoRefresh);
      }
    }
  };

  // 处理合约选择
  const handleContractChange = (e) => {
    const selectedSymbol = e.target.value;
    if (!selectedSymbol) return;
    
    setSymbol(selectedSymbol);
    updatePriceForSelectedContract(selectedSymbol, marketData);
  };
  
  // 处理自动刷新开关
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  // 重新计算所有仓位
  const recalculatePositions = (isAutoRefresh = false) => {
    const updatedPositions = recalculateAllPositions({
      positions,
      currentPrice,
      contractValue,
      feeRate,
      maintenanceMarginRate,
      currentBalance,
      addToLog,
      currentUser,
      currentDateTime,
      isAutoRefresh
    });
    
    setPositions(updatedPositions);
  };

  // 创建仓位
  const createPosition = () => {
    if (!entryPrice || !quantity) return;
    
    const newPos = createNewPosition({
      symbol,
      direction, 
      entryPrice,
      quantity,
      currentPrice,
      leverage,
      marginType,
      contractValue,
      feeRate,
      maintenanceMarginRate,
      addToLog,
      currentDateTime,
      currentUser
    });
    
    // 获取包括新仓位在内的所有仓位
    const allPositions = [...positions, newPos];
    
    // 计算所有仓位的DEX和爆仓价
    const finalPositions = recalculateAllPositions({
      positions: allPositions,
      currentPrice,
      contractValue,
      feeRate,
      maintenanceMarginRate,
      currentBalance,
      addToLog,
      currentUser,
      currentDateTime
    });
    
    setPositions(finalPositions);
    addToLog(`仓位创建成功: ${symbol} ${translateDirection(direction)} ${quantity}张 @${entryPrice}，当前余额保持为 ${currentBalance.toFixed(2)}`);
    
    // 清空输入框
    setEntryPrice('');
    setQuantity('');
  };

  // 平仓操作
  const handleClosePosition = (index) => {
    const closePrice = parseFloat(prompt('请输入平仓价格', currentPrice));
    if (isNaN(closePrice)) return;
    
    const { updatedPositions, newBalance } = closePosition({
      position: positions[index],
      index,
      closePrice,
      positions,
      currentBalance,
      contractValue,
      feeRate,
      addToLog,
      currentUser,
      currentDateTime
    });
    
    setCurrentBalance(newBalance);
    setPositions(updatedPositions);
    
    // 平仓后需要重新计算所有仓位的DEX和爆仓价
    addToLog(`--- 平仓后重新计算所有仓位 ---`);
    setTimeout(() => recalculatePositions(), 100);
  };

  // 删除仓位
  const deletePosition = (index) => {
    const posToDelete = positions[index];
    addToLog(`--- 删除仓位 ---`);
    addToLog(`用户: ${currentUser}`);
    addToLog(`时间: ${currentDateTime} (UTC)`);
    addToLog(`仓位已删除: ${posToDelete.symbol} ${translateDirection(posToDelete.direction)} ${posToDelete.quantity}张 @${posToDelete.entryPrice}`);
    
    const newPositions = positions.filter((_, i) => i !== index);
    setPositions(newPositions);
    
    // 删除仓位后需要重新计算所有仓位的DEX和爆仓价
    addToLog(`--- 删除后重新计算所有仓位 ---`);
    setTimeout(() => {
      if (newPositions.filter(p => !p.closed).length > 0) {
        recalculatePositions();
      }
    }, 100);
  };

  // 重置余额为初始余额
  const resetBalance = () => {
    setCurrentBalance(initialBalance);
    addToLog(`余额已重置为初始值: ${initialBalance.toFixed(2)}`);
  };

  // 清空日志
  const clearLogs = () => setLogs([]);

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

  // 处理账户信息计算
  const handleAccountMetrics = () => {
    const accountInfo = calculateAccountInfo(positions, initialBalance, currentBalance);
    
    logAccountMetrics({
      positions,
      initialBalance,
      currentBalance,
      currentUser,
      currentDateTime,
      ...accountInfo,
      contractValue,
      addToLog,
      logBalanceHistoryFn: (positions, initialBalance, currentBalance, addToLog) => 
        logBalanceHistory(positions, initialBalance, currentBalance, addToLog)
    });
  };

  // 处理余额历史记录
  const handleLogBalanceHistory = () => {
    logBalanceHistory(positions, initialBalance, currentBalance, addToLog);
  };

  // 处理计算日志
  const handleLogCalculation = (type, pos) => {
    logCalculation(
      type, pos, currentPrice, contractValue, feeRate,
      maintenanceMarginRate, positions, addToLog, currentUser, currentDateTime
    );
  };

  // 获取当前账户信息
  const accountInfo = calculateAccountInfo(positions, initialBalance, currentBalance);
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
  } = accountInfo;

  return (
    <div className="w-full min-w-full p-4 md:p-6">
      {/* 顶部基础参数设置区 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-4 bg-gray-100 p-4 md:p-5 rounded-lg mb-6 w-full">
        <div className="col-span-1 lg:col-span-1">
          <label className="block mb-2 text-md">交易对</label>
          <div className="flex gap-2">
            <select
              value={symbol}
              onChange={handleContractChange}
              className="w-full p-2 border rounded-md"
              disabled={isLoading}
            >
              <option value="">选择交易对</option>
              {contractList.map(contract => (
                <option key={contract.id} value={contract.symbol}>
                  {contract.enName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="col-span-1 lg:col-span-1">
          <label className="block mb-2 text-md">当前价格</label>
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <input 
                type="number" 
                value={currentPrice} 
                onChange={e => setCurrentPrice(parseFloat(e.target.value))} 
                className="w-full p-2 border rounded-md" 
                disabled={autoRefresh}
              />
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
                <span className="text-green-600 text-xs">
                  {lastUpdated ? `${lastUpdated}` : "准备更新..."}
                </span>
              )}
            </div>
          </div>
        </div>
        <div
/**
 * LoggingUtils.js - 合约计算器日志处理工具
 * 最后更新: 2025-05-16 09:09:48
 */

// 使用可能与原代码兼容的方式存储日志
let logs = window.calculatorLogs || [];
window.calculatorLogs = logs;  // 确保日志可全局访问

// 全局默认设置
const DEFAULT_USER = 'phyllaga';
const DEFAULT_DATETIME = '2025-05-16 09:09:48';

// 存储当前用户和时间
let currentUser = DEFAULT_USER;
let currentDateTime = DEFAULT_DATETIME;

/**
 * 更新当前日期时间为UTC格式
 * @returns {string} 格式化的UTC日期时间字符串
 */
const updateCurrentDateTime = () => {
  const now = new Date();
  // 格式化为 YYYY-MM-DD HH:MM:SS (UTC)
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');

  currentDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  return currentDateTime;
};

/**
 * 设置当前用户
 * @param {string} username - 用户名
 */
const setUser = (username) => {
  currentUser = username || DEFAULT_USER;
};

/**
 * 添加日志条目 - 兼容原始实现
 * @param {string} message - 日志消息
 * @param {boolean} includeTimestamp - 是否包含时间戳，默认true
 * @param {boolean} includeUser - 是否包含用户名，默认true
 * @returns {object} 添加的日志条目
 */
const addToLog = (message, includeTimestamp = true, includeUser = true) => {
  console.log("Adding to log:", message); // 调试输出

  const logEntry = {
    id: Date.now() + Math.random().toString(36).substring(2, 10),
    message,
    timestamp: includeTimestamp ? currentDateTime : null,
    user: includeUser ? currentUser : null
  };

  logs.push(logEntry);

  // 触发自定义事件通知日志更新
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('logsUpdated', { detail: { logs } });
    window.dispatchEvent(event);
  }

  return logEntry;
};

/**
 * 添加合约计算日志，特别针对仓位合并计算
 * 注意：此函数与原logMergedPositionCalculation功能相同
 * @param {Array} positions - 仓位数组
 * @param {string} symbol - 交易对符号
 * @param {string} marginType - 保证金类型 ('cross' 或 'isolated')
 * @param {number} contractValue - 合约面值
 */
const logPositionMergeCalculation = (positions, symbol, marginType, contractValue) => {
  // 过滤活跃仓位
  const activePositions = positions.filter(p => p.status !== 'closed' && p.symbol === symbol);

  // 初始化计算变量
  let longQuantity = 0;
  let shortQuantity = 0;
  let longValue = 0;
  let shortValue = 0;

  // 开始日志记录
  addToLog(`--- ${symbol} ${marginType === 'cross' ? '全仓' : '逐仓'}仓位合并计算 ---`);

  // 记录各个仓位详情 - 修正了日志显示，包含合约面值
  activePositions.forEach((pos, idx) => {
    const posValue = parseFloat(pos.quantity) * contractValue * parseFloat(pos.entryPrice);

    if (pos.direction === 'long') {
      addToLog(`[多仓 ${idx+1}] ${pos.quantity}张 × ${contractValue} × ${pos.entryPrice} = ${posValue.toFixed(4)}`);
      longQuantity += parseFloat(pos.quantity);
      longValue += posValue;
    } else {
      addToLog(`[空仓 ${idx+1}] ${pos.quantity}张 × ${contractValue} × ${pos.entryPrice} = ${posValue.toFixed(4)}`);
      shortQuantity += parseFloat(pos.quantity);
      shortValue += posValue;
    }
  });

  addToLog("");
  addToLog(`多仓总量: ${longQuantity}张, 价值: ${longValue.toFixed(4)}`);
  addToLog(`空仓总量: ${shortQuantity}张, 价值: ${shortValue.toFixed(4)}`);

  // 计算净仓位
  const netQuantity = Math.abs(longQuantity - shortQuantity);
  const netDirection = longQuantity >= shortQuantity ? 'long' : 'short';

  addToLog(`净仓位: ${netQuantity}张 (${netDirection === 'long' ? '多' : '空'}方向)`);
  addToLog("");

  // 计算平均价格 - 确保合约面值正确应用
  let averagePrice = 0;
  if (netQuantity > 0) {
    if (netDirection === 'long') {
      // 确保平均价格计算中正确考虑了合约面值
      averagePrice = (longValue - shortValue) / (netQuantity * contractValue);
      addToLog(`合并后计算公式: (多仓价值 - 空仓价值) ÷ 净多仓量 ÷ 合约面值`);
      addToLog(`计算过程: (${longValue.toFixed(4)} - ${shortValue.toFixed(4)}) ÷ ${netQuantity} ÷ ${contractValue}`);
      addToLog(`= ${(longValue - shortValue).toFixed(4)} ÷ ${netQuantity} ÷ ${contractValue}`);
      addToLog(`= ${averagePrice.toFixed(4)}`);
    } else {
      averagePrice = (shortValue - longValue) / (netQuantity * contractValue);
      addToLog(`合并后计算公式: (空仓价值 - 多仓价值) ÷ 净空仓量 ÷ 合约面值`);
      addToLog(`计算过程: (${shortValue.toFixed(4)} - ${longValue.toFixed(4)}) ÷ ${netQuantity} ÷ ${contractValue}`);
      addToLog(`= ${(shortValue - longValue).toFixed(4)} ÷ ${netQuantity} ÷ ${contractValue}`);
      addToLog(`= ${averagePrice.toFixed(4)}`);
    }
  }

  // 计算保证金总和
  const totalMargin = activePositions.reduce((sum, pos) => sum + parseFloat(pos.margin || 0), 0);
  const netPositionValue = netQuantity * contractValue * averagePrice;

  // 显示合并后结果
  addToLog("");
  addToLog(`合并后仓位: ${netQuantity}张 ${netDirection === 'long' ? '多单' : '空单'} @${averagePrice.toFixed(4)}`);
  addToLog(`保证金总和: ${totalMargin.toFixed(2)}`);
  addToLog(`仓位价值: ${netPositionValue.toFixed(4)} (${netQuantity}张 × ${contractValue} × ${averagePrice.toFixed(4)})`);

  // 计算实际杠杆
  const actualLeverage = netPositionValue / totalMargin;
  addToLog(`实际杠杆: ${actualLeverage.toFixed(2)}x (${netPositionValue.toFixed(4)} ÷ ${totalMargin.toFixed(2)})`);

  // 添加时间和用户信息
  addToLog(`用户: ${currentUser}`);
  addToLog(`时间: ${currentDateTime} (UTC)`);
};

// 其余函数代码保持不变...

// 确保导出所有必要的函数
export {
  addToLog,
  setUser,
  updateCurrentDateTime,
  getLogs,
  clearLogs,
  initLogging,
  logPositionMergeCalculation,
  logMergedPositionCalculation,  // 导出别名以兼容现有代码
  logCalculation,
  logDEXCalculation
};
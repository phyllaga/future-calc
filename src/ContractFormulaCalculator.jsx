import React, { useState, useEffect, useRef } from 'react';
import './WebSocketClient.css';

function WebSocketClient() {
  // 状态管理
  const [serverUrl, setServerUrl] = useState('ws://8.210.67.97:30322/Push/');
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [subscribeSymbols, setSubscribeSymbols] = useState('');
  const [marketData, setMarketData] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('未连接');

  // WebSocket引用
  const wsRef = useRef(null);
  // 心跳定时器引用
  const heartbeatRef = useRef(null);
  // 自动重连定时器引用
  const reconnectTimerRef = useRef(null);
  // 日志区域引用
  const logContainerRef = useRef(null);

  // 连接WebSocket
  const connectWebSocket = () => {
    if (!appId || !appSecret) {
      addLog('错误', 'AppID和AppSecret不能为空');
      return;
    }

    if (!serverUrl) {
      addLog('错误', '服务器地址不能为空');
      return;
    }

    // 清除之前的连接
    if (wsRef.current) {
      wsRef.current.close();
    }

    // 清除之前的定时器
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    try {
      // 构建完整的WebSocket URL
      const wsUrl = `${serverUrl}${appId}/${appSecret}`.replace(/([^:]\/)\/+/g, "$1");
      addLog('信息', `正在连接: ${wsUrl}`);
      setConnectionStatus('连接中...');

      wsRef.current = new WebSocket(wsUrl);

      // 连接建立
      wsRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('已连接');
        addLog('成功', '连接成功');

        // 设置心跳包
        heartbeatRef.current = setInterval(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            sendHeartbeat();
          }
        }, 25000); // 每25秒发送一次心跳
      };

      // 接收消息
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // 处理不同类型的消息
          if (data.code) {
            // 系统消息
            addLog(data.code === 200 ? '成功' : '错误', data.message);
          } else if (data.action === 'O') {
            // 行情数据
            handleMarketData(data);
          }
        } catch (err) {
          addLog('错误', `消息解析失败: ${err.message}`);
          console.log('原始消息:', event.data);
        }
      };

      // 连接关闭
      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        setConnectionStatus('连接已断开');
        addLog('警告', `连接关闭: Code=${event.code}, Reason=${event.reason || '未知原因'}`);

        // 清除心跳
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }

        // 尝试重新连接
        if (!reconnectTimerRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            addLog('信息', '尝试重新连接...');
            connectWebSocket();
            reconnectTimerRef.current = null;
          }, 5000); // 5秒后重试
        }
      };

      // 连接错误
      wsRef.current.onerror = (error) => {
        setConnectionStatus('连接错误');
        addLog('错误', `WebSocket错误: ${error.message || '未知错误'}`);
        console.error('WebSocket错误:', error);
      };

    } catch (error) {
      setConnectionStatus('连接失败');
      addLog('错误', `连接失败: ${error.message}`);
      console.error('连接失败:', error);
    }
  };

  // 处理行情数据
  const handleMarketData = (data) => {
    if (data.action === 'O' && data.data) {
      try {
        // 解析行情数据
        const parts = data.data.split('|');
        if (parts.length >= 4) {
          const market = parts[0];
          const securityType = parts[1];
          const timestamp = parts[2];
          const symbol = parts[3];

          // 处理剩余的价格和数量数据
          const prices = parts.slice(4);

          // 构建行情对象
          const quote = {
            timestamp: new Date(parseInt(timestamp) * 1000).toLocaleString(),
            ask1: prices[0] || 'N/A',
            askVol1: prices[1] || 'N/A',
            ask2: prices[2] || 'N/A',
            askVol2: prices[3] || 'N/A',
            ask3: prices[4] || 'N/A',
            askVol3: prices[5] || 'N/A',
            bid1: prices[6] || 'N/A',
            bidVol1: prices[7] || 'N/A',
            bid2: prices[8] || 'N/A',
            bidVol2: prices[9] || 'N/A',
            bid3: prices[10] || 'N/A',
            bidVol3: prices[11] || 'N/A',
            // 创建一个完整的标识符
            fullSymbol: `${market}|${securityType}|O|${symbol}`
          };

          // 更新市场数据
          setMarketData(prevData => ({
            ...prevData,
            [quote.fullSymbol]: quote
          }));

          // 添加一个简短的日志
          addLog('数据', `收到${symbol}行情更新`);
        }
      } catch (err) {
        addLog('错误', `行情数据解析失败: ${err.message}`);
        console.error('行情数据解析失败:', err, data);
      }
    }
  };

  // 发送订阅请求
  const sendSubscribe = () => {
    if (!isConnected) {
      addLog('警告', '请先连接WebSocket');
      return;
    }

    if (!subscribeSymbols) {
      addLog('警告', '请输入要订阅的股票代码');
      return;
    }

    const message = {
      action: 'SUBSCRIBE',
      symbols: subscribeSymbols
    };

    try {
      wsRef.current.send(JSON.stringify(message));
      addLog('信息', `已发送订阅请求: ${subscribeSymbols}`);
    } catch (error) {
      addLog('错误', `订阅失败: ${error.message}`);
    }
  };

  // 取消订阅
  const sendUnsubscribe = () => {
    if (!isConnected) {
      addLog('警告', '请先连接WebSocket');
      return;
    }

    if (!subscribeSymbols) {
      addLog('警告', '请输入要取消订阅的股票代码');
      return;
    }

    const message = {
      action: 'DELSUBSCRIBE',
      symbols: subscribeSymbols
    };

    try {
      wsRef.current.send(JSON.stringify(message));
      addLog('信息', `已发送取消订阅请求: ${subscribeSymbols}`);
    } catch (error) {
      addLog('错误', `取消订阅失败: ${error.message}`);
    }
  };

  // 发送心跳
  const sendHeartbeat = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ action: 'PING' }));
        addLog('心跳', '已发送心跳包');
      } catch (error) {
        addLog('错误', `心跳发送失败: ${error.message}`);
      }
    }
  };

  // 断开连接
  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
      setConnectionStatus('已断开');
      addLog('信息', '已主动断开连接');
    }

    // 清除定时器
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  // 添加日志
  const addLog = (type, message) => {
    const timestamp = new Date().toLocaleTimeString();
    setMessages(prev => [...prev, { type, message, timestamp }]);

    // 滚动到底部
    setTimeout(() => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  // 清空日志
  const clearLogs = () => {
    setMessages([]);
  };

  // 清空行情数据
  const clearMarketData = () => {
    setMarketData({});
    addLog('信息', '已清空行情数据');
  };

  // 在组件卸载时清理资源
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  return (
      <div className="ws-client-container">
        <h1>WebSocket行情订阅工具</h1>

        <div className="connection-panel">
          <div className="form-group">
            <label>服务器地址:</label>
            <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="WebSocket服务器地址"
                disabled={isConnected}
            />
          </div>

          <div className="form-group">
            <label>App ID:</label>
            <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="输入AppID"
                disabled={isConnected}
            />
          </div>

          <div className="form-group">
            <label>App Secret:</label>
            <input
                type="password"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                placeholder="输入AppSecret"
                disabled={isConnected}
            />
          </div>

          <div className="connection-actions">
            {!isConnected ? (
                <button
                    className="connect-button"
                    onClick={connectWebSocket}
                    disabled={!appId || !appSecret || !serverUrl}
                >
                  连接
                </button>
            ) : (
                <button
                    className="disconnect-button"
                    onClick={disconnect}
                >
                  断开连接
                </button>
            )}
            <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              {connectionStatus}
            </div>
          </div>
        </div>

        <div className="subscription-panel">
          <div className="form-group">
            <label>订阅代码:</label>
            <input
                type="text"
                value={subscribeSymbols}
                onChange={(e) => setSubscribeSymbols(e.target.value)}
                placeholder="格式: INDEX|2|O|AUS200,INDEX|2|O|CN50"
                disabled={!isConnected}
            />
          </div>

          <div className="subscription-actions">
            <button
                className="subscribe-button"
                onClick={sendSubscribe}
                disabled={!isConnected || !subscribeSymbols}
            >
              订阅
            </button>
            <button
                className="unsubscribe-button"
                onClick={sendUnsubscribe}
                disabled={!isConnected || !subscribeSymbols}
            >
              取消订阅
            </button>
            <button
                className="heartbeat-button"
                onClick={sendHeartbeat}
                disabled={!isConnected}
            >
              发送心跳
            </button>
          </div>
        </div>

        <div className="data-display">
          <div className="market-data">
            <div className="section-header">
              <h2>行情数据</h2>
              <button
                  className="clear-data"
                  onClick={clearMarketData}
                  disabled={Object.keys(marketData).length === 0}
              >
                清空数据
              </button>
            </div>

            {Object.keys(marketData).length === 0 ? (
                <div className="no-data">暂无数据，请先订阅行情</div>
            ) : (
                <div className="data-grid">
                  <table>
                    <thead>
                    <tr>
                      <th>股票代码</th>
                      <th>时间</th>
                      <th>卖一价</th>
                      <th>卖一量</th>
                      <th>买一价</th>
                      <th>买一量</th>
                    </tr>
                    </thead>
                    <tbody>
                    {Object.entries(marketData).map(([symbol, data]) => (
                        <tr key={symbol}>
                          <td>{symbol}</td>
                          <td>{data.timestamp}</td>
                          <td className="ask-price">{data.ask1}</td>
                          <td>{data.askVol1}</td>
                          <td className="bid-price">{data.bid1}</td>
                          <td>{data.bidVol1}</td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
            )}
          </div>

          <div className="log-panel">
            <div className="section-header">
              <h2>连接日志</h2>
              <button
                  className="clear-logs"
                  onClick={clearLogs}
                  disabled={messages.length === 0}
              >
                清空日志
              </button>
            </div>
            <div className="log-container" ref={logContainerRef}>
              {messages.length === 0 ? (
                  <div className="no-data">暂无日志</div>
              ) : (
                  messages.map((msg, index) => (
                      <div key={index} className={`log-entry ${msg.type.toLowerCase()}`}>
                        <span className="log-time">[{msg.timestamp}]</span>
                        <span className="log-type">[{msg.type}]</span>
                        <span className="log-message">{msg.message}</span>
                      </div>
                  ))
              )}
            </div>
          </div>
        </div>

        <div className="help-section">
          <div className="section-header">
            <h2>使用说明</h2>
          </div>
          <div className="help-content">
            <h3>订阅格式</h3>
            <p>股票代码格式: 证券市场|证券类型|数据类型|证券代码</p>
            <p>例如: INDEX|2|O|AUS200,INDEX|2|O|CN50</p>

            <h3>操作步骤</h3>
            <ol>
              <li>输入服务器地址、AppID和AppSecret</li>
              <li>点击"连接"按钮建立WebSocket连接</li>
              <li>输入要订阅的股票代码</li>
              <li>点击"订阅"按钮开始接收行情数据</li>
              <li>实时行情将显示在上方表格中</li>
            </ol>

            <h3>注意事项</h3>
            <ul>
              <li>每30秒会自动发送心跳包保持连接</li>
              <li>如连接断开，系统会自动尝试重连</li>
              <li>每个AppID仅支持一个活跃连接，新连接会导致旧连接断开</li>
            </ul>
          </div>
        </div>
      </div>
  );
}

export default WebSocketClient;

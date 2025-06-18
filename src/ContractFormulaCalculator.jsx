import React, { useState, useRef } from 'react';
import './FileUploader.css';

function ContractFormulaCalculator() {
  // 状态管理
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // 文件输入引用
  const fileInputRef = useRef(null);
  // 日志容器引用
  const logContainerRef = useRef(null);

  // 处理文件选择
  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
      addLog('信息', `已选择 ${e.target.files.length} 个文件`);
    }
  };

  // 清除选中的文件
  const clearSelectedFiles = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    addLog('信息', '已清除所选文件');
  };

  // 模拟上传文件到S3
  const uploadFiles = async () => {
    if (files.length === 0) {
      addLog('警告', '请先选择文件');
      return;
    }

    setUploading(true);
    addLog('信息', '开始上传文件...');
    showMessage('文件上传中，请稍候...', 'info');

    const uploadedItems = [];

    try {
      for (const file of files) {
        addLog('信息', `正在上传: ${file.name}`);

        // 模拟上传延迟
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 模拟生成S3 URL
        const fileName = `line/line-url/${Date.now()}-${encodeURIComponent(file.name)}`;
        const fileUrl = `https://hashex-1.s3.ap-southeast-1.amazonaws.com/${fileName}`;

        uploadedItems.push({
          name: file.name,
          size: formatFileSize(file.size),
          type: file.type || '未知类型',
          url: fileUrl,
          uploadTime: new Date().toLocaleString()
        });

        addLog('成功', `文件上传成功: ${file.name}`);
      }

      setUploadedFiles(prev => [...uploadedItems, ...prev]);
      clearSelectedFiles();
      showMessage(`成功上传 ${uploadedItems.length} 个文件`, 'success');
    } catch (error) {
      console.error('上传失败:', error);
      addLog('错误', `上传失败: ${error.message}`);
      showMessage(`上传失败: ${error.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  // 显示消息
  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);

    // 5秒后自动清除成功消息
    if (type === 'success') {
      setTimeout(() => {
        setMessage('');
      }, 5000);
    }
  };

  // 添加日志
  const addLog = (type, message) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { type, message, timestamp };

    setLogs(prev => [logEntry, ...prev]);

    // 滚动到日志底部
    setTimeout(() => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 复制URL到剪贴板
  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url)
        .then(() => {
          addLog('成功', 'URL已复制到剪贴板');
          showMessage('URL已复制到剪贴板', 'success');
        })
        .catch(err => {
          addLog('错误', `复制失败: ${err.message}`);
          showMessage('复制失败', 'error');
        });
  };

  // 从列表中移除文件
  const removeFile = (index) => {
    const newFiles = [...uploadedFiles];
    newFiles.splice(index, 1);
    setUploadedFiles(newFiles);
    addLog('信息', '已从列表中移除文件');
  };

  // 清空日志
  const clearLogs = () => {
    setLogs([]);
    addLog('信息', '已清空日志');
  };

  // 清空上传记录
  const clearUploadedFiles = () => {
    setUploadedFiles([]);
    addLog('信息', '已清空上传记录');
  };

  return (
      <div className="ws-client-container file-uploader-container">
        <h1>文件上传工具</h1>

        <div className="message info" style={{marginBottom: '20px'}}>
          <strong>演示版本提示：</strong> 此版本仅展示界面和交互效果，并不会真正上传文件到S3服务器。
        </div>

        <div className="connection-panel upload-panel">
          <div className="file-input-container">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                className="file-input"
                id="file-input"
            />
            <label htmlFor="file-input" className="file-input-label">
              选择文件
            </label>
            <span className="selected-files-count">
            {files.length > 0 ? `已选择 ${files.length} 个文件` : '未选择文件'}
          </span>
            {files.length > 0 && (
                <button className="clear-files-btn" onClick={clearSelectedFiles}>
                  清除
                </button>
            )}
          </div>

          <button
              className="upload-button"
              onClick={uploadFiles}
              disabled={uploading || files.length === 0}
          >
            {uploading ? '上传中...' : '上传文件'}
          </button>
        </div>

        {message && (
            <div className={`message ${messageType}`}>
              {message}
            </div>
        )}

        {files.length > 0 && (
            <div className="data-display selected-files-panel">
              <div className="market-data">
                <div className="section-header">
                  <h2>待上传文件</h2>
                </div>
                <div className="data-grid files-list">
                  <table>
                    <thead>
                    <tr>
                      <th>文件名</th>
                      <th>类型</th>
                      <th>大小</th>
                    </tr>
                    </thead>
                    <tbody>
                    {files.map((file, index) => (
                        <tr key={index}>
                          <td>{file.name}</td>
                          <td>{file.type || '未知类型'}</td>
                          <td>{formatFileSize(file.size)}</td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
        )}

        <div className="data-display uploaded-files-panel">
          <div className="market-data">
            <div className="section-header">
              <h2>已上传文件</h2>
              <button
                  className="clear-data"
                  onClick={clearUploadedFiles}
                  disabled={uploadedFiles.length === 0}
              >
                清空记录
              </button>
            </div>

            {uploadedFiles.length === 0 ? (
                <div className="no-data">暂无上传记录</div>
            ) : (
                <div className="data-grid files-list">
                  <table>
                    <thead>
                    <tr>
                      <th>文件名</th>
                      <th>类型</th>
                      <th>大小</th>
                      <th>上传时间</th>
                      <th>URL</th>
                      <th>操作</th>
                    </tr>
                    </thead>
                    <tbody>
                    {uploadedFiles.map((file, index) => (
                        <tr key={index}>
                          <td>{file.name}</td>
                          <td>{file.type}</td>
                          <td>{file.size}</td>
                          <td>{file.uploadTime}</td>
                          <td>
                            <div className="url-cell">
                              <a href={file.url} target="_blank" rel="noopener noreferrer">
                                {file.url.length > 50 ? `${file.url.substring(0, 50)}...` : file.url}
                              </a>
                            </div>
                          </td>
                          <td>
                            <button
                                className="copy-btn"
                                onClick={() => copyToClipboard(file.url)}
                                title="复制URL"
                            >
                              复制
                            </button>
                            <button
                                className="delete-btn"
                                onClick={() => removeFile(index)}
                                title="从列表中移除"
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
            )}
          </div>
        </div>

        <div className="log-panel">
          <div className="section-header">
            <h2>操作日志</h2>
            <button
                className="clear-logs"
                onClick={clearLogs}
                disabled={logs.length === 0}
            >
              清空日志
            </button>
          </div>
          <div className="log-container" ref={logContainerRef}>
            {logs.length === 0 ? (
                <div className="no-data">暂无日志</div>
            ) : (
                logs.map((log, index) => (
                    <div key={index} className={`log-entry ${log.type.toLowerCase()}`}>
                      <span className="log-time">[{log.timestamp}]</span>
                      <span className="log-type">[{log.type}]</span>
                      <span className="log-message">{log.message}</span>
                    </div>
                ))
            )}
          </div>
        </div>

        <div className="help-section">
          <div className="section-header">
            <h2>使用说明</h2>
          </div>
          <div className="help-content">
            <h3>上传步骤</h3>
            <ol>
              <li>点击"选择文件"按钮选择要上传的文件</li>
              <li>可以一次选择多个文件</li>
              <li>确认文件无误后，点击"上传文件"按钮</li>
              <li>等待上传完成，文件链接将显示在下方列表中</li>
            </ol>

            <h3>文件管理</h3>
            <ul>
              <li>已上传文件会保存在列表中，直到页面刷新</li>
              <li>可以点击URL链接直接访问已上传的文件</li>
              <li>使用"复制"按钮可快速复制文件URL</li>
              <li>使用"删除"按钮可从列表中移除文件记录（不会从S3删除文件）</li>
            </ul>

            <h3>关于此演示版本</h3>
            <p>⚠️ <strong>重要提示：</strong> 此版本仅用于演示UI和交互流程，不会实际上传文件到S3服务器。</p>
            <p>如需实现真正的文件上传功能，建议通过以下方式：</p>
            <ul>
              <li>创建一个专门的后端API服务来处理文件上传</li>
              <li>后端服务使用安全的方式将文件存储到S3</li>
              <li>前端仅负责文件选择和显示上传结果</li>
            </ul>
            <p>这种方式可以避免将AWS凭证暴露在前端，同时解决跨域(CORS)和权限问题。</p>
          </div>
        </div>
      </div>
  );
}

export default ContractFormulaCalculator;

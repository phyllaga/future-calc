import React, { useState, useRef } from 'react';
import './FileUploader.css';

function ContractFormulaCalculator() {
  // 状态管理
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // 文件输入引用
  const fileInputRef = useRef(null);
  // 日志容器引用
  const logContainerRef = useRef(null);

  // S3配置
  const s3Config = {
    bucket: 'hashex-1',
    region: 'ap-southeast-1',
    directory: 'line/line-url',
    accessKey: 'AKIAYVAGXOZYMAXKQD4F',
    secretKey: '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'
  };

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

  // 使用预签名URL上传文件到S3
  const uploadFiles = async () => {
    if (files.length === 0) {
      addLog('警告', '请先选择文件');
      return;
    }

    setUploading(true);
    addLog('信息', '开始上传文件...');

    const uploadedItems = [];

    try {
      for (const file of files) {
        addLog('信息', `正在上传: ${file.name}`);

        // 为文件创建唯一的key
        const fileName = `${s3Config.directory}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;

        // 生成当前日期字符串 (AWS签名需要)
        const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
        const dateStamp = date.substr(0, 8);
        const amzDate = date.substr(0, 8) + 'T' + date.substr(8, 6) + 'Z';

        // 创建请求并计算签名
        const endpoint = `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${fileName}`;

        // 设置HTTP头
        const contentType = file.type || 'application/octet-stream';
        const headers = new Headers({
          'Content-Type': contentType,
          'x-amz-date': amzDate,
          'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
          'Host': `${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com`
        });

        // 创建PUT请求
        const requestOptions = {
          method: 'PUT',
          headers: headers,
          body: file
        };

        // 计算AWS签名
        // 注意：这种方式在浏览器端实现AWS签名很复杂且不安全
        // 实际环境中应该通过后端API或使用预签名URL

        try {
          // 为简化演示，我们直接尝试请求，实际应用需要正确的AWS签名
          const response = await fetch(endpoint, requestOptions);

          if (response.ok) {
            // 上传成功
            const fileUrl = endpoint;
            uploadedItems.push({
              name: file.name,
              size: formatFileSize(file.size),
              type: file.type,
              url: fileUrl,
              uploadTime: new Date().toLocaleString()
            });

            addLog('成功', `文件上传成功: ${file.name}`);
          } else {
            // 上传失败
            const errorText = await response.text();
            throw new Error(`上传失败 (${response.status}): ${errorText}`);
          }
        } catch (error) {
          addLog('错误', `文件 ${file.name} 上传失败: ${error.message}`);
          throw error;
        }
      }

      setUploadedFiles(prev => [...uploadedItems, ...prev]);
      clearSelectedFiles();
      showMessage(`成功上传 ${uploadedItems.length} 个文件`, 'success');
    } catch (error) {
      console.error('上传失败:', error);
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

    setUploadedFiles(prev => {
      // 如果是文件操作日志，添加到列表顶部
      if (type === '信息' || type === '警告' || type === '错误' || type === '成功') {
        return [logEntry, ...prev];
      }
      return prev;
    });

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

  // 清空日志和上传记录
  const clearLogs = () => {
    setUploadedFiles([]);
    addLog('信息', '已清空所有记录');
  };

  // 使用预签名URL上传文件
  const getPresignedUrlAndUpload = async (file) => {
    // 这里应该调用后端API获取预签名URL
    // 以下是模拟创建预签名URL的过程

    // 在实际应用中，应该从后端获取这个URL
    const fakePresignedUrl = `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${s3Config.directory}/${Date.now()}-${file.name}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=fakeCredential&X-Amz-Date=fakeDate&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=fakeSignature`;

    try {
      // 在实际应用中，应该使用这个预签名URL上传文件
      // const uploadResponse = await fetch(presignedUrl, {
      //   method: 'PUT',
      //   body: file,
      //   headers: {
      //     'Content-Type': file.type
      //   }
      // });

      // 模拟上传成功
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 从预签名URL中提取实际的文件URL (移除查询参数)
      const fileUrl = fakePresignedUrl.split('?')[0];

      return {
        success: true,
        url: fileUrl
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  };

  return (
      <div className="ws-client-container file-uploader-container">
        <h1>文件上传工具</h1>

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
              <h2>已上传文件与日志</h2>
              <button
                  className="clear-data"
                  onClick={clearLogs}
                  disabled={uploadedFiles.length === 0}
              >
                清空记录
              </button>
            </div>

            {uploadedFiles.length === 0 ? (
                <div className="no-data">暂无上传记录</div>
            ) : (
                <div className="data-grid files-list" ref={logContainerRef}>
                  <table>
                    <thead>
                    <tr>
                      <th>类型</th>
                      <th>时间</th>
                      <th>详情</th>
                      <th>操作</th>
                    </tr>
                    </thead>
                    <tbody>
                    {uploadedFiles.map((item, index) => {
                      if (item.url) {
                        // 这是一个文件记录
                        return (
                            <tr key={index}>
                              <td>文件</td>
                              <td>{item.uploadTime}</td>
                              <td>
                                <div className="file-info">
                                  <strong>{item.name}</strong>
                                  <div className="url-cell">
                                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                                      {item.url}
                                    </a>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <button
                                    className="copy-btn"
                                    onClick={() => copyToClipboard(item.url)}
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
                        );
                      } else {
                        // 这是一个日志记录
                        return (
                            <tr key={index} className={`log-entry ${item.type.toLowerCase()}`}>
                              <td>{item.type}</td>
                              <td>{item.timestamp}</td>
                              <td colSpan="2">{item.message}</td>
                            </tr>
                        );
                      }
                    })}
                    </tbody>
                  </table>
                </div>
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

            <h3>注意事项</h3>
            <p>⚠️ <strong>重要提示：</strong> 在浏览器直接上传到S3存在限制。我们建议开发后端API来处理上传操作。</p>
            <ul>
              <li>由于CORS和安全限制，浏览器直接上传到S3可能会失败</li>
              <li>AWS访问密钥不应直接在前端使用</li>
              <li>请勿上传敏感或私密信息</li>
            </ul>
          </div>
        </div>
      </div>
  );
}

export default ContractFormulaCalculator;

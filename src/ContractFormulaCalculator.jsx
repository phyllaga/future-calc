import React, { useState, useRef } from 'react';
import './FileUploader.css';

function FileUploader() {
  // 状态管理
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // 文件输入引用
  const fileInputRef = useRef(null);

  // S3配置
  const s3Config = {
    uploadUrl: 'https://hashex-1.s3.ap-southeast-1.amazonaws.com/line/line-url',
    bucketUrl: 'https://hashex-1.s3.ap-southeast-1.amazonaws.com'
  };

  // 处理文件选择
  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
      setMessage('');
    }
  };

  // 清除选中的文件
  const clearSelectedFiles = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 上传文件到服务器，服务器会返回预签名URL
  const uploadFile = async () => {
    if (files.length === 0) {
      showMessage('请先选择文件', 'error');
      return;
    }

    setUploading(true);
    showMessage('正在上传...', 'info');

    const uploadedItems = [];

    try {
      for (const file of files) {
        // 创建唯一的文件名
        const fileName = `line/${Date.now()}-${file.name}`;

        // 这里应该有一个后端API来获取预签名URL
        // 由于没有实际的后端，我们这里直接模拟上传成功

        // 在实际应用中，应该是:
        // const response = await fetch('/api/get-presigned-url', {
        //   method: 'POST',
        //   body: JSON.stringify({ fileName, fileType: file.type })
        // });
        // const { url } = await response.json();
        // await fetch(url, {
        //   method: 'PUT',
        //   body: file
        // });

        // 模拟上传延迟
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 构建文件URL
        const fileUrl = `${s3Config.bucketUrl}/${fileName}`;

        uploadedItems.push({
          name: file.name,
          size: formatFileSize(file.size),
          type: file.type,
          url: fileUrl,
          uploadTime: new Date().toLocaleString()
        });
      }

      setUploadedFiles(prev => [...prev, ...uploadedItems]);
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
          showMessage('URL已复制到剪贴板', 'success');
        })
        .catch(err => {
          showMessage('复制失败: ' + err, 'error');
        });
  };

  // 删除已上传的文件
  const removeUploadedFile = (index) => {
    const newFiles = [...uploadedFiles];
    newFiles.splice(index, 1);
    setUploadedFiles(newFiles);
  };


  return (
      <div className="file-uploader-container">
        <h1>文件上传至AWS S3</h1>

        <div className="upload-panel">
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
              onClick={uploadFile}
              disabled={uploading || files.length === 0}
          >
            {uploading ? '上传中...' : '上传到S3'}
          </button>
        </div>

        {message && (
            <div className={`message ${messageType}`}>
              {message}
            </div>
        )}

        {files.length > 0 && (
            <div className="selected-files-panel">
              <h2>待上传文件</h2>
              <div className="files-list">
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
        )}

        {uploadedFiles.length > 0 && (
            <div className="uploaded-files-panel">
              <h2>已上传文件</h2>
              <div className="files-list">
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
                        <td>{file.type || '未知类型'}</td>
                        <td>{file.size}</td>
                        <td>{file.uploadTime}</td>
                        <td>
                          <div className="url-cell">
                            <a href={file.url} target="_blank" rel="noopener noreferrer">
                              {file.url.substring(0, 50)}...
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
                              onClick={() => removeUploadedFile(index)}
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
            </div>
        )}

        <div className="help-section">
          <h2>使用说明</h2>
          <div className="help-content">
            <h3>上传步骤</h3>
            <ol>
              <li>点击"选择文件"按钮选择要上传的文件</li>
              <li>可以一次选择多个文件</li>
              <li>确认文件无误后，点击"上传到S3"按钮</li>
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
            <p>⚠️ <strong>重要提示：</strong> 此为演示版本，目前只模拟了上传功能。实际使用时需要配置后端服务来提供S3预签名URL。</p>
            <ul>
              <li>上传的文件将被存储在AWS S3服务中</li>
              <li>所有上传的文件都是公开可访问的</li>
              <li>请勿上传敏感或私密信息</li>
            </ul>
          </div>
        </div>
      </div>
  );
}

export default FileUploader;

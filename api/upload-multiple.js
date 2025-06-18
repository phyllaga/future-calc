// api/upload-multiple.js
const AWS = require('aws-sdk');
const formidable = require('formidable-serverless');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 配置AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION || 'ap-southeast-1'
});

const s3 = new AWS.S3();
const bucketName = process.env.S3_BUCKET || 'hashex-1';
const s3Directory = process.env.S3_DIRECTORY || 'line/line-url';

module.exports = async (req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 只允许POST请求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '方法不允许' });
    }

    try {
        const form = new formidable.IncomingForm({
            multiples: true
        });
        form.keepExtensions = true;

        // 解析上传的文件
        form.parse(req, async (err, fields, files) => {
            if (err) {
                return res.status(500).json({ error: `解析文件失败: ${err.message}` });
            }

            const uploadedFiles = files.files;
            if (!uploadedFiles) {
                return res.status(400).json({ error: '未提供文件' });
            }

            // 确保uploadedFiles是数组
            const fileArray = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];

            if (fileArray.length === 0) {
                return res.status(400).json({ error: '未提供文件' });
            }

            try {
                const uploadResults = [];

                // 处理每个文件
                for (const file of fileArray) {
                    // 生成唯一的文件名
                    const fileExtension = path.extname(file.name);
                    const fileName = `${s3Directory}/${Date.now()}-${uuidv4()}${fileExtension}`;

                    // 读取文件
                    const fileContent = fs.readFileSync(file.path);

                    // 设置S3上传参数
                    const params = {
                        Bucket: bucketName,
                        Key: fileName,
                        Body: fileContent,
                        ContentType: file.type,
                        ACL: 'public-read'
                    };

                    // 上传到S3
                    const uploadResult = await s3.upload(params).promise();

                    uploadResults.push({
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        url: uploadResult.Location,
                        uploadTime: new Date().toISOString()
                    });
                }

                // 返回所有文件的上传结果
                return res.status(200).json({
                    success: true,
                    files: uploadResults
                });
            } catch (uploadError) {
                console.error('文件上传失败:', uploadError);
                return res.status(500).json({
                    success: false,
                    error: `上传失败: ${uploadError.message}`
                });
            }
        });
    } catch (error) {
        console.error('请求处理失败:', error);
        return res.status(500).json({ error: `服务器错误: ${error.message}` });
    }
};

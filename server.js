const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { exec } = require('child_process');

const app = express();
const upload = multer({ dest: 'uploads/' });
require('dotenv').config();

// 配置静态文件中间件
app.use(express.static(__dirname));
app.use(express.json());

// 设置跨域访问
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// 确保目录存在
const uploadsDir = path.join(__dirname, 'uploads');
const outputsDir = path.join(__dirname, 'outputs');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(outputsDir)) fs.mkdirSync(outputsDir);

// 获取视频时长
function getVideoDuration(inputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
            if (err) {
                reject(err);
            } else {
                resolve(metadata.format.duration);
            }
        });
    });
}

// 处理文件上传和转换
app.post('/convert', upload.single('videoFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('没有上传文件');
    }

    const inputPath = req.file.path;
    const outputPath = path.join('outputs', `${req.file.filename}.mp3`);
    let startTime = 0;
    let endTime = 0;

    // 获取视频总时长
    const totalDuration = await getVideoDuration(inputPath);
    console.log('视频总时长:', totalDuration);

    // 如果使用AI模式，解析提示词
    if (req.body.analysis) {
        try {
            const analysis = JSON.parse(req.body.analysis);
            console.log('解析的剪辑需求:', analysis);

            if (analysis.type === 'remove') {
                // 去掉前后X秒
                startTime = analysis.seconds;
                endTime = totalDuration - analysis.seconds;
            } else if (analysis.type === 'removeStartEnd') {
                // 去掉开头X秒和结尾X秒
                startTime = analysis.startSeconds;
                endTime = totalDuration - analysis.endSeconds;
            } else if (analysis.type === 'extract') {
                // 提取指定时间段
                startTime = analysis.startTime;
                endTime = analysis.endTime;
            } else if (analysis.type === 'keepMiddle') {
                // 保留中间部分，去掉前后X秒
                startTime = analysis.seconds;
                endTime = totalDuration - analysis.seconds;
            } else {
                throw new Error('未知的剪辑类型');
            }

            // 验证时间范围
            if (startTime < 0 || endTime < 0) {
                throw new Error('时间值不能为负数');
            }
            if (startTime >= totalDuration || endTime > totalDuration) {
                throw new Error('指定的时间范围超出视频总时长');
            }
            if (startTime >= endTime) {
                throw new Error('开始时间必须小于结束时间');
            }

        } catch (error) {
            console.error('解析剪辑需求错误:', error);
            return res.status(400).send('解析剪辑需求失败: ' + error.message);
        }
    } else {
        // 手动模式
        startTime = parseInt(req.body.startTime) || 0;
        endTime = parseInt(req.body.endTime) || totalDuration;

        // 验证手动输入的时间值
        if (startTime < 0 || endTime < 0) {
            return res.status(400).send('时间值不能为负数');
        }
        if (startTime >= totalDuration || endTime > totalDuration) {
            return res.status(400).send('指定的时间范围超出视频总时长');
        }
        if (startTime >= endTime) {
            return res.status(400).send('开始时间必须小于结束时间');
        }
    }

    try {
        // 计算持续时间
        const duration = endTime - startTime;

        let command = ffmpeg(inputPath)
            .output(outputPath)
            .audioCodec('libmp3lame')
            .setStartTime(startTime)
            .setDuration(duration);

        // 添加命令日志
        command.on('start', (commandLine) => {
            console.log('执行的ffmpeg命令:', commandLine);
        });

        command
            .on('end', () => {
                // 发送转换后的文件
                res.download(outputPath, (err) => {
                    if (err) {
                        console.error('下载错误:', err);
                    }
                    // 清理文件
                    fs.unlinkSync(inputPath);
                    fs.unlinkSync(outputPath);
                });
            })
            .on('error', (err) => {
                console.error('转换错误:', err);
                res.status(500).send('转换失败');
                // 清理文件
                fs.unlinkSync(inputPath);
            })
            .run();
    } catch (error) {
        console.error('处理错误:', error);
        res.status(500).send('处理失败: ' + error.message);
        // 清理文件
        fs.unlinkSync(inputPath);
    }
});

const port = 3001; // 修改端口号
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
}); 
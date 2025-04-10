const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const app = express();
const upload = multer({ dest: 'uploads/' });
require('dotenv').config();

// 确保上传和输出目录存在
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}
if (!fs.existsSync('outputs')) {
    fs.mkdirSync('outputs');
}

// 提供静态文件
app.use(express.static('.'));

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
app.post('/convert', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('没有上传文件');
    }

    const inputPath = req.file.path;
    const outputPath = path.join('outputs', `${req.file.filename}.mp3`);
    let startTime = req.body.startTime;
    let endTime = req.body.endTime;

    // 如果使用AI模式，解析提示词
    if (req.body.prompt) {
        try {
            console.log('发送AI请求:', req.body.prompt);
            const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "你是一个视频剪辑助手。请根据用户的自然语言描述，解析出视频剪辑的开始时间和结束时间。\n\n规则：\n1. startTime表示从视频开始要剪掉的时间（秒）\n2. endTime表示从视频结束要剪掉的时间（秒）\n3. 例如：'去掉开头10秒和结尾3秒' 应该返回 {\"startTime\": 10, \"endTime\": 3}\n4. 所有时间值都必须是正数\n5. 直接返回JSON对象，不要包含其他文字或格式\n\n请直接返回一个JSON对象，格式为：{\"startTime\": 数字, \"endTime\": 数字}"
                    },
                    {
                        role: "user",
                        content: req.body.prompt
                    }
                ],
                temperature: 0.3
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('AI响应:', response.data);
            
            // 提取AI返回的内容
            let aiResponse = response.data.choices[0].message.content;
            console.log('AI返回内容:', aiResponse);
            
            // 清理响应内容，移除可能的Markdown标记
            aiResponse = aiResponse.replace(/```json\s*|\s*```/g, '').trim();
            
            // 尝试直接解析JSON
            try {
                const result = JSON.parse(aiResponse);
                // 验证时间值
                if (result.startTime < 0 || result.endTime < 0) {
                    throw new Error('时间值不能为负数');
                }
                startTime = result.startTime;
                endTime = result.endTime;
                console.log('解析结果:', { startTime, endTime });
            } catch (parseError) {
                console.error('JSON解析错误:', parseError);
                // 如果解析失败，尝试提取数字
                const numbers = aiResponse.match(/\d+/g);
                if (numbers && numbers.length >= 2) {
                    const tempStart = parseInt(numbers[0]);
                    const tempEnd = parseInt(numbers[1]);
                    // 确保时间值为正数
                    if (tempStart < 0 || tempEnd < 0) {
                        throw new Error('时间值不能为负数');
                    }
                    startTime = tempStart;
                    endTime = tempEnd;
                    console.log('使用提取的数字:', { startTime, endTime });
                } else {
                    throw new Error('无法从AI响应中提取时间信息');
                }
            }
        } catch (error) {
            console.error('AI处理错误:', error);
            return res.status(500).send('AI解析失败: ' + error.message);
        }
    }

    // 验证手动输入的时间值
    if (startTime !== undefined && endTime !== undefined) {
        if (startTime < 0 || endTime < 0) {
            return res.status(400).send('时间值不能为负数');
        }
    }

    try {
        // 获取视频总时长
        const totalDuration = await getVideoDuration(inputPath);
        console.log('视频总时长:', totalDuration);

        // 计算实际持续时间
        const actualDuration = totalDuration - startTime - endTime;
        if (actualDuration <= 0) {
            return res.status(400).send('剪辑后的视频时长为0或负数');
        }

        let command = ffmpeg(inputPath)
            .output(outputPath)
            .audioCodec('libmp3lame');

        if (startTime) {
            command = command.setStartTime(startTime);
        }
        command = command.setDuration(actualDuration);

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
}); 
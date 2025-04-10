# MP4转MP3工具

一个简单易用的网页应用，可以将MP4视频转换为MP3音频，支持智能剪辑功能。

## 功能特点

- 支持MP4文件上传
- 支持手动设置剪辑时间
- 支持AI智能剪辑（使用自然语言描述）
- 响应式设计，支持移动设备
- 文件拖放上传
- 实时进度显示

## 技术栈

- 前端：HTML5, CSS3, JavaScript, Bootstrap 5
- 后端：Node.js, Express
- 视频处理：FFmpeg
- AI接口：DeepSeek API

## 安装说明

1. 克隆项目：
```bash
git clone https://github.com/你的用户名/mp4-to-mp3-converter.git
cd mp4-to-mp3-converter
```

2. 安装依赖：
```bash
npm install
```

3. 安装FFmpeg：
- Windows: 从[FFmpeg官网](https://ffmpeg.org/download.html)下载并添加到系统环境变量
- Mac: `brew install ffmpeg`
- Linux: `sudo apt-get install ffmpeg`

4. 配置环境变量：
创建`.env`文件并添加：
```
DEEPSEEK_API_KEY=你的DeepSeek_API密钥
```

5. 启动服务器：
```bash
npm start
```

6. 访问应用：
打开浏览器访问 `http://localhost:3000`

## 使用说明

1. 上传MP4文件
2. 选择剪辑方式：
   - 手动设置：输入开始和结束时间
   - AI智能：输入自然语言描述（如"去掉开头10秒和结尾3秒"）
3. 点击"开始转换"
4. 转换完成后下载MP3文件

## 注意事项

- 确保已正确安装FFmpeg
- 确保有足够的磁盘空间用于临时文件
- 大文件转换可能需要较长时间

## 许可证

MIT License 
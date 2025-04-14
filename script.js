// 处理剪辑方法切换
document.addEventListener('DOMContentLoaded', function() {
    const manualMethod = document.getElementById('manualMethod');
    const aiMethod = document.getElementById('aiMethod');
        const manualControls = document.getElementById('manualControls');
        const aiControls = document.getElementById('aiControls');
    const methodOptions = document.querySelectorAll('.method-option');

    function updateControlsVisibility() {
        if (manualMethod.checked) {
            manualControls.style.display = 'block';
            aiControls.style.display = 'none';
        } else if (aiMethod.checked) {
            manualControls.style.display = 'none';
            aiControls.style.display = 'block';
        }
    }

    // 点击整个方框都可以切换
    methodOptions.forEach(option => {
        option.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');
            radio.checked = true;
            updateControlsVisibility();
        });
    });

    // 初始化时执行一次
    updateControlsVisibility();

    // 复制示例文本的功能
    document.querySelectorAll('.copy-button').forEach(button => {
        button.addEventListener('click', function() {
            const text = this.previousElementSibling.textContent;
            const promptInput = document.getElementById('promptInput');
            promptInput.value = text;
            
            // 显示复制成功提示
            this.textContent = '已复制';
            this.style.backgroundColor = '#28a745';
            this.style.color = 'white';
            
            setTimeout(() => {
                this.textContent = '复制';
                this.style.backgroundColor = '';
                this.style.color = '';
            }, 2000);
        });
    });
});

// 时间格式转换函数
function convertTimeToSeconds(hours, minutes, seconds) {
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
}

// 验证时间输入
function validateTimeInput(hours, minutes, seconds) {
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
        return false;
    }
    if (hours < 0 || hours > 23) return false;
    if (minutes < 0 || minutes > 59) return false;
    if (seconds < 0 || seconds > 59) return false;
    return true;
}

// 获取时间输入值
function getTimeInputs() {
    const startHours = parseInt(document.getElementById('startHours').value) || 0;
    const startMinutes = parseInt(document.getElementById('startMinutes').value) || 0;
    const startSeconds = parseInt(document.getElementById('startSeconds').value) || 0;
    const endHours = parseInt(document.getElementById('endHours').value) || 0;
    const endMinutes = parseInt(document.getElementById('endMinutes').value) || 0;
    const endSeconds = parseInt(document.getElementById('endSeconds').value) || 0;

    const startTime = startHours * 3600 + startMinutes * 60 + startSeconds;
    const endTime = endHours * 3600 + endMinutes * 60 + endSeconds;

    if (startTime >= endTime) {
        showError('结束时间必须大于开始时间');
        return null;
    }

    return { startTime, endTime };
}

// 更新上传进度条
function updateUploadProgress(progress) {
    const progressBar = document.querySelector('.upload-progress');
    const progressBarInner = progressBar.querySelector('.progress-bar');
    const progressText = progressBar.querySelector('.progress-text');
    
    progressBar.style.display = 'block';
    progressBarInner.style.width = `${progress}%`;
    progressText.textContent = `上传中 ${progress}%`;
    
    if (progress >= 100) {
        setTimeout(() => {
            progressBar.style.display = 'none';
        }, 1000);
    }
}

// 更新转换进度条
function updateConversionProgress(progress) {
    const progressBar = document.querySelector('.conversion-progress');
    const progressBarInner = progressBar.querySelector('.progress-bar');
    const progressText = progressBar.querySelector('.progress-text');
    
    progressBar.style.display = 'block';
    progressBarInner.style.width = `${progress}%`;
    progressText.textContent = `转换中 ${progress}%`;
    
    if (progress >= 100) {
        setTimeout(() => {
            progressBar.style.display = 'none';
            // 显示成功提示
            showSuccessMessage('转换成功！请点击下载按钮获取文件');
        }, 1000);
    }
}

// 显示成功消息
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success alert-dismissible fade show';
    successDiv.style.position = 'fixed';
    successDiv.style.top = '20px';
    successDiv.style.right = '20px';
    successDiv.style.zIndex = '1000';
    successDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(successDiv);
    
    // 3秒后自动关闭
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// 智能识别剪辑需求类型
function analyzePrompt(prompt) {
    // 初始化返回对象
    const result = {
        type: 'extract', // 默认为截取模式
        startTime: 0,
        endTime: 60,
        needDuration: false,
        recognizedType: 'unknown' // 添加识别类型字段
    };

    // 尝试匹配时间格式
    const timePatterns = [
        // 标准时间格式 1:30-2:30
        /(\d+)[.:](\d+)\s*[-到]\s*(\d+)[.:](\d+)/,
        // 中文时间格式 1分30秒到2分30秒
        /(\d+)分(\d+)秒\s*[-到]\s*(\d+)分(\d+)秒/,
        // 简单数字格式 130-230
        /(\d+)\s*[-到]\s*(\d+)/
    ];

    for (const pattern of timePatterns) {
        const match = prompt.match(pattern);
        if (match) {
            result.recognizedType = 'timeRange';
            result.needDuration = false;
            
            if (pattern === timePatterns[0] || pattern === timePatterns[1]) {
                // 处理分:秒格式
                const startMinutes = parseInt(match[1]);
                const startSeconds = parseInt(match[2]);
                const endMinutes = parseInt(match[3]);
                const endSeconds = parseInt(match[4]);
                result.startTime = startMinutes * 60 + startSeconds;
                result.endTime = endMinutes * 60 + endSeconds;
            } else {
                // 处理简单数字格式
                result.startTime = parseInt(match[1]);
                result.endTime = parseInt(match[2]);
            }
            return result;
        }
    }

    // 尝试匹配删除操作
    const deletePatterns = [
        // 删除前后X秒
        /(?:前后|开头和结尾)(?:各)?(\d+)(?:秒|分钟)/,
        // 删除开头X秒和结尾X秒
        /开头\s*(\d+)\s*(?:秒|分钟)和结尾\s*(\d+)\s*(?:秒|分钟)/,
        // 删除开头X秒
        /开头\s*(\d+)\s*(?:秒|分钟)/,
        // 删除结尾X秒
        /结尾\s*(\d+)\s*(?:秒|分钟)/
    ];

    for (const pattern of deletePatterns) {
        const match = prompt.match(pattern);
        if (match) {
            result.recognizedType = 'delete';
            result.type = 'removeStartEnd';
            result.needDuration = true;

            if (pattern === deletePatterns[0]) {
                // 删除前后X秒
                let seconds = parseInt(match[1]);
                if (prompt.includes('分钟')) {
                    seconds *= 60;
                }
                result.startSeconds = seconds;
                result.endSeconds = seconds;
            } else if (pattern === deletePatterns[1]) {
                // 删除开头X秒和结尾X秒
                let startSeconds = parseInt(match[1]);
                let endSeconds = parseInt(match[2]);
                if (prompt.includes('分钟')) {
                    startSeconds *= 60;
                    endSeconds *= 60;
                }
                result.startSeconds = startSeconds;
                result.endSeconds = endSeconds;
            } else if (pattern === deletePatterns[2]) {
                // 删除开头X秒
                let seconds = parseInt(match[1]);
                if (prompt.includes('分钟')) {
                    seconds *= 60;
                }
                result.startSeconds = seconds;
                result.endSeconds = 0;
            } else if (pattern === deletePatterns[3]) {
                // 删除结尾X秒
                let seconds = parseInt(match[1]);
                if (prompt.includes('分钟')) {
                    seconds *= 60;
                }
                result.startSeconds = 0;
                result.endSeconds = seconds;
            }
            return result;
        }
    }

    // 如果以上模式都不匹配，尝试提取数字
    const numbers = prompt.match(/\d+/g);
    if (numbers && numbers.length >= 2) {
        // 根据上下文判断是删除还是截取
        if (prompt.includes('去掉') || prompt.includes('删除') || prompt.includes('移除')) {
            result.recognizedType = 'delete';
            result.type = 'removeStartEnd';
            result.needDuration = true;
            result.startSeconds = parseInt(numbers[0]);
            result.endSeconds = parseInt(numbers[1]);
        } else {
            result.recognizedType = 'timeRange';
            result.type = 'extract';
            result.needDuration = false;
            result.startTime = parseInt(numbers[0]);
            result.endTime = parseInt(numbers[1]);
        }
        return result;
    }

    // 如果完全无法识别，返回默认值
    result.recognizedType = 'default';
    return result;
}

// 处理开始转换按钮点击
document.getElementById('convertButton').addEventListener('click', async function(e) {
    e.preventDefault();

    const method = document.querySelector('input[name="method"]:checked').value;
    const formData = new FormData();

    if (method === 'manual') {
        const times = getTimeInputs();
        if (!times) return;
        formData.append('startTime', times.startTime);
        formData.append('endTime', times.endTime);
    } else {
        const prompt = document.getElementById('promptInput').value;
        if (!prompt) {
            showError('请输入剪辑要求');
            return;
        }

        const analysis = analyzePrompt(prompt);
        formData.append('analysis', JSON.stringify(analysis));
    }

    try {
        // 显示转换进度
        let progress = 0;
        const interval = setInterval(() => {
            progress += 2;
            updateConversionProgress(Math.min(progress, 95));
            if (progress >= 95) {
                clearInterval(interval);
            }
        }, 200);

        const response = await fetch('/convert', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('转换失败');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        // 显示下载链接
        const resultDiv = document.getElementById('result');
        const downloadLink = document.getElementById('downloadLink');
        downloadLink.href = url;
        downloadLink.style.display = 'inline-block';

        // 完成转换进度
        updateConversionProgress(100);

    } catch (error) {
        showError('转换过程中出现错误：' + error.message);
        document.querySelector('.progress-container').style.display = 'none';
    }
});

// 添加时间输入框的输入限制
document.querySelectorAll('.time-input input').forEach(input => {
    input.addEventListener('input', function() {
        const max = this.id.includes('Hours') ? 23 : 59;
        if (this.value > max) {
            this.value = max;
        }
        if (this.value < 0) {
            this.value = 0;
        }
    });
});

// 显示错误信息
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    // 移除已存在的错误信息
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // 插入到开始剪辑按钮之前
    const convertButton = document.getElementById('convertButton');
    convertButton.parentNode.insertBefore(errorDiv, convertButton);
    
    // 3秒后自动消失
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// 处理文件上传和显示
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('videoInput');
    const uploadLabel = document.querySelector('.upload-label');
    const selectedFile = document.querySelector('.selected-file');
    const fileName = document.querySelector('.file-name');
    const removeButton = document.querySelector('.remove-file');

    function handleFile(file) {
        if (file) {
            fileName.textContent = file.name;
            selectedFile.style.display = 'flex';
            uploadLabel.style.display = 'none';
        } else {
            selectedFile.style.display = 'none';
            uploadLabel.style.display = 'block';
        }
    }

    // 处理文件选择
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleFile(file);
    });

    // 处理文件拖放
    uploadLabel.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadLabel.style.borderColor = 'var(--primary-color)';
        uploadLabel.style.backgroundColor = 'rgba(74, 107, 255, 0.05)';
    });

    uploadLabel.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadLabel.style.borderColor = 'var(--border-color)';
        uploadLabel.style.backgroundColor = 'var(--secondary-color)';
    });

    uploadLabel.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadLabel.style.borderColor = 'var(--border-color)';
        uploadLabel.style.backgroundColor = 'var(--secondary-color)';
        
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            fileInput.files = e.dataTransfer.files;
            handleFile(file);
        }
    });

    // 处理文件移除
    removeButton.addEventListener('click', () => {
        fileInput.value = '';
        handleFile(null);
    });
}); 
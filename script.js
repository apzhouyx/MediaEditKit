// 处理文件拖放和显示
const fileInput = document.getElementById('videoFile');
const fileNameDisplay = document.getElementById('fileName');

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        fileNameDisplay.textContent = e.target.files[0].name;
    } else {
        fileNameDisplay.textContent = '点击或拖拽文件到此处';
    }
});

// 处理文件拖放
const fileInputLabel = document.querySelector('.file-input-label');

fileInputLabel.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileInputLabel.style.borderColor = 'var(--primary-color)';
    fileInputLabel.style.backgroundColor = 'rgba(74, 107, 255, 0.05)';
});

fileInputLabel.addEventListener('dragleave', (e) => {
    e.preventDefault();
    fileInputLabel.style.borderColor = 'var(--border-color)';
    fileInputLabel.style.backgroundColor = 'var(--secondary-color)';
});

fileInputLabel.addEventListener('drop', (e) => {
    e.preventDefault();
    fileInputLabel.style.borderColor = 'var(--border-color)';
    fileInputLabel.style.backgroundColor = 'var(--secondary-color)';
    
    if (e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        fileNameDisplay.textContent = e.dataTransfer.files[0].name;
    }
});

// 处理剪辑方法切换
document.querySelectorAll('input[name="method"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const manualControls = document.getElementById('manualControls');
        const aiControls = document.getElementById('aiControls');
        if (e.target.value === 'manual') {
            manualControls.style.display = 'block';
            aiControls.style.display = 'none';
        } else {
            manualControls.style.display = 'none';
            aiControls.style.display = 'block';
        }
    });
});

// 处理表单提交
document.getElementById('conversionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const videoFile = document.getElementById('videoFile').files[0];
    const method = document.querySelector('input[name="method"]:checked').value;
    
    if (!videoFile) {
        alert('请选择MP4文件');
        return;
    }
    
    const formData = new FormData();
    formData.append('video', videoFile);
    
    if (method === 'manual') {
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;
        if (startTime) formData.append('startTime', startTime);
        if (endTime) formData.append('endTime', endTime);
    } else {
        const prompt = document.getElementById('prompt').value;
        if (!prompt) {
            alert('请输入剪辑要求');
            return;
        }
        formData.append('prompt', prompt);
    }
    
    // 显示进度条
    const progressBar = document.querySelector('.progress');
    const progressBarInner = progressBar.querySelector('.progress-bar');
    progressBar.style.display = 'block';
    progressBarInner.style.width = '0%';
    
    try {
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
        downloadLink.download = videoFile.name.replace('.mp4', '.mp3');
        resultDiv.style.display = 'block';
        
        // 更新进度条
        progressBarInner.style.width = '100%';
        
    } catch (error) {
        alert('转换过程中出现错误：' + error.message);
    } finally {
        // 重置进度条
        setTimeout(() => {
            progressBar.style.display = 'none';
            progressBarInner.style.width = '0%';
        }, 1000);
    }
}); 
// 键盘快捷键控制

import * as dom from './dom.js';
import { playPrevious, playNext } from './player.js';
import { savePlayerState } from './storage.js';

/**
 * 初始化键盘快捷键
 * 支持的快捷键:
 * - 空格: 播放/暂停
 * - 左箭头: 上一首
 * - 右箭头: 下一首
 * - 上箭头: 增加音量
 * - 下箭头: 降低音量
 */
export function initKeyboardControls() {
    document.addEventListener('keydown', handleKeyPress);
}

/**
 * 处理键盘事件
 */
function handleKeyPress(event) {
    // 忽略输入框中的键盘事件
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }

    // 如果播放器未显示，不处理键盘事件
    if (dom.playerEl.style.display === 'none') {
        return;
    }

    switch (event.key) {
        case ' ': // 空格键 - 播放/暂停
            togglePlayPause();
            event.preventDefault();
            break;
        case 'ArrowLeft': // 左箭头 - 上一首
            playPrevious();
            event.preventDefault();
            break;
        case 'ArrowRight': // 右箭头 - 下一首
            playNext();
            event.preventDefault();
            break;
        case 'ArrowUp': // 上箭头 - 增加音量
            adjustVolume(0.05);
            event.preventDefault();
            break;
        case 'ArrowDown': // 下箭头 - 降低音量
            adjustVolume(-0.05);
            event.preventDefault();
            break;
    }
}

/**
 * 播放/暂停切换
 */
function togglePlayPause() {
    if (!dom.audioPlayerEl) return;
    
    if (dom.audioPlayerEl.paused) {
        dom.audioPlayerEl.play().catch(e => console.log('播放失败:', e));
    } else {
        dom.audioPlayerEl.pause();
    }
    
    // 保存播放状态
    savePlayerState();
}

/**
 * 调整音量
 * @param {number} delta - 音量变化值，范围 -1.0 到 1.0
 */
function adjustVolume(delta) {
    if (!dom.audioPlayerEl || !dom.volumeSliderEl) return;
    
    // 获取当前音量
    let currentVolume = parseFloat(dom.audioPlayerEl.volume);
    
    // 计算新音量并限制在 0-1 范围内
    let newVolume = Math.min(Math.max(currentVolume + delta, 0), 1);
    
    // 设置新音量
    dom.audioPlayerEl.volume = newVolume;
    dom.volumeSliderEl.value = newVolume;
    
    // 保存状态
    savePlayerState();
    
    // 在页面上显示音量变化提示
    showVolumeIndicator(newVolume);
}

/**
 * 显示音量变化提示
 */
function showVolumeIndicator(volume) {
    // 检查是否已存在音量指示器，如果没有则创建
    let volumeIndicator = document.getElementById('volume-indicator');
    
    if (!volumeIndicator) {
        volumeIndicator = document.createElement('div');
        volumeIndicator.id = 'volume-indicator';
        volumeIndicator.style.position = 'fixed';
        volumeIndicator.style.bottom = '20px';
        volumeIndicator.style.left = '50%';
        volumeIndicator.style.transform = 'translateX(-50%)';
        volumeIndicator.style.background = 'rgba(0, 0, 0, 0.7)';
        volumeIndicator.style.color = 'white';
        volumeIndicator.style.padding = '8px 12px';
        volumeIndicator.style.borderRadius = '4px';
        volumeIndicator.style.zIndex = '1000';
        volumeIndicator.style.opacity = '0';
        volumeIndicator.style.transition = 'opacity 0.3s';
        document.body.appendChild(volumeIndicator);
    }
    
    // 更新音量百分比
    const volumePercentage = Math.round(volume * 100);
    volumeIndicator.textContent = `音量: ${volumePercentage}%`;
    
    // 显示指示器
    volumeIndicator.style.opacity = '1';
    
    // 2秒后隐藏
    clearTimeout(window.volumeIndicatorTimeout);
    window.volumeIndicatorTimeout = setTimeout(() => {
        volumeIndicator.style.opacity = '0';
    }, 2000);
}

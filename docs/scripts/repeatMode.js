// 循环播放模式
// 支持三种模式: 正常播放、单曲循环、列表循环

import * as state from './state.js';
import * as dom from './dom.js';

// 循环模式常量
export const REPEAT_MODE = {
    NO_REPEAT: 0,    // 正常播放
    REPEAT_ONE: 1,   // 单曲循环
    REPEAT_ALL: 2    // 列表循环
};

// 默认为正常播放
let currentRepeatMode = REPEAT_MODE.NO_REPEAT;

/**
 * 初始化循环模式功能
 */
export function initRepeatMode() {
    // 创建循环模式切换按钮
    createRepeatButton();
    
    // 从本地存储加载循环模式
    loadRepeatModeFromStorage();
    
    // 监听音频结束事件
    dom.audioPlayerEl.addEventListener('ended', handleTrackEnded);
}

/**
 * 创建循环模式切换按钮
 */
function createRepeatButton() {
    // 创建按钮元素
    const repeatButton = document.createElement('button');
    repeatButton.id = 'repeatButton';
    repeatButton.className = 'button';
    repeatButton.title = '循环模式: 正常播放';
    
    // 添加图标
    repeatButton.innerHTML = '<i class="fas fa-arrow-right"></i>';
    
    // 添加点击事件
    repeatButton.addEventListener('click', toggleRepeatMode);
    
    // 查找插入位置 (在随机播放按钮之后)
    const shuffleButton = document.getElementById('shuffleButton');
    if (shuffleButton && shuffleButton.parentNode) {
        shuffleButton.parentNode.insertBefore(repeatButton, shuffleButton.nextSibling);
    } else {
        // 如果找不到随机播放按钮，则添加到控制区域的末尾
        const controlsElement = document.querySelector('.controls');
        if (controlsElement) {
            controlsElement.appendChild(repeatButton);
        }
    }
}

/**
 * 切换循环模式
 */
export function toggleRepeatMode() {
    // 循环切换模式
    currentRepeatMode = (currentRepeatMode + 1) % 3;
    
    // 保存到本地存储
    saveRepeatModeToStorage();
    
    // 更新 UI
    updateRepeatButtonUI();
}

/**
 * 更新循环按钮 UI
 */
function updateRepeatButtonUI() {
    const repeatButton = document.getElementById('repeatButton');
    if (!repeatButton) return;
    
    // 移除所有可能的模式类
    repeatButton.classList.remove('no-repeat', 'repeat-one', 'repeat-all', 'active');
    
    // 根据当前模式更新按钮
    switch (currentRepeatMode) {
        case REPEAT_MODE.NO_REPEAT:
            repeatButton.innerHTML = '<i class="fas fa-arrow-right"></i>';
            repeatButton.title = '循环模式: 正常播放';
            repeatButton.classList.add('no-repeat');
            repeatButton.style.backgroundColor = '#f0f0f0'; // 设置背景颜色
            repeatButton.style.color = '#888';
            break;
        case REPEAT_MODE.REPEAT_ONE:
            repeatButton.innerHTML = '<i class="fas fa-redo-alt"></i>'; // 更改图标
            repeatButton.title = '循环模式: 单曲循环';
            repeatButton.classList.add('repeat-one', 'active');
            repeatButton.style.backgroundColor = '#ffe5cc'; // 设置背景颜色
            repeatButton.style.color = '#ff7700';
            break;
        case REPEAT_MODE.REPEAT_ALL:
            repeatButton.innerHTML = '<i class="fas fa-repeat"></i>';
            repeatButton.title = '循环模式: 列表循环';
            repeatButton.classList.add('repeat-all', 'active');
            repeatButton.style.backgroundColor = '#ccffe5'; // 设置背景颜色
            repeatButton.style.color = '#00bb77';
            break;
    }
    
    // 更新模式指示器文本
    let modeIndicator = document.getElementById('repeat-mode-indicator');
    if (!modeIndicator) {
        modeIndicator = document.createElement('span'); // 改为 span 元素
        modeIndicator.id = 'repeat-mode-indicator';
        modeIndicator.style.fontSize = '12px';
        modeIndicator.style.opacity = '0.8';
        modeIndicator.style.position = 'absolute'; // 使用绝对定位
        modeIndicator.style.left = '50%'; // 水平居中
        modeIndicator.style.transform = 'translateX(-50%)'; // 调整偏移
        // 插入到歌曲名显示那一行
        const songTitleElement = document.querySelector('.song-title'); // 假设歌曲名显示的类名为 .song-title
        if (songTitleElement && songTitleElement.parentNode) {
            songTitleElement.parentNode.style.position = 'relative'; // 确保父元素是相对定位
            songTitleElement.parentNode.appendChild(modeIndicator);
        }
    }
    
    // 更新模式指示器文本
    switch (currentRepeatMode) {
        case REPEAT_MODE.NO_REPEAT:
            modeIndicator.textContent = '播放模式: 正常播放';
            modeIndicator.style.color = '#888';
            break;
        case REPEAT_MODE.REPEAT_ONE:
            modeIndicator.textContent = '播放模式: 单曲循环';
            modeIndicator.style.color = '#ff7700';
            break;
        case REPEAT_MODE.REPEAT_ALL:
            modeIndicator.textContent = '播放模式: 列表循环';
            modeIndicator.style.color = '#00bb77';
            break;
    }
}

/**
 * 处理歌曲播放结束事件
 */
function handleTrackEnded() {
    switch (currentRepeatMode) {
        case REPEAT_MODE.REPEAT_ONE:
            // 单曲循环，直接再次播放当前歌曲
            dom.audioPlayerEl.currentTime = 0;
            dom.audioPlayerEl.play().catch(e => console.error('重新播放失败:', e));
            break;
        case REPEAT_MODE.REPEAT_ALL:
            // 列表循环，如果是最后一首则播放第一首
            if (state.currentIndex === state.playlist.length - 1 && !state.isShuffleMode) {
                // 导入 loadSong 函数
                import('./player.js').then(playerModule => {
                    playerModule.loadSong(0, true);
                });
            } else {
                // 不是最后一首或处于随机模式，使用正常的下一首逻辑
                import('./player.js').then(playerModule => {
                    playerModule.playNext();
                });
            }
            break;
        case REPEAT_MODE.NO_REPEAT:
        default:
            // 正常播放，使用正常的下一首逻辑
            import('./player.js').then(playerModule => {
                playerModule.playNext();
            });
            break;
    }
}

/**
 * 获取当前循环模式
 */
export function getCurrentRepeatMode() {
    return currentRepeatMode;
}

/**
 * 设置循环模式
 */
export function setRepeatMode(mode) {
    if (mode >= 0 && mode <= 2) {
        currentRepeatMode = mode;
        updateRepeatButtonUI();
        saveRepeatModeToStorage();
    }
}

/**
 * 保存循环模式到本地存储
 */
function saveRepeatModeToStorage() {
    try {
        localStorage.setItem('notionMusicRepeatMode', currentRepeatMode.toString());
    } catch (e) {
        console.error('保存循环模式失败:', e);
    }
}

/**
 * 从本地存储加载循环模式
 */
function loadRepeatModeFromStorage() {
    try {
        const savedMode = localStorage.getItem('notionMusicRepeatMode');
        if (savedMode !== null) {
            currentRepeatMode = parseInt(savedMode, 10);
            updateRepeatButtonUI();
        }
    } catch (e) {
        console.error('加载循环模式失败:', e);
    }
}

// 通用工具函数

import * as dom from './dom.js';
import { loadPlayerState } from './storage.js';

// 调试日志函数
export function logDebug(message) {
    console.log(`[DEBUG] ${message}`);
}

// 显示错误
export function showError(message) {
    dom.loadingEl.textContent = message;
    dom.loadingEl.classList.add('error');
}

// 显示播放器
export function showPlayer() {
    dom.loadingEl.style.display = 'none';
    dom.searchResultsEl.style.display = 'none';
    dom.playerEl.style.display = 'block';

    // 加载保存的播放器状态
    loadPlayerState();
}
// 音量控制

import * as dom from './dom.js';
import { savePlayerState } from './storage.js';

// 上次音量记录，用于静音切换
let lastVolume = 1;

// 设置音量
export function setVolume(value) {
    // 设置三个音频元素的音量
    dom.audioPlayerEl.volume = value;
    dom.prevAudioPlayerEl.volume = value;
    dom.nextAudioPlayerEl.volume = value;
    
    // 更新音量按钮图标
    updateVolumeIcon(value);
}

// 更新音量图标
export function updateVolumeIcon(volume) {
    if (volume === 0) {
        dom.volumeButtonEl.textContent = '🔇';
    } else if (volume < 0.5) {
        dom.volumeButtonEl.textContent = '🔉';
    } else {
        dom.volumeButtonEl.textContent = '🔊';
    }
}

// 静音/取消静音功能
export function toggleMute() {
    if (dom.audioPlayerEl.volume > 0) {
        lastVolume = dom.audioPlayerEl.volume;
        setVolume(0);
        dom.volumeSliderEl.value = 0;
    } else {
        setVolume(lastVolume);
        dom.volumeSliderEl.value = lastVolume;
    }
    savePlayerState();
}
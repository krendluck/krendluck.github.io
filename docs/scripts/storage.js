// 状态保存与恢复

import * as state from './state.js';
import * as dom from './dom.js';
import { setVolume } from './volume.js';
import { createShuffledPlaylist } from './shuffle.js';

// 保存播放器状态
export function savePlayerState() {
    try {
        localStorage.setItem('musicPlayer_shuffleMode', state.isShuffleMode.toString());
        localStorage.setItem('musicPlayer_volume', dom.audioPlayerEl.volume.toString());
    } catch (e) {
        console.log('无法保存播放器状态:', e);
    }
}

// 加载播放器状态
export function loadPlayerState() {
    try {
        // 加载随机播放状态
        const savedShuffleMode = localStorage.getItem('musicPlayer_shuffleMode');
        if (savedShuffleMode === 'true') {
            state.updateShuffleMode(true);
            dom.shuffleButtonEl.classList.add('active');
            
            // 创建随机播放列表
            const shuffledPlaylist = createShuffledPlaylist();
            state.updateShuffledPlaylist(shuffledPlaylist);
            state.updateCurrentShuffleIndex(0);
            state.updatePlaybackHistory([state.currentIndex]);
        }
        
        // 加载音量设置
        const savedVolume = localStorage.getItem('musicPlayer_volume');
        if (savedVolume !== null) {
            const volume = parseFloat(savedVolume);
            setVolume(volume);
            dom.volumeSliderEl.value = volume;
        }
    } catch (e) {
        console.log('无法加载播放器状态:', e);
    }
}
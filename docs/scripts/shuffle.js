// 随机播放功能

import * as state from './state.js';
import * as dom from './dom.js';
import { logDebug } from './utils.js';
import { savePlayerState } from './storage.js';
import { ensureValidUrl } from './autoRefresh.js';

// 切换随机播放模式
export function toggleShuffle() {
    state.updateShuffleMode(!state.isShuffleMode);
    
    if (state.isShuffleMode) {
        // 激活随机播放
        dom.shuffleButtonEl.classList.add('active');
        logDebug('随机播放模式已开启');
        
        // 创建随机播放列表
        const shuffledPlaylist = createShuffledPlaylist();
        state.updateShuffledPlaylist(shuffledPlaylist);
        
        // 找到当前歌曲在随机列表中的位置
        const currentShuffleIndex = shuffledPlaylist.indexOf(state.currentIndex);
        if (currentShuffleIndex === -1) {
            state.updateCurrentShuffleIndex(0);
            logDebug('当前歌曲在随机列表中位置异常，已重置为0');
        } else {
            state.updateCurrentShuffleIndex(currentShuffleIndex);
        }
        
        // 重置播放历史
        state.updatePlaybackHistory([state.currentIndex]);
    } else {
        // 取消随机播放
        dom.shuffleButtonEl.classList.remove('active');
        logDebug('随机播放模式已关闭');
    }
    
    // 更新预加载
    preloadAdjacentSongs(state.currentIndex);
    
    savePlayerState();
    
    // 添加更明显的状态指示
    const modeText = state.isShuffleMode ? '随机模式' : '顺序模式';
    console.log(`播放模式切换为: ${modeText}`);
}

// 创建随机排序的播放列表
export function createShuffledPlaylist() {
    // 创建包含所有索引的数组
    const indices = Array.from({ length: state.playlist.length }, (_, i) => i);
    
    // 排除当前播放的歌曲
    const currentSong = indices.splice(state.currentIndex, 1)[0];
    
    // Fisher-Yates 洗牌算法
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    // 将当前歌曲放在第一位
    indices.unshift(currentSong);
    
    return indices;
}

// 预加载相邻歌曲
export async function preloadAdjacentSongs(index) {
    let prevIndex, nextIndex;
    
    if (state.isShuffleMode) {
        // 在随机模式下获取前后歌曲
        prevIndex = state.playbackHistory.length > 1 
            ? state.playbackHistory[state.playbackHistory.length - 2] 
            : index;
        
        const nextShuffleIndex = (state.currentShuffleIndex + 1) % state.shuffledPlaylist.length;
        nextIndex = state.shuffledPlaylist[nextShuffleIndex];
    } else {
        // 常规模式
        prevIndex = (index - 1 + state.playlist.length) % state.playlist.length;
        nextIndex = (index + 1) % state.playlist.length;
    }
    
    // 预加载前一首歌
    if (prevIndex !== index && state.playlist[prevIndex]) {
        const validUrl = await ensureValidUrl(state.playlist[prevIndex]);
        if (validUrl) {
            dom.prevAudioPlayerEl.src = validUrl;
            dom.prevAudioPlayerEl.load();
        }
    }
    
    // 预加载后一首歌
    if (nextIndex !== index && state.playlist[nextIndex]) {
        const validUrl = await ensureValidUrl(state.playlist[nextIndex]);
        if (validUrl) {
            dom.nextAudioPlayerEl.src = validUrl;
            dom.nextAudioPlayerEl.load();
        }
    }
}
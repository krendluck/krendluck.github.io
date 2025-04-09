// 状态保存与恢复

import * as state from './state.js';
import * as dom from './dom.js';
import { setVolume } from './volume.js';
import { createShuffledPlaylist } from './shuffle.js';
import { loadSong } from './player.js';

// 保存播放器状态
export function savePlayerState() {
    try {
        localStorage.setItem('musicPlayer_shuffleMode', state.isShuffleMode.toString());
        localStorage.setItem('musicPlayer_volume', dom.audioPlayerEl.volume.toString());
        
        // 保存当前歌曲索引
        localStorage.setItem('musicPlayer_currentIndex', state.currentIndex.toString());
        
        // 保存当前播放位置
        localStorage.setItem('musicPlayer_currentTime', dom.audioPlayerEl.currentTime.toString());
        
        // 保存播放状态（是否正在播放）
        localStorage.setItem('musicPlayer_isPlaying', (!dom.audioPlayerEl.paused).toString());
        
        // 保存当前播放列表标识（通过标签或搜索词）
        if (state.currentPlaylistTag) {
            localStorage.setItem('musicPlayer_playlistTag', state.currentPlaylistTag);
        } else {
            localStorage.removeItem('musicPlayer_playlistTag');
        }
        
        if (state.currentSearchTerm) {
            localStorage.setItem('musicPlayer_searchTerm', state.currentSearchTerm);
        } else {
            localStorage.removeItem('musicPlayer_searchTerm');
        }
        
        console.log('播放器状态已保存：', {
            歌曲索引: state.currentIndex,
            播放位置: dom.audioPlayerEl.currentTime,
            播放状态: !dom.audioPlayerEl.paused
        });
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
        
        // 返回保存的播放信息
        return {
            index: localStorage.getItem('musicPlayer_currentIndex'),
            time: localStorage.getItem('musicPlayer_currentTime'),
            isPlaying: localStorage.getItem('musicPlayer_isPlaying') === 'true',
            playlistTag: localStorage.getItem('musicPlayer_playlistTag'),
            searchTerm: localStorage.getItem('musicPlayer_searchTerm')
        };
    } catch (e) {
        console.log('无法加载播放器状态:', e);
        return null;
    }
}

// 根据保存的状态恢复播放
export function restorePlayback() {
    const savedState = loadPlayerState();
    if (!savedState || !savedState.index) return false;
    
    const index = parseInt(savedState.index);
    if (isNaN(index) || index < 0 || index >= state.playlist.length) return false;
    
    // 加载歌曲但不自动播放
    loadSong(index, false);
    
    // 恢复播放位置
    if (savedState.time) {
        const time = parseFloat(savedState.time);
        if (!isNaN(time)) {
            dom.audioPlayerEl.currentTime = time;
        }
    }
    
    // 如果之前是播放状态，则继续播放
    if (savedState.isPlaying) {
        dom.audioPlayerEl.play().catch(e => console.log('自动播放被浏览器策略阻止'));
    }
    
    console.log('已恢复到上次播放状态:', {
        歌曲索引: index,
        播放位置: dom.audioPlayerEl.currentTime,
        是否播放: savedState.isPlaying
    });
    
    return true;
}
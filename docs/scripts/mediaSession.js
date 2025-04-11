// Media Session API 集成
// 允许在系统级别控制播放器 (例如通知栏、锁屏、外部设备按钮等)

import * as state from './state.js';
import * as dom from './dom.js';
import { playPrevious, playNext } from './player.js';

/**
 * 初始化 Media Session API
 */
export function initMediaSession() {
    // 检查浏览器是否支持 Media Session API
    if ('mediaSession' in navigator) {
        // 设置媒体会话处理程序
        setupMediaSessionHandlers();
        
        // 监听音频播放状态变化以更新 Media Session 信息
        dom.audioPlayerEl.addEventListener('play', updateMediaSessionMetadata);
        
        console.log('Media Session API 已初始化');
    } else {
        console.log('此浏览器不支持 Media Session API');
    }
}

/**
 * 设置媒体会话处理程序
 */
function setupMediaSessionHandlers() {
    navigator.mediaSession.setActionHandler('play', () => {
        dom.audioPlayerEl.play().catch(e => console.error('播放失败:', e));
    });
    
    navigator.mediaSession.setActionHandler('pause', () => {
        dom.audioPlayerEl.pause();
    });
    
    navigator.mediaSession.setActionHandler('previoustrack', () => {
        playPrevious();
    });
    
    navigator.mediaSession.setActionHandler('nexttrack', () => {
        playNext();
    });
    
    // 若需要支持快进/快退功能，可取消注释以下代码
    /*
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        dom.audioPlayerEl.currentTime = Math.max(dom.audioPlayerEl.currentTime - skipTime, 0);
    });
    
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        dom.audioPlayerEl.currentTime = Math.min(
            dom.audioPlayerEl.currentTime + skipTime,
            dom.audioPlayerEl.duration || 0
        );
    });
    */
}

/**
 * 更新媒体会话元数据
 */
function updateMediaSessionMetadata() {
    if (!state.playlist.length || state.currentIndex < 0) return;
    
    const currentSong = state.playlist[state.currentIndex];
    if (!currentSong) return;
    
    // 设置当前歌曲信息
    try {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentSong.title || '未知歌曲',
            artist: currentSong.artist || '未知歌手',
            album: state.currentPlaylistTag || 'Notion 音乐库',
            // 如果有封面图像，可以添加在这里
            artwork: [
                { 
                    src: currentSong.cover || 'https://via.placeholder.com/96/666666/FFFFFF?text=Music',
                    sizes: '96x96',
                    type: 'image/png' 
                },
                { 
                    src: currentSong.cover || 'https://via.placeholder.com/128/666666/FFFFFF?text=Music', 
                    sizes: '128x128',
                    type: 'image/png' 
                },
                { 
                    src: currentSong.cover || 'https://via.placeholder.com/192/666666/FFFFFF?text=Music', 
                    sizes: '192x192',
                    type: 'image/png' 
                },
                { 
                    src: currentSong.cover || 'https://via.placeholder.com/256/666666/FFFFFF?text=Music', 
                    sizes: '256x256',
                    type: 'image/png' 
                },
                { 
                    src: currentSong.cover || 'https://via.placeholder.com/512/666666/FFFFFF?text=Music', 
                    sizes: '512x512',
                    type: 'image/png' 
                },
            ]
        });
        
        // 设置播放状态
        navigator.mediaSession.playbackState = dom.audioPlayerEl.paused ? 'paused' : 'playing';
        
        console.log('已更新媒体会话元数据:', currentSong.title);
    } catch (error) {
        console.error('更新媒体会话元数据失败:', error);
    }
}

/**
 * 更新播放状态
 */
export function updatePlaybackState(isPlaying) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
}

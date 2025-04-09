// 主入口文件

import * as dom from './dom.js';
import { initPlayer, playPrevious, playNext, updateBackButton } from './player.js';
import { toggleShuffle } from './shuffle.js';
import { setVolume, toggleMute } from './volume.js';
import { savePlayerState } from './storage.js';
import { searchSongs } from './search.js';
import { updateCurrentLyrics } from './lyrics.js';

// 添加事件监听器
function setupEventListeners() {
    // 播放控制
    dom.prevButtonEl.addEventListener('click', playPrevious);
    dom.nextButtonEl.addEventListener('click', playNext);
    dom.audioPlayerEl.addEventListener('ended', playNext);
    dom.audioPlayerEl.addEventListener('play', savePlayerState);
    dom.audioPlayerEl.addEventListener('pause', savePlayerState);
    // 随机播放
    dom.shuffleButtonEl.addEventListener('click', toggleShuffle);
    
    // 音量控制
    dom.volumeSliderEl.addEventListener('input', function() {
        const volume = parseFloat(this.value);
        setVolume(volume);
        savePlayerState();
    });
    dom.volumeButtonEl.addEventListener('click', toggleMute);
    
    // 搜索功能
    dom.searchButtonEl.addEventListener('click', () => {
        const query = dom.searchInputEl.value.trim();
        if (query) {
            searchSongs(query);
        }
    });
    
    // 添加搜索框回车键事件
    dom.searchInputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = dom.searchInputEl.value.trim();
            if (query) {
                searchSongs(query);
            }
        }
    });
    
    // 返回按钮
    dom.backToSearchButtonEl.addEventListener('click', () => {
        dom.playerEl.style.display = 'none';
        dom.searchResultsEl.style.display = 'block';
        
        // 高亮显示当前播放的歌曲
        const items = dom.searchListEl.querySelectorAll('.song-item');
        items.forEach(item => item.classList.remove('active'));
        
        const currentItem = dom.searchListEl.querySelector(`[data-index="${window.currentIndex}"]`);
        if (currentItem) {
            currentItem.classList.add('active');
            currentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
    
    // 歌词更新和定期保存播放进度
    let lastSaveTime = 0;
    dom.audioPlayerEl.addEventListener('timeupdate', () => {
        // 更新歌词
        updateCurrentLyrics(dom.audioPlayerEl.currentTime);
        
        // 每30秒保存一次播放进度
        const currentTime = Math.floor(dom.audioPlayerEl.currentTime);
        if (currentTime % 30 === 0 && currentTime !== lastSaveTime && currentTime > 0) {
            lastSaveTime = currentTime;
            savePlayerState();
            console.log(`已保存播放进度: ${currentTime}秒`);
        }
    });
    
    // 歌曲滑块拖动后保存状态
    dom.audioPlayerEl.addEventListener('seeked', () => {
        savePlayerState();
    });
    
    // 点击播放器滑块后保存状态
    const progressSlider = document.getElementById('progress-slider');
    if (progressSlider) {
        progressSlider.addEventListener('change', savePlayerState);
    }
}

// 页面关闭或离开时保存状态
window.addEventListener('beforeunload', () => {
    console.log('页面即将关闭，保存最终播放状态');
    savePlayerState();
});

// 页面可见性变化时保存状态（用户切换标签页）
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        console.log('页面切换到后台，保存播放状态');
        savePlayerState();
    }
});

// 初始化
window.addEventListener('load', () => {
    console.log('页面加载，初始化播放器');
    setupEventListeners();
    initPlayer();
});

// 防止长时间播放时状态丢失，定期保存
setInterval(savePlayerState, 5 * 60 * 1000); // 每5分钟保存一次
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
    
    // 歌词更新
    dom.audioPlayerEl.addEventListener('timeupdate', () => {
        updateCurrentLyrics(dom.audioPlayerEl.currentTime);
    });
}

// 初始化
window.addEventListener('load', () => {
    setupEventListeners();
    initPlayer();
});
// 主入口文件

import * as dom from './dom.js';
import { initPlayer, playPrevious, playNext } from './player.js'; // Removed updateBackButton if not used here
import { toggleShuffle } from './shuffle.js';
import { setVolume, toggleMute } from './volume.js';
import { savePlayerState } from './storage.js';
// Import the new search handler
import { handleMainSearch } from './search.js';
import { updateCurrentLyrics } from './lyrics.js';
import { setupAutoRefresh } from './autoRefresh.js';
// Import browse functions needed here
import { initBrowseFeature, showBrowseView } from './browse.js';
// Import new features
import { initKeyboardControls } from './keyboardControls.js';
import { initMediaSession } from './mediaSession.js';
import { initRepeatMode } from './repeatMode.js';

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
    // 搜索功能 - Use the new handler
    dom.searchButtonEl.addEventListener('click', () => {
        const query = dom.searchInputEl.value.trim();
        if (query) {
            handleMainSearch(query); // Use the new handler
        }
    });

    // 添加搜索框回车键事件 - Use the new handler
    dom.searchInputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = dom.searchInputEl.value.trim();
            if (query) {
                handleMainSearch(query); // Use the new handler
            }
        }
    });

    // 返回按钮 (from player back to search results) - Keep this if needed
    // Ensure window.currentIndex is correctly managed or use state.currentIndex
    if (dom.backToSearchButtonEl) {
         dom.backToSearchButtonEl.addEventListener('click', () => {
             if(dom.playerEl) dom.playerEl.style.display = 'none';
             if(dom.searchResultsEl) dom.searchResultsEl.style.display = 'block';

             // Highlight current song in search results (needs state access)
             // This logic might need refinement based on how state is managed
             // const currentIdx = state.currentIndex; // Assuming state module exports currentIndex
             // if (currentIdx !== -1 && dom.searchListEl) {
             //     const items = dom.searchListEl.querySelectorAll('.song-item');
             //     items.forEach(item => item.classList.remove('active'));
             //     const currentItem = dom.searchListEl.querySelector(`[data-index="${currentIdx}"]`);
             //     if (currentItem) {
             //         currentItem.classList.add('active');
             //         currentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
             //     }
             // }
         });
    } else {
         console.warn("Back to search button not found.");
    }


    // Browse Button Listener
    const browseButton = document.getElementById('browse-button'); // Get the browse button
    if (browseButton) {
        browseButton.addEventListener('click', showBrowseView); // Attach showBrowseView
        console.log('Browse button event listener attached.');
    } else {
        console.warn("Browse button not found.");
    }

    // 歌词更新和定期保存播放进度
    let lastSaveTime = 0;
    if (dom.audioPlayerEl) {
        dom.audioPlayerEl.addEventListener('timeupdate', () => {
            // 更新歌词
            updateCurrentLyrics(dom.audioPlayerEl.currentTime);

            // 每30秒保存一次播放进度
            const currentTime = Math.floor(dom.audioPlayerEl.currentTime);
            // Check if audio is actually playing to avoid saving paused state repeatedly
            if (!dom.audioPlayerEl.paused && currentTime % 30 === 0 && currentTime !== lastSaveTime && currentTime > 0) {
                lastSaveTime = currentTime;
                savePlayerState();
                console.log(`已保存播放进度: ${currentTime}秒`);
            }
        });
    } else {
         console.warn("Audio player element not found for timeupdate listener.");
    }


    // 歌曲滑块拖动后保存状态
    if (dom.audioPlayerEl) {
        dom.audioPlayerEl.addEventListener('seeked', () => {
            savePlayerState();
        });
    }

    // 点击播放器滑块后保存状态 (Ensure progress-slider exists or remove this)
    // const progressSlider = document.getElementById('progress-slider');
    // if (progressSlider) {
    //     progressSlider.addEventListener('change', savePlayerState);
    // } else {
    //      console.warn("Progress slider element not found.");
    // }
}

// --- Initialization ---

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed. Initializing application...');
    try {
        initPlayer(); // Initialize player core first
        initBrowseFeature(); // Initialize browse feature
        setupEventListeners(); // Setup main event listeners
        setupAutoRefresh(); // Setup auto-refresh if needed
        
        // Initialize new features
        initKeyboardControls();
        initMediaSession();
        initRepeatMode();
        
        console.log('Application initialized successfully.');
    } catch (error) {
        console.error("Initialization failed:", error);
        // Display a user-friendly error message on the page
        const body = document.querySelector('body');
        if (body) {
            body.innerHTML = '<div style="padding: 20px; text-align: center; color: red;">应用程序初始化失败，请刷新页面重试。</div>';
        }
    }
});


// --- Background Tasks ---

// Prevent excessive saving when page is hidden
let saveIntervalId = null;

function startPeriodicSave() {
    if (saveIntervalId === null) {
        saveIntervalId = setInterval(() => {
             // Only save if playing
             if (dom.audioPlayerEl && !dom.audioPlayerEl.paused) {
                 savePlayerState();
                 console.log("Periodic state save (5 min).");
             }
        }, 5 * 60 * 1000); // 5 minutes
        console.log("Started periodic state save.");
    }
}

function stopPeriodicSave() {
    if (saveIntervalId !== null) {
        clearInterval(saveIntervalId);
        saveIntervalId = null;
        console.log("Stopped periodic state save.");
    }
}


// Page lifecycle event listeners
window.addEventListener('beforeunload', () => {
    console.log('Page unloading, saving final state...');
    // Ensure state is saved only if necessary (e.g., if playing)
    if (dom.audioPlayerEl && !dom.audioPlayerEl.paused) {
         savePlayerState();
    }
    stopPeriodicSave(); // Clear interval on unload
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        console.log('Page hidden, saving state...');
         if (dom.audioPlayerEl && !dom.audioPlayerEl.paused) {
             savePlayerState();
         }
        stopPeriodicSave(); // Stop interval when hidden
    } else if (document.visibilityState === 'visible') {
        console.log('Page visible, restarting periodic save.');
        startPeriodicSave(); // Restart interval when visible again
    }
});

// Start periodic save initially
startPeriodicSave();

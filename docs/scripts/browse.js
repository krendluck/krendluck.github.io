// 歌曲浏览功能

import * as state from './state.js';
import * as dom from './dom.js';
import { logDebug, showError, showPlayer } from './utils.js';
import { loadSong } from './player.js';
import { fetchPlaylistFromNotion } from './api.js';

// DOM元素
let browseViewEl;
let browseListEl;
let browseCountEl;
let tagFiltersEl;
let sortSelectorEl;
let backToPlayerButtonEl;
let browseButtonEl;

// 状态
let allSongs = [];
let filteredSongs = [];
let activeTag = null;
let currentSort = 'title-asc';

/**
 * 初始化歌曲浏览功能
 */
export function initBrowseFeature() {
    // 获取DOM元素
    browseViewEl = document.getElementById('browse-view');
    browseListEl = document.getElementById('browse-list');
    browseCountEl = document.getElementById('browse-count');
    tagFiltersEl = document.getElementById('tag-filters');
    sortSelectorEl = document.getElementById('sort-selector');
    backToPlayerButtonEl = document.getElementById('back-to-player-button');
    browseButtonEl = document.getElementById('browse-button');
    
    // 添加事件监听
    if (backToPlayerButtonEl) {
        backToPlayerButtonEl.addEventListener('click', hideBrowseView);
    }
    
    if (sortSelectorEl) {
        sortSelectorEl.addEventListener('change', handleSortChange);
    }
    
    // 为浏览按钮添加事件监听
    if (browseButtonEl) {
        browseButtonEl.addEventListener('click', showBrowseView);
        logDebug('浏览按钮事件已绑定');
    } else {
        logDebug('警告: 未找到浏览按钮');
    }

    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', hideBrowseView);
        // 默认隐藏返回按钮，只在浏览视图中显示
        backButton.style.display = 'none';
    }

    // 添加浏览内搜索功能
    const browseSearchInput = document.getElementById('browse-search');
    const browseSearchButton = document.getElementById('browse-search-button');
    
    if (browseSearchInput) {
        browseSearchInput.addEventListener('input', handleBrowseSearch);
    }
    
    if (browseSearchButton) {
        browseSearchButton.addEventListener('click', () => {
            handleBrowseSearch({ target: browseSearchInput });
        });
    }
    
    // 添加滚动优化
    if (browseListEl) {
        browseListEl.addEventListener('wheel', handleSmoothScroll, { passive: false });
    }
    
    logDebug('歌曲浏览功能已初始化');
}

/**
 * 显示浏览视图
 */
export async function showBrowseView() {
    // 添加浏览模式类到body
    document.body.classList.add('browse-mode');
    
    // 显示返回按钮
    const backButton = document.getElementById('back-button');
    if (backButton) backButton.style.display = 'inline-block';

    // 隐藏其他视图
    dom.playerEl.style.display = 'none';
    dom.searchResultsEl.style.display = 'none';
    dom.loadingEl.style.display = 'block';
    dom.loadingEl.textContent = '加载歌曲库...';
    
    try {
        // 如果还没有加载过，或强制刷新
        if (allSongs.length === 0) {
            // 加载所有歌曲
            const songs = await fetchPlaylistFromNotion();
            allSongs = songs;
            
            // 提取所有标签
            const tags = extractAllTags(songs);
            renderTagFilters(tags);
        }
        
        // 应用当前过滤和排序
        applyFilterAndSort();
        
        // 显示浏览视图
        dom.loadingEl.style.display = 'none';
        browseViewEl.style.display = 'block';
        
        logDebug('显示歌曲浏览视图');
    } catch (error) {
        console.error('加载歌曲库失败:', error);
        showError('无法加载歌曲库，请稍后再试');
    }
}

/**
 * 隐藏浏览视图，回到播放器
 */
function hideBrowseView() {
    // 移除浏览模式类
    document.body.classList.remove('browse-mode');
    
    // 隐藏返回按钮
    const backButton = document.getElementById('back-button');
    if (backButton) backButton.style.display = 'none';

    browseViewEl.style.display = 'none';
    
    // 如果有正在播放的歌曲，显示播放器
    if (state.playlist.length > 0) {
        showPlayer();
    } else {
        dom.searchResultsEl.style.display = 'block';
    }
    
    logDebug('隐藏歌曲浏览视图');
}

/**
 * 从歌曲列表中提取所有标签
 */
function extractAllTags(songs) {
    const tagsSet = new Set();
    
    songs.forEach(song => {
        if (song.tags && Array.isArray(song.tags)) {
            song.tags.forEach(tag => tagsSet.add(tag));
        }
    });
    
    return Array.from(tagsSet).sort();
}

/**
 * 渲染标签过滤器
 */
function renderTagFilters(tags) {
    // 清空现有标签
    tagFiltersEl.innerHTML = '';
    
    // 添加"全部"标签
    const allTagEl = document.createElement('div');
    allTagEl.className = 'tag-filter' + (activeTag === null ? ' active' : '');
    allTagEl.textContent = '全部';
    allTagEl.addEventListener('click', () => {
        activeTag = null;
        updateTagFiltersUI();
        applyFilterAndSort();
    });
    tagFiltersEl.appendChild(allTagEl);
    
    // 添加所有标签
    tags.forEach(tag => {
        const tagEl = document.createElement('div');
        tagEl.className = 'tag-filter' + (activeTag === tag ? ' active' : '');
        tagEl.textContent = tag;
        tagEl.addEventListener('click', () => {
            activeTag = tag;
            updateTagFiltersUI();
            applyFilterAndSort();
        });
        tagFiltersEl.appendChild(tagEl);
    });
}

/**
 * 更新标签过滤器UI
 */
function updateTagFiltersUI() {
    const tagElements = tagFiltersEl.querySelectorAll('.tag-filter');
    tagElements.forEach(el => {
        if ((el.textContent === '全部' && activeTag === null) || 
            (el.textContent === activeTag)) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
}

/**
 * 处理排序变更
 */
function handleSortChange(e) {
    currentSort = e.target.value;
    applyFilterAndSort();
}

/**
 * 应用过滤和排序
 */
function applyFilterAndSort() {
    // 过滤歌曲
    if (activeTag === null) {
        filteredSongs = [...allSongs];
    } else {
        filteredSongs = allSongs.filter(song => 
            song.tags && Array.isArray(song.tags) && song.tags.includes(activeTag)
        );
    }
    
    // 排序歌曲
    sortSongs(filteredSongs, currentSort);
    
    // 渲染歌曲列表
    renderSongList(filteredSongs);
    
    // 更新计数
    browseCountEl.textContent = `${filteredSongs.length}首歌曲`;
}

/**
 * 按指定方式排序歌曲
 */
function sortSongs(songs, sortBy) {
    const [field, direction] = sortBy.split('-');
    const multiplier = direction === 'asc' ? 1 : -1;
    
    songs.sort((a, b) => {
        let valueA, valueB;
        
        if (field === 'title') {
            valueA = a.title || '';
            valueB = b.title || '';
        } else if (field === 'artist') {
            valueA = a.artist || '';
            valueB = b.artist || '';
        }
        
        return multiplier * valueA.localeCompare(valueB);
    });
}

/**
 * 渲染歌曲列表
 */
function renderSongList(songs) {
    // 清空列表
    browseListEl.innerHTML = '';
    
    // 添加所有歌曲
    songs.forEach((song, index) => {
        const songEl = document.createElement('div');
        songEl.className = 'song-card';
        songEl.dataset.index = index;
        
        // 检查是否是当前播放的歌曲
        const isCurrentSong = state.playlist.length > 0 && 
                             state.currentIndex >= 0 && 
                             state.playlist[state.currentIndex].title === song.title;
        
        if (isCurrentSong) {
            songEl.classList.add('active');
        }
        
        // 歌曲信息
        const songContent = `
            <div class="song-info">
                <div class="song-title">${song.title}</div>
                <div class="song-artist">${song.artist || '未知歌手'}</div>
                ${song.tags && song.tags.length > 0 ? 
                  `<div class="song-tags">
                      ${song.tags.map(tag => `<span class="song-tag">${tag}</span>`).join('')}
                   </div>` : ''}
            </div>
            <div class="song-actions">
                <button class="play-button">
                    <i class="fas ${isCurrentSong ? 'fa-pause' : 'fa-play'}"></i>
                </button>
            </div>
        `;
        
        songEl.innerHTML = songContent;
        
        // 添加点击事件
        songEl.addEventListener('click', () => {
            playSongFromBrowse(index);
        });
        
        browseListEl.appendChild(songEl);
    });
    
    // 添加歌曲为空时的提示
    if (songs.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.innerHTML = `
            <div class="empty-icon"><i class="fas fa-music"></i></div>
            <div class="empty-text">没有找到符合条件的歌曲</div>
        `;
        browseListEl.appendChild(emptyMessage);
    }
    
    // 添加双击播放功能
    songs.forEach((_, index) => {
        const songEl = browseListEl.children[index];
        if (songEl) {
            songEl.addEventListener('dblclick', () => {
                playSongFromBrowse(index);
            });
        }
    });
    
    // 修复滚动问题 - 添加到renderSongList函数末尾
    setTimeout(() => {
        // 强制重新计算滚动区域
        const list = document.getElementById('browse-list');
        list.style.display = 'none';
        // 触发重排
        void list.offsetHeight;
        list.style.display = '';
        
        // 测试是否可滚动
        console.log('列表高度:', list.scrollHeight, '容器高度:', list.clientHeight);
        if (list.scrollHeight > list.clientHeight) {
            console.log('列表应该可以滚动', list.scrollHeight - list.clientHeight, 'px');
        } else {
            console.log('列表内容不足以滚动');
        }
    }, 100);
}

/**
 * 从浏览列表播放歌曲
 */
function playSongFromBrowse(index) {
    // 获取选中的歌曲
    const selectedSong = filteredSongs[index];
    
    if (!selectedSong) {
        logDebug(`歌曲索引无效: ${index}`);
        return;
    }
    
    logDebug(`从浏览列表播放: ${selectedSong.title}`);
    
    // 更新播放列表为当前过滤和排序后的歌曲
    state.updatePlaylist(filteredSongs);
    
    // 加载并播放选中的歌曲
    loadSong(index);
    
    // 显示播放器
    hideBrowseView();
    showPlayer();
    
    // 更新UI
    dom.playlistNameEl.textContent = activeTag ? `分类: ${activeTag}` : 'Notion 音乐库';
    dom.songCountEl.textContent = `${filteredSongs.length}首歌曲`;
}

/**
 * 刷新浏览视图
 */
export async function refreshBrowseView() {
    if (browseViewEl.style.display !== 'none') {
        // 重新加载数据
        allSongs = await fetchPlaylistFromNotion();
        applyFilterAndSort();
    }
}

/**
 * 在浏览列表中搜索
 */
function handleBrowseSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    
    if (!searchTerm) {
        // 如果搜索框为空，显示所有过滤后的歌曲
        applyFilterAndSort();
        return;
    }
    
    // 获取当前过滤后的歌曲
    let searchBase = [...filteredSongs];
    
    // 在当前过滤结果中搜索
    const searchResults = searchBase.filter(song => {
        const titleMatch = song.title && song.title.toLowerCase().includes(searchTerm);
        const artistMatch = song.artist && song.artist.toLowerCase().includes(searchTerm);
        return titleMatch || artistMatch;
    });
    
    // 渲染搜索结果
    renderSongList(searchResults);
    browseCountEl.textContent = `${searchResults.length}首歌曲`;
}

/**
 * 添加平滑滚动
 */
function handleSmoothScroll(e) {
    // 避免与页面滚动冲突
    if (browseListEl.scrollHeight <= browseListEl.clientHeight) {
        return; // 不需要滚动
    }
    
    e.preventDefault();
    
    const delta = e.deltaY;
    const scrollSpeed = 1.5; // 调整滚动速度
    
    browseListEl.scrollTop += delta * scrollSpeed;
}

// 添加滚动指示器
if (filteredSongs.length > 10) {
    const indicator = document.createElement('div');
    indicator.className = 'scroll-indicator';
    indicator.innerHTML = '<i class="fas fa-chevron-down"></i>';
    browseViewEl.appendChild(indicator);
    
    // 3秒后淡出
    setTimeout(() => {
        indicator.style.opacity = '0';
        setTimeout(() => indicator.remove(), 500);
    }, 3000);
    
    // 滚动时立即移除
    browseListEl.addEventListener('scroll', () => {
        indicator.style.opacity = '0';
        setTimeout(() => indicator.remove(), 500);
    }, {once: true});
}

// 添加相应 CSS
const style = document.createElement('style');
style.textContent = `
.scroll-indicator {
    position: absolute;
    bottom: 70px;
    right: 15px;
    width: 36px;
    height: 36px;
    background: rgba(66, 125, 235, 0.7);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    animation: bounce 1.5s infinite;
    opacity: 0.8;
    transition: opacity 0.5s;
    z-index: 10;
}

@keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(10px); }
}

.empty-message {
    text-align: center;
    padding: 50px 0;
    color: rgba(255, 255, 255, 0.6);
}

.empty-icon {
    font-size: 3em;
    margin-bottom: 15px;
    opacity: 0.5;
}

.empty-text {
    font-size: 1.2em;
}

.search-in-browse {
    display: flex;
    margin-bottom: 15px;
}

#browse-search {
    flex: 1;
    background: rgba(30, 30, 30, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 5px;
    padding: 8px 12px;
    color: white;
}

#browse-search-button {
    background: rgba(66, 125, 235, 0.7);
    border: none;
    border-radius: 5px;
    width: 36px;
    margin-left: 8px;
    color: white;
    cursor: pointer;
}
`;
document.head.appendChild(style);
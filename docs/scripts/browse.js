// 歌曲浏览功能

import * as state from './state.js';
import * as dom from './dom.js'; // Assuming dom.js exports necessary elements like playerEl, searchResultsEl, loadingEl
import { logDebug, showError, showPlayer } from './utils.js';
import { loadSong } from './player.js';
import { fetchPlaylistFromNotion } from './api.js';

// Export necessary elements and state for other modules
export let browseViewEl;
export let browseListEl;
export let filteredSongs = []; // Export the currently filtered/sorted list

// DOM elements (internal)
let browseCountEl;
let tagFiltersEl;
let sortSelectorEl;
let backToPlayerButtonEl;
let browseButtonEl;

// State (internal)
let allSongs = [];
let activeTag = null;
let currentSort = 'title-asc';

// State for saving/restoring view
let browseViewState = {
    scrollPosition: 0,
    // Add more state properties later if needed (filters, sort, etc.)
};

/**
 * 初始化歌曲浏览功能
 */
export function initBrowseFeature() {
    // Get DOM elements
    browseViewEl = document.getElementById('browse-view');
    browseListEl = document.getElementById('browse-list');
    browseCountEl = document.getElementById('browse-count');
    tagFiltersEl = document.getElementById('tag-filters'); // Keep internal
    sortSelectorEl = document.getElementById('sort-selector'); // Keep internal
    backToPlayerButtonEl = document.getElementById('back-to-player-button'); // Keep internal
    browseButtonEl = document.getElementById('browse-button'); // Keep internal

    // Add event listeners
    if (backToPlayerButtonEl) {
        backToPlayerButtonEl.addEventListener('click', hideBrowseView); // Use the updated hideBrowseView
    }

    if (sortSelectorEl) {
        sortSelectorEl.addEventListener('change', handleSortChange); // Keep internal handler
    }

    // 加载排序偏好
    loadSortPreference();

    logDebug('歌曲浏览功能已初始化');
}

/**
 * Shows the browse view and handles UI changes.
 */
export async function showBrowseView() {
    logDebug('Attempting to show browse view...');
    savePlayerStateBeforeBrowse(); // Save player state if needed

    // Add browse mode class to body for CSS targeting
    document.body.classList.add('browse-mode');

    // Show search scope toggle and hint (find them by ID)
    const searchScopeContainer = document.getElementById('searchScopeContainer');
    const searchHint = document.getElementById('searchHint');
    if (searchScopeContainer) searchScopeContainer.style.display = 'flex'; // Use flex as defined in HTML
    if (searchHint) {
        searchHint.textContent = '提示: 默认在当前列表搜索，勾选可搜索全部歌曲';
        searchHint.style.display = 'block';
    }

    // Hide other views
    if (dom.playerEl) dom.playerEl.style.display = 'none';
    if (dom.searchResultsEl) dom.searchResultsEl.style.display = 'none';
    if (dom.loadingEl) {
        dom.loadingEl.style.display = 'block';
        dom.loadingEl.textContent = '加载歌曲库...';
    }

    try {
        // Load all songs if not already loaded
        if (allSongs.length === 0) {
            logDebug('Fetching all songs for browse view...');
            const songs = await fetchPlaylistFromNotion();
            allSongs = songs;
            logDebug(`Loaded ${allSongs.length} songs.`);

            // Extract and render tags
            const tags = extractAllTags(songs);
            renderTagFilters(tags); // Keep internal rendering
        }

        // Apply current filters/sort and render
        applyFilterAndSort(); // Keep internal logic

        // Restore previous view state (e.g., scroll position)
        restoreBrowseViewState();

        // Show the browse view element
        if (dom.loadingEl) dom.loadingEl.style.display = 'none';
        if (browseViewEl) browseViewEl.style.display = 'block';

        logDebug('Successfully shown browse view.');

    } catch (error) {
        console.error('加载歌曲库失败:', error);
        showError('无法加载歌曲库，请稍后再试');
        if (dom.loadingEl) dom.loadingEl.style.display = 'none'; // Hide loading on error
        // Optionally show a default view or message here
    }
}

/**
 * Hides the browse view and handles UI cleanup.
 */
export function hideBrowseView() {
    logDebug('Hiding browse view...');
    saveBrowseViewState(); // Save state before hiding

    // Remove browse mode class
    document.body.classList.remove('browse-mode');

    // Hide search scope toggle and hint
    const searchScopeContainer = document.getElementById('searchScopeContainer');
    const searchHint = document.getElementById('searchHint');
    if (searchScopeContainer) searchScopeContainer.style.display = 'none';
    if (searchHint) searchHint.style.display = 'none';

    if (browseViewEl) browseViewEl.style.display = 'none';

    // Decide which view to show next (player or search results)
    if (state.playlist && state.playlist.length > 0 && state.currentIndex !== -1) {
        showPlayer(); // Assumes showPlayer handles displaying the player element
    } else if (dom.searchResultsEl && dom.searchResultsEl.innerHTML.trim() !== '') {
        if (dom.searchResultsEl) dom.searchResultsEl.style.display = 'block';
    } else {
        showPlayer(); // Or handle appropriately
    }

    logDebug('Browse view hidden.');
}

// --- State Saving/Restoring ---

function saveBrowseViewState() {
    if (browseListEl) {
        browseViewState.scrollPosition = browseListEl.scrollTop;
        logDebug(`Saved browse scroll position: ${browseViewState.scrollPosition}`);
    }
}

function restoreBrowseViewState() {
    if (browseListEl) {
        setTimeout(() => {
            browseListEl.scrollTop = browseViewState.scrollPosition;
            logDebug(`Restored browse scroll position: ${browseViewState.scrollPosition}`);
        }, 50);
    }
}

// --- Internal Helper Functions (Keep Private) ---

/*
 * Extracts all unique tags from a list of songs.
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
 * Renders the tag filter buttons.
 */
function renderTagFilters(tags) {
    if (!tagFiltersEl) return;
    tagFiltersEl.innerHTML = ''; // Clear existing tags

    // Add "All" tag
    const allTagEl = document.createElement('div');
    allTagEl.className = 'tag-filter' + (activeTag === null ? ' active' : '');
    allTagEl.textContent = '全部';
    allTagEl.addEventListener('click', () => {
        activeTag = null;
        updateTagFiltersUI();
        applyFilterAndSort();
    });
    tagFiltersEl.appendChild(allTagEl);

    // Add specific tags
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
 * Updates the visual state of tag filter buttons.
 */
function updateTagFiltersUI() {
    if (!tagFiltersEl) return;
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
 * Handles changes in the sort dropdown.
 */
function handleSortChange(e) {
    currentSort = e.target.value;
    logDebug(`排序方式已更改为: ${currentSort}`);
    
    // 保存排序偏好到本地存储
    try {
        localStorage.setItem('musicPlayerSortPreference', currentSort);
    } catch (err) {
        console.error('无法保存排序偏好:', err);
    }
    
    applyFilterAndSort();
}

// 初始化时加载排序偏好
export function loadSortPreference() {
    try {
        const savedSort = localStorage.getItem('musicPlayerSortPreference');
        if (savedSort) {
            currentSort = savedSort;
            logDebug(`从本地存储加载排序偏好: ${currentSort}`);
            
            // 更新排序选择器UI
            if (sortSelectorEl) {
                sortSelectorEl.value = currentSort;
            }
        }
    } catch (err) {
        console.error('无法加载排序偏好:', err);
    }
}

/**
 * Applies the current tag filter and sort order to the song list.
 */
function applyFilterAndSort() {
    logDebug(`Applying filter: ${activeTag || 'All'}, Sort: ${currentSort}`);
    if (activeTag === null) {
        filteredSongs = [...allSongs];
    } else {
        filteredSongs = allSongs.filter(song =>
            song.tags && Array.isArray(song.tags) && song.tags.includes(activeTag)
        );
    }

    sortSongs(filteredSongs, currentSort);

    renderSongList(filteredSongs);

    if (browseCountEl) browseCountEl.textContent = `${filteredSongs.length}首歌曲`;
}

/**
 * Sorts an array of songs based on the specified criteria.
 */
function sortSongs(songs, sortBy) {
    if (!sortBy || !sortBy.includes('-')) {
        console.error('无效的排序参数:', sortBy);
        return;
    }

    const [field, direction] = sortBy.split('-');
    const multiplier = direction === 'asc' ? 1 : -1;

    logDebug(`正在按 ${field} ${direction === 'asc' ? '升序' : '降序'} 排序`);

    songs.sort((a, b) => {
        let valueA = '', valueB = '';

        if (field === 'title') {
            valueA = String(a.title || '').toLowerCase();
            valueB = String(b.title || '').toLowerCase();
        } else if (field === 'artist') {
            valueA = String(a.artist || '').toLowerCase();
            valueB = String(b.artist || '').toLowerCase();
        } else {
            valueA = String(a.title || '').toLowerCase();
            valueB = String(b.title || '').toLowerCase();
        }

        return multiplier * valueA.localeCompare(valueB, 'zh-CN');
    });

    logDebug(`排序完成，共 ${songs.length} 首歌曲`);
}

/**
 * Renders the song list in the browse view. Exporting for potential external use if needed.
 */
export function renderSongList(songs) {
    if (!browseListEl) return;
    browseListEl.innerHTML = '';

    songs.forEach((song, index) => {
        const songEl = document.createElement('div');
        songEl.className = 'song-card';
        songEl.dataset.id = song.id || `browse-idx-${index}`;
        songEl.dataset.index = index;

        const isCurrentSong = state.playlist && state.playlist.length > 0 &&
                             state.currentIndex >= 0 &&
                             state.currentIndex < state.playlist.length &&
                             state.playlist[state.currentIndex].id === song.id;

        if (isCurrentSong) {
            songEl.classList.add('active');
        }

        const songContent = `
            <div class="song-info">
                <div class="song-title">${song.title || '未知标题'}</div>
                <div class="song-artist">${song.artist || '未知歌手'}</div>
                ${song.tags && song.tags.length > 0 ?
                  `<div class="song-tags">
                      ${song.tags.map(tag => `<span class="song-tag">${tag}</span>`).join('')}
                   </div>` : ''}
            </div>
            <div class="song-actions">
                <button class="play-button" aria-label="播放 ${song.title || ''}">
                    <i class="fas ${isCurrentSong ? 'fa-pause' : 'fa-play'}"></i>
                </button>
            </div>
        `;
        songEl.innerHTML = songContent;

        songEl.addEventListener('click', (e) => {
            if (e.target.closest('.play-button')) return;
            playSongFromBrowse(index, songs);
        });

        const playButton = songEl.querySelector('.play-button');
        if (playButton) {
            playButton.addEventListener('click', (e) => {
                e.stopPropagation();
                playSongFromBrowse(index, songs);
            });
        }

        browseListEl.appendChild(songEl);
    });

    if (songs.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.innerHTML = `
            <div class="empty-icon"><i class="fas fa-music"></i></div>
            <div class="empty-text">没有找到符合条件的歌曲</div>
        `;
        browseListEl.appendChild(emptyMessage);
    }

    browseListEl.querySelectorAll('.song-card').forEach((songEl) => {
        songEl.addEventListener('dblclick', () => {
            const idx = parseInt(songEl.dataset.index, 10);
            if (!isNaN(idx)) {
                playSongFromBrowse(idx, songs);
            }
        });
    });
}

/**
 * Plays a song selected from the browse list.
 * @param {number} index - The index of the song in the currently displayed list.
 * @param {Array} currentList - The array of songs currently displayed (e.g., filteredSongs or search results).
 */
function playSongFromBrowse(index, currentList) {
    if (!currentList || index < 0 || index >= currentList.length) {
        logDebug(`无效的歌曲索引或列表: ${index}`);
        return;
    }

    const selectedSong = currentList[index];
    logDebug(`从浏览列表播放: ${selectedSong.title}`);

    state.updatePlaylist(currentList);

    loadSong(index);

    hideBrowseView();
}

/**
 * Refreshes the browse view data.
 */
export async function refreshBrowseView() {
    if (browseViewEl && browseViewEl.style.display !== 'none') {
        logDebug('Refreshing browse view data...');
        try {
            allSongs = await fetchPlaylistFromNotion();
            applyFilterAndSort();
            logDebug('Browse view refreshed.');
        } catch (error) {
            console.error('Failed to refresh browse view:', error);
            showError('刷新失败');
        }
    }
}

/**
 * Filters the currently displayed browse list based on a search term.
 * This performs filtering *within* the results already filtered by tags/sort.
 * @param {string} searchTerm - The term to search for.
 */
export function filterCurrentBrowseList(searchTerm) {
    searchTerm = searchTerm.toLowerCase().trim();
    logDebug(`Filtering browse list with term: "${searchTerm}"`);

    let baseList = [];
    if (activeTag === null) {
        baseList = [...allSongs];
    } else {
        baseList = allSongs.filter(song =>
            song.tags && Array.isArray(song.tags) && song.tags.includes(activeTag)
        );
    }
    sortSongs(baseList, currentSort);

    let results;
    if (!searchTerm) {
        results = baseList;
    } else {
        results = baseList.filter(song => {
            const titleMatch = song.title && song.title.toLowerCase().includes(searchTerm);
            const artistMatch = song.artist && song.artist.toLowerCase().includes(searchTerm);
            return titleMatch || artistMatch;
        });
    }

    renderSongList(results);
    if (browseCountEl) browseCountEl.textContent = `${results.length}首歌曲`;
}

// --- Helper to save player state (placeholder) ---
function savePlayerStateBeforeBrowse() {
    logDebug("Placeholder: Saving player state before browsing.");
}

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

    // Event listener for the main browse button (likely set in main.js now)
    // if (browseButtonEl) {
    //     browseButtonEl.addEventListener('click', showBrowseView); // Use the updated showBrowseView
    //     logDebug('浏览按钮事件已绑定');
    // } else {
    //     logDebug('警告: 未找到浏览按钮');
    // }

    // Add scroll optimization (keep internal)
    // if (browseListEl) {
    //     browseListEl.addEventListener('wheel', handleSmoothScroll, { passive: false });
    // }

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
    // This logic might be better placed in main.js or a dedicated view manager
    if (state.playlist && state.playlist.length > 0 && state.currentIndex !== -1) {
         // Check if currentIndex is valid
        showPlayer(); // Assumes showPlayer handles displaying the player element
    } else if (dom.searchResultsEl && dom.searchResultsEl.innerHTML.trim() !== '') {
         // Check if search results exist
        if (dom.searchResultsEl) dom.searchResultsEl.style.display = 'block';
    } else {
        // Default fallback, maybe show player or a default message
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
    // Save other state aspects here (filters, sort) if needed
}

function restoreBrowseViewState() {
    if (browseListEl) {
        // Use setTimeout to ensure rendering is complete before scrolling
        setTimeout(() => {
            browseListEl.scrollTop = browseViewState.scrollPosition;
            logDebug(`Restored browse scroll position: ${browseViewState.scrollPosition}`);
        }, 50); // Small delay
    }
    // Restore other state aspects here
}

// --- Internal Helper Functions (Keep Private) ---


/*
 * Extracts all unique tags from a list of songs.
 */
function extractAllTags(songs) {
    // ... (keep existing implementation)
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
    // ... (keep existing implementation)
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
    // ... (keep existing implementation)
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
    applyFilterAndSort();
}

/**
 * Applies the current tag filter and sort order to the song list.
 */
function applyFilterAndSort() {
    logDebug(`Applying filter: ${activeTag || 'All'}, Sort: ${currentSort}`);
    // Filter songs based on activeTag
    if (activeTag === null) {
        filteredSongs = [...allSongs]; // Use a copy
    } else {
        filteredSongs = allSongs.filter(song =>
            song.tags && Array.isArray(song.tags) && song.tags.includes(activeTag)
        );
    }

    // Sort the filtered songs
    sortSongs(filteredSongs, currentSort); // Keep internal sorting

    // Render the list
    renderSongList(filteredSongs); // Keep internal rendering

    // Update count display
    if (browseCountEl) browseCountEl.textContent = `${filteredSongs.length}首歌曲`;
}


/**
 * Sorts an array of songs based on the specified criteria.
 */
function sortSongs(songs, sortBy) {
    // ... (keep existing implementation)
    const [field, direction] = sortBy.split('-');
    const multiplier = direction === 'asc' ? 1 : -1;

    songs.sort((a, b) => {
        let valueA = '', valueB = ''; // Default to empty string

        if (field === 'title') {
            valueA = a.title || '';
            valueB = b.title || '';
        } else if (field === 'artist') {
            valueA = a.artist || '';
            valueB = b.artist || '';
        }
        // Add more sort fields if needed

        // Handle potential undefined values during comparison
        if (valueA === valueB) return 0;
        if (valueA < valueB) return -1 * multiplier;
        return 1 * multiplier;
        // return multiplier * valueA.localeCompare(valueB); // localeCompare might be safer
    });
}


/**
 * Renders the song list in the browse view. Exporting for potential external use if needed.
 */
export function renderSongList(songs) {
    // ... (keep most of the existing implementation, ensure it uses browseListEl)
    if (!browseListEl) return;
    browseListEl.innerHTML = ''; // Clear list

    // Add songs
    songs.forEach((song, index) => {
        const songEl = document.createElement('div');
        songEl.className = 'song-card'; // Use existing class
        // Use the song's unique ID if available, otherwise fall back to index
        songEl.dataset.id = song.id || `browse-idx-${index}`;
        songEl.dataset.index = index; // Keep index for playback logic if needed

        // Check if this song is the currently playing one
        const isCurrentSong = state.playlist && state.playlist.length > 0 &&
                             state.currentIndex >= 0 &&
                             state.currentIndex < state.playlist.length && // Bounds check
                             state.playlist[state.currentIndex].id === song.id; // Compare by ID if possible

        if (isCurrentSong) {
            songEl.classList.add('active');
        }

        // Build song card HTML (keep existing structure)
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

        // Add click listener to play the song
        songEl.addEventListener('click', (e) => {
             // Prevent click if play button itself was clicked (handle separately if needed)
             if (e.target.closest('.play-button')) return;
             playSongFromBrowse(index, songs); // Pass the correct list and index
        });

         // Add listener for play button specifically if needed
         const playButton = songEl.querySelector('.play-button');
         if(playButton) {
             playButton.addEventListener('click', (e) => {
                 e.stopPropagation(); // Prevent card click
                 playSongFromBrowse(index, songs); // Pass the correct list and index
             });
         }


        browseListEl.appendChild(songEl);
    });

    // Handle empty list case (keep existing)
    if (songs.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.innerHTML = `
            <div class="empty-icon"><i class="fas fa-music"></i></div>
            <div class="empty-text">没有找到符合条件的歌曲</div>
        `;
        browseListEl.appendChild(emptyMessage);
    }

    // Double-click listener (keep existing, ensure it uses correct index/list)
    // Consider removing if single click is sufficient
    browseListEl.querySelectorAll('.song-card').forEach((songEl) => {
        songEl.addEventListener('dblclick', () => {
            const idx = parseInt(songEl.dataset.index, 10);
            if (!isNaN(idx)) {
                 playSongFromBrowse(idx, songs); // Pass the correct list and index
            }
        });
    });


    // Scroll problem fix attempt (keep existing)
    // setTimeout(() => {
    //     const list = document.getElementById('browse-list');
    //     if (!list) return;
    //     list.style.display = 'none';
    //     void list.offsetHeight;
    //     list.style.display = '';
    //     console.log('列表高度:', list.scrollHeight, '容器高度:', list.clientHeight);
    //     if (list.scrollHeight > list.clientHeight) {
    //         console.log('列表应该可以滚动', list.scrollHeight - list.clientHeight, 'px');
    //     } else {
    //         console.log('列表内容不足以滚动');
    //     }
    // }, 100);
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

    // IMPORTANT: Update the main playlist state with the *currently displayed* list
    state.updatePlaylist(currentList); // Use the list passed as argument

    // Load the song using its index *within the new playlist*
    loadSong(index); // The index now correctly refers to the position in state.playlist

    // Hide browse view and show player
    hideBrowseView(); // Use the updated hideBrowseView
    // showPlayer(); // showPlayer should be called implicitly by loadSong or hideBrowseView logic

    // Update player UI (optional, loadSong might handle this)
    // dom.playlistNameEl.textContent = activeTag ? `分类: ${activeTag}` : '音乐库';
    // dom.songCountEl.textContent = `${currentList.length}首歌曲`;
}


/**
 * Refreshes the browse view data.
 */
export async function refreshBrowseView() {
    // ... (keep existing implementation)
    if (browseViewEl && browseViewEl.style.display !== 'none') {
        logDebug('Refreshing browse view data...');
        try {
            allSongs = await fetchPlaylistFromNotion(); // Reload all songs
            applyFilterAndSort(); // Reapply filters and sort
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

    // Base for filtering is the list already filtered by tags and sorted
    let baseList = [];
    if (activeTag === null) {
        baseList = [...allSongs]; // Start with all songs if no tag filter
    } else {
        baseList = allSongs.filter(song =>
            song.tags && Array.isArray(song.tags) && song.tags.includes(activeTag)
        );
    }
    // Apply current sort to the base list
    sortSongs(baseList, currentSort);


    let results;
    if (!searchTerm) {
        // If search term is empty, show the base list (tag filtered + sorted)
        results = baseList;
    } else {
        // Filter the base list by the search term
        results = baseList.filter(song => {
            const titleMatch = song.title && song.title.toLowerCase().includes(searchTerm);
            const artistMatch = song.artist && song.artist.toLowerCase().includes(searchTerm);
            return titleMatch || artistMatch;
        });
    }

    // Render the filtered results
    renderSongList(results);
    if (browseCountEl) browseCountEl.textContent = `${results.length}首歌曲`;
}

// --- Helper to save player state (placeholder) ---
function savePlayerStateBeforeBrowse() {
    // Placeholder: Implement logic if needed to save volume, shuffle state, etc.
    // before navigating away from the player to the browse view.
    logDebug("Placeholder: Saving player state before browsing.");
}

// Ensure initBrowseFeature is called somewhere in main.js or app initialization

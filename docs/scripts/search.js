// 搜索功能

import * as state from './state.js';
import * as dom from './dom.js';
// Import showPlayer from utils.js
import { showError, logDebug, showPlayer } from './utils.js';
import { fetchSearchResults } from './api.js';
import { loadSong } from './player.js';
// Import necessary functions/variables from browse.js
import { browseViewEl, filterCurrentBrowseList, hideBrowseView } from './browse.js';

/**
 * Handles the main search logic.
 * Determines whether to perform a global API search or filter the current browse list.
 * @param {string} query - The search query.
 */
export async function handleMainSearch(query) {
    query = query.trim();
    if (!query) return;

    logDebug(`Handling main search for: "${query}"`);

    // Check if browse view is active
    const isBrowsing = browseViewEl && browseViewEl.style.display !== 'none';
    logDebug(`Is browsing: ${isBrowsing}`);

    if (isBrowsing) {
        const searchGlobalCheckbox = document.getElementById('searchGlobalCheckbox');
        const searchGlobally = searchGlobalCheckbox && searchGlobalCheckbox.checked;
        logDebug(`Search globally checkbox checked: ${searchGlobally}`);

        if (!searchGlobally) {
            // Filter within the current browse list
            logDebug('Filtering within browse list.');
            filterCurrentBrowseList(query);
            // Optionally clear the main search input after filtering browse list
            // if (dom.searchInputEl) dom.searchInputEl.value = '';
            return; // Stop here, don't perform global search
        }
        // If checkbox is checked, fall through to global search
        logDebug('Proceeding with global search from browse view.');
        // Hide browse view before showing search results
        hideBrowseView();
    }

    // Perform global search (either not browsing or explicitly requested)
    await performGlobalSearch(query);
}


/**
 * Performs a global search using the API.
 * @param {string} query - The search query.
 */
async function performGlobalSearch(query) {
     if (!query || query.trim() === '') return; // Redundant check, but safe

    try {
        logDebug(`Performing global search API call for: "${query}"`);
        if(dom.loadingEl) {
             dom.loadingEl.textContent = '正在搜索...';
             dom.loadingEl.style.display = 'block';
        }
        if(dom.playerEl) dom.playerEl.style.display = 'none';
        if(dom.searchResultsEl) dom.searchResultsEl.style.display = 'none';
        // Ensure browse view is hidden if we came from there
        if (browseViewEl && browseViewEl.style.display !== 'none') {
             hideBrowseView();
        }


        const songs = await fetchSearchResults(query);
        logDebug(`Global search results: Found ${songs.length} songs`);

        if (songs.length === 0) {
            showError(`未找到与 "${query}" 相关的歌曲`);
             if(dom.loadingEl) dom.loadingEl.style.display = 'none'; // Hide loading
            // Optionally show the previous view or an empty search results view
            if(dom.searchResultsEl) {
                 renderSearchResults([]); // Render empty results
                 dom.searchResultsEl.style.display = 'block';
            }
            return;
        }

        // Store search results in the main playlist state
        state.updatePlaylist(songs);

        // Log song details (optional)
        // songs.forEach((song, index) => { ... });

        // Update search results UI
        if(dom.searchTitleEl) dom.searchTitleEl.textContent = `搜索: ${query}`;
        if(dom.searchCountEl) dom.searchCountEl.textContent = `找到 ${songs.length} 首歌曲`;

        // Render search results list
        renderSearchResults(songs); // Keep internal rendering

        // Show search results area
        if(dom.loadingEl) dom.loadingEl.style.display = 'none';
        if(dom.searchResultsEl) dom.searchResultsEl.style.display = 'block';

        // Clear the main search input
        if (dom.searchInputEl) {
            dom.searchInputEl.value = '';
        }

        // Add to search history
        addSearchHistory(query); // Keep internal history management

    } catch (error) {
        console.error('Global search error:', error);
        showError('搜索失败，请稍后再试');
        if(dom.loadingEl) dom.loadingEl.style.display = 'none'; // Hide loading on error
        // Optionally show an error message in the search results area
    }
}

// Keep renderSearchResults, playSongFromSearchResults, addSearchHistory, getSearchHistory as internal helpers or export if needed elsewhere.
// Make sure they use the correct DOM elements from dom.js if applicable.


/**
 * Renders the search results list.
 * @param {Array} songs - The array of songs to render.
 */
function renderSearchResults(songs) {
    if (!dom.searchListEl || !dom.searchCountEl || !dom.searchTitleEl) return;

    dom.searchListEl.innerHTML = ''; // Clear list

     // Remove existing back button if present to avoid duplicates
     const existingBackButton = dom.searchCountEl.nextElementSibling;
     if (existingBackButton && existingBackButton.classList.contains('back-button')) {
         existingBackButton.remove();
     }


    // Add back button only if there are results or it's an empty search display
    const backButton = document.createElement('button');
    backButton.className = 'back-button';
    backButton.textContent = '返回播放器'; // Or '返回浏览' if coming from browse? Needs context.
    backButton.addEventListener('click', () => {
        if(dom.searchResultsEl) dom.searchResultsEl.style.display = 'none';
        // Decide where to go back - player or browse? Needs better state management.
        // For now, default to player if playlist exists.
        if (state.playlist && state.playlist.length > 0 && state.currentIndex !== -1) {
             showPlayer();
        } else {
             // Maybe show browse view if that was the previous context?
             // Or just show player as default.
             showPlayer();
        }
    });
    // Insert back button after the count element
    dom.searchCountEl.after(backButton);


    if (songs.length === 0) {
         // Display empty message if needed
         const emptyMsg = document.createElement('div');
         emptyMsg.textContent = '没有找到匹配的歌曲。';
         emptyMsg.style.textAlign = 'center';
         emptyMsg.style.padding = '20px';
         emptyMsg.style.color = '#888';
         dom.searchListEl.appendChild(emptyMsg);
         return;
    }


    // Render song items
    songs.forEach((song, index) => {
        const item = document.createElement('div');
        item.className = 'song-item'; // Use existing class
        item.dataset.index = index; // Index within the *search results* list
        item.dataset.id = song.id || `search-idx-${index}`; // Use ID if available

        // Use existing structure for title/artist
        const title = document.createElement('div');
        title.className = 'song-title';
        title.textContent = song.title || '未知歌曲';

        const artist = document.createElement('div');
        artist.className = 'song-artist';
        artist.textContent = song.artist || '未知歌手';

        item.appendChild(title);
        item.appendChild(artist);

        // Click event to play the song
        item.addEventListener('click', () => {
            // IMPORTANT: When playing from search results, the *entire* search result list
            // becomes the new playlist.
            playSongFromSearchResults(index, songs);
        });

        dom.searchListEl.appendChild(item);
    });
}

/**
 * Plays a song selected from the search results list.
 * Updates the main playlist to the search results.
 * @param {number} index - Index of the song in the search results list.
 * @param {Array} searchResults - The array of songs from the search results.
 */
function playSongFromSearchResults(index, searchResults) {
     if (!searchResults || index < 0 || index >= searchResults.length) return;

    logDebug(`Playing song from search results at index: ${index}`);

    // Update the main playlist state to be the search results
    state.updatePlaylist(searchResults);

    // Highlight the selected item in the UI
    const items = dom.searchListEl.querySelectorAll('.song-item');
    items.forEach(item => item.classList.remove('active'));
    if (items[index]) items[index].classList.add('active');

    // Load the song using its index within the new playlist (which is searchResults)
    loadSong(index);

    // Show the player view
    if(dom.searchResultsEl) dom.searchResultsEl.style.display = 'none';
    showPlayer(); // Assumes showPlayer handles displaying the player element

    // Update player UI context (optional, loadSong might handle this)
    // if(dom.playlistNameEl && dom.searchTitleEl) dom.playlistNameEl.textContent = dom.searchTitleEl.textContent;
    // if(dom.songCountEl && dom.searchCountEl) dom.songCountEl.textContent = dom.searchCountEl.textContent;
}


/**
 * Adds a query to the search history in localStorage.
 * @param {string} query - The search query to add.
 */
function addSearchHistory(query) {
    // ... (keep existing implementation)
     try {
        let history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        history = history.filter(item => item !== query); // Remove duplicates
        history.unshift(query); // Add to beginning
        if (history.length > 10) { // Limit history size
            history = history.slice(0, 10);
        }
        localStorage.setItem('searchHistory', JSON.stringify(history));
    } catch (e) {
        console.error('Failed to save search history:', e);
    }
}

/**
 * Retrieves the search history from localStorage.
 * @returns {Array<string>} The search history array.
 */
export function getSearchHistory() {
     try {
        return JSON.parse(localStorage.getItem('searchHistory') || '[]');
    } catch (e) {
        console.error('Failed to get search history:', e);
        return [];
    }
}

// Note: The event listeners for the search input/button should now call handleMainSearch(query)
// This setup is typically done in main.js or an initialization function.

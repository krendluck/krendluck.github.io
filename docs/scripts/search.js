// 搜索功能

import * as state from './state.js';
import * as dom from './dom.js';
import { showError } from './utils.js';
import { fetchSearchResults } from './api.js';
import { loadSong } from './player.js';

// 搜索功能
export async function searchSongs(query) {
    if (!query || query.trim() === '') return;
    
    try {
        console.log(`开始搜索: "${query}"`);
        dom.loadingEl.textContent = '正在搜索...';
        dom.playerEl.style.display = 'none';
        dom.searchResultsEl.style.display = 'none';
        dom.loadingEl.style.display = 'block';
        
        const songs = await fetchSearchResults(query);
        console.log(`搜索结果: 找到 ${songs.length} 首歌曲`);
        
        if (songs.length === 0) {
            showError(`未找到与 "${query}" 相关的歌曲`);
            return;
        }
        
        // 存储搜索结果
        state.updatePlaylist(songs);
        
        // 输出歌曲详情日志
        songs.forEach((song, index) => {
            console.log(`歌曲 ${index+1}: ${song.title}, URL: ${song.url ? '有效' : '无效'}, 歌词: ${song.lrc ? '有效' : '无效'}`);
        });
        
        // 更新搜索结果UI
        dom.searchTitleEl.textContent = `搜索: ${query}`;
        dom.searchCountEl.textContent = `找到 ${songs.length} 首歌曲`;
        
        // 渲染搜索结果列表
        renderSearchResults(songs);
        
        // 显示搜索结果区域
        dom.loadingEl.style.display = 'none';
        dom.searchResultsEl.style.display = 'block';

        // 清空搜索框，方便下次搜索
        if (dom.searchInputEl) {
            dom.searchInputEl.value = '';
        }
        
        // 添加历史记录
        addSearchHistory(query);
    } catch (error) {
        console.error('搜索出错:', error);
        showError('搜索失败，请稍后再试');
        throw error;
    }
}

// 渲染搜索结果
export function renderSearchResults(songs) {
    // 清空列表
    dom.searchListEl.innerHTML = '';
    
    // 添加返回按钮   
    const backButton = document.createElement('button');
    backButton.className = 'back-button';
    backButton.textContent = '返回播放器';
    backButton.addEventListener('click', () => {
        dom.searchResultsEl.style.display = 'none';
        dom.playerEl.style.display = 'block';
    });
    
    dom.searchCountEl.after(backButton);
    
    // 为每首歌创建列表项
    songs.forEach((song, index) => {
        const item = document.createElement('div');
        item.className = 'song-item';
        item.dataset.index = index;
        
        const title = document.createElement('div');
        title.className = 'song-title';
        title.textContent = song.title || '未知歌曲';
        
        const artist = document.createElement('div');
        artist.className = 'song-artist';
        artist.textContent = song.artist || '未知歌手';
        
        item.appendChild(title);
        item.appendChild(artist);
        
        // 添加点击事件
        item.addEventListener('click', () => {
            playSongFromSearchResults(index);
        });
        
        dom.searchListEl.appendChild(item);
    });
}

// 从搜索结果中播放选定的歌曲
export function playSongFromSearchResults(index) {
    // 处理高亮显示
    const items = dom.searchListEl.querySelectorAll('.song-item');
    items.forEach(item => item.classList.remove('active'));
    items[index].classList.add('active');
    
    // 播放选定歌曲
    loadSong(index);
    
    // 显示播放器
    dom.searchResultsEl.style.display = 'none';
    dom.playerEl.style.display = 'block';
    
    // 更新播放器界面信息
    dom.playlistNameEl.textContent = dom.searchTitleEl.textContent;
    dom.songCountEl.textContent = dom.searchCountEl.textContent;
}

// 搜索历史记录功能
export function addSearchHistory(query) {
    try {
        let history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        
        // 移除重复项
        history = history.filter(item => item !== query);
        
        // 添加到开头
        history.unshift(query);
        
        // 限制最多保存10条
        if (history.length > 10) {
            history = history.slice(0, 10);
        }
        
        localStorage.setItem('searchHistory', JSON.stringify(history));
        
    } catch (e) {
        console.error('保存搜索历史失败', e);
    }
}

// 获取搜索历史
export function getSearchHistory() {
    try {
        return JSON.parse(localStorage.getItem('searchHistory') || '[]');
    } catch (e) {
        console.error('获取搜索历史失败', e);
        return [];
    }
}
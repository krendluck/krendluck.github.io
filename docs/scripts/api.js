// API 相关功能

import { logDebug } from './utils.js';

export const apiUrl = 'https://notion-music-api.netlify.app/api/music';
export const updateApiUrl = 'https://notion-music-api.netlify.app/api/update';

// 处理链接失效
export async function handleFailedMedia(song, errorType = 'audio') {
    logDebug(`${errorType}链接失效: ${song.title}`);
    logDebug(`失效链接: ${errorType === 'audio' ? song.url : song.lrc}`);
    
    if (!song.id) {
        console.error('无法更新链接: 缺少歌曲ID');
        return null;
    }
    
    try {
        // 通知服务器链接失效
        logDebug(`发送更新请求到: ${updateApiUrl}`);
        logDebug(`请求参数:`, {
            songId: song.id,
            errorType: errorType,
            url: errorType === 'audio' ? song.url : song.lrc
        });
        
        const response = await fetch(updateApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                songId: song.id,
                errorType: errorType,
                url: errorType === 'audio' ? song.url : song.lrc
            })
        });
        
        logDebug(`更新响应状态: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`更新请求失败: ${response.status}`);
        }
        
        const result = await response.json();
        logDebug('更新响应数据:', result);
        
        if (result.success && result.updatedUrl) {
            if (errorType === 'audio') {
                song.url = result.updatedUrl;
                logDebug(`已更新歌曲URL: ${song.title} - ${song.url}`);
                return song.url;
            } else if (errorType === 'lrc') {
                song.lrc = result.updatedUrl;
                logDebug(`已更新歌词URL: ${song.title} - ${song.lrc}`);
                return song.lrc;
            }
        } else {
            console.error('服务器无法更新链接', result);
            return null;
        }
    } catch (error) {
        console.error('请求更新链接时出错:', error);
        return null;
    }
}

// 从 Notion 加载播放列表
export async function fetchPlaylistFromNotion(tag = '') {
    const params = new URLSearchParams();
    if (tag) params.append('tag', tag);
    
    const url = `${apiUrl}${params.toString() ? '?' + params.toString() : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
    }
    
    const data = await response.json();
    return data.songs || [];
}

// 搜索歌曲
export async function fetchSearchResults(query) {
    if (!query || query.trim() === '') return [];
    
    const searchUrl = `${apiUrl}?search=${encodeURIComponent(query)}`;
    logDebug(`发送请求: ${searchUrl}`);
    
    const response = await fetch(searchUrl);
    logDebug(`搜索响应状态: ${response.status}`);
    
    if (!response.ok) {
        throw new Error(`搜索失败: ${response.status}`);
    }
    
    const data = await response.json();
    return data.songs || [];
}
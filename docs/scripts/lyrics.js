// 歌词处理

import { handleFailedMedia } from './api.js';
import { lyrics, currentLyricIndex, updateLyrics, updateCurrentLyricIndex } from './state.js';

// 加载歌词
export async function loadLyrics(lrcUrl) {
    const container = document.getElementById('lyrics-container');
    
    if (!lrcUrl) {
        container.innerHTML = '<div class="lyrics-placeholder">暂无歌词</div>';
        return;
    }
    
    container.innerHTML = '<div class="lyrics-placeholder">歌词加载中...</div>';
    
    try {
        const response = await fetch(lrcUrl);
        if (!response.ok) {
            throw new Error(`获取歌词失败: ${response.status}`);
        }
        
        const lrcText = await response.text();
        const parsedLyrics = parseLrc(lrcText);
        
        // 更新状态
        updateLyrics(parsedLyrics);
        
        if (parsedLyrics.length > 0) {
            renderLyrics();
        } else {
            container.innerHTML = '<div class="lyrics-placeholder">歌词解析失败</div>';
        }
    } catch (error) {
        console.error("加载歌词出错:", error);
        container.innerHTML = '<div class="lyrics-placeholder">歌词加载失败</div>';
        
        // 尝试更新失效的歌词链接
        if (window.playlist && window.currentIndex >= 0) {
            const song = window.playlist[window.currentIndex];
            if (song) {
                const newLrcUrl = await handleFailedMedia(song, 'lrc');
                if (newLrcUrl) {
                    // 重试加载歌词
                    loadLyrics(newLrcUrl);
                }
            }
        }
    }
}

// 解析LRC文件
export function parseLrc(lrcText) {
    const lines = lrcText.split('\n');
    const result = [];
    
    // LRC格式: [mm:ss.xx]歌词内容
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;
    
    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('[ti:') || line.startsWith('[ar:') || 
            line.startsWith('[al:') || line.startsWith('[by:')) {
            continue; // 跳过空行和元数据行
        }
        
        let match;
        let times = [];
        const regex = new RegExp(timeRegex);
        
        // 提取时间戳
        while ((match = regex.exec(line)) !== null) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const milliseconds = parseInt(match[3], 10) * (match[3].length === 2 ? 10 : 1);
            
            const time = minutes * 60 + seconds + milliseconds / 1000;
            times.push(time);
        }
        
        // 提取歌词文本
        const text = line.replace(timeRegex, '').trim();
        if (text && times.length > 0) {
            for (const time of times) {
                result.push({ time, text });
            }
        }
    }
    
    // 按时间排序
    return result.sort((a, b) => a.time - b.time);
}

// 渲染歌词
export function renderLyrics() {
    const container = document.getElementById('lyrics-container');
    container.innerHTML = '';
    
    lyrics.forEach((lyric, index) => {
        const line = document.createElement('div');
        line.className = 'lyrics-line';
        line.id = `lyric-${index}`;
        line.textContent = lyric.text;
        container.appendChild(line);
    });
}

// 更新当前歌词
export function updateCurrentLyrics(currentTime) {
    if (lyrics.length === 0) return;
    
    // 找到当前应该显示的歌词
    let index = lyrics.findIndex(lyric => lyric.time > currentTime);
    if (index === -1) {
        index = lyrics.length;
    }
    index = Math.max(0, index - 1);
    
    // 如果歌词索引已经更新，则更新高亮
    if (index !== currentLyricIndex) {
        const container = document.getElementById('lyrics-container');
        
        // 移除旧高亮
        if (currentLyricIndex >= 0) {
            const oldLine = document.getElementById(`lyric-${currentLyricIndex}`);
            if (oldLine) oldLine.className = 'lyrics-line';
        }
        
        // 添加新高亮
        const newLine = document.getElementById(`lyric-${index}`);
        if (newLine) {
            newLine.className = 'lyrics-line active';
            
            // 滚动到可见区域
            newLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // 更新当前歌词索引
        updateCurrentLyricIndex(index);
    }
}
// 歌词处理

import { handleFailedMedia } from './api.js';
import { lyrics, currentLyricIndex, updateLyrics, updateCurrentLyricIndex } from './state.js';

// 追踪用户是否手动滚动
let userScrolled = false;
let scrollTimer = null;
// 添加一个标志来区分自动滚动和用户滚动
let isAutoScrolling = false;

// 加载歌词
export async function loadLyrics(lrcUrl) {
    const container = document.getElementById('lyrics-container');
    
    // 重置滚动状态
    userScrolled = false;

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

    // 初始化歌词容器和定位按钮
    initLyricsContainer();
    
    // 重置滚动状态
    userScrolled = false;
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
            
            // 只有在用户未手动滚动时，才自动滚动到当前歌词
            if (!userScrolled) {
                // 标记即将进行自动滚动
                isAutoScrolling = true;
                
                // 执行滚动
                newLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // 设置定时器在滚动完成后重置标志
                // smooth滚动大约需要300-500ms
                setTimeout(() => {
                    isAutoScrolling = false;
                }, 500);
            } else {
                // 如果用户手动滚动了，显示定位按钮
                const scrollButton = document.getElementById('lyrics-scroll-button');
                if (scrollButton) scrollButton.classList.remove('hidden');
            }
        }
        
        // 更新当前歌词索引
        updateCurrentLyricIndex(index);
    }
}

// 滚动到当前活跃歌词
export function scrollToActiveLyric() {
    const activeLyric = document.getElementById(`lyric-${currentLyricIndex}`);
    if (activeLyric) {
        // 标记为自动滚动
        userScrolled = false;
        isAutoScrolling = true;
        
        // 滚动到当前歌词
        activeLyric.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // 滚动完成后重置标志
        setTimeout(() => {
            isAutoScrolling = false;
        }, 500);
        
        // 隐藏定位按钮
        const scrollButton = document.getElementById('lyrics-scroll-button');
        if (scrollButton) {
            scrollButton.classList.add('hidden');
        }
    }
}



// 处理歌词容器滚动事件
function handleLyricsScroll() {
    // 如果是自动滚动触发的事件，忽略它
    if (isAutoScrolling) return;
    
    const scrollButton = document.getElementById('lyrics-scroll-button');
    const container = document.getElementById('lyrics-container');
    if (!scrollButton || !container) return;
    
    // 标记用户已手动滚动
    userScrolled = true;
    
    // 显示定位按钮
    scrollButton.classList.remove('hidden');
    
    // 清除之前的定时器
    if (scrollTimer) clearTimeout(scrollTimer);
    
    // 设置新的定时器，如果3秒内没有新的滚动事件，认为用户已停止滚动
    scrollTimer = setTimeout(() => {
        scrollToActiveLyric();
    }, 3000);
}

// 内部函数：初始化歌词容器和定位按钮
function initLyricsContainer() {
    // 获取或创建容器包装器
    let wrapper = document.getElementById('lyrics-container-wrapper');
    if (!wrapper) {
        const container = document.getElementById('lyrics-container');
        wrapper = document.createElement('div');
        wrapper.id = 'lyrics-container-wrapper';
        
        // 将原容器包装起来
        container.parentNode.insertBefore(wrapper, container);
        wrapper.appendChild(container);
    }
    
    const container = document.getElementById('lyrics-container');
    
    // 移除旧按钮
    const oldButton = document.getElementById('lyrics-scroll-button');
    if (oldButton) oldButton.remove();
    
    // 创建新按钮
    const scrollButton = document.createElement('button');
    scrollButton.id = 'lyrics-scroll-button';
    scrollButton.className = 'lyrics-scroll-button hidden';
    scrollButton.innerHTML = '📍 当前播放';
    scrollButton.onclick = scrollToActiveLyric;
    
    // 添加按钮到wrapper而不是container
    wrapper.appendChild(scrollButton);
    
    // 添加滚动监听
    container.addEventListener('scroll', handleLyricsScroll);
}
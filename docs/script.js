// 播放器状态
let playlist = [];
let currentIndex = 0;
let isPlaying = false;
let lyrics = [];  // 解析后的歌词数组
let currentLyricIndex = -1;  // 当前显示的歌词索引

// DOM元素
const loadingEl = document.getElementById('loading');
const playerEl = document.getElementById('player');
const playlistNameEl = document.getElementById('playlistName');
const songCountEl = document.getElementById('songCount');
const songTitleEl = document.getElementById('songTitle');
const songIndexEl = document.getElementById('songIndex');
const audioPlayerEl = document.getElementById('audioPlayer');
const prevAudioPlayerEl = document.getElementById('prevAudioPlayer');
const nextAudioPlayerEl = document.getElementById('nextAudioPlayer');
const prevButtonEl = document.getElementById('prevButton');
const nextButtonEl = document.getElementById('nextButton');

// 初始化播放器
async function initPlayer() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // 尝试获取播放列表ID并加载播放列表
    const playlistId = urlParams.get('id');
    if (playlistId) {
        try {
            await loadPlaylistFromJson(playlistId);
            return;
        } catch (error) {
            console.error('加载播放列表失败:', error);
            // 如果播放列表加载失败，尝试单曲模式
        }
    }
    
    // 单曲模式
    const title = urlParams.get('title');
    const artist = urlParams.get('artist');
    const url = urlParams.get('url');
    
    if (title && url) {
        // 单曲模式
        playlist = [{
            title: title,
            artist: artist || '未知歌手',
            url: url
        }];
        
        playlistNameEl.textContent = artist || '单曲播放';
        songCountEl.textContent = '1首歌曲';
        
        // 隐藏导航按钮
        prevButtonEl.style.visibility = 'hidden';
        nextButtonEl.style.visibility = 'hidden';
        
        loadSong(0);
        showPlayer();
    } else {
        showError('未提供有效的歌曲信息');
    }
}

// 从JSON文件加载播放列表
async function loadPlaylistFromJson(playlistId) {
    const response = await fetch(`./playlists/${playlistId}.json`);
    if (!response.ok) {
        throw new Error(`播放列表加载失败: ${response.status}`);
    }
    
    const data = await response.json();
    playlist = data.songs || [];
    
    if (playlist.length === 0) {
        throw new Error('播放列表为空');
    }
    
    playlistNameEl.textContent = data.name || '播放列表';
    songCountEl.textContent = `${playlist.length}首歌曲`;
    
    loadSong(0);
    showPlayer();
}

// 加载指定索引的歌曲
function loadSong(index) {
    if (index < 0 || index >= playlist.length) {
        return false;
    }
    
    const song = playlist[index];
    songTitleEl.textContent = song.title || '未知歌曲';
    songIndexEl.textContent = `${index + 1}/${playlist.length}`;
    
    // 设置当前歌曲
    audioPlayerEl.src = song.url;
    currentIndex = index;
    
    // 预加载前一首歌
    const prevIndex = (index - 1 + playlist.length) % playlist.length;
    if (prevIndex !== index && playlist[prevIndex]) {
        prevAudioPlayerEl.src = playlist[prevIndex].url;
        prevAudioPlayerEl.load(); // 开始加载但不播放
    }
    
    // 预加载后一首歌
    const nextIndex = (index + 1) % playlist.length;
    if (nextIndex !== index && playlist[nextIndex]) {
        nextAudioPlayerEl.src = playlist[nextIndex].url;
        nextAudioPlayerEl.load(); // 开始加载但不播放
    }

    // 加载歌词
    lyrics = [];
    currentLyricIndex = -1;
    loadLyrics(song.lrc);
    
    // 尝试播放
    audioPlayerEl.play().catch(e => console.log('自动播放被浏览器阻止'));
    
    return true;
}

// 加载歌词
async function loadLyrics(lrcUrl) {
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
        lyrics = parseLrc(lrcText);
        
        if (lyrics.length > 0) {
            renderLyrics();
        } else {
            container.innerHTML = '<div class="lyrics-placeholder">歌词解析失败</div>';
        }
    } catch (error) {
        console.error("加载歌词出错:", error);
        container.innerHTML = '<div class="lyrics-placeholder">歌词加载失败</div>';
    }
}

// 解析LRC文件
function parseLrc(lrcText) {
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
function renderLyrics() {
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
function updateLyrics(currentTime) {
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
        
        currentLyricIndex = index;
    }
}

// 播放上一首
function playPrevious() {
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    
    // 如果前一首歌已经预加载
    if (prevAudioPlayerEl.src && prevAudioPlayerEl.readyState >= 2) {
        // 保存当前播放状态
        const wasPlaying = !audioPlayerEl.paused;
        
        // 交换音频元素
        const currentSrc = audioPlayerEl.src;
        audioPlayerEl.src = prevAudioPlayerEl.src;

        // 加载歌词
        lyrics = [];
        currentLyricIndex = -1;
        loadLyrics(playlist[prevIndex].lrc);
        
        // 如果之前是播放状态，继续播放
        if (wasPlaying) {
            audioPlayerEl.play();
        }
        
        // 更新UI
        const song = playlist[prevIndex];
        songTitleEl.textContent = song.title || '未知歌曲';
        songIndexEl.textContent = `${prevIndex + 1}/${playlist.length}`;
        currentIndex = prevIndex;
        
        // 预加载新的"前一首"歌曲
        const newPrevIndex = (prevIndex - 1 + playlist.length) % playlist.length;
        prevAudioPlayerEl.src = playlist[newPrevIndex].url;
        prevAudioPlayerEl.load();
        
        // 更新"后一首"为原来的当前歌曲
        nextAudioPlayerEl.src = currentSrc;
    } else {
        // 如果预加载不可用，使用常规方法
        loadSong(prevIndex);
    }
}

// 播放下一首
function playNext() {
    const nextIndex = (currentIndex + 1) % playlist.length;
    
    // 如果下一首歌已经预加载
    if (nextAudioPlayerEl.src && nextAudioPlayerEl.readyState >= 2) {
        // 保存当前播放状态
        const wasPlaying = !audioPlayerEl.paused;
        
        // 交换音频元素
        const currentSrc = audioPlayerEl.src;
        audioPlayerEl.src = nextAudioPlayerEl.src;

        // 加载歌词
        lyrics = [];
        currentLyricIndex = -1;
        loadLyrics(playlist[nextIndex].lrc);
        
        // 如果之前是播放状态，继续播放
        if (wasPlaying) {
            audioPlayerEl.play();
        }
        
        // 更新UI
        const song = playlist[nextIndex];
        songTitleEl.textContent = song.title || '未知歌曲';
        songIndexEl.textContent = `${nextIndex + 1}/${playlist.length}`;
        currentIndex = nextIndex;
        
        // 预加载新的"下一首"歌曲
        const newNextIndex = (nextIndex + 1) % playlist.length;
        nextAudioPlayerEl.src = playlist[newNextIndex].url;
        nextAudioPlayerEl.load();
        
        // 更新"前一首"为原来的当前歌曲
        prevAudioPlayerEl.src = currentSrc;
    } else {
        // 如果预加载不可用，使用常规方法
        loadSong(nextIndex);
    }
}

// 添加时间更新监听器以更新歌词
audioPlayerEl.addEventListener('timeupdate', () => {
    updateLyrics(audioPlayerEl.currentTime);
});

// 显示播放器
function showPlayer() {
    loadingEl.style.display = 'none';
    playerEl.style.display = 'block';
}

// 显示错误
function showError(message) {
    loadingEl.textContent = message;
    loadingEl.classList.add('error');
}

// 事件监听
prevButtonEl.addEventListener('click', playPrevious);
nextButtonEl.addEventListener('click', playNext);
audioPlayerEl.addEventListener('ended', playNext);

// 初始化
window.addEventListener('load', initPlayer);

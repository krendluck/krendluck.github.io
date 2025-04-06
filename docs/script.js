// 播放器状态
let playlist = [];
let currentIndex = 0;
let isPlaying = false;
let lyrics = [];  // 解析后的歌词数组
let currentLyricIndex = -1;  // 当前显示的歌词索引
let isShuffleMode = false;           // 随机播放模式状态
let shuffledPlaylist = [];           // 随机排序后的播放列表
let playbackHistory = [];            // 播放历史记录（用于随机模式下的"上一首"）
let currentShuffleIndex = 0;         // 随机播放模式下的当前索引

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
const shuffleButtonEl = document.getElementById('shuffleButton');

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

// 添加切换随机播放模式的函数
function toggleShuffle() {
    isShuffleMode = !isShuffleMode;
    
    if (isShuffleMode) {
        // 激活随机播放
        shuffleButtonEl.classList.add('active');
        logDebug('随机播放模式已开启');
        
        // 创建随机播放列表
        shuffledPlaylist = createShuffledPlaylist();
        
        // 找到当前歌曲在随机列表中的位置
        currentShuffleIndex = shuffledPlaylist.indexOf(currentIndex);
        if (currentShuffleIndex === -1) {
            currentShuffleIndex = 0;
            logDebug('当前歌曲在随机列表中位置异常，已重置为0');
        }
        
        // 重置播放历史
        playbackHistory = [currentIndex];
    } else {
        // 取消随机播放
        shuffleButtonEl.classList.remove('active');
        logDebug('随机播放模式已关闭');
    }
    
    // 更新预加载
    preloadAdjacentSongs(currentIndex);

    savePlayerState();
    
    // 添加更明显的状态指示
    const modeText = isShuffleMode ? '随机模式' : '顺序模式';
    console.log(`播放模式切换为: ${modeText}`);
}

// 创建随机排序的播放列表
function createShuffledPlaylist() {
    // 创建包含所有索引的数组
    const indices = Array.from({ length: playlist.length }, (_, i) => i);
    
    // 排除当前播放的歌曲
    const currentSong = indices.splice(currentIndex, 1)[0];
    
    // Fisher-Yates 洗牌算法
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    // 将当前歌曲放在第一位
    indices.unshift(currentSong);
    
    return indices;
}

// 预加载相邻歌曲
function preloadAdjacentSongs(index) {
    let prevIndex, nextIndex;
    
    if (isShuffleMode) {
        // 在随机模式下获取前后歌曲
        prevIndex = playbackHistory.length > 1 ? playbackHistory[playbackHistory.length - 2] : index;
        
        const nextShuffleIndex = (currentShuffleIndex + 1) % shuffledPlaylist.length;
        nextIndex = shuffledPlaylist[nextShuffleIndex];
    } else {
        // 常规模式
        prevIndex = (index - 1 + playlist.length) % playlist.length;
        nextIndex = (index + 1) % playlist.length;
    }
    
    // 预加载前一首歌
    if (prevIndex !== index && playlist[prevIndex]) {
        prevAudioPlayerEl.src = playlist[prevIndex].url;
        prevAudioPlayerEl.load();
    }
    
    // 预加载后一首歌
    if (nextIndex !== index && playlist[nextIndex]) {
        nextAudioPlayerEl.src = playlist[nextIndex].url;
        nextAudioPlayerEl.load();
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
    
    // 更新随机播放相关状态
    if (isShuffleMode) {
        currentShuffleIndex = shuffledPlaylist.indexOf(index);
        if (currentShuffleIndex === -1) {
            // 如果当前歌曲不在随机列表中
            shuffledPlaylist = createShuffledPlaylist();
            currentShuffleIndex = 0;
        }
        
        // 更新历史记录
        playbackHistory.push(index);
        if (playbackHistory.length > 10) {
            playbackHistory.shift();
        }
    }
    
    // 预加载相邻歌曲
    preloadAdjacentSongs(index);
    
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
    let prevIndex;
    
    if (isShuffleMode && playbackHistory.length > 1) {
        // 随机模式下使用历史记录
        playbackHistory.pop(); // 移除当前歌曲
        prevIndex = playbackHistory[playbackHistory.length - 1]; // 获取上一首
        
        // 更新随机索引
        currentShuffleIndex = shuffledPlaylist.indexOf(prevIndex);
    } else {
        // 常规模式或无历史记录时
        prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    }
    
    // 如果前一首歌已预加载
    if (prevAudioPlayerEl.src && prevAudioPlayerEl.readyState >= 2) {
        // 保存当前播放状态
        const wasPlaying = !audioPlayerEl.paused;
        
        // 交换音频元素
        const currentSrc = audioPlayerEl.src;
        audioPlayerEl.src = prevAudioPlayerEl.src;
        
        // 更新UI
        songTitleEl.textContent = playlist[prevIndex].title || "未知歌曲";
        songIndexEl.textContent = `${prevIndex + 1}/${playlist.length}`;
        currentIndex = prevIndex;
        
        // 加载歌词
        lyrics = [];
        currentLyricIndex = -1;
        loadLyrics(playlist[prevIndex].lrc);
        
        // 如果之前是播放状态，继续播放
        if (wasPlaying) {
            audioPlayerEl.play();
        }
        
        // 更新预加载
        preloadAdjacentSongs(prevIndex);
    } else {
        // 常规加载
        loadSong(prevIndex);
    }
}

// 播放下一首
function playNext() {
    let nextIndex;
    
    if (isShuffleMode) {
        // 随机模式下的下一首
        currentShuffleIndex = (currentShuffleIndex + 1) % shuffledPlaylist.length;
        nextIndex = shuffledPlaylist[currentShuffleIndex];
        
        // 记录播放历史
        playbackHistory.push(nextIndex);
        
        // 历史记录限制在10首内
        if (playbackHistory.length > 10) {
            playbackHistory.shift();
        }
    } else {
        // 常规模式下的下一首
        nextIndex = (currentIndex + 1) % playlist.length;
    }
    
    // 如果下一首歌已预加载
    if (nextAudioPlayerEl.src && nextAudioPlayerEl.readyState >= 2) {
        // 保存当前播放状态
        const wasPlaying = !audioPlayerEl.paused;
        
        // 交换音频元素
        const currentSrc = audioPlayerEl.src;
        audioPlayerEl.src = nextAudioPlayerEl.src;
        
        // 更新UI
        songTitleEl.textContent = playlist[nextIndex].title || "未知歌曲";
        songIndexEl.textContent = `${nextIndex + 1}/${playlist.length}`;
        currentIndex = nextIndex;
        
        // 加载歌词
        lyrics = [];
        currentLyricIndex = -1;
        loadLyrics(playlist[nextIndex].lrc);
        
        // 如果之前是播放状态，继续播放
        if (wasPlaying) {
            audioPlayerEl.play();
        }
        
        // 更新预加载
        preloadAdjacentSongs(nextIndex);
    } else {
        // 常规加载
        loadSong(nextIndex);
    }
}

// 保存播放器状态
function savePlayerState() {
    try {
        localStorage.setItem('musicPlayer_shuffleMode', isShuffleMode.toString()); // 修改为明确的字符串
    } catch (e) {
        console.log('无法保存播放器状态');
    }
}

// 加载播放器状态
function loadPlayerState() {
    try {
        const savedShuffleMode = localStorage.getItem('musicPlayer_shuffleMode');
        if (savedShuffleMode === 'true') {
            isShuffleMode = true;
            shuffleButtonEl.classList.add('active');
            
            // 创建随机播放列表
            shuffledPlaylist = createShuffledPlaylist();
            currentShuffleIndex = 0;
            playbackHistory = [currentIndex];
        }
    } catch (e) {
        console.log('无法加载播放器状态');
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

    // 加载保存的播放器状态
    loadPlayerState();
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
shuffleButtonEl.addEventListener('click', toggleShuffle);
// 初始化
window.addEventListener('load', initPlayer);

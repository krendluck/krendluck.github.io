// 播放器状态
let playlist = [];
let currentIndex = 0;
let isPlaying = false;

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
    
    // 尝试播放
    audioPlayerEl.play().catch(e => console.log('自动播放被浏览器阻止'));
    
    return true;
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

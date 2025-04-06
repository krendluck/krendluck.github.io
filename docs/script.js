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
    audioPlayerEl.src = song.url;
    currentIndex = index;
    
    // 尝试播放
    audioPlayerEl.play().catch(e => console.log('自动播放被浏览器阻止'));
    
    return true;
}

// 播放上一首
function playPrevious() {
    const newIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    loadSong(newIndex);
}

// 播放下一首
function playNext() {
    const newIndex = (currentIndex + 1) % playlist.length;
    loadSong(newIndex);
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
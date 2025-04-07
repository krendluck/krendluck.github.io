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
const volumeButtonEl = document.getElementById('volumeButton');
const volumeSliderEl = document.getElementById('volumeSlider');
const searchResultsEl = document.getElementById('search-results');
const searchTitleEl = document.getElementById('search-title');
const searchCountEl = document.getElementById('search-count');
const searchListEl = document.getElementById('search-list');
const backToSearchButtonEl = document.getElementById('backToSearchButton');
const searchInputEl = document.getElementById('search-input');
const searchButtonEl = document.getElementById('search-button');

const apiUrl = 'https://notion-music-api.vercel.app/api/music';
const updateApiUrl = 'https://notion-music-api.vercel.app/api/update'; // 用于更新链接的API端点

// 添加调试日志函数
function logDebug(message) {
    console.log(`[DEBUG] ${message}`);
}


// 初始化播放器
async function initPlayer() {
    const urlParams = new URLSearchParams(window.location.search);

    searchResultsEl.style.display = 'none';
    playerEl.style.display = 'none';
    loadingEl.style.display = 'block';

    console.log('页面初始化, URL参数:', Object.fromEntries(urlParams));
    
    // 添加 Notion 支持
    const notionTag = urlParams.get('tag');
    const notionSearch = urlParams.get('search');
    
    console.log(`Notion标签: ${notionTag || '无'}, 搜索关键词: ${notionSearch || '无'}`);

    // 处理搜索请求
    if (notionSearch) {
        console.log(`检测到搜索参数: "${notionSearch}", 开始搜索...`);
        try {
            await searchSongs(notionSearch);
            return;
        } catch (error) {
            console.error('搜索失败:', error);
            // 失败后尝试加载全部歌曲
            try {
                await loadPlaylistFromNotion();
                return;
            } catch (e) {
                console.error('默认加载失败:', e);
            }
        }
    }

    // 处理标签过滤请求
    if (notionTag !== null || urlParams.has('notion')) {
        console.log(`加载标签: ${notionTag || '全部'}`);
        try {
            await loadPlaylistFromNotion(notionTag);
            return;
        } catch (error) {
            console.error('按标签加载失败:', error);
            showError(`无法加载标签: ${notionTag}`);
            return;
        }
    }

    // 单曲模式
    const title = urlParams.get('title');
    const artist = urlParams.get('artist');
    const url = urlParams.get('url');
    
    if (title && url) {
        console.log(`加载单曲: ${title} - ${artist || '未知歌手'}`);
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
        return;
    }
    
    // 默认情况：加载所有歌曲
    console.log('无特定参数，加载全部歌曲');
    try {
        await loadPlaylistFromNotion();
    } catch (error) {
        console.error('加载所有歌曲失败:', error);
        showError('无法加载音乐库，请稍后再试');
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


// 加载指定索引的歌曲
function loadSong(index) {
    if (index < 0 || index >= playlist.length) {
        console.error(`无效索引: ${index}, 播放列表长度: ${playlist.length}`);
        return false;
    }
    
    const song = playlist[index];
    console.log(`加载歌曲: ${song.title}, 索引: ${index}`);
    console.log(`歌曲URL: ${song.url || '无URL'}`);
    console.log(`歌词URL: ${song.lrc || '无歌词'}`);
    
    if (!song.url) {
        console.error(`歌曲 ${song.title} 无URL，尝试下一首`);
        playNext();
        return false;
    }
    
    songTitleEl.textContent = song.title || '未知歌曲';
    songIndexEl.textContent = `${index + 1}/${playlist.length}`;
    
    // 设置当前歌曲
    audioPlayerEl.src = song.url;
    currentIndex = index;
    
    // 添加错误处理
    audioPlayerEl.onerror = async function(e) {
        console.error(`音频加载错误:`, e);
        console.error(`错误代码: ${audioPlayerEl.error ? audioPlayerEl.error.code : '未知'}`);
        console.error(`错误信息: ${audioPlayerEl.error ? audioPlayerEl.error.message : '未知'}`);
        
        const newUrl = await handleFailedMedia(song, 'audio');
        if (newUrl) {
            console.log(`获取到新URL: ${newUrl}, 尝试重新加载`);
            audioPlayerEl.src = newUrl;
            audioPlayerEl.play().catch(e => console.log('播放失败:', e));
        } else {
            console.error(`歌曲 ${song.title} 无法播放，尝试下一首`);
            playNext();
        }
    };

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
    updateBackButton();

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
        
        // 尝试更新失效的歌词链接
        if (playlist[currentIndex]) {
            const newLrcUrl = await handleFailedMedia(playlist[currentIndex], 'lrc');
            if (newLrcUrl) {
                // 重试加载歌词
                loadLyrics(newLrcUrl);
            }
        }
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


// 添加音量控制函数
function setVolume(value) {
    // 设置三个音频元素的音量
    audioPlayerEl.volume = value;
    prevAudioPlayerEl.volume = value;
    nextAudioPlayerEl.volume = value;
    
    // 更新音量按钮图标
    updateVolumeIcon(value);
}

function updateVolumeIcon(volume) {
    if (volume === 0) {
        volumeButtonEl.textContent = '🔇';
    } else if (volume < 0.5) {
        volumeButtonEl.textContent = '🔉';
    } else {
        volumeButtonEl.textContent = '🔊';
    }
}

// 静音/取消静音功能
let lastVolume = 1; // 储存静音前的音量

function toggleMute() {
    if (audioPlayerEl.volume > 0) {
        lastVolume = audioPlayerEl.volume;
        setVolume(0);
        volumeSliderEl.value = 0;
    } else {
        setVolume(lastVolume);
        volumeSliderEl.value = lastVolume;
    }
    savePlayerState();
}

// 修改保存状态函数，添加音量设置
function savePlayerState() {
    try {
        localStorage.setItem('musicPlayer_shuffleMode', isShuffleMode.toString());
        localStorage.setItem('musicPlayer_volume', audioPlayerEl.volume.toString());
    } catch (e) {
        console.log('无法保存播放器状态');
    }
}

// 修改加载状态函数，添加音量设置恢复
function loadPlayerState() {
    try {
        // 加载随机播放状态
        const savedShuffleMode = localStorage.getItem('musicPlayer_shuffleMode');
        if (savedShuffleMode === 'true') {
            isShuffleMode = true;
            shuffleButtonEl.classList.add('active');
            
            // 创建随机播放列表
            shuffledPlaylist = createShuffledPlaylist();
            currentShuffleIndex = 0;
            playbackHistory = [currentIndex];
        }
        
        // 加载音量设置
        const savedVolume = localStorage.getItem('musicPlayer_volume');
        if (savedVolume !== null) {
            const volume = parseFloat(savedVolume);
            setVolume(volume);
            volumeSliderEl.value = volume;
        }
    } catch (e) {
        console.log('无法加载播放器状态');
    }
}

// 检查和处理链接失效
// 检查和处理链接失效
async function handleFailedMedia(song, errorType = 'audio') {
    console.log(`${errorType}链接失效: ${song.title}`);
    console.log(`失效链接: ${errorType === 'audio' ? song.url : song.lrc}`);
    
    if (!song.id) {
        console.error('无法更新链接: 缺少歌曲ID');
        return null;
    }
    
    try {
        // 通知服务器链接失效
        console.log(`发送更新请求到: ${updateApiUrl}`);
        console.log(`请求参数:`, {
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
        
        console.log(`更新响应状态: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`更新请求失败: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('更新响应数据:', result);
        
        if (result.success && result.updatedUrl) {
            // 更新本地播放列表中的URL
            if (errorType === 'audio') {
                song.url = result.updatedUrl;
                console.log(`已更新歌曲URL: ${song.title} - ${song.url}`);
                return song.url;
            } else if (errorType === 'lrc') {
                song.lrc = result.updatedUrl;
                console.log(`已更新歌词URL: ${song.title} - ${song.lrc}`);
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

// 添加从 Notion 加载播放列表的函数
async function loadPlaylistFromNotion(tag = '') {
    try {
      const params = new URLSearchParams();
      if (tag) params.append('tag', tag);
      
      const url = `${apiUrl}${params.toString() ? '?' + params.toString() : ''}`;
      
      // 显示加载状态
      loadingEl.textContent = '正在从 Notion 加载音乐库...';
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }
      
      const data = await response.json();
      playlist = data.songs || [];
      
      if (playlist.length === 0) {
        throw new Error('播放列表为空');
      }
      
      // 更新 UI
      playlistNameEl.textContent = tag ? `分类: ${tag}` : 'Notion 音乐库';
      songCountEl.textContent = `${playlist.length}首歌曲`;
      
      // 加载第一首歌
      loadSong(0);
      showPlayer();
      
      // 如果开启了随机播放模式，需要创建随机列表
      if (isShuffleMode) {
        shuffledPlaylist = createShuffledPlaylist();
        currentShuffleIndex = 0;
      }
      
      console.log(`已从 Notion 加载 ${playlist.length} 首歌曲`);
    } catch (error) {
      console.error('从 Notion 加载音乐失败:', error);
      showError('无法从 Notion 加载音乐库');
    }
  }
  
  // 搜索功能
  async function searchSongs(query) {
    if (!query || query.trim() === '') return;
    
    try {
        console.log(`开始搜索: "${query}"`);
        loadingEl.textContent = '正在搜索...';
        playerEl.style.display = 'none';
        searchResultsEl.style.display = 'none';
        loadingEl.style.display = 'block';
        
        const searchUrl = `${apiUrl}?search=${encodeURIComponent(query)}`;
        console.log(`发送请求: ${searchUrl}`);
        
        const response = await fetch(searchUrl);
        console.log(`搜索响应状态: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`搜索失败: ${response.status}`);
        }
        
        const data = await response.json();
        const songs = data.songs || [];
        console.log(`搜索结果: 找到 ${songs.length} 首歌曲`);
        
        if (songs.length === 0) {
            showError(`未找到与 "${query}" 相关的歌曲`);
            return;
        }
        
        // 存储搜索结果
        playlist = songs;
        
        // 输出歌曲详情日志
        playlist.forEach((song, index) => {
            console.log(`歌曲 ${index+1}: ${song.title}, URL: ${song.url ? '有效' : '无效'}, 歌词: ${song.lrc ? '有效' : '无效'}`);
        });
        
        // 更新搜索结果UI
        searchTitleEl.textContent = `搜索: ${query}`;
        searchCountEl.textContent = `找到 ${songs.length} 首歌曲`;
        
        // 渲染搜索结果列表
        renderSearchResults(songs);
        
        // 显示搜索结果区域
        loadingEl.style.display = 'none';
        searchResultsEl.style.display = 'block';

        // 清空搜索框，方便下次搜索
        if (searchInputEl) {
            searchInputEl.value = '';
        }
        
        // 添加历史记录
        addSearchHistory(query);
    } catch (error) {
        console.error('搜索出错:', error);
        showError('搜索失败，请稍后再试');
        throw error;
    }
}

// 搜索历史记录功能
function addSearchHistory(query) {
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

function renderSearchResults(songs) {
    // 清空列表
    searchListEl.innerHTML = '';
    
    // 添加返回按钮
    const header = document.createElement('div');
    header.className = 'search-header';
    
    const backButton = document.createElement('button');
    backButton.className = 'back-button';
    backButton.textContent = '返回播放器';
    backButton.addEventListener('click', () => {
        searchResultsEl.style.display = 'none';
        playerEl.style.display = 'block';
    });
    
    header.appendChild(backButton);
    searchListEl.appendChild(header);
    
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
        
        searchListEl.appendChild(item);
    });
}

// 从搜索结果中播放选定的歌曲
function playSongFromSearchResults(index) {
    // 处理高亮显示
    const items = searchListEl.querySelectorAll('.song-item');
    items.forEach(item => item.classList.remove('active'));
    items[index].classList.add('active');
    
    // 播放选定歌曲
    loadSong(index);
    
    // 显示播放器
    searchResultsEl.style.display = 'none';
    playerEl.style.display = 'block';
    
    // 更新播放器界面信息
    playlistNameEl.textContent = searchTitleEl.textContent;
    songCountEl.textContent = searchCountEl.textContent;
}

// 添加时间更新监听器以更新歌词
audioPlayerEl.addEventListener('timeupdate', () => {
    updateLyrics(audioPlayerEl.currentTime);
});

// 显示播放器
function showPlayer() {
    loadingEl.style.display = 'none';
    searchResultsEl.style.display = 'none';
    playerEl.style.display = 'block';

    // 加载保存的播放器状态
    loadPlayerState();
}

// 添加返回搜索结果的事件处理
backToSearchButtonEl.addEventListener('click', () => {
    playerEl.style.display = 'none';
    searchResultsEl.style.display = 'block';
    
    // 高亮显示当前播放的歌曲
    const items = searchListEl.querySelectorAll('.song-item');
    items.forEach(item => item.classList.remove('active'));
    
    const currentItem = searchListEl.querySelector(`[data-index="${currentIndex}"]`);
    if (currentItem) {
        currentItem.classList.add('active');
        currentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});

// 根据情况显示或隐藏返回按钮
function updateBackButton() {
    // 仅当是搜索结果时显示返回按钮
    if (playlistNameEl.textContent.startsWith('搜索:')) {
        backToSearchButtonEl.style.display = 'inline-block';
    } else {
        backToSearchButtonEl.style.display = 'none';
    }
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
volumeSliderEl.addEventListener('input', function() {
    const volume = parseFloat(this.value);
    setVolume(volume);
    savePlayerState(); // 保存设置
});
volumeButtonEl.addEventListener('click', toggleMute);

// 添加搜索按钮事件监听
searchButtonEl.addEventListener('click', () => {
    const query = searchInputEl.value.trim();
    if (query) {
        searchSongs(query);
    }
});

// 添加搜索框回车键事件监听
searchInputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const query = searchInputEl.value.trim();
        if (query) {
            searchSongs(query);
        }
    }
});

backToSearchButtonEl.addEventListener('click', () => {
    playerEl.style.display = 'none';
    searchResultsEl.style.display = 'block';
    
    // 高亮显示当前播放的歌曲
    const items = searchListEl.querySelectorAll('.song-item');
    items.forEach(item => item.classList.remove('active'));
    
    const currentItem = searchListEl.querySelector(`[data-index="${currentIndex}"]`);
    if (currentItem) {
        currentItem.classList.add('active');
        // 平滑滚动到当前项
        currentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});



// 初始化
window.addEventListener('load', initPlayer);

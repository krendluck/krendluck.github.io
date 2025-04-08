// 播放器状态管理

// 导出状态变量
export let playlist = [];
export let currentIndex = 0;
export let isPlaying = false;
export let lyrics = [];
export let currentLyricIndex = -1;

// 随机播放相关状态
export let isShuffleMode = false;
export let shuffledPlaylist = [];
export let playbackHistory = [];
export let currentShuffleIndex = 0;

// 用于在模块间共享状态更新的函数
export function updatePlaylist(newPlaylist) {
    playlist = newPlaylist;
}

export function updateCurrentIndex(index) {
    currentIndex = index;
}

export function updatePlayingStatus(status) {
    isPlaying = status;
}

export function updateShuffleMode(mode) {
    isShuffleMode = mode;
}

export function updateShuffledPlaylist(newList) {
    shuffledPlaylist = newList;
}

export function updatePlaybackHistory(history) {
    playbackHistory = history;
}

export function updateCurrentShuffleIndex(index) {
    currentShuffleIndex = index;
}

export function updateLyrics(newLyrics) {
    lyrics = newLyrics;
}

export function updateCurrentLyricIndex(index) {
    currentLyricIndex = index;
}
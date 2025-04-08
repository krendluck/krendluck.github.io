/**
 * DOM 元素引用模块
 * 
 * 本模块集中管理所有音乐播放器应用中使用的DOM元素引用，
 * 方便其他模块直接导入使用，避免重复的DOM查询操作
 */

// 播放器界面元素
export const loadingEl = document.getElementById('loading');               // 加载状态显示区域
export const playerEl = document.getElementById('player');                 // 播放器主容器

// 播放列表信息元素
export const playlistNameEl = document.getElementById('playlistName');     // 显示当前播放列表名称
export const songCountEl = document.getElementById('songCount');           // 显示播放列表中的歌曲总数

// 当前歌曲信息元素
export const songTitleEl = document.getElementById('songTitle');           // 显示当前播放歌曲的标题
export const songIndexEl = document.getElementById('songIndex');           // 显示当前歌曲在播放列表中的位置(如 "1/10")

// 音频播放器元素
export const audioPlayerEl = document.getElementById('audioPlayer');       // 主音频播放器
export const prevAudioPlayerEl = document.getElementById('prevAudioPlayer'); // 用于预加载上一首歌曲的隐藏音频元素
export const nextAudioPlayerEl = document.getElementById('nextAudioPlayer'); // 用于预加载下一首歌曲的隐藏音频元素

// 播放控制按钮
export const prevButtonEl = document.getElementById('prevButton');         // 上一首歌曲按钮
export const nextButtonEl = document.getElementById('nextButton');         // 下一首歌曲按钮
export const shuffleButtonEl = document.getElementById('shuffleButton');   // 随机播放模式切换按钮

// 音量控制元素
export const volumeButtonEl = document.getElementById('volumeButton');     // 音量/静音切换按钮
export const volumeSliderEl = document.getElementById('volumeSlider');     // 音量调节滑动条

// 搜索相关元素
export const searchResultsEl = document.getElementById('search-results');  // 搜索结果容器
export const searchTitleEl = document.getElementById('search-title');      // 显示搜索关键词的标题
export const searchCountEl = document.getElementById('search-count');      // 显示搜索结果数量
export const searchListEl = document.getElementById('search-list');        // 搜索结果列表容器
export const backToSearchButtonEl = document.getElementById('backToSearchButton'); // 从播放器返回搜索结果的按钮
export const searchInputEl = document.getElementById('search-input');      // 搜索输入框
export const searchButtonEl = document.getElementById('search-button');    // 搜索提交按钮
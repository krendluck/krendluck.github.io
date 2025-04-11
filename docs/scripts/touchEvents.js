/**
 * 管理音乐播放器的触摸手势事件
 * 提供移动设备上的滑动切换歌曲及其他触摸交互功能
 */

// 滑动阈值（像素）
const SWIPE_THRESHOLD = 80;
// 滑动时间阈值（毫秒）
const SWIPE_TIME_THRESHOLD = 300;

// 触摸状态记录
let touchState = {
    startX: 0,
    startY: 0,
    startTime: 0,
    touchTarget: null
};

/**
 * 初始化触摸事件监听
 * @param {Object} player - 播放器控制对象
 */
export function initTouchEvents(player) {
    console.log('初始化移动设备触摸事件...');
    
    // 获取播放器容器元素
    const playerContainer = document.getElementById('player');
    const browseView = document.getElementById('browse-view');
    
    // 确保播放器元素存在
    if (playerContainer) {
        // 添加触摸开始事件
        playerContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
        
        // 添加触摸结束事件
        playerContainer.addEventListener('touchend', (e) => handleTouchEnd(e, player), { passive: true });
        
        // 添加触摸取消事件
        playerContainer.addEventListener('touchcancel', resetTouchState, { passive: true });
        
        // 防止在滑动时页面滚动
        playerContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    } else {
        console.warn('未找到播放器元素，无法初始化触摸事件');
    }
    
    // 为歌词容器添加特殊触摸处理
    setupLyricsContainerTouch();
    
    // 优化音频控件的触摸体验
    optimizeAudioControlsForTouch();
    
    // 优化按钮触摸反馈
    enhanceButtonTouchFeedback();
    
    // 添加对移动设备的方向变化监听
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // 初始设置
    setupInitialMobileView();
}

/**
 * 处理触摸开始事件
 * @param {TouchEvent} e - 触摸事件对象
 */
function handleTouchStart(e) {
    // 记录开始触摸的坐标和时间
    const touch = e.touches[0];
    touchState.startX = touch.clientX;
    touchState.startY = touch.clientY;
    touchState.startTime = Date.now();
    touchState.touchTarget = e.target;
}

/**
 * 处理触摸移动事件
 * @param {TouchEvent} e - 触摸事件对象
 */
function handleTouchMove(e) {
    // 检查是否在歌词容器或音频控件上滑动，这些应该允许默认滚动行为
    if (isScrollableTarget(touchState.touchTarget)) {
        return;
    }
    
    // 计算水平与垂直移动距离
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchState.startX);
    const deltaY = Math.abs(touch.clientY - touchState.startY);
    
    // 如果水平移动明显大于垂直移动，阻止页面滚动
    if (deltaX > deltaY && deltaX > 10) {
        e.preventDefault();
    }
}

/**
 * 处理触摸结束事件
 * @param {TouchEvent} e - 触摸事件对象
 * @param {Object} player - 播放器控制对象
 */
function handleTouchEnd(e, player) {
    // 忽略在特定元素上的滑动手势
    if (shouldIgnoreSwipe(touchState.touchTarget)) {
        resetTouchState();
        return;
    }
    
    // 获取结束触摸的坐标和时间
    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const deltaX = endX - touchState.startX;
    const deltaTime = Date.now() - touchState.startTime;
    
    // 判断是否满足滑动条件（距离和时间阈值）
    if (Math.abs(deltaX) > SWIPE_THRESHOLD && deltaTime < SWIPE_TIME_THRESHOLD) {
        // 向左滑动：下一首
        if (deltaX < 0) {
            console.log('检测到向左滑动手势，播放下一首');
            player.next();
        } 
        // 向右滑动：上一首
        else {
            console.log('检测到向右滑动手势，播放上一首');
            player.previous();
        }
        
        // 添加视觉反馈
        addSwipeFeedback(deltaX < 0 ? 'left' : 'right');
    }
    
    // 重置触摸状态
    resetTouchState();
}

/**
 * 重置触摸状态
 */
function resetTouchState() {
    touchState = {
        startX: 0,
        startY: 0,
        startTime: 0,
        touchTarget: null
    };
}

/**
 * 判断目标元素是否应该允许滚动
 * @param {HTMLElement} target - 触摸的目标元素
 * @returns {boolean} - 是否允许滚动
 */
function isScrollableTarget(target) {
    if (!target) return false;
    
    // 检查元素或其父元素是否是可滚动元素
    const scrollableElements = ['#lyrics-container', '#search-list', '#browse-list', 'audio'];
    
    for (const selector of scrollableElements) {
        if (target.closest(selector)) {
            return true;
        }
    }
    
    return false;
}

/**
 * 判断是否应该忽略在特定元素上的滑动手势
 * @param {HTMLElement} target - 触摸的目标元素
 * @returns {boolean} - 是否应忽略滑动
 */
function shouldIgnoreSwipe(target) {
    if (!target) return false;
    
    // 这些元素上的滑动应该被忽略
    const ignoreElements = [
        'button', '.button', '#volumeSlider', 'audio', 'select', 
        'input', '.song-item', '#search-list', '#browse-list'
    ];
    
    for (const selector of ignoreElements) {
        if (target.matches(selector) || target.closest(selector)) {
            return true;
        }
    }
    
    return false;
}

/**
 * 为滑动添加视觉反馈效果
 * @param {string} direction - 滑动方向 ('left' 或 'right')
 */
function addSwipeFeedback(direction) {
    // 创建临时元素显示滑动反馈
    const feedback = document.createElement('div');
    feedback.className = `swipe-feedback swipe-${direction}`;
    feedback.innerHTML = direction === 'left' ? 
        '<i class="fas fa-arrow-right"></i> 下一首' : 
        '<i class="fas fa-arrow-left"></i> 上一首';
    
    // 添加样式
    Object.assign(feedback.style, {
        position: 'fixed',
        top: '50%',
        left: direction === 'left' ? 'auto' : '10px',
        right: direction === 'left' ? '10px' : 'auto',
        transform: 'translateY(-50%)',
        padding: '10px 15px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        borderRadius: '20px',
        zIndex: '1000',
        opacity: '0',
        transition: 'opacity 0.3s'
    });
    
    // 添加到文档
    document.body.appendChild(feedback);
    
    // 触发过渡动画
    setTimeout(() => {
        feedback.style.opacity = '1';
    }, 10);
    
    // 移除元素
    setTimeout(() => {
        feedback.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(feedback);
        }, 300);
    }, 1000);
}

/**
 * 为歌词容器设置特殊的触摸处理
 */
function setupLyricsContainerTouch() {
    const lyricsContainer = document.getElementById('lyrics-container');
    if (!lyricsContainer) return;
    
    // 添加触摸类以优化滚动行为
    lyricsContainer.classList.add('touch-optimized');
    
    // 监听触摸事件以改善滚动体验
    let startY;
    
    lyricsContainer.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
    }, { passive: true });
    
    lyricsContainer.addEventListener('touchmove', (e) => {
        // 仅在内容可滚动时处理
        if (lyricsContainer.scrollHeight > lyricsContainer.clientHeight) {
            // 计算滚动距离和方向
            const deltaY = startY - e.touches[0].clientY;
            startY = e.touches[0].clientY;
            
            // 手动控制滚动位置，使其更平滑
            lyricsContainer.scrollTop += deltaY;
        }
    }, { passive: true });
}

/**
 * 优化音频控件的触摸体验
 */
function optimizeAudioControlsForTouch() {
    const audioPlayer = document.getElementById('audioPlayer');
    if (!audioPlayer) return;
    
    // 增加音频控件的可触摸区域
    audioPlayer.classList.add('touch-optimized-audio');
    
    // 为移动设备添加特定样式
    if (isMobileDevice()) {
        audioPlayer.classList.add('mobile-audio-player');
    }
}

/**
 * 增强按钮的触摸反馈
 */
function enhanceButtonTouchFeedback() {
    const buttons = document.querySelectorAll('button, .button, .control-button, .nav-button');
    
    buttons.forEach(button => {
        // 在触摸开始时添加活跃状态
        button.addEventListener('touchstart', () => {
            button.classList.add('touch-active');
        }, { passive: true });
        
        // 在触摸结束和取消时移除活跃状态
        ['touchend', 'touchcancel'].forEach(eventType => {
            button.addEventListener(eventType, () => {
                button.classList.remove('touch-active');
            }, { passive: true });
        });
    });
}

/**
 * 处理设备方向变化
 */
function handleOrientationChange() {
    console.log('设备方向已变化，调整UI布局...');
    
    // 获取当前方向
    const isLandscape = window.matchMedia('(orientation: landscape)').matches;
    
    // 根据方向优化布局
    if (isLandscape) {
        document.body.classList.add('landscape');
        document.body.classList.remove('portrait');
    } else {
        document.body.classList.add('portrait');
        document.body.classList.remove('landscape');
    }
    
    // 刷新布局
    setTimeout(() => {
        updateLayoutForCurrentOrientation();
    }, 300);
}

/**
 * 根据当前方向更新布局
 */
function updateLayoutForCurrentOrientation() {
    const isLandscape = window.matchMedia('(orientation: landscape)').matches;
    const lyricsContainer = document.getElementById('lyrics-container');
    
    if (lyricsContainer) {
        // 在横屏模式下减小歌词容器高度以腾出空间
        if (isLandscape) {
            lyricsContainer.style.maxHeight = '60px';
        } else {
            lyricsContainer.style.maxHeight = '100px';
        }
    }
}

/**
 * 初始设置移动视图
 */
function setupInitialMobileView() {
    if (isMobileDevice()) {
        // 添加移动设备类
        document.body.classList.add('mobile-device');
        
        // 根据当前方向设置初始类
        if (window.matchMedia('(orientation: landscape)').matches) {
            document.body.classList.add('landscape');
        } else {
            document.body.classList.add('portrait');
        }
        
        // 应用初始布局优化
        updateLayoutForCurrentOrientation();
    }
}

/**
 * 检测是否为移动设备
 * @returns {boolean} 是否为移动设备
 */
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.matchMedia('(max-width: 768px)').matches;
}

/**
 * 为移动设备添加双击播放/暂停功能
 * @param {Object} player - 播放器控制对象
 */
export function addDoubleTapPlayPause(player) {
    const playerContainer = document.getElementById('player');
    if (!playerContainer || !player) return;
    
    let lastTap = 0;
    const doubleTapDelay = 300; // 双击间隔阈值（毫秒）
    
    playerContainer.addEventListener('touchend', (e) => {
        // 忽略在特定元素上的触摸
        if (e.target.closest('button, .button, audio, #lyrics-container, #volumeSlider')) {
            return;
        }
        
        const currentTime = new Date().getTime();
        const tapInterval = currentTime - lastTap;
        
        if (tapInterval < doubleTapDelay && tapInterval > 0) {
            // 双击检测到，切换播放状态
            console.log('检测到双击手势，切换播放/暂停');
            player.togglePlay();
            e.preventDefault();
        }
        
        lastTap = currentTime;
    }, { passive: false });
}

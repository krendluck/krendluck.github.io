// 音频资源自动刷新模块
import * as state from './state.js';
import * as dom from './dom.js';
import { logDebug } from './utils.js';

// API配置
const API_URL = 'https://notion-music-api.netlify.app/api';

// 最大尝试次数
const MAX_RETRY_ATTEMPTS = 3;

// 存储重试记录
const retryCounter = new Map();

/**
 * 初始化音频错误监听和自动刷新功能
 */
export function setupAutoRefresh() {
    // 监听主播放器的error事件
    dom.audioPlayerEl.addEventListener('error', async (e) => {
        const song = state.playlist[state.currentIndex];
        if (!song) return;
        
        const errorCode = dom.audioPlayerEl.error ? dom.audioPlayerEl.error.code : 0;
        logDebug(`音频播放错误: ${song.title}, 错误代码: ${errorCode}`);
        
        // 尝试刷新当前音频链接
        await handleAudioError(song);
    });
    
    logDebug('已设置音频自动刷新功能');
}

/**
 * 处理音频错误并尝试刷新链接
 * @param {Object} song 歌曲对象
 */
async function handleAudioError(song) {
    if (!song || !song.url) {
        logDebug('无效歌曲对象，无法刷新链接');
        return;
    }
    
    // 检查重试次数
    const songId = song.id || song.title;
    const retryKey = `audio-${songId}`;
    const attempts = retryCounter.get(retryKey) || 0;
    
    if (attempts >= MAX_RETRY_ATTEMPTS) {
        logDebug(`歌曲 ${song.title} 已达到最大重试次数(${MAX_RETRY_ATTEMPTS})，将跳至下一首`);
        // 通知用户并播放下一首
        if (typeof playNext === 'function') {
            playNext();
        }
        return;
    }
    
    // 记录当前播放状态
    const currentTime = dom.audioPlayerEl.currentTime || 0;
    const wasPlaying = !dom.audioPlayerEl.paused;
    
    logDebug(`尝试刷新歌曲链接: ${song.title} (第${attempts + 1}次尝试)`);
    
    try {
        // 增加重试计数
        retryCounter.set(retryKey, attempts + 1);
        
        // 请求新的音频链接
        const newUrl = await refreshMediaUrl(song);
        
        if (newUrl) {
            logDebug(`获取到新链接: ${song.title}`);
            
            // 更新歌曲对象中的URL
            song.url = newUrl;
            
            // 更新播放器源并恢复播放
            dom.audioPlayerEl.src = newUrl;
            
            // 等待可以播放时恢复位置
            dom.audioPlayerEl.oncanplay = () => {
                // 恢复播放位置
                if (currentTime > 0) {
                    dom.audioPlayerEl.currentTime = currentTime;
                    logDebug(`恢复播放位置: ${currentTime}秒`);
                }
                
                // 如果之前在播放，则继续播放
                if (wasPlaying) {
                    dom.audioPlayerEl.play()
                        .then(() => logDebug('恢复播放成功'))
                        .catch(err => logDebug(`恢复播放失败: ${err.message}`));
                }
                
                dom.audioPlayerEl.oncanplay = null;
            };
            
            // 一段时间后重置重试计数
            setTimeout(() => {
                retryCounter.delete(retryKey);
                logDebug(`重置 ${song.title} 的重试计数`);
            }, 60000); // 1分钟后重置
            
            return true;
        } else {
            logDebug(`未能获取新链接: ${song.title}`);
            return false;
        }
    } catch (error) {
        logDebug(`刷新链接出错: ${error.message}`);
        return false;
    }
}

/**
 * 从API获取更新的媒体URL
 * @param {Object} song 歌曲对象
 * @returns {Promise<string|null>} 新的URL或null
 */
async function refreshMediaUrl(song) {
    try {
        logDebug(`通过/music端点刷新链接: ${song.title}`);
        
        // 构造查询参数
        let endpoint = `${API_URL}/music`;
        
        // 添加搜索参数（如果有歌曲标题）
        if (song.title) {
            endpoint += `?search=${encodeURIComponent(song.title)}`;
        }
        
        // 发送请求获取最新数据
        const response = await fetch(endpoint);
        
        // 检查响应
        if (!response.ok) {
            throw new Error(`API响应错误: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 检查API返回的歌曲列表
        if (data.songs && Array.isArray(data.songs) && data.songs.length > 0) {
            // 在返回的歌曲中查找匹配项
            const matchingSong = data.songs.find(item => {
                // 尝试通过ID匹配（如果有）
                if (song.id && item.id === song.id) {
                    return true;
                }
                
                // 尝试通过标题精确匹配
                if (item.title && song.title && 
                    item.title.toLowerCase() === song.title.toLowerCase()) {
                    return true;
                }
                
                return false;
            });
            
            if (matchingSong && matchingSong.url) {
                logDebug(`从/music端点找到匹配歌曲: ${matchingSong.title}`);
                
                // 更新歌词链接（如果有）
                if (matchingSong.lrc) {
                    song.lrc = matchingSong.lrc;
                }
                
                return matchingSong.url;
            }
        }
        
        logDebug(`未在/music响应中找到匹配歌曲: ${song.title}`);
        
        // 尝试URL参数刷新策略作为后备
        if (song.url.includes('?')) {
            // 添加或更新时间戳参数
            const url = new URL(song.url);
            url.searchParams.set('t', Date.now());
            logDebug(`使用时间戳刷新URL: ${song.title}`);
            return url.toString();
        }
        
        throw new Error('API中未找到匹配歌曲');
    } catch (error) {
        logDebug(`获取更新URL失败: ${error.message}`);
        
        // 如果API调用失败，尝试修改当前URL参数
        try {
            if (song.url.includes('?')) {
                const url = new URL(song.url);
                url.searchParams.set('t', Date.now());
                return url.toString();
            } else if (song.url.includes('expires=')) {
                // 尝试添加简单的时间戳以绕过缓存
                return song.url + (song.url.includes('?') ? '&' : '?') + '_t=' + Date.now();
            }
        } catch (e) {
            logDebug(`处理URL失败: ${e.message}`);
        }
        
        return null;
    }
}

/**
 * 预验证URL，确保其有效
 * @param {Object} song 歌曲对象
 * @returns {Promise<string>} 有效的URL
 */
export async function ensureValidUrl(song) {
    if (!song || !song.url) return null;
    
    return new Promise((resolve) => {
        // 如果是当前播放的歌曲，原样返回URL
        // 这样可以避免在播放时重复验证当前URL，导致播放中断
        if (window.currentIndex !== undefined && 
            window.playlist && 
            window.playlist[window.currentIndex] === song) {
            logDebug(`当前播放中的歌曲，跳过验证: ${song.title}`);
            resolve(song.url);
            return;
        }
        
        const testAudio = new Audio();
        let timeoutId;
        let isResolved = false;
        
        // 清理函数
        const cleanup = () => {
            if (isResolved) return;
            isResolved = true;
            
            clearTimeout(timeoutId);
            testAudio.onerror = null;
            testAudio.oncanplaythrough = null;
            testAudio.src = '';
        };
        
        // 设置超时 - 减少超时时间，避免阻塞太久
        timeoutId = setTimeout(() => {
            logDebug(`URL验证超时: ${song.title}`);
            cleanup();
            resolve(song.url);
        }, 3000); // 降低到3秒
        
        // 加载成功
        testAudio.oncanplaythrough = () => {
            logDebug(`URL验证成功: ${song.title}`);
            cleanup();
            resolve(song.url);
        };
        
        // 加载失败 - 立即尝试刷新
        testAudio.onerror = async () => {
            logDebug(`URL验证失败，尝试刷新: ${song.title}`);
            cleanup();
            
            try {
                // 尝试获取新URL
                const newUrl = await refreshMediaUrl(song);
                if (newUrl) {
                    song.url = newUrl;
                    logDebug(`已更新URL: ${song.title}`);
                    
                    // 验证新URL是否可用
                    const finalTestAudio = new Audio();
                    finalTestAudio.src = newUrl;
                    
                    // 给新URL一个短时间的验证窗口
                    setTimeout(() => {
                        finalTestAudio.src = '';
                        resolve(newUrl);
                    }, 1000);
                } else {
                    resolve(song.url); // 无法获取新URL，返回原URL
                }
            } catch (error) {
                console.error('刷新URL时出错:', error);
                resolve(song.url);
            }
        };
        
        // 开始加载，添加缓存破坏参数
        const urlWithCacheBuster = song.url.includes('?') 
            ? `${song.url}&_t=${Date.now()}` 
            : `${song.url}?_t=${Date.now()}`;
        
        testAudio.src = urlWithCacheBuster;
        testAudio.load();
    });
}

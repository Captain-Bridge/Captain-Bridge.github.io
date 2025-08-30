// 音乐播放器初始化函数
let retryCount = 0;
const maxRetries = 10;

function initMusicPlayer() {
  console.log('initMusicPlayer called, retry count:', retryCount);
  
  // 检查重试次数
  if (retryCount >= maxRetries) {
    console.error('Max retry count reached, giving up on music player initialization');
    return;
  }
  
  // 检查APlayer库是否已加载
  if (typeof APlayer === 'undefined') {
    console.warn('APlayer library not loaded, retrying in 500ms...');
    retryCount++;
    setTimeout(initMusicPlayer, 500);
    return;
  }
  
  // 检查播放器是否已经存在且正常工作
  if (window.ap && window.ap.audio && window.ap.audio.currentTime !== undefined) {
    console.log('Music player already exists and working');
    return;
  }
  
  // 如果播放器存在但状态异常，先销毁
  if (window.ap && window.ap.destroy) {
    console.log('Destroying existing player');
    window.ap.destroy();
  }
  
  // 确保容器存在
  const container = document.getElementById('aplayer');
  if (!container) {
    console.warn('Music player container not found');
    return;
  }
  
  console.log('Initializing new music player');
  
  // 初始化播放器
  window.ap = new APlayer({
    container: container,
    autoplay: false, //自动播放
    loop: 'all', //音频循环播放, 可选值: 'all'全部循环, 'one'单曲循环, 'none'不循环
    fixed: true,
    volume: 0.5,
    listFolded: true,//列表默认折叠
    listMaxHeight: 3,//列表最大高度
    mutex: true,
    audio: [{
        name: 'Alex Theme',
        artist: 'Mick Gordon',
        url: '/music/Mick Gordon - Alex Theme.mp3',
        cover: '/images/prey.jpg',
        theme: '#12324C',
    },{
        name: 'Everything is Going to Be Okay',
        artist: 'Mick Gordon',
        url: '/music/Mick Gordon - Everything Is Going to Be Okay.mp3',
        cover: '/images/prey.jpg',
        theme: '#12324C',
    },{
        name: 'No Gravity',
        artist: 'Mick Gordon',
        url: '/music/Mick Gordon - No Gravity.mp3',
        cover: '/images/prey.jpg',
        theme: '#12324C',
    },{
        name: 'Human Elements',
        artist: 'Mick Gordon',
        url: '/music/Mick Gordon - Human Elements.mp3',
        cover: '/images/prey.jpg',
        theme: '#12324C',
    },{
        name: 'The Experiment',
        artist: 'Mick Gordon',
        url: '/music/Mick Gordon - The Experiment.mp3',
        cover: '/images/prey.jpg',
        theme: '#12324C',
    },{
        name: 'The truth Will Set You Free',
        artist: 'Mick Gordon',
        url: '/music/Mick Gordon - The Truth Will Set You Free.mp3',
        cover: '/images/prey.jpg',
        theme: '#12324C',
    },{
        name: 'Mind Games',
        artist: 'Raphael Colantonio,Production',
        url: '/music/Raphael Colantonio,Production - Mind Games.mp3',
        cover: '/images/prey.jpg',
        theme: '#12324C',
    },{
        name: 'May I (Unshaken)',
        artist: 'Various Artists',
        url: '/music/Various Artists - May I (Unshaken).mp3',
        cover: '/images/RPR2.jpg',
        theme: '#BA0619',
    }
  ]
  });
  
  console.log('Music player initialized successfully');
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMusicPlayer);
} else {
  // 如果页面已经加载完成，延迟一点时间确保所有脚本都加载完成
  setTimeout(initMusicPlayer, 100);
}

// 监听PJAX事件，在页面切换后检查播放器状态
document.addEventListener('pjax:success', () => {
  console.log('PJAX success event triggered');
  // 延迟检查，确保DOM更新完成
  setTimeout(() => {
    initMusicPlayer();
  }, 100);
});

// 额外的初始化尝试，确保在各种情况下都能工作
window.addEventListener('load', () => {
  console.log('Window load event triggered');
  setTimeout(initMusicPlayer, 200);
});
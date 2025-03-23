const ap = new APlayer({
    container: document.getElementById('aplayer'),
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
        url: 'https://dlink.host/1drv/aHR0cHM6Ly8xZHJ2Lm1zL3UvYy9lNzkxOTI3ODQzOGM2YzdiL0VXRk5EWkJmS1R0SXVsZ2RIVGFkRWxnQjFyMEg3TjBiNGxsNlQ2UURyYTVrV0E_ZT05RzhzOGE.mp3',
        cover: '/images/prey.jpg',
        theme: '#12324C',
    },{
        name: 'Everything is Going to Be Okay',
        artist: 'Mick Gordon',
        url: 'https://dlink.host/1drv/aHR0cHM6Ly8xZHJ2Lm1zL3UvYy9lNzkxOTI3ODQzOGM2YzdiL0VjOHQxOUEydzJCRHVEVHRyaWFXaks0QllOYnZqVFQ1SkN0NUlMSGpIOTUyNFE_ZT1Qa25rRmw.mp3',
        cover: '/images/prey.jpg',
        theme: '#12324C',
    },{
        name: 'No Gravity',
        artist: 'Mick Gordon',
        url: 'https://dlink.host/1drv/aHR0cHM6Ly8xZHJ2Lm1zL3UvYy9lNzkxOTI3ODQzOGM2YzdiL0VhUEQ1bldURnNoRG85MnVlaGg0RkxNQnNOQ0EtZVd5V2V1UW0ydFYwR2s0UWc_ZT1DVmVnYW4.mp3',
        cover: '/images/prey.jpg',
        theme: '#12324C',
    },{
        name: 'Human Elements',
        artist: 'Mick Gordon',
        url: 'https://dlink.host/1drv/aHR0cHM6Ly8xZHJ2Lm1zL3UvYy9lNzkxOTI3ODQzOGM2YzdiL0VaMU80cDF4aXhwQnNsN2dUMDRHWWxzQlZRV0F0U2UxT2lxdE9SOU9JcU5hNWc_ZT13Nno5eWQ.mp3',
        cover: '/images/prey.jpg',
        theme: '#12324C',
    },{
        name: 'The Experiment',
        artist: 'Mick Gordon',
        url: 'https://dlink.host/1drv/aHR0cHM6Ly8xZHJ2Lm1zL3UvYy9lNzkxOTI3ODQzOGM2YzdiL0VUcnp5YWQxUm9wR2dkelVicWlCaXpFQmwyODQ1Tl85UWZFbjNmcXdHVk9NMFE_ZT1xdzE1ZDE.mp3',
        cover: '/images/prey.jpg',
        theme: '#12324C',
    },{
        name: 'The truth Will Set You Free',
        artist: 'Mick Gordon',
        url: 'https://dlink.host/1drv/aHR0cHM6Ly8xZHJ2Lm1zL3UvYy9lNzkxOTI3ODQzOGM2YzdiL0VkRTdvM0NKMy1SQXM0eFpCOGZwMW9jQnh3UzdVMVBLeEtUYXlsZmtGcnlSY0E_ZT03YUpHU2w.mp3',
        cover: '/images/prey.jpg',
        theme: '#12324C',
    },{
        name: 'Mind Games',
        artist: 'Raphael Colantonio,Production',
        url: 'https://dlink.host/1drv/aHR0cHM6Ly8xZHJ2Lm1zL3UvYy9lNzkxOTI3ODQzOGM2YzdiL0VZNUNMay01QlRCSXF6Tkk5ZU44VlBrQnpXeDVJakZNVlZTQWZzeFNGM1psNUE_ZT1UQWNXT3Q.mp3',
        cover: '/images/prey.jpg',
        theme: '#12324C',
    },{
        name: 'May I (Unshaken)',
        artist: 'Various Artists',
        url: 'https://dlink.host/1drv/aHR0cHM6Ly8xZHJ2Lm1zL3UvYy9lNzkxOTI3ODQzOGM2YzdiL0VmSUZOWHdHaWd4UHRMV2xfODhvUFh3QkdrRmtLM1hidEpIdmZKT0JjamNMcWc_ZT1uYWJMZ1Y.mp3',
        cover: '/images/RPR2.jpg',
        theme: '#BA0619',
    }

    
]
});
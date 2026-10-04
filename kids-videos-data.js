/* 外部少儿视频目录。只链接官方播放页面，不嵌入播放器、不复制视频或第三方封面。
 * 核查：2026-10-04；来源记录见 research/video-sources-20261004.md 与 research/video-cartoon-sources-20261004.md。
 */
(function (root) {
  'use strict';
  root.KIDS_VIDEO_CATEGORIES = [
    { id: 'science', title: '科技小发现', icon: '🤖' },
    { id: 'nature', title: '自然小秘密', icon: '🌿' },
    { id: 'life', title: '身边的世界', icon: '🚚' },
    { id: 'craft', title: '动手做一做', icon: '✂️' },
    { id: 'peppa', title: '小猪佩奇', icon: '🐷' },
    { id: 'paw', title: '汪汪队', icon: '🐶' }
  ];
  root.KIDS_VIDEO_NOTICE = '点开会去央视网观看。请和爸爸妈妈一起看，页面可能有广告或其他推荐。';
  root.KIDS_VIDEOS = [
    {
      id: 'video-robot', title: '认识机器人', icon: '🤖', category: 'science', topic: 'science',
      description: '看一看机器人，想想它能帮我们做什么。',
      question: '你想让机器人帮忙做什么？',
      source: '央视网 · 智慧树', sourceTitle: '[智慧树]一起玩科学：机器人',
      url: 'https://tv.cctv.com/2023/07/11/VIDEK3pTlHvnsRPQehpDZPkl230711.shtml',
      publishedAt: '2023-07-11', checkedAt: '2026-10-04', durationSeconds: 492, durationLabel: '8 分 12 秒', duration: '8 分 12 秒',
      accessNote: '官方公开播放页；可能有广告和其他推荐。'
    },
    {
      id: 'video-3d-printing', title: '神奇的 3D 打印', icon: '🖨️', category: 'science', topic: 'science',
      description: '认识能把小物品一层一层做出来的机器。',
      question: '如果能打印一件小物品，你想做什么？',
      source: '央视网 · 智慧树', sourceTitle: '[智慧树]泡泡实验室：3D打印',
      url: 'https://tv.cctv.com/2019/06/12/VIDEw0zDXrhfK0MypvgQyVqC190612.shtml',
      publishedAt: '2019-06-12', checkedAt: '2026-10-04', durationSeconds: 705, durationLabel: '11 分 45 秒', duration: '11 分 45 秒',
      accessNote: '官方公开播放页；可能有广告和其他推荐。'
    },
    {
      id: 'video-mechanical-arm', title: '会帮忙的机械臂', icon: '🦾', category: 'science', topic: 'science',
      description: '认识机械臂，看看机器怎样帮人做事情。',
      question: '机械臂和你的手臂有什么相似的地方？',
      source: '央视网 · 智慧树', sourceTitle: '[智慧树]泡泡实验室：液压机械臂',
      url: 'https://tv.cctv.com/2019/06/19/VIDEzBUMzhvbssnWwdNLkcbO190619.shtml',
      publishedAt: '2019-06-19', checkedAt: '2026-10-04', durationSeconds: 370, durationLabel: '6 分 10 秒', duration: '6 分 10 秒',
      accessNote: '官方公开播放页；可能有广告和其他推荐。'
    },
    {
      id: 'video-paper-circuit', title: '纸上的小电路', icon: '💡', category: 'science', topic: 'science',
      description: '看一看纸上的小电路，认识电池和小灯。',
      question: '你家有哪些会亮的小灯？',
      source: '央视网 · 智慧树', sourceTitle: '[智慧树]泡泡实验室：纸上电路',
      url: 'https://tv.cctv.com/2019/06/05/VIDEZ7xFEvYEdkYoPpRG3D2c190605.shtml',
      publishedAt: '2019-06-05', checkedAt: '2026-10-04', durationSeconds: 704, durationLabel: '11 分 44 秒', duration: '11 分 44 秒',
      accessNote: '官方公开播放页；实验请和大人一起做。'
    },
    {
      id: 'video-magnet', title: '磁铁的小秘密', icon: '🧲', category: 'science', topic: 'science',
      description: '认识磁铁，想想它能吸住哪些东西。',
      question: '磁铁能吸住纸和铁吗？',
      source: '央视网 · 智慧树', sourceTitle: '[智慧树]泡泡实验室：磁铁',
      url: 'https://tv.cctv.com/2019/02/13/VIDEguCk5k3kqiPUPwZ4YAzj190213.shtml',
      publishedAt: '2019-02-13', checkedAt: '2026-10-04', durationSeconds: 742, durationLabel: '12 分 22 秒', duration: '12 分 22 秒',
      accessNote: '官方公开播放页；实验请和大人一起做。'
    },
    {
      id: 'video-water', title: '水的神奇现象', icon: '💧', category: 'nature', topic: 'nature',
      description: '和老师一起观察生活中常见的水。',
      question: '你今天在哪里见到了水？',
      source: '央视网 · 智慧树', sourceTitle: '[智慧树]泡泡实验室：水的神奇现象',
      url: 'https://tv.cctv.com/2020/01/22/VIDE7SkMUbpQJfrPYHQp7aKJ200122.shtml',
      publishedAt: '2020-01-22', checkedAt: '2026-10-04', durationSeconds: 722, durationLabel: '12 分 2 秒', duration: '12 分 2 秒',
      accessNote: '官方公开播放页；可能有广告和其他推荐。'
    },
    {
      id: 'video-camouflage', title: '动物的保护色', icon: '🦎', category: 'nature', topic: 'nature',
      description: '认识保护色，找找会把自己藏起来的小动物。',
      question: '和树叶一样绿的小动物容易被发现吗？',
      source: '央视网 · 智慧树', sourceTitle: '[智慧树]泡泡实验室：保护色',
      url: 'https://tv.cctv.com/2020/02/26/VIDEa8bmJIdsnzqmAxNGSvyP200226.shtml',
      publishedAt: '2020-02-26', checkedAt: '2026-10-04', durationSeconds: 673, durationLabel: '11 分 13 秒', duration: '11 分 13 秒',
      accessNote: '官方公开播放页；可能有广告和其他推荐。'
    },
    {
      id: 'video-truck', title: '大卡车运东西', icon: '🚚', category: 'life', topic: 'life',
      description: '认识大卡车，想想生活中的东西怎样送到我们身边。',
      question: '你在路上见过运什么东西的卡车？',
      source: '央视网 · 智慧树', sourceTitle: '[智慧树]道哥和摩尔：大卡车',
      url: 'https://tv.cctv.com/2019/06/17/VIDEBoghWuc2CGU9qTfj0IBy190617.shtml',
      publishedAt: '2019-06-17', checkedAt: '2026-10-04', durationSeconds: 257, durationLabel: '4 分 17 秒', duration: '4 分 17 秒',
      accessNote: '官方公开播放页；可能有广告和其他推荐。'
    },
    {
      id: 'video-space-movement', title: '太空动作一起做', icon: '🚀', category: 'life', topic: 'life',
      description: '跟着太空主题的动作，一起动一动身体。',
      question: '你最喜欢哪个太空动作？',
      source: '央视网 · 智慧树', sourceTitle: '[智慧树]请你像我这样做：太空',
      url: 'https://tv.cctv.com/2019/06/10/VIDEBsWzLvLLFxIA1CnlI7Nd190610.shtml',
      publishedAt: '2019-06-10', checkedAt: '2026-10-04', durationSeconds: 144, durationLabel: '2 分 24 秒', duration: '2 分 24 秒',
      accessNote: '官方公开播放页；可能有广告和其他推荐。'
    },
    {
      id: 'video-robot-craft', title: '做一个小机器人', icon: '🎨', category: 'craft', topic: 'life',
      description: '看看冰棍棒怎样变成一个有趣的小机器人。',
      question: '你的机器人想穿什么颜色的衣服？',
      source: '央视网 · 智慧树', sourceTitle: '[智慧树]巧巧手手工屋：冰棍棒机器人',
      url: 'https://tv.cctv.com/2020/03/30/VIDEG65sQC9ovjYyQ7PS7gvZ200330.shtml',
      publishedAt: '2020-03-30', checkedAt: '2026-10-04', durationSeconds: 191, durationLabel: '3 分 11 秒', duration: '3 分 11 秒',
      accessNote: '官方公开播放页；手工请和大人一起做。'
    },
    {
      id: 'video-paper-boat', title: '做一艘小帆船', icon: '⛵', category: 'craft', topic: 'life',
      description: '看看普通的纸盘怎样变成漂亮的小帆船。',
      question: '你想把小帆船开到哪里去？',
      source: '央视网 · 智慧树', sourceTitle: '[智慧树]巧巧手手工屋：纸盘帆船',
      url: 'https://tv.cctv.com/2020/03/23/VIDEa8EcOpVPAakAYDt0yjeJ200323.shtml',
      publishedAt: '2020-03-23', checkedAt: '2026-10-04', durationSeconds: 181, durationLabel: '3 分 1 秒', duration: '3 分 1 秒',
      accessNote: '官方公开播放页；手工请和大人一起做。'
    },
    {
      id: 'video-peppa-playground', title: '佩奇去操场', icon: '🐷', category: 'peppa', topic: 'life',
      description: '和佩奇一起看看操场上的快乐时光。',
      question: '你在操场最喜欢玩什么？',
      source: '央视网 · 小猪佩奇', sourceTitle: '[动漫世界]《小猪佩奇》 第27集 操场',
      url: 'https://tv.cctv.com/2015/06/30/VIDE1435644546185724.shtml',
      publishedAt: '2015-06-30', checkedAt: '2026-10-04', durationSeconds: 199, durationLabel: '3 分 19 秒', duration: '3 分 19 秒',
      hosting: 'external', accessNote: '在央视网播放；页面可能有广告或其他推荐。'
    },
    {
      id: 'video-peppa-school-fair', title: '佩奇的学校游园会', icon: '🎈', category: 'peppa', topic: 'life',
      description: '跟佩奇一起参加学校里的游园会。',
      question: '如果你来布置游园会，你想放什么？',
      source: '央视网 · 小猪佩奇', sourceTitle: '[动漫世界]《小猪佩奇》 第28集 学校游园会',
      url: 'https://tv.cctv.com/2015/06/30/VIDE1435644726551973.shtml',
      publishedAt: '2015-06-30', checkedAt: '2026-10-04', durationSeconds: 244, durationLabel: '4 分 4 秒', duration: '4 分 4 秒',
      hosting: 'external', accessNote: '在央视网播放；页面可能有广告或其他推荐。'
    },
    {
      id: 'video-peppa-camping', title: '佩奇一家去宿营', icon: '🏕️', category: 'peppa', topic: 'life',
      description: '看看佩奇一家在户外宿营的故事。',
      question: '你想和爸爸妈妈去哪里露营？',
      source: '央视网 · 小猪佩奇', sourceTitle: '[动漫世界]《小猪佩奇》 第26集 宿营',
      url: 'https://tv.cctv.com/2015/06/30/VIDE1435644545873700.shtml',
      publishedAt: '2015-06-30', checkedAt: '2026-10-04', durationSeconds: 257, durationLabel: '4 分 17 秒', duration: '4 分 17 秒',
      hosting: 'external', accessNote: '在央视网播放；页面可能有广告或其他推荐。'
    },
    {
      id: 'video-paw-birthday', title: '汪汪队：小鸡生日快乐', icon: '🎂', category: 'paw', topic: 'life',
      description: '咕咕鸡过生日啦，一起看看准备了什么惊喜。',
      question: '朋友过生日时，你想怎样祝福他？',
      source: '央视网 · 汪汪队立大功', sourceTitle: '《汪汪队立大功8》 第49集 孵出日快乐',
      url: 'https://tv.cctv.com/2026/07/05/VIDEEPxhtSG5E5WgvSVQ2llH260705.shtml',
      publishedAt: '2026-07-05', checkedAt: '2026-10-04', durationSeconds: 291, durationLabel: '4 分 51 秒', duration: '4 分 51 秒',
      hosting: 'external', accessNote: '在央视网播放；页面可能有广告或其他推荐。'
    },
    {
      id: 'video-paw-runaway-rooster', title: '汪汪队：帮助逃跑的小鸡', icon: '🐥', category: 'paw', topic: 'life',
      description: '狗狗们一起帮忙，让乱跑的小鸡安全回来。',
      question: '遇到小动物需要帮助时，可以请谁帮忙？',
      source: '央视网 · 汪汪队立大功', sourceTitle: '《汪汪队立大功8》 第1集 拯救逃跑鸡',
      url: 'https://tv.cctv.com/2026/06/30/VIDE6WX43sYVzv0Nw0srYLII260630.shtml',
      publishedAt: '2026-06-30', checkedAt: '2026-10-04', durationSeconds: 632, durationLabel: '10 分 32 秒', duration: '10 分 32 秒',
      hosting: 'external', accessNote: '在央视网播放；页面可能有广告或其他推荐。'
    }
  ];
})(typeof window !== 'undefined' ? window : globalThis);

# iPad 完整离线版与压缩包

用户要求通过二维码下载全部程序，在 iPad 离线玩。采用独立 `/offline/` 网页 App：Safari 添加到主屏幕后，从主屏幕图标下载全部内容。ZIP 为可运行程序和资源的备份，不是 IPA 或可以直接安装到 iPad 的包。已有 APK 仍是安卓在线 WebView 版。

## 构建与更新

1. 运行 `node build-web.cjs --esbuild /Users/guoju/.npm/_npx/0ddcb92289301b3b/node_modules/esbuild`。
2. 运行 `node build-offline.cjs`，自动复制离线主页面/arcade 页面、生成 manifest 与当前运行资源 SHA/字节清单。
3. 执行全部必要检查，至少包含 `tests/app-bundle.test.cjs` 和三份 `tests/offline-*.test.cjs`。
4. 网站发布保留 `offline/`、所有 `offline/assets.json` 列出的文件、当前内容哈希包和正常主页；ZIP 不加入直接上传部署包（约140MB，超出单文件限制）。

普通在线主页没有注册 Service Worker。仅离线安装器注册 `/offline/sw.js`，作用范围 `/offline/`；不会接管普通在线首页。受控离线页面仍可使用同源根路径的图片/声音。所有 arcade 导航和页内锚点保持在离线路径，根 `kid.js` 只在离线路径下改游戏目录链接；动态 arcade 返回链接也区分离线。

资源由当前有效 BOOKS、VOICE_MAP、认知图、涂色图、arcade 与安装页面确定；不是把全部生成记录或旧版声音缓存进设备。首版约142MB，含128个故事/654页和1,922条主应用有效配音。不会缓存央视视频文件，仅保留官方外链。

用户点下载才启动，最多并行4个，逐文件校验大小和 SHA，再次验证所有文件后才激活版本。中断/错误保留已下载文件；新版失败保留旧版。离线声音支持完整响应与单段 Range 的206/416，满足Safari分段播放。只删除完整新版本成功激活之后的旧应用内容缓存，不清除 localStorage 画廊、音乐或学习进度。

## 已完成与限制

使用真实浏览器下载全部内容后，关闭独立测试 HTTP 服务；确认离线首页、故事插图、固定MP3（readyState4且播放）、独立50关页面、开始游戏和返回离线路径正常。尚未连接用户真实 iPad，不能称为 iPad 真机安装验收。浏览器空间压力、清除网站数据或删除网页App可能导致缓存/本机记录丢失，不保证永久保留。

Safari 和主屏幕网页 App 不共享全部本地数据；要求先添加到主屏幕再下载，避免先在 Safari 缓存后发现桌面 App 没有内容。安装器入口 manifest 的 start_url 为 `./index.html`，重复进入可玩已有版本或下载新版。

备份 ZIP 与说明位于用户工作区安装包目录，并由现有局域网服务器提供下载。二维码分别指向 `https://leyman.cn/offline/` 和局域网 ZIP 下载地址，不把普通 HTTP 局域网入口当作 iPad PWA 安装入口。

## 官方依据

- [Apple：在 iPad 上将网站变为 App](https://support.apple.com/zh-cn/guide/ipad/ipad8f1f7a29/ipados)
- [WebKit：主屏幕网页App与Safari储存分离](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/)
- [WebKit：存储额度、持久储存与驱逐](https://webkit.org/blog/14403/updates-to-storage-policy/)
- [Google：Service Worker音频Range处理](https://web.dev/articles/sw-range-requests)
- [Apple：Ad Hoc签名需要证书和注册设备](https://developer.apple.com/help/account/provisioning-profiles/create-an-ad-hoc-provisioning-profile/)

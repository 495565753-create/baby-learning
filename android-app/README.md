# 果粒橙学习乐园 · 安卓平板离线版

本应用适用于 Android 8.0 及以上的安卓平板。故事、认知、课堂、小游戏、公主换装图片与问候语音，以及音乐小琴的 50 首跟弹小歌，都随 APK 安装到设备上，日常游玩不需要网络。第三方小影院视频仍需要联网，并由系统浏览器打开。

2.3.0 离线版沿用原来的 `cn.leyman.guolicheng` 包名、签名和 `https://leyman.cn` 页面来源。安装时可以覆盖旧版，并继续读取原来存在这个来源下的本机学习记录；卸载应用仍会删除本机数据。主页面和所有站内资源通过 WebView 的本地资源拦截从 APK 读取，缺失资源返回本地 404，不回退到网站。启动时清理旧网页资源缓存，并直接读取安装包内的新版页面。十位公主各有独立的脸型和哭哭表情；换装卡片现在显示与舞台一致的头饰、项链、耳环、魔法棒、鞋、披风、手包和场景图形，全部分类直接可见。

2.3.0 起，安卓应用右上角有“更新”入口。联网时从公开的 GitHub Release 查询新版，按系统下载流程将 APK 下载到应用专用目录，再核对 GitHub SHA-256、包名、版本号和原签名，交给安卓安装程序覆盖安装。下载中及断网时仍可玩内置内容；安卓系统会要求用户确认安装，首次通过本应用安装时还可能要求开启“允许安装应用”。2.2.0 及更早版本没有更新入口，需再覆盖安装一次 2.3.0。

画作和音乐作品仍用系统保存选择器导出，不需要存储权限。应用申请 INTERNET 权限用于用户主动打开外部视频及检查更新，另申请 REQUEST_INSTALL_PACKAGES 权限用于用户确认后的原包更新；本地内容无需网络。WebView 不允许 `file://` 与 `content://` 访问，不绕过 TLS 错误，不使用 `addJavascriptInterface`。

## 打包

先在项目根目录生成最新版网页与离线资源清单：

```sh
node build-web.cjs --esbuild /path/to/esbuild
node build-offline.cjs
bash android-app/test.sh
bash android-app/build-apk.sh
```

构建脚本核验清单中每个文件的 SHA-256 后，将网页资源装入 APK。使用现有 JDK 17、Android SDK 34 和原签名密钥。APK 位于 `安装包/果粒橙学习乐园-安卓平板-离线版-v2.3.0.apk`。签名私钥、密码和构建中间文件留在源码目录之外，不要上传。

## 后续版本的应用内更新

每个公开发行版的 tag 用 `android-v<versionCode>`（例如 `android-v6`），并附上同名资源 `guolicheng-android.apk`。GitHub Release 的资源条目需带 SHA-256 digest；客户端只接受本仓库、本 tag 和该资源名对应的 HTTPS 地址。构建时继续使用原包名与签名，并递增 `versionCode`。发行版发布后，用户在应用中点右上角“更新”；应用每天还会在后台检查一次并显示小红点。不要把签名密钥或密码上传到 GitHub。

安装包需通过 Java 策略测试、网页回归测试、AAPT2 构建、APK 签名与对齐校验。建议在小米平板上覆盖安装后实际检查横竖屏、断网朗读、音乐声音、换装语音和系统保存窗口。

## 官方参考

- [Android 本地内容加载](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content)
- [WebView 资源拦截](https://developer.android.com/reference/android/webkit/WebViewClient#shouldInterceptRequest(android.webkit.WebView,%20android.webkit.WebResourceRequest))
- [APK 签名](https://developer.android.com/tools/apksigner)

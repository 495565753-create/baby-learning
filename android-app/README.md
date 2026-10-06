# 果粒橙学习乐园 · 安卓平板离线版

本应用适用于 Android 8.0 及以上的安卓平板。故事、认知、课堂、小游戏、公主换装图片与问候语音，以及音乐小琴的 50 首跟弹小歌，都随 APK 安装到设备上，日常游玩不需要网络。第三方小影院视频仍需要联网，并由系统浏览器打开。

2.0.0 离线版沿用原来的 `cn.leyman.guolicheng` 包名、签名和 `https://leyman.cn` 页面来源。安装时可以覆盖旧版，并继续读取原来存在这个来源下的本机学习记录；卸载应用仍会删除本机数据。主页面和所有站内资源通过 WebView 的本地资源拦截从 APK 读取，缺失资源返回本地 404，不回退到网站。

画作和音乐作品仍用系统保存选择器导出，不需要存储权限。应用仅申请 INTERNET 权限以便用户主动打开外部视频；本地内容无需网络。WebView 不允许 `file://` 与 `content://` 访问，不绕过 TLS 错误，不使用 `addJavascriptInterface`。

## 打包

先在项目根目录生成最新版网页与离线资源清单：

```sh
node build-web.cjs --esbuild /path/to/esbuild
node build-offline.cjs
bash android-app/test.sh
bash android-app/build-apk.sh
```

构建脚本核验清单中每个文件的 SHA-256 后，将网页资源装入 APK。使用现有 JDK 17、Android SDK 34 和原签名密钥。APK 位于 `安装包/果粒橙学习乐园-安卓平板-离线版-v2.0.0.apk`。签名私钥、密码和构建中间文件留在源码目录之外，不要上传。

安装包需通过 Java 策略测试、网页回归测试、AAPT2 构建、APK 签名与对齐校验。建议在小米平板上覆盖安装后实际检查横竖屏、断网朗读、音乐声音、换装语音和系统保存窗口。

## 官方参考

- [Android 本地内容加载](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content)
- [WebView 资源拦截](https://developer.android.com/reference/android/webkit/WebViewClient#shouldInterceptRequest(android.webkit.WebView,%20android.webkit.WebResourceRequest))
- [APK 签名](https://developer.android.com/tools/apksigner)

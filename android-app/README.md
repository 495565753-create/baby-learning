# 果粒橙学习乐园 · 安卓平板版

这是独立签名的轻量 Android 应用，打开 https://leyman.cn/。适用于 Android 8.0 及以上的小米平板和其他安卓设备。需要联网；网站内容更新后，重新打开应用即可看到更新，无需重新安装 APK。

支持自由横竖屏、网页故事朗读、画画、滑动游戏和本机学习记录。系统返回键会先返回应用里的上一页；首页返回键会询问是否退出。外部 HTTPS 视频由系统浏览器打开。断网或首页请求失败时有重试和回首页入口。

画作导出使用系统保存选择器，无需存储权限。PNG/JPEG/WebP、音乐 WAV/MIDI/MP3 和 JSON 作品数据可通过受限导出通道保存，单个作品最多 16 MiB；音乐模块当前仍以本机旋律录音和作品保存为主。用户取消保存不会被当作保存成功。画廊、录音和学习记录保存在应用本机，卸载应用会删除这些本机数据。

仅申请 INTERNET 权限，不申请相机、麦克风、定位或读取文件权限。应用内页面只允许 leyman.cn / www.leyman.cn 的 HTTPS；不绕过 TLS 错误，不加载明文网络内容，不使用 addJavascriptInterface。导出采用只发送给可信主页面的 WebMessagePort，原生端限制类型、内容签名、体积和文件名，保存目的地只来自系统选择器。

## 打包

`build-apk.sh` 复用已有 JDK 17 和 Android 34 build-tools，不安装新 SDK，也不自动同意 SDK 许可证。资源编译、Java 编译、D8、zipalign、apksigner 均使用已有官方 Android 工具。目标 target SDK 34，最低 min SDK 26，这是自用侧载版本，不是应用商店上架版本。

可通过 `GC_ANDROID_SDK`、`GC_JDK`、`GC_PRIVATE_DIR`、`GC_OUTPUT_DIR` 配置工具、签名及输出目录，再运行：

```sh
bash android-app/test.sh
bash android-app/build-apk.sh
```

脚本把全部构建中间文件、签名密钥及密码、验证记录写到源码目录外。必须保留首次签名密钥和密码；后续安装包复用同一签名并提高 versionCode，才能覆盖升级并保留本机数据。不要把私钥、密码或构建目录加入代码库或网站部署包。正式签名 APK 只复制到网站的 downloads/ 发布目录，供用户下载安装。

APK 已完成签名、包名/权限、字节码和对齐检查；36 项纯 Java URL/导出/临时缓存断言、5 项导航/暂停/恢复/网页导出回归均通过。Android 14 平板模拟器安装成功、冷启动正常，记录中没有应用致命异常。当前原生界面工具无法识别 SDK 模拟器的 Qt 程序，未做模拟器界面点击或截图验收，也未连接小米平板真机；需在设备安装后验证横屏、故事朗读、两指弹琴、离线重试和图片保存。

## 官方参考

- [Android WebView](https://developer.android.com/develop/ui/views/layout/webapps/webview)
- [WebView 安全 API](https://developer.android.com/reference/android/webkit/WebView)
- [WebMessagePort](https://developer.android.com/reference/android/webkit/WebMessagePort)
- [系统文件保存选择器](https://developer.android.com/training/data-storage/shared/documents-files)
- [AAPT2 / D8 / APK 构建](https://developer.android.com/tools/aapt2)
- [APK 签名验证](https://developer.android.com/tools/apksigner)

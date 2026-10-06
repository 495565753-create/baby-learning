package cn.leyman.guolicheng;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

public final class PolicyTest {
    static int assertions;
    static void check(boolean condition) { assertions++; if (!condition) throw new AssertionError("policy assertion " + assertions); }
    static void reject(Runnable run) { boolean rejected = false; try { run.run(); } catch (IllegalArgumentException expected) { rejected = true; } check(rejected); }
    public static void main(String[] args) throws Exception {
        for (String own : new String[]{"https://leyman.cn/offline/play.html", "https://LEYMAN.CN:443/princess-assets/ice-face-v3.png"}) check(UrlPolicy.isOwn(own));
        for (String hostile : new String[]{null, "http://leyman.cn", "https://leyman.cn.evil.test/", "https://leyman.cn@evil.test/", "https://evil.test@leyman.cn/", "https://leyman.cn:444/", "javascript:alert(1)", "file:///sdcard/a", "data:text/html,test", "https://leyman.cn\\@evil.test/", "https://leyman.cn./"}) check(!UrlPolicy.isOwn(hostile));
        check(UrlPolicy.isExternalHttps("https://www.youtube.com/watch?v=example"));
        check(!UrlPolicy.isExternalHttps("intent://video")); check(!UrlPolicy.isExternalHttps("http://video.example/"));
        check(UrlPolicy.origin("https://leyman.cn:443/offline/play.html?v=test").equals("https://leyman.cn"));
        reject(() -> UrlPolicy.origin("https://evil.test/"));
        check(LocalAssetPolicy.assetPath("https://leyman.cn/princess-assets/ice-face-v3.png?x=1").equals("site/princess-assets/ice-face-v3.png"));
        for (String hostile : new String[]{"https://leyman.cn/a/../b", "https://leyman.cn/a/%2e%2e/b", "https://leyman.cn/a//b", "https://leyman.cn/a/%5c/b", "https://evil.test/index.html"}) check(LocalAssetPolicy.assetPath(hostile) == null);
        check(LocalAssetPolicy.mime("site/princess-voices/ice-hello.mp3").equals("audio/mpeg"));
        check(UpdatePolicy.versionCode("android-v5") == 5);
        check(UpdatePolicy.versionCode("android-v0") == -1);
        check(UpdatePolicy.versionCode("v5") == -1);
        String updateUrl = "https://github.com/495565753-create/baby-learning/releases/download/android-v6/guolicheng-android.apk";
        String digest = "sha256:" + new String(new char[64]).replace('\0', 'a');
        check(UpdatePolicy.isTrusted(6, 5, updateUrl, digest, 147000000L));
        check(!UpdatePolicy.isTrusted(5, 5, updateUrl, digest, 147000000L));
        check(!UpdatePolicy.isTrusted(6, 5, updateUrl.replace("github.com", "github.com.evil.test"), digest, 147000000L));
        check(!UpdatePolicy.isTrusted(6, 5, updateUrl, "sha256:bad", 147000000L));
        check(!UpdatePolicy.isTrusted(6, 5, updateUrl, digest, 500L));
        check(UpdatePolicy.sha256(new java.io.ByteArrayInputStream("abc".getBytes(StandardCharsets.UTF_8))).equals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"));

        byte[] png = new byte[]{(byte)137, 80, 78, 71, 13, 10, 26, 10, 1};
        String png64 = Base64.getEncoder().encodeToString(png);
        ExportPolicy.Payload data = ExportPolicy.dataUrl("data:image/png;base64," + png64, "../../我的画.png");
        check(data.mime.equals("image/png")); check(data.bytes.length == png.length);
        check(!data.name.contains("/") && !data.name.startsWith(".") && data.name.endsWith(".png"));
        check(ExportPolicy.parse("image/png", "作品.exe", png64).name.endsWith(".png"));
        check(ExportPolicy.parse("application/json", "我的音乐", Base64.getEncoder().encodeToString("{\"notes\":[60,64]}".getBytes(StandardCharsets.UTF_8))).name.equals("我的音乐.json"));
        reject(() -> ExportPolicy.parse("application/vnd.android.package-archive", "bad.apk", png64));
        reject(() -> ExportPolicy.parse("text/html", "bad.html", png64));
        reject(() -> ExportPolicy.parse("image/png", "image.png", "%%%"));
        reject(() -> ExportPolicy.parse("image/png", "image.png", Base64.getEncoder().encodeToString("not an image".getBytes(StandardCharsets.UTF_8))));
        reject(() -> ExportPolicy.dataUrl("data:image/png,plain-not-base64", "a.png"));
        reject(() -> ExportPolicy.dataUrl("https://leyman.cn/a.png", "a.png"));
        reject(() -> ExportPolicy.parse("image/png", "a.png", Base64.getEncoder().encodeToString(new byte[ExportPolicy.MAX_BYTES + 1])));
        java.io.File cache = new java.io.File(args[0]); cache.mkdirs();
        java.io.File pending = PendingExportStore.write(cache, data);
        ExportPolicy.Payload restored = PendingExportStore.read(cache, pending.getName(), data.mime, data.name);
        check(java.util.Arrays.equals(restored.bytes, data.bytes)); check(restored.name.equals(data.name));
        boolean invalidPath = false;
        try { PendingExportStore.file(cache, "../outside.bin"); } catch (java.io.IOException ex) { invalidPath = true; } check(invalidPath);
        pending.setLastModified(System.currentTimeMillis() - 86400001L); PendingExportStore.purgeOld(cache, System.currentTimeMillis()); check(!pending.exists());
        System.out.println("URL/export policies passed: " + assertions + " assertions");
    }
}

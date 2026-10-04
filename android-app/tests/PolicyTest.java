package cn.leyman.guolicheng;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

public final class PolicyTest {
    static int assertions;
    static void check(boolean condition) { assertions++; if (!condition) throw new AssertionError("policy assertion " + assertions); }
    static void reject(Runnable run) { boolean rejected = false; try { run.run(); } catch (IllegalArgumentException expected) { rejected = true; } check(rejected); }
    public static void main(String[] args) throws Exception {
        for (String own : new String[]{"https://leyman.cn/", "https://www.leyman.cn/?section=writing", "https://LEYMAN.CN:443/arcade/game.html"}) check(UrlPolicy.isOwn(own));
        for (String hostile : new String[]{null, "http://leyman.cn", "https://leyman.cn.evil.test/", "https://leyman.cn@evil.test/", "https://evil.test@leyman.cn/", "https://leyman.cn:444/", "javascript:alert(1)", "file:///sdcard/a", "data:text/html,test", "https://leyman.cn\\@evil.test/", "https://%6ceyman.cn/", "https://leyman.cn./"}) check(!UrlPolicy.isOwn(hostile));
        check(UrlPolicy.isExternalHttps("https://www.youtube.com/watch?v=example"));
        check(!UrlPolicy.isExternalHttps("intent://video")); check(!UrlPolicy.isExternalHttps("http://video.example/"));
        check(UrlPolicy.origin("https://www.leyman.cn:443/?v=test").equals("https://www.leyman.cn"));
        reject(() -> UrlPolicy.origin("https://evil.test/"));

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

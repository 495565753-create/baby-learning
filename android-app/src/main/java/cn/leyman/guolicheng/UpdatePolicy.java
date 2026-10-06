package cn.leyman.guolicheng;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/** Checks the public update source before an APK is offered to Android's installer. */
public final class UpdatePolicy {
    public static final String RELEASE_API = "https://api.github.com/repos/495565753-create/baby-learning/releases/latest";
    public static final String ASSET_NAME = "guolicheng-android.apk";
    private static final String RELEASE_BASE = "https://github.com/495565753-create/baby-learning/releases/download/";
    private UpdatePolicy() {}

    public static int versionCode(String tag) {
        if (tag == null || !tag.matches("android-v[1-9][0-9]{0,7}")) return -1;
        try { return Integer.parseInt(tag.substring(9)); }
        catch (NumberFormatException ex) { return -1; }
    }

    public static boolean isTrusted(int code, int installed, String url, String digest, long bytes) {
        return code > installed && code > 0 && bytes >= 20_000_000L && bytes <= 500_000_000L
                && (RELEASE_BASE + "android-v" + code + "/" + ASSET_NAME).equals(url)
                && digest != null && digest.matches("sha256:[a-fA-F0-9]{64}");
    }

    public static String sha256(InputStream input) throws IOException {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[65536]; int count;
            while ((count = input.read(buffer)) != -1) digest.update(buffer, 0, count);
            StringBuilder result = new StringBuilder(64);
            for (byte value : digest.digest()) result.append(String.format("%02x", value & 0xff));
            return result.toString();
        } catch (NoSuchAlgorithmException ex) { throw new IOException("SHA-256 unavailable", ex); }
    }
}

package cn.leyman.guolicheng;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Locale;

/** A save request contains bytes, never a device path or a URL to fetch natively. */
public final class ExportPolicy {
    public static final int MAX_BYTES = 16 * 1024 * 1024;
    private ExportPolicy() {}
    public static final class Payload {
        public final String mime, name;
        public final byte[] bytes;
        Payload(String mime, String name, byte[] bytes) { this.mime = mime; this.name = name; this.bytes = bytes; }
    }
    public static Payload parse(String mime, String name, String base64) {
        if (base64 == null || base64.length() > ((MAX_BYTES + 2) / 3) * 4)
            throw new IllegalArgumentException("Export too large");
        return fromBytes(mime, name, Base64.getDecoder().decode(base64));
    }
    public static Payload fromBytes(String mime, String name, byte[] bytes) {
        String normalized = mime == null ? "" : mime.toLowerCase(Locale.ROOT);
        String extension;
        switch (normalized) {
            case "image/png": extension = ".png"; break;
            case "image/jpeg": extension = ".jpg"; break;
            case "image/webp": extension = ".webp"; break;
            case "audio/wav": case "audio/x-wav": normalized = "audio/wav"; extension = ".wav"; break;
            case "audio/midi": case "audio/x-midi": normalized = "audio/midi"; extension = ".mid"; break;
            case "audio/mpeg": extension = ".mp3"; break;
            case "application/json": extension = ".json"; break;
            default: throw new IllegalArgumentException("Unsupported export type");
        }
        if (bytes == null || bytes.length == 0 || bytes.length > MAX_BYTES || !matches(normalized, bytes))
            throw new IllegalArgumentException("Invalid export content");
        String clean = name == null ? "果粒橙作品" : name.replaceAll("[\\p{Cntrl}/\\\\:*?\"<>|]", "_").trim();
        clean = clean.replaceAll("^\\.+", "").replaceAll("(?i)\\.(png|jpe?g|webp|wav|mid|mp3|json)$", "");
        if (clean.length() > 70) clean = clean.substring(0, 70);
        if (clean.isEmpty()) clean = "果粒橙作品";
        return new Payload(normalized, clean + extension, bytes);
    }
    public static Payload dataUrl(String url, String name) {
        if (url == null || !url.startsWith("data:")) throw new IllegalArgumentException("Not a data URL");
        int separator = url.indexOf(";base64,");
        if (separator < 5 || separator > 64) throw new IllegalArgumentException("Not a base64 data URL");
        return parse(url.substring(5, separator), name, url.substring(separator + 8));
    }
    private static boolean starts(byte[] b, int... prefix) {
        if (b.length < prefix.length) return false;
        for (int i = 0; i < prefix.length; i++) if ((b[i] & 255) != prefix[i]) return false;
        return true;
    }
    private static boolean ascii(byte[] b, int offset, String text) {
        byte[] p = text.getBytes(StandardCharsets.US_ASCII);
        if (b.length < offset + p.length) return false;
        for (int i = 0; i < p.length; i++) if (b[offset + i] != p[i]) return false;
        return true;
    }
    private static boolean matches(String mime, byte[] b) {
        switch (mime) {
            case "image/png": return starts(b, 137, 80, 78, 71, 13, 10, 26, 10);
            case "image/jpeg": return starts(b, 255, 216, 255);
            case "image/webp": return ascii(b, 0, "RIFF") && ascii(b, 8, "WEBP");
            case "audio/wav": return ascii(b, 0, "RIFF") && ascii(b, 8, "WAVE");
            case "audio/midi": return ascii(b, 0, "MThd");
            case "audio/mpeg": return ascii(b, 0, "ID3") || b.length > 1 && (b[0] & 255) == 255 && (b[1] & 224) == 224;
            case "application/json": String s = new String(b, StandardCharsets.UTF_8).trim(); return s.startsWith("{") || s.startsWith("[");
            default: return false;
        }
    }
}

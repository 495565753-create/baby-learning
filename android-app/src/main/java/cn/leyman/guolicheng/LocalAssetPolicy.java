package cn.leyman.guolicheng;

import java.net.URI;
import java.net.URISyntaxException;

/** Strict mapping from the trusted app origin to packaged site assets. */
public final class LocalAssetPolicy {
    private LocalAssetPolicy() {}

    public static String assetPath(String url) {
        if (!UrlPolicy.isOwn(url)) return null;
        try {
            String raw = new URI(url).getRawPath();
            if (raw == null || !raw.startsWith("/") || raw.indexOf('%') >= 0 || raw.indexOf('\\') >= 0) return null;
            String path = raw.substring(1);
            if (path.isEmpty()) return null;
            for (String segment : path.split("/", -1)) {
                if (segment.isEmpty() || segment.equals(".") || segment.equals("..") || !segment.matches("[A-Za-z0-9_.-]+")) return null;
            }
            return "site/" + path;
        } catch (URISyntaxException ex) { return null; }
    }

    public static String mime(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js")) return "text/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".webmanifest")) return "application/manifest+json";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".webp")) return "image/webp";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        if (path.endsWith(".mp3")) return "audio/mpeg";
        if (path.endsWith(".wav")) return "audio/wav";
        return "application/octet-stream";
    }
}

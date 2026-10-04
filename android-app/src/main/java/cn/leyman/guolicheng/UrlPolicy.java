package cn.leyman.guolicheng;

import java.net.URI;
import java.net.URISyntaxException;

/** All in-app pages stay on the two production HTTPS origins. */
public final class UrlPolicy {
    private UrlPolicy() {}
    public static boolean isOwn(String url) {
        URI uri = https(url);
        return uri != null && ("leyman.cn".equalsIgnoreCase(uri.getHost())
                || "www.leyman.cn".equalsIgnoreCase(uri.getHost()));
    }
    public static boolean isExternalHttps(String url) {
        return https(url) != null && !isOwn(url);
    }
    private static URI https(String url) {
        try {
            URI uri = new URI(url);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null
                    && uri.getUserInfo() == null && (uri.getPort() == -1 || uri.getPort() == 443)
                    ? uri : null;
        } catch (URISyntaxException | NullPointerException ex) { return null; }
    }
    public static String origin(String url) {
        if (!isOwn(url)) throw new IllegalArgumentException("Untrusted origin");
        try { return "https://" + new URI(url).getHost().toLowerCase(java.util.Locale.ROOT); }
        catch (URISyntaxException ex) { throw new IllegalArgumentException(ex); }
    }
}

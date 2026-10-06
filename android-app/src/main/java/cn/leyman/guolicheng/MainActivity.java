package cn.leyman.guolicheng;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebMessage;
import android.webkit.WebMessagePort;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

public final class MainActivity extends Activity {
    private static final String HOME = "https://leyman.cn/offline/play.html";
    private static final String UPDATE_URL = "https://leyman.cn/offline/app-update";
    private static final int SAVE_WORK = 41;
    private WebView web;
    private AppUpdater updater;
    private LinearLayout panel;
    private TextView panelTitle, panelDescription;
    private Button retry;
    private ProgressBar progress;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private WebMessagePort exportPort;
    private String retryUrl = HOME;
    private boolean pageError, loaded, pausedWithPage, destroyed;
    private ExportPolicy.Payload pendingExport;
    private File pendingExportFile;
    private final Runnable loadTimeout = () -> { if (!loaded && !destroyed) error("学习乐园还没打开", "请点下面的按钮再试一次。"); };

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(255, 248, 237));
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        FrameLayout.LayoutParams bar = new FrameLayout.LayoutParams(-1, dp(3), Gravity.TOP);
        root.addView(progress, bar);
        buildPanel(root);
        setContentView(root);
        PendingExportStore.purgeOld(getCacheDir(), System.currentTimeMillis());
        if (state != null && state.containsKey("gc.export.file")) {
            try {
                pendingExport = PendingExportStore.read(getCacheDir(), state.getString("gc.export.file"), state.getString("gc.export.mime"), state.getString("gc.export.name"));
                pendingExportFile = PendingExportStore.file(getCacheDir(), state.getString("gc.export.file"));
            } catch (Exception ex) { toast("刚才的作品暂时没保存好，请回到画作再保存一次。"); }
        }

        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        // Every page and asset is bundled in the APK. A cached page from an older
        // installation can hide new games or point at asset names no longer bundled.
        web.clearCache(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setUserAgentString(settings.getUserAgentString() + " GuolichengTablet/2.3.1-Offline");
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        WebView.setWebContentsDebuggingEnabled(false);
        web.setWebViewClient(new SiteClient());
        web.setWebChromeClient(new ChromeClient());
        web.setDownloadListener(new WorkDownload());
        updater = new AppUpdater(this, web);
        if (state != null && web.restoreState(state) != null && UrlPolicy.isOwn(web.getUrl())) {
            retryUrl = web.getUrl();
        } else web.loadUrl(HOME);
        handler.postDelayed(() -> { if (!destroyed) updater.check(false); }, 5000);
    }

    private int dp(int n) { return Math.round(n * getResources().getDisplayMetrics().density); }
    private void buildPanel(FrameLayout root) {
        panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(28), dp(28), dp(28), dp(28));
        panel.setBackgroundColor(Color.rgb(255, 248, 237));
        panelTitle = new TextView(this);
        panelTitle.setTextSize(27); panelTitle.setTextColor(Color.rgb(71, 73, 81)); panelTitle.setGravity(Gravity.CENTER);
        panelDescription = new TextView(this);
        panelDescription.setTextSize(17); panelDescription.setGravity(Gravity.CENTER);
        panelDescription.setPadding(0, dp(18), 0, dp(20));
        retry = new Button(this); retry.setText("再试一次"); retry.setTextSize(20);
        retry.setMinHeight(dp(54)); retry.setOnClickListener(v -> web.loadUrl(UrlPolicy.isOwn(retryUrl) ? retryUrl : HOME));
        Button home = new Button(this); home.setText("🏠 回学习乐园"); home.setMinHeight(dp(54));
        home.setOnClickListener(v -> web.loadUrl(HOME));
        panel.addView(panelTitle, new LinearLayout.LayoutParams(-1, -2));
        panel.addView(panelDescription, new LinearLayout.LayoutParams(-1, -2));
        panel.addView(retry, new LinearLayout.LayoutParams(dp(220), -2));
        panel.addView(home, new LinearLayout.LayoutParams(dp(220), -2));
        root.addView(panel, new FrameLayout.LayoutParams(-1, -1));
        loading();
    }
    private void loading() {
        panelTitle.setText("🍊 果粒橙学习乐园"); panelDescription.setText("正在打开，等一小会儿……");
        retry.setVisibility(View.GONE); panel.setVisibility(View.VISIBLE);
    }
    private void error(String title, String message) {
        pageError = true; handler.removeCallbacks(loadTimeout);
        progress.setVisibility(View.GONE); panelTitle.setText("🍊 " + title); panelDescription.setText(message);
        retry.setVisibility(View.VISIBLE); panel.setVisibility(View.VISIBLE);
    }
    private void toast(String text) { Toast.makeText(this, text, Toast.LENGTH_LONG).show(); }

    private boolean navigate(String url, boolean gesture) {
        if (UPDATE_URL.equals(url)) { if (updater != null) updater.check(true); return true; }
        if (UrlPolicy.isOwn(url)) return false;
        if (gesture && UrlPolicy.isExternalHttps(url)) openBrowser(url);
        return true;
    }
    private void openBrowser(String url) {
        if (!UrlPolicy.isExternalHttps(url)) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch (ActivityNotFoundException ex) { toast("还没找到浏览器，请大朋友帮忙打开。"); }
    }
    private final class SiteClient extends WebViewClient {
        @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            String url = request.getUrl().toString();
            if (!UrlPolicy.isOwn(url)) return null;
            String path = LocalAssetPolicy.assetPath(url);
            if (path == null) return missingAsset();
            try {
                return new WebResourceResponse(LocalAssetPolicy.mime(path),
                        LocalAssetPolicy.mime(path).startsWith("text/") || path.endsWith(".json") ? "UTF-8" : null,
                        200, "OK", Collections.singletonMap("Cache-Control", "no-store"),
                        getAssets().open(path));
            } catch (IOException ex) { return missingAsset(); }
        }
        private WebResourceResponse missingAsset() {
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
                    Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
        }
        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return request.isForMainFrame() ? navigate(request.getUrl().toString(), request.hasGesture()) : !UrlPolicy.isOwn(request.getUrl().toString());
        }
        @Override public boolean shouldOverrideUrlLoading(WebView view, String url) { return navigate(url, true); }
        @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
            closeExportPort(); handler.removeCallbacks(loadTimeout);
            if (!UrlPolicy.isOwn(url)) { view.stopLoading(); error("这个页面暂时打不开", "点下面的按钮回到学习乐园吧。"); return; }
            retryUrl = url; loaded = false; pageError = false; loading(); progress.setVisibility(View.VISIBLE);
            handler.postDelayed(loadTimeout, 25000);
        }
        @Override public void onPageCommitVisible(WebView view, String url) {
            if (!pageError && UrlPolicy.isOwn(url)) { loaded = true; handler.removeCallbacks(loadTimeout); panel.setVisibility(View.GONE); }
        }
        @Override public void onPageFinished(WebView view, String url) {
            handler.removeCallbacks(loadTimeout);
            if (!pageError && UrlPolicy.isOwn(url)) { loaded = true; panel.setVisibility(View.GONE); progress.setVisibility(View.GONE); installExportPort(url); if (updater != null) updater.showBadge(); }
        }
        @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) MainActivity.this.error("学习乐园还没打开", "请点下面的按钮再试一次。");
        }
        @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
            if (request.isForMainFrame()) error("学习乐园暂时没打开", "等一小会儿，再点重试就好。");
        }
        @Override public void onReceivedSslError(WebView view, SslErrorHandler ssl, SslError error) {
            ssl.cancel();
            if (error.getUrl() != null && error.getUrl().equals(retryUrl)) MainActivity.this.error("学习乐园还没打开", "请点下面的按钮再试一次。");
        }
    }
    private final class ChromeClient extends WebChromeClient {
        @Override public void onProgressChanged(WebView view, int value) { progress.setProgress(value); if (value == 100) progress.setVisibility(View.GONE); }
        @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
        @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) { callback.invoke(origin, false, false); }
        @Override public boolean onCreateWindow(WebView view, boolean dialog, boolean userGesture, Message result) {
            if (!userGesture || !UrlPolicy.isOwn(web.getUrl())) return false;
            final WebView popup = new WebView(MainActivity.this);
            popup.setWebViewClient(new WebViewClient() {
                private boolean target(String url) {
                    if (UrlPolicy.isOwn(url)) web.loadUrl(url); else if (UrlPolicy.isExternalHttps(url)) openBrowser(url);
                    popup.stopLoading(); handler.post(popup::destroy); return true;
                }
                @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return target(request.getUrl().toString()); }
                @Override public boolean shouldOverrideUrlLoading(WebView view, String url) { return target(url); }
            });
            ((WebView.WebViewTransport) result.obj).setWebView(popup); result.sendToTarget(); return true;
        }
    }

    private void closeExportPort() { if (exportPort != null) { exportPort.close(); exportPort = null; } }
    private String exportScript() throws Exception {
        try (InputStream in = getAssets().open("web-export.js"); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096]; int n; while ((n = in.read(buffer)) >= 0) out.write(buffer, 0, n);
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        }
    }
    private void installExportPort(String url) {
        closeExportPort();
        if (!UrlPolicy.isOwn(url)) return;
        try {
            final String origin = UrlPolicy.origin(url);
            final String token = "guolicheng-export-v1:" + java.util.UUID.randomUUID().toString();
            web.evaluateJavascript(exportScript().replace("__GC_EXPORT_TOKEN__", token), ignored -> {
                if (destroyed || !UrlPolicy.isOwn(web.getUrl()) || !origin.equals(UrlPolicy.origin(web.getUrl()))) return;
                WebMessagePort[] ports = web.createWebMessageChannel(); exportPort = ports[0];
                exportPort.setWebMessageCallback(new WebMessagePort.WebMessageCallback() {
                    @Override public void onMessage(WebMessagePort port, WebMessage message) {
                        if (port != exportPort || !UrlPolicy.isOwn(web.getUrl()) || !origin.equals(UrlPolicy.origin(web.getUrl()))) return;
                        String data = message.getData();
                        if (data == null || data.length() > 22400000) { toast("作品有点大，我们换一张再试试吧。"); return; }
                        try {
                            JSONObject request = new JSONObject(data);
                            if (!"save".equals(request.optString("type"))) return;
                            save(ExportPolicy.parse(request.getString("mime"), request.optString("name", "果粒橙作品"), request.getString("data")));
                        } catch (Exception ex) { toast("作品暂时没保存好，再试试吧。"); }
                    }
                });
                web.postWebMessage(new WebMessage(token, new WebMessagePort[]{ports[1]}), Uri.parse(origin));
            });
        } catch (Exception ex) { toast("图片可以先放进小画廊，稍后再导出。"); }
    }
    private final class WorkDownload implements DownloadListener {
        @Override public void onDownloadStart(String url, String userAgent, String disposition, String mime, long length) {
            if (!UrlPolicy.isOwn(web.getUrl())) return;
            if (url != null && url.startsWith("data:")) {
                try { save(ExportPolicy.dataUrl(url, "果粒橙作品")); }
                catch (IllegalArgumentException ex) { toast("作品暂时没保存好，再试试吧。"); }
            } else if (UrlPolicy.isExternalHttps(url)) openBrowser(url);
            else if (UrlPolicy.isOwn(url)) {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE)); }
                catch (ActivityNotFoundException ex) { toast("请大朋友帮忙打开浏览器保存作品。"); }
            }
        }
    }
    private void save(ExportPolicy.Payload payload) {
        if (pendingExport != null) { toast("先把上一幅作品保存好吧。"); return; }
        try { pendingExportFile = PendingExportStore.write(getCacheDir(), payload); }
        catch (Exception ex) { toast("作品暂时没保存好，稍后再试一次吧。"); return; }
        pendingExport = payload;
        Intent chooser = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                .setType(payload.mime).putExtra(Intent.EXTRA_TITLE, payload.name);
        try { startActivityForResult(chooser, SAVE_WORK); }
        catch (ActivityNotFoundException ex) { pendingExport = null; pendingExportFile.delete(); pendingExportFile = null; toast("保存窗口还没准备好，作品可以先放进小画廊。"); }
    }
    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != SAVE_WORK) return;
        final ExportPolicy.Payload payload = pendingExport; pendingExport = null;
        final File cached = pendingExportFile; pendingExportFile = null;
        if (resultCode != RESULT_OK || data == null || data.getData() == null) { if (cached != null) cached.delete(); return; }
        if (payload == null) { if (cached != null) cached.delete(); toast("刚才的作品暂时没保存好，请回到画作再保存一次。"); return; }
        final Uri destination = data.getData();
        new Thread(() -> {
            try (OutputStream out = getContentResolver().openOutputStream(destination, "w")) {
                if (out == null) throw new java.io.IOException("No save destination");
                out.write(payload.bytes); out.flush(); handler.post(() -> { if (!destroyed) toast("作品已经保存好啦！"); });
            } catch (Exception ex) { handler.post(() -> { if (!destroyed) toast("作品暂时没保存好，继续画一画，稍后再试吧。"); }); }
            finally { if (cached != null) cached.delete(); }
        }, "save-kids-artwork").start();
    }

    @Override public void onBackPressed() {
        if (UrlPolicy.isOwn(web.getUrl()) && loaded && !pageError) {
            web.evaluateJavascript("(function(){if(window.state){if(window.state.page === 'home')return 'home';if(typeof window.back === 'function'){window.back();return 'handled';}}return 'document';})()", result -> {
                if (destroyed || "\"handled\"".equals(result)) return;
                if ("\"home\"".equals(result)) confirmExit(); else nativeBack();
            });
        } else nativeBack();
    }
    private void nativeBack() {
        if (web.canGoBack()) { web.goBack(); return; }
        confirmExit();
    }
    private void confirmExit() {
        new AlertDialog.Builder(this).setTitle("要先休息一下吗？").setMessage("下次再来学习、听故事、画画吧。")
                .setNegativeButton("继续玩", null).setPositiveButton("退出", (dialog, which) -> finish()).show();
    }
    @Override protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out); web.saveState(out);
        if (pendingExport != null && pendingExportFile != null) {
            out.putString("gc.export.file", pendingExportFile.getName());
            out.putString("gc.export.mime", pendingExport.mime); out.putString("gc.export.name", pendingExport.name);
        }
    }
    @Override protected void onPause() {
        if (web != null) {
            pausedWithPage = loaded && !pageError;
            if (pausedWithPage) web.evaluateJavascript("(function(){if(window.state && window.state.page === 'reader'){window.state.readerAuto=false;window.state.readerPaused=false;}if(window.stopAudio)window.stopAudio();if(window.stopInteractiveGame)window.stopInteractiveGame();})()", null);
            web.onPause(); web.pauseTimers();
        }
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (updater != null) updater.onResume();
        if (web != null) {
            web.onResume(); web.resumeTimers();
            // The legacy coloring canvas lives in its current DOM; rendering it would erase paint.
            if (pausedWithPage && UrlPolicy.isOwn(web.getUrl())) web.evaluateJavascript("if(window.render && (!window.state || window.state.page !== 'coloring'))window.render();", null);
            pausedWithPage = false;
        }
    }
    @Override protected void onDestroy() {
        destroyed = true; handler.removeCallbacksAndMessages(null); closeExportPort(); pendingExport = null;
        if (updater != null) updater.onDestroy();
        if (web != null) { web.stopLoading(); web.setWebChromeClient(null); web.setWebViewClient(null); web.destroy(); }
        super.onDestroy();
    }
}

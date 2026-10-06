package cn.leyman.guolicheng;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;
import android.webkit.WebView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

/** An adult-triggered update flow. Games remain entirely playable without a connection. */
final class AppUpdater {
    private static final String LOG_TAG = "GuolichengUpdater";
    private static final String MIME = "application/vnd.android.package-archive";
    private static final String PREFS = "app-updater";
    private final Activity activity;
    private final WebView web;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final SharedPreferences prefs;
    private final DownloadManager downloads;
    private Candidate available;
    private AlertDialog progress;
    private boolean destroyed, checking, verifying, waitingForPermission, installLaunched;
    private final Runnable pollTask = this::poll;

    private static final class Candidate {
        final int code;
        final String title, url, digest;
        final long size;
        Candidate(int code, String title, String url, String digest, long size) {
            this.code = code; this.title = title; this.url = url; this.digest = digest; this.size = size;
        }
    }

    AppUpdater(Activity activity, WebView web) {
        this.activity = activity; this.web = web;
        prefs = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        downloads = (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
        restorePending();
    }

    private int installedCode() {
        try { return activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0).versionCode; }
        catch (PackageManager.NameNotFoundException ex) { return 0; }
    }
    private void tell(String message) { Toast.makeText(activity, message, Toast.LENGTH_LONG).show(); }
    void showBadge() {
        if (available != null && available.code > installedCode())
            web.evaluateJavascript("document.getElementById('appUpdateBtn')?.classList.add('has-update')", null);
    }

    void check(boolean manual) {
        if (destroyed || checking) return;
        if (pendingId() > 0) {
            if (prefs.getBoolean("verified", false)) offerInstall();
            else { if (manual) showProgress(); poll(); }
            return;
        }
        if (!manual && System.currentTimeMillis() - prefs.getLong("lastCheck", 0) < 86400000L) {
            showBadge(); return;
        }
        checking = true;
        if (manual) tell("正在检查新版……");
        new Thread(() -> {
            Candidate found = null; String problem = null;
            try { found = fetchLatest(); }
            catch (Exception ex) { Log.w(LOG_TAG, "Update check failed", ex); problem = "现在查不到新版，请连网后再试。"; }
            final Candidate result = found; final String error = problem;
            handler.post(() -> {
                if (destroyed) return;
                checking = false;
                if (error != null) { if (manual) tell(error); return; }
                prefs.edit().putLong("lastCheck", System.currentTimeMillis()).apply();
                available = result;
                if (result != null) { showBadge(); if (manual) offerDownload(result); }
                else if (manual) new AlertDialog.Builder(activity).setTitle("已经是最新版")
                        .setMessage("果粒橙学习乐园已经是最新版本，可以继续玩啦。")
                        .setPositiveButton("好", null).show();
            });
        }, "check-kids-app-update").start();
    }

    private Candidate fetchLatest() throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(UpdatePolicy.RELEASE_FEED).openConnection();
        connection.setConnectTimeout(12000); connection.setReadTimeout(12000);
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("Cache-Control", "no-cache");
        connection.setRequestProperty("User-Agent", "GuolichengTablet-Updater");
        try {
            if (connection.getResponseCode() == 404) return null;
            if (connection.getResponseCode() != 200) throw new IOException("Update feed unavailable");
            byte[] bytes;
            try (InputStream input = connection.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[8192]; int count;
                while ((count = input.read(buffer)) != -1) {
                    if (out.size() + count > 1000000) throw new IOException("Update feed too large");
                    out.write(buffer, 0, count);
                }
                bytes = out.toByteArray();
            }
            JSONObject release = new JSONObject(new String(bytes, StandardCharsets.UTF_8));
            int code = UpdatePolicy.versionCode(release.optString("tag_name", ""));
            if (code < 0) throw new IOException("Unexpected release tag");
            if (code <= installedCode()) return null;
            JSONArray assets = release.optJSONArray("assets");
            if (assets == null) throw new IOException("Missing APK");
            for (int index = 0; index < assets.length(); index++) {
                JSONObject asset = assets.optJSONObject(index);
                if (asset == null || !UpdatePolicy.ASSET_NAME.equals(asset.optString("name"))) continue;
                String url = asset.optString("browser_download_url", "");
                String digest = asset.optString("digest", "");
                long size = asset.optLong("size", 0);
                if (!UpdatePolicy.isTrusted(code, installedCode(), url, digest, size)) throw new IOException("Unverified APK");
                String title = release.optString("name", "新版");
                return new Candidate(code, title.length() > 48 ? title.substring(0, 48) : title, url, digest, size);
            }
            throw new IOException("Missing APK");
        } finally { connection.disconnect(); }
    }

    private void offerDownload(Candidate candidate) {
        new AlertDialog.Builder(activity).setTitle("发现新版本")
                .setMessage(candidate.title + " 已经准备好了（约 "
                        + String.format(Locale.CHINA, "%.0f", candidate.size / 1000000.0) + " MB）。\n"
                        + "点“在平板上更新”后，程序会自己下载；下载完成仍需您在安卓安装窗口确认一次。")
                .setNegativeButton("以后再说", null)
                .setPositiveButton("在平板上更新", (dialog, which) -> startDownload(candidate)).show();
    }

    private String fileName(int code) { return "guolicheng-android-v" + code + ".apk"; }
    private File updateFile(int code) {
        File directory = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        return directory == null ? null : new File(directory, fileName(code));
    }
    private long pendingId() { return prefs.getLong("downloadId", -1L); }
    private void store(Candidate candidate, long id) {
        prefs.edit().putLong("downloadId", id).putInt("code", candidate.code)
                .putString("title", candidate.title).putString("url", candidate.url)
                .putString("digest", candidate.digest).putLong("size", candidate.size)
                .putBoolean("verified", false).apply();
    }
    private void restorePending() {
        long id = pendingId(); if (id <= 0) return;
        int code = prefs.getInt("code", 0);
        String url = prefs.getString("url", ""), digest = prefs.getString("digest", "");
        long size = prefs.getLong("size", 0);
        if (!UpdatePolicy.isTrusted(code, installedCode(), url, digest, size)) { clearPending(); return; }
        available = new Candidate(code, prefs.getString("title", "新版"), url, digest, size);
    }
    private void clearPending() {
        long id = pendingId(); if (id > 0) downloads.remove(id);
        int code = prefs.getInt("code", 0); File file = updateFile(code);
        if (file != null && file.exists()) file.delete();
        prefs.edit().remove("downloadId").remove("code").remove("title")
                .remove("url").remove("digest").remove("size").remove("verified").apply();
        handler.removeCallbacks(pollTask);
        if (progress != null) { progress.dismiss(); progress = null; }
    }

    private void startDownload(Candidate candidate) {
        try {
            File file = updateFile(candidate.code);
            if (file == null) throw new IOException("No download directory");
            if (file.exists() && !file.delete()) throw new IOException("Old update cannot be removed");
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(candidate.url));
            request.setTitle("果粒橙学习乐园更新").setDescription("正在下载新版，游戏仍可离线玩")
                    .setMimeType(MIME).setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    .setDestinationInExternalFilesDir(activity, Environment.DIRECTORY_DOWNLOADS, fileName(candidate.code));
            long id = downloads.enqueue(request);
            available = candidate; store(candidate, id); installLaunched = false;
            showProgress(); poll();
        } catch (Exception ex) { tell("暂时不能下载更新，请检查平板存储空间和网络。"); }
    }
    private void showProgress() {
        if (progress != null && progress.isShowing()) return;
        progress = new AlertDialog.Builder(activity).setTitle("正在下载新版")
                .setMessage("下载完成后会请您确认安装。期间可以继续玩。")
                .setNegativeButton("取消下载", (dialog, which) -> clearPending()).create();
        progress.show();
    }
    private void poll() {
        if (destroyed || pendingId() <= 0 || verifying || installLaunched) return;
        handler.removeCallbacks(pollTask);
        try (Cursor cursor = downloads.query(new DownloadManager.Query().setFilterById(pendingId()))) {
            if (cursor == null || !cursor.moveToFirst()) { clearPending(); tell("下载没有完成，请稍后重试。"); return; }
            int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            if (status == DownloadManager.STATUS_SUCCESSFUL) { verifyDownload(); return; }
            if (status == DownloadManager.STATUS_FAILED) { clearPending(); tell("下载没有成功，连网后再试一次吧。"); return; }
            long done = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
            long total = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
            if (progress != null && progress.isShowing() && total > 0)
                progress.setMessage("已经下载 " + Math.min(100, done * 100 / total) + "% 。下载完成后会请您确认安装。");
            handler.postDelayed(pollTask, 1200);
        } catch (Exception ex) { handler.postDelayed(pollTask, 2500); }
    }
    private void verifyDownload() {
        if (available == null || verifying) return;
        if (prefs.getBoolean("verified", false)) { if (progress != null) { progress.dismiss(); progress = null; } offerInstall(); return; }
        verifying = true;
        if (progress != null && progress.isShowing()) progress.setMessage("下载好了，正在核对安装包……");
        final Candidate candidate = available;
        new Thread(() -> {
            String problem = null;
            try {
                Uri uri = downloads.getUriForDownloadedFile(pendingId());
                if (uri == null) throw new IOException("Missing download URI");
                String hash;
                try (InputStream input = activity.getContentResolver().openInputStream(uri)) {
                    if (input == null) throw new IOException("Cannot read APK");
                    hash = UpdatePolicy.sha256(input);
                }
                if (!hash.equalsIgnoreCase(candidate.digest.substring(7))) throw new IOException("APK hash mismatch");
                File file = updateFile(candidate.code);
                if (file == null) throw new IOException("Missing APK path");
                PackageManager pm = activity.getPackageManager();
                PackageInfo archive = pm.getPackageArchiveInfo(file.getAbsolutePath(), PackageManager.GET_SIGNATURES);
                PackageInfo installed = pm.getPackageInfo(activity.getPackageName(), PackageManager.GET_SIGNATURES);
                if (archive == null || !activity.getPackageName().equals(archive.packageName)
                        || archive.versionCode != candidate.code || archive.signatures == null || archive.signatures.length != 1
                        || installed.signatures == null || installed.signatures.length != 1
                        || !MessageDigest.isEqual(archive.signatures[0].toByteArray(), installed.signatures[0].toByteArray()))
                    throw new IOException("Wrong application or signing key");
            } catch (Exception ex) { problem = "安装包校验没有通过，请重新下载。"; }
            final String error = problem;
            handler.post(() -> {
                if (destroyed) return;
                verifying = false;
                if (error != null) { clearPending(); tell(error); return; }
                prefs.edit().putBoolean("verified", true).apply();
                if (progress != null) { progress.dismiss(); progress = null; }
                offerInstall();
            });
        }, "verify-kids-app-update").start();
    }
    private void offerInstall() {
        if (available == null || installLaunched) return;
        new AlertDialog.Builder(activity).setTitle("新版已下载")
                .setMessage("安装后会保留这台平板上的学习记录和公主搭配。请在系统安装窗口点“更新”。")
                .setNegativeButton("稍后", null).setPositiveButton("现在安装", (dialog, which) -> install()).show();
    }
    private void install() {
        if (!activity.getPackageManager().canRequestPackageInstalls()) {
            waitingForPermission = true;
            new AlertDialog.Builder(activity).setTitle("允许这台平板安装更新")
                    .setMessage("安卓需要您为果粒橙学习乐园开启一次“允许安装应用”。返回后会继续安装。")
                    .setNegativeButton("稍后", (dialog, which) -> waitingForPermission = false)
                    .setPositiveButton("去开启", (dialog, which) -> {
                        try { activity.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                                Uri.parse("package:" + activity.getPackageName()))); }
                        catch (ActivityNotFoundException ex) { waitingForPermission = false; tell("请在系统设置里允许果粒橙学习乐园安装应用。"); }
                    }).show();
            return;
        }
        Uri uri = downloads.getUriForDownloadedFile(pendingId());
        if (uri == null) { clearPending(); tell("安装包找不到了，请重新下载。"); return; }
        Intent intent = new Intent(Intent.ACTION_INSTALL_PACKAGE).setDataAndType(uri, MIME)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try { installLaunched = true; activity.startActivity(intent); }
        catch (ActivityNotFoundException ex) { installLaunched = false; tell("平板上找不到系统安装程序。"); }
    }
    void onResume() {
        if (destroyed) return;
        if (installLaunched && available != null && installedCode() < available.code) installLaunched = false;
        if (waitingForPermission && activity.getPackageManager().canRequestPackageInstalls()) {
            waitingForPermission = false; install(); return;
        }
        if (pendingId() > 0 && !installLaunched && !prefs.getBoolean("verified", false)) poll();
    }
    void onDestroy() {
        destroyed = true; handler.removeCallbacksAndMessages(null);
        if (progress != null) { progress.dismiss(); progress = null; }
    }
}

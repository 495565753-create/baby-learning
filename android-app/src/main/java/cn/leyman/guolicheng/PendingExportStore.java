package cn.leyman.guolicheng;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;

/** Private temporary bytes survive an Activity being reclaimed while the save picker is open. */
public final class PendingExportStore {
    private PendingExportStore() {}
    public static File write(File cache, ExportPolicy.Payload payload) throws IOException {
        File file = File.createTempFile("gc-export-", ".bin", cache);
        try (FileOutputStream out = new FileOutputStream(file)) { out.write(payload.bytes); out.getFD().sync(); }
        catch (IOException ex) { file.delete(); throw ex; }
        return file;
    }
    public static File file(File cache, String name) throws IOException {
        if (name == null || !name.matches("gc-export-[A-Za-z0-9-]+\\.bin")) throw new IOException("Invalid cache name");
        File file = new File(cache, name);
        if (!file.getCanonicalFile().getParentFile().equals(cache.getCanonicalFile())) throw new IOException("Invalid cache location");
        return file;
    }
    public static ExportPolicy.Payload read(File cache, String fileName, String mime, String name) throws IOException {
        File file = file(cache, fileName);
        if (file.length() <= 0 || file.length() > ExportPolicy.MAX_BYTES) throw new IOException("Invalid cache size");
        try (FileInputStream in = new FileInputStream(file); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192]; int n;
            while ((n = in.read(buffer)) != -1) { out.write(buffer, 0, n); if (out.size() > ExportPolicy.MAX_BYTES) throw new IOException("Invalid cache size"); }
            return ExportPolicy.fromBytes(mime, name, out.toByteArray());
        } catch (IllegalArgumentException ex) { throw new IOException("Invalid cached content", ex); }
    }
    public static void purgeOld(File cache, long now) {
        File[] files = cache.listFiles(); if (files == null) return;
        for (File candidate : files) if (candidate.getName().matches("gc-export-[A-Za-z0-9-]+\\.bin") && now - candidate.lastModified() > 86400000L) candidate.delete();
    }
}

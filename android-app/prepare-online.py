"""Generate online Android entry without modifying the preserved offline source."""
from pathlib import Path
import sys
project, build = map(Path, sys.argv[1:])
source = (project / 'src/main/java/cn/leyman/guolicheng/MainActivity.java').read_text()
source = source.replace('https://leyman.cn/offline/play.html', 'https://leyman.cn/')
start = source.index('            String url = request.getUrl().toString();', source.index('shouldInterceptRequest'))
end = source.index('\n        }', start)
source = source[:start] + '            return null; // HTTPS server provides every asset; never intercept with bundled files.' + source[end:]
source = source.replace('// Every page and asset is bundled in the APK. A cached page from an older\n        // installation can hide new games or point at asset names no longer bundled.', '// Online mode uses HTTPS and lets the server control cache freshness.')
source = source.replace('web.clearCache(true);', '// Keep immutable resource cache across launches.')
source = source.replace('WebSettings.LOAD_NO_CACHE', 'WebSettings.LOAD_DEFAULT')
source = source.replace('GuolichengTablet/2.3.2-Offline', 'GuolichengTablet/3.0.0-Online')
source = source.replace('handler.postDelayed(() -> { if (!destroyed) updater.check(false); }, 5000);', '// Website updates are served at the same HTTPS origin.')
source = source.replace('if (updater != null) updater.showBadge();', '')
(build / 'online-MainActivity.java').write_text(source)
target = build / 'online-src/cn/leyman/guolicheng/MainActivity.java'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(source)
manifest = (project / 'src/main/AndroidManifest.xml').read_text()
manifest = manifest.replace('versionCode="7"', 'versionCode="8"').replace('versionName="2.3.2-offline"', 'versionName="3.0.0-online"')
(build / 'online-manifest.xml').write_text(manifest)

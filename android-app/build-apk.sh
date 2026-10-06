#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")" && pwd)"
site_dir="$(cd "$project_dir/.." && pwd)"
tool_root="${GC_TOOL_ROOT:-$HOME/Desktop/deepseek/tools}"
sdk_dir="${GC_ANDROID_SDK:-$tool_root/android-sdk}"
jdk_dir="${GC_JDK:-$tool_root/jdk-17.0.20.1+1/Contents/Home}"
private_dir="${GC_PRIVATE_DIR:-$HOME/edu-app-backups/20261004-xiaomi-tablet}"
output_dir="${GC_OUTPUT_DIR:-$HOME/Documents/ChatGPT/果粒橙程序/安装包}"
build_dir="$private_dir/build"
tools_dir="$sdk_dir/build-tools/34.0.0"
platform_jar="$sdk_dir/platforms/android-34/android.jar"
for file in "$jdk_dir/bin/javac" "$platform_jar" "$tools_dir/aapt2" "$tools_dir/zipalign" "$tools_dir/lib/d8.jar" "$tools_dir/lib/apksigner.jar"; do
    if [[ ! -f "$file" ]]; then printf '缺少已有构建工具：%s\n' "$file" >&2; exit 1; fi
done
if [[ ! -s "$sdk_dir/licenses/android-sdk-license" ]]; then
    printf '未发现已有 SDK 许可记录；此脚本不会自动同意许可证或安装 SDK。\n' >&2; exit 1
fi
umask 077
mkdir -p "$private_dir" "$output_dir" "$build_dir/classes" "$build_dir/gen" "$build_dir/dex"
python3 - "$build_dir" <<'PY'
from pathlib import Path
import shutil, sys
build = Path(sys.argv[1])
for name in ['classes', 'gen', 'dex', 'site-assets']:
    shutil.rmtree(build / name, ignore_errors=True)
    (build / name).mkdir()
PY
rm -f "$build_dir/classes.jar" "$build_dir/resources.apk" "$build_dir/unsigned.apk" "$build_dir/aligned.apk" "$build_dir/compiled.zip" "$build_dir/dex/classes.dex"
python3 - "$site_dir" "$project_dir" "$build_dir/site-assets" <<'PY'
from pathlib import Path
import hashlib, json, os, shutil, sys
site, project, destination = map(Path, sys.argv[1:])
manifest = json.loads((site / 'offline/assets.json').read_text())
for record in manifest['files']:
    relative = record['url'].removeprefix('/')
    if not relative or '..' in Path(relative).parts or not all(part and part.replace('_','').replace('-','').replace('.','').isalnum() for part in Path(relative).parts):
        raise ValueError(f'Unsafe asset: {relative}')
    source = site / relative
    if source.stat().st_size != record['bytes'] or hashlib.sha256(source.read_bytes()).hexdigest() != record['sha256']:
        raise ValueError(f'Offline asset differs from manifest: {relative}')
    target = destination / 'site' / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    try: os.link(source, target)
    except OSError: shutil.copy2(source, target)
shutil.copy2(project / 'src/main/assets/web-export.js', destination / 'web-export.js')
print(f"Packaged {len(manifest['files'])} verified offline files into the Android app")
PY
"$tools_dir/aapt2" compile --dir "$project_dir/src/main/res" -o "$build_dir/compiled.zip"
"$tools_dir/aapt2" link -I "$platform_jar" --manifest "$project_dir/src/main/AndroidManifest.xml" \
    --java "$build_dir/gen" -A "$build_dir/site-assets" -o "$build_dir/resources.apk" "$build_dir/compiled.zip"
python3 - "$project_dir" "$build_dir" <<'PY'
from pathlib import Path
import sys
project, build = map(Path, sys.argv[1:])
with (build / 'sources.txt').open('w') as out:
    for base in [project / 'src/main/java', build / 'gen']:
        for file in sorted(base.rglob('*.java')): out.write('"' + str(file) + '"\n')
PY
"$jdk_dir/bin/javac" --release 8 -encoding UTF-8 -classpath "$platform_jar" -d "$build_dir/classes" "@$build_dir/sources.txt"
"$jdk_dir/bin/jar" cf "$build_dir/classes.jar" -C "$build_dir/classes" .
"$jdk_dir/bin/java" -classpath "$tools_dir/lib/d8.jar" com.android.tools.r8.D8 --release --min-api 26 \
    --lib "$platform_jar" --output "$build_dir/dex" "$build_dir/classes.jar"
cp "$build_dir/resources.apk" "$build_dir/unsigned.apk"
(cd "$build_dir/dex" && zip -q "$build_dir/unsigned.apk" classes.dex)
"$tools_dir/zipalign" -f 4 "$build_dir/unsigned.apk" "$build_dir/aligned.apk"
keystore_file="$private_dir/guolicheng-release.p12"
password_file="$private_dir/signing-password.txt"
if [[ ! -f "$keystore_file" ]]; then
    if [[ ! -f "$password_file" ]]; then
        python3 - "$password_file" <<'PY'
import secrets, sys
from pathlib import Path
Path(sys.argv[1]).write_text(secrets.token_urlsafe(36) + '\n')
PY
    fi
    "$jdk_dir/bin/keytool" -genkeypair -keystore "$keystore_file" -storetype PKCS12 \
        -storepass:file "$password_file" -alias guolicheng-release -keyalg RSA -keysize 3072 \
        -validity 10000 -dname 'CN=Guolicheng Learning, O=Family Learning, C=CN' >/dev/null
fi
if [[ ! -f "$password_file" ]]; then printf '签名密码文件缺失，停止；不会换签名覆盖既有应用。\n' >&2; exit 1; fi
apk="$output_dir/果粒橙学习乐园-安卓平板-离线版-v2.0.0.apk"
"$jdk_dir/bin/java" -jar "$tools_dir/lib/apksigner.jar" sign --ks "$keystore_file" \
    --ks-key-alias guolicheng-release --ks-pass "file:$password_file" \
    --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --v4-signing-enabled false \
    --out "$apk" "$build_dir/aligned.apk"
"$jdk_dir/bin/java" -jar "$tools_dir/lib/apksigner.jar" verify --verbose --print-certs "$apk" | tee "$private_dir/signature-verification.txt"
"$tools_dir/zipalign" -c -v 4 "$apk" > "$private_dir/zipalign-verification.txt"
"$tools_dir/aapt2" dump badging "$apk" > "$private_dir/apk-manifest-badging.txt"
"$tools_dir/aapt2" dump permissions "$apk" > "$private_dir/apk-permissions.txt"
shasum -a 256 "$apk" > "$private_dir/apk-sha256.txt"
chmod 644 "$apk"
printf '安装包已生成并通过签名及对齐检查：%s\n' "$apk"

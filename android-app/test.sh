#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")" && pwd)"
jdk_dir="${GC_JDK:-$HOME/Desktop/deepseek/tools/jdk-17.0.20.1+1/Contents/Home}"
private_dir="${GC_PRIVATE_DIR:-$HOME/edu-app-backups/20261004-xiaomi-tablet}"
mkdir -p "$private_dir/policy-tests"
"$jdk_dir/bin/javac" --release 8 -encoding UTF-8 -d "$private_dir/policy-tests" \
    "$project_dir/src/main/java/cn/leyman/guolicheng/UrlPolicy.java" \
    "$project_dir/src/main/java/cn/leyman/guolicheng/LocalAssetPolicy.java" \
    "$project_dir/src/main/java/cn/leyman/guolicheng/ExportPolicy.java" \
    "$project_dir/src/main/java/cn/leyman/guolicheng/UpdatePolicy.java" \
    "$project_dir/src/main/java/cn/leyman/guolicheng/PendingExportStore.java" "$project_dir/tests/PolicyTest.java"
"$jdk_dir/bin/java" -cp "$private_dir/policy-tests" cn.leyman.guolicheng.PolicyTest "$private_dir/policy-cache"
node --test "$project_dir/tests/"*.test.cjs

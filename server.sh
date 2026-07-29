#!/bin/bash
cd /Users/guoju/edu-app
echo "📚 宝宝启蒙学习启动中..."
echo "地址: http://localhost:8888"
echo "按 Ctrl+C 停止"
python3 -m http.server 8888

# 2026-10-02 插图更新

本套资源包含原有82本与新增12本故事，共94本、454页。`manifest.json`记录每一页的文件路径、尺寸与SHA-256。认知模块另有20类、240项，资源见`assets/recognition-v1`。

故事插图使用内置`image_gen`生成，再按固定网格拆成单页WebP。`prompts-peppa.json`、`prompts-rest.json`和`prompts-extra-dino.json`保留实际生成提示词。旧版插图保留，运行时由`story-art-map.js`接入新版；正文与封面都使用同一套新图。人物、情节顺序、网格及关键数量均需检查后才能纳入发布。

生成图的实际分隔线有时略偏离等分位置；拆图程序会识别窄白色分隔线，按每本书的实际边界裁切并去掉分隔线，避免上一页混进下一幅画面的细条。部分新增公主故事的人物版画面被生成服务拒绝，采用同主题的环境与关键物件插图替代，具体见生成提示词和质量记录。

原始PNG、失败重试记录和含本机路径的生成结果保存在项目外的本次备份目录，避免部署无用大文件或本机路径。拆图依赖Pillow和NumPy。重建时运行`python3 build_story_art.py --records-dir <本地备份的源记录目录>`。认知图集可用`python3 build_recognition_assets.py --source-records <本地generated-final.json>`重新编码；不传源记录时保留现有图片并重建精确的颜色、数量图片及封面。

新增录音使用微软晓晓女声，语速减慢8%，不改变音高。认知卡、问题和夸奖共490条，新增故事72条；旧故事的5页安全表述另有对应重配。音频为静态MP3，浏览器按点击播放，无需孩子等待在线合成。`tests/content-assets.test.cjs`验证正文、录音映射和插图文件完整性；`tests/recognition.test.cjs`验证每日学习、反馈播放顺序与退出行为。

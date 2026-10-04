# 新增手机益智挑战的设计参考

调研日期：2026-10-04。以下 GitHub 仓库及其许可证已打开核对。这次新增游戏全部为本项目原创实现，未复制这些仓库的代码、图片、音乐或文字，不引入第三方运行依赖。

| GitHub 项目 | 已核验许可证 | 参考的通用设计思路 | 本项目改编 |
| --- | --- | --- | --- |
| [Blockly Games](https://github.com/blockly-games/blockly-games) / [LICENSE](https://github.com/blockly-games/blockly-games/blob/master/LICENSE) | Apache-2.0 | 先规划路径，再运行并观察结果的渐进任务 | 用手指直接画格子路径、绕石头、收星星，替代复杂的代码积木；3 个难度，无计时处罚 |
| [Classic Puzzle Maker](https://github.com/krishealty/puzzle) / [LICENSE](https://github.com/krishealty/puzzle/blob/main/LICENSE) | MIT | 通过合法移动空格打乱，保证滑块可解 | 2×2 入门、3×3 进阶与挑战；拖动/点选均可；撤回及原创 A* 一步提示 |
| [d4vucat/Simon-Game](https://github.com/d4vucat/Simon-Game) / [LICENSE](https://github.com/d4vucat/Simon-Game/blob/main/LICENSE) | MIT，2025 Ngô Hữu Lộc | 先演示灯光顺序，再输入同样顺序，逐步增加记忆长度 | 3、4、6 步；错误可重看，无严格失败；颜色同时用图案和名称区分 |

花园逻辑方格使用通用拉丁方“每行每列不重复”规则，原创 2×2 / 3×3 / 4×4 关卡；固定提示不改动、可拖动/点选、撤回与约束搜索提示。只要满足规则与固定提示便可过关，不限定某一种有效答案。

游戏接口：`kids-challenge-games.js` 在原 `kids-new-games.js` 后加载，透明扩展 `window.NEW_GAMES`，旧 6 款继续由原模块处理；四款新游戏独立测试入口为 `window.CHALLENGE_GAMES`。

语音：独立女声资产与映射；帮助、错误引导、完成鼓励使用 Microsoft 晓晓中文神经女声（语速 -8%、原音高）。不修改旧 `voice-map.js`。

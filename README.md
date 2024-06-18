<img src="./public/static/logo/logo.png" align="right" width="128" height="128"/>

# Sparks NMN (Desktop)

**简体中文** | [English](./README-en.md)

使用文本高效地编写简谱！

[官方网站](https://notation.sparkslab.art/) · [在线试玩](https://notation.sparkslab.art/playground/) · [内核项目](https://github.com/yezhiyi9670/sparks-nmn-dev) · [赞助](https://notation.sparkslab.art/donate/)

> 由于数字简谱在英语国家中似乎并不常用，此项目还没有将英语添加为显示语言的计划（但是有英文歌词的支持）。

Sparks NMN 是一个基于文本的简谱（Numbered Music Notation）制作语言，其设计灵感和语法经过长期实践而形成，具有简洁、自然、易读且高效的特点。

```plain
P: 1=C 4/4
Rp: font_lyrics=Roman,CommonSerif/600/0.95
===
N: X X (XX) X | (XX) (XX) X 0 | (XX) (XX) (XX) X | (XX) (XX) X 0 |
Lc[1.]: 门前大桥下，游过一群鸭。快来快来数一数，二四六七八。
---
N: &lpr; (1e.(1e)) (55) (36) (53) | (21) (23) 1 - &rpr; |
---
N: ||: 3 1 (33) 1 | (33) (56) 5 - | (66) (65) (44) 4 | (23) (21) 2 - |
Lc[1.]: 门前大桥下，游过一群鸭。快来快来数一数，二四六七八。
Lc[2.]: 赶鸭老爷爷，胡子白花花。唱呀唱着家乡戏，还会说笑话。
---
N: 3 (10) 3 (10) | (33) (56) 6 - | 1e (55) 6 3 | (2^1^) (2^3^) 5 - | 1e (55) 6 3 | (2^1^) (2^3^) 1 - :||
Lc[1.]: 咕嘎咕嘎，真呀真多鸭，数不清到底多%少%鸭，数不清到底多%少%鸭。
Lc[2.]: 小孩小孩，快快上学校，别考个鸭蛋抱%回%家，别考个鸭蛋抱%回%家。
```

Sparks NMN Desktop 是 Sparks NMN 的桌面版本，允许用户安全地在离线环境下使用，并根据自己的喜好调节设置。

## 这不是内核项目

此仓库不是 Sparks NMN 内核的开发仓库。要报告问题，请前往内核项目的仓库。

## 使用源代码构建

此项目的源代码应当使用 `npm` 或 `yarn` 构建。

- 测试应用：`npm run start` 或 `yarn start`
- 生成：`npm run package` 或 `yarn package`
- 生成并打包：`npm run make` 或 `yarn make`

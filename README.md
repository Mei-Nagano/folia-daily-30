# folia-daily-30

每天自动记录 QQ 音乐「每日30首」和网易云音乐「每日推荐」的 Folia 模组。按日期回看、搜索，并把某天的歌单放进播放队列；只记录歌单元数据，不下载音频。

模组源码在 [`daily-30/`](daily-30/)，安装包见 [Releases](https://github.com/Mei-Nagano/folia-daily-30/releases)。

## 功能

- 每天按北京时间检查两个平台的每日推荐；网易云 6 点前记前一天。
- QQ 音乐通过 Folia 桌面版自带的 `qq-music-api` 读取；网易云通过 Folium 的 `platform.raw` 读取。
- 记录保存在 Folia 用户目录的 `mods-data/daily-30/files/archive`，支持按日期回看、全文搜索、导出 JSON 和播放。
- QQ 0–2 点如果返回的仍是昨天同一份列表，会先跳过，等列表真正换掉再记录。

## 安装

1. 在 Folia 的模组面板安装 `daily-30-1.0.0.zip`，或把 `daily-30/` 复制到用户模组目录。
2. 打开模组系统，启用「每日30首」。
3. 在 Folia 里登录 QQ 音乐和/或网易云音乐，打开首页的「每日30」标签。

详见 [`daily-30/README.md`](daily-30/README.md)。

## 许可

[AGPL-3.0](LICENSE)。

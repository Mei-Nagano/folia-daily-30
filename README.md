# folia-daily-30

每天自动记录网易云音乐「每日推荐」的 Folia 模组。按日期回看、搜索，并把某天的歌单放进播放队列；只记录歌单元数据，不下载音频。

模组源码在 [`daily-30/`](daily-30/)，安装包见 [Releases](https://github.com/Mei-Nagano/folia-daily-30/releases)。

> 1.0.1 起只记录网易云音乐。1.0.0 读取宿主自己的 QQ 登录会话去调本机 QQ 后端，被 folium-compound 审查指出不符合模组规范（[issue #89](https://github.com/chthollyphile/folium-compound/issues/89)），这一路已整体移除。

## 功能

- 每天按北京时间检查网易云音乐的「每日推荐」；6 点前记前一天。
- 全部通过 Folium 的 `platform.raw` 读取，会话由宿主补上，模组看不到 cookie。
- 记录保存在 Folia 用户目录的 `mods-data/daily-30/files/archive`，支持按日期回看、全文搜索、导出 JSON 和播放。
- 还能尝试从服务器的「历史日推」补回最近几次（需要黑胶 VIP，最多 5 天）。

## 安装

1. 在 Folia 的模组面板安装 `daily-30-1.0.1.zip`，或把 `daily-30/` 复制到用户模组目录。
2. 打开模组系统，启用「每日推荐」。
3. 在 Folia 里登录网易云音乐，打开首页的「每日推荐」标签。

详见 [`daily-30/README.md`](daily-30/README.md)。

## 许可

[AGPL-3.0](LICENSE)。

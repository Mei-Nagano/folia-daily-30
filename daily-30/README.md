# 每日30首（daily-30）

每天自动记录 QQ 音乐「每日30首」和网易云音乐「每日推荐」，按日期回看、搜索，并把某一天的歌单放进播放队列。记录的是歌单信息（歌名、歌手、专辑、时长、封面），不下载音频。

## 使用

1. 在「设置 → 模组」打开模组系统，启用 `每日30首`。
2. 在 Folia 里登录 QQ 音乐和/或网易云音乐；登录后模组会自己开始记录。
3. 在首页导航末尾打开 `每日30`，或者用命令面板的「打开每日30首」。
4. 每天的歌单会自动检查；想立刻检查时点「立即记录」或运行「立即记录每日30首」命令。

## 它怎么取数据

- **QQ 音乐**：通过 Folia 自己的桌面版 QQ 后端（`qq-music-api`）读 `/user/daily-songs`。登录状态来自 Folia 的 QQ 账号，模组不保存 QQ 凭证；它从渲染进程的 `online_provider:qq:cookie` 读取那个不透明的 `qqmusic_session`，再通过宿主放行的 `net.fetch` 发给本机后端。
- **网易云音乐**：通过 Folium 1.7 的实验接口 `platform.raw` 读 `recommend_songs`，需要 `platform.netease.read`。会话由宿主补上，模组看不到 cookie。
- QQ 的每日30首在北京时间 0 点换；网易云的每日推荐在 6 点换，6 点前记的是前一天。刚过 0 点时，如果 QQ 返回的还是前一天同一份列表，这次会先跳过，等列表真正换掉再记。
- 网易云还会尝试从服务器的「历史日推」补回最近几次（需要黑胶 VIP，最多 5 天）；QQ 没有对应的历史路由，关掉 Folia 期间错过的日期补不回来。

## 数据

记录写在 Folia 的用户数据目录下：

```
<userData>/mods-data/daily-30/files/archive/
  index.json
  qq/YYYY-MM-DD.json
  netease/YYYY-MM-DD.json
```

首页的「导出 JSON」会把所有记录写一份到系统下载目录。

## 权限

- `filesystem.data`：写上面的记录文件。
- `net.fetch`：调用本机 QQ 后端。
- `playback.control`、`playback.queue`：把一天的歌放进队列并播放。
- `platform.netease.read` + 实验接口 `platform.raw`：读网易云的每日推荐和历史日推。

## 限制

- 模组只在 Folia 运行时检查；Folia 没开的日子不会自动补记（网易云能补回服务器还保留的 5 次，QQ 不能）。
- QQ 的取数依赖桌面版内嵌的 QQ 后端和渲染进程的登录键；网页版或没有 QQ 后端的环境会显示「QQ 后端未运行」。


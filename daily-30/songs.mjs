// mods/daily-30/songs.mjs
// One small, platform-neutral song record per entry: what the archive keeps and the list draws. The raw
// answers differ (QQ uses singer/album/interval, NetEase uses ar/al/dt), so each platform gets its own
// normalizer here and nothing downstream has to know which platform a record came from.

const text = (value) => (value === undefined || value === null ? '' : String(value).trim());

const positiveId = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? String(Math.trunc(number)) : '';
};

const coverUrl = (value) => {
    const url = text(value);
    if (!url) return '';
    return url.replace(/^http:/i, 'https:').split('?')[0];
};

const joinArtists = (list) => (
    Array.isArray(list)
        ? list.map((artist) => text(artist?.name)).filter(Boolean).join(' / ')
        : ''
);

export const normalizeQqSong = (raw) => {
    const mid = text(raw?.mid ?? raw?.songmid);
    const id = positiveId(raw?.id ?? raw?.songid) || mid;
    if (!id) return null;
    const album = raw?.album ?? {};
    const albumMid = text(album?.mid ?? raw?.albummid);
    const duration = Math.max(0, Math.round(Number(raw?.interval ?? raw?.duration) || 0));
    return {
        id,
        ...(mid ? { mid } : {}),
        name: text(raw?.name ?? raw?.title ?? raw?.songname) || 'Unknown',
        artist: joinArtists(raw?.singer ?? raw?.singers ?? raw?.artists),
        album: text(album?.name),
        ...(albumMid ? { albumMid } : {}),
        duration,
        cover: albumMid
            ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${encodeURIComponent(albumMid)}.jpg`
            : '',
    };
};

export const normalizeNeteaseSong = (raw) => {
    const id = positiveId(raw?.id);
    if (!id) return null;
    const album = raw?.al ?? raw?.album ?? {};
    const durationMs = Number(raw?.dt ?? raw?.duration) || 0;
    return {
        id,
        name: text(raw?.name ?? raw?.title) || 'Unknown',
        artist: joinArtists(raw?.ar ?? raw?.artists),
        album: text(album?.name),
        duration: Math.max(0, Math.round(durationMs / 1000)),
        cover: coverUrl(album?.picUrl),
    };
};

export const normalizeSongs = (rawSongs, normalize) => {
    const seen = new Set();
    const songs = [];
    for (const raw of Array.isArray(rawSongs) ? rawSongs : []) {
        const song = normalize(raw);
        if (!song || seen.has(song.id)) continue;
        seen.add(song.id);
        songs.push(song);
    }
    return songs;
};

export const sameSongs = (left, right) => {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((song, index) => String(song?.id) === String(right[index]?.id));
};

export const platformTitle = (platform) => (
    platform === 'netease' ? '网易云音乐每日推荐' : 'QQ 音乐每日30首'
);

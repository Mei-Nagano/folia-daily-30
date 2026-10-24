// mods/daily-30/sources.mjs
// Reads today's list from each platform. QQ Music goes through the local qq-music-api backend Folia
// already runs for its own QQ sign-in (the renderer keeps only an opaque session token); NetEase goes
// through the host's experimental platform.raw, which adds the signed-in session. Neither path touches
// an audio address or a raw platform credential.

import { normalizeNeteaseSong, normalizeQqSong, normalizeSongs } from './songs.mjs';

const QQ_SESSION_KEY = 'online_provider:qq:cookie';
const QQ_DAILY_PATH = '/user/daily-songs';

export class SourceError extends Error {
    constructor(code, message) {
        super(message || code);
        this.name = 'SourceError';
        this.code = code;
    }
}

export const errorCode = (error) => (
    typeof error?.code === 'string' ? error.code : 'unknown'
);

const readQqCookie = () => {
    try {
        return typeof localStorage === 'undefined' ? '' : localStorage.getItem(QQ_SESSION_KEY) || '';
    } catch {
        return '';
    }
};

const readQqPort = async () => {
    const getPort = typeof window === 'undefined' ? null : window.electron?.getQqPort;
    if (typeof getPort !== 'function') return 0;
    try {
        const port = await getPort();
        return Number.isSafeInteger(port) && port > 0 ? port : 0;
    } catch {
        return 0;
    }
};

const neteaseRaw = (folium) => {
    const raw = folium.experimental?.['platform.raw'];
    if (!raw) throw new SourceError('unsupported', 'Folium 没有提供 platform.raw');
    return raw;
};

const neteaseFailure = (error) => {
    const code = typeof error?.code === 'string' ? error.code : '';
    if (code === 'not-signed-in' || code === 'session-expired' || code === 'vip-required'
        || code === 'rate-limited' || code === 'unsupported' || code === 'network' || code === 'aborted') {
        return new SourceError(code, error.message);
    }
    return new SourceError('network', error instanceof Error ? error.message : String(error));
};

const neteaseBody = (body) => {
    const code = Number(body?.code);
    if (code === 301 || code === 302 || code === 401) throw new SourceError('session-expired', '网易云音乐登录已失效');
    if (code === 403) throw new SourceError('vip-required', '网易云音乐需要黑胶 VIP 才能读取历史推荐');
    if (code === 405) throw new SourceError('rate-limited', '网易云音乐请求过于频繁');
    return body?.data ?? body;
};

export const fetchQqDaily = async (folium) => {
    const cookie = readQqCookie();
    if (!cookie) throw new SourceError('not-signed-in', 'QQ 音乐未登录');
    const port = await readQqPort();
    if (!port) throw new SourceError('backend-unavailable', 'QQ 音乐内嵌后端没有运行');
    const query = `cookie=${encodeURIComponent(cookie)}&timestamp=${Date.now()}`;
    let response;
    try {
        response = await folium.net.fetch(`http://127.0.0.1:${port}${QQ_DAILY_PATH}?${query}`, { timeoutMs: 20000 });
    } catch (error) {
        throw new SourceError('network', error instanceof Error ? error.message : String(error));
    }
    if (response.status === 401) throw new SourceError('session-expired', 'QQ 音乐登录已失效');
    if (response.status === 404) throw new SourceError('backend-outdated', 'QQ 音乐内嵌后端版本过旧');
    if (response.status === 422) throw new SourceError('empty', 'QQ 音乐今天没有返回歌曲');
    if (response.status === 429) throw new SourceError('rate-limited', 'QQ 音乐请求过于频繁');
    if (!response.ok) throw new SourceError('network', `QQ 音乐请求失败（${response.status}）`);
    let body;
    try {
        body = response.json();
    } catch {
        throw new SourceError('network', 'QQ 音乐返回了无法读取的内容');
    }
    const rawSongs = Array.isArray(body?.songs) ? body.songs : Array.isArray(body?.data?.songs) ? body.data.songs : [];
    const songs = normalizeSongs(rawSongs, normalizeQqSong);
    if (!songs.length) throw new SourceError('empty', 'QQ 音乐今天没有返回歌曲');
    return { songs };
};

export const fetchNeteaseDaily = async (folium) => {
    const raw = neteaseRaw(folium);
    try {
        const description = raw.describe('netease');
        if (!description?.supported) throw new SourceError('unsupported', '网易云音乐原始接口不可用');
        const { body } = await raw.request('netease', 'recommend_songs', {});
        const data = neteaseBody(body);
        const rawSongs = Array.isArray(data?.dailySongs) ? data.dailySongs : Array.isArray(data?.songs) ? data.songs : [];
        const songs = normalizeSongs(rawSongs, normalizeNeteaseSong);
        if (!songs.length) throw new SourceError('empty', '网易云音乐今天没有返回歌曲');
        return { songs };
    } catch (error) {
        if (error instanceof SourceError) throw error;
        throw neteaseFailure(error);
    }
};

export const fetchNeteaseHistoryDates = async (folium) => {
    const raw = neteaseRaw(folium);
    try {
        const { body } = await raw.request('netease', 'history_recommend_songs', {});
        const data = neteaseBody(body);
        const dates = Array.isArray(data?.dates) ? data.dates : [];
        return [...new Set(dates
            .map((entry) => (typeof entry === 'string' ? entry : entry?.date))
            .filter((date) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)))]
            .sort()
            .reverse()
            .slice(0, 5);
    } catch (error) {
        if (error instanceof SourceError) throw error;
        throw neteaseFailure(error);
    }
};

export const fetchNeteaseHistoryDay = async (folium, date) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) throw new SourceError('unsupported', '日期格式不正确');
    const raw = neteaseRaw(folium);
    try {
        const { body } = await raw.request('netease', 'history_recommend_songs_detail', { date });
        const data = neteaseBody(body);
        const rawSongs = Array.isArray(data?.songs) ? data.songs : Array.isArray(data?.dailySongs) ? data.dailySongs : [];
        return normalizeSongs(rawSongs, normalizeNeteaseSong);
    } catch (error) {
        if (error instanceof SourceError) throw error;
        throw neteaseFailure(error);
    }
};

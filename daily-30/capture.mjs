// mods/daily-30/capture.mjs
// The recorder: fetches the enabled platforms' current lists, skips a QQ answer that is still yesterday's
// just after midnight, writes each day through the main entry, and fills NetEase's server-side history
// when the account is new to the archive. It also owns the timer and the "something changed" signal the
// home tab listens to.

import { errorCode, fetchNeteaseDaily, fetchQqDaily, SourceError } from './sources.mjs';
import { dateFor, isQqRolloverWindow, previousDate } from './dates.mjs';
import { platformTitle, sameSongs } from './songs.mjs';
import { createNeteaseBackfill } from './backfill.mjs';

const sourceOf = (platform) => (platform === 'netease' ? fetchNeteaseDaily : fetchQqDaily);

const errorMessage = (error) => (
    error instanceof Error ? error.message : String(error)
);

export const createCapture = ({ folium, settings }) => {
    const state = {
        running: false,
        lastRun: 0,
        lastError: null,
        results: {},
        lastBackfill: '',
    };
    const listeners = new Set();
    let current = null;
    let timer = null;
    let kickTimer = null;
    let retryTimer = null;
    let retries = 0;

    const notify = () => {
        for (const listener of [...listeners]) {
            try {
                listener();
            } catch (error) {
                folium.log.warn('[daily-30] a capture listener threw', error);
            }
        }
    };

    const save = async (platform, date, songs, extra = {}) => {
        const answer = await folium.rpc.call('archive.save', {
            platform,
            date,
            capturedAt: new Date().toISOString(),
            title: platformTitle(platform),
            songs,
            ...extra,
        });
        if (!answer?.ok) throw new SourceError('write', '无法写入每日30首记录');
        return answer;
    };

    const capturePlatform = async (platform) => {
        const account = folium.account?.getState?.(platform);
        if (platform === 'netease' && account?.status === 'signed-out') {
            throw new SourceError('not-signed-in', '网易云音乐未登录');
        }
        const now = new Date();
        const date = dateFor(platform, now);
        const data = await sourceOf(platform)(folium);
        const songs = data.songs;

        if (platform === 'qq' && isQqRolloverWindow(now)) {
            const yesterday = previousDate(date);
            try {
                const previous = await folium.rpc.call('archive.get', 'qq', yesterday);
                if (previous && sameSongs(previous.songs, songs)) {
                    state.results.qq = {
                        ok: true,
                        skipped: 'rollover',
                        date,
                        count: songs.length,
                        at: Date.now(),
                    };
                    return;
                }
            } catch {
                // A missing archive must not stop today's capture.
            }
        }

        const saved = await save(platform, date, songs);
        state.results[platform] = {
            ok: true,
            date,
            count: songs.length,
            changed: Boolean(saved.changed),
            at: Date.now(),
        };
        folium.log.info('[daily-30] captured', { platform, date, count: songs.length, changed: Boolean(saved.changed) });
    };

    const backfillNetease = createNeteaseBackfill({ folium, state, save });

    const captureAll = (reason = 'manual') => {
        if (current) return current;
        current = (async () => {
            state.running = true;
            state.lastError = null;
            notify();
            try {
                const values = settings.get();
                const platforms = [];
                if (values.captureQq !== false) platforms.push('qq');
                if (values.captureNetease !== false) platforms.push('netease');
                for (const platform of platforms) {
                    try {
                        await capturePlatform(platform);
                    } catch (error) {
                        state.results[platform] = {
                            ok: false,
                            code: errorCode(error),
                            message: errorMessage(error),
                            at: Date.now(),
                        };
                        folium.log.info('[daily-30] capture skipped', { platform, code: errorCode(error) });
                    }
                }
                if (values.backfillNetease !== false && values.captureNetease !== false) await backfillNetease();
            } catch (error) {
                state.lastError = { code: errorCode(error), message: errorMessage(error) };
                folium.log.error('[daily-30] capture failed', error);
            } finally {
                state.running = false;
                state.lastRun = Date.now();
                current = null;
                notify();
                scheduleRetry();
                folium.log.info('[daily-30] capture finished', { reason, results: state.results });
            }
        })();
        return current;
    };

    const intervalMs = () => {
        const minutes = Number(settings.get().intervalMinutes);
        return (Number.isFinite(minutes) ? Math.min(240, Math.max(5, minutes)) : 30) * 60 * 1000;
    };

    const clearTimers = () => {
        if (timer) clearInterval(timer);
        if (kickTimer) clearTimeout(kickTimer);
        if (retryTimer) clearTimeout(retryTimer);
        timer = null;
        kickTimer = null;
        retryTimer = null;
    };

    const scheduleRetry = () => {
        const retryable = Object.values(state.results).some((result) => (
            result && result.ok === false && (result.code === 'backend-unavailable' || result.code === 'network')
        ));
        if (!retryable) {
            retries = 0;
            return;
        }
        if (!settings.get().autoCapture || retries >= 3) return;
        retries += 1;
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = setTimeout(() => {
            retryTimer = null;
            void captureAll('retry');
        }, 60_000);
    };

    const schedule = () => {
        clearTimers();
        retries = 0;
        if (!settings.get().autoCapture) return;
        kickTimer = setTimeout(() => {
            kickTimer = null;
            void captureAll('startup');
        }, 4000);
        timer = setInterval(() => { void captureAll('interval'); }, intervalMs());
    };

    const kick = (delay = 4000) => {
        if (!settings.get().autoCapture) return;
        if (kickTimer) clearTimeout(kickTimer);
        kickTimer = setTimeout(() => {
            kickTimer = null;
            void captureAll('account');
        }, delay);
    };

    const start = () => {
        schedule();
        const offSettings = settings.onChange?.(() => schedule());
        const offAccount = folium.events.on('account.changed', (account) => {
            if (account?.status === 'signed-in') kick();
        });
        return () => {
            clearTimers();
            offSettings?.();
            offAccount?.();
        };
    };

    const subscribe = (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    };

    const getStatus = () => ({
        running: state.running,
        lastRun: state.lastRun,
        lastError: state.lastError,
        results: { ...state.results },
    });

    return {
        start,
        stop: clearTimers,
        captureNow: () => captureAll('manual'),
        getStatus,
        subscribe,
    };
};

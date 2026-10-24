// mods/daily-30/uiRender.mjs
// Draws one state of the home tab into the elements ui.mjs created. Keeping the drawing here means the
// mount, data loading and playback wiring in ui.mjs stay readable, and a refresh only replaces content.

import { dayLabel, dateRow, el, emptyBlock, headRow, songRow } from './uiParts.mjs';
import { dayCount, errorLabel, songCount } from './labels.mjs';
import { formatClock } from './dates.mjs';

const platformName = (t, platform) => (platform === 'netease' ? t.netease : t.qq);

export const renderPage = ({ state, t, locale, nodes, handlers, report, autoCapture }) => {
    const {
        record, refresh, exportButton, qqButton, neteaseButton, playAll, status, dates,
        dayTitle, dayMeta, songs, footStatus, footAuto,
    } = nodes;

    record.disabled = state.busy === 'capture' || report.running;
    record.textContent = state.busy === 'capture' || report.running ? t.capturing : t.captureNow;
    refresh.disabled = state.busy === 'load';
    exportButton.disabled = state.busy === 'export';
    exportButton.textContent = state.busy === 'export' ? t.exporting : t.export;
    qqButton.setAttribute('aria-pressed', String(state.platform === 'qq'));
    neteaseButton.setAttribute('aria-pressed', String(state.platform === 'netease'));
    playAll.disabled = state.busy === 'play' || !state.day;

    status.replaceChildren();
    for (const platform of ['qq', 'netease']) {
        const result = report.results[platform];
        if (!result) continue;
        const item = el('span');
        item.append(el('span', 'd30-dot'));
        if (result.skipped === 'rollover') item.append(`${platformName(t, platform)}: ${t.rollover}`);
        else if (result.ok) item.append(`${platformName(t, platform)}: ${songCount(t, result.count)}`);
        else {
            item.append(`${platformName(t, platform)}: ${errorLabel(t, result.code)}`);
            item.classList.add('d30-error');
        }
        status.append(item);
    }
    if (state.days.length) status.append(el('span', '', dayCount(t, state.days.length)));
    if (state.error) status.append(el('span', 'd30-error', `${t.errorGeneric}: ${state.error}`));
    if (!status.childNodes.length) status.append(el('span', '', t.never));

    footStatus.textContent = report.lastRun ? `${t.lastChecked} ${formatClock(report.lastRun, locale)}` : t.never;
    footAuto.textContent = autoCapture === false ? t.autoOff : '';

    dates.replaceChildren();
    const forPlatform = state.days.filter((day) => day.platform === state.platform);
    if (!forPlatform.length) dates.append(el('p', 'd30-section-note', t.emptyPlatform));
    for (const day of forPlatform) {
        dates.append(dateRow(day, day.date === state.date, t, locale, (platform, date) => {
            void handlers.selectDate(platform, date);
        }));
    }

    dayMeta.classList.toggle('d30-hidden', Boolean(state.query) || !state.day);
    playAll.classList.toggle('d30-hidden', Boolean(state.query) || !state.day);
    dayTitle.textContent = state.query
        ? t.searchResults
        : state.date ? dayLabel(state.date, locale) : t.title;
    dayMeta.textContent = state.day
        ? `${songCount(t, state.day.songs.length)}${state.day.backfilled ? ` · ${t.backfilled}` : ''}`
        : '';

    songs.replaceChildren();
    if (state.query) {
        if (!state.results.length) {
            songs.append(el('p', 'd30-section-note', state.busy === 'search' ? t.resolving : t.noResults));
        } else {
            let last = '';
            for (const result of state.results) {
                const key = `${result.platform}:${result.date}`;
                if (key !== last) {
                    songs.append(el('div', 'd30-searchrow', `${platformName(t, result.platform)} · ${dayLabel(result.date, locale)}`));
                    last = key;
                }
                songs.append(songRow(result.song, result.position, t, () => void handlers.playOne(result.platform, result.song)));
            }
        }
        return;
    }
    if (!state.days.length) {
        songs.append(emptyBlock(t.emptyTitle, t.emptyBody));
        return;
    }
    if (!state.day) {
        songs.append(emptyBlock(t.emptyTitle, state.date ? t.dayMissing : t.emptyPlatform));
        return;
    }
    songs.append(headRow(t));
    state.day.songs.forEach((song, position) => {
        songs.append(songRow(song, position, t, () => void handlers.playOne(state.platform, song)));
    });
};

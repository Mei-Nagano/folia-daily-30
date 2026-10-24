// mods/daily-30/client.mjs
// Wires the recorder to the host: settings, the home tab, the commands, and the timer. The client runs
// in the main window; the export window has no accounts, timer or home tab, so it only checks the API.

import { createCapture } from './capture.mjs';
import { registerHomeTab } from './ui.mjs';
import { SETTINGS_SECTION } from './settings.mjs';
import { label } from './labels.mjs';

const zhLocale = () => {
    try {
        return String(navigator.language || '').toLowerCase().startsWith('zh');
    } catch {
        return false;
    }
};

export default function activate(folium) {
    if (folium.host.folium.major !== 1 || folium.host.folium.minor < 7) {
        throw new Error('每日30首需要 Folium 1.7（Folia 0.7.20 或更新版本）');
    }
    if (folium.env.context !== 'main') return undefined;

    const section = folium.registries.settingsSections.register(SETTINGS_SECTION);
    const capture = createCapture({ folium, settings: section.settings });
    const home = registerHomeTab(folium, capture, section.settings);

    const open = folium.registries.commands.register({
        id: 'open',
        label: label('打开每日30首', 'Open Daily 30'),
        description: label('按日期回看两个平台的每日推荐。', 'Browse the daily recommendations from both platforms.'),
        icon: 'calendar-days',
        globalShortcut: true,
        run: () => folium.ui.openHomeTab('daily-30'),
    });

    const record = folium.registries.commands.register({
        id: 'record',
        label: label('立即记录每日30首', 'Record Daily 30 now'),
        description: label('现在检查两个平台，并把今天的歌单写进记录。', 'Check both platforms now and write the current lists to the archive.'),
        icon: 'refresh-cw',
        run: async () => {
            await capture.captureNow();
            const results = Object.values(capture.getStatus().results);
            const ok = results.filter((result) => result.ok).length;
            const failed = results.length - ok;
            if (zhLocale()) return failed ? `已检查，${failed} 个平台没有记录成功。` : '每日30首已检查。';
            return failed ? `Checked; ${failed} platform(s) could not be recorded.` : 'Daily 30 is up to date.';
        },
    });

    const stop = capture.start();
    return () => {
        stop();
        home.unregister();
        open.unregister();
        record.unregister();
        section.unregister?.();
    };
}

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { buildSync, transformSync } from 'esbuild';

const clone = value => JSON.parse(JSON.stringify(value));
const load = (path, imports = {}) => {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    const { code } = transformSync(source, { loader: 'ts', format: 'cjs' });
    const sandbox = { module: { exports: {} }, require: key => imports[key] ?? {} };
    vm.runInNewContext(code, sandbox);
    return sandbox.module.exports;
};
const sections = load('../src/utils/contentSections.ts');
const { CONTENT_SECTION_KEYS, normalizeContentSectionOrder } = sections;
const defaults = ['periodic', 'recent', 'bookmarks'];
for (const value of [undefined, null, 'recent', {}, []]) {
    assert.deepEqual(clone(normalizeContentSectionOrder(value)), defaults);
}
assert.deepEqual(clone(normalizeContentSectionOrder(['bookmarks', 'bookmarks', 'unknown', 'periodic'])),
    ['bookmarks', 'periodic', 'recent']);

// Bundle the real stores, including Svelte's writable implementation, without Obsidian.
const { outputFiles } = buildSync({
    entryPoints: [fileURLToPath(new URL('../src/store.ts', import.meta.url))],
    bundle: true, platform: 'node', format: 'cjs', write: false,
});
const sandbox = { module: { exports: {} } };
vm.runInNewContext(outputFiles[0].text, sandbox);
const store = sandbox.module.exports;
const permutations = values => values.length === 0 ? [[]]
    : values.flatMap(value => permutations(values.filter(item => item !== value)).map(rest => [value, ...rest]));
let navigationCases = 0;
for (const order of permutations(defaults)) {
    assert.deepEqual(clone(normalizeContentSectionOrder(clone(order))), order);
    for (let mask = 0; mask < 8; mask++) {
        const availability = Object.fromEntries(defaults.map((key, index) => [key, Boolean(mask & (1 << index))]));
        store.setFocusChainAvailability(availability, order);
        const expected = order.filter(key => availability[key]).flatMap(key => key === 'periodic'
            ? ['periodic'] : [`${key}-filter`, `${key}-list`]);
        for (const backward of [false, true]) {
            const visited = [];
            let current = store.nextFocusTarget('search', backward);
            while (current && current !== 'search') {
                assert.ok(visited.length < 5, 'Navigation did not return to search');
                visited.push(current);
                current = store.nextFocusTarget(current, backward);
            }
            assert.deepEqual(visited, backward ? [...expected].reverse() : expected);
            navigationCases++;
        }
    }
}

// A hidden periodic section must forward in both directions, including when reordered.
store.setFocusChainAvailability({ periodic: true, recent: true, bookmarks: true }, ['recent', 'periodic', 'bookmarks']);
let request;
const unsubscribe = store.sectionFocusRequest.subscribe(value => request = value);
store.advanceSectionFocus('periodic', true, () => assert.fail('Skipped preceding recent files'));
assert.equal(request.target, 'recent-list');
store.advanceSectionFocus('periodic', false, () => assert.fail('Skipped following bookmarks'));
assert.equal(request.target, 'bookmarks-filter');
unsubscribe();

// Exercise the real declarative settings tree and its native onReorder callback.
const en = load('../src/i18n/locales/en.ts').default;
const { DEFAULT_SETTINGS, HomeTabSettingTab, normalizeParticleCanvasSettings } = load('../src/settings.ts', {
    obsidian: { PluginSettingTab: class { update() {} }, Platform: { isMobile: false } },
    './utils/contentSections': sections,
    './i18n': { t: () => en },
    './periodicNotes': {
        PERIOD_TYPES: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
        getAutoPeriodConfigs: () => ({ daily: {}, weekly: {}, monthly: {}, quarterly: {}, yearly: {} }),
    },
});
assert.equal(DEFAULT_SETTINGS.searchBarStyle, 'modern');
assert.equal(DEFAULT_SETTINGS.particleEffectGradientTransition, 30);
assert.equal(DEFAULT_SETTINGS.particleEffectGradientArea, 15);
assert.equal(DEFAULT_SETTINGS.particleEffectAdaptiveSize, false);
assert.equal(DEFAULT_SETTINGS.particleEffectCanvasPaddingTop, 40);
assert.equal(DEFAULT_SETTINGS.particleEffectCanvasPaddingBottom, 40);
assert.equal(DEFAULT_SETTINGS.particleEffectGradientPause, 0);
for (const [saved, expected] of [
    [{}, [40, 40]],
    [{ particleEffectCanvasPadding: 40 }, [40, 40]],
    [{ particleEffectCanvasPadding: 40, particleEffectCanvasPaddingTop: 0 }, [0, 40]],
    [{ particleEffectCanvasPadding: 40, particleEffectCanvasPaddingBottom: 15 }, [40, 15]],
    [{ particleEffectCanvasPadding: 40, particleEffectCanvasPaddingTop: 20, particleEffectCanvasPaddingBottom: 0 }, [20, 0]],
    [{ particleEffectCanvasPadding: NaN }, [40, 40]],
]) {
    const settings = { ...clone(DEFAULT_SETTINGS), ...saved };
    normalizeParticleCanvasSettings(settings, saved);
    assert.deepEqual([settings.particleEffectCanvasPaddingTop, settings.particleEffectCanvasPaddingBottom], expected);
    assert.ok(!('particleEffectCanvasPadding' in settings));
    normalizeParticleCanvasSettings(settings, settings);
    assert.deepEqual([settings.particleEffectCanvasPaddingTop, settings.particleEffectCanvasPaddingBottom], expected);
}
assert.equal(DEFAULT_SETTINGS.searchDropdownDisplay, 'overlay');
assert.equal(DEFAULT_SETTINGS.compactMode, true);
assert.equal(DEFAULT_SETTINGS.fileListLayout, 'centered');
assert.equal(DEFAULT_SETTINGS.particleEffect, true);
assert.equal(DEFAULT_SETTINGS.particleEffectColorMode, 'gradient');
assert.equal(DEFAULT_SETTINGS.logoScale, 1.5);
assert.equal(DEFAULT_SETTINGS.showPeriodicNotes, false);
assert.equal(DEFAULT_SETTINGS.vaultStats, false);
assert.equal(DEFAULT_SETTINGS.logo.imagePath, '');
assert.deepEqual(clone(DEFAULT_SETTINGS.recentFilesStore), []);
assert.equal(DEFAULT_SETTINGS.displayNameProperties, 'title');
assert.deepEqual(clone(DEFAULT_SETTINGS.contentSectionOrder), defaults);
assert.deepEqual(clone(CONTENT_SECTION_KEYS), defaults);
let persisted;
const plugin = { settings: clone(DEFAULT_SETTINGS), saveSettings: async () => persisted = clone(plugin.settings) };
const tab = new HomeTabSettingTab({}, plugin);
const pages = () => tab.getSettingDefinitions().filter(item => item.type === 'group').flatMap(group => group.items);
const logoPage = pages().find(item => item.name === en.page.logo.name);
const svgSource = logoPage.items.find(item => item.name === en.setting.logoSvgSource.name);
assert.ok(en.setting.logo.options.svgCode);
plugin.settings.logoType = 'svgCode';
assert.ok(svgSource.visible());
plugin.settings.logoType = 'imagePath';
assert.ok(!svgSource.visible());
plugin.settings.logoType = 'default';
const layout = pages().find(item => item.name === en.page.contentLayout.name);
assert.ok(layout && layout.type === 'page');
assert.ok(layout.items.find(item => item.control?.key === 'sectionCollapsible'));
assert.ok(layout.items.find(item => item.control?.key === 'compactMode'));
assert.ok(layout.items.find(item => item.name === en.setting.fileListLayout.name));
assert.deepEqual(Object.keys(en.setting.fileListLayout.options), ['centered', 'grid']);
assert.ok(layout.items.find(item => item.control?.key === 'displayNameProperties'));
const list = layout.items.find(item => item.type === 'list');
assert.deepEqual(clone(list.items.map(item => item.name)), ['Periodic notes', 'Recent files', 'Bookmarks']);
list.onReorder(2, 0);
assert.deepEqual(persisted.contentSectionOrder, ['bookmarks', 'periodic', 'recent']);
const reordered = pages().find(item => item.name === en.page.contentLayout.name).items.find(item => item.type === 'list');
assert.deepEqual(clone(reordered.items.map(item => item.name)), ['Bookmarks', 'Periodic notes', 'Recent files']);
const periodic = pages().find(item => item.name === en.page.periodicNotes.name);
const groups = periodic.items.filter(item => item.type === 'group');
assert.deepEqual(clone(groups.map(item => item.heading)), ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly']);
plugin.settings.showPeriodicNotes = true;
assert.ok(groups.every(group => group.visible()));
plugin.settings.periodicNotesMode = 'custom';
assert.ok(groups.every(group => !group.visible()));
const search = tab.getSettingDefinitions().flatMap(item => item.items ?? []).find(item => item.name === en.page.search.name);
assert.ok(search.items.find(item => item.name === en.setting.searchBarStyle.name));
assert.ok(search.items.find(item => item.name === en.setting.searchDropdownDisplay.name));
assert.deepEqual(Object.keys(en.setting.searchDropdownDisplay.options), ['overlay', 'expand']);
assert.deepEqual(Object.keys(en.setting.searchBarStyle.options), ['classic', 'modern', 'transparent', 'minimal']);
const particlePage = pages().find(item => item.name === en.page.particleEffect.name);
assert.deepEqual(clone(particlePage.items.filter(item => item.type === 'group').map(item => item.heading)),
    ['Color', 'Effects', 'Canvas', 'Interaction']);
assert.equal(en.setting.particleEffectColor.name, 'Base color');
plugin.settings.particleEffect = true;
plugin.settings.particleEffectColorMode = 'gradient';
const colorGroup = particlePage.items.find(item => item.heading === 'Color');
const areaControl = colorGroup.items.find(item => item.name === en.setting.particleEffectGradientArea.name);
assert.ok(areaControl.visible());
plugin.settings.particleEffectGradientAnimation = 'breathe';
assert.ok(!areaControl.visible(), 'Spatial controls are hidden for solid breathing colors');
const canvasGroup = particlePage.items.find(item => item.heading === 'Canvas');
const effectsGroup = particlePage.items.find(item => item.heading === 'Effects');
const pauseControl = effectsGroup.items.find(item => item.name === en.setting.particleEffectGradientPause.name);
assert.equal(effectsGroup.items.indexOf(pauseControl),
    effectsGroup.items.findIndex(item => item.name === en.setting.particleEffectGradientFrequency.name) + 1);
for (const animation of ['cycle', 'breathe', 'static']) {
    plugin.settings.particleEffectGradientAnimation = animation;
    assert.equal(pauseControl.visible(), animation !== 'static');
}
plugin.settings.particleEffectColorMode = 'original';
assert.ok(!pauseControl.visible());
assert.equal(canvasGroup.items.find(item => item.control?.key === 'particleEffectAdaptiveSize').control.defaultValue, false);
const appearance = tab.getSettingDefinitions().find(item => item.heading === en.group.appearance);
assert.equal(appearance.items.findIndex(item => item.name === en.setting.selectionHighlight.name),
    appearance.items.findIndex(item => item.name === en.page.particleEffect.name) + 1);
for (const [name, expected] of [[en.setting.particleEffectGradientArea.name, [10, 90, 5]],
    [en.setting.particleEffectCanvasPaddingTop.name, [0, 150, 5]],
    [en.setting.particleEffectCanvasPaddingBottom.name, [0, 150, 5]],
    [en.setting.particleEffectGradientPause.name, [0, 10, 0.25]],
    [en.setting.particleEffectSpacing.name, [1, 3, 0.1]], [en.setting.particleEffectDotSize.name, [0.2, 1, 0.05]]]) {
    let limits;
    const slider = { setLimits(...values) { limits = values; return this; }, setDynamicTooltip() { return this; },
        setValue() { return this; }, onChange() { return this; } };
    const setting = { addSlider(fn) { fn(slider); return this; } };
    tab.addResetButton = () => {};
    [...colorGroup.items, ...canvasGroup.items, ...effectsGroup.items].find(item => item.name === name).render(setting);
    assert.deepEqual(limits, expected);
}

const { resolveFileDisplayName, getFileDisplayName } = load('../src/utils/fileDisplayName.ts');
const displayCases = [
    [{ title: 'Preferred', aliases: ['Alias', 'Other'] }, 'title, aliases', 'Preferred'],
    [{ aliases: ['First alias', 'Second alias'] }, 'title, aliases', 'First alias'],
    [{ title: '  ', aliases: 'Single alias' }, 'title, aliases', 'Single alias'],
    [{ title: null, aliases: [] }, 'title, aliases', 'original'],
    [{ title: {}, aliases: ['First alias'] }, 'title, aliases', 'First alias'],
    [{ title: ['List title', 'Ignored title'] }, 'title', 'List title'],
    [{ aliases: ['', 'Ignored alias'], title: 'Fallback title' }, 'aliases, title', 'Fallback title'],
    [{ title: 'Ignored' }, '', 'original'],
    [{ title: 'Ignored' }, ' , , ', 'original'],
    [undefined, 'title, aliases', 'original'],
    [{ title: '  Trimmed  ' }, ' title , aliases ', 'Trimmed'],
    [{ title: 0 }, 'title', '0'],
    [{ title: false }, 'title', 'false'],
    [{ title: Infinity, aliases: ['Valid'] }, 'title, aliases', 'Valid'],
];
for (const [frontmatter, properties, expected] of displayCases) {
    assert.equal(resolveFileDisplayName(frontmatter, properties, 'original'), expected);
}
const file = { basename: 'original', path: 'original.md' };
let cacheReads = 0;
const displayApp = { metadataCache: { getFileCache(current) {
    assert.equal(current, file);
    cacheReads++;
    return { frontmatter: { title: 'Cached title' } };
} } };
assert.equal(getFileDisplayName(displayApp, file, ''), 'original');
assert.equal(cacheReads, 0, 'Empty property setting should bypass metadata');
assert.equal(getFileDisplayName(displayApp, file, 'title'), 'Cached title');
console.log(`Content display passed: ${navigationCases} navigation cases, native settings, search defaults, and ${displayCases.length} property fallback cases.`);

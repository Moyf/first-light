import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';
import { get, writable } from 'svelte/store';

let now = 0;
let timerId = 0;
const timers = new Map();
const timerWindow = {
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, at: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
};
function advance(ms) {
    const end = now + ms;
    while (true) {
        const next = [...timers.entries()].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        timers.delete(next[0]); now = next[1].at; next[1].callback();
    }
    now = end;
}
class Scope {
    handlers = [];
    register(modifiers, key, callback) { this.handlers.push({ modifiers, key, callback }); }
}
class View { constructor() { this.destroyed = false; } $destroy() { this.destroyed = true; } }
function debounce(callback, delay = 0) {
    let timer;
    const debounced = (...args) => {
        timerWindow.clearTimeout(timer);
        timer = timerWindow.setTimeout(() => { timer = undefined; void callback(...args); }, delay);
    };
    debounced.cancel = () => { timerWindow.clearTimeout(timer); timer = undefined; };
    return debounced;
}
function load(path, dependencies = {}) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    const { code } = transformSync(source, { loader: 'ts', format: 'cjs' });
    const sandbox = { module: { exports: {} }, window: timerWindow, Date: { now: () => now },
        require(name) { if (name in dependencies) return dependencies[name]; throw new Error(`Unexpected import: ${name}`); } };
    vm.runInNewContext(code, sandbox);
    return sandbox.module.exports;
}
const { TextInputSuggester } = load('../src/suggester/suggester.ts', {
    obsidian: { Scope, Platform: {}, debounce },
    '../ui/suggesterView.svelte': View,
    '@popperjs/core': {},
    'svelte/store': { get, writable },
    '../i18n': { t: () => ({ searchNoResults: 'No results' }) },
    '../utils/searchDropdown': { mountSearchDropdown: () => () => {} },
});
let pushes = 0, pops = 0;
const app = { scope: {}, keymap: { pushScope() { pushes++; }, popScope() { pops++; } } };
const listeners = new Map();
const input = {
    value: '',
    addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(callback); },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
};
input.ownerDocument = { activeElement: input };
function dispatch(type) { for (const callback of listeners.get(type) ?? []) callback({ target: input }); }
const parent = { classList: { contains: () => true } };
class Demo extends TextInputSuggester {
    constructor(container = parent) { super(app, input, container); this.lookup = () => []; }
    getSuggestions(query) { return this.lookup(query); }
    useSelectedItem() {}
    getDisplayElementProps() { return {}; }
    getDisplayElementComponentType() { return View; }
}
const demo = new Demo();
demo.lookup = query => query ? [{ name: query }] : [];
const emissions = [];
const stop = demo.getSuggester().suggestionsStore.subscribe(items => emissions.push(items.map(item => item.name)));
input.value = 'first'; await demo.onInput();
const view = demo.suggesterView;
const firstPushes = pushes;
emissions.length = 0;
input.value = 'second'; await demo.onInput();
assert.deepEqual(emissions, [['second']], 'Same-length results update atomically without an empty intermediate list');
assert.equal(demo.suggesterView, view);
assert.equal(pushes, firstPushes);
input.value = 'unmatched'; demo.lookup = () => []; await demo.onInput();
assert.equal(get(demo.emptyStateVisible), true, 'Nonempty unmatched query keeps the panel open');
assert.equal(demo.suggesterView, view);
assert.equal(demo.closingAnimationRunning, false);
demo.close();
assert.equal(get(demo.emptyStateVisible), false);
input.value = 'reopen'; demo.lookup = query => [{ name: query }]; await demo.onInput();
assert.equal(demo.suggesterView, view, 'Reopening during the outro reuses the mounted view');
assert.equal(pushes - pops, 1, 'Reopening restores exactly one keyboard scope');
advance(250);
assert.equal(view.destroyed, false, 'The obsolete close timer cannot tear down the reopened view');

const pending = [];
demo.lookup = query => new Promise(resolve => pending.push({ query, resolve }));
input.value = 'A'; const a = demo.onInput();
input.value = 'B'; const b = demo.onInput();
input.value = 'A'; const a2 = demo.onInput();
pending[2].resolve([{ name: 'latest A' }]); await a2;
pending[0].resolve([{ name: 'obsolete A' }]); await a;
pending[1].resolve([{ name: 'obsolete B' }]); await b;
assert.equal(demo.getSuggester().getSelectedItem().name, 'latest A', 'An older identical query cannot overwrite newer results');
input.value = 'C'; const c = demo.onInput(); demo.close();
pending[3].resolve([{ name: 'late C' }]); await c; advance(250);
assert.equal(demo.suggesterView, undefined, 'Closing invalidates in-flight searches');
assert.equal(pushes, pops);
input.value = 'D'; const d = demo.onInput(); demo.destroy();
pending[4].resolve([{ name: 'late D' }]); await d; advance(250);
assert.equal(demo.suggesterView, undefined, 'Destroying an embedded view cannot leave a late portal');
stop();

// Non-home popovers can remove their mount point on close; preserve their
// original teardown/recreate behavior rather than reusing detached content.
const generic = new Demo({ classList: { contains: () => false } });
generic.lookup = query => [{ name: query }];
input.value = 'generic'; await generic.onInput();
const oldGenericView = generic.suggesterView;
generic.close();
input.value = 'reopened generic'; await generic.onInput();
assert.equal(oldGenericView.destroyed, true);
assert.notEqual(generic.suggesterView, oldGenericView);
generic.destroy();

// A queued debounce has not acquired a requestId yet. Closing must cancel it,
// otherwise it can reopen the dropdown and keyboard scope after blur/Escape.
const delayed = new Demo();
let delayedLookups = 0;
delayed.lookup = query => { delayedLookups++; return [{ name: query }]; };
input.value = 'queued before blur'; dispatch('input');
advance(100); dispatch('blur'); advance(250);
await Promise.resolve(); await Promise.resolve();
assert.equal(delayedLookups, 0, 'Blur cancels a pending search before its debounce delay');
assert.equal(delayed.suggesterView, undefined);
assert.equal(pushes, pops, 'Cancelled debounce cannot restore a dismissed keyboard scope');
input.value = 'queued before escape'; dispatch('input'); delayed.close(); advance(250);
await Promise.resolve(); await Promise.resolve();
assert.equal(delayedLookups, 0, 'Explicit close also cancels a pending search');
input.value = 'new query'; dispatch('input'); advance(250);
await Promise.resolve(); await Promise.resolve();
assert.equal(delayedLookups, 1, 'New input still searches normally after cancellation');
assert.equal(delayed.getSuggester().getSelectedItem().name, 'new query');
delayed.destroy(); advance(250);

// The stable empty-state panel retains the real keyboard scope. Mod+Enter
// must be harmless with no selection, while still opening selected results.
const subclassDependencies = {
    obsidian: { Platform: {}, TFile: class {}, View: class {} },
    './suggester': { TextInputSuggester },
    'svelte/store': { get, writable },
    'src/utils/htmlUtils': {},
    './fuzzySearch': { SurfingItemFuzzySearch: class {} },
    'src/utils/getFilesUtils': {},
    'src/utils/getFileTypeUtils': {},
    'src/utils/matchAnalyzer': { MatchAnalyzer: class {} },
    'src/utils/folderSearchQuery': {},
    'src/utils/regexUtils': {},
    'src/ui/svelteComponents/homeTabFileSuggestion.svelte': View,
    'src/ui/svelteComponents/omnisearchSuggestion.svelte': View,
    'src/ui/svelteComponents/surfingSuggestion.svelte': View,
};
app.metadataCache = { onCleanCache() {}, on() {} };
app.vault = { on() {} };
app.plugins = { getPlugin() { return {}; } };
app.workspace = { getLeavesOfType() { return []; } };
const plugin = { settings: { searchDelay: 0, hideOnBlur: true } };
const ownerView = { registerEvent() {} };
const searchBar = { searchBarEl: writable(input), suggestionContainerEl: writable(parent) };
for (const name of ['homeTabSuggester', 'omnisearchSuggester', 'surfingSuggester']) {
    const { default: SuggesterType } = load(`../src/suggester/${name}.ts`, subclassDependencies);
    const instance = new SuggesterType(app, plugin, ownerView, searchBar);
    const modEnter = instance.scope.handlers.find(handler => handler.key === 'Enter' && handler.modifiers[0] === 'Mod').callback;
    const selections = [];
    instance.useSelectedItem = (item, newTab) => selections.push({ item, newTab });
    modEnter({ preventDefault() {} });
    assert.equal(selections.length, 0, `${name}: Mod+Enter ignores empty results`);
    const result = { path: 'selected.md' };
    instance.getSuggester().setSuggestions([result]);
    modEnter({ preventDefault() {} });
    assert.deepEqual(selections, [{ item: result, newTab: true }], `${name}: selected results still open in a new tab`);
    if (name === 'homeTabSuggester') {
        plugin.settings.hideOnBlur = false;
        instance.getSuggestions = async () => [result];
        input.value = 'focused result'; await instance.onInput();
        assert.equal(pushes - pops, 1);
        let finishLookup;
        instance.getSuggestions = () => new Promise(resolve => { finishLookup = resolve; });
        input.value = 'slow result'; const late = instance.onInput();
        input.ownerDocument.activeElement = null;
        instance.close();
        assert.equal(pushes, pops, 'Retaining the list on blur still releases its keyboard scope');
        finishLookup([result]); await late;
        assert.ok(instance.suggesterView, 'Late results may update the retained visible list');
        assert.equal(pushes, pops, 'Late results cannot reclaim keyboard scope while another input is focused');
        input.ownerDocument.activeElement = input;
        plugin.settings.hideOnBlur = true;
    }
    instance.destroy();
}

// Real resize scheduling: a burst exceeding the old circuit breaker must
// preserve the canvas and eventually sample the latest settled dimensions.
const { ParticleWordmarkEngine } = load('../src/utils/particleEngine.ts');
let width = 300;
const container = {
    isConnected: true,
    ownerDocument: { defaultView: timerWindow, removeEventListener() {} },
    querySelector: () => ({ getBoundingClientRect: () => ({ width, height: 100 }) }),
    removeEventListener() {},
};
const engine = new ParticleWordmarkEngine(container, { zoom: 1, color: '#ffffff', color2: '#ffffff', repulsionRadius: 100, repulsionStrength: 1 });
const canvas = { remove() {} };
engine.canvas = canvas; engine.contentWidth = width; engine.contentHeight = 100;
let rebuilds = 0;
engine.resample = async () => { rebuilds++; engine.contentWidth = width; };
for (let i = 0; i < 12; i++) { width += 1; engine.handleResize(); advance(210); }
assert.equal(engine.destroyed, false);
assert.equal(engine.canvas, canvas);
assert.equal(rebuilds, 5, 'Resize bursts are rate limited without destroying the canvas');
advance(2500);
assert.equal(engine.contentWidth, width, 'The cooldown retries the latest settled size');
const completed = rebuilds;
engine.handleResize(); advance(210);
assert.equal(rebuilds, completed, 'No-op resize notifications do not rebuild');
width = 0; engine.handleResize(); advance(210);
assert.equal(engine.canvas, canvas, 'Hidden zero-size containers retain their animation');
width = 500; engine.handleResize(); engine.destroy(); advance(3000);
assert.equal(rebuilds, completed, 'Destroy cancels delayed resize recovery in the owner window');
console.log('Search dropdown passed: atomic updates, empty state, close/reopen, ABA async results, teardown, and particle resize recovery.');

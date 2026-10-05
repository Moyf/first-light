import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';

const { code } = transformSync(readFileSync(new URL('../src/utils/particleEngine.ts', import.meta.url), 'utf8'), { loader: 'ts', format: 'cjs' });
const sandbox = { module: { exports: {} }, window: {} };
vm.runInNewContext(code, sandbox);
const { ParticleWordmarkEngine, createDisturbanceProfile, disturbanceWeight } = sandbox.module.exports;
const options = { color: '#fff', color2: '#000', zoom: 1, spacing: 2, dotSize: 0.5, repulsionRadius: 100, repulsionStrength: 1.8 };
const container = (view = {}) => ({ ownerDocument: { defaultView: view }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 500 }) });
const particle = (x, y, hx = x, hy = y, radius = 1) => ({ x, y, hx, hy, vx: 0, vy: 0, radius, fill: 'rgb(255, 255, 255)' });

// Decay is smooth and bounded, with a wider external tail at low values.
for (const falloff of [0.1, 0.2, 0.75, 1, 2]) {
    const profile = createDisturbanceProfile(falloff);
    assert.equal(disturbanceWeight(0, 100, profile), 1);
    let previous = 1;
    for (let i = 1; i <= 1000; i++) {
        const weight = disturbanceWeight(i, 100, profile);
        assert.ok(weight >= 0 && weight <= previous + 1e-7);
        previous = weight;
    }
    assert.equal(disturbanceWeight(profile.range * 100, 100, profile), 0);
    assert.ok(Math.abs(disturbanceWeight(100, 100, profile) - (Math.exp(-1) - 0.01) / 0.99) < 0.001);
}
assert.ok(disturbanceWeight(150, 100, createDisturbanceProfile(0.75)) > 0.1);
assert.equal(disturbanceWeight(150, 100, createDisturbanceProfile(2)), 0);
assert.ok(disturbanceWeight(50, 100, createDisturbanceProfile(2)) > 0.9);
assert.equal(disturbanceWeight(50, 100, createDisturbanceProfile()), 0.25);
for (const input of [NaN, Infinity, -100, 100]) assert.ok(Number.isFinite(createDisturbanceProfile(input).range));
for (const falloff of [0.75, 2]) {
    const engine = new ParticleWordmarkEngine(container(), { ...options, disturbanceFalloff: falloff });
    engine.mouse = { x: 0, y: 0 };
    engine.particles = [particle(150, 0)];
    engine.step(1);
    assert.equal(engine.particles[0].vx > 0, falloff === 0.75, 'The real cursor field should have a soft external tail');
}

// Exercise the actual settings tree: saved choices, defaults, visible controls,
// and slider ranges must all match the options forwarded to the engine.
function load(path, imports = {}) {
    const result = transformSync(readFileSync(new URL(path, import.meta.url), 'utf8'), { loader: 'ts', format: 'cjs' });
    const context = { module: { exports: {} }, require: name => imports[name] ?? {} };
    vm.runInNewContext(result.code, context);
    return context.module.exports;
}
const en = load('../src/i18n/locales/en.ts').default;
const { DEFAULT_SETTINGS, HomeTabSettingTab } = load('../src/settings.ts', {
    obsidian: { PluginSettingTab: class { update() {} }, Platform: { isMobile: false } },
    './i18n': { t: () => en },
    './periodicNotes': { PERIOD_TYPES: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], getAutoPeriodConfigs: () => ({}) },
});
assert.equal(DEFAULT_SETTINGS.particleEffectRecoveryDamping, 60);
assert.equal(DEFAULT_SETTINGS.particleEffectDisturbFalloff, 0.8);
const plugin = { settings: { ...DEFAULT_SETTINGS }, saveSettings: async () => {} };
const tab = new HomeTabSettingTab({}, plugin);
const particlePage = tab.getSettingDefinitions().flatMap(item => item.items ?? []).find(item => item.name === en.page.particleEffect.name);
const interaction = particlePage.items.find(item => item.heading === en.group.particleInteraction);
tab.addResetButton = () => {};
for (const [key, expected] of [['particleEffectRecoveryDamping', [0, 100, 5]], ['particleEffectDisturbFalloff', [0.1, 2, 0.1]], ['particleEffectDisturbRadius', [5, 100, 1]]]) {
    let limits;
    let onChange;
    const slider = { setLimits(...values) { limits = values; return this; }, setDynamicTooltip() { return this; }, setValue() { return this; }, onChange(fn) { onChange = fn; return this; } };
    interaction.items.find(item => item.name === en.setting[key].name).render({ addSlider(fn) { fn(slider); return this; } });
    assert.deepEqual(limits, expected);
    onChange(expected[1]);
    assert.equal(plugin.settings[key], expected[1]);
}

// Added damping preserves legacy physics at zero and suppresses overshoot at 100.
for (const speed of [0.6, 1.4, 2.5]) {
    for (const dt of [0.5, 1, 2, 3]) {
        const overshoots = [];
        for (const damping of [0, 0.5, 1]) {
            const engine = new ParticleWordmarkEngine(container(), { ...options, recoverySpeed: speed, recoveryDamping: damping });
            engine.particles = [particle(100, 0, 0, 0)];
            let minimum = 100;
            for (let t = 0; t < 1200; t += dt) {
                engine.step(dt);
                minimum = Math.min(minimum, engine.particles[0].x);
            }
            assert.ok(Math.abs(engine.particles[0].x) < 0.001);
            overshoots.push(Math.max(0, -minimum));
        }
        assert.ok(overshoots[0] > overshoots[1]);
        assert.ok(overshoots[1] > overshoots[2]);
        assert.ok(overshoots[2] < 0.001);
        const legacy = new ParticleWordmarkEngine(container(), { ...options, recoverySpeed: speed });
        assert.equal(legacy.dampingRate, 0.042 * speed);
    }
}
console.log('Particle interaction passed: falloff, damping, settings ranges');

// Every motion mode must paint all particles in at most one fill per shade.
sandbox.Path2D = class { rectangles = []; rect(...values) { this.rectangles.push(values); } };
for (const ambientMotion of ['none', 'wave', 'float', 'undulate', 'pulse', 'breathe', 'ripple']) {
    for (const preserveShading of [false, true]) {
        const engine = new ParticleWordmarkEngine(container({ performance: { now: () => 1000 } }), { ...options, colorMode: 'gradient', preserveShading, ambientMotion });
        engine.canvas = { width: 1000, height: 500 };
        engine.cssWidth = 1000; engine.cssHeight = 500;
        engine.gradientShadeIndices = [0, 8, 16];
        engine.particles = Array.from({ length: 300 }, (_, i) => ({ ...particle(i * 2, 100), shadeIndex: [0, 8, 16][i % 3] }));
        const shapes = [];
        engine.renderContext = { save() {}, restore() {}, setTransform() {}, clearRect() {}, createLinearGradient() { return { addColorStop() {} }; }, fill(path) { shapes.push(...path.rectangles); }, fillRect() { assert.fail('Gradient particles should be batched'); } };
        engine.render();
        assert.equal(shapes.length, engine.particles.length);
        assert.ok(shapes.every(rect => rect.every(Number.isFinite)));
        assert.equal(engine.framePaths, null);
    }
}
for (const [key, value] of Object.entries({ particleEffectScale: 2, particleEffectScaleMobile: 1, particleEffectSpacing: 1.3, particleEffectDotSize: 0.45, particleEffectCanvasPaddingTop: 40, particleEffectCanvasPaddingBottom: 0, particleEffectDisturbRadius: 40, particleEffectDisturbStrength: 1, particleEffectDisturbFalloff: 0.8, particleEffectRecoverySpeed: 1.5, particleEffectRecoveryDamping: 60 })) assert.equal(DEFAULT_SETTINGS[key], value);
assert.equal(DEFAULT_SETTINGS.particleEffectGlowEnabled, false);
assert.equal(DEFAULT_SETTINGS.particleEffectGlow, 40);

// Perspective inversion must keep cursor disturbance aligned with visible dots.
const { mapParallaxPointer } = sandbox.module.exports;
for (const pitch of [-8, 0, 8]) for (const yaw of [-6, 0, 6]) {
    for (const [x, y] of [[-800, -120], [0, 0], [800, 120]]) {
        const rx = pitch * Math.PI / 180, ry = yaw * Math.PI / 180;
        const z = -Math.sin(ry) * x + Math.cos(ry) * Math.sin(rx) * y;
        const w = 1 - z / 1000;
        const visibleX = (Math.cos(ry) * x + Math.sin(ry) * Math.sin(rx) * y) / w - 12;
        const visibleY = Math.cos(rx) * y / w + 6;
        const mapped = mapParallaxPointer(visibleX, visibleY, -12, 6, pitch, yaw);
        assert.ok(Math.abs(mapped.x - x) < 1e-8 && Math.abs(mapped.y - y) < 1e-8);
    }
}
const enabled = new ParticleWordmarkEngine(container(), { ...options, parallax: true });
const transforms = [];
enabled.canvas = { style: { setProperty(_, value) { transforms.push(value); } } };
enabled.parallaxWindow = { innerWidth: 1000, innerHeight: 500 };
enabled.handleParallaxMove({ clientX: 1000, clientY: 250 });
for (let i = 0; i < 120; i++) enabled.updateParallax(1);
assert.ok(transforms.at(-1).includes('translate3d(-12.00px, 0.00px, 0)'));
assert.ok(transforms.at(-1).includes('rotateY(6.000deg)'));
// Normalization follows the whole owner window, independent of the wordmark box.
enabled.handleParallaxMove({ clientX: 500, clientY: 500 });
assert.equal(enabled.parallaxTargetX, 0);
assert.equal(enabled.parallaxTargetY, 1);
enabled.handleParallaxMove({ clientX: 1000, clientY: 250 });
const settledWrites = transforms.length;
enabled.updateParallax(1);
assert.equal(transforms.length, settledWrites, 'Settled targets must stop writing transforms');
enabled.handleParallaxLeave();
for (let i = 0; i < 120; i++) enabled.updateParallax(1);
assert.equal(enabled.parallaxX, 0);
assert.ok(transforms.at(-1).includes('rotateY(0.000deg)'));
assert.equal(new ParticleWordmarkEngine(container(), options).parallaxEnabled, false);
assert.equal(new ParticleWordmarkEngine(container({ ontouchstart: null }), { ...options, parallax: true }).parallaxEnabled, false);
assert.equal(new ParticleWordmarkEngine(container({ matchMedia: () => ({ matches: true }) }), { ...options, parallax: true }).parallaxEnabled, false);
assert.equal(DEFAULT_SETTINGS.particleEffectParallax, false);
const parallaxControl = interaction.items.find(item => item.control?.key === 'particleEffectParallax');
assert.equal(parallaxControl.control.defaultValue, false);

for (const dt of [0.5, 1, 2]) {
    enabled.parallaxReturning = false;
    enabled.parallaxX = 1; enabled.parallaxY = -1;
    enabled.handleParallaxLeave();
    for (let elapsed = 0; elapsed < 24; elapsed += dt) enabled.updateParallax(dt);
    assert.ok(Math.abs(enabled.parallaxX - 0.125) < 1e-8, 'Halfway through 800 ms cubic ease-out, one eighth remains');
    const elapsed = enabled.parallaxReturnElapsed;
    enabled.handleParallaxLeave();
    assert.equal(enabled.parallaxReturnElapsed, elapsed, 'Repeated leave/blur must not restart the return');
    for (let elapsed = 0; elapsed < 25; elapsed += dt) enabled.updateParallax(dt);
    assert.equal(enabled.parallaxX, 0);
    enabled.handleParallaxMove({ clientX: 0, clientY: 0 });
    assert.equal(enabled.parallaxReturning, false, 'Reentry immediately resumes pointer following');
}

// Glow remains opt-in even when an older settings file contains a strength.
const effects = particlePage.items.find(item => item.heading === en.group.particleEffects);
const glowToggle = effects.items.find(item => item.control?.key === 'particleEffectGlowEnabled');
const glowStrength = effects.items.find(item => item.name === en.setting.particleEffectGlow.name);
assert.equal(glowToggle.control.defaultValue, false);
assert.ok(!glowStrength.visible());
plugin.settings.particleEffectGlowEnabled = true;
assert.ok(glowStrength.visible());
plugin.settings.particleEffect = false;
assert.ok(!glowToggle.visible() && !glowStrength.visible());
plugin.settings.particleEffect = true;
let glowLimits;
glowStrength.render({ addSlider(fn) { fn({ setLimits(...v) { glowLimits = v; return this; }, setDynamicTooltip() { return this; }, setValue() { return this; }, onChange() { return this; } }); return this; } });
assert.deepEqual(glowLimits, [0, 100, 5]);

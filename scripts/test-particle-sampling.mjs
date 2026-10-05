import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';

const source = readFileSync(new URL('../src/utils/particleEngine.ts', import.meta.url), 'utf8');
const { code } = transformSync(source, { loader: 'ts', format: 'cjs' });
const sandbox = { module: { exports: {} }, window: {} };
vm.runInNewContext(code, sandbox);
const { ParticleWordmarkEngine, normalizeParticleCanvasPadding } = sandbox.module.exports;

// The sampling path only needs the container's own window for a touch/pointer
// check, so a minimal stub keeps the engine constructible outside Obsidian.
const containerStub = { ownerDocument: { defaultView: {} } };

// Exercise the real sampler with a transparent background and an opaque glyph.
const width = 337;
const height = 181;
const data = new Uint8ClampedArray(width * height * 4);
for (let y = 36; y < 147; y++) {
    for (let x = 75; x < 264; x++) {
        if (x >= 114 && x < 225 && (y < 81 || y >= 102)) continue;
        data.set([35, 100, 220, 255], (y * width + x) * 4);
    }
}

let cases = 0;
for (const scale of [2, 2.1, 2.25, 2.5, 2.75, 3]) {
    for (const spacing of [2, 3.5, 4.5, 5, 7.5, 10]) {
        for (const colorMode of ['original', 'monochrome']) {
            const engine = new ParticleWordmarkEngine(containerStub, {
                colorMode, color: '#31e0e3', color2: '#e331e0', zoom: 2, spacing,
                canvasPaddingTop: 0, canvasPaddingBottom: 0,
                dotSize: 1.3, repulsionRadius: 84, repulsionStrength: 0.8,
            });
            engine.scale = scale;
            const canvas = { width, height };
            const sample = pixels => engine.sampleParticles(canvas, { getImageData: () => ({ data: pixels }) });
            assert.equal(sample(new Uint8ClampedArray(data.length)).length, 0,
                `Transparent canvas generated particles at scale=${scale}, spacing=${spacing}`);
            const particles = sample(data);
            assert.ok(particles.length > 0);
            for (const particle of particles) {
                // Compare against the nearest lattice position to avoid inverse-transform rounding.
                const step = Math.min(spacing, 3) * scale;
                const start = Math.floor(step / 2);
                const lattice = value => start + Math.round((value * scale / 2 - start) / step) * step;
                const x = Math.floor(lattice(particle.hx) + 1e-9);
                const y = Math.floor(lattice(particle.hy) + 1e-9);
                assert.equal(data[(y * width + x) * 4 + 3], 255);
                assert.ok(particle.radius <= Math.min(1, Math.min(spacing, 3) * 0.4) * 2,
                    'Legacy sizes must keep air between particles');
                assert.match(particle.fill, /^rgb\(\d+, \d+, \d+\)$/);
                if (colorMode === 'original') assert.equal(particle.fill, 'rgb(35, 100, 220)');
                else assert.equal(particle.fill, 'rgb(45, 207, 210)');
            }
            cases++;
        }
    }
}
// Source luminance is optional: off gives the exact tint; on retains legacy shading.
for (const [color, expected] of [['#ffffff', 'rgb(255, 255, 255)'], ['#4696c8', 'rgb(70, 150, 200)'], ['#000000', 'rgb(0, 0, 0)']]) {
    const engine = new ParticleWordmarkEngine(containerStub, { colorMode: 'monochrome', color, color2: '#ffffff', preserveShading: false, zoom: 1, spacing: 1,
        dotSize: 0.4, canvasPaddingTop: 0, canvasPaddingBottom: 0 });
    for (const rgb of [[0,0,0], [35,100,220], [255,255,255]]) {
        const pixels = data.slice();
        for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3]) pixels.set(rgb, i);
        const particles = engine.sampleParticles({ width, height }, { getImageData: () => ({ data: pixels }) });
        assert.ok(particles.length > 0);
        assert.ok(particles.every(p => p.fill === expected), 'The source color must not darken or brighten Base color');
    }
}
for (const preserveShading of [undefined, true, false]) {
    const engine = new ParticleWordmarkEngine(containerStub, { colorMode: 'monochrome', color: '#4696c8', color2: '#ffffff', preserveShading,
        zoom: 1, spacing: 1, dotSize: 0.4 });
    for (const [value, shaded] of [[0, 'rgb(42, 90, 120)'], [128, 'rgb(70, 150, 200)'], [255, 'rgb(98, 210, 255)']]) {
        const pixels = data.slice();
        for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3]) pixels.set([value,value,value], i);
        const particles = engine.sampleParticles({ width, height }, { getImageData: () => ({ data: pixels }) });
        assert.ok(particles.every(p => p.fill === (preserveShading === false ? 'rgb(70, 150, 200)' : shaded)));
    }
}
// Inspect actual color contribution, geometry and seamless cycling.
function gradient(animation, transition, angle = 90, time = 0, area, pause = 0, frequency = 1) {
    const engine = new ParticleWordmarkEngine(containerStub, {
        color: '#000000', color2: '#ffffff', zoom: 1,
        repulsionRadius: 84, repulsionStrength: 0.8,
        gradientAnimation: animation, gradientAngle: angle, gradientTransition: transition, gradientArea: area,
        gradientPause: pause, gradientFrequency: frequency,
    });
    engine.cssWidth = 200; engine.cssHeight = 100;
    const context = { createLinearGradient(...coordinates) {
        return { coordinates, stops: [], addColorStop(position, color) {
            assert.ok(position >= 0 && position <= 1);
            this.stops.push({ position, color });
        } };
    } };
    return engine.gradientFrameFill(context, time);
}
for (const animation of ['static', 'cycle']) {
    const full = gradient(animation, 100);
    const narrow = gradient(animation, 50);
    assert.deepEqual(narrow.coordinates, full.coordinates, 'Transition range must preserve angle and animation geometry');
    const index = animation === 'static' ? 0 : 1;
    const range = narrow.stops[index + 1].position - narrow.stops[index].position;
    const fullRange = full.stops[index + 1].position - full.stops[index].position;
    assert.ok(Math.abs(range - fullRange / 2) < 1e-10, '50% halves the available transition width');
    const sharp = gradient(animation, 0);
    assert.equal(sharp.stops[index].position, sharp.stops[index + 1].position);
    assert.notEqual(sharp.stops[index].color, sharp.stops[index + 1].color, '0% transition creates a hard color boundary');
    assert.deepEqual(gradient(animation, -20).stops, sharp.stops);
    assert.deepEqual(gradient(animation, 140).stops, full.stops);
    assert.deepEqual(gradient(animation, NaN).stops, gradient(animation, 60).stops);
    assert.deepEqual(gradient(animation, undefined).stops, gradient(animation, 60).stops);
    for (const area of [10, 30, 50, 90]) {
        for (const transition of [0, 60, 100]) {
            const stops = gradient(animation, transition, 90, 0, area).stops;
            assert.ok(stops.every((stop, i) => i === 0 || stop.position >= stops[i - 1].position));
            // Integrate B's contribution over a complete pattern: softness
            // must not change the chosen proportion of gradient color.
            const all = [{ position: 0, color: stops[0].color }, ...stops, { position: 1, color: stops.at(-1).color }];
            let share = 0;
            for (let i = 1; i < all.length; i++) {
                share += (all[i].position - all[i - 1].position) *
                    ((all[i].color === 'rgb(255, 255, 255)' ? 1 : 0) +
                     (all[i - 1].color === 'rgb(255, 255, 255)' ? 1 : 0)) / 2;
            }
            assert.ok(Math.abs(share - area / 100) < 1e-10, 'Gradient color must retain the selected area');
        }
    }
    for (const [input, expected] of [[-100, 10], [500, 90], [NaN, 30], [undefined, 30]]) {
        assert.deepEqual(gradient(animation, 60, 90, 0, input).stops, gradient(animation, 60, 90, 0, expected).stops);
    }
}
const cycleStart = gradient('cycle', 35, 90, 0);
const cycleEnd = gradient('cycle', 35, 90, 6);
assert.deepEqual(cycleStart.coordinates, cycleEnd.coordinates, 'Cycling geometry remains seamless at a full period');
assert.deepEqual(cycleStart.stops, cycleEnd.stops, 'Cycling colors remain seamless at a full period');
// Holds last real seconds independently of frequency and resume at the same fill.
const snapshot = value => JSON.parse(JSON.stringify(value, (_, item) =>
    typeof item === 'number' ? Math.round(item * 1e9) / 1e9 : item));
for (const frequency of [0.25, 1, 4]) {
    const fill = (animation, time, pause = 3) => snapshot(gradient(animation, 60, 90, time, 30, pause, frequency));
    const cycleDuration = 6 / frequency;
    assert.equal(fill('cycle', cycleDuration + 1), 'rgb(0, 0, 0)', 'The complete dwell is pure Base color');
    assert.deepEqual(fill('cycle', cycleDuration), fill('cycle', cycleDuration + 2.9));
    assert.deepEqual(fill('cycle', cycleDuration + 3), fill('cycle', 0));
    assert.notDeepEqual(fill('cycle', cycleDuration + 3.2), fill('cycle', 0));
    assert.deepEqual(fill('cycle', cycleDuration + 3.2), fill('cycle', 0.2));
    const transition = 2 / frequency;
    assert.equal(fill('breathe', transition), 'rgb(255, 255, 255)');
    assert.equal(fill('breathe', transition + 2.9), 'rgb(255, 255, 255)');
    assert.equal(fill('breathe', transition + 3), 'rgb(255, 255, 255)');
    assert.equal(fill('breathe', 2 * transition + 3), 'rgb(0, 0, 0)');
    assert.equal(fill('breathe', 2 * transition + 5.9), 'rgb(0, 0, 0)');
    assert.equal(fill('breathe', 2 * (transition + 3)), fill('breathe', 0));
    assert.notEqual(fill('breathe', transition + 3 + transition / 2), 'rgb(255, 255, 255)');
    for (const time of [0, 0.5, 2, 4, 6, 20]) {
        assert.deepEqual(fill('cycle', time, 0), snapshot(gradient('cycle', 60, 90, time * frequency, 30)));
        assert.equal(fill('breathe', time, 0), gradient('breathe', 60, 90, time * frequency, 30));
    }
}
// The entire band, including a soft edge at maximum area, starts/ends off ink.
for (const area of [10, 30, 90]) {
    for (const transition of [0, 60, 100]) {
        for (const angle of [0, 45, 90, 180, 315]) {
            assert.equal(gradient('cycle', transition, angle, 0, area, 3), 'rgb(0, 0, 0)');
            assert.equal(gradient('cycle', transition, angle, 6.01, area, 3), 'rgb(0, 0, 0)');
            const middle = gradient('cycle', transition, angle, 3, area, 3);
            const start = middle.coordinates.slice(0, 2), end = middle.coordinates.slice(2);
            const midpoint = start.map((value, i) => (value + end[i]) / 2);
            assert.ok(Math.abs(midpoint[0] - 100) < 1e-9 && Math.abs(midpoint[1] - 50) < 1e-9,
                'A single flash band crosses the ink center halfway through the sweep');
            assert.equal(middle.stops.length, 4, 'Only one band sweeps across the particles');
            assert.equal(middle.stops[0].color, 'rgb(0, 0, 0)');
            assert.equal(middle.stops.at(-1).color, 'rgb(0, 0, 0)');
            assert.equal(middle.stops[1].color, 'rgb(255, 255, 255)');
        }
    }
}
assert.equal(gradient('breathe', 0), gradient('breathe', 100), 'Breathing is a solid fill and ignores spatial range');
// Gradient shading uses a bounded palette, including solid breathing and paused Base color.
for (const animation of ['static', 'cycle', 'breathe']) {
    const engine = new ParticleWordmarkEngine(containerStub, { colorMode: 'gradient', color: '#4696c8', color2: '#ffffff',
        gradientAnimation: animation, gradientPause: 3, zoom: 1, spacing: 1, dotSize: 0.4 });
    const pixels = data.slice();
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3]) {
        const value = i % 8 ? 255 : 0;
        pixels.set([value,value,value], i);
    }
    const particles = engine.sampleParticles({ width, height }, { getImageData: () => ({ data: pixels }) });
    const context = { createLinearGradient() { return { stops: [], addColorStop(position, color) { this.stops.push({ position, color }); } }; } };
    const palette = engine.gradientFramePalette(context, animation === 'breathe' ? 0 : 7);
    assert.ok(Array.isArray(palette));
    assert.ok(palette.filter(Boolean).length <= 17, 'Palette cost is bounded independently of particle count');
    assert.ok(particles.some(p => p.shadeIndex === 0) && particles.some(p => p.shadeIndex === 16));
    if (animation === 'static') {
        assert.equal(palette[0].stops[0].color, 'rgb(42, 90, 120)');
        assert.equal(palette[16].stops[0].color, 'rgb(98, 210, 255)');
        assert.equal(palette[0].stops.at(-1).color, 'rgb(153, 153, 153)');
    } else {
        assert.equal(palette[0], 'rgb(42, 90, 120)');
        assert.equal(palette[16], 'rgb(98, 210, 255)');
    }
    // Every motion renderer must choose the matching shade, not the raw gradient.
    const draw = { fillStyle: null, seen: [], fillRect() { this.seen.push(this.fillStyle); } };
    const sample = [particles.find(p => p.shadeIndex === 0), particles.find(p => p.shadeIndex === 16)];
    for (const method of ['renderStatic','renderWave','renderFloat','renderUndulate','renderRadialScale','renderHeartbeat','renderRipple']) {
        draw.seen.length = 0;
        if (method === 'renderStatic') engine[method](draw, sample, palette);
        else engine[method](draw, sample, 1, palette);
        assert.deepEqual(draw.seen, [palette[0], palette[16]]);
    }
    engine.options.preserveShading = false;
    assert.ok(!Array.isArray(engine.gradientFramePalette(context, 7)), 'Off retains one direct gradient fill');
}
// Canvas whitespace and pointer motion must not move the spatial color anchor.
for (const angle of [0, 45, 90, 180, 315]) {
    const engine = new ParticleWordmarkEngine(containerStub, { color: '#000000', color2: '#ffffff', zoom: 2,
        spacing: 2, dotSize: 0.6, gradientAngle: angle, gradientArea: 10, gradientTransition: 60 });
    engine.scale = 2;
    const particles = engine.sampleParticles({ width, height }, { getImageData: () => ({ data }) });
    const radians = angle * Math.PI / 180, dx = Math.sin(radians), dy = -Math.cos(radians);
    const projections = particles.map(p => p.hx * dx + p.hy * dy);
    let coordinates;
    const context = { createLinearGradient(...values) { coordinates = values; return { addColorStop() {} }; } };
    engine.cssWidth = 4000; engine.cssHeight = 1000;
    engine.gradientFrameFill(context, 0);
    const project = (x, y) => x * dx + y * dy;
    assert.ok(Math.abs(project(...coordinates.slice(0, 2)) - Math.min(...projections)) < 1e-9);
    assert.ok(Math.abs(project(...coordinates.slice(2)) - Math.max(...projections)) < 1e-9);
    const original = [...coordinates];
    engine.cssWidth *= 2; engine.cssHeight *= 2;
    particles.forEach(p => { p.x += 500; p.y -= 400; });
    engine.gradientFrameFill(context, 0);
    assert.deepEqual(coordinates, original, 'Gradient follows home positions, not motion or blank canvas size');
}
// Disabling adaptive sizing bypasses both the gap cap and edge reduction.
for (const dotSize of [0.1, 0.7, 1]) {
    const engine = new ParticleWordmarkEngine(containerStub, { color: '#ffffff', color2: '#ffffff', zoom: 2,
        spacing: 1, dotSize, adaptiveSize: false });
    engine.scale = 2;
    engine.inkEdgeDistances = () => assert.fail('Uniform sizing should skip contour computation');
    const particles = engine.sampleParticles({ width, height }, { getImageData: () => ({ data }) });
    assert.ok(particles.length > 0);
    assert.ok(particles.every(p => p.radius === Math.max(0.2, dotSize) * 2), 'Every particle uses the uniform radius, with a 0.2 lower bound');
}
// Edge dots stay within the ink unless the 0.2 minimum needs a slight overhang.
for (const scale of [1, 2.25, 3]) {
    for (const spacing of [1, 1.1, 1.7, 2.5, 3, 8]) {
        for (const dotSize of [0.1, 0.5, 1, 3]) {
            const engine = new ParticleWordmarkEngine(containerStub, {
                color: '#ffffff', color2: '#ffffff', zoom: 2, spacing, dotSize,
                canvasPaddingTop: 0, canvasPaddingBottom: 0,
                repulsionRadius: 84, repulsionStrength: 0.8,
            });
            engine.scale = scale;
            const particles = engine.sampleParticles({ width, height }, { getImageData: () => ({ data }) });
            for (const p of particles) {
                assert.ok(p.radius >= 0.2 * 2, 'Adaptive particles must never become smaller than 0.2 before zoom');
                const x = p.hx * scale / 2, y = p.hy * scale / 2, r = p.radius * scale / 2;
                for (let py = Math.ceil(y - r); py <= Math.floor(y + r); py++) {
                    for (let px = Math.ceil(x - r); px <= Math.floor(x + r); px++) {
                        if (p.radius > 0.2 * 2) assert.equal(data[(py * width + px) * 4 + 3], 255,
                            `Particle above the minimum outside ink: scale=${scale}, spacing=${spacing}, size=${dotSize}, x=${x}, y=${y}, r=${r}, px=${px}, py=${py}`);
                    }
                }
            }
        }
    }
}
// A wide canvas must not produce a wider halo. Core brightness uses the exact
// sharp image; translucent outer halos go underneath with bounded strength.
const normalization = [];
sandbox.createEl = () => ({ getContext: () => ({ clearRect() {}, save() {}, restore() {}, drawImage() {
    if (this.globalCompositeOperation === 'source-over') normalization.push(this.globalAlpha);
} }) });
const glowEngine = new ParticleWordmarkEngine(containerStub, { color: '#000000', color2: '#ffffff', zoom: 1, glow: 1 });
glowEngine.renderScale = 2;
assert.equal(glowEngine.resolveGlowChain(640, 320).at(-1).width, 40);
assert.equal(glowEngine.resolveGlowChain(1280, 640).at(-1).width, 80);
const cached = glowEngine.resolveGlowChain(1280, 640);
assert.equal(glowEngine.resolveGlowChain(1280, 640), cached);
glowEngine.canvas = { width: 1280, height: 640 };
const passes = [];
glowEngine.applyGlow({ save() {}, restore() {}, setTransform() {}, drawImage() {
    passes.push({ mode: this.globalCompositeOperation, alpha: this.globalAlpha });
} });
assert.deepEqual(passes, [{ mode: 'screen', alpha: 0.65 }, { mode: 'destination-over', alpha: 0.25 }, { mode: 'destination-over', alpha: 0.55 }]);
assert.deepEqual(normalization, [1, 1, 1, 1], '100% glow compensates a 25% dot coverage without raising final opacity');
normalization.length = 0;
passes.length = 0;
glowEngine.glow = 0.5;
glowEngine.applyGlow({ save() {}, restore() {}, setTransform() {}, drawImage() {
    passes.push({ mode: this.globalCompositeOperation, alpha: this.globalAlpha });
} });
assert.deepEqual(passes, [{ mode: 'screen', alpha: 0.325 }, { mode: 'destination-over', alpha: 0.125 }, { mode: 'destination-over', alpha: 0.275 }]);
assert.deepEqual(normalization, [0.75, 0.75], 'Low strengths use less compensation');
normalization.length = 0;
passes.length = 0;
glowEngine.glow = 0;
glowEngine.applyGlow({ drawImage() { assert.fail('Disabled glow must skip drawing'); } });
assert.equal(passes.length, 0);
assert.equal(normalization.length, 0);
glowEngine.glow = 1;
glowEngine.glowDensity = 1;
glowEngine.applyGlow({ save() {}, restore() {}, setTransform() {}, drawImage() {} });
assert.equal(normalization.length, 0, 'Solid coverage must not get the gain used by sparse particles');
glowEngine.glowDensity = 0.01;
glowEngine.applyGlow({ save() {}, restore() {}, setTransform() {}, drawImage() {} });
assert.equal(normalization.length, 10, 'Extremely sparse gain remains bounded to five small-buffer passes per layer');
// Vertical safety space is per-side CSS pixels, not multiplied by zoom, and
// does not change the gradient's span or the particles' horizontal positions.
for (const [value, expected] of [[undefined, 50], [NaN, 50], [-5, 0], [0, 0], [50, 50], [200, 150]]) {
    assert.equal(normalizeParticleCanvasPadding(value), expected);
}
const padded = new ParticleWordmarkEngine(containerStub, { color: '#ffffff', color2: '#ffffff', zoom: 1.9, spacing: 2, dotSize: 0.5 });
const unpadded = new ParticleWordmarkEngine(containerStub, { color: '#ffffff', color2: '#ffffff', zoom: 1.9, spacing: 2, dotSize: 0.5, canvasPaddingTop: 0, canvasPaddingBottom: 0 });
padded.updateCanvasDimensions(1318.23, 93.99);
unpadded.updateCanvasDimensions(1318.23, 93.99);
assert.equal(padded.cssWidth, 2505);
assert.equal(padded.cssHeight, 259);
assert.equal(unpadded.cssHeight, 179);
const getParticles = engine => engine.sampleParticles({ width, height }, { getImageData: () => ({ data }) });
const withPadding = getParticles(padded), withoutPadding = getParticles(unpadded);
assert.equal(withPadding.length, withoutPadding.length);
withPadding.forEach((p, i) => {
    assert.equal(p.hx, withoutPadding[i].hx);
    assert.ok(Math.abs(p.hy - withoutPadding[i].hy - 50) < 1e-10);
});
const asymmetric = new ParticleWordmarkEngine(containerStub, { color: '#ffffff', color2: '#ffffff', zoom: 1.9, spacing: 2, dotSize: 0.5, canvasPaddingTop: 10, canvasPaddingBottom: 90 });
asymmetric.updateCanvasDimensions(1318.23, 93.99);
assert.equal(asymmetric.cssHeight, 279);
getParticles(asymmetric).forEach((p, i) => {
    assert.equal(p.hx, withoutPadding[i].hx);
    assert.ok(Math.abs(p.hy - withoutPadding[i].hy - 10) < 1e-10, 'Bottom padding must not shift particle positions');
});
assert.equal(normalizeParticleCanvasPadding(undefined, 30), 30);
// Clearing a fractional CSS box misses the rounded-up final device row/column.
// Drive the real frame path and require an identity-transform bitmap clear.
const renderEngine = new ParticleWordmarkEngine({ ownerDocument: { defaultView: { performance: { now: () => 0 } } } },
    { color: '#ffffff', color2: '#ffffff', zoom: 1, glow: 0, ambientMotion: 'none' });
renderEngine.cssWidth = 100.1; renderEngine.cssHeight = 40.2;
renderEngine.canvas = { width: 226, height: 91 };
const clearing = [];
renderEngine.renderContext = { save() { clearing.push('save'); }, setTransform(...values) { clearing.push(values); },
    clearRect(...values) { clearing.push(values); }, restore() { clearing.push('restore'); } };
renderEngine.render();
assert.deepEqual(clearing, ['save', [1, 0, 0, 1, 0, 0], [0, 0, 226, 91], 'restore']);
console.log(`Particle sampling passed: ${cases} scale/spacing/color cases, glyph boundaries, gradient area/transition/loops.`);

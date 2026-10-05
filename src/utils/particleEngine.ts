/**
 * Particle wordmark engine.
 *
 * Rasterizes the home tab logo and/or title onto an offscreen canvas, samples
 * the pixels into a grid of physics particles, and animates them on an overlay
 * canvas, repelling them around the cursor (Arknights-website-style ripple).
 * Touch platforms have no hover: there each tap fires a one-shot radial burst
 * that spreads outward and springs back home.
 *
 * Pure TypeScript on purpose: no Svelte and no Obsidian imports, so it stays
 * reusable and testable outside the plugin UI layer.
 */

export type ParticleColorMode = 'original' | 'monochrome' | 'gradient'
export type GradientAnimation = 'static' | 'cycle' | 'breathe'

export interface ParticleWordmarkOptions {
    colorMode: ParticleColorMode
    color: string
    /** Second gradient color (gradient mode only). */
    color2: string
    /** Keep source luminance in monochrome and gradient modes (default true). */
    preserveShading: boolean
    /** How the gradient animates over time (gradient mode only). */
    gradientAnimation: GradientAnimation
    /** Gradient direction in CSS degrees (0° = to top, 180° = to bottom). */
    gradientAngle: number
    /** Share of the second color in each spatial gradient, 10–90%. */
    gradientArea: number
    /** Transition softness, 0 (sharp edge) to 100 (widest blend for this area). */
    gradientTransition: number
    /** Gradient animation speed multiplier (cycle/breathe). */
    gradientFrequency: number
    /** Pause after each cycling loop or at each breathing color, in seconds. */
    gradientPause: number
    /** Idle motion speed multiplier (heartbeat: beats per interval). */
    motionFrequency: number
    /** Enlargement of the canvas content relative to the original wordmark box. */
    zoom: number
    /** Lattice spacing between sampled particles, CSS pixels. */
    spacing: number
    /** Radius of a single particle, CSS pixels (before zoom). */
    dotSize: number
    /** Preserve particle gaps and shrink particles near the glyph edge (default true). */
    adaptiveSize: boolean
    /** Vertical safety space, in CSS pixels after zoom (defaults: top 50, bottom 30). */
    canvasPaddingTop: number
    canvasPaddingBottom: number
    /** Keep the wrapper's reserved space in sync after responsive resampling. */
    onLayoutChange?: () => void
    /** Radius of the cursor disturbance area, CSS pixels. */
    repulsionRadius: number
    /** How strongly the cursor pushes particles away. */
    repulsionStrength: number
    /** Soft cursor-field decay, 0.1–2; omitted preserves the legacy field. */
    disturbanceFalloff?: number
    /** Reverse pointer translation with a subtle perspective tilt (desktop only). */
    parallax?: boolean
    /**
     * How fast a disturbed particle settles back home — the knob behind the
     * "linger vs snap" feel of the cursor ripple. 1 is the default ripple
     * (visibly underdamped, a few overshoots); lower values let the wave
     * linger longer, higher values snap back. Clamped to the supported range.
     */
    recoverySpeed: number
    /** Additional recovery damping, 0 (legacy bounce) to 1 (smooth settling). */
    recoveryDamping?: number
    /** Idle motion applied on top of the physics, computed at draw time only. */
    ambientMotion: AmbientMotion
}

export type AmbientMotion = 'none' | 'wave' | 'float' | 'undulate' | 'pulse' | 'ripple' | 'breathe'

export function normalizeParticleCanvasPadding(value: number | undefined, fallback = 50): number {
    const padding = value ?? fallback
    return Number.isFinite(padding) ? Math.round(Math.min(Math.max(padding, 0), 150)) : fallback
}

export interface DisturbanceProfile {
    range: number
    samples: Float32Array
    quadratic: boolean
}

/** Bake a smooth, finite tail once, avoiding exponentials inside the particle loop. */
export function createDisturbanceProfile(falloff?: number): DisturbanceProfile {
    const legacy = falloff === undefined
    const decay = Number.isFinite(falloff) ? Math.min(2, Math.max(0.1, falloff ?? 0.75)) : 0.75
    const range = legacy ? 1 : Math.pow(Math.log(100), 1 / (2 * decay))
    const samples = new Float32Array(1025)
    for (let i = 0; i < samples.length; i++) {
        const fraction = i / 1024
        samples[i] = legacy ? (1 - fraction) * (1 - fraction)
            : Math.max(0, (Math.exp(-Math.pow(fraction * fraction * range, 2 * decay)) - 0.01) / 0.99)
    }
    samples[1024] = 0
    return { range, samples, quadratic: !legacy }
}

export function disturbanceWeight(distance: number, radius: number, profile: DisturbanceProfile): number {
    if (radius <= 0) return 0
    const fraction = Math.max(0, distance / (radius * profile.range))
    const index = (profile.quadratic ? Math.sqrt(fraction) : fraction) * 1024
    if (index >= 1024) return 0
    const left = Math.floor(index)
    return profile.samples[left] + (profile.samples[left + 1] - profile.samples[left]) * (index - left)
}

/** Invert the tilted canvas plane without reading computed styles or DOM matrices. */
export function mapParallaxPointer(x: number, y: number, shiftX: number, shiftY: number, pitch: number, yaw: number): { x: number; y: number } {
    const rx = pitch * Math.PI / 180, ry = yaw * Math.PI / 180
    const sx = Math.sin(rx), cx = Math.cos(rx), sy = Math.sin(ry), cy = Math.cos(ry)
    const u = x - shiftX, v = y - shiftY
    const a = cy - u * sy / 1000, b = sy * sx + u * cy * sx / 1000
    const c = -v * sy / 1000, d = cx + v * cy * sx / 1000
    const determinant = a * d - b * c
    if (Math.abs(determinant) < 0.000001) return { x: u, y: v }
    return { x: (u * d - b * v) / determinant, y: (a * v - u * c) / determinant }
}

// Offscreen raster headroom. Glyph ink can overflow the measured content box
// (CJK descenders, tight line boxes), and a build that runs during a layout
// shift can measure a box smaller than the final one; without headroom the
// overflowing ink is clipped exactly at the raster edge and the sampled
// boundary pixels turn into a permanent line of dots on the canvas edge.
// The pad is translated away before sampling, so particle positions are
// unaffected — overflow ink simply falls outside the canvas instead of
// piling up on its boundary.
const RASTER_PAD_MIN = 8 // CSS px
const RASTER_PAD_MAX = 48 // CSS px
const RASTER_PAD_RATIO = 0.08 // fraction of the content height
// Samples this close to the content-box edge are dropped. The anti-aliased
// bottom fringe of glyph ink (CJK fonts in particular) sits within a pixel or
// two of the line-box edge; sampling it turns into a thin dotted line stuck
// to the canvas edge. Real ink never comes this close to the box edge.
const RASTER_CONTENT_INSET = 2 // CSS px

function rasterPadFor(contentHeight: number): number {
    return Math.min(RASTER_PAD_MAX, Math.max(RASTER_PAD_MIN, Math.round(contentHeight * RASTER_PAD_RATIO)))
}

interface Particle {
    x: number
    y: number
    hx: number
    hy: number
    vx: number
    vy: number
    radius: number
    fill: string
    /** One of 17 brightness levels used by the gradient palette. */
    shadeIndex: number
}

type ParticleFrameFill = CanvasGradient | string | (CanvasGradient | string)[] | null

interface RGB {
    r: number
    g: number
    b: number
}

type DrawOp =
    | { kind: 'text'; element: HTMLHeadingElement; offsetX: number; offsetY: number }
    | { kind: 'image'; element: HTMLImageElement; offsetX: number; offsetY: number; width: number; height: number }
    | { kind: 'svg'; element: SVGSVGElement; offsetX: number; offsetY: number; width: number; height: number }

interface CapturedSources {
    ops: DrawOp[]
    hiddenElements: HTMLElement[]
    /**
     * Sources that exist in the DOM but could not be measured (zero-size box,
     * e.g. a freshly mounted preview or a still-settling layout). Building
     * with them would silently drop the logo or the title from the particles,
     * so the build treats them as "not ready yet" and bails instead.
     */
    pending: number
}

// Cursor-ripple physics. Every particle is pulled back to its home position by
// a spring and bled of velocity by damping; that pair is what decides how long
// a disturbance keeps moving, i.e. how much the interaction reads as a "wave"
// instead of a snap-back.
//
// The solver is step based — one step per animation frame — so raw
// spring/damping constants are *per frame* values that only mean the same thing
// at the same refresh rate: the same pair settles twice as fast in wall-clock
// time on a 120 Hz display as on 60 Hz. step() therefore receives the frame
// delta measured in 60 Hz reference frames and scales both terms by it, so the
// ripple keeps its pace on 60/120 Hz and through throttled frames, while a
// 60 Hz display still integrates one reference step per frame.
//
// The user-facing recovery speed scales both terms together, so it changes the
// whole response proportionally (ω and the decay rate both grow with it) and
// the damping ratio only mildly (ζ ∝ √speed). At the default (1) the ripple is
// clearly underdamped — several visible overshoots over roughly a second; at
// the slow end (0.6) it lingers noticeably longer, at the fast end (2.5) it is
// close to the old instant snap-back. The extremes stay well inside the
// stability region even when a stalled frame is clamped to MAX_FRAME_STEPS.
const REFERENCE_FRAME_MS = 1000 / 60
const BASE_SPRING_STRENGTH = 0.011 // per 60 Hz frame at speed 1: ω ≈ 0.105 rad/frame (~1 s period)
const BASE_DAMPING_RATE = 0.042 // per 60 Hz frame at speed 1: velocity half-life ≈ 0.55 s
const RECOVERY_SPEED_DEFAULT = 1.4
const RECOVERY_SPEED_MIN = 0.6
const RECOVERY_SPEED_MAX = 2.5
const MAX_FRAME_STEPS = 3 // a stalled frame (hidden tab, long task) counts as at most 3 reference steps
const MAX_PARTICLES = 15000
const RESIZE_DEBOUNCE_MS = 200
const MIN_ALPHA = 128
const TOUCH_REPULSION_FACTOR = 0.85
// Touch devices have no hover: instead of the persistent cursor repulsion
// field, every tap fires a one-shot radial burst. The burst radius is a bit
// wider than the cursor field (fingers are imprecise) and the impulse is
// scaled up so a single frame's kick still reads as a splash; the regular
// spring + damping physics then pull everything back home, so the burst
// always recovers on its own — no pointer position is ever left behind.
const TOUCH_BURST_RADIUS_FACTOR = 1.25
const TOUCH_BURST_IMPULSE = 1.6
const MAX_ZOOM = 4
const LUMA_REFERENCE = 128
const SHADE_MIN = 0.6
const SHADE_MAX = 1.4
const SHADE_STEP = 0.05

// Ambient (idle) motion. The offsets are applied at draw time only: the
// physics in step() stays untouched, so cursor ripples keep behaving exactly
// as before and 'none' costs nothing beyond an untouched branch. Whole-image
// modes (float/pulse/breathe) evaluate their shape once per frame; only wave
// and ripple do per-particle work (one table lookup each).
const AMBIENT_AMPLITUDE = 1.6 // CSS px, peak per-particle offset of wave/ripple
const WAVE_SPEED = 2.4 // rad/s: wave cycle of ~2.6s
const WAVE_NUMBER = 0.045 // rad per CSS px: spatial wavelength of ~140px, so a few crests sweep across the wordmark diagonally
const FLOAT_SPEED = 1.4 // rad/s: float cycle of ~4.5s
const FLOAT_AMPLITUDE = 2.4 // CSS px, whole-wordmark vertical bob
const UNDULATE_SPEED = 1.6 // rad/s: undulate cycle of ~3.9s
const UNDULATE_NUMBER = 0.026 // rad per CSS px: standing-wave envelope wavelength of ~240px along x
const UNDULATE_AMPLITUDE = 2.0 // CSS px, peak vertical excursion of an antinode
const HEARTBEAT_SPEED = 5.2 // rad/s: heartbeat cycle of ~1.2s (~50 bpm)
const HEARTBEAT_LAG = 0.9 // rad between the "lub" and the "dub" peaks
const HEARTBEAT_SECOND_BEAT = 0.55 // relative height of the "dub"
const HEARTBEAT_NUMBER = 0.008 // rad per CSS px: the beat travels ~650px/s, so it visibly radiates outward layer by layer
const HEARTBEAT_SCALE_INNER = 0.004 // radial stretch near the center (smallest)
const HEARTBEAT_SCALE_OUTER = 0.018 // radial stretch at the rim (largest)
const BREATHE_SPEED = 1.1 // rad/s: breathe cycle of ~5.7s
const BREATHE_SCALE = 0.015 // peak radial expansion (1.5%)
const RIPPLE_SPEED = 3.0 // rad/s: ripple phase drift
const RIPPLE_NUMBER = 0.05 // rad per CSS px: ring wavelength of ~125px
const RIPPLE_AMPLITUDE = 1.4 // CSS px, radial excursion of a ring crest
// Gradient animation paces (seconds per full pattern cycle at 1× frequency).
const CYCLE_BASE_PERIOD = 6 // the alternating stop pattern scrolls one gradient-length
const BREATHE_BASE_PERIOD = 4 // color A fades to B and back to A

// Sine lookup table: idle motion replaces up-to-15k Math.sin calls per frame
// with one array lookup each. Bitwise masking below also folds negative or
// multi-turn phases into range for free.
const SIN_LUT_BITS = 10
const SIN_LUT_SIZE = 1 << SIN_LUT_BITS
const SIN_LUT_SCALE = SIN_LUT_SIZE / (Math.PI * 2)
const SIN_LUT = (() => {
    const table = new Float32Array(SIN_LUT_SIZE)
    for (let i = 0; i < SIN_LUT_SIZE; i++) table[i] = Math.sin((i / SIN_LUT_SIZE) * Math.PI * 2)
    return table
})()

/** Table sine; the mask keeps the index in [0, SIN_LUT_SIZE) for any finite phase. */
function lutSin(phase: number): number {
    return SIN_LUT[(phase * SIN_LUT_SCALE) & (SIN_LUT_SIZE - 1)]
}

/**
 * "Lub-dub" heartbeat shape: two unequal sharp peaks per cycle with a quiet
 * gap between beats (a plain sine reads as swinging, not beating). sin^6
 * clamps each half-wave into one narrow bump; the lagged, weaker second bump
 * is the "dub". Evaluated once per frame, so the six multiplies are free.
 */
function heartbeatShape(phase: number): number {
    const a = lutSin(phase)
    const b = lutSin(phase - HEARTBEAT_LAG)
    const lub = a > 0 ? a * a * a * a * a * a : 0
    const dub = b > 0 ? b * b * b * b * b * b : 0
    return lub + HEARTBEAT_SECOND_BEAT * dub
}

export class ParticleWordmarkEngine {
    private readonly container: HTMLElement
    private readonly options: ParticleWordmarkOptions
    private readonly repulsionRadius: number
    private readonly repulsionStrength: number
    private readonly disturbanceProfile: DisturbanceProfile
    private readonly zoom: number
    private readonly canvasPaddingTop: number
    private readonly canvasPaddingBottom: number
    private readonly ambientMotion: AmbientMotion
    private readonly colorMode: ParticleColorMode
    private readonly gradientAnimation: GradientAnimation
    private readonly gradientAngle: number
    private readonly gradientArea: number
    private readonly gradientTransition: number
    private readonly gradientFrequency: number
    private readonly gradientPause: number
    private readonly motionFrequency: number
    private readonly colorA: RGB
    private readonly colorB: RGB
    /** Effective recovery speed (option value clamped to the supported range). */
    private readonly recoverySpeed: number
    /** Touch platforms interact through tap bursts instead of the cursor field. */
    private readonly isTouch: boolean
    /** Spring stiffness per 60 Hz reference frame. */
    private readonly springStrength: number
    /** Velocity decay rate per 60 Hz reference frame (used as exp(-rate × dt)). */
    private readonly dampingRate: number

    private particles: Particle[] = []
    private canvas: HTMLCanvasElement | null = null
    private renderContext: CanvasRenderingContext2D | null = null
    private scale = 1
    /** Native display density; source sampling remains supersampled separately. */
    private renderScale = 1
    private viewportObserver: IntersectionObserver | null = null
    private viewportVisible = true
    private readonly parallaxEnabled: boolean
    private parallaxWindow: Window | null = null
    private parallaxX = 0
    private parallaxY = 0
    private parallaxTargetX = 0
    private parallaxTargetY = 0
    private parallaxTransform = ''
    private parallaxReturning = false
    private parallaxReturnElapsed = 0
    private parallaxReturnX = 0
    private parallaxReturnY = 0

    private readonly handleParallaxMove = (event: MouseEvent): void => {
        const view = this.parallaxWindow
        if (!view || view.innerWidth <= 0 || view.innerHeight <= 0) return
        this.parallaxReturning = false
        this.parallaxTargetX = Math.max(-1, Math.min(1, event.clientX / view.innerWidth * 2 - 1))
        this.parallaxTargetY = Math.max(-1, Math.min(1, event.clientY / view.innerHeight * 2 - 1))
    }

    private readonly handleParallaxLeave = (): void => {
        if (this.parallaxReturning) return
        this.parallaxReturning = true
        this.parallaxReturnElapsed = 0
        this.parallaxReturnX = this.parallaxX
        this.parallaxReturnY = this.parallaxY
        this.parallaxTargetX = 0
        this.parallaxTargetY = 0
    }
    /** Headroom (CSS px) padded around the content box in the offscreen raster. */
    private rasterPad = 0
    private gradientShadeIndices: number[] = []
    private contentWidth = 0
    private contentHeight = 0
    /** Container coords -> canvas-local coords offset (canvas is zoom× wide, centered). */
    private mouseOffsetX = 0
    private mouseOffsetY = 0
    /** Canvas size in CSS pixels = content size × zoom. */
    private cssWidth = 0
    private cssHeight = 0
    /** Stable gradient axis projected from home positions, excluding canvas whitespace. */
    private gradientAxis: { centerX: number; centerY: number; extent: number } | null = null
    private rafId: number | null = null
    private buildToken = 0
    private destroyed = false
    private mouse = { x: -9999, y: -9999 }
    private hiddenElements: { element: HTMLElement; previousVisibility: string }[] = []
    private originalContainerPosition: string | null = null
    private resizeObserver: ResizeObserver | null = null
    private resizeTimer: number | null = null
    /** Timestamp of the previous animation frame, in the container window's clock. */
    private lastFrameTime: number | null = null
    private rebuildTimestamps: number[] = []

    private readonly handleMouseMove = (event: MouseEvent): void => {
        const rect = this.container.getBoundingClientRect()
        // Container coords -> canvas-local coords: the zoomed canvas is
        // centered on the container box.
        this.mouse.x = event.clientX - rect.left + this.mouseOffsetX
        this.mouse.y = event.clientY - rect.top + this.mouseOffsetY
    }

    private readonly handleMouseLeave = (): void => {
        this.mouse.x = -9999
        this.mouse.y = -9999
    }

    /** Tap position in canvas-local coords, feeding a one-shot radial burst. */
    private readonly handleClick = (event: MouseEvent): void => {
        const rect = this.container.getBoundingClientRect()
        this.applyTouchBurst(event.clientX - rect.left + this.mouseOffsetX, event.clientY - rect.top + this.mouseOffsetY)
    }

    private readonly handleVisibilityChange = (): void => {
        if (this.destroyed) return
        // The view (and therefore the container) may live in a popout window:
        // track THAT document's visibility, not the main window's.
        if (this.container.ownerDocument.hidden) {
            this.handleParallaxLeave()
            this.stopLoop()
        } else if (this.canvas && this.viewportVisible) {
            this.startLoop()
        }
    }

    private readonly handleResize = (): void => {
        this.scheduleResample(RESIZE_DEBOUNCE_MS)
    }

    private scheduleResample(delay: number): void {
        if (this.destroyed) return
        const ownerWindow = this.container.ownerDocument.defaultView ?? window
        if (this.resizeTimer !== null) ownerWindow.clearTimeout(this.resizeTimer)
        this.resizeTimer = ownerWindow.setTimeout(() => {
            this.resizeTimer = null
            if (this.destroyed || !this.container.isConnected || !this.canvas) return
            const rect = this.resolveContentRect()
            // ResizeObserver also fires once right after observe(); ignore no-op
            // size changes. Measured in content space (the wordmark container
            // is unaffected by the wrapper's zoom padding), so the check is
            // stable across rebuilds.
            if (Math.abs(rect.width - this.contentWidth) < 1 && Math.abs(rect.height - this.contentHeight) < 1) return
            if (rect.width <= 0 || rect.height <= 0) return
            // Rapid typing, scrollbar changes and pane dragging can all cause
            // real resizes. Bound rebuild work while keeping the live canvas,
            // then retry the latest size after the layout settles.
            const now = Date.now()
            this.rebuildTimestamps = this.rebuildTimestamps.filter((time) => now - time < 3000)
            if (this.rebuildTimestamps.length >= 5) {
                this.scheduleResample(1000)
                return
            }
            this.rebuildTimestamps.push(now)
            void this.resample()
        }, delay)
    }

    constructor(container: HTMLElement, options: ParticleWordmarkOptions) {
        this.container = container
        this.options = options
        // Resolve from the window that hosts the container (popout-safe)
        this.isTouch = 'ontouchstart' in (container.ownerDocument.defaultView ?? window)
        const ownerWindow = container.ownerDocument.defaultView ?? window
        this.parallaxEnabled = options.parallax === true && !this.isTouch
            && !ownerWindow.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        this.repulsionRadius = options.repulsionRadius * (this.isTouch ? TOUCH_REPULSION_FACTOR : 1)
        this.repulsionStrength = options.repulsionStrength
        this.disturbanceProfile = createDisturbanceProfile(options.disturbanceFalloff)
        this.zoom = Math.min(Math.max(options.zoom, 1), MAX_ZOOM)
        this.canvasPaddingTop = normalizeParticleCanvasPadding(options.canvasPaddingTop, 50)
        this.canvasPaddingBottom = normalizeParticleCanvasPadding(options.canvasPaddingBottom, 30)
        this.ambientMotion = options.ambientMotion ?? 'none'
        this.colorMode = options.colorMode ?? 'original'
        this.gradientAnimation = options.gradientAnimation ?? 'static'
        this.gradientAngle = options.gradientAngle ?? 180
        const area = options.gradientArea ?? 30
        this.gradientArea = Number.isFinite(area) ? Math.min(Math.max(area, 10), 90) / 100 : 0.3
        const transition = options.gradientTransition ?? 60
        this.gradientTransition = Number.isFinite(transition) ? Math.min(Math.max(transition, 0), 100) / 100 : 0.6
        this.gradientFrequency = Math.max(options.gradientFrequency ?? 1, 0.01)
        this.gradientPause = Number.isFinite(options.gradientPause) ? Math.min(10, Math.max(0, options.gradientPause)) : 0
        this.motionFrequency = Math.max(options.motionFrequency ?? 1, 0.01)
        this.colorA = parseHexColor(options.color)
        this.colorB = parseHexColor(options.color2)
        // Tolerate an undefined value (settings loaded from an older schema).
        const speed = options.recoverySpeed ?? RECOVERY_SPEED_DEFAULT
        this.recoverySpeed = Math.min(Math.max(speed, RECOVERY_SPEED_MIN), RECOVERY_SPEED_MAX)
        this.springStrength = BASE_SPRING_STRENGTH * this.recoverySpeed
        const damping = Number.isFinite(options.recoveryDamping) ? Math.max(0, Math.min(1, options.recoveryDamping ?? 0)) : 0
        const legacyDamping = BASE_DAMPING_RATE * this.recoverySpeed
        const criticalDamping = 2 * Math.sqrt(this.springStrength)
        this.dampingRate = legacyDamping + (criticalDamping - legacyDamping) * damping
    }

    /**
     * Rasterizes the captured wordmark sources, samples them into particles,
     * and — only when everything succeeded — hides the original elements and
     * starts the animation loop. Resolves to true when the particle canvas
     * took over, false when it fell back to the normal DOM rendering.
     */
    async build(): Promise<boolean> {
        if (this.destroyed || !this.container.isConnected) return false
        const token = ++this.buildToken

        const containerRect = this.resolveContentRect()
        if (containerRect.width <= 0 || containerRect.height <= 0) return false

        const sources = this.collectSources(containerRect)
        if (sources.pending > 0) return false
        if (sources.ops.length === 0) return false

        // Popout windows may sit on a different display: resolve the pixel
        // ratio from the container's own window.
        const scale = Math.max(2, this.container.ownerDocument.defaultView?.devicePixelRatio || 1)
        // Headroom around the measured content box: glyph ink that overflows
        // it (CJK descenders, tight line boxes) or a measurement taken during
        // a layout shift would otherwise be clipped at the raster edge and
        // sampled into a stuck line of dots along the canvas edge.
        const pad = rasterPadFor(containerRect.height)
        const offscreen = createEl('canvas')
        offscreen.width = Math.ceil((containerRect.width + pad * 2) * scale)
        offscreen.height = Math.ceil((containerRect.height + pad * 2) * scale)
        const offscreenContext = offscreen.getContext('2d', { willReadFrequently: true })
        if (!offscreenContext) return false
        offscreenContext.scale(scale, scale)
        offscreenContext.translate(pad, pad)
        this.rasterPad = pad

        for (const op of sources.ops) {
            if (this.destroyed || token !== this.buildToken) return false
            try {
                await this.applyDrawOp(offscreenContext, op)
            } catch (error) {
                console.warn('[home-tab] Particle effect: a wordmark source could not be rasterized and was skipped.', error)
            }
        }
        if (this.destroyed || token !== this.buildToken) return false

        this.scale = scale
        this.renderScale = Math.max(1, this.container.ownerDocument.defaultView?.devicePixelRatio || 1)
        this.updateCanvasDimensions(containerRect.width, containerRect.height)

        try {
            this.particles = this.sampleParticles(offscreen, offscreenContext)
        } catch (error) {
            // A remote logo image without CORS headers taints the canvas and
            // makes getImageData throw: fall back to the normal rendering.
            console.warn('[home-tab] Particle effect: unable to sample the wordmark pixels (a remote logo image can block canvas reads); falling back to the normal rendering.', error)
            this.destroy()
            return false
        }

        if (this.particles.length === 0) return false

        this.activate(sources)
        return true
    }

    /** Fully cleans up: cancels the animation, removes listeners/observers and the canvas, restores the original elements. */
    destroy(): void {
        if (this.destroyed) return
        this.destroyed = true
        this.buildToken++
        this.teardown()
    }

    /**
     * Re-samples the particles in place (container resize, late font load).
     * The canvas, padding and listeners stay alive — zoom is constant on this
     * path, so the reserved layout is unchanged and only the particle array
     * is swapped in a single frame, without any visual flash.
     */
    private async resample(): Promise<void> {
        const token = ++this.buildToken

        // The content element never carries zoom padding (the wrapper does),
        // so this is the exact same coordinate space build() measures in.
        const contentRect = this.resolveContentRect()
        if (contentRect.width <= 0 || contentRect.height <= 0) return

        const scale = Math.max(2, this.container.ownerDocument.defaultView?.devicePixelRatio || 1)
        const sources = this.collectSources(contentRect)
        // A source that is temporarily unmeasurable (or gone) must not wipe
        // the live canvas: keep the current particles instead of resampling.
        if (sources.pending > 0 || sources.ops.length === 0) return
        // Sample-time math (lattice step, content inset) reads this.scale:
        // update it before rasterizing, not only when swapping the result in.
        this.scale = scale
        this.renderScale = Math.max(1, this.container.ownerDocument.defaultView?.devicePixelRatio || 1)
        const pad = rasterPadFor(contentRect.height)
        const offscreen = createEl('canvas')
        offscreen.width = Math.ceil((contentRect.width + pad * 2) * scale)
        offscreen.height = Math.ceil((contentRect.height + pad * 2) * scale)
        const offscreenContext = offscreen.getContext('2d', { willReadFrequently: true })
        if (!offscreenContext) return
        offscreenContext.scale(scale, scale)
        offscreenContext.translate(pad, pad)
        this.rasterPad = pad

        for (const op of sources.ops) {
            if (this.destroyed || token !== this.buildToken) return
            try {
                await this.applyDrawOp(offscreenContext, op)
            } catch (error) {
                console.warn('[home-tab] Particle effect: a wordmark source could not be rasterized and was skipped.', error)
            }
        }
        if (this.destroyed || token !== this.buildToken) return

        try {
            const particles = this.sampleParticles(offscreen, offscreenContext)
            if (this.destroyed || token !== this.buildToken || !this.canvas || !this.renderContext) return
            this.updateCanvasDimensions(contentRect.width, contentRect.height)
            this.particles = particles
            const width = Math.ceil(this.cssWidth * this.renderScale)
            const height = Math.ceil(this.cssHeight * this.renderScale)
            if (this.canvas.width !== width || this.canvas.height !== height) {
                this.canvas.width = width
                this.canvas.height = height
                this.renderContext.setTransform(this.renderScale, 0, 0, this.renderScale, 0, 0)
            }
            this.canvas.setCssStyles({
                width: `${this.cssWidth}px`,
                height: `${this.cssHeight}px`
            })
            this.options.onLayoutChange?.()
        } catch (error) {
            // A remote logo image without CORS headers taints the canvas and
            // makes getImageData throw: fall back to the normal rendering.
            console.warn('[home-tab] Particle effect: unable to sample the wordmark pixels; falling back to the normal rendering.', error)
            this.destroy()
        }
    }

    /** Initial builds and resampling use exactly the same integer CSS dimensions. */
    private updateCanvasDimensions(width: number, height: number): void {
        this.contentWidth = width
        this.contentHeight = height
        this.cssWidth = Math.round(width * this.zoom)
        this.cssHeight = Math.round(height * this.zoom) + this.canvasPaddingTop + this.canvasPaddingBottom
        this.mouseOffsetX = (this.cssWidth - width) / 2
        this.mouseOffsetY = 0
    }

    /** Finds the logo and title sources (always captured together). */
    private collectSources(containerRect: { left: number; top: number }): CapturedSources {
        const ops: DrawOp[] = []
        const hiddenElements: HTMLElement[] = []
        let pending = 0

        {
            const logoContainer = this.container.querySelector<HTMLElement>('.home-tab-logo')
            if (logoContainer) {
                const svg = logoContainer.querySelector<SVGSVGElement>('svg')
                const img = svg ? null : logoContainer.querySelector<HTMLImageElement>('img')
                const target: SVGSVGElement | HTMLImageElement | null = svg ?? img
                if (target) {
                    const rect = target.getBoundingClientRect()
                    if (rect.width > 0 && rect.height > 0) {
                        const offsetX = rect.left - containerRect.left
                        const offsetY = rect.top - containerRect.top
                        if (svg) {
                            ops.push({ kind: 'svg', element: svg, offsetX, offsetY, width: rect.width, height: rect.height })
                        } else if (img) {
                            ops.push({ kind: 'image', element: img, offsetX, offsetY, width: rect.width, height: rect.height })
                        }
                        hiddenElements.push(logoContainer)
                    } else {
                        pending++
                    }
                }
            }
        }

        {
            const heading = this.container.querySelector<HTMLHeadingElement>('.home-tab-wordmark h1')
            if (heading && heading.textContent && heading.textContent.trim().length > 0) {
                const rect = heading.getBoundingClientRect()
                if (rect.width > 0 && rect.height > 0) {
                    ops.push({ kind: 'text', element: heading, offsetX: rect.left - containerRect.left, offsetY: rect.top - containerRect.top })
                    hiddenElements.push(heading)
                } else {
                    pending++
                }
            }
        }

        return { ops, hiddenElements, pending }
    }

    private async applyDrawOp(context: CanvasRenderingContext2D, op: DrawOp): Promise<void> {
        if (op.kind === 'text') {
            this.drawText(context, op.element, op.offsetX, op.offsetY)
        } else if (op.kind === 'image') {
            await this.waitForImage(op.element)
            context.drawImage(op.element, op.offsetX, op.offsetY, op.width, op.height)
        } else {
            const image = await this.rasterizeSvg(op.element)
            context.drawImage(image, op.offsetX, op.offsetY, op.width, op.height)
        }
    }

    /** Draws the heading text with the element's computed font, color and alignment. */
    private drawText(context: CanvasRenderingContext2D, element: HTMLHeadingElement, offsetX: number, offsetY: number): void {
        // Computed styles must be resolved by the element's own window (popout-safe)
        const style = (element.ownerDocument.defaultView ?? window).getComputedStyle(element)
        context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
        context.fillStyle = style.color
        context.textBaseline = 'alphabetic'

        const text = element.textContent ?? ''
        const metrics = context.measureText(text)
        const fontSizePx = parseFloat(style.fontSize) || 0
        // actualBoundingBox* is well supported in Chromium; keep a px fallback anyway.
        const ascent = metrics.actualBoundingBoxAscent || fontSizePx * 0.8
        const descent = metrics.actualBoundingBoxDescent || fontSizePx * 0.2

        const elementRect = element.getBoundingClientRect()
        let x = offsetX
        if (style.textAlign === 'center') {
            x = offsetX + (elementRect.width - metrics.width) / 2
        } else if (style.textAlign === 'right' || style.textAlign === 'end') {
            x = offsetX + elementRect.width - metrics.width
        }
        // Vertically center the glyph box inside the element box, then drop to the baseline.
        const baselineY = offsetY + (elementRect.height - (ascent + descent)) / 2 + ascent
        context.fillText(text, x, baselineY)
    }

    private waitForImage(image: HTMLImageElement): Promise<void> {
        if (image.complete && image.naturalWidth > 0) return Promise.resolve()
        return new Promise((resolve, reject) => {
            image.addEventListener('load', () => resolve(), { once: true })
            image.addEventListener('error', () => reject(new Error('Logo image failed to load')), { once: true })
        })
    }

    /**
     * Serializes the SVG to a data URI image. The clone gets explicit pixel
     * dimensions (serialized SVG cannot parse calc()-based width/height) and
     * the computed color so `currentColor` strokes resolve.
     */
    private rasterizeSvg(element: SVGSVGElement): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const rect = element.getBoundingClientRect()
            const clone = element.cloneNode(true)
            if (clone.instanceOf(SVGSVGElement)) {
                const style = (element.ownerDocument.defaultView ?? window).getComputedStyle(element)
                clone.setAttribute('width', String(rect.width))
                clone.setAttribute('height', String(rect.height))
                clone.style.width = `${rect.width}px`
                clone.style.height = `${rect.height}px`
                clone.setAttribute('color', style.color)
                // Strokes may reference CSS variables (e.g. var(--interactive-accent))
                // that do not resolve inside a standalone SVG image: bake the
                // computed value in so the rasterized icon keeps its color.
                if (style.stroke && style.stroke !== 'none') {
                    clone.setAttribute('stroke', style.stroke)
                }
            }
            const serialized = new XMLSerializer().serializeToString(clone)
            const image = new Image()
            image.onload = () => resolve(image)
            image.onerror = () => reject(new Error('SVG logo image failed to load'))
            image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serialized)
        })
    }

    private sampleParticles(offscreen: HTMLCanvasElement, context: CanvasRenderingContext2D): Particle[] {
        const { data } = context.getImageData(0, 0, offscreen.width, offscreen.height)
        const mono = this.colorMode === 'monochrome' ? parseHexColor(this.options.color) : null
        // A sparse lattice cannot represent thin strokes. Bound legacy values
        // too, without rewriting the user's stored settings.
        const spacing = Number.isFinite(this.options.spacing) ? Math.min(Math.max(this.options.spacing, 1), 3) : 2
        let step = spacing * this.scale // device pixels
        const edges = this.options.adaptiveSize === false ? null : this.inkEdgeDistances(data, offscreen.width, offscreen.height)
        let particles = this.collectParticles(data, edges, offscreen.width, offscreen.height, step, mono)
        while (particles.length > MAX_PARTICLES) {
            step *= 2
            particles = this.collectParticles(data, edges, offscreen.width, offscreen.height, step, mono)
        }
        this.gradientShadeIndices = [...new Set(particles.map(particle => particle.shadeIndex))]
        this.updateGradientAxis(particles)
        return particles
    }

    private updateGradientAxis(particles: Particle[]): void {
        if (particles.length === 0) {
            this.gradientAxis = null
            return
        }
        const angle = this.gradientAngle * Math.PI / 180
        const dx = Math.sin(angle)
        const dy = -Math.cos(angle)
        let min = Infinity, max = -Infinity
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
        for (const particle of particles) {
            const projection = particle.hx * dx + particle.hy * dy
            min = Math.min(min, projection)
            max = Math.max(max, projection)
            minX = Math.min(minX, particle.hx)
            maxX = Math.max(maxX, particle.hx)
            minY = Math.min(minY, particle.hy)
            maxY = Math.max(maxY, particle.hy)
        }
        const x = (minX + maxX) / 2, y = (minY + maxY) / 2
        const shift = (min + max) / 2 - (x * dx + y * dy)
        this.gradientAxis = { centerX: x + dx * shift, centerY: y + dy * shift, extent: Math.max(0.5, (max - min) / 2) }
    }

    /** Square distance to transparent ink, computed once per raster, never per frame. */
    private inkEdgeDistances(data: Uint8ClampedArray, width: number, height: number): Uint16Array {
        const distances = new Uint16Array(width * height)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = y * width + x
                if (data[i * 4 + 3] <= MIN_ALPHA) continue
                if (x === 0 || y === 0 || x === width - 1 || y === height - 1) distances[i] = 1
                else distances[i] = 1 + Math.min(distances[i - 1], distances[i - width - 1], distances[i - width], distances[i - width + 1])
            }
        }
        for (let y = height - 2; y > 0; y--) {
            for (let x = width - 2; x > 0; x--) {
                const i = y * width + x
                if (distances[i]) distances[i] = Math.min(distances[i], 1 + Math.min(distances[i + 1], distances[i + width - 1], distances[i + width], distances[i + width + 1]))
            }
        }
        return distances
    }

    private collectParticles(data: Uint8ClampedArray, edges: Uint16Array | null, width: number, height: number, step: number, mono: RGB | null): Particle[] {
        const particles: Particle[] = []
        const size = Number.isFinite(this.options.dotSize) ? Math.min(Math.max(this.options.dotSize, 0.2), 1) : 0.5
        // Keep at least 20% air between adjacent particles, even at maximum size.
        const radius = edges ? Math.min(size, step / this.scale * 0.4) : size
        // Content box in device pixels (the raster pads it by rasterPad on
        // every side); samples on or beyond its inset border are dropped —
        // that is where clipped ink and glyph fringes would smear into a
        // line of dots along the canvas edge.
        const inset = RASTER_CONTENT_INSET * this.scale
        const minX = this.rasterPad * this.scale + inset
        const maxX = width - this.rasterPad * this.scale - inset
        const minY = minX
        const maxY = height - this.rasterPad * this.scale - inset
        for (let y = Math.max(1, Math.floor(step / 2)); y < height - 1; y += step) {
            if (y < minY || y > maxY) continue
            for (let x = Math.max(1, Math.floor(step / 2)); x < width - 1; x += step) {
                if (x < minX || x > maxX) continue
                // Spacing × devicePixelRatio can be fractional. Keep the lattice
                // positions, but sample whole pixels so RGBA channels stay aligned.
                const index = (Math.floor(y) * width + Math.floor(x)) * 4
                if (data[index + 3] <= MIN_ALPHA) continue
                // Content coords -> canvas-local coords: the rasterized content
                // is drawn centered on the zoomed canvas, so positions scale by zoom.
                // The raster pad is translated headroom, not content: subtract it
                // before mapping into canvas space.
                const hx = (x / this.scale - this.rasterPad) * this.zoom
                const hy = (y / this.scale - this.rasterPad) * this.zoom + this.canvasPaddingTop
                const luma = (data[index] + data[index + 1] + data[index + 2]) / 3
                const shade = Math.min(SHADE_MAX, Math.max(SHADE_MIN, luma / LUMA_REFERENCE))
                const shadeIndex = Math.round((shade - SHADE_MIN) / SHADE_STEP)
                let fill: string
                if (mono) {
                    fill = rgbFillString(shadeRgb(mono, this.options.preserveShading === false ? 1 : shade))
                } else {
                    fill = rgbFillString({ r: data[index], g: data[index + 1], b: data[index + 2] })
                }
                particles.push({
                    x: hx,
                    y: hy,
                    hx,
                    hy,
                    vx: 0,
                    vy: 0,
                    // Shrink boundary particles so enlarged dots retain the
                    // source silhouette rather than spilling into counters/gaps.
                    radius: (edges ? Math.max(0.2, Math.min(radius, (edges[index / 4] - 0.5 - Math.max(x % 1, y % 1)) / this.scale)) : radius) * this.zoom,
                    fill,
                    shadeIndex,
                })
            }
        }
        return particles
    }

    /** Takes over the rendering: overlay canvas + hidden originals + listeners + animation loop. */
    private activate(sources: CapturedSources): void {
        this.installCanvas()
        if (this.parallaxEnabled) {
            this.parallaxWindow = this.container.ownerDocument.defaultView ?? window
            this.parallaxWindow.document.addEventListener('mousemove', this.handleParallaxMove, { passive: true, capture: true })
            this.parallaxWindow.document.addEventListener('mouseleave', this.handleParallaxLeave)
            this.parallaxWindow.addEventListener('blur', this.handleParallaxLeave)
        }
        this.hideCapturedElements(sources.hiddenElements)
        if (this.isTouch) {
            // Touch has no hover: taps fire a one-shot burst. Keeping a
            // persistent pointer position (mousemove without mouseleave)
            // would repel the same spot forever and the particles would
            // never recover — exactly what the burst model avoids.
            this.container.addEventListener('click', this.handleClick, { passive: true })
        } else {
            this.container.addEventListener('mousemove', this.handleMouseMove, { passive: true })
            this.container.addEventListener('mouseleave', this.handleMouseLeave)
        }
        this.container.ownerDocument.addEventListener('visibilitychange', this.handleVisibilityChange)
        const ownerWindow = this.container.ownerDocument.defaultView ?? window
        this.viewportObserver = new ownerWindow.IntersectionObserver(([entry]) => {
            this.viewportVisible = entry.isIntersecting
            if (!this.viewportVisible) this.stopLoop()
            else if (!this.container.ownerDocument.hidden) this.startLoop()
        })
        this.viewportObserver.observe(this.container)
        this.resizeObserver = new ResizeObserver(this.handleResize)
        this.resizeObserver.observe(this.container)
        this.startLoop()
    }

    /**
     * The content element the particle mapping is derived from: the wordmark
     * container inside the wrapper. Measuring this (instead of the wrapper,
     * which carries the zoom padding reserved by the component) keeps every
     * coordinate in content space, both for build and resample.
     */
    private resolveContentRect(): DOMRect {
        const content = this.container.querySelector<HTMLElement>('.home-tab-wordmark-container')
        return (content ?? this.container).getBoundingClientRect()
    }

    private installCanvas(): void {
        const canvas = this.container.createEl('canvas')
        canvas.className = 'home-tab-particle-canvas'
        canvas.width = Math.ceil(this.cssWidth * this.renderScale)
        canvas.height = Math.ceil(this.cssHeight * this.renderScale)
        // The zoomed canvas is centered on the container box: it overflows
        // symmetrically with transparent pixels; the mouse position is mapped
        // with mouseOffsetX/Y.
        canvas.setCssStyles({
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${this.cssWidth}px`,
            height: `${this.cssHeight}px`,
            display: 'block',
            pointerEvents: 'none',
            opacity: '0',
            transition: 'opacity 0.4s ease',
            ...(this.parallaxEnabled ? { willChange: 'transform' } : {})
        })

        const context = canvas.getContext('2d')
        if (!context) return
        // Draw in CSS pixels; the transform maps them to device pixels.
        context.setTransform(this.renderScale, 0, 0, this.renderScale, 0, 0)

        this.originalContainerPosition = this.container.style.position
        if (!this.container.style.position) this.container.setCssStyles({ position: 'relative' })
        this.container.appendChild(canvas)
        this.canvas = canvas
        this.renderContext = context
        window.requestAnimationFrame(() => {
            if (this.canvas === canvas) canvas.setCssStyles({ opacity: '1' })
        })
    }

    /** visibility:hidden (never display:none) so the layout metrics are preserved and the page does not shift. */
    private hideCapturedElements(elements: HTMLElement[]): void {
        this.hiddenElements = elements.map((element) => {
            const previousVisibility = element.style.visibility
            element.setCssStyles({ visibility: 'hidden' })
            return { element, previousVisibility }
        })
    }

    private restoreCapturedElements(): void {
        for (const { element, previousVisibility } of this.hiddenElements) {
            element.setCssStyles({ visibility: previousVisibility })
        }
        this.hiddenElements = []
    }

    private teardown(): void {
        if (this.resizeTimer !== null) {
            (this.container.ownerDocument.defaultView ?? window).clearTimeout(this.resizeTimer)
            this.resizeTimer = null
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect()
            this.resizeObserver = null
        }
        this.container.removeEventListener('mousemove', this.handleMouseMove)
        this.container.removeEventListener('mouseleave', this.handleMouseLeave)
        this.container.removeEventListener('click', this.handleClick)
        this.container.ownerDocument.removeEventListener('visibilitychange', this.handleVisibilityChange)
        this.parallaxWindow?.document.removeEventListener('mousemove', this.handleParallaxMove, true)
        this.parallaxWindow?.document.removeEventListener('mouseleave', this.handleParallaxLeave)
        this.parallaxWindow?.removeEventListener('blur', this.handleParallaxLeave)
        this.parallaxWindow = null
        this.viewportObserver?.disconnect()
        this.viewportObserver = null
        this.stopLoop()
        if (this.canvas) {
            this.canvas.remove()
            this.canvas = null
            this.renderContext = null
        }
        this.restoreCapturedElements()
        if (this.originalContainerPosition !== null) {
            this.container.setCssStyles({ position: this.originalContainerPosition })
            this.originalContainerPosition = null
        }
        this.particles = []
    }

    private startLoop(): void {
        if (this.destroyed || !this.viewportVisible || this.container.ownerDocument.hidden || this.rafId !== null) return
        // The loop may restart after the view was hidden: measure the delta
        // from the first real frame instead of from the pause.
        this.lastFrameTime = null
        const frame = (): void => {
            this.rafId = null
            if (this.destroyed) return
            if (!this.container.isConnected) {
                this.destroy()
                return
            }
            const now = this.now()
            // Frame delta in 60 Hz reference frames (1 = 16.7 ms), clamped so a
            // stalled frame simulates a short hitch instead of jumping ahead.
            const dt = this.lastFrameTime === null
                ? 1
                : Math.min(Math.max((now - this.lastFrameTime) / REFERENCE_FRAME_MS, 0), MAX_FRAME_STEPS)
            this.lastFrameTime = now
            if (this.parallaxEnabled) this.updateParallax(dt)
            this.step(dt)
            this.render()
            this.rafId = window.requestAnimationFrame(frame)
        }
        this.rafId = window.requestAnimationFrame(frame)
    }

    private stopLoop(): void {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId)
            this.rafId = null
        }
        this.lastFrameTime = null
    }

    /** Monotonic frame clock of the window that hosts the container (popout-safe). */
    private now(): number {
        return (this.container.ownerDocument.defaultView ?? window).performance.now()
    }

    /** One transform per frame, independent of the particle count. */
    private updateParallax(dt: number): void {
        if (this.parallaxReturning) {
            this.parallaxReturnElapsed += dt * REFERENCE_FRAME_MS
            const progress = Math.min(1, this.parallaxReturnElapsed / 800)
            // Cubic ease-out: a slower return that gently settles at the center.
            const remaining = Math.pow(1 - progress, 3)
            this.parallaxX = this.parallaxReturnX * remaining
            this.parallaxY = this.parallaxReturnY * remaining
        } else {
            const easing = 1 - Math.exp(-0.1 * dt)
            this.parallaxX += (this.parallaxTargetX - this.parallaxX) * easing
            this.parallaxY += (this.parallaxTargetY - this.parallaxY) * easing
            if (Math.abs(this.parallaxX - this.parallaxTargetX) < 0.0005) this.parallaxX = this.parallaxTargetX
            if (Math.abs(this.parallaxY - this.parallaxTargetY) < 0.0005) this.parallaxY = this.parallaxTargetY
        }
        const transform = `translate(-50%, -50%) translate3d(${(-this.parallaxX * 12).toFixed(2)}px, ${(-this.parallaxY * 12).toFixed(2)}px, 0) perspective(1000px) rotateY(${(this.parallaxX * 6).toFixed(3)}deg) rotateX(${(-this.parallaxY * 8).toFixed(3)}deg)`
        if (transform !== this.parallaxTransform) {
            this.canvas?.style.setProperty('transform', transform)
            this.parallaxTransform = transform
        }
    }

    /**
     * Euler integration: mouse repulsion + spring back home + damping.
     * `dt` is the frame delta in 60 Hz reference frames (1 = one 16.7 ms step),
     * so the physics keeps its pace on any refresh rate.
     */
    private step(dt = 1): void {
        const radius = this.repulsionRadius
        const reach = radius * this.disturbanceProfile.range
        const radiusSquared = reach * reach
        const pointer = this.parallaxEnabled && this.mouse.x !== -9999
            ? mapParallaxPointer(this.mouse.x - this.cssWidth / 2, this.mouse.y - this.cssHeight / 2,
                -this.parallaxX * 12, -this.parallaxY * 12, -this.parallaxY * 8, this.parallaxX * 6)
            : null
        const mouseX = pointer ? pointer.x + this.cssWidth / 2 : this.mouse.x
        const mouseY = pointer ? pointer.y + this.cssHeight / 2 : this.mouse.y
        const spring = this.springStrength * dt
        const damping = Math.exp(-this.dampingRate * dt)
        const travel = dt
        for (const particle of this.particles) {
            const dx = particle.x - mouseX
            const dy = particle.y - mouseY
            const distanceSquared = dx * dx + dy * dy
            if (distanceSquared < radiusSquared && distanceSquared > 0.0001) {
                const distance = Math.sqrt(distanceSquared)
                const force = disturbanceWeight(distance, radius, this.disturbanceProfile) * this.repulsionStrength
                particle.vx += (dx / distance) * force * dt
                particle.vy += (dy / distance) * force * dt
            }
            particle.vx += (particle.hx - particle.x) * spring
            particle.vy += (particle.hy - particle.y) * spring
            particle.vx *= damping
            particle.vy *= damping
            particle.x += particle.vx * travel
            particle.y += particle.vy * travel
        }
    }

    /**
     * One-shot outward impulse around a tap point (touch interaction). Every
     * particle inside the burst radius gets an immediate velocity kick with
     * the same configurable falloff as the cursor repulsion; from the next frame
     * the regular spring + damping physics take over, so the splash spreads
     * outward, overshoots and settles back home on its own.
     */
    private applyTouchBurst(x: number, y: number): void {
        const radius = this.repulsionRadius * TOUCH_BURST_RADIUS_FACTOR
        const reach = radius * this.disturbanceProfile.range
        const radiusSquared = reach * reach
        const impulse = this.repulsionStrength * TOUCH_BURST_IMPULSE
        for (const particle of this.particles) {
            const dx = particle.x - x
            const dy = particle.y - y
            const distanceSquared = dx * dx + dy * dy
            if (distanceSquared < radiusSquared && distanceSquared > 0.0001) {
                const distance = Math.sqrt(distanceSquared)
                const force = disturbanceWeight(distance, radius, this.disturbanceProfile) * impulse
                particle.vx += (dx / distance) * force
                particle.vy += (dy / distance) * force
            }
        }
    }

    /** Per-shade paths reduce thousands of gradient draws to at most 17 fills. */
    private framePaths: Path2D[] | null = null

    private render(): void {
        const context = this.renderContext
        const canvas = this.canvas
        if (!context || !canvas) return
        // The bitmap is rounded UP in device pixels. A CSS-space clear can
        // miss the final fractional row/column (especially after resampling),
        // leaving a colored fringe at the canvas edge.
        context.save()
        context.setTransform(1, 0, 0, 1, 0, 0)
        context.clearRect(0, 0, canvas.width, canvas.height)
        context.restore()
        const particles = this.particles
        const motion = this.ambientMotion
        // Real time (not a frame counter) so the pace is identical on 60Hz and 120Hz+ displays.
        const now = this.now() * 0.001
        // Gradient modes paint every particle with one frame-wide fill (a canvas
        // gradient or a small shading palette); the other modes use the
        // per-particle fills captured at sample time.
        const frameFill = this.colorMode === 'gradient' ? this.gradientFramePalette(context, now) : null
        this.framePaths = this.colorMode === 'gradient' ? (Array.isArray(frameFill) ? frameFill.map(() => new Path2D()) : [new Path2D()]) : null
        const time = now * this.motionFrequency
        if (motion === 'none') {
            this.renderStatic(context, particles, frameFill)
        } else if (motion === 'wave') this.renderWave(context, particles, time, frameFill)
        else if (motion === 'float') this.renderFloat(context, particles, time, frameFill)
        else if (motion === 'undulate') this.renderUndulate(context, particles, time, frameFill)
        else if (motion === 'pulse') this.renderHeartbeat(context, particles, time, frameFill)
        else if (motion === 'breathe') this.renderRadialScale(context, particles, 1 + BREATHE_SCALE * lutSin(time * BREATHE_SPEED), frameFill)
        else if (motion === 'ripple') this.renderRipple(context, particles, time, frameFill)
        else this.renderStatic(context, particles, frameFill) // stale setting values (removed modes) fall back safely
        if (this.framePaths && Array.isArray(frameFill)) {
            for (const index of this.gradientShadeIndices) {
                context.fillStyle = frameFill[index]
                context.fill(this.framePaths[index])
            }
        } else if (this.framePaths && frameFill !== null) {
            context.fillStyle = frameFill as CanvasGradient | string
            context.fill(this.framePaths[0])
        }
        this.framePaths = null
    }

    /**
     * At most 17 frame-wide fills preserve source luminance without creating
     * a gradient per particle. Each particle picks its sampled shade; its
     * position still determines where it falls within the spatial gradient.
     */
    private gradientFramePalette(context: CanvasRenderingContext2D, time: number): ParticleFrameFill {
        if (this.options.preserveShading === false || this.gradientShadeIndices.length === 0) return this.gradientFrameFill(context, time)
        const palette: (CanvasGradient | string)[] = []
        for (const index of this.gradientShadeIndices) {
            palette[index] = this.gradientFrameFill(context, time, SHADE_MIN + index * SHADE_STEP)
        }
        return palette
    }

    private gradientFrameFill(context: CanvasRenderingContext2D, time: number, shade = 1): CanvasGradient | string {
        const a = shadeRgb(this.colorA, shade)
        const b = shadeRgb(this.colorB, shade)
        const realTime = time
        // Frequency controls motion only; dwell time is measured in real seconds.
        time = pausedAnimationTime(time, this.gradientFrequency, this.gradientPause,
            this.gradientAnimation === 'breathe' ? BREATHE_BASE_PERIOD / 2 : CYCLE_BASE_PERIOD)
        if (this.gradientAnimation === 'breathe') return lerpFillString(a, b, breatheMix(time))
        // CSS convention: 0° points up, 90° right, 180° down (the default).
        const angle = (this.gradientAngle * Math.PI) / 180
        const dx = Math.sin(angle)
        const dy = -Math.cos(angle)
        const centerX = this.gradientAxis?.centerX ?? this.cssWidth / 2
        const centerY = this.gradientAxis?.centerY ?? this.cssHeight / 2
        // Project actual home positions onto the angle, rather than the large
        // canvas or its empty bounding-box corners. Small color bands then
        // reach real ink. Cache at sampling time so motion cannot move the anchor.
        const extent = this.gradientAxis?.extent ?? ((this.cssWidth / 2) * Math.abs(dx) + (this.cssHeight / 2) * Math.abs(dy))
        const length = extent * 2
        if (this.gradientAnimation === 'cycle') {
            if (this.gradientPause > 0) {
                // A repeating band always intersects the ink somewhere. For
                // paused cycling, sweep a single band fully across the ink,
                // including its soft edges, before resting on the base color.
                const duration = CYCLE_BASE_PERIOD / this.gradientFrequency
                const interval = duration + this.gradientPause
                const elapsed = ((realTime % interval) + interval) % interval
                if (elapsed === 0 || elapsed >= duration) return rgbFillString(a)
                const halfBand = this.gradientArea * length / 2
                const halfBlend = Math.min(this.gradientArea, 1 - this.gradientArea) * this.gradientTransition * length / 2
                const support = halfBand + halfBlend
                const bandCenter = -extent - support + (elapsed / duration) * (length + 2 * support)
                const start = bandCenter - support
                const end = bandCenter + support
                const gradient = context.createLinearGradient(
                    centerX + dx * start, centerY + dy * start,
                    centerX + dx * end, centerY + dy * end,
                )
                gradient.addColorStop(0, rgbFillString(a))
                gradient.addColorStop(halfBlend / support, rgbFillString(b))
                gradient.addColorStop(halfBand / support, rgbFillString(b))
                gradient.addColorStop(1, rgbFillString(a))
                return gradient
            }
            // The color band repeats every `length`, so a 3-period axis
            // shifted by up to one period still covers the canvas: the scroll
            // loops seamlessly at CYCLE_BASE_PERIOD / frequency seconds.
            const offset = ((time / CYCLE_BASE_PERIOD) % 1) * length
            const gradient = context.createLinearGradient(
                centerX - dx * (extent + length - offset),
                centerY - dy * (extent + length - offset),
                centerX + dx * (extent + length + offset),
                centerY + dy * (extent + length + offset),
            )
            const halfBlend = Math.min(this.gradientArea, 1 - this.gradientArea) * this.gradientTransition / 2
            const left = (1 - this.gradientArea) / 2
            const right = (1 + this.gradientArea) / 2
            for (let i = 0; i < 3; i++) {
                gradient.addColorStop(i / 3, rgbFillString(a))
                gradient.addColorStop((i + left - halfBlend) / 3, rgbFillString(a))
                gradient.addColorStop((i + left + halfBlend) / 3, rgbFillString(b))
                gradient.addColorStop((i + right - halfBlend) / 3, rgbFillString(b))
                gradient.addColorStop((i + right + halfBlend) / 3, rgbFillString(a))
                gradient.addColorStop((i + 1) / 3, rgbFillString(a))
            }
            return gradient
        }
        const gradient = context.createLinearGradient(centerX - dx * extent, centerY - dy * extent, centerX + dx * extent, centerY + dy * extent)
        const boundary = 1 - this.gradientArea
        const halfBlend = Math.min(this.gradientArea, 1 - this.gradientArea) * this.gradientTransition
        gradient.addColorStop(boundary - halfBlend, rgbFillString(a))
        gradient.addColorStop(boundary + halfBlend, rgbFillString(b))
        return gradient

    }

    private paintParticleRect(context: CanvasRenderingContext2D, shade: number, x: number, y: number, width: number, height: number): void {
        if (this.framePaths) (this.framePaths[shade] ?? this.framePaths[0]).rect(x, y, width, height)
        else context.fillRect(x, y, width, height)
    }

    /** The original draw path, kept verbatim for the 'none' mode. */
    private renderStatic(context: CanvasRenderingContext2D, particles: Particle[], frameFill: ParticleFrameFill): void {
        let lastFill: CanvasGradient | string | null = null
        if (frameFill !== null && !Array.isArray(frameFill)) context.fillStyle = frameFill
        for (const particle of particles) {
            const fill = frameFill === null ? particle.fill : Array.isArray(frameFill) ? frameFill[particle.shadeIndex] : frameFill
            if (!this.framePaths && fill !== lastFill) {
                context.fillStyle = fill
                lastFill = fill
            }
            this.paintParticleRect(context, particle.shadeIndex, particle.x - particle.radius, particle.y - particle.radius, particle.radius * 2, particle.radius * 2)
        }
    }

    /**
     * Coordinated ripple: the phase comes from each particle's home position,
     * so crests sweep across the wordmark diagonally — no per-particle data.
     */
    private renderWave(context: CanvasRenderingContext2D, particles: Particle[], time: number, frameFill: ParticleFrameFill): void {
        let lastFill: CanvasGradient | string | null = null
        if (frameFill !== null && !Array.isArray(frameFill)) context.fillStyle = frameFill
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i]
            const fill = frameFill === null ? particle.fill : Array.isArray(frameFill) ? frameFill[particle.shadeIndex] : frameFill
            if (!this.framePaths && fill !== lastFill) {
                context.fillStyle = fill
                lastFill = fill
            }
            const y = particle.y + lutSin(time * WAVE_SPEED + (particle.hx + particle.hy) * WAVE_NUMBER) * AMBIENT_AMPLITUDE
            this.paintParticleRect(context, particle.shadeIndex, particle.x - particle.radius, y - particle.radius, particle.radius * 2, particle.radius * 2)
        }
    }

    /** The whole wordmark bobs up and down together: one sine per frame, one add per particle. */
    private renderFloat(context: CanvasRenderingContext2D, particles: Particle[], time: number, frameFill: ParticleFrameFill): void {
        const dy = lutSin(time * FLOAT_SPEED) * FLOAT_AMPLITUDE
        let lastFill: CanvasGradient | string | null = null
        if (frameFill !== null && !Array.isArray(frameFill)) context.fillStyle = frameFill
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i]
            const fill = frameFill === null ? particle.fill : Array.isArray(frameFill) ? frameFill[particle.shadeIndex] : frameFill
            if (!this.framePaths && fill !== lastFill) {
                context.fillStyle = fill
                lastFill = fill
            }
            const y = particle.y + dy
            this.paintParticleRect(context, particle.shadeIndex, particle.x - particle.radius, y - particle.radius, particle.radius * 2, particle.radius * 2)
        }
    }

    /**
     * Staggered float (standing wave): every particle bobs on the same clock,
     * but the spatial envelope cos(k·hx) alternates sign along x, so one
     * region rises while its neighbour falls and nodes stay still — staggered
     * motion with no traveling crest. One global sine per frame; one table
     * lookup per particle, no per-particle data.
     */
    private renderUndulate(context: CanvasRenderingContext2D, particles: Particle[], time: number, frameFill: ParticleFrameFill): void {
        const clock = lutSin(time * UNDULATE_SPEED) * UNDULATE_AMPLITUDE
        let lastFill: CanvasGradient | string | null = null
        if (frameFill !== null && !Array.isArray(frameFill)) context.fillStyle = frameFill
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i]
            const fill = frameFill === null ? particle.fill : Array.isArray(frameFill) ? frameFill[particle.shadeIndex] : frameFill
            if (!this.framePaths && fill !== lastFill) {
                context.fillStyle = fill
                lastFill = fill
            }
            const y = particle.y + clock * lutSin(particle.hx * UNDULATE_NUMBER + Math.PI / 2)
            this.paintParticleRect(context, particle.shadeIndex, particle.x - particle.radius, y - particle.radius, particle.radius * 2, particle.radius * 2)
        }
    }

    /** Shared radial breathing (breathe): the scale is computed once per frame. */
    private renderRadialScale(context: CanvasRenderingContext2D, particles: Particle[], scale: number, frameFill: ParticleFrameFill): void {
        // The canvas content is centered, so the canvas center doubles as the expansion origin.
        const centerX = this.cssWidth / 2
        const centerY = this.cssHeight / 2
        const stretch = scale - 1
        let lastFill: CanvasGradient | string | null = null
        if (frameFill !== null && !Array.isArray(frameFill)) context.fillStyle = frameFill
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i]
            const fill = frameFill === null ? particle.fill : Array.isArray(frameFill) ? frameFill[particle.shadeIndex] : frameFill
            if (!this.framePaths && fill !== lastFill) {
                context.fillStyle = fill
                lastFill = fill
            }
            const x = particle.x + (particle.x - centerX) * stretch
            const y = particle.y + (particle.y - centerY) * stretch
            this.paintParticleRect(context, particle.shadeIndex, x - particle.radius, y - particle.radius, particle.radius * 2, particle.radius * 2)
        }
    }

    /**
     * Heartbeat as an outward-traveling pulse: the lub-dub fires at the center
     * first and reaches outer particles later (phase lag grows with distance),
     * while the stroke amplitude ramps up from the inner scale at the center to
     * the outer scale at the rim — the beat visibly propagates layer by layer
     * instead of scaling the whole wordmark rigidly. Center particles need no
     * special case: their (x−center) factors shrink the offset to zero anyway.
     */
    private renderHeartbeat(context: CanvasRenderingContext2D, particles: Particle[], time: number, frameFill: ParticleFrameFill): void {
        const centerX = this.cssWidth / 2
        const centerY = this.cssHeight / 2
        // Reference radius: the widest half-span, so particles at the rim of the
        // (mostly horizontal) wordmark sit near the outer scale.
        const maxDistance = Math.max(centerX, centerY)
        const gain = HEARTBEAT_SCALE_OUTER - HEARTBEAT_SCALE_INNER
        let lastFill: CanvasGradient | string | null = null
        if (frameFill !== null && !Array.isArray(frameFill)) context.fillStyle = frameFill
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i]
            const fill = frameFill === null ? particle.fill : Array.isArray(frameFill) ? frameFill[particle.shadeIndex] : frameFill
            if (!this.framePaths && fill !== lastFill) {
                context.fillStyle = fill
                lastFill = fill
            }
            const dx = particle.x - centerX
            const dy = particle.y - centerY
            const distance = Math.sqrt(dx * dx + dy * dy)
            const envelope = HEARTBEAT_SCALE_INNER + (distance / maxDistance) * gain
            const stretch = heartbeatShape(time * HEARTBEAT_SPEED - distance * HEARTBEAT_NUMBER) * envelope
            const x = particle.x + dx * stretch
            const y = particle.y + dy * stretch
            this.paintParticleRect(context, particle.shadeIndex, x - particle.radius, y - particle.radius, particle.radius * 2, particle.radius * 2)
        }
    }

    /** Ring-shaped wave spreading from the canvas center; particles rise and fall radially. */
    private renderRipple(context: CanvasRenderingContext2D, particles: Particle[], time: number, frameFill: ParticleFrameFill): void {
        const centerX = this.cssWidth / 2
        const centerY = this.cssHeight / 2
        let lastFill: CanvasGradient | string | null = null
        if (frameFill !== null && !Array.isArray(frameFill)) context.fillStyle = frameFill
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i]
            const fill = frameFill === null ? particle.fill : Array.isArray(frameFill) ? frameFill[particle.shadeIndex] : frameFill
            if (!this.framePaths && fill !== lastFill) {
                context.fillStyle = fill
                lastFill = fill
            }
            const dx = particle.x - centerX
            const dy = particle.y - centerY
            const distance = Math.sqrt(dx * dx + dy * dy)
            const offset = lutSin(time * RIPPLE_SPEED - distance * RIPPLE_NUMBER) * RIPPLE_AMPLITUDE
            if (distance > 0.001) {
                const ratio = offset / distance
                const x = particle.x + dx * ratio
                const y = particle.y + dy * ratio
                this.paintParticleRect(context, particle.shadeIndex, x - particle.radius, y - particle.radius, particle.radius * 2, particle.radius * 2)
            } else {
                this.paintParticleRect(context, particle.shadeIndex, particle.x - particle.radius, particle.y - particle.radius, particle.radius * 2, particle.radius * 2)
            }
        }
    }
}

function parseHexColor(color: string): RGB {
    const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())
    if (!match) return { r: 108, g: 49, b: 227 } // fall back to the default particle color
    let hex = match[1]
    if (hex.length === 3) hex = hex.split('').map((char) => char + char).join('')
    return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
    }
}

function rgbFillString(rgb: RGB): string {
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
}

/** Keep the chosen hue while inheriting the source's light/dark variation. */
function shadeRgb(base: RGB, factor: number): RGB {
    const channel = (value: number) => Math.min(255, Math.round(value * factor))
    return { r: channel(base.r), g: channel(base.g), b: channel(base.b) }
}

/** Cosine-eased mix between the two gradient colors: 0 at the start, 1 at the half cycle, back to 0. */
function breatheMix(time: number): number {
    const phase = ((time / BREATHE_BASE_PERIOD) % 1 + 1) % 1
    return (1 - Math.cos(phase * Math.PI * 2)) / 2
}

/** Freeze at each segment endpoint, then resume without a color/position jump. */
function pausedAnimationTime(time: number, frequency: number, pause: number, segment: number): number {
    if (pause === 0) return time * frequency
    const duration = segment / frequency
    const interval = duration + pause
    const index = Math.floor(time / interval)
    const elapsed = time - index * interval
    return index * segment + Math.min(elapsed * frequency, segment)
}

/** Linear interpolation between the two gradient colors, as a fill string. */
function lerpFillString(a: RGB, b: RGB, mix: number): string {
    const channel = (x: number, y: number) => Math.round(x + (y - x) * mix)
    return `rgb(${channel(a.r, b.r)}, ${channel(a.g, b.g)}, ${channel(a.b, b.b)})`
}

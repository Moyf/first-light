<script lang="ts">
    import { onDestroy, onMount } from 'svelte'
    import { pluginSettingsStore } from '../store'
    import { ParticleWordmarkEngine } from '../utils/particleEngine'
    import { effectiveParticleEffectColors, effectiveParticleEffectScale, isDarkTheme, type HomeTabSettings } from '../settings'

    // Deliberately prop-free: everything is read from the settings store, so
    // parent re-renders can never invalidate this component and trigger
    // spurious rebuilds. The store subscription is the only update path.
    let rootEl: HTMLElement

    let engine: ParticleWordmarkEngine | null = null
    let rebuildTimer: number | undefined
    let hasBuilt = false
    let loading = false
    let unsubscribeSettings: (() => void) | undefined
    let themeObserver: MutationObserver | undefined
    let rebuildTimestamps: number[] = []
    let settings: HomeTabSettings | undefined = undefined

    // The first build can run while the host view or settings preview is still
    // settling (zero-size box, a just-inserted DOM, late fonts), and the engine
    // then falls back to the static rendering and nothing would ever retry it.
    // A bounded, delayed retry loop gives the layout time to settle; it is
    // invalidated by any newer attempt, rebuild, teardown or disable.
    const BUILD_RETRY_LIMIT = 20
    const BUILD_RETRY_DELAY = 150
    let buildAttempt = 0
    let buildRetries = 0
    let retryTimer: number | undefined

    function clearBuildRetry(): void {
        window.clearTimeout(retryTimer)
        retryTimer = undefined
    }

    function destroyEngine(): void {
        buildAttempt++
        clearBuildRetry()
        loading = false
        releaseLayout()
        if (engine) {
            engine.destroy()
            engine = null
        }
    }

    /**
     * Reserves the zoomed layout height synchronously, before the first
     * paint, so the search bar never appears and then gets pushed down.
     * The wrapper carries the padding; the engine only measures the content
     * element, which stays padding-free.
     */
    function reserveLayout(): void {
        if (!rootEl || !settings) return
        const content = rootEl.querySelector<HTMLElement>('.home-tab-wordmark-container')
        if (!content) return
        const height = content.getBoundingClientRect().height
        if (height <= 0) return
        rootEl.style.padding = `${((effectiveParticleEffectScale(settings) - 1) * height) / 2}px 0`
    }

    function releaseLayout(): void {
        if (rootEl) rootEl.style.padding = ''
    }

    /**
     * Builds the engine. The source wordmark is hidden immediately (via the
     * loading class) so the original never flashes before the canvas is
     * ready; on any fallback the class is removed and the normal rendering
     * takes over again.
     */
    async function createEngine(): Promise<void> {
        if (!rootEl || !settings) return
        const attempt = ++buildAttempt
        clearBuildRetry()
        reserveLayout()
        const colors = effectiveParticleEffectColors(settings)
        const next = new ParticleWordmarkEngine(rootEl, {
            colorMode: settings.particleEffectColorMode ?? 'original',
            color: colors.color,
            color2: colors.color2,
            gradientAnimation: settings.particleEffectGradientAnimation ?? 'static',
            gradientAngle: settings.particleEffectGradientAngle ?? 180,
            gradientFrequency: settings.particleEffectGradientFrequency ?? 1,
            motionFrequency: settings.particleEffectMotionFrequency ?? 1,
            glow: (settings.particleEffectGlow ?? 0) / 100,
            zoom: effectiveParticleEffectScale(settings),
            spacing: settings.particleEffectSpacing,
            dotSize: settings.particleEffectDotSize,
            repulsionRadius: settings.particleEffectDisturbRadius,
            repulsionStrength: settings.particleEffectDisturbStrength,
            recoverySpeed: settings.particleEffectRecoverySpeed ?? 1,
            ambientMotion: settings.particleEffectAmbientMotion ?? 'none',
        })
        engine = next
        loading = true
        const tookOver = await next.build()
        // A newer rebuild superseded this one (shared `engine` moved on):
        // leave the current engine alone instead of tearing it down.
        if (engine !== next) return
        if (!tookOver) {
            releaseLayout()
            next.destroy()
            engine = null
            // Keep `loading` (and with it the hidden static wordmark) while
            // retries are pending, so the fallback never flashes between
            // attempts; it is only restored once the retries give up.
            if (settings.particleEffect && buildRetries < BUILD_RETRY_LIMIT) {
                scheduleBuildRetry(attempt)
            } else {
                loading = false
            }
            return
        }
        loading = false
        buildRetries = 0
    }

    /** Retries a failed build a bounded number of times unless superseded. */
    function scheduleBuildRetry(attempt: number): void {
        buildRetries++
        retryTimer = window.setTimeout(() => {
            retryTimer = undefined
            if (buildAttempt === attempt) void createEngine()
        }, BUILD_RETRY_DELAY)
    }

    /** Destroys the engine and rebuilds it with the current settings. */
    function rebuildEngine(): void {
        rebuildTimer = undefined
        buildRetries = 0
        destroyEngine()
        void createEngine()
    }

    /**
     * Debounced destroy + recreate, so dragging the color picker or switching
     * dropdowns doesn't thrash the engine. The first run builds immediately.
     * A circuit breaker pauses auto-rebuilds when something triggers them in
     * a tight loop; the pending rebuild is retried after a cooldown instead
     * of being dropped, so the last settings state is never lost.
     */
    function scheduleRebuild(): void {
        if (!rootEl || !settings) return
        window.clearTimeout(rebuildTimer)
        if (!settings.particleEffect) {
            destroyEngine()
            hasBuilt = true
            return
        }
        const now = Date.now()
        rebuildTimestamps = rebuildTimestamps.filter((time) => now - time < 3000)
        rebuildTimestamps.push(now)
        if (rebuildTimestamps.length > 5) {
            console.warn('[home-tab] particle: rebuild loop detected; retrying after a 3s cooldown.')
            rebuildTimer = window.setTimeout(rebuildEngine, 3000)
            return
        }
        if (!hasBuilt) {
            hasBuilt = true
            void createEngine()
            return
        }
        rebuildTimer = window.setTimeout(rebuildEngine, 250)
    }

    /** Everything the engine or the rasterized source rendering depends on. */
    function appearanceSignature(s: HomeTabSettings): string {
        return [
            s.particleEffect,
            s.particleEffectColorMode,
            s.particleEffectColor,
            s.particleEffectColorDark,
            s.particleEffectColor2,
            s.particleEffectColor2Dark,
            isDarkTheme(),
            s.particleEffectGradientAnimation,
            s.particleEffectGradientAngle,
            s.particleEffectGradientFrequency,
            s.particleEffectAmbientMotion,
            s.particleEffectMotionFrequency,
            s.particleEffectGlow,
            s.particleEffectScale,
            s.particleEffectScaleMobile,
            s.particleEffectSpacing,
            s.particleEffectDotSize,
            s.particleEffectDisturbRadius,
            s.particleEffectDisturbStrength,
            s.particleEffectRecoverySpeed,
            s.logoType,
            JSON.stringify(s.logo),
            s.iconColorType,
            s.iconColor,
            s.logoPosition,
            s.logoScale,
            s.logoMargin,
            s.logoMarginIndividual,
            s.logoMarginTop,
            s.logoMarginRight,
            s.logoMarginBottom,
            s.logoMarginLeft,
            s.wordmark,
            s.customFont,
            s.font,
            s.fontSize,
            s.fontWeight,
            s.fontColorType,
            s.fontColor,
            s.titleMargin,
            s.titleMarginIndividual,
            s.titleMarginTop,
            s.titleMarginRight,
            s.titleMarginBottom,
            s.titleMarginLeft,
        ].join('|')
    }

    onMount(() => {
        let lastAppearance: string | null = null
        const applyAppearance = (): void => {
            if (!settings) return
            const signature = appearanceSignature(settings)
            // The first emit drives the initial build; later ones only
            // rebuild when the signature actually changed.
            if (lastAppearance === null) {
                lastAppearance = signature
                if (settings.particleEffect) scheduleRebuild()
                return
            }
            if (signature === lastAppearance) return
            lastAppearance = signature
            scheduleRebuild()
        }
        unsubscribeSettings = pluginSettingsStore.subscribe((s) => {
            if (!s) return
            settings = s
            applyAppearance()
        })
        // Theme switches don't emit the settings store: watch the body class
        // so the colors (and the rasterized default text color) rebuild too.
        const themeBody = rootEl.ownerDocument.body
        if (themeBody) {
            themeObserver = new MutationObserver(applyAppearance)
            themeObserver.observe(themeBody, { attributes: true, attributeFilter: ['class'] })
        }
    })

    onDestroy(() => {
        window.clearTimeout(rebuildTimer)
        themeObserver?.disconnect()
        destroyEngine()
        if (unsubscribeSettings) unsubscribeSettings()
    })
</script>

<div bind:this={rootEl} class:home-tab-particle-loading={loading}><slot/></div>

<style>
    /* Hide the original wordmark synchronously while the particle canvas
       builds, so it never flashes (both parts are always captured). */
    .home-tab-particle-loading :global(.home-tab-logo),
    .home-tab-particle-loading :global(.home-tab-wordmark) {
        visibility: hidden;
    }
</style>

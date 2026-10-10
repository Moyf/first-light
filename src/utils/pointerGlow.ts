/**
 * A light that follows the pointer across a card.
 *
 * Technique (ported from beautiful-chat's pointer glow): a `radial-gradient`
 * is painted in each marked card's own `background-image`, positioned by the
 * CSS custom properties `--htgx/--htgy`. `background-image` cannot transition,
 * so the fade rides on the registered custom property `--htga`: the
 * `@property` rule makes it a real `<number>` that CSS can animate, and the
 * gradient reads it through `calc()`.
 *
 * The light lives in the card's background layer, not in an overlay: children
 * with their own surface (icons, text blocks) naturally occlude it, so the
 * glow shows on the card's chrome and never washes over content.
 *
 * One document listener drives every card — position is written straight to
 * the hovered node as custom properties, so nothing re-renders and the paint
 * is a single small gradient per frame.
 */

const STYLE_ELEMENT_ID = 'harbor-tab-pointer-glow'
const ATTRIBUTE = 'data-htglow'
const ACTIVE_ATTRIBUTE = 'data-htglow-on'

const GLOW_RULE = `@property --htga {
  syntax: "<number>";
  inherits: false;
  initial-value: 0;
}
[${ATTRIBUTE}] {
  --htga: 0;
  background-repeat: no-repeat;
  transition: --htga 200ms ease-out;
}
[${ATTRIBUTE}="dark"] {
  background-image: radial-gradient(
    120px circle at var(--htgx, 50%) var(--htgy, 50%),
    rgba(255, 255, 255, calc(var(--htga) * 0.05)),
    transparent 70%
  );
}
[${ATTRIBUTE}="light"] {
  background-image: radial-gradient(
    120px circle at var(--htgx, 50%) var(--htgy, 50%),
    rgba(74, 104, 156, calc(var(--htga) * 0.075)),
    transparent 70%
  );
}
[${ATTRIBUTE}][${ACTIVE_ATTRIBUTE}] {
  --htga: 1;
}
/* The inactive card keeps the gradient at zero alpha, which is what lets the
   light fade out instead of vanishing. */
[data-htglow-off] [${ATTRIBUTE}] {
  background-image: none;
}
@media (prefers-reduced-motion: reduce) {
  [${ATTRIBUTE}] { background-image: none; }
}`

export interface PointerGlowHandle {
    /** Stop following the pointer and remove the stylesheet. */
    destroy(): void
    /** Reflect the runtime toggle: true = glow active, false = force-off. */
    setEnabled(enabled: boolean): void
}

/**
 * Install the stylesheet and the single pointer listener on `ownerDocument`.
 *
 * The theme attribute is resolved per card at pointer time via the Obsidian
 * body class (`theme-dark` / `theme-light`), so a mid-session theme switch is
 * picked up without re-marking anything.
 */
export function installPointerGlow(ownerDocument: Document): PointerGlowHandle {
    const doc = ownerDocument

    let style: HTMLStyleElement | null = doc.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null
    if (!style) {
        style = doc.createElement('style')
        style.id = STYLE_ELEMENT_ID
        style.textContent = GLOW_RULE
        doc.head.appendChild(style)
    }

    let active: HTMLElement | null = null
    let pending: { target: HTMLElement; x: number; y: number } | null = null
    let frame = 0
    let enabled = true

    const paint = (): void => {
        frame = 0
        const next = pending
        pending = null
        if (!next) return
        if (active && active !== next.target) active.removeAttribute(ACTIVE_ATTRIBUTE)
        active = next.target
        active.style.setProperty('--htgx', `${next.x}px`)
        active.style.setProperty('--htgy', `${next.y}px`)
        active.setAttribute(ACTIVE_ATTRIBUTE, '')
    }

    const clear = (): void => {
        if (!active) return
        active.removeAttribute(ACTIVE_ATTRIBUTE)
        active = null
    }

    const onMove = (event: PointerEvent): void => {
        if (!enabled) {
            clear()
            return
        }
        const target = event.target instanceof Element ? event.target.closest(`[${ATTRIBUTE}]`) : null
        if (!(target instanceof HTMLElement)) {
            clear()
            return
        }
        // Resolve the theme at pointer time: Obsidian toggles theme-dark /
        // theme-light on body, so a mid-session switch needs no re-marking.
        const theme = doc.body.classList.contains('theme-light') ? 'light' : 'dark'
        if (target.getAttribute(ATTRIBUTE) !== theme) target.setAttribute(ATTRIBUTE, theme)
        const box = target.getBoundingClientRect()
        pending = { target, x: event.clientX - box.left, y: event.clientY - box.top }
        if (frame === 0) frame = window.requestAnimationFrame(paint)
    }

    // A pointer leaving the window stops reporting moves, so the last card
    // would keep its light on until the pointer returned.
    doc.addEventListener('pointermove', onMove, { passive: true })
    doc.addEventListener('pointerleave', clear)
    window.addEventListener('blur', clear)

    return {
        destroy(): void {
            if (frame !== 0) window.cancelAnimationFrame(frame)
            doc.removeEventListener('pointermove', onMove)
            doc.removeEventListener('pointerleave', clear)
            window.removeEventListener('blur', clear)
            clear()
            style?.remove()
        },
        setEnabled(value: boolean): void {
            enabled = value
            if (!enabled) clear()
        },
    }
}

import { createPopper, type Instance, type Modifier } from '@popperjs/core'
import { pluginSettingsStore } from '../store'

/** Mount outside the note block so embedded lists can escape clipping ancestors. */
export function mountSearchDropdown(node: HTMLElement, anchor: HTMLElement, parent: HTMLElement): () => void {
    const ownerDocument = anchor.ownerDocument
    const ownerWindow = ownerDocument.defaultView ?? window
    let layer: HTMLElement | undefined
    let popper: Instance | undefined
    let resizeObserver: ResizeObserver | undefined
    let previousStyle: string | undefined

    function removeLayer(restore: boolean): void {
        resizeObserver?.disconnect()
        resizeObserver = undefined
        popper?.destroy()
        popper = undefined
        if (restore && layer) parent.appendChild(node)
        layer?.remove()
        layer = undefined
    }

    const unsubscribe = pluginSettingsStore.subscribe(settings => {
        const overlay = (settings?.searchDropdownDisplay ?? 'overlay') === 'overlay'
        const style = settings?.searchBarStyle ?? 'modern'
        if (!overlay) {
            removeLayer(true)
            previousStyle = undefined
            return
        }
        if (!layer) {
            layer = ownerDocument.body.createDiv('home-tab-searchbar-container home-tab-search-overlay')
            layer.dataset.searchStyle = style
            ownerDocument.body.appendChild(layer)
            layer.appendChild(node)
            popper = createPopper(anchor, layer, {
                strategy: 'fixed',
                placement: 'bottom-start',
                modifiers: [
                    { name: 'offset', options: { offset: [0, style === 'classic' || style === 'minimal' ? 0 : 8] } },
                    { name: 'preventOverflow', options: { padding: 8 } },
                    {
                        name: 'matchInputWidth',
                        enabled: true,
                        phase: 'beforeWrite',
                        requires: ['computeStyles'],
                        fn: ({ state }) => { state.styles.popper.width = `${state.rects.reference.width}px` },
                    },
                ],
            })
            resizeObserver = new ownerWindow.ResizeObserver(() => { void popper?.update() })
            resizeObserver.observe(anchor)
            resizeObserver.observe(node)
        } else if (style !== previousStyle) {
            layer.dataset.searchStyle = style
            void popper?.setOptions(options => ({
                ...options,
                modifiers: options.modifiers?.map((modifier: Partial<Modifier<string, Record<string, unknown>>>) => modifier.name === 'offset'
                    ? { ...modifier, options: { offset: [0, style === 'classic' || style === 'minimal' ? 0 : 8] } }
                    : modifier),
            }))
        }
        previousStyle = style
    })

    return () => {
        unsubscribe()
        removeLayer(false)
    }
}

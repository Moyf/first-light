import { writable } from 'svelte/store'
import type { HomeTabSettings } from './settings'
import type { recentFile } from './recentFiles'
import type { bookmarkedFile } from './bookmarkedFiles'
import { CONTENT_SECTION_KEYS, buildSectionFocusChain, type ContentSectionKey, type SectionFocusTarget } from './utils/contentSections'
export type { SectionFocusTarget } from './utils/contentSections'

export const pluginSettingsStore = writable<HomeTabSettings>()
export const bookmarkedFiles = writable<bookmarkedFile[]>()
export const recentFiles = writable<recentFile[]>([])

// Tab focus follows the displayed section order, then returns to the search bar.
// Shift+Tab walks the same chain in reverse. Sections that cannot take focus
// (hidden, collapsed, empty...) forward the request to the next element.
let focusChainForward = buildSectionFocusChain(CONTENT_SECTION_KEYS)

export interface SectionFocusRequest {
    target: SectionFocusTarget
    backward: boolean
    seq: number
}

interface FocusChainAvailability { bookmarks: boolean; recent: boolean; periodic: boolean }
let chainAvailability: FocusChainAvailability = { bookmarks: true, recent: true, periodic: false }

/** Which sections currently exist in the view; unavailable targets are skipped by the chain */
export function setFocusChainAvailability(availability: FocusChainAvailability, order: readonly ContentSectionKey[] = CONTENT_SECTION_KEYS): void {
    chainAvailability = availability
    focusChainForward = buildSectionFocusChain(order)
}

function isTargetAvailable(target: SectionFocusTarget): boolean {
    if (target === 'periodic') return chainAvailability.periodic
    return target.startsWith('bookmarks') ? chainAvailability.bookmarks : chainAvailability.recent
}

let sectionFocusSeq = 0
export const sectionFocusRequest = writable<SectionFocusRequest>({ target: focusChainForward[0], backward: false, seq: 0 })

// Request the periodic notes list to grab focus on its first item (forward navigation into the section)
export const periodicFocusRequest = writable(0)
// Request the periodic notes list to grab focus on its last item (backward navigation into the section)
export const periodicFocusBackRequest = writable(0)

/** Next focusable element in the Tab chain when leaving `from` in the given direction ('search' = the search bar, undefined = nowhere to go) */
export function nextFocusTarget(from: SectionFocusTarget | 'search', backward: boolean): SectionFocusTarget | 'search' | undefined {
    const chain = backward ? [...focusChainForward].reverse() : focusChainForward
    if (from === 'search') {
        for (const target of chain) {
            if (isTargetAvailable(target)) return target
        }
        return undefined
    }
    for (let i = chain.indexOf(from) + 1; i < chain.length; i++) {
        if (isTargetAvailable(chain[i])) return chain[i]
    }
    return 'search'
}

/**
 * Advance the focus chain from `from` and dispatch the request to the sections.
 * When the chain ends the search bar grabs focus through the given callback.
 */
export function advanceSectionFocus(from: SectionFocusTarget | 'search', backward: boolean, focusSearchBar: () => void): void {
    const next = nextFocusTarget(from, backward)
    if (next === 'search') {
        focusSearchBar()
        return
    }
    if (next) {
        // The periodic notes section listens on its own request stores (bridged here),
        // all other sections follow the shared sectionFocusRequest store.
        if (next === 'periodic') {
            if (backward) periodicFocusBackRequest.update(n => n + 1)
            else periodicFocusRequest.update(n => n + 1)
            return
        }
        sectionFocusRequest.update(() => ({ target: next, backward, seq: ++sectionFocusSeq }))
    }
}

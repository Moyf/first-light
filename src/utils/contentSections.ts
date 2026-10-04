export const CONTENT_SECTION_KEYS = ['periodic', 'recent', 'bookmarks'] as const

export type ContentSectionKey = (typeof CONTENT_SECTION_KEYS)[number]
export type SectionFocusTarget = 'periodic' | 'bookmarks-filter' | 'bookmarks-list' | 'recent-filter' | 'recent-list'

/** Keep saved ordering usable when older settings omit sections or contain stale keys. */
export function normalizeContentSectionOrder(value: unknown): ContentSectionKey[] {
    const order: ContentSectionKey[] = []
    if (Array.isArray(value)) {
        for (const key of value) {
            if (CONTENT_SECTION_KEYS.includes(key) && !order.includes(key)) order.push(key)
        }
    }
    for (const key of CONTENT_SECTION_KEYS) {
        if (!order.includes(key)) order.push(key)
    }
    return order
}

/** Filters precede their lists, and sections follow the same order as the page. */
export function buildSectionFocusChain(order: readonly ContentSectionKey[]): SectionFocusTarget[] {
    return order.flatMap((section): SectionFocusTarget[] => section === 'periodic'
        ? ['periodic']
        : section === 'recent' ? ['recent-filter', 'recent-list'] : ['bookmarks-filter', 'bookmarks-list'])
}

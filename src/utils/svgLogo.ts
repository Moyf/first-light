/** Validate pasted SVG as XML, without ever inserting it into the app's DOM. */
export function normalizeSvgLogo(source: string, ownerDocument: Document): string | null {
    if (!source.trim()) return ''
    const view = ownerDocument.defaultView ?? window
    const parsed = new view.DOMParser().parseFromString(source.trim(), 'image/svg+xml')
    const root = parsed.documentElement
    if (parsed.getElementsByTagName('parsererror').length || root.localName !== 'svg') return null
    const namespace = 'http://www.w3.org/2000/svg'
    if (root.namespaceURI && root.namespaceURI !== namespace) return null
    if (!root.namespaceURI) root.setAttribute('xmlns', namespace)
    return new view.XMLSerializer().serializeToString(root)
}

/** An SVG image remains isolated: its scripts cannot run in the application. */
export function svgLogoDataUrl(source: string): string {
    return source ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source) : ''
}

import type { App, TFile } from 'obsidian'

/** Resolve configured frontmatter properties in order, then use the real file name. */
export function resolveFileDisplayName(frontmatter: Record<string, unknown> | undefined, properties: string, basename: string): string {
    for (const property of properties.split(',').map(value => value.trim()).filter(Boolean)) {
        if (!frontmatter || !Object.prototype.hasOwnProperty.call(frontmatter, property)) continue
        const rawValue = frontmatter[property]
        const value = Array.isArray(rawValue) ? rawValue[0] : rawValue
        if (typeof value === 'string' && value.trim()) return value.trim()
        if (typeof value === 'number' && Number.isFinite(value)) return String(value)
        if (typeof value === 'boolean') return String(value)
    }
    return basename
}

export function getFileDisplayName(app: App, file: TFile, properties: string): string {
    if (!properties.trim()) return file.basename
    return resolveFileDisplayName(app.metadataCache.getFileCache(file)?.frontmatter, properties, file.basename)
}

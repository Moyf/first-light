export interface FolderSearchQuery {
    folderPath: string
    query: string
}

/** True for the reserved folder: query prefix, including while it is being typed. */
export function hasFolderSearchPrefix(input: string): boolean {
    return /^\s*folder:/i.test(input)
}

/**
 * Parse `folder:path/to/folder query` and its quoted-path form
 * `folder:"path with spaces" query`.
 */
export function parseFolderSearchQuery(input: string): FolderSearchQuery | undefined {
    const trimmedInput = input.trimStart()
    if (!/^folder:/i.test(trimmedInput)) return undefined

    const remainder = trimmedInput.slice('folder:'.length).trimStart()
    let folderPath: string
    let query = ''

    if (remainder.startsWith('"')) {
        const closingQuote = remainder.indexOf('"', 1)
        if (closingQuote < 0) return undefined

        folderPath = remainder.slice(1, closingQuote)
        const trailing = remainder.slice(closingQuote + 1)
        if (trailing && !/^\s/.test(trailing)) return undefined
        query = trailing.trim()
    } else {
        const separator = remainder.search(/\s/)
        if (separator < 0) {
            folderPath = remainder
        } else {
            folderPath = remainder.slice(0, separator)
            query = remainder.slice(separator).trim()
        }
    }

    folderPath = normalizeFolderPath(folderPath)
    if (!folderPath) return undefined

    return { folderPath, query }
}

export function formatFolderSearchQuery(folderPath: string): string {
    const normalizedPath = normalizeFolderPath(folderPath)
    const pathToken = /\s/.test(normalizedPath) ? `"${normalizedPath}"` : normalizedPath
    return `folder:${pathToken} `
}

export function isFileInFolderPath(filePath: string, folderPath: string): boolean {
    const normalizedFolder = normalizeFolderPath(folderPath).toLowerCase()
    const normalizedFile = filePath.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase()
    return normalizedFile.startsWith(`${normalizedFolder}/`)
}

function normalizeFolderPath(folderPath: string): string {
    return folderPath
        .replace(/\\/g, '/')
        .split('/')
        .filter((segment) => segment && segment !== '.')
        .join('/')
}

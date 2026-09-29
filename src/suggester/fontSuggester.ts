import { AbstractInputSuggest, type App } from 'obsidian'
import type Fuse from 'fuse.js'
import { ArrayFuzzySearch } from "./fuzzySearch"

/**
 * System font suggester built on the official AbstractInputSuggest, which
 * handles popover positioning (including popout windows) out of the box.
 */
export default class fontSuggester extends AbstractInputSuggest<Fuse.FuseResult<string>>{
    private inputEl: HTMLInputElement
    private fontList: string[] = []
    private fontListPromise: Promise<string[]> | undefined
    private fuzzySearch: ArrayFuzzySearch | undefined
    private renderFont: boolean

    constructor(app: App, inputEl: HTMLInputElement, renderFont?: boolean){
        super(app, inputEl)
        this.inputEl = inputEl
        this.renderFont = renderFont ?? false
    }

    getInstalledFonts(): Promise<string[]>{
        if (!this.fontListPromise) {
            this.fontListPromise = (async () => {
                try {
                    const fontList = await import('font-list')
                    const fonts = (await fontList.getFonts({ disableQuoting: true }))
                        .map(font => font.replace(/"/g, '').trim())
                        .filter(Boolean)

                    this.fontList = fonts
                    this.fuzzySearch = new ArrayFuzzySearch(fonts)
                } catch(e) {
                    console.warn('Failed to get system fonts', e)
                    this.fontList = []
                    this.fuzzySearch = new ArrayFuzzySearch([])
                }

                return this.fontList
            })()
        }

        return this.fontListPromise
    }

    async getSuggestions(query: string): Promise<Fuse.FuseResult<string>[]> {
        const fontList = await this.getInstalledFonts()

        // If the input is blank display all installed fonts
        if (!query){
            return fontList.map((font, refIndex) => ({
                item: font,
                refIndex,
                score: 0,
            }))
        }

        return this.fuzzySearch?.filteredSearch(query, 0.25, 15) ?? []
    }

    renderSuggestion(suggestion: Fuse.FuseResult<string>, el: HTMLElement): void {
        el.addClass('suggestion-item')
        if (this.renderFont) {
            el.style.fontFamily = suggestion.item
        }
        el.setText(suggestion.item)
    }

    selectSuggestion(suggestion: Fuse.FuseResult<string>): void {
        this.inputEl.value = suggestion.item
        this.inputEl.trigger("input")
        this.close()
    }
}

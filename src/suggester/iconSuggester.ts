import { AbstractInputSuggest, getIconIds, setIcon, type App } from 'obsidian'
import type Fuse from 'fuse.js'
import { ArrayFuzzySearch } from "./fuzzySearch"

/**
 * Lucide icon suggester built on the official AbstractInputSuggest, which
 * handles popover positioning (including popout windows) out of the box.
 * Icon ids come from the official getIconIds() so the list always matches
 * the icons available in the running Obsidian version.
 */
export default class iconSuggester extends AbstractInputSuggest<Fuse.FuseResult<string>>{
    private inputEl: HTMLInputElement
    private iconList: string[]
    private fuzzySearch: ArrayFuzzySearch
    private displayIcon: boolean

    constructor(app: App, inputEl: HTMLInputElement, displayIcon?: boolean){
        super(app, inputEl)
        this.inputEl = inputEl
        this.iconList = getIconIds()
        this.fuzzySearch = new ArrayFuzzySearch(this.iconList)
        this.displayIcon = displayIcon ?? false
    }

    getSuggestions(query: string): Fuse.FuseResult<string>[] {
        return this.fuzzySearch.filteredSearch(query, 0.25, 15)
    }

    renderSuggestion(suggestion: Fuse.FuseResult<string>, el: HTMLElement): void {
        el.addClass('suggestion-item')
        if (this.displayIcon) {
            setIcon(el, suggestion.item)
        }
        el.createSpan({ text: suggestion.item })
    }

    selectSuggestion(suggestion: Fuse.FuseResult<string>): void {
        this.inputEl.value = suggestion.item
        this.inputEl.trigger("input")
        this.close()
    }
}

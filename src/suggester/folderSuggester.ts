import { Platform, TFolder, type App, type View } from 'obsidian'
import { get } from 'svelte/store'
import type HomeTab from '../main'
import type HomeTabSearchBar from 'src/homeTabSearchbar'
import { TextInputSuggester } from './suggester'
import { generateHotkeySuggestion } from 'src/utils/htmlUtils'
import { revealFolderInExplorer } from 'src/utils/folderRevealUtils'
import { t } from '../i18n'
import FolderSuggestion from 'src/ui/svelteComponents/folderSuggestion.svelte'

/**
 * 文件夹过滤建议器：输入即过滤全库文件夹，回车后在文件浏览器中定位选中文件夹。
 */
export default class FolderSuggester extends TextInputSuggester<TFolder>{
    private view: View
    private plugin: HomeTab
    private searchBar: HomeTabSearchBar

    constructor(app: App, plugin: HomeTab, view: View, searchBar: HomeTabSearchBar) {
        super(app, get(searchBar.searchBarEl), get(searchBar.suggestionContainerEl), {
            containerClass: `home-tab-suggestion-container ${Platform.isPhone ? 'is-phone' : ''}`,
            additionalClasses: `${plugin.settings.selectionHighlight === 'accentColor' ? 'use-accent-color' : ''}`,
            additionalModalInfo: plugin.settings.showShortcuts ? generateHotkeySuggestion([
                {hotkey: '↑↓', action: 'to navigate'},
                {hotkey: '↵', action: 'to reveal in file explorer'},
                {hotkey: 'esc', action: 'to dismiss'},
            ], 'home-tab-hotkey-suggestions') : undefined
        }, plugin.settings.searchDelay)
        this.plugin = plugin
        this.view = view
        this.searchBar = searchBar
    }

    getSuggestions(input: string): TFolder[] {
        const query = input.trim().toLowerCase()
        // 与文件过滤器一致：空输入不显示列表，输入后才过滤
        if(!query) return []
        const folders = this.app.vault.getAllFolders().filter((folder) => folder.path !== '/')
        const matched = folders.filter((folder) => folder.path.toLowerCase().includes(query))
        // 按路径深度排序（浅层靠前，同级按字母序）
        return matched
            .sort((a, b) => {
                const depthDiff = a.path.split('/').length - b.path.split('/').length
                return depthDiff !== 0 ? depthDiff : a.path.localeCompare(b.path)
            })
            .slice(0, this.plugin.settings.maxResults)
    }

    useSelectedItem(folder: TFolder): void {
        revealFolderInExplorer(this.app, folder, t().ui.folderRevealFailed)
        // Preserve the folder pick as a temporary scope in the normal note search.
        this.searchBar.setFolderSearchScope(folder.path)
    }

    getDisplayElementComponentType(): typeof FolderSuggestion {
        return FolderSuggestion
    }

    getDisplayElementProps(suggestion: TFolder): Record<string, unknown> {
        return {
            folderPath: suggestion.path,
        }
    }
}

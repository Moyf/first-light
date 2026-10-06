import { Notice, type App, type View, Platform } from "obsidian";
import type HomeTab from "./main";
import { writable, type Writable, get } from "svelte/store";
import HomeTabFileSuggester from "src/suggester/homeTabSuggester";
import OmnisearchSuggester from "./suggester/omnisearchSuggester";
import SurfingSuggester from "./suggester/surfingSuggester";
import WebViewerSuggester from "./suggester/webViewerSuggester";
import FolderSuggester from "./suggester/folderSuggester";
import { fileTypes, type FileExtension, type FileType, fileExtensions } from "./utils/getFileTypeUtils";
import { isValidUrl } from "./utils/urlUtils";
import { NewNoteModal } from "./newNoteModal";
import { t } from "./i18n";
import { formatFolderSearchQuery, hasFolderSearchPrefix } from "./utils/folderSearchQuery";

export type SearchBarFilterType = 'fileExtension' | 'fileType' | 'folder' | 'webSearch' | 'omnisearch' | 'default'

const omnisearchKeys = ['omnisearch', 'omni', 'o'] as const
const webSearchKeys = ['surfing', 'web', 'internet', 'w'] as const
const folderKeys = ['folder', 'f'] as const
const fileTypeAliasKeys = ['n', 'm', 'b', 'c'] as const
const fileTypeAliases: Record<typeof fileTypeAliasKeys[number], FileType> = {
    n: 'markdown',
    m: 'media',
    b: 'base',
    c: 'canvas',
}

export type OmnisearchFilterKey = typeof omnisearchKeys[number]
export type WebsearchFilterKey = typeof webSearchKeys[number]
export type FolderFilterKey = typeof folderKeys[number]
export type ExtensionsearchFilterKey = FileExtension
export type FileTypesearchFilterKey = FileType

type FilterKeyLookupTable = {[key in SearchBarFilterType]: string[]}
const filterKeysLookupTable: FilterKeyLookupTable = {
    default: [],
    omnisearch: [...omnisearchKeys],
    webSearch: [...webSearchKeys],
    folder: [...folderKeys],
    fileType: [...fileTypes, ...fileTypeAliasKeys],
    fileExtension: [...fileExtensions],
}

export const filterKeys = [...filterKeysLookupTable.omnisearch, ...filterKeysLookupTable.webSearch,
                    ...filterKeysLookupTable.folder, ...filterKeysLookupTable.fileType, ...filterKeysLookupTable.fileExtension]

export type FilterKey = typeof filterKeys[number]

export default class HomeTabSearchBar{
    private app: App
    private onLoad: (() => void) | undefined
    public activeFilter: SearchBarFilterType

    protected view: View
    protected plugin: HomeTab
    
    public fileSuggester: HomeTabFileSuggester | OmnisearchSuggester | SurfingSuggester | WebViewerSuggester | FolderSuggester
    public activeExtEl: Writable<HTMLElement>
    public searchBarEl: Writable<HTMLInputElement>
    public suggestionContainerEl: Writable<HTMLElement>
    /** True while the typed name matches no note (drives the new-note button highlight) */
    public unmatchedNameActive: Writable<boolean>

    private suggestionStoreUnsubscribe: (() => void) | undefined

    constructor(plugin: HomeTab, view: View, onLoad?: () => void) {
        this.app = view.app;
        this.view = view;
        this.plugin = plugin;
        this.searchBarEl = writable();
        this.activeExtEl = writable();
        this.suggestionContainerEl = writable();
        this.unmatchedNameActive = writable(false);
        this.onLoad = onLoad;
        this.activeFilter = 'default';
    }

    public setSearchBarEl(el: HTMLInputElement): void {
        if (!el) return;
        this.searchBarEl.set(el);
        
        // 添加输入事件监听
        el.addEventListener('input', (e: Event) => {
            // IME 组合输入（拼音等）过程中不搜索，避免中间态导致下拉框反复开关闪烁
            if((e as InputEvent).isComposing) return
            const query = el.value.trim();
            this.handleInput(query);
        });
        // 中文输入法候选词上屏后统一触发一次搜索
        el.addEventListener('compositionend', () => {
            this.handleInput(el.value.trim());
        });
    }

    // 网址功能是否可用：设置开关打开且网页浏览器(Web Viewer)核心插件已启用
    private isWebUrlSuggestionEnabled(): boolean {
        if (!this.plugin.settings.webUrlSuggestions) return false;
        return !!(this.app.internalPlugins.getPluginById('webviewer') || this.app.internalPlugins.getPluginById('webbrowser'));
    }

    private handleInput(query: string): void {
        // 如果还没有建议器，创建默认的
        if (!this.fileSuggester) {
            this.createDefaultSuggester();
        }

        const hasFolderPrefix = hasFolderSearchPrefix(query)
        if (hasFolderPrefix && !(this.fileSuggester instanceof HomeTabFileSuggester)) {
            this.fileSuggester.close()
            this.fileSuggester.destroy()
            this.activeFilter = 'default'
            get(this.activeExtEl)?.toggleClass('hide', true)
            this.setSuggester(new HomeTabFileSuggester(this.plugin.app, this.plugin, this.view, this))
            void this.fileSuggester.onInput()
            return
        }

        if (!hasFolderPrefix && this.activeFilter === 'default'
            && this.fileSuggester instanceof HomeTabFileSuggester
            && this.plugin.settings.omnisearch && this.plugin.app.plugins.getPlugin('omnisearch')) {
            this.fileSuggester.close()
            this.fileSuggester.destroy()
            this.createDefaultSuggester()
            void this.fileSuggester.onInput()
            return
        }

        // 如果是 URL 且不在移动端，切换到 WebViewerSuggester
        if (query && isValidUrl(query) && !Platform.isMobile && this.isWebUrlSuggestionEnabled()) {
            if (!(this.fileSuggester instanceof WebViewerSuggester)) {
                // 确保先关闭旧的建议器
                this.fileSuggester.close();
                this.fileSuggester.destroy();
                this.setSuggester(new WebViewerSuggester(this.plugin.app, this.plugin, this.view, this));
                void this.fileSuggester.onInput();
            }
        }
        // 如果不是 URL 但当前是 WebViewerSuggester，切换回默认建议器
        else if (this.fileSuggester instanceof WebViewerSuggester) {
            // 确保先关闭旧的建议器
            this.fileSuggester.close();
            this.fileSuggester.destroy();
            this.createDefaultSuggester();
            // 更新建议
            void this.fileSuggester.onInput();
        }
        // An unchanged suggester owns the debounced input/composition listener.
        // Calling it here as well bypasses searchDelay and starts duplicate searches.
    }

    /**
     * Central suggester assignment: re-wires the suggestion-list listener that
     * keeps unmatchedNameActive in sync (suggester instances are recreated on
     * every filter/suggester switch, so the subscription must follow along).
     */
    private setSuggester(suggester: HomeTabFileSuggester | OmnisearchSuggester | SurfingSuggester | WebViewerSuggester | FolderSuggester): void {
        this.suggestionStoreUnsubscribe?.();
        this.suggestionStoreUnsubscribe = undefined;
        this.fileSuggester = suggester;
        this.suggestionStoreUnsubscribe = suggester.getSuggester().suggestionsStore.subscribe(() => {
            this.unmatchedNameActive.set(this.isUnmatchedNoteName(get(this.searchBarEl)?.value ?? ''));
        });
    }

    private createDefaultSuggester(): void {
        // 销毁旧的 suggester 实例
        if (this.fileSuggester) {
            this.fileSuggester.destroy();
        }

        if (hasFolderSearchPrefix(get(this.searchBarEl)?.value ?? '')) {
            this.setSuggester(new HomeTabFileSuggester(this.app, this.plugin, this.view, this))
            return
        }

        if (this.plugin.settings.omnisearch && this.plugin.app.plugins.getPlugin('omnisearch')) {
            this.setSuggester(new OmnisearchSuggester(this.app, this.plugin, this.view, this));
        } else {
            this.setSuggester(new HomeTabFileSuggester(this.app, this.plugin, this.view, this));
        }
    }

    public focusSearchbar(): void {
        // Set cursor on search bar (the element is only bound after the Svelte
        // component mounts, which can happen after this is called at startup)
        get(this.searchBarEl)?.focus();
    }

    /**
     * Handler of the "new note" button: executes the configured override
     * command when enabled, otherwise opens the create-note modal.
     */
    public openNewNote(): void {
        const settings = this.plugin.settings;
        if (settings.newNoteUseCommand && settings.newNoteCommandId) {
            if (this.app.commands?.commands?.[settings.newNoteCommandId]) {
                this.app.commands.executeCommandById(settings.newNoteCommandId);
                return;
            }
            // Command was removed/unloaded since it was configured: fall back to the modal
            new Notice(t().newNoteModal.commandNotFound);
        }
        // Pre-fill the typed text as the note name; the modal then focuses
        // the folder field instead of the (already filled) name field
        new NewNoteModal(this.app, this.plugin, get(this.searchBarEl)?.value?.trim() || undefined).open();
    }

    public load(): void {
        const query = get(this.searchBarEl)?.value?.trim() || '';
        
        // 确保先销毁之前的建议器
        if (this.fileSuggester) {
            this.fileSuggester.destroy();
        }
        
        // 创建新的建议器
        this.createSuggester(query);

        if (this.onLoad) {
            this.onLoad()
        }
    }

    private createSuggester(query: string): void {
        // 销毁旧的 suggester 实例
        if (this.fileSuggester) {
            this.fileSuggester.destroy();
        }

        if (hasFolderSearchPrefix(query)) {
            this.setSuggester(new HomeTabFileSuggester(this.plugin.app, this.plugin, this.view, this))
            void this.fileSuggester.onInput()
            return
        }

        // 如果是 URL 且不在移动端，使用 WebViewerSuggester
        if (query && isValidUrl(query) && !Platform.isMobile && this.isWebUrlSuggestionEnabled()) {
            this.setSuggester(new WebViewerSuggester(this.plugin.app, this.plugin, this.view, this));
            void this.fileSuggester.onInput();
            return;
        }

        // 否则使用其他建议器
        if (this.plugin.settings.omnisearch && this.plugin.app.plugins.getPlugin('omnisearch')) {
            this.setSuggester(new OmnisearchSuggester(this.plugin.app, this.plugin, this.view, this));
        } else {
            this.setSuggester(new HomeTabFileSuggester(this.plugin.app, this.plugin, this.view, this));
        }
    }

    public updateActiveSuggester(filterKey: FilterKey){
        this.fileSuggester.destroy()
        const filterEl = get(this.activeExtEl)
        const query = get(this.searchBarEl)?.value?.trim() || '';
        const canonicalFilterKey = fileTypeAliases[filterKey as typeof fileTypeAliasKeys[number]] ?? filterKey

        // 如果是 URL 且不在移动端，始终使用 WebViewerSuggester
        if (query && isValidUrl(query) && !Platform.isMobile && this.isWebUrlSuggestionEnabled()) {
            filterEl.toggleClass('hide', true);
            this.createSuggester(query);
            return;
        }

        let filter: SearchBarFilterType = 'default'

        // Match key from search bar input to filter type
        for(const filterType of Object.keys(filterKeysLookupTable) as Array<SearchBarFilterType>){
            if(filterKeysLookupTable[filterType].includes(filterKey)){
                filter = filterType
            }
        }

        filterEl.setText(filter)
        // const oldFilter = this.activeFilter
        this.activeFilter = filter

        switch(filter){
            case 'default':
                filterEl.toggleClass('hide', true)
                this.createDefaultSuggester()
                void this.fileSuggester.onInput();
                break;
            case 'omnisearch':
                if(this.app.plugins.getPlugin('omnisearch')){
                    filterEl.toggleClass('hide', false)
                    this.setSuggester(new OmnisearchSuggester(this.plugin.app, this.plugin, this.view, this))
                    void this.fileSuggester.onInput();
                }
                else{
                    new Notice('Omnisearch plugins is not enabled.')
                    this.updateActiveSuggester('default')
                }
                break;
            case 'webSearch':
                if(this.app.plugins.getPlugin('surfing')){
                    filterEl.toggleClass('hide', false)
                    this.setSuggester(new SurfingSuggester(this.plugin.app, this.plugin, this.view, this))
                    void this.fileSuggester.onInput();
                }
                else{
                    new Notice('Surfing plugin is not enabled.')
                    this.updateActiveSuggester('default')
                }
                break;
            case 'fileExtension':
            case 'fileType': {
                const fileSuggester = new HomeTabFileSuggester(this.plugin.app, this.plugin, this.view, this)
                this.setSuggester(fileSuggester)
                fileSuggester.setFileFilter(canonicalFilterKey)
                filterEl.toggleClass('hide', false)
                filterEl.setText(canonicalFilterKey)
                void this.fileSuggester.onInput();
                break;
            }
            case 'folder':
                filterEl.toggleClass('hide', false)
                filterEl.setText(canonicalFilterKey)
                this.setSuggester(new FolderSuggester(this.plugin.app, this.plugin, this.view, this))
                void this.fileSuggester.onInput();
                break;
            default:
                break;
        }     
    }

    /**
     * True when the typed text matches no note in the default search (no
     * filter active): the new-note button lights up and Enter opens the
     * create dialog with the typed name pre-filled.
     */
    public isUnmatchedNoteName(input: string): boolean {
        if (hasFolderSearchPrefix(input)) return false
        if(!this.plugin.settings.showNewNoteButton || !this.plugin.settings.newNoteOnUnmatchedName) return false
        if(this.plugin.settings.newNoteUseCommand) return false
        if(this.activeFilter !== 'default') return false
        if(!(this.fileSuggester instanceof HomeTabFileSuggester)) return false
        const query = input.trim()
        if(!query) return false
        const suggestions = this.fileSuggester.getSuggester().getSuggestions() ?? []
        return suggestions.length === 0
    }

    /** Enter on an unmatched name: open the create dialog pre-filled with the typed name */
    public openNewNoteFromInput(input: string): boolean {
        if(!this.isUnmatchedNoteName(input)) return false
        new NewNoteModal(this.app, this.plugin, input.trim()).open()
        return true
    }

    /** Apply a temporary folder scope by writing the searchable prefix into the input. */
    public setFolderSearchScope(folderPath: string): void {
        const inputEl = get(this.searchBarEl)
        if (!inputEl) return

        this.fileSuggester?.destroy()
        get(this.activeExtEl)?.toggleClass('hide', true)
        this.activeFilter = 'default'
        this.setSuggester(new HomeTabFileSuggester(this.plugin.app, this.plugin, this.view, this))

        inputEl.value = formatFolderSearchQuery(folderPath)
        inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length)
        const InputEventConstructor = inputEl.ownerDocument.defaultView?.Event ?? Event
        inputEl.dispatchEvent(new InputEventConstructor('input', { bubbles: true }))
        this.focusSearchbar()
    }

    /** Detaches listeners on view teardown (suggester instances are destroyed by the view) */
    public dispose(): void {
        this.suggestionStoreUnsubscribe?.();
        this.suggestionStoreUnsubscribe = undefined;
    }
}

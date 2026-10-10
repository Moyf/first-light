import { FileView, MarkdownRenderChild, View, WorkspaceLeaf } from "obsidian";
import type HomeTab from "./main";
import Homepage from './ui/homepage.svelte'
import HomeTabSearchBar from "./homeTabSearchbar";
import { t } from "./i18n";
import { installPointerGlow, type PointerGlowHandle } from "./utils/pointerGlow";

export const VIEW_TYPE = "home-tab-view";

export class EmbeddedHomeTab extends MarkdownRenderChild{
    searchBar: HomeTabSearchBar
    homepage: Homepage
    plugin: HomeTab
    view: View
    recentFiles: boolean | undefined
    bookmarkedFiles: boolean | undefined
    periodicNotes: boolean | undefined
    searchbarOnly: boolean | undefined
    private pointerGlow: PointerGlowHandle | null = null

    constructor(containerEl: HTMLElement, view: View, plugin: HomeTab, codeBlockContent: string){
        super(containerEl)
        this.view = view
        this.plugin = plugin

        this.parseCodeBlockContent(codeBlockContent)
        this.searchBar = new HomeTabSearchBar(plugin, view)
    }

    onload(): void{
        this.homepage = new Homepage({
            target: this.containerEl,
            props: {
                plugin: this.plugin,
                view: this.view,
                HomeTabSearchBar: this.searchBar,
                embeddedView: this
            }
        })

        this.searchBar.load()

        // The pointer glow follows its own document: embedded tabs can live in
        // a workspace popout, so resolve `document` from the rendered element.
        this.pointerGlow = installPointerGlow(this.containerEl.ownerDocument)
        this.pointerGlow.setEnabled(this.plugin.settings.pointerGlow !== false)
    }

    /** Runtime toggle from the settings page: no rebuild needed. */
    setPointerGlowEnabled(enabled: boolean): void {
        this.pointerGlow?.setEnabled(enabled)
    }

    onunload(): void {
        this.plugin.activeEmbeddedHomeTabViews.splice(this.plugin.activeEmbeddedHomeTabViews.findIndex(item => item.view == this.view),1)
        this.pointerGlow?.destroy()
        this.pointerGlow = null
        this.searchBar.dispose()
        this.searchBar.fileSuggester.close()
        this.homepage.$destroy()
    }

    private parseCodeBlockContent(codeBlockContent: string){
        codeBlockContent.split('\n')
        .map((line: string) => line.trim())
        .forEach((line: string) => {
            switch (true) {
                case line === '':
                    break
                case line === 'only search bar':
                    this.searchbarOnly = true
                    break
                case line === 'show recent files':
                    this.recentFiles = true
                    break
                case line === 'show bookmarked files':
                    this.bookmarkedFiles = true
                    break
                case line === 'show periodic notes':
                    this.periodicNotes = true
                    break
            }
        });
    }
}

export class HomeTabView extends FileView{
    plugin: HomeTab
    private pointerGlow: PointerGlowHandle | null = null
    homepage: Homepage
    searchBar: HomeTabSearchBar
    containerEl: HTMLElement

    constructor(leaf: WorkspaceLeaf, plugin: HomeTab) {
        super(leaf);
        this.leaf = leaf
        this.plugin = plugin
        this.navigation = true
        this.allowNoFile = true
        this.icon = 'search'

        this.searchBar = new HomeTabSearchBar(this.plugin, this)
    }

    getViewType() {
        return VIEW_TYPE;
    }
    
    getDisplayText(): string {
        return t().viewName
    }

    async onOpen(): Promise<void> {
        this.homepage = new Homepage({
            target: this.contentEl,
            props:{
                plugin: this.plugin,
                view: this,
                HomeTabSearchBar: this.searchBar
            }
        });
        this.searchBar.load()
        this.searchBar.focusSearchbar()

        // A Harbor Tab can live in a workspace popout with its own document,
        // so resolve `document` from the view's own content element.
        this.pointerGlow = installPointerGlow(this.contentEl.ownerDocument)
        this.pointerGlow.setEnabled(this.plugin.settings.pointerGlow !== false)

        // this.fileSuggester = new HomeTabFileSuggester(this.app, this.plugin, this,
            // get(this.searchBarEl), get(this.suggestionContainerEl))
    }

    /** Runtime toggle from the settings page: no rebuild needed. */
    setPointerGlowEnabled(enabled: boolean): void {
        this.pointerGlow?.setEnabled(enabled)
    }

    async onClose(): Promise<void>{
        this.pointerGlow?.destroy()
        this.pointerGlow = null
        this.searchBar.dispose()
        this.searchBar.fileSuggester.destroy()  // 使用 destroy() 而不是 close()
        this.homepage.$destroy();
    }
} 

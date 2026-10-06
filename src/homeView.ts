import { FileView, MarkdownRenderChild, View, WorkspaceLeaf } from "obsidian";
import type HomeTab from "./main";
import Homepage from './ui/homepage.svelte'
import HomeTabSearchBar from "./homeTabSearchbar";
import { t } from "./i18n";

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
    }

    onunload(): void {
        this.plugin.activeEmbeddedHomeTabViews.splice(this.plugin.activeEmbeddedHomeTabViews.findIndex(item => item.view == this.view),1)
        this.searchBar.dispose()
        this.searchBar.fileSuggester?.destroy()
        this.homepage?.$destroy()
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
        this.contentEl.addClass('home-tab-view-content')
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

        // this.fileSuggester = new HomeTabFileSuggester(this.app, this.plugin, this,
            // get(this.searchBarEl), get(this.suggestionContainerEl))
    }

    async onClose(): Promise<void>{
        this.contentEl.removeClass('home-tab-view-content')
        this.searchBar.dispose()
        // Guarded: onClose can run after a failed onOpen (e.g. workspace restore
        // racing plugin layout-ready) where the suggester/homepage never loaded
        this.searchBar.fileSuggester?.destroy()
        this.homepage?.$destroy();
    }
} 

import {
	Plugin,
	WorkspaceLeaf,
	WorkspaceMobileDrawer,
	WorkspaceTabs,
	MarkdownView
} from 'obsidian';
import type { Command } from 'obsidian';
import { EmbeddedHomeTab, HomeTabView, VIEW_TYPE } from 'src/homeView';
import { HomeTabSettingTab, DEFAULT_SETTINGS, normalizeVaultStatsSettings, type HomeTabSettings } from './settings'
import { normalizeContentSectionOrder } from './utils/contentSections'
import { t } from './i18n'
import { pluginSettingsStore, bookmarkedFiles } from './store'
import { RecentFileManager } from './recentFiles';
import { bookmarkedFilesManager } from './bookmarkedFiles';

declare module 'obsidian'{
	interface App{
		internalPlugins: InternalPlugins
		plugins: Plugins
		dom: {
			appContainerEl: HTMLElement
		}
		isMobile: boolean
	}
	interface InternalPlugins{
		getPluginById: (id: string) => BookmarksPlugin | undefined
		plugins: {
			bookmarks: BookmarksPlugin
		}
	}
	interface Plugins{
		getPlugin: (id: string) => Plugin
	}
	interface BookmarksPlugin extends Plugin{
		instance: {
			items: BookmarkItem[]
			getBookmarks: () => BookmarkItem[]
			removeItem: (item: BookmarkItem) => void
			on: (name: string, callback: () => void) => EventRef
		}
	}
	interface BookmarkItem{
		type: string,
		title: string | undefined,
		path: string,
		items?: BookmarkItem[]
	}
	interface config{
		nativeMenus: boolean
	}
	interface Vault{
		config: config
	}
	interface Workspace{
		createLeafInTabGroup: () => WorkspaceLeaf
	}
	interface WorkspaceLeaf{
		rebuildView: () => void
		parent: WorkspaceTabs | WorkspaceMobileDrawer
		activeTime: number
	}
	interface WorkspaceSplit{
		children: WorkspaceLeaf[]
	}
	interface TFile{
		deleted: boolean
	}
	// The command registry is not part of the public typings
	interface CommandRegistry{
		commands: { [id: string]: Command }
		listCommands: () => Command[]
		executeCommandById: (id: string) => void
	}
	interface App{
		commands: CommandRegistry
	}
}

export default class HomeTab extends Plugin {
	settings: HomeTabSettings;
	recentFileManager: RecentFileManager
	bookmarkedFileManager: bookmarkedFilesManager
	activeEmbeddedHomeTabViews: EmbeddedHomeTab[]
	
	async onload() {
		await this.loadSettings();
		this.addSettingTab(new HomeTabSettingTab(this.app, this))
		this.registerView(VIEW_TYPE, (leaf) => new HomeTabView(leaf, this));		

		// Replace new tabs with home tab view
		this.registerEvent(this.app.workspace.on('layout-change', () => this.onLayoutChange()))
		// Refocus search bar on leaf change
		this.registerEvent(this.app.workspace.on('active-leaf-change', (leaf: WorkspaceLeaf) => {if(leaf.view instanceof HomeTabView){leaf.view.searchBar.focusSearchbar()}}))

		pluginSettingsStore.set(this.settings) // Store the settings for the svelte components

		this.activeEmbeddedHomeTabViews = []

		this.recentFileManager = new RecentFileManager(this.app, this)
		this.recentFileManager.load()

		this.addCommand({
			id: 'open-new-home-tab',
			name: t().command.openNewTab,
			callback: () => this.activateView(false, true)})
		this.addCommand({
			id: 'open-home-tab',
			name: t().command.replaceCurrentTab,
			callback: () => this.activateView(true)})

		// Wait for all plugins to load before check if the bookmarked plugin is enabled
		this.app.workspace.onLayoutReady(() => {
			if(this.app.internalPlugins.getPluginById('bookmarks')){
				this.bookmarkedFileManager = new bookmarkedFilesManager(this.app, this, bookmarkedFiles)
				this.bookmarkedFileManager.load()
			}
			else{
				// Bookmarks plugin disabled: keep the setting off (DEFAULT_SETTINGS can't check at module level)
				this.settings.showbookmarkedFiles = false
			}

			this.registerMarkdownCodeBlockProcessor('search-bar', (source, el, ctx) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView)
				if(view){
					let embeddedHomeTab = new EmbeddedHomeTab(el, view, this, source)
					this.activeEmbeddedHomeTabViews.push(embeddedHomeTab)
					ctx.addChild(embeddedHomeTab)
				}
			})

			if(this.settings.newTabOnStart){
				// If an Home tab leaf is already open focus it
				const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE)
				if(leaves.length > 0){
					void this.app.workspace.revealLeaf(leaves[0])
					// If more than one home tab leaf is open close them
					leaves.forEach((leaf, index) => {
						if(index < 1) return
						leaf.detach()
					})
				}
				else{
					this.activateView(false, true)
				}
				// Close all other open leaves
				if(this.settings.closePreviousSessionTabs){
					// Get open leaves type
					const leafTypes: string[] = []
					this.app.workspace.iterateRootLeaves((leaf) => {
						const leafType = leaf.view.getViewType()
						if(leafTypes.indexOf(leafType) === -1 && leafType != VIEW_TYPE){
							leafTypes.push(leafType)
						}
					})
					leafTypes.forEach((type) => this.app.workspace.detachLeavesOfType(type))
				}
			}
		})
	}

	// Do NOT detach leaves here: detaching would reset the leaf to its default
	// location when the plugin is loaded again, even if the user moved it.
	onunload(): void {
		this.activeEmbeddedHomeTabViews.forEach(view => view.unload())
		this.recentFileManager.unload()
		this.bookmarkedFileManager?.unload()
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<HomeTabSettings>)
		this.migrateLegacySettings()
		normalizeVaultStatsSettings(this.settings)
		this.settings.contentSectionOrder = normalizeContentSectionOrder(this.settings.contentSectionOrder)
	}

	/** Upgrades settings persisted by older plugin versions in place. */
	private migrateLegacySettings(): void {
		const legacy = this.settings as HomeTabSettings & { particleEffectMonochrome?: boolean }
		if (legacy.particleEffectMonochrome === undefined) return
		// The old monochrome toggle became the colorMode dropdown.
		if (legacy.particleEffectMonochrome && legacy.particleEffectColorMode === 'original') {
			legacy.particleEffectColorMode = 'monochrome'
		}
		delete legacy.particleEffectMonochrome
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings)
		pluginSettingsStore.update(() => this.settings)
	}

	private onLayoutChange(): void{
		if(this.settings.replaceNewTabs){
			this.activateView()
		}
	}

	public activateView(overrideView?: boolean, openNewTab?: boolean):void {
		let leaf = openNewTab ? this.app.workspace.getLeaf('tab') : this.app.workspace.getMostRecentLeaf()
		// getMostRecentLeaf() can return a detached leaf whose tab was already
		// closed: Obsidian keeps the stale reference and reports its view state
		// as 'empty'. Calling setViewState() on such a ghost leaf resurrects it
		// outside the layout tree and corrupts active-leaf bookkeeping (stray
		// empty tabs, stale getLeaf()/getMostRecentLeaf() results that other
		// plugins then trip over). Only use the leaf when it is still attached
		// to the workspace root, otherwise fall back to the most recently used
		// attached empty leaf.
		if(leaf && !this.isLeafAttached(leaf)){
			leaf = this.getMostRecentAttachedEmptyLeaf() ?? (overrideView ? this.app.workspace.getLeaf('tab') : null)
		}
		if(leaf && (overrideView || leaf.getViewState().type === 'empty')){
			void leaf.setViewState({
				type: VIEW_TYPE,
			})
			// Focus newly opened tab
			if(openNewTab){void this.app.workspace.revealLeaf(leaf)}
		}
	}

	private isLeafAttached(leaf: WorkspaceLeaf): boolean {
		let attached = false
		this.app.workspace.iterateRootLeaves((rootLeaf) => {
			if(rootLeaf === leaf){attached = true}
		})
		return attached
	}

	private getMostRecentAttachedEmptyLeaf(): WorkspaceLeaf | undefined {
		let mostRecent: WorkspaceLeaf | undefined
		let activeTime = -1
		this.app.workspace.iterateRootLeaves((leaf) => {
			if(leaf.getViewState().type === 'empty' && leaf.activeTime > activeTime){
				mostRecent = leaf
				activeTime = leaf.activeTime
			}
		})
		return mostRecent
	}

	public refreshOpenViews(): void {
		this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((leaf) => leaf.rebuildView())
	}
}

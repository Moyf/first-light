<script lang="ts">
    import SearchBar from './searchBar.svelte';
    import Wordmark from './wordmark.svelte';
    import type { HomeTabSettings } from 'src/settings';
    import { pluginSettingsStore, recentFiles, bookmarkedFiles, setFocusChainAvailability } from '../store'
    import type { View } from 'obsidian'
    import type { EmbeddedHomeTab } from '../homeView';
    import type HomeTabSearchBar from 'src/homeTabSearchbar';
	import type { recentFile } from 'src/recentFiles';
	import BookmarkedFiles from './bookmarkedFiles.svelte';
	import RecentFiles from './recentFiles.svelte';
	import PeriodicNotes from './periodicNotes.svelte';
	import VaultStats from './vaultStats.svelte';
	import type { bookmarkedFile } from 'src/bookmarkedFiles';
    import type HomeTab from 'src/main';
    
    export let view: View
    export let HomeTabSearchBar: HomeTabSearchBar
    export let plugin: HomeTab
    export let embeddedView: EmbeddedHomeTab | undefined = undefined

    let bookmarkedFileList: bookmarkedFile[] = $bookmarkedFiles ?? []
    let pluginSettings: HomeTabSettings = $pluginSettingsStore
    let recentFileList: recentFile[] = $recentFiles ?? []

    $: pluginSettings = $pluginSettingsStore
    $: bookmarkedFileList = $bookmarkedFiles ?? []
    $: recentFileList = $recentFiles ?? []

    // Keep the Tab focus chain aware of which sections actually exist
    $: setFocusChainAvailability({
        bookmarks: isbookmarkedPluginEnabled && renderbookmarkedFiles && (pluginSettings?.showbookmarkedFiles ?? false),
        recent: renderRecentFiles && recentFileList.length > 0 && (pluginSettings?.showRecentFiles ?? false),
        periodic: renderPeriodicNotes,
    }, pluginSettings.contentSectionOrder)

    const isbookmarkedPluginEnabled = app.internalPlugins.getPluginById('bookmarks') ? true : false

    $: renderRecentFiles = embeddedView ? embeddedView.recentFiles : pluginSettings.showRecentFiles
    $: renderbookmarkedFiles = embeddedView ? embeddedView.bookmarkedFiles : pluginSettings.showbookmarkedFiles
    $: renderPeriodicNotes = embeddedView ? embeddedView.periodicNotes : pluginSettings.showPeriodicNotes
</script>
  
<main class="home-tab" class:embedded={embeddedView}>
    {#if !embeddedView?.searchbarOnly}
        <Wordmark/>
    {/if}
    
    {#if pluginSettings.vaultStats && !embeddedView}
        <VaultStats {view} {pluginSettings} {HomeTabSearchBar}/>
    {/if}

    <SearchBar {HomeTabSearchBar} embedded={embeddedView ? true : false}/>

    {#each pluginSettings.contentSectionOrder as section (section)}
        {#if section === 'periodic' && renderPeriodicNotes}
            <PeriodicNotes {view} {pluginSettings} {HomeTabSearchBar}/>
        {:else if section === 'bookmarks' && isbookmarkedPluginEnabled && bookmarkedFileList && renderbookmarkedFiles}
            <BookmarkedFiles bookmarkedFiles={bookmarkedFileList} {view} {pluginSettings} bookmarkedFileManager={plugin.bookmarkedFileManager} {HomeTabSearchBar}/>
        {:else if section === 'recent' && plugin.recentFileManager && recentFileList.length > 0 && renderRecentFiles}
            <RecentFiles {recentFileList} {view} {pluginSettings} recentFileManager={plugin.recentFileManager} {HomeTabSearchBar}/>
        {/if}
    {/each}
</main>
  
  
<style>
    /* The particle canvas is zoom× wider than the wordmark and centered, so its
       transparent margin overflows horizontally and shows a phantom scrollbar
       on .view-content. Clip it here: `clip` (not `hidden`) so the element does
       not become a scroll container and vertical scrolling stays on .view-content. */
    .home-tab{
        overflow-x: clip;
    }
</style>

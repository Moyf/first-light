<script lang="ts">
	import { App, Menu, Notice, TFile, View, getIcon } from "obsidian";
	import type { HomeTabSettings } from "src/settings";
	import { IconSelectionModal } from "src/iconSelectionModal";
	import FileDisplayItem from "./svelteComponents/fileDisplayItem.svelte";
	import type { bookmarkedFile, bookmarkedFilesManager } from "src/bookmarkedFiles";
	import type HomeTabSearchBar from "src/homeTabSearchbar";
	import { advanceSectionFocus, sectionFocusRequest, type SectionFocusRequest } from "src/store";
	import { get } from "svelte/store";
	import { moveListSelectionVertically, moveListSelectionHorizontally, scrollListItemIntoView } from "src/utils/listNavigation";

    export let view: View
    export let bookmarkedFiles: bookmarkedFile[]
    export let pluginSettings: HomeTabSettings
    export let bookmarkedFileManager: bookmarkedFilesManager
    export let HomeTabSearchBar: HomeTabSearchBar | undefined = undefined

    const app: App = view.leaf.app

    let selectedFile: TFile

    // Section collapse state (only when pluginSettings.sectionCollapsible is on)
    let sectionCollapsed = false

    function toggleSectionCollapsed(): void {
        sectionCollapsed = !sectionCollapsed
    }

    // Filter state (only when pluginSettings.showBookmarkedFilesFilter is on)
    let filterExpanded = false
    let filterQuery = ''
    let filterInputEl: HTMLInputElement
    let listWrapperEl: HTMLElement
    let selectedFileIndex = -1 // -1 = no keyboard selection

    $: groupFilteredFiles = bookmarkedFileManager.filterBySelectedGroups(bookmarkedFiles)

    $: filteredFileList = filterQuery.trim()
        ? groupFilteredFiles.filter(entry => {
            const query = filterQuery.trim().toLowerCase()
            const basename = entry.file.basename.toLowerCase()
            const extension = entry.file.extension.toLowerCase()
            return basename.includes(query) || extension === query
        })
        : groupFilteredFiles

    // Reset the keyboard selection whenever the filter text changes
    $: filterQuery, selectedFileIndex = -1

    function toggleFilter() {
        filterExpanded = !filterExpanded
        if (filterExpanded) {
            // Focus the input after DOM update
            setTimeout(() => filterInputEl?.focus(), 50)
        } else {
            collapseFilter()
        }
    }

    function expandAndFocusFilter() {
        filterExpanded = true
        // Focus the input after DOM update
        setTimeout(() => filterInputEl?.focus(), 50)
    }

    function collapseFilter() {
        filterExpanded = false
        filterQuery = ''
        selectedFileIndex = -1
    }

    function focusFirstListItem(): void {
        if (filteredFileList.length === 0) return
        selectedFileIndex = 0
        setTimeout(() => listWrapperEl?.focus(), 0)
    }

    function openFile(file: TFile): void {
        const leaf = app.workspace.getLeaf(false)
        leaf.openFile(file)
    }

    function focusSearchBar(): void {
        HomeTabSearchBar?.focusSearchbar()
    }

    // Focus chain: accept the request when this section can take focus, otherwise forward it
    let lastSeenSectionFocusRequest = get(sectionFocusRequest).seq
    $: if ($sectionFocusRequest.seq > lastSeenSectionFocusRequest) {
        lastSeenSectionFocusRequest = $sectionFocusRequest.seq
        handleSectionFocusRequest($sectionFocusRequest)
    }

    function canAcceptFilterFocus(): boolean {
        return pluginSettings.showBookmarkedFilesFilter && !sectionCollapsed
    }

    function canAcceptListFocus(): boolean {
        return !sectionCollapsed && filteredFileList.length > 0
    }

    function handleSectionFocusRequest(request: SectionFocusRequest): void {
        if (request.target === 'bookmarks-filter') {
            if (canAcceptFilterFocus()) {
                expandAndFocusFilter()
            } else {
                advanceSectionFocus('bookmarks-filter', request.backward, focusSearchBar)
            }
        }
        else if (request.target === 'bookmarks-list') {
            if (canAcceptListFocus()) {
                focusFirstListItem()
            } else {
                advanceSectionFocus('bookmarks-list', request.backward, focusSearchBar)
            }
        }
    }

    function handleFilterKeydown(e: KeyboardEvent) {
        if (e.key === 'Tab') {
            e.preventDefault()
            advanceSectionFocus('bookmarks-filter', e.shiftKey, focusSearchBar)
        }
        if (e.key === 'Escape') {
            collapseFilter()
        }
    }

    function handleListKeydown(e: KeyboardEvent) {
        if (filteredFileList.length === 0) return
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            selectedFileIndex = moveListSelectionVertically(listWrapperEl, selectedFileIndex, 1)
            scrollListItemIntoView(listWrapperEl, selectedFileIndex)
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault()
            selectedFileIndex = moveListSelectionVertically(listWrapperEl, selectedFileIndex, -1)
            scrollListItemIntoView(listWrapperEl, selectedFileIndex)
        }
        else if (e.key === 'ArrowRight') {
            e.preventDefault()
            selectedFileIndex = moveListSelectionHorizontally(selectedFileIndex, filteredFileList.length, 1)
            scrollListItemIntoView(listWrapperEl, selectedFileIndex)
        }
        else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            selectedFileIndex = moveListSelectionHorizontally(selectedFileIndex, filteredFileList.length, -1)
            scrollListItemIntoView(listWrapperEl, selectedFileIndex)
        }
        else if (e.key === 'Home') {
            e.preventDefault()
            selectedFileIndex = 0
            scrollListItemIntoView(listWrapperEl, selectedFileIndex)
        }
        else if (e.key === 'End') {
            e.preventDefault()
            selectedFileIndex = filteredFileList.length - 1
            scrollListItemIntoView(listWrapperEl, selectedFileIndex)
        }
        else if (e.key === 'Enter') {
            e.preventDefault()
            const entry = filteredFileList[selectedFileIndex]
            if (entry) {
                openFile(entry.file)
                collapseFilter()
            }
        }
        else if (e.key === 'Escape') {
            e.preventDefault()
            selectedFileIndex = -1
            if (filterExpanded) {
                setTimeout(() => filterInputEl?.focus(), 0)
            } else {
                // Filter is not open (e.g. entered the list via Shift+Tab): go back to the search bar
                focusSearchBar()
            }
        }
        else if (e.key === 'Tab') {
            e.preventDefault()
            selectedFileIndex = -1
            advanceSectionFocus('bookmarks-list', e.shiftKey, focusSearchBar)
        }
    }

    // Keep the filter open when the focus moves between the filter and the list
    function shouldKeepFilterOpen(e: FocusEvent): boolean {
        const related = e.relatedTarget
        if (!(related instanceof Node)) return false
        return related === filterInputEl || (listWrapperEl?.contains(related) ?? false)
    }

    function handleFilterBlur(e: FocusEvent) {
        if (shouldKeepFilterOpen(e)) return
        collapseFilter()
    }

    function handleListBlur(e: FocusEvent) {
        if (shouldKeepFilterOpen(e)) return
        collapseFilter()
    }

    const selectIconModal: IconSelectionModal = new IconSelectionModal(app, undefined, (icon) => bookmarkedFileManager.updateFileIcon(selectedFile, icon))

    const contextualMenu: Menu = new Menu()
            .addItem((item) => item
                .setTitle('Remove bookmark')
                .setIcon('trash-2')
                .onClick(() => bookmarkedFileManager.removeBookmark(selectedFile)))
            .addSeparator()
            .addItem((item) => item
                .setTitle('Set custom icon')
                .setIcon('plus')
                .onClick(() => selectIconModal.open()))
            .setUseNativeMenu(app.vault.config.nativeMenus)
</script>

<div class="home-tab-bookmarked-files-container">
    {#if pluginSettings.sectionCollapsible || pluginSettings.showBookmarkedFilesFilter}
        <div class="home-tab-bookmarked-files-title">
            {#if pluginSettings.sectionCollapsible}
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <span
                    class="home-tab-section-toggle"
                    role="button"
                    tabindex="0"
                    aria-expanded={!sectionCollapsed}
                    aria-label={sectionCollapsed ? 'Expand bookmarks' : 'Collapse bookmarks'}
                    on:click={toggleSectionCollapsed}
                    on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSectionCollapsed() } }}
                >
                    <span class="home-tab-section-collapse-icon">
                        {@html getIcon(sectionCollapsed ? 'chevron-right' : 'chevron-down')?.outerHTML ?? ''}
                    </span>
                    <span class="home-tab-bookmarked-files-title-text">Bookmarks</span>
                </span>
            {:else}
                <span class="home-tab-bookmarked-files-title-text">Bookmarks</span>
            {/if}
            {#if pluginSettings.showBookmarkedFilesFilter && !sectionCollapsed}
                <div class="home-tab-bookmarked-files-filter" class:expanded={filterExpanded}>
                    <input
                        class="home-tab-bookmarked-files-filter-input"
                        type="text"
                        placeholder="Filter..."
                        bind:value={filterQuery}
                        bind:this={filterInputEl}
                        on:keydown={handleFilterKeydown}
                        on:blur={handleFilterBlur}
                        tabindex={filterExpanded ? 0 : -1}
                    />
                    <button
                        class="home-tab-bookmarked-files-filter-btn clickable-icon"
                        on:click={toggleFilter}
                        aria-label="Filter bookmarks"
                    >
                        {@html getIcon('search')?.outerHTML ?? ''}
                    </button>
                </div>
            {/if}
        </div>
    {/if}
    {#if !sectionCollapsed}
        <div class="home-tab-bookmarked-files-list"
            class:compact={pluginSettings.compactMode}
            bind:this={listWrapperEl}
            tabindex="-1"
            on:keydown={handleListKeydown}
            on:blur={handleListBlur}
        >
            {#each filteredFileList as item (item.file.path)}
                <FileDisplayItem file={item.file} customIcon={item.iconId} {app} {pluginSettings} {contextualMenu}
                selected={filteredFileList.indexOf(item) === selectedFileIndex}
                on:itemMenu={(e) => selectedFile = e.detail.file}/>
            {/each}
        </div>
    {/if}
</div>

<style>
    .home-tab-bookmarked-files-container{
        display: flex;
        flex-direction: column;

        width: 65%;
        /* min-width: 150px; */
        max-width: 900px;

        padding-top: 30px;
        margin: auto;
    }
    .home-tab-bookmarked-files-list{
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;

        width: 100%;
        outline: none;
    }
    .home-tab-bookmarked-files-title{
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-weight: 600;
        font-size: var(--font-ui-large);
        padding-bottom: 5px;
    }
    .home-tab-bookmarked-files-title-text{
        white-space: nowrap;
    }
    .home-tab-section-toggle{
        display: inline-flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        user-select: none;
        padding: 2px 8px;
        margin: -2px -8px;
        border-radius: var(--radius-s);
    }
    .home-tab-section-toggle:hover{
        background-color: var(--background-modifier-hover);
    }
    .home-tab-section-collapse-icon{
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-muted);
    }
    .home-tab-section-collapse-icon :global(svg){
        width: 16px;
        height: 16px;
    }
    .home-tab-bookmarked-files-filter{
        display: flex;
        align-items: center;
        gap: 4px;
    }
    .home-tab-bookmarked-files-filter-btn{
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        border: none;
        background: none;
        color: var(--text-muted);
        cursor: pointer;
        border-radius: var(--radius-s);
        opacity: 1;
        transition: opacity 0.2s ease 0.15s; /* delay fade-in */
    }
    .home-tab-bookmarked-files-filter.expanded .home-tab-bookmarked-files-filter-btn{
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease; /* no delay on fade-out */
    }
    .home-tab-bookmarked-files-filter-btn:hover{
        color: var(--text-normal);
        background-color: var(--background-modifier-hover);
    }
    .home-tab-bookmarked-files-filter-btn :global(svg){
        width: 16px;
        height: 16px;
    }
    .home-tab-bookmarked-files-filter-input{
        width: 0;
        min-width: 0;
        height: 24px;
        padding: 2px 0;
        font-size: var(--font-ui-small);
        border: 1px solid transparent;
        border-radius: var(--radius-s);
        background-color: transparent;
        color: var(--text-normal);
        outline: none;
        opacity: 0;
        transition: width 0.25s ease, padding 0.25s ease, margin 0.25s ease, opacity 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
    }
    .home-tab-bookmarked-files-filter.expanded .home-tab-bookmarked-files-filter-input{
        width: 160px;
        margin-left: 6px;
        padding: 2px 8px;
        opacity: 1;
        border-color: var(--background-modifier-border);
        background-color: var(--background-modifier-form-field);
    }
    /* Keep the focused background identical to the search bar (Obsidian would otherwise darken it on focus) */
    .home-tab-bookmarked-files-filter-input:focus{
        border-color: var(--interactive-accent);
        background-color: var(--background-modifier-form-field);
    }

    .home-tab-bookmarked-files-list.compact{
        gap: 6px 8px;
    }

    @media(max-width: 600px){
        .home-tab-bookmarked-files-container{
            width: 90%;
        }
        .home-tab-bookmarked-files-list{
            gap: 6px 8px;
        }
    }
</style>

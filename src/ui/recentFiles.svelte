<script lang="ts">
	import { Menu, View, type TFile, getIcon } from "obsidian";
	import type { RecentFileManager, recentFile } from "src/recentFiles";
	import type { HomeTabSettings } from "src/settings";
	import type HomeTabSearchBar from "src/homeTabSearchbar";
	import { advanceSectionFocus, sectionFocusRequest, type SectionFocusRequest } from "src/store";
	import { get } from "svelte/store";
	import FileDisplayItem from "./svelteComponents/fileDisplayItem.svelte";
	import { moveListSelectionVertically, moveListSelectionHorizontally, scrollListItemIntoView } from "src/utils/listNavigation";

    export let view: View
    export let recentFileList: recentFile[]
    export let pluginSettings: HomeTabSettings
    export let recentFileManager: RecentFileManager
    export let HomeTabSearchBar: HomeTabSearchBar
    const app = view.leaf.app

    let selectedFile: TFile

    // Filter state
    let filterExpanded = false
    let filterQuery = ''
    let filterInputEl: HTMLInputElement
    let listWrapperEl: HTMLElement
    let selectedFileIndex = -1 // -1 = no keyboard selection

    // Section collapse state (only when pluginSettings.sectionCollapsible is on)
    let sectionCollapsed = false

    function toggleSectionCollapsed(): void {
        sectionCollapsed = !sectionCollapsed
    }

    $: filteredFileList = filterQuery.trim()
        ? recentFileList.filter(rf => {
            const query = filterQuery.trim().toLowerCase()
            const basename = rf.file.basename.toLowerCase()
            const extension = rf.file.extension.toLowerCase()
            return basename.includes(query) || extension === query
        })
        : recentFileList

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

    function focusSearchBar(): void {
        HomeTabSearchBar?.focusSearchbar()
    }

    // Focus chain: accept the request when this section can take focus, otherwise forward it.
    // Baseline against the current store value so a freshly mounted component
    // (new tab) doesn't replay stale requests and steal the focus.
    let lastSeenSectionFocusRequest = get(sectionFocusRequest).seq
    $: if ($sectionFocusRequest.seq > lastSeenSectionFocusRequest) {
        lastSeenSectionFocusRequest = $sectionFocusRequest.seq
        handleSectionFocusRequest($sectionFocusRequest)
    }

    function canAcceptFilterFocus(): boolean {
        return pluginSettings.showRecentFilesFilter && !sectionCollapsed
    }

    function canAcceptListFocus(): boolean {
        return !sectionCollapsed && filteredFileList.length > 0
    }

    function handleSectionFocusRequest(request: SectionFocusRequest): void {
        if (request.target === 'recent-filter') {
            if (canAcceptFilterFocus()) {
                expandAndFocusFilter()
            } else {
                advanceSectionFocus('recent-filter', request.backward, focusSearchBar)
            }
        }
        else if (request.target === 'recent-list') {
            if (canAcceptListFocus()) {
                focusFirstListItem()
            } else {
                advanceSectionFocus('recent-list', request.backward, focusSearchBar)
            }
        }
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

    function scrollSelectedItemIntoView(): void {
        const items = listWrapperEl?.querySelectorAll('.home-tab-file-item')
        items?.[selectedFileIndex]?.scrollIntoView({ block: 'nearest' })
    }

    function moveSelectionVertically(delta: 1 | -1): void {
        selectedFileIndex = moveListSelectionVertically(listWrapperEl, selectedFileIndex, delta)
        scrollListItemIntoView(listWrapperEl, selectedFileIndex)
    }

    function moveSelectionHorizontally(delta: 1 | -1): void {
        selectedFileIndex = moveListSelectionHorizontally(selectedFileIndex, filteredFileList.length, delta)
        scrollListItemIntoView(listWrapperEl, selectedFileIndex)
    }

    function handleFilterKeydown(e: KeyboardEvent) {
        if (e.key === 'Tab') {
            e.preventDefault()
            // Forward loop: enter the list navigation (the chain skips it when empty);
            // Shift+Tab (reverse loop): back towards the search bar
            advanceSectionFocus('recent-filter', e.shiftKey, focusSearchBar)
            return
        }
        if (e.key === 'Escape') {
            collapseFilter()
        }
    }

    function handleListKeydown(e: KeyboardEvent) {
        if (filteredFileList.length === 0) return
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            moveSelectionVertically(1)
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault()
            moveSelectionVertically(-1)
        }
        else if (e.key === 'ArrowRight') {
            e.preventDefault()
            moveSelectionHorizontally(1)
        }
        else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            moveSelectionHorizontally(-1)
        }
        else if (e.key === 'Home') {
            e.preventDefault()
            selectedFileIndex = 0
            scrollSelectedItemIntoView()
        }
        else if (e.key === 'End') {
            e.preventDefault()
            selectedFileIndex = filteredFileList.length - 1
            scrollSelectedItemIntoView()
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
                HomeTabSearchBar?.focusSearchbar()
            }
        }
        else if (e.key === 'Tab') {
            e.preventDefault()
            selectedFileIndex = -1
            advanceSectionFocus('recent-list', e.shiftKey, focusSearchBar)
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

    let contextualMenu: Menu = new Menu()
            .addItem((item) => item
                .setTitle('Hide file')
                .setIcon('eye-off')
                .onClick(() => recentFileManager.removeRecentFile(selectedFile)))
            .setUseNativeMenu(app.vault.config.nativeMenus)
</script>

<div class="home-tab-recent-files-container">
    <div class="home-tab-recent-files-title">
        {#if pluginSettings.sectionCollapsible}
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span
                class="home-tab-section-toggle"
                role="button"
                tabindex="0"
                aria-expanded={!sectionCollapsed}
                aria-label={sectionCollapsed ? 'Expand recent files' : 'Collapse recent files'}
                on:click={toggleSectionCollapsed}
                on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSectionCollapsed() } }}
            >
                <span class="home-tab-section-collapse-icon">
                    {@html getIcon(sectionCollapsed ? 'chevron-right' : 'chevron-down')?.outerHTML ?? ''}
                </span>
                <span class="home-tab-recent-files-title-text">Recent files</span>
            </span>
        {:else}
            <span class="home-tab-recent-files-title-text">Recent files</span>
        {/if}
        {#if pluginSettings.showRecentFilesFilter && !sectionCollapsed}
        <div class="home-tab-recent-files-filter" class:expanded={filterExpanded}>
            <input
                class="home-tab-recent-files-filter-input"
                type="text"
                placeholder="Filter..."
                bind:value={filterQuery}
                bind:this={filterInputEl}
                on:keydown={handleFilterKeydown}
                on:blur={handleFilterBlur}
                tabindex={filterExpanded ? 0 : -1}
            />
            <button
                class="home-tab-recent-files-filter-btn clickable-icon"
                on:click={toggleFilter}
                aria-label="Filter recent files"
            >
                {@html getIcon('search')?.outerHTML ?? ''}
            </button>
        </div>
        {/if}
    </div>
    {#if !sectionCollapsed}
        <div class="home-tab-recent-files-wrapper"
            class:compact={pluginSettings.compactMode}
            bind:this={listWrapperEl}
            tabindex="-1"
            on:keydown={handleListKeydown}
            on:blur={handleListBlur}
        >
            {#each filteredFileList as recentFile (recentFile.file.path)}
                <FileDisplayItem file={recentFile.file} {app} {pluginSettings} {contextualMenu}
                selected={filteredFileList.indexOf(recentFile) === selectedFileIndex}
                on:itemMenu={(e) => selectedFile = e.detail.file}/>
            {/each}
        </div>
    {/if}
</div>

<style>
    .home-tab-recent-files-container{
        width: 65%;
        display: flex;
        flex-direction: column;

        padding-top: 20px;
        margin: auto;
    }
    .home-tab-recent-files-title{
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-weight: 600;
        font-size: var(--font-ui-large);
        padding-bottom: 5px;
    }
    .home-tab-recent-files-title-text{
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
    .home-tab-recent-files-filter{
        display: flex;
        align-items: center;
        gap: 4px;
    }
    .home-tab-recent-files-filter-btn{
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
    .home-tab-recent-files-filter.expanded .home-tab-recent-files-filter-btn{
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease; /* no delay on fade-out */
    }
    .home-tab-recent-files-filter-btn:hover{
        color: var(--text-normal);
        background-color: var(--background-modifier-hover);
    }
    .home-tab-recent-files-filter-btn :global(svg){
        width: 16px;
        height: 16px;
    }
    .home-tab-recent-files-filter-input{
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
    .home-tab-recent-files-filter.expanded .home-tab-recent-files-filter-input{
        width: 160px;
        margin-left: 6px;
        padding: 2px 8px;
        opacity: 1;
        border-color: var(--background-modifier-border);
        background-color: var(--background-modifier-form-field);
    }
    /* Keep the focused background identical to the search bar (Obsidian would otherwise darken it on focus) */
    .home-tab-recent-files-filter-input:focus{
        border-color: var(--interactive-accent);
        background-color: var(--background-modifier-form-field);
    }
    .home-tab-recent-files-wrapper{
        display: flex;
        /* min-width: 250px; */
        width: 100%;
        max-width: 900px;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        margin: auto;
        outline: none;
    }

    .home-tab-recent-files-wrapper.compact{
        gap: 6px 8px;
    }

    @media(max-width: 600px){
        .home-tab-recent-files-container{
            width: 90%;
            padding-bottom: 75px;
        }
        .home-tab-recent-files-wrapper{
            gap: 6px 8px;
        }
    }
</style>

<script lang="ts">
	import { App, Menu, type PaneType, type TFile, View } from "obsidian";
	import { onDestroy } from "svelte";
	import { get } from "svelte/store";
	import type { HomeTabSettings } from "src/settings";
	import type HomeTabSearchBar from "src/homeTabSearchbar";
	import { buildPeriodicNoteEntries, openOrCreatePeriodicNote, type PeriodicNoteEntry } from "src/periodicNotes";
	import { periodicFocusRequest, periodicFocusBackRequest, advanceSectionFocus } from "src/store";
	import { t } from "../i18n";
	import FileDisplayItem from "./svelteComponents/fileDisplayItem.svelte";

    export let view: View
    export let pluginSettings: HomeTabSettings
    export let HomeTabSearchBar: HomeTabSearchBar | undefined = undefined

    const app: App = view.leaf.app

    let entries: PeriodicNoteEntry[] = buildPeriodicNoteEntries(app, pluginSettings)
    let selectedIndex = -1
    let listWrapperEl: HTMLElement

    function refreshEntries(): void {
        entries = buildPeriodicNoteEntries(app, pluginSettings)
        if (selectedIndex >= entries.length) {
            selectedIndex = entries.length - 1
        }
    }

    // Rebuild labels when the settings store updates, without reopening the tab.
    $: if (pluginSettings) refreshEntries()
    $: decorationLeft = pluginSettings?.periodicNotesDecorationMode === 'custom'
        ? (pluginSettings.periodicNotesDecorationLeft ?? '{')
        : pluginSettings?.periodicNotesDecorationMode === 'angleBrackets' ? '<'
        : pluginSettings?.periodicNotesDecorationMode === 'braces' ? '{'
        : ''
    $: decorationRight = pluginSettings?.periodicNotesDecorationMode === 'custom'
        ? (pluginSettings.periodicNotesDecorationRight ?? '}')
        : pluginSettings?.periodicNotesDecorationMode === 'angleBrackets' ? '>'
        : pluginSettings?.periodicNotesDecorationMode === 'braces' ? '}'
        : ''

    // Follow day/week/month rollovers while the tab stays open
    const rolloverInterval = window.setInterval(refreshEntries, 60_000)
    onDestroy(() => window.clearInterval(rolloverInterval))

    // Expand and focus the first item when requested from the search bar (Tab navigation).
    // Baseline against the current store value so a freshly mounted component (new tab)
    // doesn't replay stale requests; empty sections forward to the next visible section.
    let lastSeenFocusRequest = get(periodicFocusRequest)
    $: if ($periodicFocusRequest > lastSeenFocusRequest) {
        lastSeenFocusRequest = $periodicFocusRequest
        if (entries.length === 0) {
            advanceSectionFocus('periodic', false, () => HomeTabSearchBar?.focusSearchbar())
        } else {
            focusListItem(0)
        }
    }

    // Focus the last item when walking backwards into this section.
    let lastSeenFocusBackRequest = get(periodicFocusBackRequest)
    $: if ($periodicFocusBackRequest > lastSeenFocusBackRequest) {
        lastSeenFocusBackRequest = $periodicFocusBackRequest
        if (entries.length === 0) {
            advanceSectionFocus('periodic', true, () => HomeTabSearchBar?.focusSearchbar())
        } else {
            focusListItem(entries.length - 1)
        }
    }

    function focusListItem(index: number): void {
        selectedIndex = index
        setTimeout(() => listWrapperEl?.focus(), 0)
    }

    function scrollSelectedItemIntoView(): void {
        const items = listWrapperEl?.querySelectorAll('.home-tab-file-item')
        items?.[selectedIndex]?.scrollIntoView({ block: 'nearest' })
    }

    function moveSelection(delta: 1 | -1): void {
        if (entries.length === 0) return
        selectedIndex = (selectedIndex + delta + entries.length) % entries.length
        scrollSelectedItemIntoView()
    }

    function handleListKeydown(e: KeyboardEvent): void {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault()
            moveSelection(1)
        }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault()
            moveSelection(-1)
        }
        else if (e.key === 'Home') {
            e.preventDefault()
            focusListItem(0)
        }
        else if (e.key === 'End') {
            e.preventDefault()
            focusListItem(entries.length - 1)
        }
        else if (e.key === 'Enter') {
            e.preventDefault()
            const entry = entries[selectedIndex]
            if (entry) {
                void openAndShowEntry(entry)
                selectedIndex = -1
            }
        }
        else if (e.key === 'Escape') {
            e.preventDefault()
            selectedIndex = -1
            HomeTabSearchBar?.focusSearchbar()
        }
        else if (e.key === 'Tab') {
            e.preventDefault()
            selectedIndex = -1
            advanceSectionFocus('periodic', e.shiftKey, () => HomeTabSearchBar?.focusSearchbar())
        }
    }

    function handleListBlur(): void {
        selectedIndex = -1
    }

    /** Opens the note, creating it first when it does not exist yet */
    async function openEntry(entry: PeriodicNoteEntry, newTab?: boolean | PaneType): Promise<TFile | undefined> {
        const file = await openOrCreatePeriodicNote(app, entry)
        if (file) {
            refreshEntries() // update the pending badge after creation
        }
        return file
    }

    /**
     * Direct open paths (list Enter, context menu) that bypass the
     * FileDisplayItem click handler: create/resolve the note, then show it in
     * the given pane ('tab' / 'window' / default = the active leaf).
     */
    async function openAndShowEntry(entry: PeriodicNoteEntry, pane?: PaneType): Promise<void> {
        const file = await openEntry(entry)
        if (file) {
            await app.workspace.getLeaf(pane).openFile(file)
        }
    }

    function showEntryMenu(event: MouseEvent, entry: PeriodicNoteEntry): void {
        const menuText = t().periodicNotesMenu
        const menu = new Menu()
        if (!entry.exists) {
            menu.addItem((item) => item
                .setTitle(menuText.createNote)
                .setIcon('plus')
                .onClick(() => openEntry(entry)))
        }
        menu
            .addItem((item) => item
                .setTitle(menuText.openInNewTab)
                .setIcon('tab')
                .onClick(() => openAndShowEntry(entry, 'tab')))
            .addItem((item) => item
                .setTitle(menuText.openInNewWindow)
                .setIcon('app-window')
                .onClick(() => openAndShowEntry(entry, 'window')))
            .showAtMouseEvent(event)
    }
</script>

{#if entries.length > 0}
    <div class="home-tab-periodic-notes-container">
        <span class="home-tab-periodic-notes-decoration" aria-hidden="true">{decorationLeft}</span>
        <div class="home-tab-periodic-notes-wrapper"
            bind:this={listWrapperEl}
            tabindex="-1"
            on:keydown={handleListKeydown}
            on:blur={handleListBlur}
        >
            {#each entries as entry, index (entry.path)}
                <!-- svelte-ignore a11y-no-static-element-interactions (right-click opens the item menu) -->
                <div class="home-tab-periodic-note-wrapper"
                    on:contextmenu|preventDefault={(event) => showEntryMenu(event, entry)}>
                    <FileDisplayItem file={entry.file} displayName={entry.useFileDisplayName && entry.file ? undefined : entry.label}
                        {app} {pluginSettings} contextualMenu={new Menu()}
                        customOpen={(newTab) => openEntry(entry, newTab)}
                        showMenuButton={false}
                        showIcon={false}
                        pending={!entry.exists}
                        selected={index === selectedIndex}/>
                </div>
            {/each}
        </div>
        <span class="home-tab-periodic-notes-decoration" aria-hidden="true">{decorationRight}</span>
    </div>
{/if}

<style>
    .home-tab-periodic-notes-container{
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--size-4-2);
        width: 65%;
        max-width: 900px;
        padding-top: 30px;
        margin: auto;
    }
    .home-tab-periodic-notes-decoration{
        flex: 0 0 auto;
        white-space: pre;
    }
    .home-tab-periodic-notes-wrapper{
        flex: 0 1 auto;
        width: max-content;
        max-width: 100%;
        min-width: 0;
        display: flex;
        align-items: baseline;
        justify-content: center;
        flex-wrap: wrap;
        outline: none;
    }
    .home-tab-periodic-note-wrapper{
        display: contents;
    }

    @media(max-width: 600px){
        .home-tab-periodic-notes-container{
            width: 90%;
        }
    }
</style>

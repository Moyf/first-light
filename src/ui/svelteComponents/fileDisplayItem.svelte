<script lang="ts">
    import { File, FilePieChart, FileText, FileAudio, FileImage, FileVideo, LayoutDashboard, Table, Database, X as DeleteIcon, MoreHorizontal, Plus} from 'lucide-svelte'
    import { type TFile, type IconName, Keymap, type PaneType, App, Menu, getIcon } from 'obsidian';
    import { getFileTypeFromExtension } from 'src/utils/getFileTypeUtils';
	import type { HomeTabSettings } from 'src/settings';
	import { createEventDispatcher, onMount } from 'svelte';
    import { getFileDisplayName } from 'src/utils/fileDisplayName';

    export let app: App
    // file is optional for virtual entries (periodic notes that do not exist yet)
    export let file: TFile | undefined = undefined
    export let pluginSettings: HomeTabSettings
    export let contextualMenu: Menu
    export let customIcon: IconName | undefined = undefined
    export let selected: boolean = false
    // Display name override (e.g. a custom periodic note label)
    export let displayName: string | undefined = undefined
    // Resolves (creating if needed) the file to open; enables virtual entries
    export let customOpen: ((newTab?: boolean | PaneType) => Promise<TFile | undefined>) | undefined = undefined
    // Hide the hover menu button when the parent handles menus itself
    export let showMenuButton: boolean = true
    // Marks not-yet-created notes with a small plus badge
    export let pending: boolean = false
    // Text-only item (e.g. periodic notes): renders no file type / custom icon
    export let showIcon: boolean = true
    export let gridAligned: boolean = false

    let metadataRevision = 0
    // The revision makes metadata edits refresh the label without reopening the tab.
    function fileLabel(currentFile: TFile | undefined, properties: string, _revision: number): string {
        return currentFile ? getFileDisplayName(app, currentFile, properties) : ''
    }
    $: filename = displayName ?? fileLabel(file, pluginSettings.displayNameProperties ?? 'title', metadataRevision)
    $: fileType = file ? getFileTypeFromExtension(file.extension) : 'markdown'

    onMount(() => {
        const ref = app.metadataCache.on('changed', (changedFile) => {
            if (changedFile.path === file?.path) metadataRevision++
        })
        return () => app.metadataCache.offref(ref)
    })

    const dispatch = createEventDispatcher<{itemMenu:{file: TFile}}>()

    async function handleFileOpening(target: TFile | undefined, newTab?: boolean | PaneType): Promise<void>{
        const resolvedFile = customOpen ? await customOpen(newTab) : target
        if(!resolvedFile) return
        const leaf = app.workspace.getLeaf(newTab)
        await leaf.openFile(resolvedFile)
    }

    function handleMouseClick(e: MouseEvent, target: TFile | undefined): void{
        if ((e.target as HTMLElement).classList.contains('home-tab-file-item-remove_btn')) return
        else if(e.button != 2){
            handleFileOpening(target, Keymap.isModEvent(e))
        }
    }

    function handleMenuClick(e: MouseEvent): void{
        contextualMenu.showAtMouseEvent(e)
        dispatch('itemMenu', {file: file as TFile})
    }
</script>

<div class="home-tab-file-item" class:use-accent-color="{pluginSettings.selectionHighlight === 'accentColor'}"
    class:selected="{selected}"
    class:compact={pluginSettings.compactMode}
    class:grid={gridAligned}
    class:has-menu={showMenuButton}
    class:has-pending={pending}
    on:mousedown|preventDefault="{e => handleMouseClick(e, file)}">

    {#if showMenuButton}
    <!-- svelte-ignore a11y-click-events-have-key-events (mouse-driven UI, keyboard users have alternative paths) -->
    <div class="home-tab-file-item-remove_btn" aria-label="File options"
        on:click={handleMenuClick}>
        <MoreHorizontal strokeWidth={1} width={24} height={24} class='svg-icon lucide-x'/>
    </div>
    {/if}

    {#if showIcon}
    <div class="home-tab-file-item-preview-icon">
        {#if customIcon}
            <svg xmlns="http://www.w3.org/2000/svg"  width="24" height="24"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="1" stroke-linecap="round" stroke-linejoin="round"
                        class="lucide-icon lucide lucide-{customIcon}">
                            {@html getIcon(customIcon)?.innerHTML}
            </svg>
        {:else}
            {#if fileType === 'markdown'}
                <FileText strokeWidth={1}/>
            {:else if fileType === 'image'}
                <FileImage strokeWidth={1}/>
            {:else if fileType === 'video'}
                <FileVideo strokeWidth={1}/>
            {:else if fileType === 'audio'}
                <FileAudio strokeWidth={1}/>
            {:else if fileType === 'pdf'}
                <FilePieChart strokeWidth={1}/>
            {:else if fileType === 'canvas'}
                <LayoutDashboard strokeWidth={1}/>
            {:else if fileType === 'base'}
                <Table strokeWidth={1}/>
            {:else if fileType === 'database'}
                <Database strokeWidth={1}/>
            {:else}
                <File strokeWidth={1}/>
            {/if}
        {/if}
    </div>
    {/if}
    <div class="home-tab-file-item-name">
        {filename}
    </div>

    {#if pending}
        <div class="home-tab-file-item-pending" aria-label="Not created yet">
            <Plus strokeWidth={2} width={12} height={12}/>
        </div>
    {/if}
</div>

<style>
    .home-tab-file-item{
        margin: 5px;
        padding: 5px;
        border-radius: var(--radius-m);
        /* height: 100px; */
        min-width: 75px;
        max-width: 125px;

        position: relative;
    }

    .home-tab-file-item:hover,
    .home-tab-file-item.selected{
        background-color: var(--background-modifier-hover);
    }
    .home-tab-file-item.use-accent-color:hover,
    .home-tab-file-item.use-accent-color.selected{
        color: white;
        background: var(--interactive-accent);
    }
    .home-tab-file-item-preview-icon{
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--size-2-3);
    }

    .home-tab-file-item-name{
        /* padding: var(--size-2-3); */
        text-align: center;
        font-size: var(--font-ui-small);

        /* Text trimming */
        display: -webkit-box;
        overflow: hidden;
        text-overflow: ellipsis;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
    }

    .home-tab-file-item-remove_btn{
        opacity: 0;
        position: absolute;
        top: 4px;
        right: 4px;
    }

    .home-tab-file-item-remove_btn:hover{
        opacity: 1;
    }

    .home-tab-file-item-pending{
        position: absolute;
        top: 4px;
        left: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        color: var(--text-on-accent);
        background-color: var(--interactive-accent);
        opacity: 0.85;
    }

    .home-tab-file-item.compact{
        display: flex;
        align-items: center;
        flex: 0 1 auto;
        width: max-content;
        max-width: min(280px, 100%);
        min-width: 0;
        box-sizing: border-box;
        height: fit-content;
        padding: 6px 8px;
        margin: 0;
    }
    .compact .home-tab-file-item-preview-icon{
        flex-shrink: 0;
        padding: 0;
        margin-right: 8px;
    }
    .compact .home-tab-file-item-preview-icon :global(svg){
        width: 16px;
        height: 16px;
    }
    .compact .home-tab-file-item-name{
        flex: 1;
        min-width: 0;
        text-align: left;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
        -webkit-line-clamp: unset;
        -webkit-box-orient: unset;
        padding-right: 0;
    }
    .compact.has-menu .home-tab-file-item-name{
        padding-right: 28px;
    }
    .compact.has-pending .home-tab-file-item-name{
        padding-right: 18px;
    }
    .compact .home-tab-file-item-remove_btn{
        top: 50%;
        right: 4px;
        transform: translateY(-50%);
    }
    .compact .home-tab-file-item-pending{
        top: 2px;
        left: unset;
        right: 2px;
        width: 14px;
        height: 14px;
    }

    @media(max-width: 600px){
        .home-tab-file-item{
            display: flex;
            align-items: center;
            width: max-content;
            max-width: 100%;
            min-width: 0;
            height: fit-content;
            padding: 6px 8px;
            margin: 0;
        }
        .home-tab-file-item-preview-icon{
            flex-shrink: 0;
            padding: 0;
            margin-right: 8px;
        }
        .home-tab-file-item-preview-icon :global(svg){
            width: 16px;
            height: 16px;
        }
        .home-tab-file-item-name{
            flex: 1;
            min-width: 0;
            text-align: left;
            /* 单行截断 */
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: block;
            /* 覆盖宽屏的 -webkit-box 多行截断 */
            -webkit-line-clamp: unset;
            -webkit-box-orient: unset;
            /* 给右侧绝对定位的菜单按钮留空间，避免重叠 */
            padding-right: 28px;
        }
        .home-tab-file-item-remove_btn{
            /* 保持绝对定位，但垂直居中 */
            top: 50%;
            right: 4px;
            transform: translateY(-50%);
        }
        .home-tab-file-item-pending{
            top: 2px;
            left: unset;
            right: 2px;
            width: 14px;
            height: 14px;
        }
    }
    .home-tab-file-item.grid{
        width: 100%;
        min-width: 0;
        max-width: none;
        margin: 0;
        height: 100%;
        box-sizing: border-box;
    }
</style>

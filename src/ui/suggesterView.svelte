<script lang="ts">
    import { quintOut } from 'svelte/easing'
    import { fade, slide } from 'svelte/transition'
    import { get } from 'svelte/store'
    import { pluginSettingsStore } from '../store'
    import type { Writable } from 'svelte/store'
	import type { Suggester, TextInputSuggester, suggesterViewOptions } from '../suggester/suggester';

    export let options: suggesterViewOptions
    export let textInputSuggester: TextInputSuggester<any>
    // 根元素通过 store 暴露给建议器，销毁时可同步移除 DOM（防止连续切换时下拉叠加）
    export let viewRoot: Writable<HTMLElement | undefined>
    export let emptyStateVisible: Writable<boolean>

    let suggester: Suggester<any> = textInputSuggester.getSuggester()

    const suggestionsStore = suggester.suggestionsStore
    const selectedItemIndexStore = suggester.selectedItemIndexStore
    $: suggestions = $suggestionsStore ?? []
    $: selectedItemIndex = $selectedItemIndexStore

    function mountDropdown(node: HTMLElement) {
        return { destroy: textInputSuggester.mountDropdown(node) }
    }

    function dropdownTransition(node: HTMLElement) {
        const overlay = options.emptyStateText && (get(pluginSettingsStore)?.searchDropdownDisplay ?? 'overlay') === 'overlay'
        return overlay ? fade(node, { duration: 120 }) : slide(node, { duration: 200, easing: quintOut })
    }
    
    const suggestionWrapper = suggester.suggestionsContainer
</script>

{#if suggestions.length > 0 || $emptyStateVisible}
    <div class="{options.containerClass ?? 'suggestion-container popover suggestion-popover'}" 
        bind:this={$viewRoot}
        use:mountDropdown
        on:mousedown="{(e) => e.preventDefault()}"
        transition:dropdownTransition>
        <div class="{options.suggestionClass ?? 'suggestion'} {options.additionalClasses ?? ''}" class:scrollable="{options.isScrollable}"
            style="{options.style ?? ''}" bind:this={$suggestionWrapper}>
            {#each suggestions as suggestion, index (index)}
                <svelte:component this={textInputSuggester.getDisplayElementComponentType()}
                                {index} {suggestion} {textInputSuggester} {selectedItemIndex}
                                {... textInputSuggester.getDisplayElementProps(suggestion)}/>
            {/each}
            {#if $emptyStateVisible}
                <div class="home-tab-search-empty-state" role="status">{options.emptyStateText}</div>
            {/if}
        </div>
        {#if options.additionalModalInfo && suggestions.length > 0}
            <div class="suggester-additional-info">
                {@html options.additionalModalInfo.outerHTML}
            </div>
        {/if}
    </div>
{/if}

<style>
    .scrollable{
        overflow-y: auto;
    }
</style>

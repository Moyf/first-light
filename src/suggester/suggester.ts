// Inspired from @liamcain periodic notes suggest: https://github.com/liamcain/obsidian-periodic-notes/blob/main/src/ui/suggest.ts

import { debounce, Platform, Scope, type App, type Debouncer } from 'obsidian'
import suggesterView from '../ui/suggesterView.svelte'
import { createPopper, type Instance as PopperInstance } from '@popperjs/core';
import { get, writable, type Writable } from 'svelte/store';
import type { SvelteComponent } from 'svelte';
import { t } from '../i18n';
import { mountSearchDropdown } from '../utils/searchDropdown';

/**
 * @param containerClass The class of the suggestion list container.
 * @param suggestionClass Class of the suggestion list, if not given will be used the obsidian default 'suggestion'
 * @param additionalClasses Additional suggestion list classes.
 * @param style The style of the suggestion list, usefull to implement variables.
 * @param additionalModalInfo HTMLelement to render under suggestion items.
 */
export interface suggesterViewOptions{
    isScrollable?: boolean
    containerClass?: string
    suggestionClass?: string
    additionalClasses?: string
    style?: string
    additionalModalInfo?: HTMLElement
    emptyStateText?: string
    // additionalComponent?: typeof SvelteComponent
    // additionalComponentProps?: []
}

interface ISuggester<T = unknown>{
    getSuggestions: (input: string) => T[] | Promise<T[]>
    useSelectedItem: (item: T, middleClick?: boolean) => void
    getDisplayElementProps: (suggestion: T) => Record<string, unknown>
    scrollSelectedItemIntoView: () => void
    onNoSuggestion: () => void
    closeAfterUse?: () => void  // 添加可选的关闭方法
}

export class Suggester<T>{
    private ISuggester: ISuggester<T>
    private suggestions: T[]
    private selectedItemIndex: number
    suggestionsContainer: Writable<HTMLElement>
    suggestionsStore: Writable<T[]>
    selectedItemIndexStore: Writable<number>

    constructor(ISuggester: ISuggester<T>, scope: Scope){
        this.ISuggester = ISuggester

        // Svelte store variables
        this.suggestionsStore = writable()
        this.selectedItemIndexStore = writable()
        this.suggestionsContainer = writable()

        this.selectedItemIndexStore.subscribe((value) => this.selectedItemIndex = value)
        this.suggestionsStore.subscribe((value) => this.suggestions = value)

        this.setSuggestions([])
        this.setSelectedItemIndex(0)

        scope.register([], 'ArrowUp', (e) => {
            e.preventDefault()
            this.setSelectedItemIndex(this.selectedItemIndex - 1)
            this.ISuggester.scrollSelectedItemIntoView()
        })
        scope.register([], 'ArrowDown', (e) => {
            e.preventDefault()
            this.setSelectedItemIndex(this.selectedItemIndex + 1)
            this.ISuggester.scrollSelectedItemIntoView()
        })
        scope.register([], 'Enter', (e) => {
            e.preventDefault()
            const selectedItem = this.getSelectedItem()
            if (selectedItem) {
                this.ISuggester.useSelectedItem(selectedItem)
                // 如果实现了 closeAfterUse 方法，则在使用选中项后自动关闭
                if (this.ISuggester.closeAfterUse) {
                    this.ISuggester.closeAfterUse()
                }
            }
        })
    }

    setSuggestions(suggestions: T[]){
        this.selectedItemIndexStore.set(0) // Reset selected item to the first result
        this.suggestionsStore.set(suggestions) // Update suggestions list
    }
    getSuggestions(): T[]{
        return this.suggestions
    }
    getSelectedItem(): T{
        return this.suggestions[this.selectedItemIndex]
    }
    getSelectedItemIndex(): number{
        return this.selectedItemIndex
    }
    getSuggestionByIndex(index: number): T{
        return this.suggestions[index]
    }
    setSelectedItemIndex(newIndex: number): void{
        if (newIndex >= this.suggestions.length){
            this.selectedItemIndexStore.set(0)
        }
        else if (newIndex < 0){
            this.selectedItemIndexStore.set(this.suggestions.length - 1)
        }
        else{
            this.selectedItemIndexStore.set(newIndex)
        }
    }
}

export abstract class TextInputSuggester<T> implements ISuggester{
    protected app: App
    protected inputEl: HTMLInputElement
    
    protected suggestionParentContainer: HTMLElement
    protected suggestionContainer: HTMLElement
    protected suggesterView: suggesterView | undefined
    // 建议视图根元素（由 suggesterView 通过 store 绑定），销毁时可同步移除 DOM
    private viewRootEl: Writable<HTMLElement | undefined> = writable()

    protected scope: Scope
    protected viewOptions: suggesterViewOptions
    
    protected suggester: Suggester<T>

    protected additionalCleaning(): void{}
    protected onOpen(): void{}
    protected onClose(): void{}

    protected displayedSuggestions: boolean
    
    protected closingAnimationTimeout: number
    protected closingAnimationRunning: boolean

    private inputListener: Debouncer<[Event], Promise<void>>
    private compositionEndListener: () => void
    private lastValue: string
    // Keep a single bound reference so removeEventListener in destroy() can
    // actually detach the blur listener (close.bind(this) creates a new
    // function on every call).
    private boundClose: () => void
    private requestId = 0
    private destroyed = false
    private readonly isHomeSearch: boolean
    private readonly emptyStateVisible = writable(false)

    constructor(app: App, inputEl: HTMLInputElement, suggestionParentContainer: HTMLElement, viewOptions?: suggesterViewOptions, searchDelay?: number){
        this.app = app
        this.inputEl = inputEl
        this.scope = new Scope(this.app.scope)
        
        this.suggester = new Suggester(this, this.scope)
        
        // 使用较长的延迟时间，并确保只在值变化时触发
        const delay = searchDelay ?? 200;
        this.inputListener = debounce(
            async (e: Event) => {
                // IME 组合输入（拼音等）过程中的 input 事件不触发搜索，
                // 中间态内容会导致下拉框反复开关闪烁，由 compositionend 统一触发
                if((e as InputEvent).isComposing) return
                const target = e.target as HTMLInputElement;
                if (target.value !== this.lastValue) {
                    this.lastValue = target.value;
                    await this.onInput();
                }
            },
            delay,
            true
        );
        
        this.inputEl.addEventListener('input', this.inputListener);
        // IME 候选词上屏后立即搜索一次
        this.compositionEndListener = () => {
            if(this.inputEl.value === this.lastValue) return
            this.lastValue = this.inputEl.value
            void this.onInput()
        };
        this.inputEl.addEventListener('compositionend', this.compositionEndListener);
        // 移除 focus 事件监听，避免重复触发
        this.boundClose = this.close.bind(this);
        this.inputEl.addEventListener('blur', this.boundClose);
        
        this.scope.register([], 'escape', this.boundClose);
        
        this.viewOptions = viewOptions ?? {};
        this.suggestionParentContainer = suggestionParentContainer;
        this.isHomeSearch = suggestionParentContainer.classList.contains('home-tab-searchbar-container')
        if (this.isHomeSearch) this.viewOptions.emptyStateText = t().searchNoResults
        this.closingAnimationRunning = false;
    }
    
    // 在使用选中项后自动关闭建议器
    closeAfterUse(): void {
        this.close();
    }

    async onInput(): Promise<void>{
        if (this.destroyed) return
        const requestId = ++this.requestId
        const input = this.inputEl.value
        this.lastValue = input
        const suggestions = await this.getSuggestions(input)
        
        // 搜索期间输入已经变化：本次结果已过期，直接丢弃，
        // 避免快速输入时新旧结果交替造成闪烁
        if(this.destroyed || requestId !== this.requestId || this.inputEl.value !== input) return
        
        this.emptyStateVisible.set(false)
        this.suggester.setSuggestions(suggestions ?? [])
        
        if(suggestions && suggestions.length > 0){
            this.open()
        } else {
            this.onNoSuggestion()
            // Keep a stable panel for a nonempty home query, while preserving
            // specialized fallback rows (e.g. Surfing's new-URL suggestion).
            if (this.isHomeSearch && input.trim() && !this.suggester.getSuggestions().length) {
                this.emptyStateVisible.set(true)
                this.open()
            }
        }
    }

    onNoSuggestion(): void{
        if (!this.isHomeSearch || !this.inputEl.value.trim()) this.close()
    }

    mountDropdown(node: HTMLElement): () => void {
        const anchor = this.inputEl.parentElement
        return this.isHomeSearch && anchor
            ? mountSearchDropdown(node, anchor, this.suggestionParentContainer)
            : () => {}
    }

    getContainerEl(): HTMLElement{
        return this.suggestionParentContainer
    }

    // 跟踪作用域是否已被推入堆栈
    private scopeActive = false;

    // Pop the suggester scope off the keymap stack, if it is currently pushed.
    // Also used when the suggestion list stays open (hideOnBlur=false): the
    // UI must survive, but the keyboard scope must not leak once the input
    // loses focus.
    protected releaseKeyboardScope(): void{
        if(this.scopeActive){
            this.app.keymap.popScope(this.scope)
            this.scopeActive = false
        }
    }

    open(): void{
        if (this.destroyed) return
        if(this.closingAnimationRunning) {
            if (this.isHomeSearch) {
                window.clearTimeout(this.closingAnimationTimeout)
                this.closingAnimationRunning = false
            } else {
                // Generic popovers may detach their mount point on close.
                this.abortClosingAnimation()
            }
        }
        
        this.suggestionContainer = this.getContainerEl()

        // 只有在作用域未激活时才推入
        if (!this.scopeActive && this.inputEl.ownerDocument.activeElement === this.inputEl) {
            this.app.keymap.pushScope(this.scope)
            this.scopeActive = true;
        }

        if(this.suggesterView) {
            this.onOpen()
            return
        }

        this.suggesterView = new suggesterView({
            target: this.suggestionContainer,
            props:{
                textInputSuggester: this,
                options: this.viewOptions,
                viewRoot: this.viewRootEl,
                emptyStateVisible: this.emptyStateVisible,
            },
            intro: true,
        })

        this.onOpen()
    }

    close(): void{
        this.inputListener.cancel()
        this.requestId++ // In-flight searches must not reopen a dismissed view.
        // 清理键盘作用域
        this.releaseKeyboardScope()

        // Reset suggestions
        this.suggester.setSuggestions([])
        this.emptyStateVisible.set(false)

        // Allow svelte to run the animation, then remove the component(s)
        if(this.suggesterView){
            this.closingAnimationRunning = true
            window.clearTimeout(this.closingAnimationTimeout)
            this.closingAnimationTimeout = window.setTimeout(() => {
                this.teardownView()
            }, 200)
        }

        this.additionalCleaning()
        this.onClose()
    }

    // 立即销毁建议视图（普通 close 保留 200ms 滑出动画，销毁/重开时跳过动画）
    private teardownView(): void{
        window.clearTimeout(this.closingAnimationTimeout)
        this.suggesterView?.$destroy()
        this.suggesterView = undefined
        // 同步移除残留 DOM：$destroy 不会立刻脱离文档（outro 进行中或 hideOnBlur
        // 提前返回时），否则连续切换过滤器会叠加多个下拉
        get(this.viewRootEl)?.remove()
        this.viewRootEl.set(undefined)
        this.closingAnimationRunning = false
    }

    abortClosingAnimation(): void{
        this.teardownView()
    }
    


    destroy(): void{
        this.destroyed = true
        this.inputListener.cancel()
        this.close()
        // close() 可能保留视图（hideOnBlur=false 提前返回）或延迟移除（关闭动画），
        // 销毁时必须立即清除，否则切换建议器后旧下拉会残留并不断叠加
        this.teardownView()
        this.inputEl.removeEventListener('input', this.inputListener)
        this.inputEl.removeEventListener('compositionend', this.compositionEndListener)
        this.inputEl.removeEventListener('blur', this.boundClose)
        
        // 最后确保作用域被清理
        this.releaseKeyboardScope()
    }
    
    scrollSelectedItemIntoView(): void{
        get(this.suggester.suggestionsContainer).children[this.suggester.getSelectedItemIndex()]?.scrollIntoView({behavior: 'auto', block: 'nearest', inline: 'nearest'})
    }
    
    getSuggester(): Suggester<T>{
        return this.suggester
    }

    setInput(input: string, triggerEvent = true): void {
        this.inputEl.value = input;
        if (triggerEvent) {
            this.inputEl.dispatchEvent(new Event("input")); // Trigger input
        }
    }

    abstract getSuggestions(input: string): T[] | Promise<T[]>
    abstract useSelectedItem(item: T, middleClick?: boolean): void
    abstract getDisplayElementProps(suggestion: T): Record<string, unknown>
    abstract getDisplayElementComponentType(): typeof SvelteComponent
}

export abstract class PopoverTextInputSuggester<T> extends TextInputSuggester<T>{
    private popperInstance: PopperInstance
    private popperWrapper: HTMLElement

    constructor(app: App, inputEl: HTMLInputElement, viewOptions?: suggesterViewOptions){
        // Mount suggestions into the window that owns the input, so popout
        // windows (e.g. the detached settings window in Obsidian 1.13+) get
        // their own popover instead of one trapped behind the main window.
        // Popout windows mirror the main window DOM structure (.app-container).
        const ownerDoc = inputEl.ownerDocument
        const ownerAppContainer = ownerDoc.querySelector<HTMLElement>('.app-container')
        super(app, inputEl, ownerAppContainer ?? app.dom.appContainerEl, viewOptions)
    }

    getContainerEl(): HTMLElement {
        const ownerDoc = this.inputEl.ownerDocument
        if(ownerDoc.contains(this.popperWrapper)) return this.popperWrapper
        this.popperWrapper = this.suggestionParentContainer.createDiv('popper-wrapper')
        // Render element on top of modals
        this.popperWrapper.setCssProps({ zIndex: 'var(--layer-menu)' })

        const isPhone = Platform.isPhone
        // On phones place popover on bottom of the screen
        const popperReference = isPhone ? ownerDoc.body : this.inputEl
        if(isPhone){this.popperWrapper.setCssStyles({ width: '100%' })}

        this.popperInstance = createPopper(popperReference, this.popperWrapper, {
            placement: 'bottom-start',
            modifiers: [{
                name: 'offset',
                options: {
                    offset: [0, 5]
                }
            }]
        })

        return this.popperWrapper
    }

    additionalCleaning(): void {
        if(this.popperInstance){
            this.popperInstance.destroy()
        }
        if(this.inputEl.ownerDocument.body.contains(this.popperWrapper)){
            this.popperWrapper.detach()
        }
    }

    abstract getSuggestions(input: string): T[]
    abstract useSelectedItem(item: T): void
    abstract getDisplayElementProps(suggestion: T): Record<string, unknown>
    abstract getDisplayElementComponentType(): typeof SvelteComponent
}

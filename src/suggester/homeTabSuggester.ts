import { normalizePath, Platform, TAbstractFile, TFile, View, type App } from 'obsidian'
import type Fuse from 'fuse.js'
import { DEFAULT_FUSE_OPTIONS, FileFuzzySearch, type SearchFile } from './fuzzySearch'
import type HomeTab from '../main'
import type HomeTabSearchBar from "src/homeTabSearchbar"
import { generateSearchFile,  getParentFolderFromPath,  getSearchFiles, getUnresolvedMarkdownFiles } from 'src/utils/getFilesUtils'
import { TextInputSuggester } from './suggester'
import { generateHotkeySuggestion } from 'src/utils/htmlUtils'
import { isValidExtension, MEDIA_FILE_TYPES, type FileExtension, type FileType } from 'src/utils/getFileTypeUtils'
import { get } from 'svelte/store'
import HomeTabFileSuggestion from 'src/ui/svelteComponents/homeTabFileSuggestion.svelte'
import { MatchAnalyzer } from 'src/utils/matchAnalyzer'
import { isFileInFolderPath, parseFolderSearchQuery } from 'src/utils/folderSearchQuery'

declare module 'obsidian'{
    interface MetadataCache{
        onCleanCache: (callback: () => void) => void
    }
}

export default class HomeTabFileSuggester extends TextInputSuggester<Fuse.FuseResult<SearchFile>>{
    private files: SearchFile[]
    private fuzzySearch: FileFuzzySearch

    private view: View
    private plugin: HomeTab
    private searchBar: HomeTabSearchBar

    private activeFilter: FileType | FileExtension | null = null
    private matchAnalyzer: MatchAnalyzer
    private folderSearchIndex: FileFuzzySearch | undefined
    private folderSearchIndexKey: string | undefined

    constructor(app: App, plugin: HomeTab, view: View, searchBar: HomeTabSearchBar) {
        super(app, get(searchBar.searchBarEl), get(searchBar.suggestionContainerEl), {
                containerClass: `home-tab-suggestion-container ${Platform.isPhone ? 'is-phone' : ''}`,
                additionalClasses: `${plugin.settings.selectionHighlight === 'accentColor' ? 'use-accent-color' : ''}`,
                additionalModalInfo: plugin.settings.showShortcuts ? generateHotkeySuggestion([
                    {hotkey: '↑↓', action: 'to navigate'},
                    {hotkey: '↵', action: 'to open'},
                    {hotkey: 'shift ↵', action: 'to create'},
                    {hotkey: 'ctrl ↵', action: 'to open in new tab'},
                    {hotkey: 'esc', action: 'to dismiss'},], 
                    'home-tab-hotkey-suggestions') : undefined
                }, plugin.settings.searchDelay)
        this.plugin = plugin
        this.view = view
        this.searchBar = searchBar
        this.matchAnalyzer = new MatchAnalyzer(plugin.settings)

        this.app.metadataCache.onCleanCache(() => {
            if (this.plugin.settings.markdownOnly) {
                // 获取所有文件
                const allFiles = getSearchFiles(this.app, this.plugin.settings.unresolvedLinks);
                
                // 先过滤出 markdown 文件
                let filteredFiles = this.filterSearchFileArray('markdown', allFiles);
                
                // 如果设置了额外的后缀名，添加这些文件
                if (this.plugin.settings.additionalExtensions) {
                    const additionalFiles = this.getAdditionalExtensionFiles(allFiles);
                    filteredFiles = [...filteredFiles, ...additionalFiles];
                }
                
                this.files = filteredFiles;
            } else {
                this.files = getSearchFiles(this.app, this.plugin.settings.unresolvedLinks);
            }
            
            this.fuzzySearch = this.createFuzzySearch(this.files)
            this.folderSearchIndex = undefined
            this.folderSearchIndexKey = undefined
        })

        // Open file in new tab
        this.scope.register(['Mod'], 'Enter', (e) => {
            e.preventDefault()
            this.useSelectedItem(this.suggester.getSelectedItem(), true)
        })
        // Create file
        this.scope.register(['Shift'], 'Enter', async(e) => {
            e.preventDefault()
            await this.handleFileCreation()
        })
        // Create file and open in new tab
        this.scope.register(['Shift', 'Mod'], 'Enter', async(e) => {
            e.preventDefault()
            await this.handleFileCreation(undefined, true)
        })

        this.view.registerEvent(this.app.vault.on('create', (file: TAbstractFile) => { if(file instanceof TFile){this.updateSearchfilesList(file)}}))
        this.view.registerEvent(this.app.vault.on('delete', (file: TAbstractFile) => { if(file instanceof TFile){this.updateSearchfilesList(file)}}))
        this.view.registerEvent(this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => { if(file instanceof TFile){this.updateSearchfilesList(file, oldPath)}}))
        this.view.registerEvent(this.app.metadataCache.on('resolved', () => this.updateUnresolvedFiles()))
    }

    private createFuzzySearch(files: SearchFile[]): FileFuzzySearch {
        return new FileFuzzySearch(files, {
                ...DEFAULT_FUSE_OPTIONS,
                ignoreLocation: true,
                // 完全禁用字段标准化权重，让单一最佳匹配主导
                fieldNormWeight: 0.5,  // 完全消除多字段匹配的累积效应
                // 超极化权重：basename 绝对优先
                keys: [
                    {name: 'basename', weight: 10.0},  // 文件名绝对权重
                    {name: 'aliases', weight: 8.0},    // 别名高权重
                    ...(this.plugin.settings.searchTitle ? [{name: 'title', weight: 2.5}] : []),   // 标题中等权重
                    ...(this.plugin.settings.searchHeadings ? [{name: 'headings', weight: 1.0}] : [])  // 标题内容极低权重
                ]
            })
    }

    private getFilesForCurrentFilter(): SearchFile[] {
        const files = this.files ?? []
        if (!this.activeFilter) return files

        if (this.plugin.settings.markdownOnly && this.plugin.settings.additionalExtensions && this.activeFilter === 'markdown') {
            return [
                ...this.filterSearchFileArray(this.activeFilter, files),
                ...this.getAdditionalExtensionFiles(files),
            ]
        }

        return this.filterSearchFileArray(this.activeFilter, files)
    }

    private getFolderSearchIndex(folderPath: string): FileFuzzySearch {
        const cacheKey = `${this.activeFilter ?? ''}:${folderPath.toLowerCase()}`
        if (this.folderSearchIndex && this.folderSearchIndexKey === cacheKey) {
            return this.folderSearchIndex
        }

        const files = this.getFilesForCurrentFilter().filter(file => isFileInFolderPath(file.path, folderPath))
        this.folderSearchIndex = this.createFuzzySearch(files)
        this.folderSearchIndexKey = cacheKey
        return this.folderSearchIndex
    }

    // 重写 close 方法来检查 hideOnBlur 设置
    close(forceOrEvent?: boolean | Event): void {
        // 处理参数：如果第一个参数是事件对象，则 force = false
        const force = typeof forceOrEvent === 'boolean' ? forceOrEvent : false;
        
        // 如果是强制关闭（用户选择文件后），直接关闭
        if (force) {
            super.close();
            return;
        }
        
        // 如果是通过 blur 事件触发的 close，检查设置
        // 通过检查当前焦点来判断是否是 blur 事件触发的
        // (popout-safe: the input may live in another window than the plugin)
        if (this.inputEl.ownerDocument.activeElement !== this.inputEl) {
            // 当前元素失去焦点，检查 hideOnBlur 设置
            if (!(this.plugin.settings.hideOnBlur ?? true)) {
                // 设置为不隐藏时保留建议列表供鼠标点击，但仍要释放键盘作用域，
                // 否则失焦后 ↑/↓/Enter 会继续被残留的建议器劫持
                this.releaseKeyboardScope();
                return;
            }
        }
        
        // 调用父类的 close 方法
        super.close();
    }

    updateSearchBarContainerElState(isActive: boolean){
        this.inputEl.parentElement?.toggleClass('is-active', isActive)
    }

    onOpen(): void {
        this.updateSearchBarContainerElState(this.suggester.getSuggestions().length > 0 ? true : false)    
    }

    onClose(): void {
        this.updateSearchBarContainerElState(false)
    }

    filterSearchFileArray(filterKey: FileType | FileExtension, fileArray: SearchFile[]): SearchFile[]{
        // media 是聚合类型：文件存储的 fileType 为具体的 image/video/audio，需单独匹配
        if(filterKey === 'media'){
            return fileArray.filter(file => (MEDIA_FILE_TYPES as readonly string[]).includes(file.fileType ?? ''))
        }
        const arrayToFilter = fileArray
        return arrayToFilter.filter(file => isValidExtension(filterKey) ? file.extension === filterKey : file.fileType === filterKey)
    }

    updateUnresolvedFiles(){
        const unresolvedFiles = getUnresolvedMarkdownFiles(this.app)
        let newFiles = false
        if(this.files){
            unresolvedFiles.forEach((unresolvedFile) => {
                if(!this.files.includes(unresolvedFile)){
                    this.files.push(unresolvedFile)
                    newFiles = true
                }
            })
            if(newFiles){
                this.fuzzySearch.updateSearchArray(this.files)
                this.folderSearchIndex = undefined
                this.folderSearchIndexKey = undefined
            }
        }
    }

    updateSearchfilesList(file:TFile, oldPath?: string){
        this.app.metadataCache.onCleanCache(() => {
            if(oldPath){
                this.files.splice(this.files.findIndex((f) => f.path === oldPath),1)
                this.files.push(generateSearchFile(file, this.app))
            }
            if(file.deleted){
                this.files.splice(this.files.findIndex((f) => f.path === file.path),1)
    
                // if(isUnresolved({name: file.name, path: file.path, basename: file.basename, extension: file.extension})){
                //     this.files.push(generateMarkdownUnresolvedFile(file.path))
                // }
            }
            else{
                const fileIndex = this.files.findIndex((f) => f.path === file.path)
                if(fileIndex === -1){
                    this.files.push(generateSearchFile(file, this.app))
                }
                else if(this.files[fileIndex].isUnresolved){
                    this.files[fileIndex] = generateSearchFile(file, this.app)
                }
            }
            this.fuzzySearch.updateSearchArray(this.files)
            this.folderSearchIndex = undefined
            this.folderSearchIndexKey = undefined
        })
    }

    onNoSuggestion(): void {
        // 无匹配时保持下拉框完全隐藏：
        // 之前的「创建 xxx.md」建议会在 open() 后被基类立即 close() 造成闪现，
        // 新建笔记改由搜索栏的新建按钮 / 回车弹窗承担
        this.close();
    }
    
    getSuggestions(inputStr: string): Fuse.FuseResult<SearchFile>[] {
        const folderSearch = parseFolderSearchQuery(inputStr)
        const query = folderSearch?.query ?? inputStr.trim()

        // 先尝试搜索文件
        if(!query && !folderSearch) return []
        
        // 重置分析器状态
        this.matchAnalyzer.resetForNewSearch();

        if (folderSearch) {
            if (!query) {
                return this.getFilesForCurrentFilter()
                    .filter(file => isFileInFolderPath(file.path, folderSearch.folderPath))
                    .slice(0, this.plugin.settings.maxResults)
                    .map((item, refIndex) => ({ item, refIndex, score: 0 }))
            }

            return this.getFolderSearchIndex(folderSearch.folderPath).rawSearch(query, this.plugin.settings.maxResults)
        }
        
        const results = this.fuzzySearch.rawSearch(query, this.plugin.settings.maxResults);
        
        return results;
    }

    useSelectedItem(selectedItem: Fuse.FuseResult<SearchFile>, newTab?: boolean): void {
        // 使用智能匹配分析器分析匹配意图
        const query = parseFolderSearchQuery(this.inputEl.value)?.query ?? this.inputEl.value.trim()
        const analysis = this.matchAnalyzer.analyzeMatch(selectedItem, query);
        const item = selectedItem.item;
        
        // 根据分析结果决定跳转行为
        if (analysis.shouldJumpToHeading && analysis.matchedHeading) {
            const link = `${item.path}#${analysis.matchedHeading}`;
            void this.app.workspace.openLinkText(link, '', newTab ?? false);
            this.close(true); // 强制清理键盘事件监听器
            return;
        }
        // 处理 WebViewer URL
        if (selectedItem.item.isWebUrl) {
            const leaf = newTab 
                ? this.app.workspace.getLeaf('tab') 
                : this.app.workspace.getLeaf();

            void leaf.setViewState({
                type: "webviewer",
                active: true,
                state: {
                    url: selectedItem.item.url
                }
            });
            this.close(true); // 强制清理键盘事件监听器
            return;
        }

        // 处理普通文件
        if(selectedItem.item.isCreated && selectedItem.item.file){
            this.openFile(selectedItem.item.file, newTab);
            // 强制清理键盘事件监听器
            this.close(true);
        }
        else{
            // 对于异步文件创建，在完成后再清理
            this.handleFileCreation(selectedItem.item, newTab).then(() => {
                this.close(true);
            }).catch((error) => {
                console.error('Error creating file:', error);
                this.close(true); // 即使出错也要强制清理
            });
        }
    }

    getDisplayElementProps(suggestion: Fuse.FuseResult<SearchFile>): {nameToDisplay: string, filePath?: string, matchedHeading?: string, matchedAlias?: string, matchedTitle?: string}{
        if (!this.inputEl || !this.inputEl.instanceOf(HTMLInputElement)) {
            return {
                nameToDisplay: suggestion.item.basename,
                filePath: undefined
            };
        }

        // 如果是 WebViewer URL
        if (suggestion.item.isWebUrl) {
            return {
                nameToDisplay: 'Open link: ' + suggestion.item.url,
                filePath: 'WebViewer'
            };
        }

        // 处理普通文件
        let nameToDisplay = suggestion.item.basename;
        let filePath: string | undefined = undefined;
        let matchedHeading: string | undefined = undefined;
        let matchedAlias: string | undefined = undefined;
        let matchedTitle: string | undefined = undefined;

        if(this.plugin.settings.showPath){
            filePath = suggestion.item.file && suggestion.item.file.parent 
                ? suggestion.item.file.parent.name 
                : getParentFolderFromPath(suggestion.item.path);
        }

        const searchQuery = parseFolderSearchQuery(this.inputEl.value)?.query ?? this.inputEl.value.trim()
        if (!searchQuery) return { nameToDisplay, filePath }

        // 使用智能匹配分析器分析匹配意图
        if (suggestion.matches) {
            const analysis = this.matchAnalyzer.analyzeMatch(suggestion, searchQuery);
            
            // 根据分析结果设置显示信息
            if (analysis.displayInfo.showHeading && analysis.matchedHeading) {
                matchedHeading = analysis.matchedHeading;
                nameToDisplay = suggestion.item.basename;
            } else if (analysis.displayInfo.showAlias && analysis.displayInfo.matchedAlias) {
                matchedAlias = analysis.displayInfo.matchedAlias;
                nameToDisplay = analysis.displayInfo.matchedAlias;
            } else if (analysis.displayInfo.showTitle && analysis.displayInfo.matchedTitle) {
                matchedTitle = analysis.displayInfo.matchedTitle;
                nameToDisplay = analysis.displayInfo.matchedTitle;
            } else {
                nameToDisplay = this.fuzzySearch.getBestMatch(suggestion, searchQuery);
            }
            
            const result = {
                nameToDisplay: nameToDisplay,
                filePath: filePath,
                matchedHeading: matchedHeading,
                matchedAlias: matchedAlias,
                matchedTitle: matchedTitle
            };
            
            return result;
        }

        nameToDisplay = this.fuzzySearch.getBestMatch(suggestion, searchQuery);
        
        return {
            nameToDisplay: nameToDisplay,
            filePath: filePath,
            matchedHeading: matchedHeading,
            matchedAlias: matchedAlias,
            matchedTitle: matchedTitle
        };
    }

    getDisplayElementComponentType(): typeof HomeTabFileSuggestion{
        return HomeTabFileSuggestion
    }

    async handleFileCreation(selectedFile?: SearchFile, newTab?: boolean): Promise<void>{
        let newFile: TFile
        
        if(selectedFile?.isUnresolved){
            const folderPath = selectedFile.path.replace(selectedFile.name, '')
            if(!await this.app.vault.adapter.exists(folderPath)){
                await this.app.vault.createFolder(folderPath)
            }
            newFile = await this.app.vault.create(selectedFile.path, '')
        }
        else{
            const folderSearch = parseFolderSearchQuery(this.inputEl.value)
            const input = folderSearch?.query ?? this.inputEl.value.trim()
            if (!input) return

            if (folderSearch) {
                const targetPath = normalizePath(`${folderSearch.folderPath}/${input}.md`)
                const existingFile = this.app.vault.getAbstractFileByPath(targetPath)
                if (existingFile instanceof TFile) {
                    this.openFile(existingFile, newTab)
                    return
                }
                if (!await this.app.vault.adapter.exists(folderSearch.folderPath)) {
                    await this.app.vault.createFolder(folderSearch.folderPath)
                }
                newFile = await this.app.vault.create(targetPath, '')
                this.openFile(newFile, newTab)
                return
            }

            // If a file with the same filename exists open it
            // Mimics the behaviour of the default quick switcher
            const files = this.files.filter(file => file.fileType === 'markdown')
            if(files.map(file => file.basename).includes(input)){
                const fileToOpen = files.find(f => f.basename === input)?.file
                if(fileToOpen && fileToOpen instanceof TFile){
                    this.openFile(fileToOpen, newTab)
                }
            }
            newFile = await this.app.vault.create(normalizePath(`${this.app.fileManager.getNewFileParent('').path}/${input}.md`), '')
        }
        
        
        this.openFile(newFile, newTab)
    }

    openFile(file: TFile, newTab?: boolean): void{
        // TODO Check if file is already open
        if(newTab){
            void this.app.workspace.createLeafInTabGroup().openFile(file)
            // this.inputEl.value = ''
        }
        else{
            void this.view.leaf.openFile(file);
        }
    }

    /**
     * 从文件数组中过滤出具有额外后缀名的文件
     * @param files 要过滤的文件数组
     * @returns 符合额外后缀名的文件数组
     */
    getAdditionalExtensionFiles(files: SearchFile[]): SearchFile[] {
        // 如果没有设置额外后缀名，返回空数组
        if (!this.plugin.settings.additionalExtensions) {
            return [];
        }
        
        // 解析额外后缀名，去除空格并转为小写
        const extensions = this.plugin.settings.additionalExtensions
            .split(',')
            .map(ext => ext.trim().toLowerCase())
            .filter(ext => ext.length > 0);
            
        // 如果没有有效的后缀名，返回空数组
        if (extensions.length === 0) {
            return [];
        }
        
        // 过滤出符合额外后缀名的文件
        return files.filter(file => {
            if (!file.extension) return false;
            return extensions.includes(file.extension.toLowerCase());
        });
    }
    
    setFileFilter(filterKey: FileType | FileExtension): void{
        this.activeFilter = filterKey
        
        void this.app.metadataCache.onCleanCache(() => {
            let filesToFilter = this.plugin.settings.markdownOnly ? getSearchFiles(this.app, this.plugin.settings.unresolvedLinks) : this.files;
            
            // 如果启用了 markdownOnly 并且有额外后缀名，需要特殊处理
            if (this.plugin.settings.markdownOnly && this.plugin.settings.additionalExtensions && filterKey === 'markdown') {
                let filteredFiles = this.filterSearchFileArray(filterKey, filesToFilter);
                const additionalFiles = this.getAdditionalExtensionFiles(filesToFilter);
                filteredFiles = [...filteredFiles, ...additionalFiles];
                this.fuzzySearch.updateSearchArray(filteredFiles);
            } else {
                this.fuzzySearch.updateSearchArray(this.filterSearchFileArray(filterKey, filesToFilter));
            }
        })
        
        this.suggester.setSuggestions([]) // Reset search suggestions
        this.close()
    }

    destroy(): void {
        // 调用父类的 destroy 方法
        super.destroy()
    }
}

import { Notice, TFile, TFolder, type App } from 'obsidian'

/** 文件浏览器的非公开接口（revealInFolder 运行时存在但未包含在官方 typings 中） */
interface FileExplorerViewLike {
    revealInFolder?: (file: TFolder | TFile) => void
}

/**
 * 打开（或聚焦已打开的）文件浏览器；传入 folder 时在浏览器中定位该文件夹。
 */
export function revealFolderInExplorer(app: App, folder?: TFolder, failNotice?: string): void {
    try {
        let explorerLeaves = app.workspace.getLeavesOfType('file-explorer')
        if(explorerLeaves.length === 0){
            const leaf = app.workspace.getLeaf('tab')
            void leaf.setViewState({ type: 'file-explorer' })
            explorerLeaves = app.workspace.getLeavesOfType('file-explorer')
        }
        void app.workspace.revealLeaf(explorerLeaves[0])
        if(folder){
            // 类型保护：旧版本 Obsidian 可能没有 revealInFolder
            const explorerView = explorerLeaves[0].view as unknown as FileExplorerViewLike
            if(typeof explorerView.revealInFolder === 'function'){
                explorerView.revealInFolder(folder)
            }
            else{
                new Notice(failNotice ?? folder.path)
            }
        }
    }
    catch (error) {
        console.error(error)
        new Notice(failNotice ?? String(error))
    }
}

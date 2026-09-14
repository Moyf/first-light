import { App, getIconIds, Modal, Setting, type IconName } from 'obsidian'
import iconSuggester from './suggester/iconSuggester'

export class IconSelectionModal extends Modal{
    icon: string | undefined
    onSubmit: (icon: IconName) => void

    constructor(app: App, defaultIcon: IconName | undefined, onSubmit: (icon: IconName) => void){
        super(app)

        this.icon = defaultIcon
        this.onSubmit = onSubmit
    }

    onOpen(): void{
        const { contentEl } = this

        contentEl.createEl('h1', {text: 'Set a custom icon'})

        const iconSetting = new Setting(contentEl)
            .setName('Choose an icon')
            .setDesc('Accepts any lucide icon id.')

        let invalidInputIcon: HTMLElement
        iconSetting
            .addExtraButton((button) => {button
                .setIcon('alert-circle')
                .setTooltip('The icon id is not valid.')
                invalidInputIcon = button.extraSettingsEl
                invalidInputIcon.toggleVisibility(false)
                invalidInputIcon.addClass('mod-warning')})

        iconSetting
            .addSearch((text) => {
                new iconSuggester(this.app, text.inputEl, true)

                text
                .setPlaceholder('Type to start search...')
                .setValue(this.icon ?? '')
                .onChange(value => {
                    // if(value === '' || value == '/'){
                    //     invalidInputIcon.toggleVisibility(false)
                    //     return
                    // }
                    if(getIconIds().includes(value)){
                        this.icon = value
                        invalidInputIcon.toggleVisibility(false)
                    }
                    else{
                        invalidInputIcon.toggleVisibility(true)
                    }
                })
                .inputEl.parentElement?.addClass('wide-input-container')
        })
        

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                .setButtonText("Close modal")
                // .setCta()
                .onClick(() => {
                    this.close();
                }))
            .addButton((btn) =>
                btn
                .setButtonText("Set icon")
                .setCta()
                .onClick(() => {
                    if(this.icon){
                        this.onSubmit(this.icon as IconName)
                    }
                    this.close()
                }))
    }

    onClose(): void {
        this.icon = undefined
        let { contentEl } = this;
        contentEl.empty();
    }
}
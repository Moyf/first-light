import { App, Setting, PluginSettingTab, normalizePath, Platform, getIconIds, ColorComponent } from 'obsidian'
import type { IconName, SettingDefinition, SettingDefinitionItem, SettingDefinitionRender } from 'obsidian'
import type HomeTab from './main'
import iconSuggester from './suggester/iconSuggester'
import ImageFileSuggester from './suggester/imageSuggester'
import CommandSuggester from './suggester/commandSuggester'
import NewNoteFolderSuggester from './suggester/newNoteFolderSuggester'
import isLink from './utils/isLink'
import { normalizeSvgLogo } from './utils/svgLogo'
import fontSuggester from './suggester/fontSuggester'
import type { recentFileStore } from './recentFiles'
import type { bookmarkedFileStore } from './bookmarkedFiles'
import type { PeriodicNoteCustomEntry, PeriodicNoteLabelMode } from './periodicNotes'
import { formatPeriodicLabel, getAutoPeriodConfigs, hasAutoPeriodSource, PERIOD_TYPES } from './periodicNotes'
import { checkFont } from './utils/fontValidator'
import { t as getLocale } from './i18n'
import type { SettingEntry } from './i18n/types'
import ParticleSettingsPreview from './ui/particleSettingsPreview.svelte'
import type { ContentSectionKey } from './utils/contentSections'

type ColorChoices = 'default' | 'accentColor' | 'custom'
type LogoChoices = 'default' | 'imagePath' | 'imageLink' | 'svgCode' | 'lucideIcon' | 'oldLogo' | 'none'
type LogoPosition = 'top' | 'bottom' | 'left' | 'right'
type FontChoices = 'interfaceFont' | 'textFont' | 'monospaceFont' | 'custom'

// 新增：库数据（vault stats）可显示的统计项
export type VaultStatItemKey = 'files' | 'notes' | 'attachments' | 'folders' | 'tags'

export const VAULT_STAT_KEYS: readonly VaultStatItemKey[] = ['files', 'notes', 'attachments', 'folders', 'tags']

interface ObjectKeys {
    [key: string]: unknown
}

interface logoStore extends ObjectKeys{
    lucideIcon: IconName
    imagePath: string
    imageLink: string
    svgCode?: string
}

export interface HomeTabSettings extends ObjectKeys{
    logoType: LogoChoices
    logo: logoStore
    logoPosition: LogoPosition
    logoMargin: number
    logoMarginIndividual: boolean
    logoMarginTop: number
    logoMarginRight: number
    logoMarginBottom: number
    logoMarginLeft: number
    logoScale: number
    iconColor?: string
    iconColorType: ColorChoices
    wordmark: string
    customFont: FontChoices
    font?: string
    fontSize: string
    fontColor?: string
    fontColorType: ColorChoices
    fontWeight: number
    titleMargin: number
    titleMarginIndividual: boolean
    titleMarginTop: number
    titleMarginRight: number
    titleMarginBottom: number
    titleMarginLeft: number
    particleEffect: boolean
    particleEffectColorMode: 'original' | 'monochrome' | 'gradient'
    particleEffectPreserveShading: boolean
    particleEffectColor: string
    particleEffectColorDark: string
    particleEffectColor2: string
    particleEffectColor2Dark: string
    particleEffectGradientAnimation: 'static' | 'cycle' | 'breathe'
    particleEffectGradientAngle: number
    particleEffectGradientArea: number
    particleEffectGradientTransition: number
    particleEffectGradientFrequency: number
    particleEffectGradientPause: number
    particleEffectAmbientMotion?: 'none' | 'wave' | 'float' | 'undulate' | 'pulse' | 'ripple' | 'breathe' // 新增：粒子的默认漂浮运动模式
    particleEffectMotionFrequency: number
    particleEffectScale: number
    particleEffectScaleMobile: number
    particleEffectSpacing: number
    particleEffectDotSize: number
    particleEffectAdaptiveSize: boolean
    particleEffectCanvasPaddingTop: number
    particleEffectCanvasPaddingBottom: number
    particleEffectDisturbRadius: number
    particleEffectDisturbStrength: number
    particleEffectDisturbFalloff: number
    particleEffectParallax: boolean
    particleEffectRecoverySpeed: number
    particleEffectRecoveryDamping: number
    maxResults: number
    showbookmarkedFiles: boolean
    showBookmarkedFilesFilter: boolean // 新增：书签区筛选按钮（放大镜）开关
    bookmarkedGroups: string // 新增：仅显示这些书签分组内的书签（英文逗号分隔，留空显示全部）
    showRecentFiles: boolean
    showRecentFilesFilter: boolean // 新增：最近文件筛选按钮（放大镜）开关
    maxRecentFiles: number
    storeRecentFile: boolean
    showPeriodicNotes: boolean // 新增：是否在主页显示周期笔记
    periodicNotesMode: 'auto' | 'custom' // 新增：周期笔记来源，自动读取插件配置或自定义规则
    periodicNotesDecorationMode: 'none' | 'braces' | 'angleBrackets' | 'custom'
    periodicNotesDecorationLeft: string
    periodicNotesDecorationRight: string
    periodicNotesShowDaily: boolean // 新增：显示日记
    periodicNotesShowWeekly: boolean // 新增：显示周记
    periodicNotesShowMonthly: boolean // 新增：显示月记
    periodicNotesShowQuarterly: boolean // 新增：显示季记
    periodicNotesShowYearly: boolean // 新增：显示年记
    periodicNotesLabelModeDaily: PeriodicNoteLabelMode // 新增：日记的显示名称模式（文件名/周期文字/自定义）
    periodicNotesLabelModeWeekly: PeriodicNoteLabelMode // 新增：周记的显示名称模式
    periodicNotesLabelModeMonthly: PeriodicNoteLabelMode // 新增：月记的显示名称模式
    periodicNotesLabelModeQuarterly: PeriodicNoteLabelMode // 新增：季记的显示名称模式
    periodicNotesLabelModeYearly: PeriodicNoteLabelMode // 新增：年记的显示名称模式
    periodicNotesLabelCustomDaily: string // 新增：日记的自定义显示名称（支持 {{MM}} 等日期占位符）
    periodicNotesLabelCustomWeekly: string // 新增：周记的自定义显示名称
    periodicNotesLabelCustomMonthly: string // 新增：月记的自定义显示名称
    periodicNotesLabelCustomQuarterly: string // 新增：季记的自定义显示名称
    periodicNotesLabelCustomYearly: string // 新增：年记的自定义显示名称
    periodicNotesCustom: PeriodicNoteCustomEntry[] // 新增：自定义周期笔记规则（名称 + 路径规则）
    showPath: boolean
    selectionHighlight: ColorChoices
    showShortcuts: boolean
    markdownOnly: boolean
    additionalExtensions: string // 新增：额外搜索的文件后缀名，英文逗号分隔
    unresolvedLinks: boolean
    searchTitle: boolean
    searchHeadings: boolean // 是否启用标题（heading）搜索
    autoJumpToHeading?: boolean // 新增：标题匹配时自动跳转到 heading
    headingJumpStrategy?: 'never' | 'always' | 'smart' // 新增：标题跳转策略
    recentFilesStore: recentFileStore[]
    bookmarkedFileStore: bookmarkedFileStore[]
    sectionCollapsible: boolean // 新增：是否显示折叠按钮，允许折叠最近文件/书签区域
    contentSectionOrder: ContentSectionKey[]
    compactMode: boolean
    fileListLayout: 'centered' | 'grid'
    displayNameProperties: string
    searchBarStyle: 'classic' | 'modern' | 'transparent' | 'minimal'
    searchDropdownDisplay: 'overlay' | 'expand'
    searchDelay: number
    replaceNewTabs: boolean
    newTabOnStart: boolean
    closePreviousSessionTabs: boolean
    omnisearch: boolean
    showOmnisearchExcerpt: boolean
    webUrlSuggestions: boolean // 新增：网址功能开关，检测搜索栏输入的网址并建议用网页浏览器打开
    debugMode?: boolean // 新增：调试模式，显示搜索和匹配的详细信息
    hideOnBlur?: boolean // 新增：失去焦点时是否隐藏搜索结果
    showNewNoteButton: boolean // 新增：显示「新建笔记」按钮
    newNoteUseCommand: boolean // 新增：点击按钮时执行指定命令而不是新建笔记
    newNoteCommandId: string // 新增：命令覆盖时执行的命令 ID
    newNoteDefaultFolder: string // 新增：新建笔记弹窗默认填写的文件夹
    vaultStats: boolean // 新增：在主页偏下方显示库数据（总开关）
    vaultStatsItems: VaultStatItemKey[] // 新增：启用的库数据项（显示顺序即数组顺序）
    vaultStatsOrder: VaultStatItemKey[] // 新增：设置页中库数据项的排列顺序（包含全部项）
    newNoteOnUnmatchedName: boolean // 新增：搜索无匹配时高亮新建按钮，回车直接打开新建弹窗
}

export const DEFAULT_SETTINGS: HomeTabSettings = {
    logoType: 'default',
    logo: {
        lucideIcon: '', 
        imagePath: '', 
        imageLink: '',
        svgCode: '',},
    logoPosition: 'left',
    logoMargin: 16,
    logoMarginIndividual: true,
    logoMarginTop: 12,
    logoMarginRight: 10,
    logoMarginBottom: 12,
    logoMarginLeft: 0,
    logoScale: 1.5,
    iconColorType: 'accentColor',
    wordmark: 'Obsidian',
    customFont: 'textFont',
    fontSize: '3.5em',
    fontColorType: 'default',
    fontWeight: 600,
    titleMargin: 20,
    titleMarginIndividual: false,
    titleMarginTop: 0,
    titleMarginRight: 0,
    titleMarginBottom: 29,
    titleMarginLeft: 0,
    particleEffect: true,
    particleEffectColorMode: 'gradient',
    particleEffectPreserveShading: true,
    particleEffectColor: '#a079ff',
    particleEffectColorDark: '#d6d1d1',
    particleEffectColor2: '#8965d7',
    particleEffectColor2Dark: '#ffffff',
    particleEffectGradientAnimation: 'cycle',
    particleEffectGradientAngle: 60,
    particleEffectGradientArea: 15,
    particleEffectGradientTransition: 30,
    particleEffectGradientFrequency: 1.8,
    particleEffectGradientPause: 0,
    particleEffectAmbientMotion: 'wave',
    particleEffectMotionFrequency: 0.55,
    particleEffectScale: 2,
    // Mobile renders at 1× so the zoomed canvas never overflows the narrow layout.
    particleEffectScaleMobile: 1,
    particleEffectSpacing: 1.3,
    particleEffectDotSize: 0.45,
    particleEffectAdaptiveSize: false,
    particleEffectCanvasPaddingTop: 40,
    particleEffectCanvasPaddingBottom: 0,
    particleEffectDisturbRadius: 40,
    particleEffectDisturbStrength: 1,
    particleEffectDisturbFalloff: 0.8,
    particleEffectParallax: false,
    // 1 = the default ripple: disturbed particles overshoot a few times before
    // settling, so a cursor pass leaves a visible wave instead of a snap-back.
    particleEffectRecoverySpeed: 1.5,
    particleEffectRecoveryDamping: 60,
    maxResults: 5,
    // Cannot read app.internalPlugins at module level: the real availability
    // check happens in main.ts onLayoutReady (disabled -> forced to false)
    showbookmarkedFiles: true,
    showBookmarkedFilesFilter: true,
    bookmarkedGroups: '', // 新增：默认显示全部书签
    showRecentFiles: true,
    showRecentFilesFilter: true,
    maxRecentFiles: 12,
    storeRecentFile: true,
    showPeriodicNotes: false, // 新增：默认关闭周期笔记
    periodicNotesMode: 'auto', // 新增：默认跟随插件配置
    periodicNotesDecorationMode: 'braces',
    periodicNotesDecorationLeft: '{',
    periodicNotesDecorationRight: '}',
    periodicNotesShowDaily: true, // 新增：默认只显示日记（单个就日记）
    periodicNotesShowWeekly: false, // 新增：周记默认关闭，可按需开启
    periodicNotesShowMonthly: false, // 新增：月记默认关闭，可按需开启
    periodicNotesShowQuarterly: false, // 新增：季记默认关闭，可按需开启
    periodicNotesShowYearly: false, // 新增：年记默认关闭，可按需开启
    periodicNotesLabelModeDaily: 'filename', // 新增：默认显示笔记文件名（不含路径）
    periodicNotesLabelModeWeekly: 'filename', // 新增：默认显示笔记文件名
    periodicNotesLabelModeMonthly: 'filename', // 新增：默认显示笔记文件名
    periodicNotesLabelModeQuarterly: 'filename', // 新增：默认显示笔记文件名
    periodicNotesLabelModeYearly: 'filename', // 新增：默认显示笔记文件名
    periodicNotesLabelCustomDaily: '', // 新增：自定义显示名称默认为空
    periodicNotesLabelCustomWeekly: '', // 新增：自定义显示名称默认为空
    periodicNotesLabelCustomMonthly: '', // 新增：自定义显示名称默认为空
    periodicNotesLabelCustomQuarterly: '', // 新增：自定义显示名称默认为空
    periodicNotesLabelCustomYearly: '', // 新增：自定义显示名称默认为空
    periodicNotesCustom: [], // 新增：默认没有自定义周期笔记
    showPath: true,
    selectionHighlight: 'accentColor',
    showShortcuts: true,
    markdownOnly: false,
    additionalExtensions: '', // 新增：额外搜索的文件后缀名，默认为空
    unresolvedLinks: false,
    searchTitle: false,
    searchHeadings: true,
    autoJumpToHeading: true, // 新增：标题匹配时自动跳转到 heading，默认开启
    headingJumpStrategy: 'smart', // 新增：默认使用智能跳转策略
    recentFilesStore: [],
    bookmarkedFileStore: [],
    sectionCollapsible: true,
    contentSectionOrder: ["periodic","recent","bookmarks"],
    compactMode: true,
    fileListLayout: 'centered',
    displayNameProperties: 'title',
    searchBarStyle: 'modern',
    searchDropdownDisplay: 'overlay',
    searchDelay: 0,
    replaceNewTabs: true,
    newTabOnStart: false,
    closePreviousSessionTabs: false,
    omnisearch: false,
    showOmnisearchExcerpt: true,
    webUrlSuggestions: true, // 新增：默认开启网址功能（仅当网页浏览器核心插件可用时生效）
    debugMode: false, // 新增：默认关闭调试模式
    hideOnBlur: true, // 新增：默认情况下失去焦点时隐藏搜索结果
    showNewNoteButton: true,
    newNoteUseCommand: false, // 新增：默认不使用命令覆盖
    newNoteCommandId: '', // 新增：命令 ID 默认为空
    newNoteDefaultFolder: '', // 新增：默认文件夹默认留空（仓库根目录）
    vaultStats: true,
    vaultStatsItems: [...VAULT_STAT_KEYS], // 新增：默认全部启用，按默认顺序显示
    vaultStatsOrder: [...VAULT_STAT_KEYS], // 新增：默认顺序
    newNoteOnUnmatchedName: true, // 新增：默认开启「无匹配时快速新建」
}

/** Preserve the old shared padding unless an individual side was already saved. */
export function normalizeParticleCanvasSettings(settings: HomeTabSettings, saved: Partial<HomeTabSettings> & { particleEffectCanvasPadding?: number }): void {
    const legacy = saved.particleEffectCanvasPadding
    if (typeof legacy === 'number' && Number.isFinite(legacy)) {
        if (saved.particleEffectCanvasPaddingTop == null) settings.particleEffectCanvasPaddingTop = legacy
        if (saved.particleEffectCanvasPaddingBottom == null) settings.particleEffectCanvasPaddingBottom = legacy
    }
    delete (settings as HomeTabSettings & { particleEffectCanvasPadding?: number }).particleEffectCanvasPadding
}

/** Keep persisted vault statistic selections limited to the complete, known order. */
export function normalizeVaultStatsSettings(settings: HomeTabSettings): void {
    const order = (settings.vaultStatsOrder ?? []).filter((key): key is VaultStatItemKey =>
        VAULT_STAT_KEYS.includes(key))
    VAULT_STAT_KEYS.forEach((key) => {
        if(!order.includes(key)){order.push(key)}
    })
    settings.vaultStatsOrder = order
    settings.vaultStatsItems = (settings.vaultStatsItems ?? []).filter((key): key is VaultStatItemKey =>
        order.includes(key))
}

/**
 * The canvas scale follows the platform: desktop and mobile keep independent
 * settings (so the zoomed canvas can stay 1× on small screens), and each one
 * only applies while the plugin runs on its own platform.
 */
export function effectiveParticleEffectScale(settings: HomeTabSettings): number {
    if (Platform.isMobile) return settings.particleEffectScaleMobile ?? DEFAULT_SETTINGS.particleEffectScaleMobile
    return settings.particleEffectScale ?? DEFAULT_SETTINGS.particleEffectScale
}

/** Obsidian toggles these body classes when the theme switches. */
export function isDarkTheme(): boolean {
    return document.body.classList.contains('theme-dark')
}

/**
 * Particle colors follow the theme: monochrome/gradient modes resolve the
 * per-theme value, falling back to the light color when the dark one was
 * never set (older data.json) or was cleared.
 */
export function effectiveParticleEffectColors(settings: HomeTabSettings): { color: string; color2: string } {
    const pick = (value: string | undefined, fallback: string): string =>
        value && value.trim() !== '' ? value : fallback
    if (isDarkTheme()) {
        return {
            color: pick(settings.particleEffectColorDark, settings.particleEffectColor),
            color2: pick(settings.particleEffectColor2Dark, settings.particleEffectColor2),
        }
    }
    return {
        color: pick(settings.particleEffectColor, DEFAULT_SETTINGS.particleEffectColor),
        color2: pick(settings.particleEffectColor2, DEFAULT_SETTINGS.particleEffectColor2),
    }
}

function fontSizeEmValue(fontSize: string): number {
    const match = fontSize.trim().match(/^(\d+(?:\.\d+)?)em$/i)
    if (!match) return 4
    return Math.max(2, Math.min(8, Math.round(Number(match[1]) * 2) / 2))
}

function setDescriptionWithPreview(setting: Setting, hint: string, preview?: string): void {
    const doc = setting.settingEl.ownerDocument
    const description = createFragment()
    description.append(doc.createTextNode(hint))
    if (preview) {
        description.createEl('br')
        description.append(doc.createTextNode(preview))
    }
    setting.setDesc(description)
}

export class HomeTabSettingTab extends PluginSettingTab {
    plugin: HomeTab
    icon: IconName = 'tower-control'

    /** Settings whose change requires rebuilding the open Home tab views */
    private static readonly REFRESH_OPEN_VIEWS_KEYS: ReadonlySet<string> = new Set([
        'webUrlSuggestions',
        'omnisearch',
        'markdownOnly',
        'additionalExtensions',
        'unresolvedLinks',
        'searchTitle',
        'searchHeadings',
        'showPath',
        'showShortcuts',
        'searchDelay',
        'hideOnBlur',
        'showbookmarkedFiles',
        'showBookmarkedFilesFilter',
        'bookmarkedGroups',
        'showRecentFiles',
        'showPeriodicNotes',
        'periodicNotesMode',
        'periodicNotesShowDaily',
        'periodicNotesShowWeekly',
        'periodicNotesShowMonthly',
        'periodicNotesShowQuarterly',
        'periodicNotesShowYearly',
        'showRecentFilesFilter',
        'sectionCollapsible',
        'periodicNotesLabelModeDaily',
        'periodicNotesLabelModeWeekly',
        'periodicNotesLabelModeMonthly',
        'periodicNotesLabelModeQuarterly',
        'periodicNotesLabelModeYearly',
        'periodicNotesLabelCustomDaily',
        'periodicNotesLabelCustomWeekly',
        'periodicNotesLabelCustomMonthly',
        'periodicNotesLabelCustomQuarterly',
        'periodicNotesLabelCustomYearly',
        'selectionHighlight',
        'showNewNoteButton',
    ])
    // NOTE: particle-effect settings are intentionally NOT in this set — the
    // ParticleWordmark component rebuilds itself in place from prop/store
    // changes; a full rebuildView() here visibly blinks the whole view.

    constructor(app: App, plugin: HomeTab){
        super(app, plugin)
        this.plugin = plugin
    }

    /**
     * Persists control-bound values through `plugin.saveSettings()` (which also
     * syncs the settings store used by the Svelte views) and rebuilds open
     * Home tab views when the changed setting affects their rendering.
     */
    override async setControlValue(key: string, value: unknown): Promise<void> {
        this.plugin.settings[key] = value
        await this.plugin.saveSettings()
        // Re-evaluate the visible() predicates that depend on control values
        // (e.g. the particle style group behind the particleEffect toggle).
        this.refreshDomState()
        if (HomeTabSettingTab.REFRESH_OPEN_VIEWS_KEYS.has(key)) {
            this.plugin.refreshOpenViews()
        }
    }

    getSettingDefinitions(): SettingDefinitionItem[] {
        const t = getLocale()
        const s = this.plugin.settings
        const colorOptions = () => ({
            default: t.common.themeDefault,
            accentColor: t.common.accentColor,
            custom: t.common.custom,
        })
        const searchVisible = () => !s.omnisearch

        return [
            // General — no heading (first group)
            {
                name: t.setting.replaceNewTabs.name,
                control: { type: 'toggle', key: 'replaceNewTabs' },
            },
            {
                name: t.setting.newTabOnStart.name,
                desc: t.setting.newTabOnStart.desc,
                control: { type: 'toggle', key: 'newTabOnStart' },
            },
            {
                name: t.setting.closePreviousSessionTabs.name,
                desc: t.setting.closePreviousSessionTabs.desc,
                visible: () => s.newTabOnStart,
                control: { type: 'toggle', key: 'closePreviousSessionTabs' },
            },

            // Search & new note — sibling sub-page entries in one group
            {
                type: 'group',
                heading: t.group.searchAndNewNote,
                items: [
                    {
                        type: 'page',
                        name: t.page.search.name,
                        desc: t.page.search.desc,
                        items: [
                            this.dropdownWithReset('searchBarStyle', t.setting.searchBarStyle.name, t.setting.searchBarStyle.desc, t.setting.searchBarStyle.options),
                            this.dropdownWithReset('searchDropdownDisplay', t.setting.searchDropdownDisplay.name, t.setting.searchDropdownDisplay.desc, t.setting.searchDropdownDisplay.options),
                            {
                                name: t.setting.useOmnisearch.name,
                                desc: t.setting.useOmnisearch.desc,
                                visible: () => !!this.app.plugins.getPlugin('omnisearch'),
                                control: { type: 'toggle', key: 'omnisearch' },
                            },
                            {
                                name: t.setting.markdownOnly.name,
                                visible: searchVisible,
                                control: { type: 'toggle', key: 'markdownOnly' },
                            },
                            {
                                name: t.setting.additionalExtensions.name,
                                desc: t.setting.additionalExtensions.desc,
                                visible: () => searchVisible() && s.markdownOnly,
                                control: { type: 'text', key: 'additionalExtensions' },
                            },
                            {
                                name: t.setting.unresolvedLinks.name,
                                visible: searchVisible,
                                control: { type: 'toggle', key: 'unresolvedLinks' },
                            },
                            {
                                name: t.setting.webUrlSuggestions.name,
                                desc: t.setting.webUrlSuggestions.desc,
                                visible: () => !!this.app.internalPlugins.getPluginById('webviewer') || !!this.app.internalPlugins.getPluginById('webbrowser'),
                                control: { type: 'toggle', key: 'webUrlSuggestions' },
                            },
                            {
                                name: t.setting.searchTitle.name,
                                desc: t.setting.searchTitle.desc,
                                visible: searchVisible,
                                control: { type: 'toggle', key: 'searchTitle' },
                            },
                            {
                                type: 'group',
                                heading: t.group.headingJump,
                                items: [
                                    {
                                        name: t.setting.searchHeadings.name,
                                        desc: t.setting.searchHeadings.desc,
                                        visible: searchVisible,
                                        control: { type: 'toggle', key: 'searchHeadings' },
                                    },
                                    {
                                        name: t.setting.autoJumpToHeading.name,
                                        desc: t.setting.autoJumpToHeading.desc,
                                        visible: () => searchVisible() && s.searchHeadings,
                                        control: { type: 'toggle', key: 'autoJumpToHeading', defaultValue: true },
                                    },
                                    {
                                        name: t.setting.headingJumpStrategy.name,
                                        desc: t.setting.headingJumpStrategy.desc,
                                        visible: () => searchVisible() && s.searchHeadings && (s.autoJumpToHeading ?? true),
                                        control: {
                                            type: 'dropdown',
                                            key: 'headingJumpStrategy',
                                            defaultValue: 'smart',
                                            options: t.setting.headingJumpStrategy.options,
                                        },
                                    },
                                ],
                            },
                            {
                                type: 'group',
                                heading: t.group.results,
                                items: [
                                    {
                                        name: t.setting.showPath.name,
                                        desc: t.setting.showPath.desc,
                                        visible: searchVisible,
                                        control: { type: 'toggle', key: 'showPath' },
                                    },
                                    {
                                        name: t.setting.showShortcuts.name,
                                        desc: t.setting.showShortcuts.desc,
                                        control: { type: 'toggle', key: 'showShortcuts' },
                                    },
                                    this.sliderWithReset('maxResults', t.setting.maxResults.name, t.setting.maxResults.desc, 1, 25, 1),
                                    this.sliderWithReset('searchDelay', t.setting.searchDelay.name, t.setting.searchDelay.desc, 0, 500, 10, { refreshAfterChange: true }),
                                    {
                                        name: t.setting.hideOnBlur.name,
                                        desc: t.setting.hideOnBlur.desc,
                                        control: { type: 'toggle', key: 'hideOnBlur', defaultValue: true },
                                    },
                                    {
                                        name: t.setting.showOmnisearchExcerpt.name,
                                        desc: t.setting.showOmnisearchExcerpt.desc,
                                        visible: () => !!this.app.plugins.getPlugin('omnisearch'),
                                        control: { type: 'toggle', key: 'showOmnisearchExcerpt' },
                                    },
                                ],
                            },
                        ],
                    },

                    // New note — sibling of the search sub-page in the same group
                    {
                        type: 'page',
                        name: t.page.newNote.name,
                        desc: t.page.newNote.desc,
                        items: [
                            {
                                name: t.setting.showNewNoteButton.name,
                                desc: t.setting.showNewNoteButton.desc,
                                control: { type: 'toggle', key: 'showNewNoteButton', defaultValue: true },
                            },
                            {
                                name: t.setting.newNoteUseCommand.name,
                                desc: t.setting.newNoteUseCommand.desc,
                                visible: () => s.showNewNoteButton,
                                control: { type: 'toggle', key: 'newNoteUseCommand', defaultValue: false },
                            },
                            {
                                name: t.setting.newNoteCommandId.name,
                                desc: t.setting.newNoteCommandId.desc,
                                visible: () => s.showNewNoteButton && s.newNoteUseCommand,
                                render: (setting) => this.renderNewNoteCommand(setting, t),
                            },
                            {
                                name: t.setting.newNoteDefaultFolder.name,
                                desc: t.setting.newNoteDefaultFolder.desc,
                                visible: () => s.showNewNoteButton && !s.newNoteUseCommand,
                                render: (setting) => this.renderNewNoteDefaultFolder(setting, t),
                            },
                            {
                                name: t.setting.newNoteOnUnmatchedName.name,
                                desc: t.setting.newNoteOnUnmatchedName.desc,
                                visible: () => s.showNewNoteButton && !s.newNoteUseCommand,
                                control: { type: 'toggle', key: 'newNoteOnUnmatchedName', defaultValue: true },
                            },
                        ],
                    },
                ],
            },

            // Files
            {
                type: 'group',
                heading: t.group.files,
                items: [
                    {
                        type: 'page',
                        name: t.page.contentLayout.name,
                        desc: t.page.contentLayout.desc,
                        items: [
                            {
                                name: t.setting.displayNameProperties.name,
                                desc: t.setting.displayNameProperties.desc,
                                control: { type: 'text', key: 'displayNameProperties' },
                            },
                            {
                                name: t.setting.sectionCollapsible.name,
                                desc: t.setting.sectionCollapsible.desc,
                                control: { type: 'toggle', key: 'sectionCollapsible' },
                            },
                            {
                                name: t.setting.compactMode.name,
                                desc: t.setting.compactMode.desc,
                                control: { type: 'toggle', key: 'compactMode' },
                            },
                            this.dropdownWithReset('fileListLayout', t.setting.fileListLayout.name, t.setting.fileListLayout.desc, t.setting.fileListLayout.options),
                            {
                                type: 'list',
                                heading: t.group.contentOrder,
                                onReorder: (oldIndex, newIndex) => {
                                    const order = [...s.contentSectionOrder]
                                    const [moved] = order.splice(oldIndex, 1)
                                    order.splice(newIndex, 0, moved)
                                    s.contentSectionOrder = order
                                    void this.plugin.saveSettings()
                                    this.update()
                                },
                                items: s.contentSectionOrder.map((key) => ({
                                    name: key === 'periodic' ? t.page.periodicNotes.name
                                        : key === 'recent' ? t.page.recentFiles.name : t.page.bookmarkedFiles.name,
                                })),
                            },
                        ],
                    },
                    {
                        type: 'page',
                        name: t.page.bookmarkedFiles.name,
                        desc: t.page.bookmarkedFiles.desc,
                        visible: () => !!this.app.internalPlugins.getPluginById('bookmarks'),
                        items: [
                            {
                                name: t.setting.showBookmarkedFiles.name,
                                desc: t.setting.showBookmarkedFiles.desc,
                                control: { type: 'toggle', key: 'showbookmarkedFiles' },
                            },
                            {
                                name: t.setting.showBookmarkedFilesFilter.name,
                                desc: t.setting.showBookmarkedFilesFilter.desc,
                                visible: () => s.showbookmarkedFiles,
                                control: { type: 'toggle', key: 'showBookmarkedFilesFilter' },
                            },
                            {
                                name: t.setting.bookmarkedGroups.name,
                                desc: t.setting.bookmarkedGroups.desc,
                                visible: () => s.showbookmarkedFiles,
                                control: { type: 'text', key: 'bookmarkedGroups' },
                            },
                        ],
                    },
                    {
                        type: 'page',
                        name: t.page.recentFiles.name,
                        desc: t.page.recentFiles.desc,
                        items: [
                            {
                                name: t.setting.showRecentFiles.name,
                                desc: t.setting.showRecentFiles.desc,
                                control: { type: 'toggle', key: 'showRecentFiles' },
                            },
                            {
                                name: t.setting.showRecentFilesFilter.name,
                                desc: t.setting.showRecentFilesFilter.desc,
                                visible: () => s.showRecentFiles,
                                control: { type: 'toggle', key: 'showRecentFilesFilter' },
                            },
                            {
                                name: t.setting.storeRecentFile.name,
                                desc: t.setting.storeRecentFile.desc,
                                visible: () => s.showRecentFiles,
                                control: { type: 'toggle', key: 'storeRecentFile' },
                            },
                            {
                                ...this.sliderWithReset('maxRecentFiles', t.setting.maxRecentFiles.name, t.setting.maxRecentFiles.desc, 1, 25, 1),
                                visible: () => s.showRecentFiles,
                                render: (setting) => {
                                    setting
                                        .addSlider((slider) => slider
                                            .setValue(s.maxRecentFiles)
                                            .setLimits(1, 25, 1)
                                            .onChange((value) => {
                                                this.plugin.recentFileManager.onNewMaxListLenght(value)
                                                s.maxRecentFiles = value
                                                void this.plugin.saveSettings()
                                            }))
                                    this.addResetButton(setting, 'maxRecentFiles')
                                },
                            },
                        ],
                    },
                    {
                        type: 'page',
                        name: t.page.periodicNotes.name,
                        desc: t.page.periodicNotes.desc,
                        items: [
                            {
                                name: t.setting.showPeriodicNotes.name,
                                desc: t.setting.showPeriodicNotes.desc,
                                control: { type: 'toggle', key: 'showPeriodicNotes' },
                            },
                            this.dropdownWithReset('periodicNotesDecorationMode', t.setting.periodicNotesDecoration.name, t.setting.periodicNotesDecoration.desc, t.setting.periodicNotesDecoration.options, {
                                visible: () => s.showPeriodicNotes,
                                refreshDomAfterChange: true,
                            }),
                            {
                                name: t.setting.periodicNotesDecorationLeft.name,
                                desc: t.setting.periodicNotesDecorationLeft.desc,
                                visible: () => s.showPeriodicNotes && s.periodicNotesDecorationMode === 'custom',
                                control: { type: 'text', key: 'periodicNotesDecorationLeft' },
                            },
                            {
                                name: t.setting.periodicNotesDecorationRight.name,
                                desc: t.setting.periodicNotesDecorationRight.desc,
                                visible: () => s.showPeriodicNotes && s.periodicNotesDecorationMode === 'custom',
                                control: { type: 'text', key: 'periodicNotesDecorationRight' },
                            },
                            this.dropdownWithReset('periodicNotesMode', t.setting.periodicNotesMode.name, t.setting.periodicNotesMode.desc, t.setting.periodicNotesMode.options, {
                                visible: () => s.showPeriodicNotes,
                                refreshDomAfterChange: true, // toggle the auto/custom sections in place
                            }),
                            {
                                // Info-only row shown when no source plugin provides periodic notes
                                name: t.setting.periodicNotesUnavailable.name,
                                desc: t.setting.periodicNotesUnavailable.desc,
                                visible: () => s.showPeriodicNotes && s.periodicNotesMode === 'auto' && !hasAutoPeriodSource(this.app),
                            },
                            ...PERIOD_TYPES.map((type) => this.periodTypeSettings(type, t)),
                            ...s.periodicNotesCustom.map((entry, index) => ({
                                name: index === 0 ? t.setting.periodicNotesCustomEntries.name : `${t.setting.periodicNotesCustomEntries.defaultName} ${index + 1}`,
                                visible: () => s.showPeriodicNotes && s.periodicNotesMode === 'custom',
                                render: (setting: Setting) => this.renderCustomPeriodicEntry(setting, index, t, entry),
                            })),
                            {
                                name: t.setting.periodicNotesCustomEntries.name,
                                visible: () => s.showPeriodicNotes && s.periodicNotesMode === 'custom' && s.periodicNotesCustom.length === 0,
                                render: (setting: Setting) => {
                                    setting.setName(t.setting.periodicNotesCustomEntries.emptyName)
                                    setting.setDesc(t.setting.periodicNotesCustomEntries.desc ?? '')
                                    setting.addButton((button) => button
                                        .setButtonText(t.setting.periodicNotesCustomEntries.addLabel)
                                        .setTooltip(t.setting.periodicNotesCustomEntries.addLabel)
                                        .onClick(() => this.addCustomPeriodicEntry(t)))
                                },
                            },
                            {
                                name: '',
                                visible: () => s.showPeriodicNotes && s.periodicNotesMode === 'custom' && s.periodicNotesCustom.length > 0,
                                render: (setting: Setting) => {
                                    setting.addButton((button) => button
                                        .setButtonText(t.setting.periodicNotesCustomEntries.addLabel)
                                        .onClick(() => this.addCustomPeriodicEntry(t)))
                                },
                            },
                        ],
                    },
                    // 新增：库数据 SubPage —— 总开关、各统计项开关与拖拽排序
                    {
                        type: 'page',
                        name: t.page.vaultStats.name,
                        desc: t.page.vaultStats.desc,
                        items: [
                            {
                                name: t.setting.vaultStats.name,
                                desc: t.setting.vaultStats.desc,
                                control: { type: 'toggle', key: 'vaultStats', defaultValue: DEFAULT_SETTINGS.vaultStats },
                            },
                            {
                                // 官方 SettingDefinitionList：设置 onReorder 后每行自带拖拽手柄
                                type: 'list',
                                heading: t.group.vaultStatsItems,
                                visible: () => s.vaultStats,
                                onReorder: (oldIndex, newIndex) => {
                                    const order = [...s.vaultStatsOrder]
                                    const [moved] = order.splice(oldIndex, 1)
                                    order.splice(newIndex, 0, moved)
                                    s.vaultStatsOrder = order
                                    void this.plugin.saveSettings()
                                    this.update()
                                },
                                items: s.vaultStatsOrder.map((key) => this.vaultStatsItemSetting(key, t)),
                            },
                        ],
                    },
                ],
            },

            // Appearance — two sub-pages under one heading
            {
                type: 'group',
                heading: t.group.appearance,
                items: [
                    {
                        type: 'page',
                        name: t.page.logo.name,
                        desc: t.page.logo.desc,
                        items: [
                            this.dropdownWithReset('logoType', t.setting.logo.name, t.setting.logo.desc, t.setting.logo.options, { rebuildAfterChange: true }),
                            {
                                name: t.setting.logoSource.name,
                                visible: () => ['imagePath', 'imageLink', 'lucideIcon'].includes(s.logoType),
                                render: (setting) => this.renderLogoSource(setting, t),
                            },
                            {
                                name: t.setting.logoSvgSource.name,
                                visible: () => s.logoType === 'svgCode',
                                render: (setting) => this.renderSvgLogoSource(setting, t),
                            },
                            this.dropdownWithReset('iconColorType', t.setting.iconColor.name, t.setting.iconColor.desc, colorOptions(), {
                                visible: () => s.logoType === 'lucideIcon',
                                rebuildAfterChange: true, // re-render so the custom color picker shows up
                            }),
                            {
                                name: t.setting.iconColor.name,
                                desc: t.setting.iconColor.desc,
                                visible: () => s.logoType === 'lucideIcon' && s.iconColorType === 'custom',
                                control: { type: 'color', key: 'iconColor', defaultValue: '#000000' },
                            },
                            {
                                type: 'group',
                                heading: t.group.logoLayout,
                                items: [
                                    this.sliderWithReset('logoScale', t.setting.logoScale.name, t.setting.logoScale.desc, 0.3, 3, 0.1),
                                    {
                                        // Placement applies to every rendered logo (including the built-in ones)
                                        ...this.dropdownWithReset('logoPosition', t.setting.logoPosition.name, t.setting.logoPosition.desc, t.setting.logoPosition.options),
                                        visible: () => s.logoType !== 'none',
                                    },
                                    {
                                        name: t.setting.logoMarginIndividual.name,
                                        desc: t.setting.logoMarginIndividual.desc,
                                        visible: () => s.logoType !== 'none',
                                        render: (setting) => {
                                            setting
                                                .addToggle((toggle) => toggle
                                                    .setValue(s.logoMarginIndividual)
                                                    .onChange(async (value) => {
                                                        s.logoMarginIndividual = value
                                                        await this.plugin.saveSettings()
                                                        this.update() // rebuild to show/hide the per-direction margin sliders
                                                    }))
                                        },
                                    },
                                    {
                                        ...this.sliderWithReset('logoMargin', t.setting.logoMargin.name, t.setting.logoMargin.desc, 0, 50, 1),
                                        visible: () => s.logoType !== 'none' && !s.logoMarginIndividual,
                                    },
                                    {
                                        ...this.sliderWithReset('logoMarginTop', t.setting.logoMarginTop.name, t.setting.logoMarginTop.desc, 0, 50, 1),
                                        visible: () => s.logoType !== 'none' && s.logoMarginIndividual,
                                    },
                                    {
                                        ...this.sliderWithReset('logoMarginRight', t.setting.logoMarginRight.name, t.setting.logoMarginRight.desc, 0, 50, 1),
                                        visible: () => s.logoType !== 'none' && s.logoMarginIndividual,
                                    },
                                    {
                                        ...this.sliderWithReset('logoMarginBottom', t.setting.logoMarginBottom.name, t.setting.logoMarginBottom.desc, 0, 50, 1),
                                        visible: () => s.logoType !== 'none' && s.logoMarginIndividual,
                                    },
                                    {
                                        ...this.sliderWithReset('logoMarginLeft', t.setting.logoMarginLeft.name, t.setting.logoMarginLeft.desc, 0, 50, 1),
                                        visible: () => s.logoType !== 'none' && s.logoMarginIndividual,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'page',
                        name: t.page.titleStyle.name,
                        desc: t.page.titleStyle.desc,
                        items: [
                            {
                                name: t.setting.title.name,
                                render: (setting) => {
                                    setting.addText((text) => text
                                        .setValue(s.wordmark)
                                        .onChange((value) => {
                                            s.wordmark = value
                                            void this.plugin.saveSettings()
                                        }))
                                    this.addResetButton(setting, 'wordmark')
                                },
                            },
                            this.dropdownWithReset('customFont', t.setting.titleFont.name, t.setting.titleFont.desc, t.setting.titleFont.options, { rebuildAfterChange: true }),
                            {
                                name: t.setting.customFontName.name,
                                desc: t.setting.customFontName.desc,
                                visible: () => s.customFont === 'custom',
                                render: (setting) => this.renderCustomFontName(setting, t),
                            },
                            {
                                name: t.setting.fontSize.name,
                                desc: t.setting.fontSize.desc,
                                render: (setting) => {
                                    const initialSize = fontSizeEmValue(s.fontSize)
                                    const normalizedSize = `${initialSize}em`
                                    if (s.fontSize !== normalizedSize) {
                                        s.fontSize = normalizedSize
                                        void this.plugin.saveSettings()
                                    }
                                    setting.addSlider((slider) => slider
                                        .setLimits(2, 8, 0.5)
                                        .setValue(initialSize)
                                        .setDisplayFormat((value) => `${value}em`)
                                        .onChange((value) => {
                                            s.fontSize = `${value}em`
                                            void this.plugin.saveSettings()
                                        }))
                                    this.addResetButton(setting, 'fontSize')
                                },
                            },
                            this.sliderWithReset('fontWeight', t.setting.fontWeight.name, t.setting.fontWeight.desc, 100, 900, 100),
                            this.dropdownWithReset('fontColorType', t.setting.titleColor.name, undefined, colorOptions(), {
                                rebuildAfterChange: true, // re-render so the custom color picker shows up
                            }),
                            {
                                name: t.setting.titleColor.name,
                                visible: () => s.fontColorType === 'custom',
                                control: { type: 'color', key: 'fontColor', defaultValue: '#000000' },
                            },
                            {
                                type: 'group',
                                heading: t.group.titleMargin,
                                items: [
                                    {
                                        name: t.setting.titleMarginIndividual.name,
                                        desc: t.setting.titleMarginIndividual.desc,
                                        render: (setting) => {
                                            setting
                                                .addToggle((toggle) => toggle
                                                    .setValue(s.titleMarginIndividual)
                                                    .onChange(async (value) => {
                                                        s.titleMarginIndividual = value
                                                        await this.plugin.saveSettings()
                                                        this.update() // rebuild to show/hide the per-direction margin sliders
                                                    }))
                                        },
                                    },
                                    {
                                        ...this.sliderWithReset('titleMargin', t.setting.titleMargin.name, t.setting.titleMargin.desc, 0, 50, 1),
                                        visible: () => !s.titleMarginIndividual,
                                    },
                                    {
                                        ...this.sliderWithReset('titleMarginTop', t.setting.titleMarginTop.name, t.setting.titleMarginTop.desc, 0, 50, 1),
                                        visible: () => s.titleMarginIndividual,
                                    },
                                    {
                                        ...this.sliderWithReset('titleMarginRight', t.setting.titleMarginRight.name, t.setting.titleMarginRight.desc, 0, 50, 1),
                                        visible: () => s.titleMarginIndividual,
                                    },
                                    {
                                        ...this.sliderWithReset('titleMarginBottom', t.setting.titleMarginBottom.name, t.setting.titleMarginBottom.desc, 0, 50, 1),
                                        visible: () => s.titleMarginIndividual,
                                    },
                                    {
                                        ...this.sliderWithReset('titleMarginLeft', t.setting.titleMarginLeft.name, t.setting.titleMarginLeft.desc, 0, 50, 1),
                                        visible: () => s.titleMarginIndividual,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'page',
                        name: t.page.particleEffect.name,
                        desc: t.page.particleEffect.desc,
                        items: [
                            {
                                name: t.setting.particleEffect.name,
                                desc: t.setting.particleEffect.desc,
                                control: { type: 'toggle', key: 'particleEffect', defaultValue: DEFAULT_SETTINGS.particleEffect },
                            },
                            {
                                name: t.setting.particleEffectPreview.name,
                                desc: t.setting.particleEffectPreview.desc,
                                visible: () => s.particleEffect,
                                render: (setting) => {
                                    setting.setClass('harbor-particle-preview')
                                    const preview = new ParticleSettingsPreview({ target: setting.settingEl })
                                    return () => preview.$destroy()
                                },
                            },
                            {
                                type: 'group',
                                heading: t.group.particleColor,
                                items: [
                                    this.dropdownWithReset('particleEffectColorMode', t.setting.particleEffectColorMode.name, t.setting.particleEffectColorMode.desc, t.setting.particleEffectColorMode.options, {
                                        visible: () => s.particleEffect,
                                        refreshDomAfterChange: true, // re-evaluate the dependent color pickers/mode items in place
                                    }),
                                    {
                                        name: t.setting.particleEffectPreserveShading.name,
                                        desc: t.setting.particleEffectPreserveShading.desc,
                                        control: { type: 'toggle', key: 'particleEffectPreserveShading', defaultValue: DEFAULT_SETTINGS.particleEffectPreserveShading },
                                        visible: () => s.particleEffect && s.particleEffectColorMode !== 'original',
                                    },
                                    {
                                        name: t.setting.particleEffectColor.name,
                                        desc: t.setting.particleEffectColor.desc,
                                        visible: () => s.particleEffect && s.particleEffectColorMode !== 'original',
                                        render: (setting) => this.renderThemeColorSetting(setting, t, 'particleEffectColor'),
                                    },
                                    {
                                        name: t.setting.particleEffectColor2.name,
                                        desc: t.setting.particleEffectColor2.desc,
                                        visible: () => s.particleEffect && s.particleEffectColorMode === 'gradient',
                                        render: (setting) => this.renderThemeColorSetting(setting, t, 'particleEffectColor2'),
                                    },
                                    {
                                        ...this.sliderWithReset('particleEffectGradientArea', t.setting.particleEffectGradientArea.name, t.setting.particleEffectGradientArea.desc, 10, 90, 5),
                                        visible: () => s.particleEffect && s.particleEffectColorMode === 'gradient' && s.particleEffectGradientAnimation !== 'breathe',
                                    },
                                    {
                                        ...this.sliderWithReset('particleEffectGradientAngle', t.setting.particleEffectGradientAngle.name, t.setting.particleEffectGradientAngle.desc, 0, 360, 5),
                                        visible: () => s.particleEffect && s.particleEffectColorMode === 'gradient' && s.particleEffectGradientAnimation !== 'breathe',
                                    },
                                    {
                                        ...this.sliderWithReset('particleEffectGradientTransition', t.setting.particleEffectGradientTransition.name, t.setting.particleEffectGradientTransition.desc, 0, 100, 5),
                                        visible: () => s.particleEffect && s.particleEffectColorMode === 'gradient' && s.particleEffectGradientAnimation !== 'breathe',
                                    },
                                ],
                            },
                            {
                                type: 'group',
                                heading: t.group.particleEffects,
                                items: [
                                    this.dropdownWithReset('particleEffectGradientAnimation', t.setting.particleEffectGradientAnimation.name, t.setting.particleEffectGradientAnimation.desc, t.setting.particleEffectGradientAnimation.options, {
                                        visible: () => s.particleEffect && s.particleEffectColorMode === 'gradient',
                                        refreshDomAfterChange: true,
                                    }),
                                    {
                                        ...this.sliderWithReset('particleEffectGradientFrequency', t.setting.particleEffectGradientFrequency.name, t.setting.particleEffectGradientFrequency.desc, 0.25, 4, 0.05),
                                        visible: () => s.particleEffect && s.particleEffectColorMode === 'gradient' && s.particleEffectGradientAnimation !== 'static',
                                    },
                                    {
                                        ...this.sliderWithReset('particleEffectGradientPause', t.setting.particleEffectGradientPause.name, t.setting.particleEffectGradientPause.desc, 0, 10, 0.25),
                                        visible: () => s.particleEffect && s.particleEffectColorMode === 'gradient' && s.particleEffectGradientAnimation !== 'static',
                                    },
                                    this.dropdownWithReset('particleEffectAmbientMotion', t.setting.particleEffectAmbientMotion.name, t.setting.particleEffectAmbientMotion.desc, t.setting.particleEffectAmbientMotion.options, {
                                        visible: () => s.particleEffect,
                                        refreshDomAfterChange: true, // toggles the motion frequency slider in place
                                    }),
                                    {
                                        ...this.sliderWithReset('particleEffectMotionFrequency', t.setting.particleEffectMotionFrequency.name, t.setting.particleEffectMotionFrequency.desc, 0.25, 4, 0.05),
                                        visible: () => s.particleEffect && s.particleEffectAmbientMotion !== 'none',
                                    },
                                ],
                            },
                            {
                                type: 'group',
                                heading: t.group.particleCanvas,
                                items: [
                                    {
                                        ...this.sliderWithReset('particleEffectCanvasPaddingTop', t.setting.particleEffectCanvasPaddingTop.name, t.setting.particleEffectCanvasPaddingTop.desc, 0, 150, 5),
                                        visible: () => s.particleEffect,
                                    },
                                    {
                                        ...this.sliderWithReset('particleEffectCanvasPaddingBottom', t.setting.particleEffectCanvasPaddingBottom.name, t.setting.particleEffectCanvasPaddingBottom.desc, 0, 150, 5),
                                        visible: () => s.particleEffect,
                                    },
                                    {
                                        ...this.sliderWithReset('particleEffectScale', t.setting.particleEffectScale.name, t.setting.particleEffectScale.desc, 1, 3, 0.1),
                                        visible: () => s.particleEffect,
                                    },
                                    {
                                        ...this.sliderWithReset('particleEffectScaleMobile', t.setting.particleEffectScaleMobile.name, t.setting.particleEffectScaleMobile.desc, 1, 3, 0.1),
                                        visible: () => s.particleEffect,
                                    },
                                    {
                                        ...this.sliderWithReset('particleEffectSpacing', t.setting.particleEffectSpacing.name, t.setting.particleEffectSpacing.desc, 1, 3, 0.1),
                                        visible: () => s.particleEffect,
                                    },
                                    {
                                        ...this.sliderWithReset('particleEffectDotSize', t.setting.particleEffectDotSize.name, t.setting.particleEffectDotSize.desc, 0.2, 1, 0.05),
                                        visible: () => s.particleEffect,
                                    },
                                    {
                                        name: t.setting.particleEffectAdaptiveSize.name,
                                        desc: t.setting.particleEffectAdaptiveSize.desc,
                                        control: { type: 'toggle', key: 'particleEffectAdaptiveSize', defaultValue: DEFAULT_SETTINGS.particleEffectAdaptiveSize },
                                        visible: () => s.particleEffect,
                                    },
                                ],
                            },
                            {
                                type: 'group',
                                heading: t.group.particleInteraction,
                                items: [
                                    {
                                        name: t.setting.particleEffectParallax.name,
                                        desc: t.setting.particleEffectParallax.desc,
                                        control: { type: 'toggle', key: 'particleEffectParallax', defaultValue: DEFAULT_SETTINGS.particleEffectParallax },
                                        visible: () => s.particleEffect,
                                    },
                                    {
                                        ...this.sliderWithReset('particleEffectDisturbRadius', t.setting.particleEffectDisturbRadius.name, t.setting.particleEffectDisturbRadius.desc, 5, 100, 1),
                                        visible: () => s.particleEffect,
                                    },
                                    {
                                        ...this.sliderWithReset('particleEffectDisturbStrength', t.setting.particleEffectDisturbStrength.name, t.setting.particleEffectDisturbStrength.desc, 0.1, 3, 0.1),
                                        visible: () => s.particleEffect,
                                    },
                                    {
                                        ...this.sliderWithReset('particleEffectDisturbFalloff', t.setting.particleEffectDisturbFalloff.name, t.setting.particleEffectDisturbFalloff.desc, 0.1, 2, 0.1),
                                        visible: () => s.particleEffect,
                                    },
                                    {
                                        ...this.sliderWithReset('particleEffectRecoverySpeed', t.setting.particleEffectRecoverySpeed.name, t.setting.particleEffectRecoverySpeed.desc, 0.6, 2.5, 0.1),
                                        visible: () => s.particleEffect,
                                    },
                                    {
                                        ...this.sliderWithReset('particleEffectRecoveryDamping', t.setting.particleEffectRecoveryDamping.name, t.setting.particleEffectRecoveryDamping.desc, 0, 100, 5),
                                        visible: () => s.particleEffect,
                                    },
                                ],
                            },
                        ],
                    },
                    this.dropdownWithReset('selectionHighlight', t.setting.selectionHighlight.name, t.setting.selectionHighlight.desc,
                        { default: t.common.themeDefault, accentColor: t.common.accentColor }, { refreshAfterChange: true }),
                ],
            },

            // Developer
            {
                type: 'group',
                heading: t.group.developer,
                items: [
                    {
                        name: t.setting.debugMode.name,
                        desc: t.setting.debugMode.desc,
                        control: { type: 'toggle', key: 'debugMode', defaultValue: false },
                    },
                ],
            },
        ]
    }

    /**
     * Theme-aware color row: one picker per theme (light/dark), stacked like
     * Obsidian's own per-theme accent control. Reset restores both values.
     */
    private renderThemeColorSetting(
        setting: Setting,
        t: ReturnType<typeof getLocale>,
        baseKey: 'particleEffectColor' | 'particleEffectColor2',
    ): void {
        const s = this.plugin.settings
        setting.setClass('harbor-theme-color')
        const entries = [
            { label: t.common.themeLight, key: baseKey },
            { label: t.common.themeDark, key: `${baseKey}Dark` },
        ] as const
        const stack = setting.controlEl.createDiv('harbor-theme-color-stack')
        for (const entry of entries) {
            const row = stack.createDiv('harbor-theme-color-row')
            row.createSpan({ text: entry.label, cls: 'harbor-theme-color-label' })
            new ColorComponent(row)
                .setValue(s[entry.key] ?? '')
                .onChange((value) => {
                    s[entry.key] = value
                    void this.plugin.saveSettings()
                })
        }
        setting.addExtraButton((button) => button
            .setIcon('reset')
            .setTooltip(t.common.resetToDefault)
            .onClick(async () => {
                for (const entry of entries) {
                    s[entry.key] = DEFAULT_SETTINGS[entry.key]
                }
                await this.plugin.saveSettings()
                this.update()
            }))
    }

    /** Logo value input with the suggester matching the selected logo type */
    private renderSvgLogoSource(setting: Setting, t: ReturnType<typeof getLocale>): void {
        const s = this.plugin.settings
        const ownerDocument = setting.settingEl.ownerDocument
        setting.settingEl.addClass('home-tab-svg-source')
        let warning: HTMLElement
        setting.addExtraButton(button => {
            button.setIcon('alert-circle').setTooltip(t.setting.logoSvgSource.invalidTooltip)
            warning = button.extraSettingsEl
            warning.addClass('mod-warning')
            warning.toggleVisibility(false)
        })
        setting.addTextArea(text => {
            text.inputEl.rows = 6
            text.setPlaceholder(t.setting.logoSvgSource.placeholder)
                .setValue(s.logo.svgCode ?? '')
                .onChange(value => {
                    const svg = normalizeSvgLogo(value, ownerDocument)
                    warning.toggleVisibility(svg === null)
                    if (svg !== null) {
                        s.logo.svgCode = svg
                        void this.plugin.saveSettings()
                    }
                })
        })
    }

    private renderLogoSource(setting: Setting, t: ReturnType<typeof getLocale>): void {
        const s = this.plugin.settings
        let invalidInputIcon: HTMLElement
        setting
            .addExtraButton((button) => {button
                .setIcon('alert-circle')
                .setTooltip(t.setting.logo.invalidTooltip)
                invalidInputIcon = button.extraSettingsEl
                invalidInputIcon.toggleVisibility(false)
                invalidInputIcon.addClass('mod-warning')})

        setting
            .addSearch((text) => {
                const logoType = s.logoType
                if(logoType === 'imagePath'){
                    new ImageFileSuggester(this.app, text.inputEl)
                }
                else if(logoType === 'lucideIcon'){
                    new iconSuggester(this.app, text.inputEl, true)
                }
                text
                    .setPlaceholder(t.setting.logo.placeholder)
                    .setValue(logoType !== 'default' && s.logo[logoType] != '' ? String(s.logo[logoType]) : '')
                    .onChange(async (value) => {
                        if(value === '' || value == '/'){
                            invalidInputIcon.toggleVisibility(false)
                            return
                        }
                        const currentType = s.logoType
                        if(currentType === 'imagePath'){
                            const normalizedPath = normalizePath(value)
                            if (await this.app.vault.adapter.exists(normalizedPath)){
                                invalidInputIcon.toggleVisibility(false)
                                s.logo['imagePath'] = normalizedPath
                                void this.plugin.saveSettings()
                            }
                            else{
                                invalidInputIcon.toggleVisibility(true)
                            }
                        }
                        else if(currentType === 'imageLink'){
                            if(isLink(value)){
                                invalidInputIcon.toggleVisibility(false)
                                s.logo['imageLink'] = value
                                void this.plugin.saveSettings()
                            }
                            else{
                                invalidInputIcon.toggleVisibility(true)
                            }
                        }
                        else if(currentType === 'lucideIcon'){
                            if(getIconIds().includes(value)){
                                s.logo['lucideIcon'] = value
                                void this.plugin.saveSettings()
                                invalidInputIcon.toggleVisibility(false)
                            }
                            else{
                                invalidInputIcon.toggleVisibility(true)
                            }
                        }
                    })
                    .inputEl.parentElement?.addClass('wide-input-container')
            })
    }

    /** Custom font name input with desktop system font suggestions */
    private renderCustomFontName(setting: Setting, t: ReturnType<typeof getLocale>): void {
        const s = this.plugin.settings
        let invalidFontIcon: HTMLElement
        setting
            .addExtraButton((button) => {button
                .setIcon('alert-circle')
                .setTooltip(t.setting.titleFont.invalidTooltip)
                invalidFontIcon = button.extraSettingsEl
                invalidFontIcon.toggleVisibility(false)
                invalidFontIcon.addClass('mod-warning')})

        setting.addSearch((text) => {
            text.setValue(s.font ? s.font.replace(/"/g, ''): '')
            text.setPlaceholder(t.setting.logo.placeholder)
            const suggester: fontSuggester | undefined = Platform.isMobile ? undefined : new fontSuggester(this.app, text.inputEl, true)

            text.onChange(async (value) => {
                const fontName = value.replace(/"/g, '').trim()
                value = fontName.indexOf(' ') >= 0 ? `"${fontName}"` : fontName // Restore quotes for CSS font-family names with spaces
                const installedFonts = suggester ? await suggester.getInstalledFonts() : []
                const isInstalledFont = installedFonts.some(font => font.toLocaleLowerCase() === fontName.toLocaleLowerCase())

                if(isInstalledFont || checkFont(value) ){
                    s.font = value
                    void this.plugin.saveSettings()
                    invalidFontIcon.toggleVisibility(false)
                }
                else{
                    invalidFontIcon.toggleVisibility(true)
                }
            })
            .inputEl.parentElement?.addClass('wide-input-container')
        })
    }

    /** Command ID input for the new-note button override, with command suggester + validity marker */
    private renderNewNoteCommand(setting: Setting, t: ReturnType<typeof getLocale>): void {
        const s = this.plugin.settings
        let invalidCommandIcon: HTMLElement
        setting
            .addExtraButton((button) => {button
                .setIcon('alert-circle')
                .setTooltip(t.setting.newNoteCommandId.invalid)
                invalidCommandIcon = button.extraSettingsEl
                invalidCommandIcon.toggleVisibility(false)
                invalidCommandIcon.addClass('mod-warning')})

        setting
            .addText((text) => {
                new CommandSuggester(this.app, text.inputEl, s.maxResults)
                text
                    .setPlaceholder(t.setting.newNoteCommandId.placeholder)
                    .setValue(s.newNoteCommandId)
                    .onChange((value) => {
                        // Empty clears the override; otherwise the command must exist
                        const isValid = value === '' || !!this.app.commands?.commands?.[value]
                        invalidCommandIcon.toggleVisibility(!isValid)
                        if(isValid){
                            s.newNoteCommandId = value
                            void this.plugin.saveSettings()
                        }
                    })
                    .inputEl.parentElement?.addClass('wide-input-container')
            })
        this.addResetButton(setting, 'newNoteCommandId')
    }

    /** Default folder input for the new-note modal, with folder suggester */
    private renderNewNoteDefaultFolder(setting: Setting, t: ReturnType<typeof getLocale>): void {
        const s = this.plugin.settings
        setting
            .addText((text) => {
                new NewNoteFolderSuggester(this.app, text.inputEl, s.maxResults)
                text
                    .setPlaceholder(t.setting.newNoteDefaultFolder.placeholder)
                    .setValue(s.newNoteDefaultFolder)
                    .onChange((value) => {
                        s.newNoteDefaultFolder = normalizePath(value)
                        void this.plugin.saveSettings()
                    })
                    .inputEl.parentElement?.addClass('wide-input-container')
            })
        this.addResetButton(setting, 'newNoteDefaultFolder')
    }

    /** Per-type settings: show toggle, display-name mode, and custom display name with live preview */
    private periodTypeSettings(type: (typeof PERIOD_TYPES)[number], t: ReturnType<typeof getLocale>): SettingDefinitionItem {
        const s = this.plugin.settings
        const cap = type[0].toUpperCase() + type.slice(1)
        const showKey = `periodicNotesShow${cap}`
        const modeKey = `periodicNotesLabelMode${cap}`
        const customKey = `periodicNotesLabelCustom${cap}`
        const showName = (t.setting as unknown as Record<string, SettingEntry | undefined>)[`periodicNotesShow${cap}`]?.name ?? showKey
        // The type row is only offered when the source plugin actually provides this period
        const typeAvailable = () => s.showPeriodicNotes && s.periodicNotesMode === 'auto' && !!getAutoPeriodConfigs(this.app)[type]

        return {
            type: 'group',
            heading: t.periodicNoteGroup[type],
            visible: typeAvailable,
            items: [
                {
                    name: showName,
                    visible: typeAvailable,
                    control: { type: 'toggle', key: showKey },
                },
                this.dropdownWithReset(modeKey, t.setting.periodicNotesLabelMode.name, t.setting.periodicNotesLabelMode.desc, t.setting.periodicNotesLabelMode.options, {
                    visible: () => typeAvailable() && s[showKey] === true,
                    refreshDomAfterChange: true, // show/hide the custom display name input in place
                }),
                {
                    name: t.setting.periodicNotesLabelCustom.name,
                    visible: () => typeAvailable() && s[showKey] === true && s[modeKey] === 'custom',
                    render: (setting: Setting) => {
                        // Live preview: render the {{token}} placeholders as they type
                        const updatePreview = (): void => {
                            const value = (s[customKey] as string ?? '').trim()
                            const preview = value ? `${t.setting.periodicNotesLabelPreview}: ${formatPeriodicLabel(value)}` : undefined
                            setDescriptionWithPreview(setting, t.setting.periodicNotesLabelCustom.desc ?? '', preview)
                        }
                        updatePreview()
                        setting.addText((text) => text
                            .setPlaceholder(t.setting.periodicNotesLabelCustom.placeholder)
                            .setValue(s[customKey] as string ?? '')
                            .onChange((value) => {
                                s[customKey] = value
                                void this.plugin.saveSettings()
                                updatePreview()
                            }))
                    },
                },
            ],
        }
    }

    /** One editor row (label / folder / format + delete) for a custom periodic note rule */
    private renderCustomPeriodicEntry(
        setting: Setting,
        index: number,
        t: ReturnType<typeof getLocale>,
        entry: PeriodicNoteCustomEntry,
    ): void {
        setting.settingEl.addClass('harbor-periodic-custom-entry')
        setting.setName(entry.label.trim() || `${t.setting.periodicNotesCustomEntries.defaultName} ${index + 1}`)
        // Live preview of the {{token}} placeholders in the display label
        const updateLabelPreview = (): void => {
            const value = entry.label.trim()
            const preview = value ? `${t.setting.periodicNotesLabelPreview}: ${formatPeriodicLabel(value)}` : undefined
            setDescriptionWithPreview(setting, t.setting.periodicNotesCustomEntries.desc ?? '', preview)
        }
        updateLabelPreview()
        setting
            .addText((text) => text
                .setPlaceholder(t.setting.periodicNotesCustomEntries.labelPlaceholder)
                .setValue(entry.label)
                .onChange((value) => {
                    entry.label = value
                    setting.setName(value.trim() || `${t.setting.periodicNotesCustomEntries.defaultName} ${index + 1}`)
                    updateLabelPreview()
                    void this.plugin.saveSettings()
                }))
            .addText((text) => text
                .setPlaceholder(t.setting.periodicNotesCustomEntries.folderPlaceholder)
                .setValue(entry.folder)
                .onChange((value) => {
                    entry.folder = value
                    void this.plugin.saveSettings()
                }))
            .addText((text) => text
                .setPlaceholder(t.setting.periodicNotesCustomEntries.formatPlaceholder)
                .setValue(entry.format)
                .onChange((value) => {
                    entry.format = value
                    void this.plugin.saveSettings()
                }))
            .addExtraButton((button) => button
                .setIcon('trash-2')
                .setTooltip(t.common.delete)
                .onClick(async () => {
                    this.plugin.settings.periodicNotesCustom.splice(index, 1)
                    await this.plugin.saveSettings()
                    this.update()
                    this.plugin.refreshOpenViews()
                }))
    }

    /** Appends a new custom periodic note rule and rebuilds the settings page */
    private addCustomPeriodicEntry(t: ReturnType<typeof getLocale>): void {
        this.plugin.settings.periodicNotesCustom.push({
            label: t.setting.periodicNotesCustomEntries.defaultName,
            folder: '',
            format: 'YYYY-MM-DD',
        })
        void this.plugin.saveSettings().then(() => {
            this.update()
            this.plugin.refreshOpenViews()
        })
    }

    private sliderWithReset(
        key: string,
        name: string,
        desc: string | undefined,
        min: number,
        max: number,
        step: number,
        opts?: { refreshAfterChange?: boolean },
    ): SettingDefinitionRender {
        return {
            name,
            desc,
            render: (setting) => {
                setting
                    .addSlider((slider) => slider
                        .setLimits(min, max, step)
                        .setValue(this.plugin.settings[key] as number)
                        .onChange((value) => {
                            this.plugin.settings[key] = value
                            void this.plugin.saveSettings()
                            if(opts?.refreshAfterChange){this.plugin.refreshOpenViews()}
                        }))
                this.addResetButton(setting, key)
            },
        }
    }

    private dropdownWithReset(
        key: string,
        name: string,
        desc: string | undefined,
        options: Record<string, string>,
        opts?: { visible?: () => boolean; rebuildAfterChange?: boolean; refreshAfterChange?: boolean; refreshDomAfterChange?: boolean },
    ): SettingDefinitionRender {
        return {
            name,
            desc,
            visible: opts?.visible,
            render: (setting) => {
                setting
                    .addDropdown((dropdown) => dropdown
                        .addOptions(options)
                        .setValue(this.plugin.settings[key] as string)
                        .onChange((value) => {
                            this.plugin.settings[key] = value
                            void this.plugin.saveSettings()
                            if (opts?.rebuildAfterChange){this.update()}
                            if (opts?.refreshAfterChange){this.plugin.refreshOpenViews()}
                            if (opts?.refreshDomAfterChange){this.refreshDomState()}
                        }))
                this.addResetButton(setting, key)
            },
        }
    }

    addResetButton(settingElement: Setting, settingKey: string){
        settingElement
            .addExtraButton((button) => button
                    .setIcon('reset')
                    .setTooltip(getLocale().common.resetToDefault)
                    .onClick(async () => {
                        this.plugin.settings[settingKey] = DEFAULT_SETTINGS[settingKey]
                        await this.plugin.saveSettings()
                        this.update()
                    }))
    }

    // 新增：单个库数据项的设置行 —— 启用开关（排序由外层 list 的拖拽手柄完成）
    private vaultStatsItemSetting(key: VaultStatItemKey, t: ReturnType<typeof getLocale>): SettingDefinition {
        const s = this.plugin.settings
        return {
            name: this.vaultStatsItemName(key, t),
            render: (setting) => {
                setting
                    .addToggle((toggle) => toggle
                        .setValue(s.vaultStatsItems.includes(key))
                        .onChange(async (value) => {
                            s.vaultStatsItems = value
                                ? [...s.vaultStatsItems, key]
                                : s.vaultStatsItems.filter((item) => item !== key)
                            await this.plugin.saveSettings()
                        }))
            },
        }
    }

    private vaultStatsItemName(key: VaultStatItemKey, t: ReturnType<typeof getLocale>): string {
        switch (key) {
            case 'files': return t.setting.vaultStatsFiles.name
            case 'notes': return t.setting.vaultStatsNotes.name
            case 'attachments': return t.setting.vaultStatsAttachments.name
            case 'folders': return t.setting.vaultStatsFolders.name
            case 'tags': return t.setting.vaultStatsTags.name
        }
    }
}

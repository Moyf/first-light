import { App, moment, normalizePath, TFile, type IconName } from 'obsidian'
import { t } from './i18n'
import type { HomeTabSettings } from './settings'

/**
 * obsidian re-exports the moment namespace whose type is not callable
 * (the moment types are not part of this project), so keep a minimal
 * callable signature for the format tokens used here.
 */
const momentFn = moment as unknown as () => { format: (format: string) => string }

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

/** How a periodic note is labeled on the home tab */
export type PeriodicNoteLabelMode = 'filename' | 'text' | 'custom'

/** Folder / format / template configuration resolved from a source plugin */
export interface PeriodicNoteConfig {
	folder: string
	format: string
	template: string
}

/** A user-defined periodic note rule (settings -> periodic notes -> custom) */
export interface PeriodicNoteCustomEntry {
	label: string
	folder: string
	format: string
}

/** One displayed periodic note (today's daily note, this week's weekly note, ...) */
export interface PeriodicNoteEntry {
	/** Absolute vault path including the .md extension */
	path: string
	/** Text displayed under the icon (custom label or the formatted note name) */
	label: string
	icon: IconName
	/** File-name mode follows the general display-name properties. */
	useFileDisplayName: boolean
	/** The note when it already exists in the vault */
	file: TFile | undefined
	exists: boolean
	/** Name format tokens, used to render {{date}} template placeholders on creation */
	format: string
	/** Template path configured by the source plugin (empty for custom rules) */
	template: string
}

export const PERIOD_TYPES: PeriodType[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']

const PERIOD_ICONS: Record<PeriodType, IconName> = {
	daily: 'calendar-days',
	weekly: 'calendar-range',
	monthly: 'calendar',
	quarterly: 'calendar-check',
	yearly: 'calendar-clock',
}

/** Fallback format tokens matching the defaults of the Daily notes / Periodic Notes plugins */
const DEFAULT_FORMATS: Record<PeriodType, string> = {
	daily: 'YYYY-MM-DD',
	weekly: 'gggg-[W]ww',
	monthly: 'YYYY-MM',
	quarterly: 'YYYY-[Q]Q',
	yearly: 'YYYY',
}

const PERIOD_SETTING_KEYS: Record<PeriodType, keyof HomeTabSettings> = {
	daily: 'periodicNotesShowDaily',
	weekly: 'periodicNotesShowWeekly',
	monthly: 'periodicNotesShowMonthly',
	quarterly: 'periodicNotesShowQuarterly',
	yearly: 'periodicNotesShowYearly',
}

const PERIOD_LABEL_MODE_KEYS: Record<PeriodType, keyof HomeTabSettings> = {
	daily: 'periodicNotesLabelModeDaily',
	weekly: 'periodicNotesLabelModeWeekly',
	monthly: 'periodicNotesLabelModeMonthly',
	quarterly: 'periodicNotesLabelModeQuarterly',
	yearly: 'periodicNotesLabelModeYearly',
}

const PERIOD_LABEL_CUSTOM_KEYS: Record<PeriodType, keyof HomeTabSettings> = {
	daily: 'periodicNotesLabelCustomDaily',
	weekly: 'periodicNotesLabelCustomWeekly',
	monthly: 'periodicNotesLabelCustomMonthly',
	quarterly: 'periodicNotesLabelCustomQuarterly',
	yearly: 'periodicNotesLabelCustomYearly',
}

/**
 * Renders {{token}} placeholders (the token content is a moment.js format,
 * e.g. "{{MM}}月{{DD}}日" -> "09月26日") used by custom display names.
 */
export function formatPeriodicLabel(input: string): string {
	const now = momentFn()
	return input.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_match, token: string) => now.format(token.trim()))
}

/** Fixed localized label of a period ("Today", "This week", ...) */
function periodTextLabel(type: PeriodType): string {
	const labels = t().periodicNoteText
	return labels[type]
}

interface RawPluginConfig {
	enabled?: boolean
	folder?: string
	format?: string
	template?: string
}

/**
 * Collects the folder/format/template configuration of every period type from
 * the Periodic Notes community plugin (takes precedence), falling back to the
 * Daily notes core plugin for the daily note. Legacy Periodic Notes versions
 * only stored configured periods (no `enabled` flag) and delegated the daily
 * note to the core plugin — both shapes are handled here.
 */
export function getAutoPeriodConfigs(app: App): Partial<Record<PeriodType, PeriodicNoteConfig>> {
	const configs: Partial<Record<PeriodType, PeriodicNoteConfig>> = {}

	const periodicNotesPlugin = app.plugins.getPlugin('periodic-notes') as unknown as {
		settings?: Record<string, RawPluginConfig | null>
	} | undefined
	const pluginSettings = periodicNotesPlugin?.settings
	if (pluginSettings) {
		const addConfig = (type: PeriodType, raw: RawPluginConfig | null | undefined): void => {
			if (!raw || raw.enabled === false) return
			configs[type] = {
				folder: typeof raw.folder === 'string' ? raw.folder : '',
				format: raw.format || DEFAULT_FORMATS[type],
				template: typeof raw.template === 'string' ? raw.template : '',
			}
		}
		addConfig('daily', pluginSettings.daily)
		addConfig('weekly', pluginSettings.weekly)
		addConfig('monthly', pluginSettings.monthly)
		addConfig('quarterly', pluginSettings.quarterly)
		addConfig('yearly', pluginSettings.yearly)
	}

	if (!configs.daily) {
		const internalPlugins = (app as unknown as {
			internalPlugins?: {
				getPluginById?: (id: string) => { instance?: { options?: RawPluginConfig } } | undefined
			}
		}).internalPlugins
		const options = internalPlugins?.getPluginById?.('daily-notes')?.instance?.options
		if (options) {
			configs.daily = {
				folder: typeof options.folder === 'string' ? options.folder : '',
				format: options.format || DEFAULT_FORMATS.daily,
				template: typeof options.template === 'string' ? options.template : '',
			}
		}
	}

	return configs
}

/** Whether any period type can be resolved from the Daily notes / Periodic Notes plugins */
export function hasAutoPeriodSource(app: App): boolean {
	return Object.keys(getAutoPeriodConfigs(app)).length > 0
}

function buildEntry(app: App, noteName: string, folder: string, format: string, template: string, icon: IconName, labelInput?: string): PeriodicNoteEntry {
	const normalizedFolder = folder.trim().replace(/^\/+|\/+$/g, '')
	const path = normalizePath(normalizedFolder ? `${normalizedFolder}/${noteName}.md` : `${noteName}.md`)
	const abstract = app.vault.getAbstractFileByPath(path)
	const file = abstract instanceof TFile ? abstract : undefined
	// Label: custom text (with {{token}} placeholders) when provided,
	// otherwise just the note file name without its folder path
	const trimmedLabel = labelInput?.trim()
	const label = trimmedLabel ? formatPeriodicLabel(trimmedLabel) : noteName.slice(noteName.lastIndexOf('/') + 1)
	return {
		path,
		label,
		icon,
		useFileDisplayName: !trimmedLabel,
		file,
		exists: file !== undefined,
		format,
		template,
	}
}

/** Builds the list of periodic note entries (today's / this week's / ... notes) to display */
export function buildPeriodicNoteEntries(app: App, settings: HomeTabSettings): PeriodicNoteEntry[] {
	const entries: PeriodicNoteEntry[] = []
	if (!settings.showPeriodicNotes) return entries

	const now = momentFn()

	if (settings.periodicNotesMode === 'custom') {
		settings.periodicNotesCustom.forEach((custom) => {
			const rawFormat = (custom.format ?? '').trim()
			if (!rawFormat) return
			// The rule may contain the folder itself (e.g. "Journal/YYYY-MM-DD");
			// leading segments are merged with the separate folder field
			const formatParts = rawFormat.split('/').filter((part) => part.trim() !== '')
			const nameFormat = formatParts.pop()
			if (!nameFormat) return
			const folder = [custom.folder ?? '', formatParts.join('/')].filter((part) => part.trim() !== '').join('/')
			entries.push(buildEntry(app, now.format(nameFormat), folder, nameFormat, '', 'calendar', custom.label))
		})
		return entries
	}

	const configs = getAutoPeriodConfigs(app)
	PERIOD_TYPES.forEach((type) => {
		if (!settings[PERIOD_SETTING_KEYS[type]]) return
		const config = configs[type]
		if (!config) return
		// Display name: file name (default), fixed period text, or custom text with placeholders
		const labelMode = settings[PERIOD_LABEL_MODE_KEYS[type]] as PeriodicNoteLabelMode | undefined
		let labelInput: string | undefined
		if (labelMode === 'text') {
			labelInput = periodTextLabel(type)
		} else if (labelMode === 'custom') {
			labelInput = (settings[PERIOD_LABEL_CUSTOM_KEYS[type]] as string) ?? ''
		}
		entries.push(buildEntry(app, now.format(config.format), config.folder, config.format, config.template, PERIOD_ICONS[type], labelInput))
	})
	return entries
}

function resolveTemplateFile(app: App, templatePath: string): TFile | undefined {
	const cleaned = templatePath.trim().replace(/\.md$/i, '')
	if (!cleaned) return undefined
	return app.metadataCache.getFirstLinkpathDest(`${cleaned}.md`, '') ?? undefined
}

/** Renders the {{date}}/{{time}}/{{title}} placeholders like the Daily notes plugin does */
function applyTemplate(template: string, noteName: string, format: string): string {
	const now = momentFn()
	return template
		.replace(/\{\{\s*time\s*(?::\s*([^}]+))?\s*\}\}/gi, (_match, timeFormat?: string) => now.format(timeFormat?.trim() || 'HH:mm'))
		.replace(/\{\{\s*date\s*(?::\s*([^}]+))?\s*\}\}/gi, (_match, dateFormat?: string) => now.format(dateFormat?.trim() || format))
		.replace(/\{\{\s*title\s*\}\}/gi, noteName)
}

/**
 * Opens the periodic note, creating it first when it does not exist yet —
 * including its folder and configured template — mimicking the Daily notes /
 * Periodic Notes commands.
 */
export async function openOrCreatePeriodicNote(app: App, entry: PeriodicNoteEntry): Promise<TFile | undefined> {
	const existing = app.vault.getAbstractFileByPath(entry.path)
	if (existing instanceof TFile) return existing

	const folder = entry.path.includes('/') ? entry.path.slice(0, entry.path.lastIndexOf('/')) : ''
	if (folder && !app.vault.getAbstractFileByPath(folder)) {
		try {
			await app.vault.createFolder(folder)
		} catch {
			// Concurrent creation or invalid path — the create below reports real failures
		}
	}

	const noteName = entry.path.slice(entry.path.lastIndexOf('/') + 1).replace(/\.md$/, '')
	let content = ''
	if (entry.template) {
		const templateFile = resolveTemplateFile(app, entry.template)
		if (templateFile) {
			try {
				content = applyTemplate(await app.vault.read(templateFile), noteName, entry.format)
			} catch {
				content = ''
			}
		}
	}

	try {
		return await app.vault.create(entry.path, content)
	} catch {
		const fallback = app.vault.getAbstractFileByPath(entry.path)
		return fallback instanceof TFile ? fallback : undefined
	}
}

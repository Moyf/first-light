/**
 * Message catalog type. Every locale file must implement this interface —
 * a missing key triggers a compile-time error.
 */
export interface SettingEntry {
	name: string
	desc?: string
}

export interface DropdownOptions {
	[key: string]: string
}

export interface BaseMessage {
	command: {
		openNewTab: string
		replaceCurrentTab: string
	}
	viewName: string
	newNoteModal: {
		title: string
		fileName: string
		fileNamePlaceholder: string
		folder: string
		folderDesc: string
		folderPlaceholder: string
		create: string
		cancel: string
		invalidFileName: string
		folderIsFile: string
		fileExists: string
		createFailed: string
		commandNotFound: string
	}
	/** Fixed period text used by the "Period text" display-name mode */
	periodicNoteText: {
		daily: string
		weekly: string
		monthly: string
		quarterly: string
		yearly: string
	}
	/** Context menu of the periodic notes section */
	periodicNotesMenu: {
		createNote: string
		openInNewTab: string
		openInNewWindow: string
	}
	group: {
		searchAndNewNote: string
		files: string
		appearance: string
		developer: string
		headingJump: string
		results: string
		logoLayout: string
		titleMargin: string
		particleStyle: string
		particleCanvas: string
		particleInteraction: string
		vaultStatsItems: string
	}
	page: {
		search: SettingEntry
		bookmarkedFiles: SettingEntry
		recentFiles: SettingEntry
		newNote: SettingEntry
		logo: SettingEntry
		titleStyle: SettingEntry
		particleEffect: SettingEntry
		periodicNotes: SettingEntry
		vaultStats: SettingEntry
	}
	setting: {
		replaceNewTabs: SettingEntry
		newTabOnStart: SettingEntry
		closePreviousSessionTabs: SettingEntry
		webUrlSuggestions: SettingEntry
		useOmnisearch: SettingEntry
		markdownOnly: SettingEntry
		additionalExtensions: SettingEntry
		unresolvedLinks: SettingEntry
		searchTitle: SettingEntry
		searchHeadings: SettingEntry
		autoJumpToHeading: SettingEntry
		headingJumpStrategy: SettingEntry & { options: DropdownOptions }
		showPath: SettingEntry
		showShortcuts: SettingEntry
		maxResults: SettingEntry
		searchDelay: SettingEntry
		hideOnBlur: SettingEntry
		showOmnisearchExcerpt: SettingEntry
		showBookmarkedFiles: SettingEntry
		showBookmarkedFilesFilter: SettingEntry
		bookmarkedGroups: SettingEntry
		showRecentFiles: SettingEntry
		showRecentFilesFilter: SettingEntry
		sectionCollapsible: SettingEntry
		storeRecentFile: SettingEntry
		maxRecentFiles: SettingEntry
		showNewNoteButton: SettingEntry
		newNoteUseCommand: SettingEntry
		newNoteCommandId: SettingEntry & { invalid: string; placeholder: string }
		newNoteDefaultFolder: SettingEntry & { placeholder: string }
		showPeriodicNotes: SettingEntry
		periodicNotesMode: SettingEntry & { options: DropdownOptions }
		periodicNotesDecoration: SettingEntry & { options: DropdownOptions }
		periodicNotesDecorationLeft: SettingEntry
		periodicNotesDecorationRight: SettingEntry
		periodicNotesUnavailable: SettingEntry
		periodicNotesShowDaily: SettingEntry
		periodicNotesShowWeekly: SettingEntry
		periodicNotesShowMonthly: SettingEntry
		periodicNotesShowQuarterly: SettingEntry
		periodicNotesShowYearly: SettingEntry
		periodicNotesLabelMode: SettingEntry & { options: DropdownOptions }
		periodicNotesLabelCustom: SettingEntry & { placeholder: string }
		periodicNotesLabelPreview: string
		periodicNotesCustomEntries: SettingEntry & {
			emptyName: string
			defaultName: string
			addLabel: string
			labelPlaceholder: string
			folderPlaceholder: string
			formatPlaceholder: string
		}
		newNoteOnUnmatchedName: SettingEntry
		logo: SettingEntry & {
			placeholder: string
			invalidTooltip: string
			options: DropdownOptions
		}
		logoSource: SettingEntry
		iconColor: SettingEntry
		logoPosition: SettingEntry & { options: DropdownOptions }
		logoMargin: SettingEntry
		logoMarginIndividual: SettingEntry
		logoMarginTop: SettingEntry
		logoMarginRight: SettingEntry
		logoMarginBottom: SettingEntry
		logoMarginLeft: SettingEntry
		logoScale: SettingEntry
		titleMargin: SettingEntry
		titleMarginIndividual: SettingEntry
		titleMarginTop: SettingEntry
		titleMarginRight: SettingEntry
		titleMarginBottom: SettingEntry
		titleMarginLeft: SettingEntry
		title: SettingEntry
		titleFont: SettingEntry & {
			invalidTooltip: string
			options: DropdownOptions
		}
		customFontName: SettingEntry
		fontSize: SettingEntry
		fontWeight: SettingEntry
		titleColor: SettingEntry
		selectionHighlight: SettingEntry
		particleEffect: SettingEntry
		particleEffectPreview: SettingEntry
		pointerGlow: SettingEntry
		particleEffectColorMode: SettingEntry & { options: DropdownOptions }
		particleEffectColor: SettingEntry
		particleEffectColor2: SettingEntry
		particleEffectGradientAnimation: SettingEntry & { options: DropdownOptions }
		particleEffectGradientAngle: SettingEntry
		particleEffectGradientFrequency: SettingEntry
		particleEffectScale: SettingEntry
		particleEffectScaleMobile: SettingEntry
		particleEffectSpacing: SettingEntry
		particleEffectDotSize: SettingEntry
		particleEffectDisturbRadius: SettingEntry
		particleEffectDisturbStrength: SettingEntry
		particleEffectRecoverySpeed: SettingEntry
		particleEffectAmbientMotion: SettingEntry & { options: DropdownOptions }
		particleEffectMotionFrequency: SettingEntry
		particleEffectGlow: SettingEntry
		vaultStats: SettingEntry
		vaultStatsFiles: SettingEntry
		vaultStatsNotes: SettingEntry
		vaultStatsAttachments: SettingEntry
		vaultStatsFolders: SettingEntry
		vaultStatsTags: SettingEntry
		debugMode: SettingEntry
	}
	common: {
		themeDefault: string
		themeLight: string
		themeDark: string
		accentColor: string
		custom: string
		resetToDefault: string
		delete: string
		clickToFilter: string
	}
	ui: {
		folderRevealFailed: string
		tagPaneFailed: string
	}
}

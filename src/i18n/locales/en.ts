import type { BaseMessage } from '../types'

const en: BaseMessage = {
	command: {
		openNewTab: 'Open new tab',
		replaceCurrentTab: 'Replace current tab',
	},
	viewName: 'Harbor Tab',
	searchNoResults: 'No results',
	newNoteModal: {
		title: 'New note',
		fileName: 'File name',
		fileNamePlaceholder: 'Type a file name ...',
		folder: 'Create folder',
		folderDesc: 'The note is created here; intermediate folders are created automatically.',
		folderPlaceholder: 'Leave empty for the vault root',
		create: 'Create',
		cancel: 'Cancel',
		invalidFileName: 'The file name is empty or contains invalid characters (\\ / : * ? " < > | # ^ [ ]).',
		folderIsFile: 'A file already exists at this folder path.',
		fileExists: 'A file with this name already exists.',
		createFailed: 'Failed to create the note. Check the developer console for details.',
		commandNotFound: 'The configured command is not available. Opening the create dialog instead.',
		},
	periodicNoteText: {
		daily: 'Today',
		weekly: 'This week',
		monthly: 'This month',
		quarterly: 'This quarter',
		yearly: 'This year',
	},
	periodicNotesMenu: {
		createNote: 'Create note',
		openInNewTab: 'Open in new tab',
		openInNewWindow: 'Open in new window',
	},
	periodicNoteGroup: {
		daily: 'Daily',
		weekly: 'Weekly',
		monthly: 'Monthly',
		quarterly: 'Quarterly',
		yearly: 'Yearly',
	},
	group: {
		searchAndNewNote: 'Search & new note',
		files: 'Displayed content',
		appearance: 'Appearance',
		developer: 'Developer',
		headingJump: 'Heading navigation',
		results: 'Results display',
		logoLayout: 'Logo layout',
		titleMargin: 'Title margin',
		particleColor: 'Color',
		particleEffects: 'Effects',
		particleCanvas: 'Canvas',
		particleInteraction: 'Interaction',
		vaultStatsItems: 'Items',
		contentOrder: 'Display order',
	},
	page: {
		contentLayout: { name: 'Display', desc: 'Property-based display names, collapsible sections, compact items, and display order.' },
		search: { name: 'Search', desc: 'Search behavior, result display, and heading navigation.' },
		bookmarkedFiles: { name: 'Bookmarks', desc: 'Bookmarks display, filter, and group filtering.' },
		recentFiles: { name: 'Recent files', desc: 'Display, tracking, and count of the recent files list.' },
		newNote: { name: 'New note', desc: 'New-note button, create dialog defaults, and command override.' },
		logo: { name: 'Logo', desc: 'Logo type, source, color, and size.' },
  titleStyle: { name: 'Title', desc: 'Title text, font, size, weight, and color.' },
		particleEffect: { name: 'Particle effect', desc: 'Interactive particle rendering for the logo and title.' },
		periodicNotes: { name: 'Periodic notes', desc: 'Show the current daily, weekly, monthly or yearly note under the search bar, using the Daily notes core plugin, the Periodic Notes plugin, or custom rules.' },
		vaultStats: { name: 'Vault stats', desc: 'Show vault statistics near the bottom of the home tab.' },
	},
	setting: {
		searchDropdownDisplay: {
			name: 'Dropdown display',
			desc: 'Overlay covers content below without changing the layout, including embedded search bars.',
			options: { overlay: 'Overlay', expand: 'Expand height' },
		},
		displayNameProperties: {
			name: 'Use property as name',
			desc: 'Comma-separated property names, tried in order (e.g. title, aliases). Lists use the first value.',
		},
		compactMode: {
			name: 'Compact mode',
			desc: 'Use small icons beside single-line file names. Items are centered, share each row when space allows, and wrap automatically.',
		},
		fileListLayout: {
			name: 'File list layout',
			desc: 'Arrange recent files and bookmarks in centered rows or aligned, equal-width grid columns.',
			options: { centered: 'Centered rows', grid: 'Aligned grid' },
		},
		searchBarStyle: {
			name: 'Style',
			desc: 'Modern is large and translucent. Transparent is medium-sized with no background, border, or blur. Minimal is a smaller, square-cornered Classic variant with no border.',
			options: { classic: 'Classic', modern: 'Modern', transparent: 'Transparent', minimal: 'Minimal' },
		},
		replaceNewTabs: {
			name: 'Replace new tabs with Harbor Tab',
		},
		newTabOnStart: {
			name: 'Open new Harbor Tab on Obsidian start',
			desc: "If a Harbor Tab is already open it'll focus it instead of opening a new one.",
		},
		closePreviousSessionTabs: {
			name: 'Close previous session tabs on start',
			desc: 'Enable this to close all the tabs and leave only one Harbor Tab on Obsidian opening.',
		},
		webUrlSuggestions: {
			name: 'Web link suggestions',
			desc: 'Detect web addresses typed in the search bar and offer to open them with the Web Viewer core plugin.',
		},
		useOmnisearch: {
			name: 'Use Omnisearch',
			desc: 'Set Omnisearch as the default search engine.',
		},
		markdownOnly: {
			name: 'Search only markdown files',
			desc: 'When enabled, search results only include markdown notes and no longer match attachments.',
		},
		additionalExtensions: {
			name: 'Additional extensions to search',
			desc: 'Comma-separated list of file extensions to search (without the dot). Example: form, base',
		},
		unresolvedLinks: {
			name: 'Show uncreated files',
			desc: 'Show links to files that have not been created yet in the search results.',
		},
		searchTitle: {
			name: 'Search file titles',
			desc: 'Enable this to search through file titles.',
		},
		searchHeadings: {
			name: 'Search headings',
			desc: 'Enable this to search through document headings (# Title).',
		},
		autoJumpToHeading: {
			name: 'Jump to heading',
			desc: 'When search results match headings, clicking will automatically jump to the corresponding heading.',
		},
		headingJumpStrategy: {
			name: 'Heading jump strategy',
			desc: 'Smart: Only jump when heading match is more relevant than file name. Always: Jump whenever a heading matches. Never: Never jump to headings.',
			options: {
				smart: 'Smart (Recommended)',
				always: 'Always jump',
				never: 'Never jump',
			},
		},
		showPath: {
			name: 'Show file path',
			desc: 'Displays file path at the right of the filename.',
		},
		showShortcuts: {
			name: 'Show shortcuts',
			desc: 'Displays shortcuts under the search results.',
		},
		maxResults: {
			name: 'Search results',
			desc: 'How many items the search results and the folder/command pickers display.',
		},
		searchDelay: {
			name: 'Search delay',
			desc: 'The value is in milliseconds.',
		},
		hideOnBlur: {
			name: 'Hide on blur',
			desc: 'Hide search results when the search input loses focus.',
		},
		showOmnisearchExcerpt: {
			name: 'Show excerpt (Omnisearch)',
			desc: 'Shows the contextual part of the note that matches the search.',
		},
		showBookmarkedFiles: {
			name: 'Show bookmarked files',
			desc: 'Shows bookmarked files under the search bar.',
		},
		showRecentFiles: {
			name: 'Show recent files',
			desc: 'Displays recent files under the search bar.',
		},
		sectionCollapsible: {
			name: 'Collapsible sections',
			desc: 'Shows a collapse button next to the Recent files and Bookmarks titles; click it to collapse or expand the section.',
		},
		showBookmarkedFilesFilter: {
			name: 'Bookmarks filter',
			desc: 'Shows a filter (magnifying glass) next to the Bookmarks title to narrow the list; Tab navigation skips it when off.',
		},
		bookmarkedGroups: {
			name: 'Bookmark groups filter',
			desc: 'Comma-separated bookmark group paths (nest groups with /, e.g. "Work/Sub"). Only bookmarks inside these groups are shown; leave empty to show all bookmarks.',
		},
		showRecentFilesFilter: {
			name: 'Recent files filter',
			desc: 'Shows a filter (magnifying glass) next to the Recent files title to narrow the list; Tab navigation skips it when off.',
		},
		storeRecentFile: {
			name: 'Store last recent files',
			desc: 'Remembers the recent files of the previous session.',
		},
		maxRecentFiles: {
			name: 'Recent files',
			desc: 'Set how many recent files display.',
		},
		showNewNoteButton: {
			name: 'Show new note button',
			desc: 'Adds a button next to the search bar to quickly create a new note.',
		},
		newNoteUseCommand: {
			name: 'Override with a command',
			desc: 'When enabled, clicking the button runs the configured command instead of opening the create dialog. Useful to integrate other plugins.',
		},
		newNoteCommandId: {
			name: 'Command',
			desc: 'Command to run when the button is clicked. Type to search all registered commands.',
			placeholder: 'Type to search commands ...',
			invalid: 'The command does not exist.',
		},
		newNoteDefaultFolder: {
			name: 'Default folder',
			desc: 'Folder pre-filled when creating a note. Leave empty to use the vault root.',
			placeholder: 'Leave empty for the vault root',
		},
		showPeriodicNotes: {
			name: 'Show periodic notes',
			desc: 'Displays the current daily/weekly/monthly/yearly notes under the search bar. Notes that do not exist yet are created when opened.',
		},
		periodicNotesDecoration: {
			name: 'Periodic notes decoration',
			desc: 'Place one decoration on each side of the entire periodic-notes group. Both stay vertically centered if the group wraps.',
			options: {
				none: 'None',
				braces: '{ }',
				angleBrackets: '< >',
				custom: 'Custom',
			},
		},
		periodicNotesDecorationLeft: {
			name: 'Left decoration',
			desc: 'Text shown to the left of the entire periodic-notes group.',
		},
		periodicNotesDecorationRight: {
			name: 'Right decoration',
			desc: 'Text shown to the right of the entire periodic-notes group.',
		},
		periodicNotesMode: {
			name: 'Source',
			desc: 'Read the folder and format from the Daily notes / Periodic Notes plugins, or define custom rules.',
			options: {
				auto: 'From plugins (auto)',
				custom: 'Custom rules',
			},
		},
		periodicNotesUnavailable: {
			name: 'No periodic notes detected',
			desc: 'Neither the Daily notes core plugin nor the Periodic Notes plugin is configured. Switch the source to "Custom rules" to define your own.',
		},
		periodicNotesShowDaily: {
			name: 'Show daily note',
		},
		periodicNotesShowWeekly: {
			name: 'Show weekly note',
		},
		periodicNotesShowMonthly: {
			name: 'Show monthly note',
		},
		periodicNotesShowQuarterly: {
			name: 'Show quarterly note',
		},
		periodicNotesShowYearly: {
			name: 'Show yearly note',
		},
		periodicNotesLabelMode: {
			name: 'Display name',
			desc: 'What is shown under the icon: the note file name (without its folder), a fixed period text, or a custom name with date placeholders.',
			options: {
				filename: 'File name',
				text: 'Period text',
				custom: 'Custom',
			},
		},
		periodicNotesLabelCustom: {
			name: 'Custom display name',
			desc: 'Supports date placeholders like {{YYYY}}, {{MM}}, {{DD}}, {{gggg}}, {{ww}}; they are replaced with the current date.',
			placeholder: 'e.g. {{MM}}/{{DD}}',
		},
		periodicNotesLabelPreview: 'Preview',
		periodicNotesCustomEntries: {
			name: 'Custom periodic notes',
			desc: 'Each rule resolves to <folder>/<format>.md and supports moment.js tokens like YYYY, MM, DD, gggg and ww. The label is shown on the home tab.',
			emptyName: 'No custom periodic notes',
			defaultName: 'Custom note',
			addLabel: 'Add periodic note',
			labelPlaceholder: 'Label (e.g. Journal)',
			folderPlaceholder: 'Folder (e.g. Daily)',
			formatPlaceholder: 'Format (e.g. YYYY-MM-DD)',
		},
		newNoteOnUnmatchedName: {
			name: 'Quick create for unmatched names',
			desc: 'When the search input matches no existing note, highlight the new-note button; pressing Enter then opens the create dialog with the typed name pre-filled.',
		},
		logo: {
			name: 'Logo',
			desc: 'Remove or set a custom logo. Accepts local files, image links, SVG code or Lucide icon IDs.',
			placeholder: 'Type anything ... ',
			invalidTooltip: 'The path/link/icon is not valid.',
			options: {
				default: 'Obsidian logo',
				oldLogo: 'Obsidian old logo',
				imagePath: 'Local image',
				imageLink: 'Link',
				svgCode: 'SVG code',
				lucideIcon: 'Lucide icon',
				none: 'Empty',
			},
		},
		logoSource: {
			name: 'Logo source',
		},
		logoSvgSource: {
			name: 'SVG code',
			placeholder: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">…</svg>',
			invalidTooltip: 'Enter a valid SVG document with an <svg> root.',
		},
		iconColor: {
			name: 'Logo icon color',
			desc: 'Set the icon color',
		},
		logoPosition: {
			name: 'Logo position',
			desc: 'Set where the logo is placed relative to the title.',
			options: {
				top: 'Top',
				bottom: 'Bottom',
				left: 'Left',
				right: 'Right',
			},
		},
		logoMargin: {
			name: 'Logo margin',
			desc: 'Set the spacing around the logo, in pixels.',
		},
		logoMarginIndividual: {
			name: 'Individual margins',
			desc: 'Set the margin for each side of the logo separately.',
		},
		logoMarginTop: {
			name: 'Top margin',
			desc: 'Spacing above the logo, in pixels.',
		},
		logoMarginRight: {
			name: 'Right margin',
			desc: 'Spacing to the right of the logo, in pixels.',
		},
		logoMarginBottom: {
			name: 'Bottom margin',
			desc: 'Spacing below the logo, in pixels.',
		},
		logoMarginLeft: {
			name: 'Left margin',
			desc: 'Spacing to the left of the logo, in pixels.',
		},
		logoScale: {
			name: 'Logo scale',
			desc: 'Adjust the logo size independently of the title font size.',
		},
		titleMargin: {
			name: 'Title margin',
			desc: 'Set the spacing around the title, in pixels.',
		},
		titleMarginIndividual: {
			name: 'Individual margins',
			desc: 'Set the margin for each side of the title separately.',
		},
		titleMarginTop: {
			name: 'Top margin',
			desc: 'Spacing above the title, in pixels.',
		},
		titleMarginRight: {
			name: 'Right margin',
			desc: 'Spacing to the right of the title, in pixels.',
		},
		titleMarginBottom: {
			name: 'Bottom margin',
			desc: 'Spacing below the title, in pixels.',
		},
		titleMarginLeft: {
			name: 'Left margin',
			desc: 'Spacing to the left of the title, in pixels.',
		},
		title: {
			name: 'Title',
		},
		titleFont: {
			name: 'Title font',
			desc: 'Interface font, text font, and monospace font options match the fonts set in the Appearance settings tab.',
			invalidTooltip: 'The font is not valid.',
			options: {
				interfaceFont: 'Interface font',
				textFont: 'Text font',
				monospaceFont: 'Monospace font',
				custom: 'Custom font',
			},
		},
		customFontName: {
			name: 'Font name',
			desc: 'Type to search installed desktop fonts, or enter a font name directly.',
		},
		fontSize: {
			name: 'Title font size',
			desc: 'Set the title size from 2em to 8em in 0.5em steps.',
		},
		fontWeight: {
			name: 'Title font weight',
		},
		titleColor: {
			name: 'Title color',
		},
		selectionHighlight: {
			name: 'Selection highlight',
			desc: 'Set the color of the selected item.',
		},
		particleEffect: {
			name: 'Enable particle effect',
			desc: 'Render the Harbor Tab logo and title as an interactive particle grid that ripples around the cursor',
		},
		particleEffectPreview: {
			name: 'Live preview',
			desc: 'Move the pointer over the preview (or tap it) to try the interaction with the current settings',
		},
		particleEffectColorMode: {
			name: 'Color',
			desc: 'Particle coloring: keep the original logo and title colors, use a single color, or blend two colors in a gradient',
			options: {
				original: 'Original',
				monochrome: 'Monochrome',
				gradient: 'Gradient',
			},
		},
		particleEffectPreserveShading: {
			name: 'Preserve source shading',
			desc: 'Keep image and SVG brightness variations in monochrome and gradient modes. Turn off to use the selected colors directly.',
		},
		particleEffectColor: {
			name: 'Base color',
			desc: 'Color used by all particles in monochrome mode, and the first gradient color; set separately for light and dark themes',
		},
		particleEffectColor2: {
			name: 'Gradient color',
			desc: 'Second color of the gradient; set separately for light and dark themes',
		},
		particleEffectGradientAnimation: {
			name: 'Color mode',
			desc: 'How the gradient changes over time',
			options: {
				static: 'Static gradient',
				cycle: 'Cycling gradient',
				breathe: 'Breathing light',
			},
		},
		particleEffectGradientAngle: {
			name: 'Gradient angle',
			desc: 'Direction of the gradient; 180° runs from top to bottom',
		},
		particleEffectGradientTransition: {
			name: 'Gradient transition range',
			desc: 'Softness of the color boundary: 0% gives a sharp edge; 100% uses the widest blend for the selected area.',
		},
		particleEffectGradientArea: {
			name: 'Gradient area percentage',
			desc: 'Share of the gradient color across the logo and title, from 10% to 90%.',
		},
		particleEffectGradientFrequency: {
			name: 'Animation frequency',
			desc: 'Speed of the cycling and breathing color animations (higher = faster)',
		},
		particleEffectGradientPause: {
			name: 'Pause interval',
			desc: 'Seconds to rest on the base color after each gradient sweep, or hold each breathing color. 0 keeps the animation continuous.',
		},
		particleEffectScale: {
			name: 'Canvas scale (desktop)',
			desc: 'How much the particle canvas content is enlarged relative to the original logo and title area; applies on desktop only',
		},
		particleEffectCanvasPaddingTop: {
			name: 'Canvas padding (top)',
			desc: 'Extra space above the particles, in pixels. Independent of canvas scale.',
		},
		particleEffectCanvasPaddingBottom: {
			name: 'Canvas padding (bottom)',
			desc: 'Extra space below the particles, in pixels. Independent of canvas scale.',
		},
		particleEffectScaleMobile: {
			name: 'Canvas scale (mobile)',
			desc: 'Canvas scale used on phones and tablets; set independently from the desktop value',
		},
		particleEffectSpacing: {
			name: 'Particle spacing',
			desc: 'Distance between lattice sample points (lower = denser)',
		},
		particleEffectDotSize: {
			name: 'Particle size',
			desc: 'Particle radius; adaptive sizing can reduce it near edges and at close spacing',
		},
		particleEffectAdaptiveSize: {
			name: 'Adaptive particle size',
			desc: 'Keep gaps between particles and shrink them near edges, down to 0.2. Turn off to use one size for all particles.',
		},
		particleEffectDisturbRadius: {
			name: 'Disturbance radius',
			desc: 'Radius of the cursor disturbance area',
		},
		particleEffectDisturbStrength: {
			name: 'Disturbance strength',
			desc: 'How strongly the cursor pushes particles away',
		},
		particleEffectParallax: {
			name: 'Pointer parallax',
			desc: 'Follow the pointer across the entire Obsidian window with a reverse shift and 3D tilt; smoothly return when the pointer leaves. Desktop only; respects reduced motion.',
		},
		particleEffectDisturbFalloff: {
			name: 'Disturbance falloff',
			desc: 'Lower values give a soft tail beyond the disturbance radius; higher values make the affected area more sharply circular.',
		},
		particleEffectRecoveryDamping: {
			name: 'Recovery damping',
			desc: 'Higher values reduce overshoot and bouncing; 100 gives a smooth return. Recovery speed controls how quickly particles return.',
		},
		particleEffectRecoverySpeed: {
			name: 'Recovery speed',
			desc: 'How fast particles settle back after the cursor disturbs them; lower values keep the ripple going longer',
		},
		particleEffectAmbientMotion: {
			name: 'Idle motion',
			desc: 'Gentle floating movement while the particles rest',
			options: {
				none: 'None',
				wave: 'Wave rhythm',
				float: 'Gentle float',
				undulate: 'Staggered float',
				pulse: 'Heartbeat',
				ripple: 'Ripple',
				breathe: 'Breathe',
			},
		},
		particleEffectMotionFrequency: {
			name: 'Idle motion frequency',
			desc: 'Speed of the idle motion (higher = faster); for Heartbeat this sets the interval between beats',
		},
		vaultStats: {
			name: 'Show vault stats',
			desc: 'Display vault statistics (files, notes, attachments, folders, tags) near the bottom of the home tab.',
		},
		vaultStatsFiles: {
			name: 'Total files',
		},
		vaultStatsNotes: {
			name: 'Notes',
		},
		vaultStatsAttachments: {
			name: 'Attachments',
		},
		vaultStatsFolders: {
			name: 'Folders',
		},
		vaultStatsTags: {
			name: 'Tags',
		},
		debugMode: {
			name: 'Debug mode',
			desc: 'Enable debug logging for search results and match analysis. Check the developer console for detailed information.',
		},
	},
	common: {
		themeDefault: 'Theme default',
		themeLight: 'Light',
		themeDark: 'Dark',
		accentColor: 'Accent color',
		custom: 'Custom',
		resetToDefault: 'Reset to default',
		delete: 'Delete',
		clickToFilter: 'Click to filter',
	},
	ui: {
		folderRevealFailed: 'Could not reveal the folder in the file explorer.',
		tagPaneFailed: 'Could not open the tags pane.',
	},
}

export default en

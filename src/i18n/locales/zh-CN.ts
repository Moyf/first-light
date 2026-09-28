import type { BaseMessage } from '../types'

const zhCN: BaseMessage = {
	command: {
		openNewTab: '打开新标签页',
		replaceCurrentTab: '替换当前标签页',
	},
	viewName: 'Harbor Tab',
	newNoteModal: {
		title: '新建笔记',
		fileName: '文件名',
		fileNamePlaceholder: '输入文件名 ...',
		folder: '创建文件夹',
		folderDesc: '笔记将创建在此路径，不存在的文件夹会自动创建。',
		folderPlaceholder: '留空则在仓库根目录创建',
		create: '创建',
		cancel: '取消',
		invalidFileName: '文件名为空或包含非法字符（\\ / : * ? " < > | # ^ [ ]）。',
		folderIsFile: '该路径已存在同名文件，无法创建文件夹。',
		fileExists: '同名文件已存在。',
		createFailed: '创建笔记失败，详情请查看开发者控制台。',
		commandNotFound: '配置的命令不可用，已回退到新建笔记弹窗。',
		},
	periodicNoteText: {
		daily: '今天',
		weekly: '本周',
		monthly: '本月',
		quarterly: '本季',
		yearly: '今年',
	},
	periodicNotesMenu: {
		createNote: '创建笔记',
		openInNewTab: '在新标签页打开',
		openInNewWindow: '在新窗口打开',
	},
	group: {
		search: '搜索框',
		files: '显示内容',
		appearance: '外观',
		developer: '开发者',
		headingJump: '标题跳转',
		results: '结果显示',
		logoLayout: 'Logo 布局',
		particleStyle: '样式',
		particleCanvas: '画布',
		particleInteraction: '交互',
		vaultStatsItems: '统计项',
	},
	page: {
		search: { name: '搜索', desc: '搜索行为、结果显示与标题跳转' },
		bookmarkedFiles: { name: '书签', desc: '书签的显示、筛选与分组过滤' },
		recentFiles: { name: '最近文件', desc: '最近文件列表的显示、记录与数量' },
		newNote: { name: '新建笔记', desc: '新建笔记按钮、创建弹窗默认值与命令覆盖' },
		logo: { name: 'Logo', desc: 'Logo 图标、来源、颜色与尺寸' },
  titleStyle: { name: '标题', desc: '标题文本、字体、字号、字重与颜色' },
		particleEffect: { name: '粒子特效', desc: 'Logo 与标题的交互式粒子渲染' },
		periodicNotes: { name: '周期笔记', desc: '在搜索栏下方显示当前的日记、周记、月记或年记，支持 Daily Notes 核心插件、Periodic Notes 插件或自定义规则' },
		vaultStats: { name: '库数据', desc: '在主页下方显示库的统计信息' },
	},
	setting: {
		replaceNewTabs: {
			name: '将新标签页替换为 Harbor Tab',
		},
		newTabOnStart: {
			name: 'Obsidian 启动时打开 Harbor Tab',
			desc: '如果已有打开的 Harbor Tab，将聚焦它而不是打开新的。',
		},
		closePreviousSessionTabs: {
			name: '启动时关闭上次会话的标签页',
			desc: '启用后，Obsidian 启动时会关闭所有标签页，只保留一个 Harbor Tab。',
		},
		webUrlSuggestions: {
			name: '网址链接建议',
			desc: '检测在搜索栏中输入的网址，并建议使用网页查看核心插件打开。',
		},
		useOmnisearch: {
			name: '使用 Omnisearch',
			desc: '将 Omnisearch 设为默认搜索引擎。',
		},
		markdownOnly: {
			name: '仅搜索 Markdown 文件',
			desc: '开启后搜索结果仅包含 Markdown 笔记，不再匹配附件。',
		},
		additionalExtensions: {
			name: '额外搜索的扩展名',
			desc: '要额外搜索的文件扩展名，英文逗号分隔（不含点号）。示例：form, base',
		},
		unresolvedLinks: {
			name: '显示未创建的文件',
			desc: '在搜索结果中显示指向尚未创建的文件的链接。',
		},
		searchTitle: {
			name: '搜索文件标题',
			desc: '启用后将搜索文件标题。',
		},
		searchHeadings: {
			name: '搜索文内标题',
			desc: '启用后将搜索文档中的标题（# 标题）。',
		},
		autoJumpToHeading: {
			name: '跳转到文内标题',
			desc: '当搜索结果匹配文内标题时，点击将自动跳转到对应位置。',
		},
		headingJumpStrategy: {
			name: '标题跳转策略',
			desc: '智能：仅当标题匹配比文件名更相关时跳转；总是：只要匹配标题就跳转；从不：从不跳转到标题。',
			options: {
				smart: '智能（推荐）',
				always: '总是跳转',
				never: '从不跳转',
			},
		},
		showPath: {
			name: '显示文件路径',
			desc: '在文件名右侧显示文件路径。',
		},
		showShortcuts: {
			name: '显示快捷方式',
			desc: '在搜索结果下方显示快捷方式。',
		},
		maxResults: {
			name: '搜索结果数量',
			desc: '设置搜索结果以及文件夹/命令选择框显示的条数。',
		},
		searchDelay: {
			name: '搜索延迟',
			desc: '数值单位为毫秒。',
		},
		hideOnBlur: {
			name: '失焦时隐藏',
			desc: '当搜索框失去焦点时隐藏搜索结果。',
		},
		showOmnisearchExcerpt: {
			name: '显示摘要（Omnisearch）',
			desc: '显示笔记中与搜索匹配的上下文片段。',
		},
		showBookmarkedFiles: {
			name: '显示书签文件',
			desc: '在搜索栏下方显示已加书签的文件。',
		},
		showRecentFiles: {
			name: '显示最近文件',
			desc: '在搜索栏下方显示最近打开的文件。',
		},
		sectionCollapsible: {
			name: '分区可折叠',
			desc: '在最近文件和书签标题左侧显示折叠按钮，点击可折叠或展开对应分区。',
		},
		showBookmarkedFilesFilter: {
			name: '书签筛选器',
			desc: '在书签标题旁显示筛选按钮（放大镜），可快速过滤列表；关闭后 Tab 导航会跳过它。',
		},
		bookmarkedGroups: {
			name: '按分组过滤书签',
			desc: '填写书签分组路径（英文逗号分隔，嵌套分组用 / 连接，如 Work/Sub），仅显示这些分组内的书签；留空显示全部书签。',
		},
		showRecentFilesFilter: {
			name: '最近文件筛选器',
			desc: '在最近文件标题旁显示筛选按钮（放大镜），可快速过滤列表；关闭后 Tab 导航会跳过它。',
		},
		storeRecentFile: {
			name: '记住上次的最近文件',
			desc: '记住上一次会话的最近文件列表。',
		},
		maxRecentFiles: {
			name: '最近文件数量',
			desc: '设置显示的最近文件数量。',
		},
		showNewNoteButton: {
			name: '显示新建笔记按钮',
			desc: '在搜索栏旁显示「新建笔记」按钮，快速创建笔记。',
		},
		newNoteUseCommand: {
			name: '使用指定命令覆盖',
			desc: '开启后，点击按钮将执行下方配置的命令，而不是打开新建笔记弹窗，可用于联动其他插件。',
		},
		newNoteCommandId: {
			name: '命令',
			desc: '点击按钮时执行的命令，输入即可搜索所有已注册命令。',
			placeholder: '输入以搜索命令 ...',
			invalid: '命令不存在。',
		},
		newNoteDefaultFolder: {
			name: '默认文件夹',
			desc: '新建笔记时默认填写的文件夹，留空则使用仓库根目录。',
			placeholder: '留空则在仓库根目录创建',
		},
		showPeriodicNotes: {
			name: '显示周期笔记',
			desc: '在搜索栏下方显示当前的日记/周记/月记/年记，尚未创建的笔记会在打开时自动创建。',
		},
		periodicNotesMode: {
			name: '来源',
			desc: '从 Daily Notes / Periodic Notes 插件读取路径规则，或自定义规则。',
			options: {
				auto: '自动（跟随插件）',
				custom: '自定义规则',
			},
		},
		periodicNotesUnavailable: {
			name: '未检测到周期笔记',
			desc: '未启用 Daily Notes 核心插件或 Periodic Notes 插件，可将来源切换为“自定义规则”。',
		},
		periodicNotesShowDaily: {
			name: '显示日记',
		},
		periodicNotesShowWeekly: {
			name: '显示周记',
		},
		periodicNotesShowMonthly: {
			name: '显示月记',
		},
		periodicNotesShowQuarterly: {
			name: '显示季记',
		},
		periodicNotesShowYearly: {
			name: '显示年记',
		},
		periodicNotesLabelMode: {
			name: '显示名称',
			desc: '图标下方显示的内容：笔记文件名（不含路径）、周期文字，或带日期占位符的自定义名称。',
			options: {
				filename: '文件名',
				text: '周期文字',
				custom: '自定义',
			},
		},
		periodicNotesLabelCustom: {
			name: '自定义显示名称',
			desc: '支持日期占位符，如 {{YYYY}}、{{MM}}、{{DD}}、{{gggg}}、{{ww}}，会替换为当前日期。',
			placeholder: '例如：{{MM}}月{{DD}}日',
		},
		periodicNotesLabelPreview: '预览',
		periodicNotesCustomEntries: {
			name: '自定义周期笔记',
			desc: '每条规则解析为 <文件夹>/<格式>.md，支持 moment.js 占位符（如 YYYY、MM、DD、gggg、ww）。名称将显示在主页上。',
			emptyName: '暂无自定义周期笔记',
			defaultName: '自定义笔记',
			addLabel: '添加周期笔记',
			labelPlaceholder: '名称（如：日记）',
			folderPlaceholder: '文件夹（如：Daily）',
			formatPlaceholder: '格式（如：YYYY-MM-DD）',
		},
		newNoteOnUnmatchedName: {
			name: '输入不存在的笔记名时快速新建',
			desc: '搜索内容没有匹配到任何笔记时，高亮新建笔记按钮；此时按回车直接打开新建弹窗，自动填入输入的名称并聚焦文件夹输入框。',
		},
		logo: {
			name: 'Logo',
			desc: '移除或设置自定义 Logo。支持本地文件、图片链接或 Lucide 图标 ID。',
			placeholder: '输入任意内容 ... ',
			invalidTooltip: '路径/链接/图标无效。',
			options: {
				default: 'Obsidian 默认 Logo',
				oldLogo: 'Obsidian 旧版 Logo',
				imagePath: '本地图片',
				imageLink: '链接',
				lucideIcon: 'Lucide 图标',
				none: '空白',
			},
		},
		logoSource: {
			name: 'Logo 来源',
		},
		iconColor: {
			name: 'Logo 图标颜色',
			desc: '设置图标颜色',
		},
		logoPosition: {
			name: 'Logo 位置',
			desc: '设置 Logo 相对于标题的摆放位置。',
			options: {
				top: '上方',
				bottom: '下方',
				left: '左侧',
				right: '右侧',
			},
		},
		logoMargin: {
			name: 'Logo 边距',
			desc: '设置 Logo 四周留出的间距（像素）。',
		},
		logoMarginIndividual: {
			name: '单独调整各方向边距',
			desc: '分别为 Logo 的四个方向设置边距。',
		},
		logoMarginTop: {
			name: '上边距',
			desc: 'Logo 上方留出的间距（像素）。',
		},
		logoMarginRight: {
			name: '右边距',
			desc: 'Logo 右侧留出的间距（像素）。',
		},
		logoMarginBottom: {
			name: '下边距',
			desc: 'Logo 下方留出的间距（像素）。',
		},
		logoMarginLeft: {
			name: '左边距',
			desc: 'Logo 左侧留出的间距（像素）。',
		},
		logoScale: {
			name: 'Logo 缩放',
			desc: '设置 Logo 相对于标题字号的尺寸。',
		},
		title: {
			name: '标题',
		},
		titleFont: {
			name: '标题字体',
			desc: '界面字体、文本字体和等宽字体选项与外观设置中的字体一致。',
			invalidTooltip: '字体无效。',
			options: {
				interfaceFont: '界面字体',
				textFont: '文本字体',
				monospaceFont: '等宽字体',
				custom: '自定义字体',
			},
		},
		customFontName: {
			name: '字体名称',
		},
		fontSize: {
			name: '标题字号',
			desc: '接受任意 CSS font-size 值。',
			invalid: 'CSS 单位无效。',
		},
		fontWeight: {
			name: '标题字重',
		},
		titleColor: {
			name: '标题颜色',
		},
		selectionHighlight: {
			name: '选中项高亮',
			desc: '设置选中项的颜色。',
		},
		particleEffect: {
			name: '启用粒子特效',
			desc: '将主页的 Logo 与标题渲染为可交互的粒子点阵，鼠标经过时产生涟漪效果',
		},
		particleEffectPreview: {
			name: '实时预览',
			desc: '在预览中移动鼠标或点击，即可用当前设置体验粒子交互',
		},
		particleEffectColorMode: {
			name: '颜色',
			desc: '粒子配色：保留 Logo 与标题的原色、使用单一颜色，或在两种颜色间渐变',
			options: {
				original: '原色',
				monochrome: '单色',
				gradient: '渐变色',
			},
		},
		particleEffectColor: {
			name: '粒子颜色',
			desc: '单色模式下粒子的统一颜色，也是渐变色的第一个颜色；浅色与深色主题可分别设置',
		},
		particleEffectColor2: {
			name: '渐变颜色',
			desc: '渐变色的第二个颜色；浅色与深色主题可分别设置',
		},
		particleEffectGradientAnimation: {
			name: '颜色模式',
			desc: '渐变颜色随时间变化的方式',
			options: {
				static: '静态渐变',
				cycle: '循环渐变',
				breathe: '呼吸灯',
			},
		},
		particleEffectGradientAngle: {
			name: '渐变角度',
			desc: '渐变的方向，180° 为从上到下',
		},
		particleEffectGradientFrequency: {
			name: '变化频率',
			desc: '循环渐变与呼吸灯模式的变化速度（数值越大越快）',
		},
		particleEffectScale: {
			name: '画布倍率（桌面端）',
			desc: '粒子画布内容相对原 Logo 与标题区域的放大倍数，仅桌面端生效',
		},
		particleEffectScaleMobile: {
			name: '画布倍率（移动端）',
			desc: '手机与平板上使用的画布倍率，与桌面端分别设置',
		},
		particleEffectSpacing: {
			name: '粒子间距',
			desc: '采样点阵的间距，越小越密集',
		},
		particleEffectDotSize: {
			name: '粒子大小',
			desc: '单个粒子的半径',
		},
		particleEffectDisturbRadius: {
			name: '扰动范围',
			desc: '鼠标扰动作用的半径',
		},
		particleEffectDisturbStrength: {
			name: '扰动力度',
			desc: '鼠标推开粒子的强度',
		},
		particleEffectRecoverySpeed: {
			name: '恢复速度',
			desc: '粒子被光标扰动后回归原位的快慢，数值越低涟漪越悠长',
		},
		particleEffectAmbientMotion: {
			name: '默认运动',
			desc: '粒子静止时的漂浮效果',
			options: {
				none: '无',
				wave: '波浪节奏',
				float: '整体浮动',
				undulate: '错落浮动',
				pulse: '心跳',
				ripple: '涟漪',
				breathe: '呼吸',
			},
		},
		particleEffectMotionFrequency: {
			name: '运动频率',
			desc: '空闲运动的变化速度（数值越大越快）；心跳模式对应两次心跳的间隔',
		},
		particleEffectGlow: {
			name: '辉光强度',
			desc: '为粒子添加辉光（泛光）效果；0 为关闭，数值越大越亮',
		},
		vaultStats: {
			name: '显示库数据',
			desc: '在主页偏下方的位置显示库统计信息（总文件数、笔记数、附件数、文件夹数、标签数）。',
		},
		vaultStatsFiles: {
			name: '总文件数',
		},
		vaultStatsNotes: {
			name: '笔记数',
		},
		vaultStatsAttachments: {
			name: '附件数',
		},
		vaultStatsFolders: {
			name: '文件夹数',
		},
		vaultStatsTags: {
			name: '标签数',
		},
		debugMode: {
			name: '调试模式',
			desc: '启用搜索结果与匹配分析的调试日志。详情请查看开发者控制台。',
		},
	},
	common: {
		themeDefault: '跟随主题',
		themeLight: '浅色',
		themeDark: '深色',
		accentColor: '强调色',
		custom: '自定义',
		resetToDefault: '重置为默认值',
		delete: '删除',
		clickToFilter: '点击筛选',
	},
	ui: {
		folderRevealFailed: '无法在文件浏览器中定位该文件夹。',
		tagPaneFailed: '无法打开标签面板。',
	},
}

export default zhCN

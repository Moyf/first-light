# Changelog

## [Unreleased]

## [1.12.0](https://github.com/Moyf/harbor-tab/compare/1.11.0...1.12.0) - 2026-10-06

### ✨ Added

- **Pointer parallax**: Add an optional window-wide reverse pointer shift with tilt up to 6° horizontally / 8° vertically, 0.8-second ease-out recentering, and corrected cursor interaction. Disabled by default; desktop only and respects reduced motion. Large canvases can incur additional GPU compositing cost.

<details>
<summary>中文说明（点击展开）</summary>

- **鼠标视差**：新增整个窗口范围的反向鼠标平移与透视倾斜（左右最大 6°、上下最大 8°），离开后以 0.8 秒 ease-out 平滑归位并校正粒子扰动坐标。默认关闭，仅桌面生效并尊重减少动态效果偏好；较大画布可能增加 GPU 合成开销。

</details>

## [1.11.0](https://github.com/Moyf/harbor-tab/compare/1.10.0...1.11.0) - 2026-10-05

### 🐛 Fixed

- **Cycling pause**: Sweep the entire gradient band past the particles before pausing on the base color, so a highlight cannot freeze halfway across the wordmark. Continuous cycling and breathing color holds keep their existing behavior.
- **Independent logo size**: Logo scale now controls all logo types independently of Title font size, retaining the tuned default proportions.

### ⚡ Changed

- **Particle performance**: Remove Glow and batch shaded gradient particles into at most 17 fills per frame. Render at native display density while keeping source sampling precise, and pause canvases outside the viewport. Update canvas and interaction defaults to the tuned values.

- **Particle interaction**: Remove pointer parallax and particle repulsion; retain falloff with a 0.1–2.0 range and 0.1 step. Add recovery damping (0–100) to reduce bounce independently of recovery speed, and limit disturbance radius to 5–100 px.
- **Source shading**: Add Preserve source shading, enabled by default for monochrome and gradient modes; turn it off for direct color replacement. Keep brightness variations in opaque images without retaining their original hues.
- **Built-in logo source**: Use separated-facet SVGs for monochrome/gradient particles only when source shading is disabled; otherwise retain the original modern/old Obsidian logo artwork.
- **Vault stats**: Enable the display by default for new installations while preserving saved choices.

<details>
<summary>中文说明（点击展开）</summary>

### 🐛 修复

- **循环停歇**：渐变色带完整扫过粒子后再停留在纯基础颜色，避免闪光卡在文字中间；连续循环及呼吸灯的颜色停留保持原有行为。
- **独立 Logo 大小**：所有 Logo 类型均只由 Logo 缩放控制，不再随标题字号联动，默认比例保持原样。

### ⚡ 变更

- **粒子性能**：移除 Glow，按明暗批量绘制渐变粒子，每帧最多 17 次填充；保留高精度采样，按屏幕实际像素密度绘制，暂停视口外画布。画布和交互默认值同步调整为最新配置。

- **粒子交互**：移除鼠标视差和粒子间斥力，保留扰动衰减并改为 0.1–2.0、步长 0.1。新增阻尼系数（0–100）单独抑制回弹，扰动半径调整为 5–100 px。
- **原始明暗**：新增默认开启的「保留原始明暗」，适用于单色和渐变，关闭后直接替换颜色；不透明图片也可保留明暗层次，颜色仍使用设置中的颜色。
- **内置 Logo 来源**：新旧 Obsidian Logo 仅在粒子单色/渐变且关闭明暗保留时使用切面分离 SVG，其余情况使用原版 Logo。
- **库统计**：新安装默认显示，保留已有用户的设置。

</details>

## [1.10.0](https://github.com/Moyf/harbor-tab/compare/1.9.0...1.10.0) - 2026-10-05

### ⚡ Changed

- **Default appearance**: Match the tuned particle colors, animation, sizing, logo/title spacing, and compact centered rows on fresh installations; keep periodic notes and vault stats disabled and custom image sources empty.
- **SVG logo input**: Add an SVG code logo option with a multiline input, document validation, and image rendering compatible with particle effects.
- **Particle logo facets**: Use separated-facet SVGs for the modern and old Obsidian logos in non-original particle color modes, preserving their facets instead of sampling solid masses.
- **Particle settings**: Split Style into Color and Effects, and rename Particle color to Base color.
- **Gradient controls**: Add a color area slider (10–90%, default 15%) and transition range slider (0–100%, default 30%) for static and cycling colors.
- **Glow and particle sizing**: Keep crisp cores with translucent outer halos, normalize glow for particle density, and preserve gaps around glyph edges. Spacing is 1–3 (step 0.1) and size is 0.2–1 (step 0.05), including safe rendering of older values.
- **Adaptive size and gradient anchors**: Add optional Adaptive particle size with a 0.2 minimum radius; uniform radii remain the default. Anchor gradients to actual particles and keep page spacing outside the zoomed canvas. Move Selection highlight below Particle effect.
- **Canvas padding**: Add independent top/bottom sliders (0–150px per side, step 5, defaults 40px/40px), preserve existing shared values, grow the preview to fit, and clear the full bitmap to prevent fractional-pixel color fringes.
- **Color animation pauses**: Add Pause interval below frequency for Cycling gradient and Breathing light (0–10 seconds, default 0): pause after each loop or hold each breathing color, independently of frequency.

- **Aligned grid**: Recent files and bookmarks support at most four equal-width columns, including Compact mode within the 900px list width; narrow panes use fewer columns. Centered rows remain the default.

- **Search dropdowns**: Default to Overlay in standalone and embedded views, escaping block boundaries; Expand height remains available for inline results.
- **Search stability**: Keep unmatched queries in a stable empty state, update results atomically, and discard searches superseded by newer input or dismissal.
- **Particle resize recovery**: Preserve animations during resize bursts and resample the latest settled size instead of destroying the effect.

- **Compact and narrow layouts**: Share centered, wrapping rows across recent files and bookmarks, including narrow panes.
- **Display names**: Rename Layout to Display and add ordered properties, defaulting to `title`, with list-first-value and file-name fallbacks.
- **Search styles**: Reduce Transparent size and remove blur, add the smaller square-cornered borderless Minimal style, and refine Modern with smaller dimensions and a thick translucent outer ring.

<details>
<summary>中文说明（点击展开）</summary>

### ⚡ 变更

- **默认外观**：新安装采用调整后的粒子颜色、动画、大小、Logo/标题间距和紧凑居中排列；周期笔记和库统计仍默认关闭，自定义图片来源为空。
- **SVG Logo 输入**：新增「SVG 代码」选项，支持多行粘贴、文档校验，并以图像方式渲染，兼容粒子效果。
- **粒子 Logo 切面**：内置的新旧 Obsidian Logo 在非原始颜色的粒子模式下均改用切面分离 SVG，保留切面轮廓，避免实心颗粒糊成一团。
- **粒子设置**：将「样式」拆为「颜色」和「效果」，「粒子颜色」改为「基础颜色」。
- **渐变控制**：静态和循环渐变新增颜色占比滑块（10%–90%，默认 15%）及过渡范围滑块（0%–100%，默认 30%）。
- **辉光与颗粒大小**：保留清晰核心与半透明外部光晕，按粒子密度补偿亮度，字形边缘保留间隙。间距为 1–3、步长 0.1，大小为 0.2–1、步长 0.05，旧参数同样安全渲染。
- **自适应大小与渐变定位**：新增可选的「自适应粒子大小」，半径最小 0.2，默认仍使用统一半径。渐变按实际粒子定位，页面留白移至缩放画布外。「选中高亮」移至「粒子效果」下方。
- **画布留白**：新增独立上下滑块（每侧 0–150px、步长 5，默认上下各 40px），保留旧值，预览随画布增高；清理完整位图，避免非整数像素的颜色残留。
- **颜色停歇**：循环渐变和呼吸灯在频率下方新增「停歇间隔」（0–10 秒、默认 0），每轮循环后停歇或在每个颜色停留，时长不受频率影响。

- **网格对齐**：最近文件和书签最多四列，Compact 模式在 900px 列表内也能显示四列，窄屏自动减少列数，默认保留居中排列。

- **搜索下拉列表**：默认「叠加覆盖」，独立标签页和嵌入块均生效，可超出 block 边界，仍可选择「拓展高度」。
- **搜索稳定性**：无匹配查询显示稳定空状态，结果直接更新，过期或已关闭的搜索不再弹回。
- **粒子尺寸恢复**：频繁尺寸变化时保留动画，布局稳定后更新采样，不再销毁特效。

- **紧凑与窄屏排列**：最近文件和书签统一采用居中、横向换行排列，窄屏也保持一致。
- **显示名**：「布局」改为「显示」，新增属性显示名，默认 `title`，支持依次回退、列表取首值和文件名兜底。
- **搜索样式**：缩小 Transparent 并移除模糊，新增更小、直角、无边框的 Minimal；Modern 缩小尺寸，并采用较厚的半透明外圈。

</details>

## [1.9.0] - 2026-10-05

### Features

- **Content layout sub-page**: find collapsible sections and the new Compact mode under Displayed content → Layout. Drag Obsidian's native handles to reorder periodic notes, recent files, and bookmarks; this is also their new default order. Tab and Shift+Tab follow the selected order.
- **Compact mode**: always show file lists as compact rows with a small icon on the left and the file name on the right, regardless of screen width.
- **Search styles**: Modern is the new default, with a larger rounded input, translucent background, and subtle translucent border. Classic retains the previous appearance; Transparent removes the input background and border. The new-note button stays in its existing position.

### Improvements

- Group daily, weekly, monthly, quarterly, and yearly note settings into their own native setting groups.

<details>
<summary>中文说明（点击展开）</summary>

### 新增

- **布局子页面**：在「显示内容 → 布局」中集中设置区块折叠和 Compact 模式，使用 Obsidian 原生拖拽手柄调整周期笔记、最近文件、书签的显示顺序；这也是新的默认顺序。Tab / Shift+Tab 会跟随所选顺序。
- **Compact 模式**：无论屏幕宽度如何，文件列表始终以「左侧小图标、右侧文件名」的紧凑行显示。
- **搜索样式**：新增并默认使用 Modern，提供更大的圆角输入框、半透明背景和浅色半透明边框。Classic 保留原有外观，Transparent 移除输入框的背景和边框；新建按钮保留原位置。

### 改进

- 日记、周记、月记、季记、年记设置分别放入各自的原生设置组。

</details>

## [1.8.0] - 2026-09-30

### Features

- **Folder-scoped search**: search within a folder with `folder:path/to/folder query`, or select a folder from the `folder` filter to apply a temporary scope. Quoted paths support spaces, and new notes can be created in the scoped folder.
- **Filter aliases**: use `f` for folders, `n` for Markdown notes, `m` for media, `w` for web search, `o` for Omnisearch, `b` for Bases, and `c` for Canvas.
- **Periodic-note decorations**: optionally place braces, angle brackets, or custom text on the two sides of the entire periodic-note group.

### Improvements

- **Title font size**: use a slider from 2em to 8em in 0.5em steps.
- **Periodic-note previews**: custom display-name previews update live while keeping the original hint visible.
- **Custom title fonts**: desktop font inputs offer installed-font suggestions and still accept manually entered names.
- Refine title spacing and periodic-note layout.

<details>
<summary>中文说明（点击展开）</summary>

### 新增

- **文件夹范围搜索**：使用 `folder:path/to/folder query` 将搜索限定在指定文件夹，也可以从 `folder` 过滤器中选择文件夹来临时限定搜索范围。路径含空格时可加引号；在范围内可以直接创建新笔记。
- **过滤器别名**：`f` 表示文件夹，`n` 表示 Markdown 笔记，`m` 表示媒体，`w` 表示网页搜索，`o` 表示 Omnisearch，`b` 表示 Bases，`c` 表示 Canvas。
- **周期笔记装饰**：可选择花括号、尖括号或自定义文本，显示在整个周期笔记区域的两侧。

### 改进

- **标题字号**：使用滑块设置 2em 到 8em 的字号，步进为 0.5em。
- **周期笔记预览**：自定义显示文本会实时预览，同时保留原有提示内容。
- **自定义标题字体**：桌面端字体输入框提供已安装字体建议，也支持手动输入字体名。
- 调整标题间距和周期笔记布局。

</details>

## [1.7.1] - 2026-09-27

### Improvements

- **New-note settings page**: the "New note" sub-page now sits at the settings root as a sibling of "Search" instead of being nested inside it.
- **New-note button pre-fill**: clicking the button with text in the search bar pre-fills the note name (and focuses the folder field), same as the Enter shortcut.

### Bug Fixes

- Fix the logo not showing on mobile: the logo SVGs were sized through `calc()` in their `width`/`height` attributes, which WebKit ignores — the auto-sized SVG could collapse to zero. Sizes now use inline CSS, which every engine supports.
- Fix the particle glow having no effect on mobile: the bloom used the canvas `filter: blur()`, which WebKit does not support. The glow is now a downsample/upsample bloom that works on every engine.

<details>
<summary>中文说明（点击展开）</summary>

### 改进

- **新建笔记设置页**：「新建笔记」子页面从「搜索」中移出，与「搜索」平级显示在设置根层。
- **新建按钮预填**：搜索框有文字时点击「新建笔记」按钮，文字会预填到弹窗的笔记名称中（并聚焦文件夹输入框），与回车快捷方式行为一致。

### 修复

- 修复移动端 logo 不显示：logo SVG 的尺寸写在 `width`/`height` 属性的 `calc()` 里，WebKit 不解析，自动尺寸可能塌缩为 0；现改为所有引擎都支持的内联 CSS 尺寸。
- 修复移动端粒子辉光无效：泛光使用的 canvas `filter: blur()` 在 WebKit 上不受支持；现改为降采样/放大泛光，所有引擎均可用。

</details>

## [1.7.0] - 2026-09-26

### Features

- **New-note button**: the search bar gains a "new note" button. It can execute a command instead (with a command picker), pre-fill a default folder (with a folder picker), and quick-create on unmatched search names — the button lights up and Enter opens the create dialog with the typed name.
- **Periodic notes**: daily/weekly/monthly/quarterly/yearly notes under the search bar. Configuration is read from the Periodic Notes / Daily notes plugins or defined as custom rules; missing notes show a "+" badge and are created on open, honoring folder and template placeholders. Display names support the file name, fixed period text, or custom text with live date placeholders (e.g. `{{MM}}月{{DD}}日`).
- **Vault stats**: an optional files/notes/attachments/folders/tags summary near the bottom of the home tab, with drag-and-drop ordering in the settings and clickable stats that focus the matching search filter (or open the tag pane).
- **Bookmarks sub-page**: bookmarks move their settings into a sub-page, gain a filter input and group filtering, and the sections' Tab focus chain now spans search → periodic notes → bookmarks → recent files.
- **Collapsible sections**: the bookmarks and recent-files sections can be collapsed, individually remembered; collapsed sections are skipped by the Tab focus chain.
- **Platform-aware particles**: the canvas scale setting is now per platform (desktop/mobile), and touch devices get a tap-burst particle interaction instead of the cursor ripple.

### Bug Fixes

- Fix the image filter missing `webp`/`avif` files, and unify the suggestion dropdown limit on the existing "search results" setting.
- Fix suggestion dropdowns flickering during fast IME (Chinese input) composition and stacking when switching filters.
- Fix periodic notes opened from the list Enter key and the context menu not being shown (they were only created/resolved); the menu titles are now localized.

<details>
<summary>中文说明（点击展开）</summary>

### 新增

- **新建笔记按钮**：搜索栏新增「新建笔记」按钮，可配置为执行指定命令（带命令选择器）、默认创建文件夹（带文件夹选择器）；搜索无匹配时按钮高亮，回车直接用输入的名称打开新建弹窗。
- **周期笔记**：搜索栏下方显示日/周/月/季/年记，配置自动读取 Periodic Notes / Daily notes 插件，也支持自定义规则；未创建的笔记带「+」角标，点击时按文件夹与模板占位符自动创建。显示名称支持文件名、周期文字或带日期占位符的自定义文本（如 `{{MM}}月{{DD}}日`，设置页实时预览）。
- **库数据统计**：主页下方可选显示 文件/笔记/附件/文件夹/标签 统计，设置页支持拖拽排序，点击统计项可聚焦对应的搜索过滤器（标签则打开标签面板）。
- **书签子页面**：书签区设置移入子页面，新增筛选输入框与分组过滤；各区块的 Tab 焦点链贯穿 搜索框 → 周期笔记 → 书签 → 最近文件。
- **区块折叠**：书签与最近文件区块支持折叠并分别记忆；折叠的区块会被焦点链跳过。
- **平台化粒子画布**：画布缩放设置按平台（桌面/移动）分别记忆；触屏设备改为点击触发粒子迸发，替代光标涟漪。

### 修复

- 修复图片过滤器漏掉 `webp`/`avif` 文件的问题；建议下拉数量统一跟随现有「搜索结果数量」设置。
- 修复快速输入法（拼音）组合期间建议下拉反复闪烁、切换过滤器时下拉叠加的问题。
- 修复周期笔记通过回车或右键菜单打开时不显示（此前只创建不打开）；菜单标题已支持本地化。

</details>

## [1.6.0] - 2026-09-24

![Harbor Tab particle effect](docs/harbor-tab-particles.webm)

### Features

- **Recovery speed**: a new slider in the particle interaction settings controls how fast a disturbed particle settles back home — i.e. how long the ripple keeps waving after the cursor passes. Lower values keep the wave lingering; higher values snap back almost instantly.
- **Gradient particle colors**: the old Monochrome toggle becomes a color mode with Monochrome and Gradient options. Gradient mode blends two colors and supports three display effects.
- **Particle glow**: particles can now glow, with an adjustable strength (0 disables it).
- **Idle motion frequency**: the frequency of the idle particle motion can now be adjusted.

### Bug Fixes

- Fix the cursor ripple settling at different speeds depending on the display refresh rate.

<details>
<summary>中文说明（点击展开）</summary>

### 新增

- **扰动恢复速度**：粒子交互设置组新增滑块，控制粒子被光标扰动后回归原位的快慢，也就是鼠标划过之后涟漪能持续多久。
- **渐变粒子颜色**：原「单色」开关升级为颜色模式，可选单色或渐变色。渐变模式混合两种颜色，支持三种显示效果。
- **粒子辉光**：新增辉光功能，可以让粒子发光，强度设置为0则不启用。
- **待机运动频率**：现在可以调整待机粒子运动的变化频率。

### 修复

- 修复粒子涟漪的收敛速度随屏幕刷新率变化的问题。

</details>

## [1.5.0] - 2026-09-22

### Compatibility

- **Plugin renamed to Harbor Tab** (`harbor-tab`): the `first-light` id is already taken in the official plugin store, so the submission continues under a new id. The repository moved to `Moyf/harbor-tab` (old links redirect automatically); BRAT users switching from a previous install should point it at the new repo. Obsidian treats the new id as a different plugin — enable it and re-configure its settings once; the old `first-light` folder can be removed from `.obsidian/plugins/`. The lighthouse wordmark/icon is unchanged

### Bug Fixes

- Fix "ghost" home tabs: after closing a tab, the new-tab replacement could target a detached leaf and resurrect it outside the layout tree, leaving stray empty tabs and stale leaf references that other plugins tripped over. It now verifies the leaf is still attached and falls back to the most recently used empty tab
- Fix the search suggestions' keyboard scope leaking when "hide on blur" is disabled: after the search bar lost focus, arrow keys and Enter kept being captured by the stale suggestion list (e.g. Enter re-opened the highlighted result instead of editing). The list stays available for mouse clicks, but the keyboard is released

## [1.4.2] - 2026-09-14

### Compatibility

- **Plugin renamed back to First Light** (`first-light`): development continues in this repository, `Moyf/first-light`. If you previously installed the Home Tab Plus builds, Obsidian treats this as a different plugin — enable it and re-configure its settings once; the old `home-tab-plus` folder can be removed from `.obsidian/plugins/`. Install links point to `Moyf/first-light`.

### Features

- Recent files keyboard navigation now supports Home/End to jump straight to the first/last entry

### Bug Fixes

- Fix the particle wordmark rendering as a solid black dot-matrix on displays with a fractional device pixel ratio (e.g. 225% scaling): pixel sampling now reads whole pixels, so transparent areas no longer fill with particles and the logo/title keep their proper colors
- Fix a phantom horizontal scrollbar showing on the home tab whenever the particle effect is enabled: the particle canvas is scaled wider than the wordmark and centered on it, and its transparent margin used to extend the view's scrollable area; it is now clipped at the pane edge, leaving vertical scrolling untouched

### Improvements

- Icon pickers (logo icon, starred-file icons) now source their suggestions from Obsidian's official icon registry (`getIconIds()`) instead of a hardcoded list of ~830 icon ids, so the suggestion list always matches the icons available in the running app version: newly added icons appear automatically, icons Obsidian does not ship are no longer offered, and custom icons registered by other plugins can be picked and render correctly

## [1.4.0] - 2026-08-31

### Features

- Add an "Idle motion" dropdown to the particle effect with six ambient movement modes for the resting wordmark: **Wave rhythm** (a diagonal wave sweeping across the title), **Gentle float** (the whole wordmark bobbing together), **Staggered float** (a standing wave where neighbouring regions rise and fall out of phase), **Heartbeat** (a lub-dub pulse radiating from the center outward, with the amplitude growing toward the rim), **Ripple** (ring-shaped waves spreading from the center) and **Breathe** (a slow uniform radial expansion). All modes are disabled by default ("None") and run at draw time only — the cursor-ripple physics stays untouched, sine lookups use a precomputed table, and "None" keeps the original code path

## [1.3.2] - 2026-08-30

### Features

- Add an "Individual margins" toggle for the logo: when enabled, the four sides (top / right / bottom / left) can each be tuned separately; when disabled (default), the single uniform margin applies
- Move "Logo scale" to the top of the Logo layout settings group

### Bug Fixes

- Fix the particle wordmark occasionally not refreshing after settings changes: logo position, logo scale and logo margins are now part of the rebuild signature (previously only detected when the container happened to resize), a tripped rebuild circuit breaker now retries after a cooldown instead of dropping the pending change, and a rapid-settings race no longer tears down the freshly built engine

## [1.3.1] - 2026-08-30

### Compatibility

- **Plugin id renamed** from `home-tab-plus` to `first-light`: the 1.3.0 release still shipped under the old id. After updating, Obsidian treats this as a different plugin — re-enable it and re-configure its settings once; the old `home-tab-plus` folder can be removed from `.obsidian/plugins/`. Install links now point to `Moyf/first-light`.

### Features

- Add logo position and margin settings for the wordmark area, with dedicated i18n entries
- Add a selection highlight sub-page at the end of Appearance, with i18n entries
- Recent files navigation now loops: continuing past the last entry wraps back to the search bar
- Widen particle effect slider ranges (spacing 1–8, dot size down to 0.2) and tune defaults to a finer lattice

### Bug Fixes

- Fix suggester popovers being trapped behind popout windows: suggestion popups now render in the focused window, and settings-page suggesters (font / icon / image) migrated to the official `AbstractInputSuggest`, which positions itself correctly in popout settings windows
- Fix the particle engine resolving `devicePixelRatio`, computed styles and canvas resources from the main window instead of the window hosting the view (popout-safe)
- Fix a startup race that could wipe stored recent files before they were loaded
- Keep home tab leaf positions across plugin reloads: `onunload` no longer detaches the plugin's leaves
- Fix logo icon color falling back to `currentColor` when no custom color is set
- Bake the computed `stroke` of logo SVGs into the rasterized image so particle icons keep their color (CSS variables do not resolve in standalone SVG images)
- Style the native color input used by declarative settings rows, and re-render the page when a color mode dropdown changes so the custom color picker appears

### Improvements

- Resolve all Obsidian plugin review lint findings: explicit types instead of `Function`/`any`, no `@ts-ignore`, `app` passed explicitly to file utils, `window.`-prefixed timers and animation frames, `createEl` helpers, removal of deprecated `setDynamicTooltip` and of global `app` access (also fixes a latent crash in unresolved-link path resolution)
- Drop unused dependencies (`builtin-modules`, `fs-extra`, `dotenv`)

## [1.3.0] - 2026-08-30

### Features

- Add an interactive particle wordmark effect: render the logo and title as a dot grid that ripples around the cursor, with a monochrome mode (luminance-shaded single hue) and tunable parameters (canvas scale, particle spacing, dot size, disturbance radius/strength)
- Organize settings into native sub-pages (Search / Logo / Title style / Particle effect) with the declarative settings API
- Rebrand the plugin as **First Light**
- Modernize the settings tab with the Obsidian 1.13 declarative settings API (`getSettingDefinitions`)
- Add a plugin icon (`house`) to the settings sidebar
- Add i18n support with English and Simplified Chinese locales (`getLanguage()`-based)

### Improvements

- Fix typos and apply sentence case to setting names ("Show shorcuts" → "Show shortcuts", "Debug Mode" → "Debug mode")
- Split combined control rows (logo, title font, colors) into one-control-per-row layout

### Compatibility

- Raise minimum Obsidian version to 1.13.0 (required by the declarative settings API)

## [1.2.3] - 2026-05-08

### Features

- Add dedicated icons for canvas, base, and database file types (`LayoutDashboard` / `Table` / `Database`)
- Add `.base`, `.components`, `.xdb` as recognized file types in the lookup table
- Add search filter support for the Recent Files section
- Support jumping to headings directly from search results
- Display alias and title matches in search suggestions
- Add hide-on-blur setting

### Improvements

- Improve fuzzy search ranking and match analysis
- Optimize sorting scores for search suggestions
- Improve suggestion item handling and lower match threshold for better recall
- Optimize heading display in suggestions

### Bug Fixes

- Fix keyboard event cleanup by calling `destroy()` in `homeView.onClose()`
- Fix key mapping issues for keyboard navigation

---

## [1.2.2] and earlier

See git history.

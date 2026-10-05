![](assets/particles.gif)

*通向每条笔记的港口。*

# Harbor Tab

中文文档 | [English](https://github.com/Moyf/harbor-tab/blob/main/README.md)

![GitHub stars](https://img.shields.io/github/stars/Moyf/harbor-tab?style=flat&label=星标) ![Total Downloads](https://img.shields.io/github/downloads/Moyf/harbor-tab/total?style=flat&label=总下载量) ![GitHub Issues](https://img.shields.io/github/issues/Moyf/harbor-tab?style=flat&label=问题) ![GitHub Last Commit](https://img.shields.io/github/last-commit/Moyf/harbor-tab?style=flat&label=最后提交)

Harbor Tab 是一款 [Obsidian](https://obsidian.md/) 插件，为默认新标签页提供类似浏览器的首页体验，包含搜索栏、最近打开笔记、收藏笔记等。

![](assets/overview.webp)
> 继承自 [olrenso](https://github.com/olrenso) 的 [Home tab](https://github.com/olrenso/Obsidian-home-tab) 插件，在此基础上持续更新并加入新特性。

## 使用方法
启用插件后，每个新的空标签页都会自动替换为 Harbor Tab 视图。
你可以在设置中关闭该行为，并通过命令面板使用 `Harbor Tab: Open new tab` 或 `Harbor Tab: Replace current tab` 命令手动打开新的 Harbor Tab。

## 特性介绍
### 快速搜索
你可以在仓库中搜索任何本地文件，包括 Markdown 笔记和附件。

![](assets/search.webp)

*打开新标签，键入笔记名，回车前往——就像在港口中登上一艘艘不同的「笔记之船」。*

值得一提的是——
**除了搜索笔记名之外，插件还支持搜索 title 属性或者任意笔记标题**。

![](assets/heading-search.webp)

选择后可以跳转到对应标题的位置。

### 最近笔记
搜索栏的下方还会显示最近查看过的笔记，方便快速恢复。

![](assets/recent-notes.webp)

同样可以将收藏笔记（Bookmark）显示在下方，快速跳转。

### 自定义 LOGO 和标题
搜索框上方的图标和文本均支持自定义：
![](assets/custom-title.webp)

支持启用粒子效果，使它成为可与鼠标交互的酷炫颗粒：
![](assets/particle-config.webp)

### 新增内容
相比原版 Home tab，本 fork 持续开发了以下功能：

- **标题搜索与跳转** — 搜索文档中的标题并自动跳转到匹配位置，采用智能跳转策略
- **网页链接建议** — 检测搜索栏中输入的网址，并提示用 Web Viewer 核心插件打开
- **多语言** — 支持英文和简体中文
- **粒子字标** — 将 Logo 和标题渲染为可交互的粒子网格，鼠标靠近时产生涟漪效果
- **现代化的设置页** — 基于 Obsidian 声明式设置 API 重建，组织为多个子页面

## 功能特性
### 按文件类型或扩展名筛选搜索
为了更快找到文件，你可以使用文件类型或扩展名筛选器来过滤搜索结果。

输入筛选键（见下表）并按下 Tab 即可激活筛选器；按退格键可移除筛选器。

![](assets/ext-filter.webp)

#### 筛选键
可用的筛选器如下：

| 文件类型 | 文件扩展名 |
| :-: | :-: |
| `markdown` | `md` |
| `image` | `png `、` jpg `、` jpeg `、` svg `、` gif `、` bmp` |
| `video` | `mp4 `、` webm `、` ogv `、` mov `、` mkv` |
| `audio` | `mp3 `、` wav `、` m4a `、` ogg `、` 3gp `、` flac` |
| `pdf` | `pdf` |
| `canvas` | `canvas` |

### 通用显示与搜索样式

在 **显示内容 → 通用显示** 中，可以拖拽调整周期笔记、最近文件、书签的顺序，设置区块折叠，或启用 **Compact 模式**，让所有宽度下的文件列表都使用左侧小图标、右侧单行文件名。紧凑项目居中横向排列，一行可显示多个，并自动换行。默认顺序为「周期笔记 → 最近文件 → 书签」，键盘导航也会跟随所选顺序。

**使用属性作为名称** 默认填入 `title`。可以填写 `title, aliases` 等用英文逗号分隔的属性名，依次回退；列表取第一个值，都没有时使用原始文件名。允许留空，直接使用文件名。周期笔记的自定义显示文字仍优先，「文件名」模式则跟随通用设置。

在 **搜索 → 样式** 中，可以选择 **Modern**（默认，圆角半透明输入框，带较厚的半透明外圈）、**Classic**（原有外观）、**Transparent**（尺寸适中，无背景、无边框、无模糊）或 **Minimal**（更小的 Classic 变体，直角、无边框、更少间距与更小字号）。新建按钮仍位于输入框旁；**周期笔记** 子页面内的每个周期也有独立设置组。

### 嵌入式搜索栏
你可以将 Harbor Tab 视图嵌入任意笔记，可选择显示最近文件、星标文件，或只显示搜索栏。

要将搜索栏嵌入笔记，需要创建一个 `search-bar` 代码块（见下方示例）。

只显示搜索栏（不显示标题和 Logo/图标）：在新的一行添加 `only search bar`。
显示星标文件和最近文件：分别添加 `show starred files` 和 `show recent files`。
周期笔记（需在设置中开启）可通过 `show periodic notes` 显示。

例如，以下代码块会渲染出搜索栏和星标文件：

````text
```search-bar
only search bar
show starred files
```
````

![](assets/embeded-search-bar.webp)

---

## 安装方法
插件将上架 [Obsidian 插件市场](https://obsidian.md/plugins?id=harbor-tab)，可直接安装。

你也可以通过 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 安装，使用以下链接：`https://github.com/Moyf/harbor-tab` 或 `Moyf/harbor-tab`。

---

## 致谢

- 原版 [Home tab](https://github.com/olrenso/Obsidian-home-tab) 插件，作者 [olrenso](https://github.com/olrenso) ❤️
- 持续开发已获得原作者许可 —— 详见 [olrenso/obsidian-home-tab#65](https://github.com/olrenso/obsidian-home-tab/issues/65)
- 粒子字标效果灵感来自 [BlackCoder0](https://github.com/BlackCoder0) 的 [Arknights-FlowingPoints](https://github.com/BlackCoder0/Arknights-FlowingPoints) —— 我们的实现是对该创意的独立重写
- 背景图片使用 [style context](https://github.com/Moyf/style-context) 插件实现

## 支持作者

如果 Harbor Tab 对你有帮助，欢迎[请我喝杯咖啡（Ko-fi）](https://ko-fi.com/moy) ☕

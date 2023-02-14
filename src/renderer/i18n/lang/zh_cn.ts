import { flattenI18nData } from "../i18n";

const selfName = "简体中文 (中国)"
export default flattenI18nData({
	"i18n.self_name": selfName,

	"app_name": "Sparks NMN Desktop",
	
	// 应用栏按钮
	"navbar.button": {
		"new": "新建",
		"open": "打开",
		"save": "保存",
		"save_as": "另存为",
		"export": "导出",
		"print": "打印",
		"settings": "设置",
		"about": "关于",
	},

	// 关于
	"about": {
		"title": "关于此应用",
		"text": "Sparks NMN Desktop 是 Sparks NMN 的桌面应用版本，以满足离线使用的需要，并提供便捷的编辑、导出和打印功能。",
		"text.core": "Sparks NMN 是一个基于文本格式的简谱编写软件内核，旨在实现高效的输入与自动排版，使用户能够专注于乐理分析的过程。此内核基于 Web 技术，可以在浏览器上运行。",
		"version": "${0}",
		"author": "Made with ❤ by yezhiyi9670",
		"github": "在 Github 上查看",
		"website": "官方网站",
		"close": "关闭",
	},

	// 设置选项
	"settings": {
		"title": "设置",
		"button": {
			"save": "保存",
			"cancel": "取消"
		},
		"group": {
			"general.title": "常规",
			"editor.title": "编辑器",
			"export.title": "导出与打印",
			"hints": {
				"title": "提示弹窗",
				"desc": "提示弹窗会在满足一定条件时触发，用于对用户进行提示。\n通过“不再显示”选项禁用的弹窗可以在这里重新启用。"
			}
		},
		"item": {
			"language": {
				"title": "语言",
				"desc": "界面的显示语言。"
			},
			"fontSize": {
				"title": "字体大小",
				"desc": "控制代码编辑器使用的字体大小。",
			},
			"showFileSize": {
				"title": "显示文件大小",
				"desc": "在编辑器的状态栏中显示当前文件的大小。",
				"choice": {
					"off": "关",
					"source": "仅源代码",
					"all": "源代码和预览文件"
				}
			},
			"previewMaxWidth": {
				"title": "预览最大宽度",
				"desc": "控制预览内容的最大宽度。\n若窗口宽度小于最大宽度，预览将与窗口宽度匹配。"
			},
			"previewAlign": {
				"title": "预览贴靠方位",
				"desc": "窗口宽度大于最大宽度时预览内容的贴靠方位。\n居中显得较为自然，但是靠左事实上更有利于提高工作效率。",
				"choice": {
					"center": "居中",
					"left": "靠左"
				}
			},
			"previewRefresh": {
				"title": "预览刷新时机",
				"desc": "控制何时刷新预览以匹配当前代码的内容。\n如果你在编辑时感觉到明显卡顿，或者认为频繁的刷新分散了你的注意力，请调低刷新频率。\n无论此设置为何值，保存文件总是会立即刷新预览。",
				"choice": {
					"realtime": "实时 (可能会非常卡)",
					"delay200": "停止编辑后 0.2s",
					"delay500": "停止编辑后 0.5s",
					"delay1000": "停止编辑后 1s",
					"delay3000": "停止编辑后 3s",
					"delay5000": "停止编辑后 5s",
					"delay10000": "停止编辑后 10s",
					"save": "仅在保存时"
				}
			},
			"displayMode": {
				"title": "首选显示模式",
				"desc": "打开文件时首选的显示模式。\n新建文件时将忽略此设置，始终采用“拆分”模式。",
				"choice": {
					"split": "拆分",
					"preview": "预览"
				}
			},
			"autoSave": {
				"title": "自动保存",
				"desc": "每隔 45s，编辑器将尝试保存你未保存的修改，以免意外情况导致工作丢失。",
				"choice": {
					"off": "关闭",
					"overwrite": "直接保存至原文件"
				}
			},
			"paperSize": {
				"title": "纸张大小",
				"desc": "导出 PDF 时使用的纸张大小。\n打印的纸张大小不受此设置影响，请在打印对话框中选择。",
				"choice": {
					"A4": "A4",
					"B5": "B5",
					"A5": "A5",
				}
			},
			"imageResolution": {
				"title": "图像尺寸",
				"desc": "控制导出 PNG 图像时图像的宽度，以像素为单位。"
			},
			"browser": {
				"title": "首选浏览器",
				"desc": "打印及导出 PDF/PNG 时使用的浏览器可执行文件。\n应当使用 Microsoft Edge 或者 Google Chrome。\n若留空，打印时将使用系统默认浏览器，导出 PDF/PNG 功能将无法使用。"
			},
			"tempHtmlLocation": {
				"title": "临时 HTML 文件位置",
				"desc": "打印及导出 PDF/PNG 时创建临时 HTML 的位置。\n临时文件夹不会被定期清理，但是每次使用都会覆盖上一次的文件。",
				"choice": {
					"temp": "临时文件夹",
					"source": "源文件所在位置"
				}
			},
			"hintWelcome": {
				"title": "欢迎",
				"desc": "触发：应用启动时。"
			},
			"hintLargeHtml": {
				"title": "导出 HTML 文件较大",
				"desc": "触发：导出 HTML 文件前。"
			},
			"hintExportEssence": {
				"title": "关于 PNG/PDF 导出的本质",
				"desc": "触发：导出 PNG/PDF 前。"
			},
			"hintPrintEssence": {
				"title": "关于打印的本质",
				"desc": "触发：使用打印功能前。"
			},
			"hintRate": {
				"title": "评价与赞助提示",
				"desc": "触发：使用此应用执行打开操作，且此前已经执行过至少 3 次时。"
			}
		},
		"system": {
			"enable": "启用"
		},
		"error": {
			"number_invalid": "此项的数值无效。",
			"number_less": "此项的数值不能小于 ${0}。",
			"number_more": "此项的数值不能大于 ${0}。",
		}
	},

	// 显示模式
	"displaymode": {
		"edit": "编辑",
		"split": "拆分",
		"preview": "预览",
	},
})

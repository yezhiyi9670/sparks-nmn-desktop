import { flattenI18nData } from "../i18n";

const selfName = "简体中文 (中国)"
const appName = 'Sparks NMN Desktop'
export default flattenI18nData({
	"i18n.self_name": selfName,

	"title": {
		"default": appName,
		"new": "新文档 - " + appName,
		"newDirty": "● 新文档 - " + appName,
		"clean": "${0} - " + appName,
		"dirty": "● ${0} - " + appName
	},
	
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

	// 浏览目录
	"browse": {
		"open": "打开文件",
		"save": "保存文件",
		"format": {
			"spnmn": "Sparks NMN 乐谱",
			"spnmn_txt": "Sparks NMN 文本",
			"all": "所有文件",
			"flac": "FLAC 音频"
		}
	},

	// 提示框
	"toast": {
		"open_fail": "无法打开文件 ${0}",
		"save_fail": "无法保存至 ${0}",
		"save_before_export": "不能导出未保存过的文件。",
		"preview_exported": "已将预览导出到 ${0}",
		"preview_export_fail": "无法导出到 ${0}",
		"json_exported": "已将数据导出到 ${0}",
		"json_export_fail": "无法导出到 ${0}",
		"print_fail": "准备打印环境失败",
		"print_launch_fail": "无法启动浏览器，请检查设置中的浏览器路径是否正确。",
		"new_version": "新版本 ${0} 现已可用，可前往官网下载。",
	},

	// 提示弹窗
	"hint": {
		"system": {
			"dismiss": "不再显示",
			"cancel": "取消",
			"close": "关闭"
		},
		"welcome": {
			"title": "欢迎",
			"line": {
				"1": `欢迎使用 ${appName}！这是一个用来编写简谱的桌面应用。`,
				"2": "为了使用方便，你可以在操作系统中设置默认此应用打开 spnmn 文件。",
				"3": "要开始创建文档，直接在界面上的代码编辑框内输入即可。如果你不清楚如何编写代码，可以点击下面的链接查看文档。不要忘了保存哦！",
				"4": "打印功能仍然处于实验阶段。如果你有打算印刷你的成品，你或许应该先从官网弄几份样例文件看看打印功能是否正常。我们不希望因此浪费你的时间。"
			},
			"link": {
				"official": "官方网站",
				"github": "Github",
			}
		},
		"largeHtml": {
			"title": "HTML 用途提示",
			"line": {
				"1": `导出的 HTML 文件使得你可以在不打开 ${appName} 的情况下查看预览。`,
				"2": `为了保证显示效果的一致性，预览显示前需要加载一些字体。在本机器上，预览会加载 ${appName} 自带的字体文件；而在其他机器上，则需要通过网络（目前通过 jsdelivr.net）加载字体，这可能是非常缓慢的。`,
				"3": '由于需要使用统一格式逐个描述乐谱中的文本与图形，HTML 文件可能会非常大。因此，不建议尝试用文本编辑器编辑 HTML 文件。',
				'4': '不建议通过直接嵌入 HTML 文件框架的方式在你的页面中嵌入 Sparks NMN 乐谱。'
			},
			"confirm": "导出"
		},
		"jsonUsage": {
			"title": "JSON 用途提示",
			"line": {
				"1": `导出的 JSON 文件包含解析后的乐谱数据。这些数据可供第三方软件使用，可以用来渲染乐谱，也可以用来生成一些音乐相关的内容，例如 MIDI 文件。`,
				"2": `JSON 文件是一种目标格式，并不直接包含源代码。`,
			},
			"confirm": "导出"
		},
		"printEssence": {
			"title": "如何打印",
			"line": {
				"1": `在点击“打印”按钮后，${appName} 将会导出临时的 HTML 预览文件，并在浏览器中打开。`,
				"2": "文件打开后，你的浏览器应当会自动弹出打印预览对话框，你可以选择打印选项并执行打印。如果没有弹出，请尝试按 Ctrl + P 来手动触发。",
				"3": "HTML 预览文件的存放位置以及使用的浏览器取决于设置。如果打印排版不太对或者出现错乱，请使用 Microsoft Edge 或 Google Chrome 浏览器。",
			},
			"confirm": "打印"
		},
		"rate": {
			"title": "评价与赞助",
			"line": {
				"1": `你应该已经使用了一段时间的 ${appName} 了。`,
				"2": "如果你喜欢此应用，请考虑给予五星好评或 Github Star，并通过爱发电平台对开发者进行赞助。开发者会感谢你的。"
			},
			"link": {
				"github": "Github(应用)",
				"github_core": "Github(内核)",
				"donate": "赞助"
			}
		},
		"unsavedChanges": {
			"title": "未保存的更改",
			"line": {
				"1": "编辑器中存在未保存的更改，继续操作将导致它们丢失！"
			},
			"confirm": "继续"
		}
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
			},
			"stats": {
				"title": "统计数据",
				"desc": "这是应用所存储的统计数据，你不需要修改。"
			}
		},
		"item": {
			"language": {
				"title": "语言",
				"desc": "界面的显示语言。"
			},
			"uiFontFamily": {
				"title": "界面字体系列",
				"desc": "控制界面使用的字体系列。\n可以依次指定多个字体，用英文逗号隔开。若字体名称含空格应加上单引号。\n如果不小心把界面玩坏了，请删除或手动编辑安装目录下的 data/prefs/settings.json 来修复。",
			},
			"fontFamily": {
				"title": "编辑器字体系列",
				"desc": "编辑器使用的字体系列。\n可以依次指定多个字体，用英文逗号隔开。若字体名称含空格应加上单引号。\n英文字符应当始终使用等宽字体，否则编辑器可能不会正常工作。"
			},
			"fontSize": {
				"title": "字体大小",
				"desc": "控制代码编辑器使用的字体大小。",
			},
			"autoSave": {
				"title": "自动保存",
				"desc": "每隔 45s，编辑器将尝试保存你未保存的修改，以免意外情况导致工作丢失。",
				"choice": {
					"off": "关闭",
					"overwrite": "直接保存至原文件"
				}
			},
			"inspectorOpen": {
				"title": "默认打开检查器",
				"desc": "启动时自动打开乐谱检查工具窗口。",
				"choice": {
					"off": "关",
					"on": "开"
				}
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
			"fileSizeUnit": {
				"title": "文件大小单位",
				"desc": "显示文件大小所使用的单位。",
				"choice": {
					"b": "B",
					"kunb": "坤B",
					"kb": "KB",
					"kkunb": "K坤B",
					"mb": "MB",
					"mkunb": "M坤B"
				}
			},
			"showProcessTime": {
				"title": "显示处理时长",
				"desc": "在编辑器的状态栏中显示上次编译与渲染的用时。",
				"choice": {
					"off": "关",
					"on": "开"
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
				"desc": "控制何时刷新预览以匹配当前代码的内容。\n如果你在编辑时感觉到明显卡顿，或者认为频繁的刷新分散了你的注意力，请调低刷新频率。\n无论此设置为何值，保存文件前或按下 Ctrl + R 时总是会立即刷新预览。",
				"choice": {
					"realtime": "实时 (不推荐，可能导致很难编辑)",
					"delay200": "停止编辑后 0.2s",
					"delay500": "停止编辑后 0.5s",
					"delay1000": "停止编辑后 1s",
					"delay2000": "停止编辑后 2s",
					"delay3000": "停止编辑后 3s",
					"delay5000": "停止编辑后 5s",
					"delay10000": "停止编辑后 10s",
					"none": "不自动刷新"
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
			"paperSize": {
				"title": "纸张大小",
				"desc": "在乐谱未指定纸张大小的情况下，导出 PDF 时使用的纸张大小。\n打印的纸张大小不受此设置影响，请在打印对话框中选择。",
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
				"title": "HTML 用途提示",
				"desc": "触发：导出 HTML 文件前。"
			},
			"hintJsonUsage": {
				"title": "JSON 用途提示",
				"desc": "触发：导出 JSON 文件前。JSON 文件导出可通过右键点击“导出”按钮触发。"
			},
			"hintExportEssence": {
				"title": "关于 PNG/PDF 导出的本质",
				"desc": "触发：导出 PNG/PDF 前。"
			},
			"hintPrintEssence": {
				"title": "如何打印",
				"desc": "触发：使用打印功能前。"
			},
			"hintRate": {
				"title": "评价与赞助",
				"desc": "触发：使用此应用执行打开操作，且此前已经执行过至少 3 次时。"
			},
			"hintUnsavedChanges": {
				"title": "未保存的更改",
				"desc": "触发：有未保存更改时尝试新建文件、打开其他文件或关闭应用。",
			},
			"openTimes": {
				"title": "打开文件的次数",
				"desc": "执行打开操作的总次数，包括使用应用直接打开文件和点击“打开”按钮。"
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

	// 关于
	"about": {
		"title": "关于此应用",
		"text": appName + " 是 Sparks NMN 的桌面应用版本，以满足离线使用的需要，并提供便捷的编辑、导出和打印功能。",
		"text.core": "Sparks NMN 是一个基于文本格式的简谱编写软件内核，旨在实现高效的输入与自动排版，使用户能够专注于乐理分析的过程。此内核基于 Web 技术，可以在浏览器上运行。",
		"version": "${0}",
		"version_core": "Sparks NMN ${0}",
		"author": "Made with ❤ by yezhiyi9670",
		"github": "在 Github 上查看",
		"website": "官方网站",
		"donate": "赞助",
		"close": "关闭",
	},

	// 链接
	"link": {
		"official": "https://nmn.sparks-lab.art/",
		"github": 'https://github.com/yezhiyi9670/sparks-nmn-desktop',
		"donate": 'https://nmn.sparks-lab.art/donate/',
		"github_core": 'https://github.com/yezhiyi9670/sparks-nmn'
	},
})

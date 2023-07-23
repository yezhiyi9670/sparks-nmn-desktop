import { flattenI18nData } from "./flatten-i18n-data";

export default {
	levelNameKeys: {
		'empty_tree': [0],
		'wrong_speciality': [0],
		'special_children': [0, 1],
		'lack_required': [0],
		'second_root': [0],
		'post_header': [0],
		'duplicate_unique_del': [0],
		'duplicate_unique': [0]
	},
	levelNames: {
		'document': '文档',
		'article': '章节',
		'fragment': '片段',
		'part': '声部',
		'lyricLine': '歌词行'
	},
	issues: {
		'token.unclosed_comment': '此块注释没有闭合',
		'token.unclosed_string': '此字符串没有闭合',
		'token.invalid_escape': '无效的转义序列 ${0}',

		'bad_command_format': '此指令行格式不正确。应当形如 <指令>: <内容> 或 <指令>[<属性>]: 内容。',
		'wtf_line': '无法确定此行的意义，因为此行不是分割线，并且找不到冒号。',

		'empty_document': '文档似乎是空的',
		'empty_tree': '此${0}被丢弃，因为其不包含任何内容',
		'wrong_speciality': '此${0}包含了不相容的指令',
		'special_children': '此${0}不应当包含${1}',
		'lack_required': '此${0}中必须包含一个 ${1}(${2})，但是没有找到。',
		'unknown_command': '未知的指令 ${0}',
		'second_root': '你是想在一个${0}里面放两个${0}吗？',
		'post_header': '作为${0}的头部，指令 ${1} 应当出现在开头。',
		'redundant_props': '指令 ${0} 不能含有中括号属性',
		'lack_props': '指令 ${0} 应当有中括号属性，但是没有找到。',
		'duplicate_unique_del': '指令 ${1} 在${0}中应当是唯一的。你是否忘了添加分割线 `${2}`？',
		'duplicate_unique': '指令 ${1} 在${0}中应当是唯一的',

		'unclosed_bracket': '括号没有闭合',
		'unpaired_bracket': '括号无法配对',

		'unknown_base_shift': '无效的基调值 ${0}',
		'unknown_relative_shift': '无效的相对转调 ${0}',
		'unknown_qpm': '无效的拍速值 ${0}',
		'unknown_frac': '无效的分数值 ${0}',
		'unequal_beats': '反常拍号 ${0} 与其解析式 ${1} 不相等',

		'missing_beats': '未指定全局拍号，将默认为 0/4。',
		'unknown_base': '无效的基调值 ${0}',
		'rp_unknown_key': '未知渲染属性 ${0}',
		'rp_unknown_value': '无效的渲染属性值 ${1}（属性 ${0}）',
		'unknown_jumper_attr': '无法将 `${0}` 解析为跳房子属性',
		'nan_substitute_index': '无法确定替代音符的开始位置。你是不是忘了？',
		'unknown_part_attr': '无法将 `${0}` 解析为声部属性',
		'unknown_annotation_index': '无法将 `${0}` 解析为标记序号',
		'unknown_lrc_attr': '无法将 `${0}` 解析为歌词行属性',

		'lrc_unused_symbol': '歌词中有标点因为位置无效而未被使用',
		'unexpected_lrc_bracket': '歌词中出现未曾设想的括号 ${0}',
		'invalid_placeholder_repeat': '重复次数 `${0}` 无效',

		'incomplete_insert_sequence': '符号 `&` 后应当紧随一个单词和一个 `;`，以表示插入符号',
		'unknown_insert_sequence': '未知的插入符号名称 ${0}',
		'triplet_invalid_format': '连音描述符无效。应当形如 <连音位>,<连音数>。',
		'triplet_invalid_field': '无效的连音位 ${0}',
		'triplet_invalid_number': '无效的连音数 ${0}',
		'notes_unexpected_bracket': '音符序列中出现未曾设想的括号 ${0}',
		'unknown_note_attr': '无法将 `${0}` 解析为音符属性',
		'note_char_music_unknown': '`${0}` 不是正确的音符字符',
		
		'note_char_force_unknown1': '未知的力度标记词 ${0}',
		'note_char_force_unknown2': '未知的力度标记符号 ${0}',
		'note_char_annotation_unknown': '无法将 `${0}` 解析为标记符号',
		'note_char_lyric_annotation_unknown': '无法将 `${0}` 解析为歌词标记符号',

		'unknown_section_separator': '未知的小节线符号 ${0}',
		'empty_section': '存在空白的小节。如果你确实想这么做，请写入一个 `empty`，否则可能导致未预期的结果。',
		'attr_beats_above': '临时拍号不能标记在小节线上方',
		"invalid_begin_separator": "小节线 ${0} 不能用在小节序列的开头",
		"invalid_end_separator": "小节线 ${0} 不能用在小节线的末尾",
		"invalid_pre_attr_begin": "小节序列开头的小节线不能有前置属性",
		"invalid_post_attr_end": "小节序列末尾的小节线不能有后置属性",
		"invalid_pre_attr": "类型为 ${0} 的小节线属性不能作为前置属性",
		"invalid_post_attr": "类型为 ${0} 的小节线属性不能作为后置属性",
		"invalid_self_attr": "类型为 ${0} 的小节线属性不能作为上方属性",
		"invalid_self_attr_begin": "类型为 ${0} 的小节线属性不能作为序列开头小节线的上方属性",
		"invalid_self_attr_end": "类型为 ${0} 的小节线属性不能作为序列末尾小节线的上方属性",
		'unknown_separator_attr': '无法将 `${0}` 解析为小节线属性',
		'unknown_omit_count': '无效的小节省略数 ${0}',

		'mismatching_beats': '小节 ${0}（第 ${1} 小节）与其他同时的小节拍号不一致',
		'mismatching_speed': '小节 ${0}（第 ${1} 小节），迭代数 ${2} 与其他声部的同位置小节拍速不一致 (${3}≠${4})',
		'repeat_overflow': '反复迭代节的数量超出上限 ${0}，可能是因为反复结构存在问题导致死循环',
		'repeat_conflict': '第 ${0} 小节被反复迭代数 ${1} 穿越超过一次',
	},
	'notices': {
		'iter_invalid': '反复记号迭代数写在了无效的位置，很可能是错误的。',
		'quarters_less': '此小节的拍数少于音乐属性指定的。如果这是一个不完整小节，请在右侧小节线添加虚线。',
		'quarters_nonint': '此小节节拍为散板且拍数不是整数。如果这是一个不完整小节，请在右侧小节线添加虚线。',
		'quarters_more': '此小节的拍数多于音乐属性指定的',
		'quarters_mismatch': '此小节的拍数与其他声部内相同位置的小节不匹配'
	},
	'commands': {
		'Dt': '标题',
		'Dp': '左上角属性',
		'Dv': '右上角版本号',
		'Ds': '副标题',
		'Da': '作者',
		'Df': '尾注',
		'Dl': '页脚左侧文本',
		'Dr': '页脚右侧文本',
		'P': '音乐属性',
		'Pi': '音乐属性（不显示）',
		'Rp': '渲染属性',
		'T': '文本标注',
		'S': '文段标题',
		'Sp': '音乐属性',
		'Srp': '渲染属性',
		'B': '此前强制换行',
		'J': '跳房子',
		'Frp': '渲染属性',
		'N': '音符序列',
		'Na': '鼓点音符序列',
		'A': '标记符号',
		'La': '标记型歌词',
		'L': '歌词（手动分割）',
		'Lc': '歌词（字基）',
		'Lw': '歌词（词基）',
		'Ns': '替代小节'
	},
	'render_props': {
		'page': '页面高度与宽度之比',
		'double_sided': '分页时假设双面打印',
		'n': '每行小节数',
		'time_lining': '基于时值的小节宽度',
		'legacy_positioning': '使用旧版布局算法',
		'debug': '显示错误警告',
		'sectionorder': '小节线序号模式',
		'scale': '文档缩放',
		'gutter_left': '(1)左边距 - 曲谱',
		'connector_left': '(0)左边距 - 连谱号',
		'left_separator': '显示行首的小节线',
		'grayout': '降低延长连音音符的不透明度',
		'explicitmarkers': '总是显示声部标签',
		'font_part': '字体 - 声部标签',
		'font_article': '字体 - 章节标题',
		'font_title': '字体 - 大标题',
		'font_subtitle': '字体 - 副标题',
		'font_author': '字体 - 作者',
		'font_corner': '字体 - 角落标记',
		'font_text': '字体 - 文本章节',
		'font_footnote': '字体 - 尾注',
		'font_descend': '字体 - 页脚',
		'font_attr': '字体 - 属性文本',
		'font_force': '字体 - 力度',
		'font_chord': '字体 - 和弦',
		'font_annotation0': '字体 - 默认自定义标记',
		'font_annotation1': '字体 - 第一自定义标记',
		'font_annotation2': '字体 - 第二自定义标记',
		'font_annotation3': '字体 - 第三自定义标记',
		'font_annotation4': '字体 - 第四自定义标记',
		'font_annotation5': '字体 - 第五自定义标记',
		'font_annotation6': '字体 - 第六自定义标记',
		'font_lyrics': '字体 - 歌词',
		'font_checkpoint': '字体 - 段落标记',
		'margin_after_props': '(2)间距 - 大标题之后',
		'margin_after_article': '(1.5)间距 - 章节之后',
		'margin_after_header': '(0.8)间距 - 章节标题之后',
		'margin_after_header_text': '(0.7)间距/额外 - 文本章节标题之后',
		'margin_before_line': '(1.2)间距 - 乐谱行之前',
		'margin_after_line': '(0.1)间距 - 乐谱行之后',
		'margin_between_parts': '(2.5)间距 - 声部之间',
		'margin_after_part_notes': '(2)间距 - 声部曲谱部分之后',
		'inset_before_lyrics': '(1.3)负间距 - 声部歌词组之前',
		'margin_after_lyrics': '(0.1)间距 - 声部歌词组之后',
		'margin_after_part': '(1)间距 - 声部之后',
		'offset_lyrics_iter': '(1.5)偏移值 - 歌词行编号',
		'offset_section_boundary': '(1)偏移值 - 小节边距',
	},
	'updown': {
		'up': '升',
		'down': '降'
	},
	'metrics': {
		'key': '${0}Key',
		'thd': '减${0}度',
		'thm': '小${0}度',
		'thM': '大${0}度',
		'th': '${0}度',
		'thp': '完全${0}度',
		'tha': '增${0}度'
	},
	'render': {
		'transpose_prop': '移调${0}Key',
		'shift_prop_a_1': '1=',
		'shift_prop_a_2': '',
		'shift_prop_at_1': '1=',
		'shift_prop_at_2': '移',
		'shift_prop_r': '${0}${1}',
		'shift_prop_rt': '${0}${1}移',
		'colon': '：',
		'author_sep': ' ',
		'omit': '(后略)',
		'page': 'Page ${0} / Total ${1}',
		'secsel': 'm${0}'
	},
	'efLabels': {
		'top': '文档标题',
		'author': '作者与音乐属性',
		'topMargin': '页面头间距',
		'footer': '尾注',
		'articleMargin': '章节下边距',
		'textArticle': '文本章节 ${0}',
		'musicArticleTitle': '音乐章节标题 ${0}',
		'musicLine': '曲谱 ${0} m${1}',
		'musicLineMargin': '曲谱下边距',
		'pageBottomMargin': '印刷页面下边距',
		'pageSeparator': '[仅限预览] 页面分割线',
		'pageDescend': '页脚 第${0}页'
	},
	'editor': flattenI18nData({
		// 状态栏
		"status": {
			// 显示模式
			"displaymode": {
				"edit": "编辑",
				"split": "拆分",
				"preview": "预览",
			},
			// 保存状态
			"dirty": {
				"new": "新文档",
				"clean": "已保存",
				"dirty": "未保存",
				"newTemporary": "新文档",
				"cleanTemporary": "已暂存",
				"dirtyTemporary": "未暂存",
				"preview": {
					"clean": "已刷新预览",
					"dirty": "未刷新预览"
				}
			},
			// 页面数
			"pages": {
				"nan": "粗排模式",
				"value": "共${0}页"
			},
			// 计时信息
			"timing": {
				"both": "${0}ms/${1}ms",
			},
			// 文件大小
			"size": {
				"unit": {
					"b": "B",
					"kunb": "坤B",
					"kb": "KB",
					"kkunb": "K坤B",
					"mb": "MB",
					"mkunb": "M坤B"
				}
			}
		},

		// 预览
		"preview": {
			"new_title": "新文档",
			"blank": {
				"title": "空白文档",
				"desc": {
					"1": "此文档没有任何有效内容。",
					"2": "要使文档有效，请向其中添加音乐属性行（以 P 或 Props 开头）。"
				}
			}
		},

		// 检查器
		"inspector": {
			"tooltip": "乐谱检查工具",
			"select": "选择工具",
			"play": {
				"title": "音效试听与结构检查",
				"play": "播放",
				"play_pre": "打节拍一小节后播放",
				"pause": "暂停",
				"stop": "回到此章节开头",
				"auto_scroll": "自动滚动预览",
				"export": "保存为 MIDI 文件",
				"modifier": {
					"speed": "倍速",
					"pitch": "音高"
				},
				"selector": {
					"article": {
						"untitled": "无标题章节 ${0}",
						"titled": "${0}"
					},
					"visual_pick": "在乐谱预览中点选小节",
					"no_articles": "没有可供试听的音乐章节",
					"iter_number": "反复次数",
					"ignore_repeats": "忽略反复与区分（不建议使用）",
					"no_sections": "此章节内没有任何小节",
				},
				"overview": {
					"section_unavailable": "此小节不存在于当前迭代节中",
					"time_seconds": "累计长度 ${0} 秒",
					"time_minutes": "累计长度 ${0} 分 ${1} 秒",
				},
				"controls": {
					"part": {
						"beat_machine": "节拍器",
						"titled": "${0}",
						"untitled": "未命名声部 ${0}",
						"accompany": " (鼓点)"
					},
					"octave": "八度",
					"synth": "乐器",
					"instrument": {
						"chip": "芯片*",
						"saw": "锯齿*",
						"flute": "长笛*",
						"piano": "钢琴",
						"organ": "管风琴",
						"violin": "提琴",
						"guitar": "吉他",
						"beat1": "节拍1",
						"beat2": "节拍2",
						"snare": "Snare",
						"drum": "鼓点"
					},
					"prefab": {
						"hint": "为方便之后加载，可将混音配置以注释形式写入代码，并随乐谱一同保存。",
						"save": "写入代码",
						"load": "从代码中加载"
					},
					"remark": "保存的混音配置文件"
				}
			},
			"instrument_test": {
				"title": "乐器音源测试",
				"tonic": "音符乐器类",
				"drumline": "鼓点乐器类",
				"comment": "注：带有 * 的是电子合成音，其余是采样音。"
			}
		}
	})
}

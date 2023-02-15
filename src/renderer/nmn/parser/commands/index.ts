import { findWithKey } from "../../util/array"

export interface CommandDef {
	/**
	 * 命令头缩写
	 */
	head: string
	/**
	 * 命令头全称
	 */
	headFull: string
	/**
	 * 内容处理方式
	 * - `none` 无内容
	 * - `text` 作为文本整体处理
	 * - `separated` 作为文本以空格分隔处理
	 * - `tokenized` 作为代码按单词处理
	 */
	contentType: 'none' | 'text' | 'separated' | 'tokenized'
	/**
	 * 是否有属性
	 * - `none` 不能有属性
	 * - `optional` 可以有，也可以没有
	 * - `required` 必须有属性
	 */
	hasProps: 'none' | 'optional' | 'required'
	/**
	 * 属性处理方式
	 * - `none` 无属性
	 * - `text` 作为文本整体处理
	 * - `single` 一个属性
	 * - `multiple` 多个属性
	 */
	propsType: 'none' | 'text' | 'single' | 'multiple'
	/**
	 * 特殊形（Text）
	 */
	special?: boolean | 'none'
	/**
	 * 当前级别内必须
	 */
	required?: number
	/**
	 * 当前级别内不允许重复
	 */
	unique?: string
	/**
	 * 级别
	 */
	levels: number[]
}

export const LineLevels = {
	document: 0,
	article: 1,
	fragment: 2,
	part: 3,
	lyricLine: 4
}
export const lineLevelNames = [
	'document', 'article', 'fragment', 'part', 'lyricLine'
]
export const lineDelimiters = [
	undefined, '=', '-', undefined, undefined
]

/**
 * 根据指令头获取其定义
 */
export function getCommandDef(head: string) {
	return (
		findWithKey(commandDefs, 'head', head) ??
		findWithKey(commandDefs, 'headFull', head) ??
		undefined
	)
}

/**
 * 获取指令头最近的等级
 */
export function getCommandNearestLevel(def: CommandDef, level: number) {
	// 首先你不可以没有等级
	// 其次，等级占据应该是连续的，所以不会出现两个等级距离相等且都是最近
	return def.levels.slice().sort((a, b) => Math.abs(a - level) - Math.abs(b - level))[0]
}

export const commandDefs: CommandDef[] = [
	// Dt 文档标题
	{
		head: 'Dt',
		headFull: 'DocTitle',
		contentType: 'text',
		hasProps: 'none',
		propsType: 'none',
		unique: 'Dt',
		levels: [LineLevels.document]
	},
	// Dp 文档标题顶部，左上角
	{
		head: 'Dp',
		headFull: 'DocPrescript',
		contentType: 'text',
		hasProps: 'none',
		propsType: 'none',
		unique: 'Dp',
		levels: [LineLevels.document]
	},
	// Dv 文档标题顶部，右上角（版本号）
	{
		head: 'Dv',
		headFull: 'DocVersion',
		contentType: 'text',
		hasProps: 'none',
		propsType: 'none',
		unique: 'Dv',
		levels: [LineLevels.document]
	},
	// Ds 文档副标题
	{
		head: 'Ds',
		headFull: 'DocSubtitle',
		contentType: 'text',
		hasProps: 'none',
		propsType: 'none',
		unique: 'Ds',
		levels: [LineLevels.document]
	},
	// Da 作者
	{
		head: 'Da',
		headFull: 'DocAuthor',
		contentType: 'text',
		hasProps: 'optional',
		propsType: 'text',
		levels: [LineLevels.document]
	},
	// Df 文档脚注
	{
		head: 'Df',
		headFull: 'DocFootnote',
		contentType: 'text',
		hasProps: 'optional',
		propsType: 'text',
		levels: [LineLevels.document]
	},
	// P 全文音乐属性
	{
		head: 'P',
		headFull: 'Props',
		contentType: 'separated',
		hasProps: 'none',
		propsType: 'none',
		required: 1,
		unique: 'P',
		levels: [LineLevels.document]
	},
	// Pi 全文(隐)音乐属性
	{
		head: 'Pi',
		headFull: 'PropsImplicit',
		contentType: 'separated',
		hasProps: 'none',
		propsType: 'none',
		required: 1,
		unique: 'P',
		levels: [LineLevels.document]
	},
	// Rp 全文渲染属性
	{
		head: 'Rp',
		headFull: 'RenderProps',
		contentType: 'separated',
		hasProps: 'none',
		propsType: 'none',
		unique: 'Rp',
		levels: [LineLevels.document]
	},
	// T 文本标注
	{
		head: 'T',
		headFull: 'Text',
		contentType: 'text',
		hasProps: 'none',
		propsType: 'none',
		levels: [LineLevels.article],
		special: true
	},
	// S Article 标题
	{
		head: 'S',
		headFull: 'Section',
		contentType: 'text',
		hasProps: 'none',
		propsType: 'none',
		unique: 'S',
		levels: [LineLevels.article]
	},
	// Srp Article 渲染属性
	{
		head: 'Srp',
		headFull: 'SectionRenderProps',
		contentType: 'text',
		hasProps: 'none',
		propsType: 'none',
		unique: 'Srp',
		levels: [LineLevels.article],
		special: 'none'
	},
	// Sp Article 音乐属性
	{
		head: 'Sp',
		headFull: 'SectionProps',
		contentType: 'separated',
		hasProps: 'none',
		propsType: 'none',
		unique: 'Sp',
		levels: [LineLevels.article],
	},
	// B Fragment 前强制换行
	{
		head: 'B',
		headFull: 'Break',
		contentType: 'none',
		hasProps: 'none',
		propsType: 'none',
		unique: 'B',
		levels: [LineLevels.fragment]
	},
	// J Fragment 跳房子
	{
		head: 'J',
		headFull: 'Jumper',
		contentType: 'tokenized',
		hasProps: 'none',
		propsType: 'none',
		unique: 'J',
		levels: [LineLevels.fragment]
	},
	// Frp Fragment 渲染属性
	{
		head: 'Frp',
		headFull: 'FragmentRenderProps',
		contentType: 'separated',
		hasProps: 'none',
		propsType: 'none',
		unique: 'Frp',
		levels: [LineLevels.fragment]
	},
	// N 音符
	{
		head: 'N',
		headFull: 'Notes',
		contentType: 'tokenized',
		hasProps: 'optional',
		propsType: 'multiple',
		unique: 'N',
		required: 1,
		levels: [LineLevels.part]
	},
	// F 力度
	{
		head: 'F',
		headFull: 'Force',
		contentType: 'tokenized',
		hasProps: 'none',
		propsType: 'none',
		unique: 'F',
		levels: [LineLevels.part, LineLevels.lyricLine]
	},
	// C 和弦
	{
		head: 'C',
		headFull: 'Chord',
		contentType: 'tokenized',
		hasProps: 'none',
		propsType: 'none',
		unique: 'C',
		levels: [LineLevels.part, LineLevels.lyricLine]
	},
	// A 标记记号
	{
		head: 'A',
		headFull: 'Annotation',
		contentType: 'tokenized',
		hasProps: 'none',
		propsType: 'none',
		levels: [LineLevels.part, LineLevels.lyricLine]
	},
	// L 手动分割歌词
	{
		head: 'L',
		headFull: 'Lyric',
		contentType: 'tokenized',
		hasProps: 'optional',
		propsType: 'multiple',
		unique: 'L',
		required: 1,
		levels: [LineLevels.lyricLine]
	},
	// Lc 字基歌词
	{
		head: 'Lc',
		headFull: 'LyricChar',
		contentType: 'tokenized',
		hasProps: 'optional',
		propsType: 'multiple',
		unique: 'L',
		required: 1,
		levels: [LineLevels.lyricLine]
	},
	// Lw 词基歌词
	{
		head: 'Lw',
		headFull: 'LyricWord',
		contentType: 'tokenized',
		hasProps: 'optional',
		propsType: 'multiple',
		unique: 'L',
		required: 1,
		levels: [LineLevels.lyricLine]
	},
	// Ns 替代音符
	{
		head: 'Ns',
		headFull: 'NotesSubstitute',
		contentType: 'tokenized',
		hasProps: 'optional',
		propsType: 'multiple',
		levels: [LineLevels.lyricLine]
	}
]

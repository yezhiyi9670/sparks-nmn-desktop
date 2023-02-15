import { CodeToken } from "../tokenizer/tokenizer"

export interface RawLine {
	/**
	 * 行号
	 */
	lineNumber: number
	/**
	 * 行内单词
	 */
	tokens: CodeToken[]
	/**
	 * 行注释文本（含注释头）
	 */
	comment: string
	/**
	 * 原始文本
	 */
	text: string
}

export type CookedLine = {
	/**
	 * 行号
	 */
	lineNumber: number
} & ({
	/**
	 * 类型：指令行
	 */
	type: 'command'
	/**
	 * 指令头
	 */
	head: string
	/**
	 * 指令头的属性串
	 */
	props: CodeToken[] | null
	/**
	 * 指令内容
	 */
	content: CodeToken[]
	/**
	 * 原式属性文本
	 */
	propsText: string | null
	/**
	 * 原始文本
	 */
	text: string
} | {
	/**
	 * 类型：分隔线
	 */
	type: 'delimiter'
	/**
	 * 分隔线字符
	 */
	char: '-' | '='
})

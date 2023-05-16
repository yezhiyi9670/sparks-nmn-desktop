import { LineTree, mapTreeLines } from "../clns2lnt/LineTreeBuilder"
import { CookedLine } from "../commands/priLine"
import { addIssue, LinedIssue } from "../parser"
import { CodeToken } from "../tokenizer/tokenizer"
import { Tokens } from "../tokenizer/tokens"

export type SparseLine = {
	/**
	 * 行号
	 */
	lineNumber: number
} & ({
	head: 'Dt' | 'Dp' | 'Dv' | 'Ds' | 'T' | 'S'
	content: string
} | {
	head: 'Da' | 'Df'
	props: string | null
	content: string
} | {
	head: 'P' | 'Pi' | 'Rp' | 'Sp' | 'Frp'
	content: string[]
} | {
	head: 'B'
} | {
	head: 'J' | 'F' | 'C' | 'La'
	content: BracketPair
} | {
	head: 'A'
	content: BracketPair
	props: string
} | {
	head: 'N' | 'Na' | 'Lc' | 'Lw' | 'L' | 'Ns'
	props: BracketPair
	content: BracketPair
})

type CommandLineTree = LineTree<CookedLine & {type: 'command'}>

/**
 * 括号整体
 */
export interface BracketPair {
	/**
	 * 包含括号的范围
	 */
	range: [number, number]
	/**
	 * 括号类型（左括号为准）
	 */
	bracket: string
	rightBracket: string
	/**
	 * 括号内物质的 tokens
	 */
	tokens: (BracketPair | CodeToken)[][]
	/**
	 * 括号内物质的原始文本
	 */
	text: string
}

/**
 * Sparse 构造
 *
 * 这里的主要工作是配对括号并整体化，另外将对匹配失败的括号给出警告。(未闭合的左括号在行末闭合，多余或不配对的右括号丢弃)
 *
 * 如有需要，将在括号范围内进行逗号分割。
 */
export class SparseBuilder {
	/**
	 * 输入数据
	 */
	input: CommandLineTree | null = null
	
	constructor(input: CommandLineTree) {
		this.input = input
	}

	/**
	 * 处理
	 */
	parse(issues: LinedIssue[]): LineTree<SparseLine> {
		return mapTreeLines<CookedLine & {type: 'command'}, SparseLine>(this.input!, (line: CookedLine & {type: 'command'}) => this.handleLine(line, issues))
	}

	/**
	 * 处理行
	 */
	handleLine(line: CookedLine & {type: 'command'}, issues: LinedIssue[]): SparseLine {
		if(['Dt', 'Dp', 'Dv', 'Ds', 'T', 'S'].indexOf(line.head) != -1) {
			return {
				lineNumber: line.lineNumber,
				head: line.head as 'T',
				content: line.text
			}
		}
		if(['Da', 'Df'].indexOf(line.head) != -1) {
			return {
				lineNumber: line.lineNumber,
				head: line.head as 'Da',
				props: line.propsText,
				content: line.text
			}
		}
		if(['P', 'Pi', 'Rp', 'Sp', 'Srp', 'Frp'].indexOf(line.head) != -1) {
			return {
				lineNumber: line.lineNumber,
				head: line.head as 'P',
				content: line.text.split(' ').filter((str) => !!str)
			}
		}
		if(line.head == 'B') {
			return {
				lineNumber: line.lineNumber,
				head: line.head
			}
		}
		if(['J', 'F', 'C', 'A', 'La'].indexOf(line.head) != -1) {
			return {
				lineNumber: line.lineNumber,
				head: line.head as 'J',
				content: new BracketSplitter(line.content, line.text, line.lineNumber).parse(issues, line.head == 'J' ? 'true' : 'others'),
				...(line.head == 'A' && {
					props: line.propsText,
				})
			}
		}
		if(['N', 'Na', 'Ns'].indexOf(line.head) != -1) {
			return {
				lineNumber: line.lineNumber,
				head: line.head as 'N',
				props: new BracketSplitter(line.props ?? [Tokens.eof], line.propsText ?? '', line.lineNumber).parse(issues, 'true'),
				content: new BracketSplitter(line.content, line.text, line.lineNumber).parse(issues, 'others')
			}
		}
		if(['L', 'Lc', 'Lw'].indexOf(line.head) != -1) {
			return {
				lineNumber: line.lineNumber,
				head: line.head as 'L',
				props: new BracketSplitter(line.props ?? [Tokens.eof], line.propsText ?? '', line.lineNumber).parse(issues, 'true'),
				content: new BracketSplitter(line.content, line.text, line.lineNumber).parse(issues, 'others')
			}
		}
		throw new Error('SparseBuilder got something very new! ' + line.head)
	}
}

/**
 * 括号整体化
 * 
 * 这步处理后，将对非空的部分全部移除 eof token，对空的部分补加。
 */
class BracketSplitter {
	parenPairs: [string, string][] = [['(', ')'], ['[', ']'], ['[[', ']]'], ['{', '}']]
	separatorSymbol = ','
	/**
	 * 输入数据
	 */
	input: CodeToken[] = []
	/**
	 * 原始文本
	 */
	text: string = ''
	/**
	 * 行号
	 */
	lineNumber = 0
	/**
	 * 当前指针位置
	 */
	currentPtr = 0

	/**
	 * 读取当前单词
	 */
	peek() {
		return this.input[this.currentPtr]
	}
	/**
	 * 指针下一个
	 */
	pass() {
		return this.input[this.currentPtr++]
	}

	constructor(input: CodeToken[], text: string, lineNumber: number) {
		this.input = input
		this.text = text
		this.lineNumber = lineNumber
	}

	/**
	 * 处理括号整体化
	 */
	parse(issues: LinedIssue[], doSplit: 'true' | 'false' | 'others'): BracketPair {
		this.currentPtr = -1
		return this.handleFrag(-1, -1, issues, doSplit)
	}

	/**
	 * 处理片段
	 */
	handleFrag(bracketIndex: number, startIndex: number, issues: LinedIssue[], doSplit: 'true' | 'false' | 'others'): BracketPair {
		let shouldSplit = false
		if(doSplit == 'true') {
			shouldSplit = true
		} else if(doSplit == 'others') {
			shouldSplit = (bracketIndex != -1)
		}

		const rangeStart = this.currentPtr == -1 ? this.input[0].range[0] : this.peek().range[0]
		if(startIndex == -1) {
			startIndex = rangeStart
		}
		const ret: BracketPair = {
			range: [rangeStart, rangeStart],
			bracket: this.currentPtr == -1 ? '' : this.parenPairs[bracketIndex][0],
			rightBracket: this.currentPtr == -1 ? '' : this.parenPairs[bracketIndex][1],
			tokens: [],
			text: ''
		}
		const fragList = ret.tokens
		const rightBracket = bracketIndex == -1 ? '' : this.parenPairs[bracketIndex][1]

		let currentFrag: (BracketPair | CodeToken)[] | null = null

		const finalizeCurrent = () => {
			if(currentFrag !== null) {
				if(currentFrag.length == 0) {
					let endRange = this.peek().range[0]
					currentFrag.push({
						type: 'eof',
						content: '',
						range: [endRange, endRange],
						lineHead: false
					})
				}
			}
		}
		function createFrag() {
			finalizeCurrent()
			fragList.push([])
			currentFrag = fragList[fragList.length - 1]
		}
		function ensureCurrent() {
			if(currentFrag === null) {
				createFrag()
			}
		}
		if(!shouldSplit) {
			ensureCurrent()
		}

		this.pass()  // 跳过左括号
		while(true) {
			const curr = this.peek()
			if(curr === undefined) {
				throw new Error('WTF?')
			}
			if(curr.type == 'eof' || (curr.type == 'symbol' && curr.content == rightBracket)) { // 结束
				finalizeCurrent()
				// 跳过右括号
				if(curr.type != 'eof') {
					this.pass()
				}
				// 右括号缺失给出警告
				if(rightBracket != '' && curr.type == 'eof') {
					addIssue(issues,
						this.lineNumber, ret.range[0], 'error', 'unclosed_bracket',
						'Bracket here is unclosed.'
					)
				}
				// 结束
				ret.range[1] = curr.range[1]
				ret.text = this.text.substring(ret.range[0] - startIndex, ret.range[1] - startIndex)
				return ret
			}
			if(curr.type == 'symbol' && this.parenPairs.map(p => p[1]).indexOf(curr.content) != -1) { // 其他不该出现的括号
				// 警告
				addIssue(issues,
					this.lineNumber, curr.range[0], 'error', 'unpaired_bracket',
					'Bracket here is unpaired.'
				)
				this.pass()
				continue
			}
			if(curr.type == 'symbol') {
				const lprIndex = this.parenPairs.map(p => p[0]).indexOf(curr.content)
				if(lprIndex != -1) {
					// 解析新的括号
					ensureCurrent()
					currentFrag!.push(this.handleFrag(lprIndex, startIndex, issues, doSplit))
					continue
				}
				if(curr.content == this.separatorSymbol && shouldSplit) {
					// 分割
					ensureCurrent() // 这是应对开头加逗号的情况（这种情况不允许）
					createFrag()
					this.pass()
					continue
				}
			}
			// 其他情况直接插入
			ensureCurrent()
			currentFrag!.push(curr)
			this.pass()
		}
	}
}

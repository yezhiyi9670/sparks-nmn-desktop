import { createIssue, Issue } from "../issue/issue"

export type TokenType = 'word' | 'symbol' | 'stringLiteral' | 'comment' | 'eol' | 'eof'
export interface CodeToken {
	type: TokenType
	content: string
	lineHead: boolean
	range: [number, number]
}

export interface TokenizerOption {
	symbolChars: string
	symbolLigatures: string[]
	stringQuote: string
	commentStart: string[]
	commentQuote: [string, string][]
}

export const TokenizerOptions = {
	defaults: {
		symbolChars: '`' + `~!@#%^&*()-=+[{]}\|;:'",.<>/?`,
		symbolLigatures: [
			'===', '!==', '!=', '==', '<=', '>=', '->', '?.', '!!.', '!.', '**'
		],
		stringQuote: '"' + "'",
		commentStart: ['//', '#'],
		commentQuote: [['/*', '*/'] as [string, string]],
	},
	literal: {
		symbolChars: '`_$' + `~!@#%^&*()-=+[{]}\|;:'",.<>/?`,
		symbolLigatures: [],
		stringQuote: '"' + "'",
		commentStart: ['//'],
		commentQuote: [['/*', '*/'] as [string, string]]
	}
}

export interface TokenizeResult {
	result: CodeToken[]
	issues: Issue[]
}

/**
 * 代码令牌化
 */
export function tokenize(code: string, options: TokenizerOption = TokenizerOptions.defaults): TokenizeResult {
	let ret: CodeToken[] = []
	
	type Phase = {type: TokenType, start: number, end: number, content: string }
	let phaseTable: Phase[] = []
	let issues: Issue[] = []

	/**
	 * 加入新区段
	 */
	function pushPhase({ type, start, end, content }: Phase) {
		phaseTable.push({ type, start, end, content })
	}
	/**
	 * 加入新 Issue
	 */
	function pushIssue(issues1: Issue[] | undefined) {
		if(issues1) {
			for(let issue of issues1) {
				issues.push(issue)
			}
		}
	}

	/**
	 * 不同类型的令牌处理方式
	 */
	interface PhaseIntermediate {
		nextIndex: number
		content: string
		extra?: any
		issues?: Issue[]
		finalize?: boolean
	}
	interface PhaseFunction {
		// 暂未确定当前 Phase 时调用，若启动 Phase 成功返回 PhaseIntermediate，否则 null
		initialize: (index: number) => PhaseIntermediate | null
		// 继续处理当前 Phase，若 Phase 应当结束，返回 null
		reduce: (index: number, content: string, extra: any) => PhaseIntermediate | null
	}
	const phaseFunctions: {[_: string]: PhaseFunction} = {
		// 'word' | 'symbol' | 'stringLiteral' | 'comment' | 'eol' | 'eof'
		eof: { // 文件结束
			initialize: (index) => {
				if(index >= code.length) {
					return {nextIndex: index, content: ''}
				}
				return null
			},
			reduce: (index, content) => null
		},
		eol: { // 换行符
			initialize: (index) => {
				let len = 0
				if(code.substring(index, index + 2) == "\r\n") {
					len = 2
				} else if(["\r", "\n"].indexOf(code[index]) != -1) {
					len = 1
				}
				if(len > 0) {
					return {nextIndex: index + len, content: code.substring(index, index + len)}
				}
				return null
			},
			reduce: (index, content) => null
		},
		comment: { // 注释（解析后的 content 包含注释的起始/结束符号）
			initialize: (index) => {
				let commentType: "none" | "line" | "block" = 'none'
				let endQuote = ''
				let ptr = index
				for(let starter of options.commentStart) {
					if(code.substring(index, index + starter.length) == starter) {
						// 启动行注释
						commentType = 'line'
						ptr += starter.length
						break
					}
				}
				if(commentType == 'none') {
					for(let quotes of options.commentQuote) {
						if(code.substring(index, index + quotes[0].length) == quotes[0]) {
							// 启动块注释
							commentType = 'block'
							ptr += quotes[0].length
							endQuote = quotes[1]
							break
						}
					}
				}
				if(commentType == 'none') {
					return null
				}
				while(true) {
					if(commentType == 'block') {
						if(ptr >= code.length) {
							// 注释未结束但已经到达文件末尾
							return {nextIndex: ptr, content: code.substring(index, ptr),
								issues: [createIssue(index, 'error', 'token.unclosed_comment', 'Block comment is unclosed')]
							}
						} else if(code.substring(ptr, ptr + endQuote.length) == endQuote) {
							// 注释结束
							ptr += endQuote.length
							return {nextIndex: ptr, content: code.substring(index, ptr)}
						}
					} else {
						let endIndex = -1
						if(ptr >= code.length) {
							endIndex = 0
						} else if(code[ptr] == "\n") {
							endIndex = 1
						} else if(code[ptr] == "\r") {
							endIndex = 1
							if(code[ptr + 1] == "\n") {
								endIndex = 2
							}
						}
						if(endIndex >= 0) {
							ptr += endIndex
							return {nextIndex: ptr - endIndex, content: code.substring(index, ptr - endIndex)}
						}
					}
					ptr += 1
				}
			},
			reduce: (index, content) => null
		},
		stringLiteral: { // 字符串字面量
			initialize: (index) => {
				if(options.stringQuote.indexOf(code[index]) != -1) {
					return {nextIndex: index + 1, content: '', extra: code[index]}
				}
				return null
			},
			reduce: (index, content, stringQuote: string) => {
				let ptr = index
				if(ptr >= code.length) {
					return {nextIndex: ptr, content: content, extra: stringQuote,
						issues: [createIssue(index, 'error', 'token.unclosed_string', 'String is unclosed')],
					finalize: true}
				}
				if(stringQuote == code[index]) {
					return {nextIndex: ptr + 1, content: content, extra: stringQuote, finalize: true}
				} else if(code[index] == "\\") {
					let typeChar = code[index + 1]
					ptr += 2
					if(typeChar == "\\" || typeChar == '"' || typeChar == "'") {
						content += typeChar
					} else if(typeChar == 'r') {
						content += "\r"
					} else if(typeChar == 'n') {
						content += "\n"
					} else if(typeChar == 't') {
						content += "\t"
					} else if(typeChar == 'x') {
						ptr += 2
						let seq = code.substring(index, ptr)
						try {
							seq = JSON.parse('"' + seq + '"')
						} catch(err) {
							return {nextIndex: ptr, content: content, extra: stringQuote,
								issues: [createIssue(index, 'error', 'token.invalid_escape', 'Invalid escape sequence ${0}', seq)]
							}
						}
						content += seq
					} else if(typeChar == 'u') {
						ptr += 4
						let seq = code.substring(index, ptr)
						try {
							seq = JSON.parse('"' + seq + '"')
						} catch(err) {
							return {nextIndex: ptr, content: content, extra: stringQuote,
								issues: [createIssue(index, 'error', 'token.invalid_escape', 'Invalid escape sequence ${0}', seq)]
							}
						}
						content += seq
					}
				} else {
					if(code[index] != "\r" && code[index] != "\n") {
						content += code[index]
					}
					ptr += 1
				}
				return {nextIndex: ptr, content: content, extra: stringQuote}
			}
		},
		symbol: { // 符号
			initialize: (index) => {
				if(options.symbolChars.indexOf(code[index]) != -1) {
					for(let multiSymbol of options.symbolLigatures) {
						// 匹配多字符符号
						if(multiSymbol == code.substring(index, index + multiSymbol.length)) {
							return {nextIndex: index + multiSymbol.length, content: multiSymbol}
						}
					}
					// 作为单字符符号处理
					return {nextIndex: index + 1, content: code[index]}
				}
				return null
			},
			reduce: (index, content) => null
		},
		word: {
			initialize: (index) => {
				if(options.symbolChars.indexOf(code[index]) == -1 && code[index].substring(0,1).trim() != '') {
					return {nextIndex: ptr + 1, content: code[index]}
				}
				return null
			},
			reduce: (index, content) => {
				if(index >= code.length || options.symbolChars.indexOf(code[index]) != -1 || code[index].substring(0,1).trim() == '') {
					return null
				}
				return {nextIndex: index + 1, content: content + code[index]}
			}
		}
		// 没有可食用的 Phase，则指针后移继续匹配。
	}

	let lastStart = 0
	let ptr = 0
	let currentPhase: TokenType | null = null
	let currentContent = ''
	let currentExtra: any = null
	while(true) {
		// Has phase?
		if(currentPhase === null) {
			// call initialize
			let result: PhaseIntermediate | null = null
			for(let phaseType in phaseFunctions) {
				result = phaseFunctions[phaseType].initialize(ptr)
				if(result !== null) {
					lastStart = ptr
					ptr = result.nextIndex
					currentContent = result.content
					currentExtra = result.extra
					currentPhase = phaseType as TokenType
					pushIssue(result.issues)
					break
				}
			}
			if(result === null) {
				ptr += 1
			}
		} else {
			// call reduce
			let result: PhaseIntermediate | null = phaseFunctions[currentPhase].reduce(
				ptr, currentContent, currentExtra
			)
			if(result !== null) {
				ptr = result.nextIndex
				currentContent = result.content
				currentExtra = result.extra
				pushIssue(result.issues)
			}
			if(result == null || result.finalize) {
				pushPhase({type: currentPhase, start: lastStart, end: ptr, content: currentContent})
				if(currentPhase == 'eof') {
					break
				}
				currentPhase = null
			}
		}
	}

	let prevEol = true
	for(let phase of phaseTable) {
		ret.push({type: phase.type, range: [phase.start, phase.end], content: phase.content, lineHead: prevEol})
		if(phase.type == 'eol') {
			prevEol = true
		} else {
			prevEol = false
		}
	}

	return {
		result: ret,
		issues: issues
	}
}

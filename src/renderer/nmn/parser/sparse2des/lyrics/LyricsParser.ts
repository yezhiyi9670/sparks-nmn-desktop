import { BracketPair } from "../../lnt2sparse/SparseBuilder";
import { addIssue, LinedIssue } from "../../parser";
import { BracketFilter, BracketPairFilters, BracketTokenList, TokenFilter, Tokens } from "../../tokenizer/tokens";
import { ScoreContext } from "../context";
import { LyricChar, LyricDestructionType } from "../types";
import { LyricToken } from "./lrctokens";
import { getLrcSymbolType } from "./symbols";

export class LyricsParser {
	input: BracketTokenList
	lineNumber: number
	context: ScoreContext

	tokenPtr = 0
	charPtr = 0

	getchar(): BracketPair | string | undefined {
		const token = this.input[this.tokenPtr]
		if(token === undefined) {
			return undefined
		}
		if('bracket' in token) {
			return token
		}
		if(token.type == 'stringLiteral') {
			return token.content
		}
		return token.content[this.charPtr]
	}
	passchar(): BracketPair | string | undefined {
		const token = this.input[this.tokenPtr]
		if(token === undefined) {
			return undefined
		}
		if('bracket' in token) {
			this.tokenPtr += 1
			return token
		}
		if(token.type == 'stringLiteral') {
			this.tokenPtr += 1
			return token.content
		}
		const ret = token.content[this.charPtr]
		this.charPtr += 1
		if(this.charPtr >= token.content.length) {
			this.charPtr = 0
			this.tokenPtr += 1
		}
		return ret
	}
	checkBoundary() {
		return this.charPtr == 0
	}
	
	constructor(input: BracketTokenList, lineNumber: number, context: ScoreContext) {
		this.input = input
		this.lineNumber = lineNumber
		this.context = context
	}

	parseLyrics(issues: LinedIssue[], typeSampler: LyricDestructionType): LyricChar[] {
		if(typeSampler != 'manual') {
			const lrcTokens = this.getLrcTokens(issues, typeSampler)
			const checks: boolean[] = Array(lrcTokens.length).fill(false)
			function isChecked(index: number) {
				if(index < 0 || index >= checks.length) {
					return true
				}
				return checks[index]
			}
			// 以 char, grouped, placeholder 和 divide 为中心，向两侧延伸，并避免重叠
			const ret: LyricChar[] = []
			for(let i = 0; i < lrcTokens.length; i++) {
				const token = lrcTokens[i]
				if(token.type == 'char' || token.type == 'grouped' || token.type == 'divide' || token.type == 'placeholder') {
					checks[i] = true
					let lpt = i, rpt = i
					let grouped = token.type == 'grouped'
					let rolePrefix: string | undefined = undefined as any
					let prefix = ''
					let postfix = ''
					let extension = token.type == 'char' && token.lastPlaceholder == '_'
					let occupiesSpace = token.type != 'divide'
					let text = ''
					while(!isChecked(lpt - 1)) {
						lpt -= 1
						checks[lpt] = true
						const token = lrcTokens[lpt]!
						if(token.type == 'symbol' && token.slot == 'before') {
							prefix = token.char + prefix
						} else if(token.type == 'role') {
							rolePrefix = rolePrefix ?? ''
							rolePrefix = token.char + rolePrefix
						} else {
							checks[lpt] = false
							break
						}
					}
					while(!isChecked(rpt + 1)) {
						rpt += 1
						checks[rpt] = true
						const token = lrcTokens[rpt]!
						if(token.type == 'symbol' && token.slot == 'after') {
							postfix = postfix + token.char
						} else {
							checks[rpt] = false
							break
						}
					}
					if(token.type == 'placeholder') {
						text = ''
						if(token.char == '_') {
							extension = true
						}
					} else {
						text = token.char
					}
					ret.push({
						text: text,
						prefix: prefix,
						postfix: postfix,
						rolePrefix: rolePrefix,
						occupiesSpace: occupiesSpace,
						grouped: grouped,
						extension: extension,
						isCharBased: (token.type == 'placeholder' || token.type == 'divide') || (
							(token.type == 'char' || token.type == 'grouped') && token.isCharBased
						)
					})
				}
			}
			// 出现未使用的符号，予以警告
			let nonCheckedIndex = -1
			for(let i = 0; i < lrcTokens.length; i++) {
				if(!isChecked(i)) {
					nonCheckedIndex = i
					break
				}
			}
			if(nonCheckedIndex != -1) {
				addIssue(issues,
					this.lineNumber, lrcTokens[nonCheckedIndex].charIndex, 'warning', 'lrc_unused_symbol',
					'This lyric symbol is invalid here and is ignored'
				)
			}
			// 返回结果
			return ret
		} else {
			return this.parseManualLyrics(issues)
		}
	}

	getLrcTokens(issues: LinedIssue[], typeSampler: LyricDestructionType): LyricToken[] {
		this.tokenPtr = 0
		this.charPtr = 0
		const ret: LyricToken[] = []
		let lastToken: LyricToken | undefined = undefined as any
		while(true) {
			const ch = this.getchar()
			if(ch === undefined) {
				break
			}
			if(typeof(ch) == 'object') {
				this.passchar()
				if(ch.bracket == '(' || ch.bracket == '[[') {
					const brPad = ch.bracket.length
					ret.push(lastToken = {
						charIndex: ch.range[0],
						type: ch.bracket == '[[' ? 'role' : 'grouped',
						char: ch.text.substring(brPad, ch.text.length - brPad),
						isCharBased: typeSampler == 'char'
					})
				} else if(ch.bracket == '[') {
					ret.push(lastToken = {
						charIndex: ch.range[0],
						type: 'symbol',
						slot: 'before',
						char: '['
					})
					const innerResult = new LyricsParser(Tokens.join(ch.tokens, {
						type: 'symbol',
						range: [0, 0],
						lineHead: false,
						content: ',',
					}), this.lineNumber, this.context).getLrcTokens(issues, 'word')
					for(let item of innerResult) {
						ret.push(lastToken = item)
					}
					ret.push(lastToken = {
						charIndex: ch.range[1] - 1,
						type: 'symbol',
						slot: 'after',
						char: ']'
					})
				} else {
					addIssue(issues,
						this.lineNumber, ch.range[0], 'error', 'unexpected_lrc_bracket',
						'Unexpected bracket ${0} in lyrics',
						ch.bracket + ch.rightBracket
					)
				}
			} else {
				const charIndex = this.input[this.tokenPtr]!.range[0]
				const isBoundary = this.checkBoundary()
				const token = this.input[this.tokenPtr]
				let symbolType = getLrcSymbolType(ch, typeSampler)
				// if(token && ('bracket' in token || token.type == 'stringLiteral')) {
				// 	symbolType = 'word'
				// }
				this.passchar()
				if(symbolType == 'word') {
					if(typeSampler == 'word' && !isBoundary && lastToken && lastToken.type == 'char') {
						lastToken.char += ch
					} else {
						ret.push(lastToken = {
							charIndex: charIndex,
							type: 'char',
							char: ch,
							isCharBased: typeSampler == 'char'
						})
					}
				} else if(symbolType == 'divide' || symbolType == 'placeholder') {
					let repeats = 1
					if(lastToken && symbolType == 'placeholder') {
						lastToken.lastPlaceholder = ch
					}
					// Check if we have repeats
					const token2 = this.getchar()
					if(token2 && typeof(token2) == 'object' && token2.bracket == '{') {
						this.passchar()
						const number2str = token2.text.substring(1, token2.text.length - 1)
						if(/^(\d+)$/.test(number2str)) {
							repeats = +number2str
							if(repeats >= 65536) {
								repeats = 1
							}
						} else {
							addIssue(issues,
								this.lineNumber, token2.range[0], 'error', 'invalid_placeholder_repeat',
								'Invalid repeats `${0}` for placeholder',
								number2str
							)
						}
					}
					for(let i = 0; i < repeats; i++) {
						ret.push(lastToken = {
							charIndex: charIndex,
							type: symbolType,
							char: ch
						})
					}
				} else if(symbolType == 'postfix' || symbolType == 'prefix') {
					ret.push(lastToken = {
						charIndex: charIndex,
						type: 'symbol',
						slot: symbolType == 'postfix' ? 'after' : 'before',
						char: ch
					})
				} else {
					const _: never = symbolType
				}
			}
		}
		return ret
	}

	parseManualLyrics(issues: LinedIssue[]): LyricChar[] {
		/*
			Manually separated lyrics:
			let/it/"go"","/let/it/"go"","/can't/hold/it/back/a/#"-"/ny/"more""."_
			末尾的一个下划线指代的是延长线符号。单独的下划线表示单独延长线；同样地，单独的百分号或者两个紧邻的斜杠都能表示空白。
		*/
		const wordTokens = Tokens.split(this.input, [
			new TokenFilter('symbol', '/')
		])
		const words = wordTokens.map((tokens): LyricChar => {
			let extend = false
			if(tokens.length > 0 && new TokenFilter('symbol', '_').test(
				tokens[tokens.length - 1]
			)) {
				extend = true
				tokens = tokens.slice(0, tokens.length - 1)
			}
			let role: string | undefined = undefined
			if(tokens.length > 0 && new BracketFilter('[[').test(
				tokens[0]
			)) {
				role = (tokens[0] as BracketPair).tokens.map((tokens) => {
					return Tokens.stringify(tokens, ' ', ', ')
				}).join('')
			}
			let spaceless = false
			if(tokens.length > 0 && new TokenFilter('symbol', '#').test(
				tokens[0]
			)) {
				spaceless = true
				tokens = tokens.slice(1)
			}
			let grouped = false
			if(tokens.length > 0 && new TokenFilter('symbol', '@').test(
				tokens[0]
			)) {
				grouped = true
				tokens = tokens.slice(1)
			}
			const [ prefix, text, postfix ] = (() => {
				let result0 = new BracketPairFilters(
					new TokenFilter('stringLiteral', null)
				).test(tokens)
				if(result0) {
					return ['', result0[0] as string, '']
				}
				result0 = new BracketPairFilters(
					new TokenFilter('stringLiteral', null),
					new TokenFilter('stringLiteral', null)
				).test(tokens)
				if(result0) {
					return ['', result0[0] as string, result0[1] as string]
				}
				result0 = new BracketPairFilters(
					new TokenFilter('stringLiteral', null),
					new TokenFilter('stringLiteral', null),
					new TokenFilter('stringLiteral', null)
				).test(tokens)
				if(result0) {
					return [result0[0] as string, result0[1] as string, result0[2] as string]
				}
				return ['', Tokens.stringify(tokens, '', ','), '']
			})()
			return {
				text: text,
				occupiesSpace: !spaceless,
				grouped: grouped,
				prefix: prefix,
				postfix: postfix,
				rolePrefix: role,
				extension: extend,
				isCharBased: false
			}
		})
		return words
	}
}

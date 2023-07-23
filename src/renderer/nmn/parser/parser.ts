import { CookedLine, RawLine } from "./commands/priLine"
import { checkConcat } from "../util/array"
import { LineTree, LineTreeBuilder } from "./clns2lnt/LineTreeBuilder"
import { createIssue, Issue, Severity } from "./issue/issue"
import { tokenize, TokenizerOption, TokenizerOptions } from "./tokenizer/tokenizer"
import { TokenFilter, Tokens } from "./tokenizer/tokens"
import { SparseBuilder, SparseLine } from "./lnt2sparse/SparseBuilder"
import { Destructor } from "./sparse2des/Destructor"
import { DestructedFCA, DestructedScore, MusicSection } from "./sparse2des/types"
import { ColumnStater } from "./des2cols/ColumnStater"
import { Linifier } from "./linify/linify"
import { ColumnScore, LinedArticle } from "./des2cols/types"
import { getCommandDef } from "./commands"
import { SparksNMN } from ".."
import { SequencedScoreData } from "./sequence/types"
import { SequenceReader } from "./sequence/SequenceReader"

const tokenOption: TokenizerOption = {
	symbolChars: '`_$' + `~!@#%^&*()-=+[{]}\|;:",.<>/?`,
	symbolLigatures: ['[[', ']]'],
	stringQuote: '"',
	commentStart: ['//'],
	commentQuote: []
}

const tokenParens: [string, string][] = [['(', ')'], ['{', '}'], ['[', ']'], ['[[', ']]']]

export type LinedIssue = Issue & {
	/**
	 * 行号
	 */
	lineNumber: number
	/**
	 * 是否被渲染
	 */
	rendered: boolean
}

export function addIssue(issues: LinedIssue[], lineNumber: number, index: number, severity: Severity, key: string, defaultTranslation: string, ...args: string[]) {
	const issue = createIssue(index, severity, key, defaultTranslation, ...args)
	const linedIssue: LinedIssue = Object.assign({}, { lineNumber, rendered: false }, issue)
	issues.push(linedIssue)
}

export function addRenderedIssue(issues: LinedIssue[], lineNumber: number, index: number, severity: Severity, key: string, defaultTranslation: string, ...args: string[]) {
	const issue = createIssue(index, severity, key, defaultTranslation, ...args)
	const linedIssue: LinedIssue = Object.assign({}, { lineNumber, rendered: true }, issue)
	issues.push(linedIssue)
}

type CommandLineTree = LineTree<CookedLine & {type: 'command'}>
export type SectionPositions = {[lineNumber: number]: {
	/**
	 * 行指令
	 */
	head: string
	/**
	 * 对应音符行的行号
	 */
	master: number
	/**
	 * 各序号对应的 id
	 */
	ids: {[ordinal: number]: string}
}}

class ParserClass {
	/**
	 * 解析文本文档
	 */
	parse(doc: string) {
		const issues: LinedIssue[] = []
		const lns = this.txt2lns(doc, issues)
		const clns = this.lns2clns(lns, issues)
		const lnt = this.clns2lnt(clns, issues)
		const sparse = this.lnt2sparse(lnt, issues)
		const des = this.sparse2des(sparse, issues)
		const finalResult = this.des2cols(des, issues)

		const sectionPositions = this.statSectionPositions(finalResult.lined)
		const sequencedResult: SequencedScoreData = new SequenceReader(finalResult.flattened, issues).parse()

		const packedResult = {
			// phase: {
			// 	lns,
			// 	clns,
			// 	lnt,
			// 	sparse,
			// },
			result: finalResult.lined,
			sequenced: sequencedResult,
			issues,
			sectionPositions
		}

		// 奶奶的，删掉！
		// console.log(packedResult)

		return packedResult
	}

	/**
	 * 找出需要高亮的小节 masterId
	 */
	getHighlightedSection(table: SectionPositions, code: string, position: [number, number]): string | undefined {
		const unconvertResult = SparksNMN.unconvertCursor(code, position)
		const lineCode = unconvertResult.code
		position = unconvertResult.position

		// ===== 确定所在行 =====
		const lineNumber = position[0]
		if(!(lineNumber in table)) {
			return undefined
		}
		const tableLine = table[lineNumber]
		const tableLineMaster = table[tableLine.master]

		// ===== 确定命令头匹配 =====
		const tokens = tokenize(lineCode, tokenOption).result
		if(tokens[0].type != 'word') {
			return undefined
		}
		const commandDef = getCommandDef(tokens[0].content)
		if(!commandDef || commandDef.head != tableLine.head) {
			return undefined
		}
		const colonIndex = new TokenFilter('symbol', ':').findInLayered(tokens, tokenParens)
		if(colonIndex == -1) {
			return undefined
		}
		if(tokens[colonIndex].range[1] > position[1]) {
			return undefined
		}

		// ===== 找小节线区间 =====
		const parens = tokenParens
		let parenChecker = Array(parens.length).fill(0) as number[]
		function checkParen(symbolContent: string) {
			for(let i = 0; i < parens.length; i++) {
				if(parens[i][0] == symbolContent) {
					parenChecker[i] += 1
				}
				if(parens[i][1] == symbolContent) {
					parenChecker[i] -= 1
				}
			}
		}
		function isAllZero() {
			return parenChecker.filter((val) => !!val).length == 0
		}
		const sectionSeparatorRanges: [number, number][] = []
		let lastRange: [number, number] | undefined = [0, 0]  // 利用这种方法跳过排在最前面的小节线
		for(let index = colonIndex + 1; index < tokens.length; index++) {
			const token = tokens[index]
			if(token.type == 'symbol') {
				checkParen(token.content)
			}
			const currentState = token.type == 'symbol' && ([':', '|', '/'].includes(token.content)) && isAllZero()
			if(currentState) {
				if(lastRange) {
					lastRange[1] = token.range[1]
				} else {
					sectionSeparatorRanges.push(lastRange = [token.range[0], token.range[1]])
				}
			} else {
				lastRange = undefined
			}
		}

		// ===== 根据区间确定下标 ======
		let ordinal = 0
		for(let range of sectionSeparatorRanges) {
			if(range[1] > position[1]) {
				break
			}
			ordinal += 1
		}

		const ids = tableLine.ids
		if(ordinal in ids) {
			return ids[ordinal]
		}
		if(ordinal in tableLineMaster.ids) {
			return tableLineMaster.ids[ordinal]
		}
		return undefined
	}

	/**
	 * 根据最终的解析结果统计各行号对应的高亮小节
	 */
	statSectionPositions(data: ColumnScore<LinedArticle>): SectionPositions {
		const ret: SectionPositions = {}
		
		function addSectionInfo(head: string, master: number, lineNumber: number, ordinal: number, masterId: string) {
			if(!(lineNumber in ret)) {
				ret[lineNumber] = {
					head: head,
					master: master,
					ids: {}
				}
			}
			const currLine = ret[lineNumber]
			if(!(ordinal in currLine.ids)) {
				currLine.ids[ordinal] = masterId
			}
		}
		function handleSections(head: string, masterSections: MusicSection<unknown>[], sections: MusicSection<unknown>[]) {
			sections.forEach((section, index) => {
				if(section.idCard.masterId != '' && section.idCard.lineNumber != -1) {
					const masterSection = masterSections[index]
					const master = masterSection?.idCard.lineNumber ?? section.idCard.lineNumber
					addSectionInfo(head, master, section.idCard.lineNumber, section.idCard.index, section.idCard.masterId)
				}
			})
		}
		function handleFCA(masterSections: MusicSection<unknown>[], data: DestructedFCA) {
			data.fcaItems.forEach((ann) => {
				handleSections(ann.head, masterSections, ann.sections)
			})
		}
		data.articles.forEach((article) => {
			if(article.type != 'music') {
				return
			}
			article.lines.forEach((line) => {
				line.parts.forEach((part) => {
					handleSections(part.notes.head, part.notes.sections, part.notes.sections)
					handleFCA(part.notes.sections, part)
					part.lyricLines.forEach((lrcLine) => {
						handleFCA(part.notes.sections, lrcLine)
						if(lrcLine.lyricAnnotations) {
							handleSections('La', part.notes.sections, lrcLine.lyricAnnotations.sections)
						}
					})
				})
			})
		})

		return ret
	}

	/*
	解析顺序
	txt (Text)
	lns (RawTokenizedLines)
	clns (CookedTokenizedLines)
	lnt (LineTree)
	spr (Sparse, 这一步将每一行在 CommandDef 定义的框架下处理，并进行进一步验证。tokenized 括号匹配也在这里完成)
	des (Destructed, 这一步处理掉所有内容)
	cols (Columns, 分配渲染行，渲染内容整理成渲染列)
	*/

	/**
	 * 文本文档解析到行列表
	 */
	txt2lns(doc: string, issues: LinedIssue[]): RawLine[] {
		const ret: RawLine[] = []

		const lines = Linifier.linify(doc)

		for(let lineObj of lines) {
			const { text: line, lineNumber } = lineObj

			let tokenResult = tokenize(line, tokenOption)
			checkConcat(issues, tokenResult.issues.map((issue) => {
				return {
					...issue,
					lineNumber: lineNumber
				}
			}))
			let tokens = tokenResult.result
			
			let startIndex = tokens[0].range[0]
			let commentText = ''
			const eofToken = tokens.pop()
			let endIndex = eofToken!.range[0]
			let tailToken = tokens[tokens.length - 1]
			let text = line
			if(tailToken && tailToken.type == 'comment') {
				// 取出行末的注释文本
				commentText = tailToken.content
				tokens.pop()
				endIndex = tailToken.range[0]
				text = text.substring(0, tailToken.range[0])
			}
			tokens.push(eofToken!)

			ret.push({
				lineNumber,
				tokens,
				comment: commentText,
				text: text
			})
		}
		
		return ret
	}

	/**
	 * 行列表解析到行类型列表
	 */
	lns2clns(lines: RawLine[], issues: LinedIssue[]): CookedLine[] {
		const result = lines.map((line): CookedLine | undefined => {
			const tokens = line.tokens

			// 空白行（仅包含 EOF）
			if(tokens.length == 1) {
				return undefined
			}
			// 分隔线
			for(let delChar of ['-', '=']) {
				if(new TokenFilter('symbol', delChar).test(tokens)) {
					const ret: CookedLine = {
						lineNumber: line.lineNumber,
						type: 'delimiter',
						char: delChar as any
					}
					return ret
				}
			}
			// 指令行 (be tolerant)
			if(new TokenFilter('word', null).test(tokens[0])) {
				// 找到冒号，即确定是指令行
				const colonIndex = new TokenFilter('symbol', ':').findInLayered(tokens, tokenParens)
				if(colonIndex != -1) {
					const origText = line.text.substring(tokens[colonIndex].range[1])
					const origTextTrimStart = origText.trimStart()
					const origTextTrimStartEnd = origTextTrimStart.trimEnd()
					let ret: CookedLine = {
						lineNumber: line.lineNumber,
						type: 'command',
						head: tokens[0].content,
						props: null,
						content: tokens.slice(colonIndex + 1),
						text: origTextTrimStartEnd,
						textRange: [
							tokens[colonIndex].range[1] + origText.length - origTextTrimStart.length,
							origText.length - (origTextTrimStart.length - origTextTrimStartEnd.length)
						],
						propsText: null
					}
					// 若冒号不是紧随其后，则应当有属性参数
					if(colonIndex > 1) {
						const lprToken = tokens[1]
						const rprToken = tokens[colonIndex - 1]
						// 格式不正确的属性参数
						if(!new TokenFilter('symbol', '[').test(lprToken) || !new TokenFilter('symbol', ']').test(rprToken)) {
							addIssue(issues,
								line.lineNumber, tokens[1]!.range[0], 'error', 'bad_command_format',
								'Command line format does not look right. It should be something like "Head: content" or "Head[props]: content".'
							)
						} else {
							const fakeEOF = { ...tokens[tokens.length - 1] }
							fakeEOF.range = [tokens[colonIndex - 1].range[1], tokens[colonIndex - 1].range[1]]
							ret.props = tokens.slice(2, colonIndex - 1).concat([fakeEOF])
							ret.propsText = line.text.substring(tokens[2].range[0], tokens[colonIndex - 1].range[0]).trim()
						}
					}
					return ret
				}
			}
			// 不知道是啥
			addIssue(issues,
				line.lineNumber, tokens[0]!.range[0], 'warning', 'wtf_line',
				'Cannot determine what this line is. If it is a comment, prepend it with "//".'
			)
			return undefined
		}).filter((value) => value !== undefined)
		return result as CookedLine[]
	}

	/**
	 * 行类型列表解析到树
	 */
	clns2lnt(lines: CookedLine[], issues: LinedIssue[]): CommandLineTree {
		return new LineTreeBuilder(lines).parse(issues)
	}

	/**
	 * 行树内容初步解析
	 */
	lnt2sparse(lnt: CommandLineTree, issues: LinedIssue[]): LineTree<SparseLine> {
		return new SparseBuilder(lnt).parse(issues)
	}

	/**
	 * 结构解析
	 */
	sparse2des(sparse: LineTree<SparseLine>, issues: LinedIssue[]) {
		return new Destructor(sparse).parse(issues)
	}

	/**
	 * 列解构与分析
	 */
	des2cols(des: DestructedScore, issues: LinedIssue[]) {
		return new ColumnStater(des).parse(issues)
	}
}

export const Parser = new ParserClass()

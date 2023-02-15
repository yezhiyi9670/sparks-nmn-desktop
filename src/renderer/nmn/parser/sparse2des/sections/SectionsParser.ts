import { inCheck, pushIfNonNull } from "../../../util/array";
import { Frac, Fraction } from "../../../util/frac";
import { MusicTheory } from "../../../util/music";
import { randomToken } from "../../../util/random";
import { BracketPair } from "../../lnt2sparse/SparseBuilder";
import { addIssue, LinedIssue } from "../../parser";
import { BracketPairFilters, BracketToken, BracketTokenList, TokenFilter, Tokens } from "../../tokenizer/tokens";
import { AttrMatcher } from "../AttrMatcher";
import { ScoreContext } from "../context";
import { AttrShift, MusicProps, MusicSection, NoteCharAny, NoteCharMusic, SectionSeparator, SectionSeparatorChar, sectionSeparatorCharMap, SectionSeparators, SeparatorAttr, SeparatorAttrBase } from "../types";
import { NoteEater } from "./NoteEater";

type RangedSectionSeparators = SectionSeparators & {
	range: [number, number]
}
type SampledSection<TypeSampler> = MusicSection<NoteCharAny & {type: TypeSampler}>

class SectionsParserClass {
	parseSections<TypeSampler>(tokens: BracketTokenList, lineNumber: number, issues: LinedIssue[], context: ScoreContext, typeSampler: TypeSampler, acceptVariation?: boolean): SampledSection<TypeSampler>[] {
		// 空的？
		if(
			tokens.length == 0 || // 可能从 NotesSubstitute 截取而来
			(tokens.length == 1 && !('bracket' in tokens[0]) && tokens[0].type == 'eof')
		) {
			return []
		}
		// ===== 获取 :|/ 构成的连续区间 =====
		function isSeparatorSymbol(token: BracketToken) {
			if('bracket' in token) {
				return false
			}
			if(token.type == 'symbol') {
				if(['|', '/', ':'].indexOf(token.content) != -1) {
					return true
				}
			}
			return false
		}
		let separatorRanges: [number, number][] = [];
		(() => {
			let prevFlag = false
			let currRange: [number, number] = [0, 0]
			for(let i = 0; i < tokens.length; i++) {
				const token = tokens[i]
				const flag = isSeparatorSymbol(token)
				if(flag) {
					if(prevFlag == false) {
						currRange = [i, i + 1]
						separatorRanges.push(currRange)
					} else {
						currRange[1] += 1
					}
				}
				prevFlag = flag
			}
		})()
		// ===== 解析小节线（无法解析的，默认虚线并警告） =====
		let separators: RangedSectionSeparators[] = separatorRanges.map((range) => {
			let chars = tokens.slice(range[0], range[1]).map((token) => {
				if('bracket' in token) {
					return ''
				}
				return token.content
			}).join('')
			if(!inCheck(chars, sectionSeparatorCharMap)) {
				addIssue(issues,
					lineNumber, tokens[range[0]].range[0], 'error', 'unknown_section_separator',
					'Cannot interpret ${0} as a section separator',
					chars
				)
				chars = '/|'
			}
			const apart = sectionSeparatorCharMap[chars]
			return {
				range: range,
				after: {
					char: apart[0] as SectionSeparatorChar,
					attrs: []
				},
				before: {
					char: apart[1] as SectionSeparatorChar,
					attrs: []
				},
				next: {
					char: chars as SectionSeparatorChar,
					attrs: []
				}
			}
		})
		// ===== 扩张连续区间以提取小节线属性 =====
		separators.forEach((sep) => {
			function isLargeBracket(item: BracketToken | undefined) {
				if(item && ('bracket' in item) && item.bracket == '{') {
					return true
				}
				return false
			}
			if(isLargeBracket(tokens[sep.range[1]])) {
				sep.next.attrs = this.matchSeparatorAttr(
					(tokens[sep.range[1]] as BracketPair).tokens,
					lineNumber, issues
				)
				sep.range[1] += 1
			}
			if(isLargeBracket(tokens[sep.range[1]])) {
				sep.before.attrs = this.matchSeparatorAttr(
					(tokens[sep.range[1]] as BracketPair).tokens,
					lineNumber, issues
				)
				sep.range[1] += 1
			}
			if(isLargeBracket(tokens[sep.range[0] - 1])) {
				sep.after.attrs = this.matchSeparatorAttr(
					(tokens[sep.range[0] - 1] as BracketPair).tokens,
					lineNumber, issues
				)
				sep.range[0] -= 1
			}
		})
		// ===== 提取小节线之间的小节并解析（对空白小节、属性区间重叠进行警告） =====
		let ret: MusicSection<NoteCharAny & {type: TypeSampler}>[] = []
		function virtualLine(rangeL: number, rangeR: number): RangedSectionSeparators {
			return {
				range: [rangeL, rangeR],
				before: { char: '/', attrs: [] },
				after: { char: '/', attrs: [] },
				next: { char: '/', attrs: [] }
			}
		}
		if(separators.length == 0 || separators[0].range[0] > 0) {
			// 第一个小节线之前有小节
			separators = [virtualLine(0, 0)].concat(separators)
		}
		const lastIndex = separators[separators.length - 1].range[1]
		if(tokens.length != lastIndex) {
			// 末尾小节之后有小节
			separators.push(virtualLine(tokens.length, tokens.length))
		}
		for(let i = 1; i < separators.length; i++) {
			let lpt = separators[i - 1].range[1]
			let rpt = separators[i].range[0]
			if(lpt >= rpt) {
				rpt = lpt
				addIssue(issues,
					lineNumber, Tokens.rangeSafe(tokens, rpt, 0),
					'error', 'empty_section',
					'This section is empty. Empty sections should be placeheld using "empty", otherwise it may cause unexpected behavior.'
				)
			}
			// 根据上一小节的 next 属性和此小节的 before 属性修改当前的音乐属性
			const handleAttr = (attr: SeparatorAttr) => {
				if(attr.type == 'beats') {
					context.musical = Object.assign({}, context.musical)
					context.musical.beats = attr.beats
				}
				if(attr.type == 'qpm') {
					context.musical = Object.assign({}, context.musical)
					context.musical.qpm = attr.qpm
				}
				if(attr.type == 'shift') {
					context.musical = this.handleShift(context.musical, attr)
				}
			}
			for(let attr of separators[i - 1].next.attrs) {
				if(attr.type == 'beats') {
					// beats 不能放置于小节线上方，警告并忽略
					addIssue(issues,
						lineNumber, attr.range[0], 'warning', 'attr_beats_above',
						'Beats attribute cannot appear above a section separator'
					)
				} else {
					if(acceptVariation) {
						handleAttr(attr)
					}
				}
			}
			for(let attr of separators[i - 1].before.attrs) {
				handleAttr(attr)
			}
			// 枚举每一对相邻小节线，并取出相应区间进行操作。
			ret.push(this.parseSection<TypeSampler>(
				tokens.slice(lpt, rpt),
				i - 1,
				lineNumber,
				context,
				issues,
				{range: [
					Tokens.rangeSafe(tokens, lpt, 0),
					Tokens.rangeSafe(tokens, rpt - 1, 1)
				], separator: {
					before: separators[i - 1].before,
					after: separators[i].after,
					next: separators[i].next
				}},
				typeSampler
			))
		}
		return ret
	}

	/**
	 * 匹配小节线的属性
	 */
	matchSeparatorAttr(attrs: BracketTokenList[], lineNumber: number, issues: LinedIssue[]): SeparatorAttr[] {
		let ret: SeparatorAttr[] = []
		attrs.forEach((tokens) => {
			let success = false
			function rangize(obj: SeparatorAttrBase | undefined): SeparatorAttr | undefined {
				if(obj === undefined) {
					return undefined
				}
				return Object.assign(obj, {
					range: [tokens[0].range[0], tokens[tokens.length - 1].range[1]] as [number, number]
				})
			}
			success ||= pushIfNonNull(ret,
				rangize(AttrMatcher.matchOpenRange(tokens))
			)
			success ||= pushIfNonNull(ret,
				rangize(AttrMatcher.matchIter(tokens))
			)
			success ||= pushIfNonNull(ret,
				rangize(AttrMatcher.matchReset(tokens))
			)
			success ||= pushIfNonNull(ret,
				rangize(AttrMatcher.matchWeight(tokens))
			)
			success ||= pushIfNonNull(ret,
				rangize(AttrMatcher.matchDurability(tokens))
			)
			success ||= pushIfNonNull(ret,
				rangize(AttrMatcher.matchRepeat(tokens))
			)
			success ||= pushIfNonNull(ret,
				rangize(AttrMatcher.matchQpm(tokens, lineNumber, issues))
			)
			success ||= pushIfNonNull(ret,
				rangize(AttrMatcher.matchBeats(tokens, lineNumber, issues))
			)
			success ||= pushIfNonNull(ret,
				rangize(AttrMatcher.matchShift(tokens, lineNumber, issues))
			)
			success ||= pushIfNonNull(ret,
				rangize(AttrMatcher.matchLabel(tokens))
			)
			success ||= pushIfNonNull(ret,
				rangize(AttrMatcher.matchText(tokens))
			)
			success ||= pushIfNonNull(ret,
				rangize(AttrMatcher.matchScriptedText(tokens))
			)
			if(!success) {
				addIssue(issues,
					lineNumber, tokens[0] ? tokens[0].range[0] : 0,
					'error', 'unknown_separator_attr',
					'Cannot interpret `${0}` as a separator attribute',
					Tokens.stringify(tokens)
				)
			}
		})
		return ret
	}
	handleShift(props: MusicProps, attr: AttrShift): MusicProps {
		props = Object.assign({}, props)
		const oldBase = props.base!.value
		if(attr.metrics == 'absolute') {
			props.base = attr.value
		} else {
			const delta = MusicTheory.pitchInterval2dKey(attr.value, attr.metrics)
			props.base = {
				value: props.base!.value + delta,
				baseValue: props.base!.value + delta,
				explicitOctave: true
			}
		}
		props.transp = props.transp! + props.base.value - oldBase
		return props
	}

	parseSection<TypeSampler>(tokens: BracketTokenList, sectionIndex: number, lineNumber: number, context: ScoreContext, issues: LinedIssue[], knownValues: {
		range: [number, number],
		separator: SectionSeparators
	}, typeSampler: TypeSampler): SampledSection<TypeSampler> {
		const idCard = {
			lineNumber: lineNumber,
			index: sectionIndex,
			uuid: `${lineNumber}-${sectionIndex}`
		}
		const base = {
			range: knownValues.range,
			startPos: { x: 0, y: 1 },
			ordinal: 0,
			separator: knownValues.separator,
			musicalProps: context.musical,
			idCard: idCard
		}
		// empty
		if(new BracketPairFilters(
			new TokenFilter('word', 'empty')
		).test(tokens)) {
			return Object.assign({}, base, {
				type: 'empty' as 'empty'
			})
		}
		// omit
		if(new BracketPairFilters(
			new TokenFilter('word', 'omit')
		).test(tokens)) {
			return Object.assign({}, base, {
				type: 'omit' as 'omit',
				count: NaN
			})
		}
		// omit(x)
		if(tokens.length == 2) {
			if(
				(!('bracket' in tokens[0]) && new TokenFilter('word', 'omit').test(tokens[0])) &&
				('bracket' in tokens[1]) && tokens[1].bracket == '('
			) {
				const str = tokens[1].text.substring(1, tokens[1].text.length - 1)
				let val = +str
				if(isNaN(val)) {
					val = 1
					addIssue(issues,
						lineNumber, tokens[1].range[0], 'error', 'unknown_omit_count',
						'Cannot figure out what the omit count ${0} is',
						str
					)
				}
				return Object.assign({}, base, {
					type: 'omit' as 'omit',
					count: val
				})
			}
		}
		const ret: SampledSection<TypeSampler> = Object.assign({}, base, {
			type: 'section' as 'section',
			totalQuarters: { x: 0, y: 1 },
			validation: 'pass' as 'pass',
			notes: [],
			decoration: [],
			leftSplit: false,
			leftSplitVoid: false
		})
		const [ writtenQuarters ] = new NoteEater(tokens, lineNumber, context).parse<TypeSampler>(ret, Frac.create(1), Frac.create(0), issues, typeSampler)
		ret.totalQuarters = writtenQuarters
		return ret
	}
}

export const SectionsParser = new SectionsParserClass()

import { renderPropConvert, RenderProps, renderPropsDefault } from "../../renderer/props";
import { doIfNonNull, pushIfNonNull } from "../../util/array";
import { Frac, Fraction } from "../../util/frac";
import { MusicTheory } from "../../util/music";
import { splitBy } from "../../util/string";
import { LineTree, mapTreeLines } from "../clns2lnt/LineTreeBuilder";
import { lineLevelNames } from "../commands";
import { SparseLine } from "../lnt2sparse/SparseBuilder";
import { addIssue, LinedIssue } from "../parser";
import { BracketFiltersResult, BracketPairFilters, BracketTokenList, TokenFilter, Tokens } from "../tokenizer/tokens";
import { AttrMatcher } from "./AttrMatcher";
import { addMusicProp, addRenderProp, copyContext, ScoreContext, scoreContextDefault } from "./context";
import { LyricsParser } from "./lyrics/LyricsParser";
import { SectionsParser } from "./sections/SectionsParser";
import { Beats, DestructedArticle, DestructedFragment, DestructedLine, DestructedLyricLine, DestructedPart, DestructedScore, JumperAttr, LrcAttr, LyricDestructionType, MusicProps, MusicSection, NoteCharAny, NoteCharMusic, PartAttr, Qpm } from "./types";

type MusicalPropsLine = (DestructedLine & {head: 'P' | 'Sp'}) | undefined
type RenderPropsLine = (DestructedLine & {head: 'Rp' | 'Srp' | 'Frp'}) | undefined

export class Destructor {
	/**
	 * 输入数据
	 */
	input: LineTree<SparseLine>
	
	constructor(input: LineTree<SparseLine>) {
		this.input = input
	}

	/**
	 * 处理
	 */
	parse(issues: LinedIssue[]): DestructedScore {
		const score = this.input
		const musicalProps = this.destruct(score.uniqueLines['P'], issues, scoreContextDefault) as MusicalPropsLine
		const renderProps = this.destruct(score.uniqueLines['Rp'], issues, scoreContextDefault) as RenderPropsLine
		const newContext = addRenderProp(
			addMusicProp(scoreContextDefault, musicalProps?.props),
			renderProps?.props
		)
		if(!(musicalProps?.props.beats)) {
			addIssue(issues,
				score.lineNumber, 0, 'notice', 'missing_beats',
				'Global beats is not specified. It will default to 0/4.'
			)
		}
		return {
			lineNumber: score.lineNumber,
			scoreProps: {
				title: this.destruct(score.uniqueLines['Dt'], issues, newContext) as any,
				subtitle: this.destruct(score.uniqueLines['Ds'], issues, newContext) as any,
				prescript: this.destruct(score.uniqueLines['Dp'], issues, newContext) as any,
				version: this.destruct(score.uniqueLines['Dv'], issues, newContext) as any,
				authors: score.lines.filter((line) => line.head == 'Da').map((line) => {
					return this.destruct(line, issues, newContext) as any
				}),
				footnotes: score.lines.filter((line) => line.head == 'Df').map((line) => {
					return this.destruct(line, issues, newContext) as any
				}),
			},
			musicalProps: musicalProps as any,
			renderProps: renderProps as any,
			articles: score.children.map((article) => {
				return this.parseArticle(article, newContext, issues)
			})
		}
	}
	parseArticle(article: LineTree<SparseLine>, context: ScoreContext, issues: LinedIssue[]): DestructedArticle {
		const musicalProps = this.destruct(article.uniqueLines['Sp'], issues, context) as MusicalPropsLine
		const renderProps = this.destruct(article.uniqueLines['Srp'], issues, context) as RenderPropsLine
		const newContext = addRenderProp(addMusicProp(context, musicalProps?.props), renderProps?.props)
		const mutableContext = copyContext(newContext)
		let isText = false
		article.lines.forEach((line) => {
			if(line.head == 'T') {
				isText = true
			}
		})
		if(isText) {
			return {
				lineNumber: article.lineNumber,
				type: 'text',
				renderProps: renderProps as any,
				title: this.destruct(article.uniqueLines['S'], issues, context) as any,
				text: article.lines.filter((line) => line.head == 'T').map((line) => {
					return this.destruct(line, issues, newContext) as any
				})
			}
		} else {
			return {
				lineNumber: article.lineNumber,
				type: 'music',
				musicalProps: musicalProps as any,
				renderProps: renderProps as any,
				title: this.destruct(article.uniqueLines['S'], issues, context) as any,
				fragments: article.children.map((fragment) => {
					return this.parseFragment(fragment, mutableContext, issues)
				})
			}
		}
	}
	parseFragment(fragment: LineTree<SparseLine>, context: ScoreContext, issues: LinedIssue[]): DestructedFragment {
		const renderProps = this.destruct(fragment.uniqueLines['Frp'], issues, context) as RenderPropsLine
		const newContext = addRenderProp(context, renderProps?.props)
		const prevContext = copyContext(newContext)
		const retData = {
			lineNumber: fragment.lineNumber,
			break: this.destruct(fragment.uniqueLines['B'], issues, newContext) as any,
			jumper: this.destruct(fragment.uniqueLines['J'], issues, newContext) as any,
			renderProps: renderProps as any,
			parts: fragment.children.map((part) => {
				newContext.musical = Object.assign({}, prevContext.musical)
				return this.parsePart(part, newContext, issues)
			})
		}

		newContext.musical = { ...prevContext.musical }
		let maxSections = 0
		retData.parts.forEach((part) => {
			maxSections = Math.max(maxSections, part.notes.sections.length)
		})
		if(maxSections > 0) {
			for(let part of retData.parts) {
				const section = part.notes.sections[maxSections - 1]
				if(section) {
					newContext.musical = { ...section.musicalProps }
				}
			}
		}

		context.musical = newContext.musical

		return retData
	}
	parsePart(part: LineTree<SparseLine>, context: ScoreContext, issues: LinedIssue[]): DestructedPart {
		return {
			lineNumber: part.lineNumber,
			notes: this.destructNotes(part.uniqueLines['N'] as any, issues, context, true) as any,
			force: this.destruct(part.uniqueLines['F'], issues, context) as any,
			chord: this.destruct(part.uniqueLines['C'], issues, context) as any,
			annotations: part.lines.filter((line) => line.head == 'A').map((line, index) => {
				return this.destructAnnotation(line as any, issues, context, index) as DestructedLine & {head: 'A'}
			}),
			lyricLines: part.children.map((lyricLine) => {
				return this.parseLyricLine(lyricLine, context, issues)
			})
		}
	}
	parseLyricLine(lyricLine: LineTree<SparseLine>, context: ScoreContext, issues: LinedIssue[]): DestructedLyricLine {
		return {
			lineNumber: lyricLine.lineNumber,
			lyric: this.destruct(lyricLine.uniqueLines['L'], issues, context) as any,
			notesSubstitute: lyricLine.lines.filter((line) => line.head == 'Ns').map((line) => {
				return this.destruct(line, issues, context) as DestructedLine & {head: 'Ns'}
			}),
			force: this.destruct(lyricLine.uniqueLines['F'], issues, context) as any,
			chord: this.destruct(lyricLine.uniqueLines['C'], issues, context) as any,
			annotations: lyricLine.lines.filter((line) => line.head == 'A').map((line, index) => {
				return this.destructAnnotation(line as any, issues, context, index) as DestructedLine & {head: 'A'}
			})
		}
	}

	/**
	 * 解析行
	 */
	destruct(line: SparseLine | undefined, issues: LinedIssue[], context: ScoreContext): DestructedLine | undefined {
		if(line === undefined) {
			return undefined
		}
		if(['Dt', 'Dp', 'Dv', 'Ds', 'S'].indexOf(line.head) != -1) {
			return this.destructCopyTitle(line as any, issues)
		}
		if(['T'].indexOf(line.head) != -1) {
			return this.destructText(line as any, issues)
		}
		if(['Da', 'Df'].indexOf(line.head) != -1) {
			return this.destructCopyMeta(line as any, issues)
		}
		if(['P', 'Pi', 'Sp'].indexOf(line.head) != -1) {
			return this.destructMusicProp(line as any, issues)
		}
		if(['Rp', 'Srp', 'Frp'].indexOf(line.head) != -1) {
			return this.destructRenderProp(line as any, issues)
		}
		if(['B'].indexOf(line.head) != -1) {
			return this.destructFlag(line as any, issues)
		}
		if(['J'].indexOf(line.head) != -1) {
			return this.destructJumper(line as any, issues)
		}
		if(['N'].indexOf(line.head) != -1) {
			return this.destructNotes(line as any, issues, context)
		}
		if(['Ns'].indexOf(line.head) != -1) {
			return this.destructNotesSubstitute(line as any, issues, context)
		}
		if(['F'].indexOf(line.head) != -1) {
			return this.destructForce(line as any, issues, context)
		}
		if(['C'].indexOf(line.head) != -1) {
			return this.destructChord(line as any, issues, context)
		}
		if(['A'].indexOf(line.head) != -1) {
			return this.destructAnnotation(line as any, issues, context, 0)
		}
		if(['L', 'Lc', 'Lw'].indexOf(line.head) != -1) {
			return this.destructLyrics(line as any, issues, context)
		}
		throw new Error('Destructor got something very new! ' + line.head)
	}
	destructFlag(line: SparseLine & {head: 'B'}, issues: LinedIssue[]): DestructedLine {
		return {
			lineNumber: line.lineNumber,
			type: 'flag',
			head: line.head
		}
	}
	destructCopyTitle(line: SparseLine & {head: 'Dt'}, issues: LinedIssue[]): DestructedLine {
		return {
			lineNumber: line.lineNumber,
			type: 'title',
			head: line.head,
			text: line.content
		}
	}
	destructText(line: SparseLine & {head: 'T'}, issues: LinedIssue[]): DestructedLine {
		let text = line.content
		if(text[0] == '|') {
			text = text.substring(1)
		}
		return {
			lineNumber: line.lineNumber,
			type: 'text',
			head: line.head,
			text: text
		}
	}
	destructCopyMeta(line: SparseLine & {head: 'Da'}, issues: LinedIssue[]): DestructedLine {
		return {
			lineNumber: line.lineNumber,
			type: 'note',
			head: line.head,
			tag: line.props ?? '',
			text: line.content
		}
	}
	destructMusicProp(line: SparseLine & {head: 'P'}, issues: LinedIssue[]): DestructedLine {
		let props: MusicProps = {
			beats: undefined,
			qpm: undefined,
			base: undefined,
			transp: undefined,
			extras: []
		}
		for(let item of line.content) {
			/*
				beats: "4/4" "5/4=2/4+3/4" "6/12T"
				qpm: "qpm=120" "spm=240/test"
				tuning: "1=C" "1=?" "1=#D4" "1=bB5"
				transp: "+2" "-4" "+7"
			*/
			((item) => {
				// transp
				if(/^\+(\d+)\.?(\d*)$/.test(item) || /^\-(\d+)\.?(\d*)$/.test(item)) {
					const val = +item.substring(1)
					if(val <= 88) {
						props.transp = +item
					}
					return
				}
				// tuning
				if(item.substring(0, 2) == '1=') {
					const val = item.substring(2)
					if(val == '?') {
						props.base = {
							value: NaN,
							baseValue: NaN,
							explicitOctave: false
						}
					} else {
						const valParsed = MusicTheory.absName2Pitch(val)
						if(valParsed.value == valParsed.value) {
							props.base = valParsed
						} else {
							addIssue(issues,
								line.lineNumber, 0, 'error', 'unknown_base',
								'Cannot figure out what the base tune ${0} is.',
								val
							)
						}
					}
					return
				}
				// qpm
				if(/^[q|s|h]pm=/.test(item)) {
					let result = AttrMatcher.stringQpm(item, line.lineNumber, 0, issues)
					if(result !== undefined) {
						props.qpm = result
					}
					return
				}
				// beats
				if(/^(\d+)\/(\d+)T?$/.test(item) || /^(\d+)\/(\d+)T?=/.test(item)) {
					let result = AttrMatcher.stringBeats(item, line.lineNumber, 0, issues)
					if(result !== undefined) {
						props.beats = result
					}
					return
				}
				props.extras.push(item)
			})(item)
		}
		return {
			lineNumber: line.lineNumber,
			type: 'props',
			head: line.head,
			props: props
		}
	}
	destructRenderProp(line: SparseLine & {head: 'Rp'}, issues: LinedIssue[]): DestructedLine {
		let props: RenderProps = {}
		line.content.forEach((item) => {
			if(item.indexOf('=') != -1) {
				const [ key, value ] = splitBy(item, '=')
				const r = renderPropConvert(key, value)
				if(typeof(r) == 'object' && 'error' in r) {
					if(r.error == 'key') {
						addIssue(issues,
							line.lineNumber, 0, 'error', 'rp_unknown_key',
							'Unknown render prop ${0}.',
							key
						)
					} else {
						addIssue(issues,
							line.lineNumber, 0, 'error', 'rp_unknown_value',
							'Unknown render prop value ${1} for ${0}.',
							key, value
						)
					}
				} else {
					(props as any)[key] = r
				}
			}
		})
		return {
			lineNumber: line.lineNumber,
			type: 'renderProps',
			head: line.head,
			props: props
		}
	}
	destructJumper(line: SparseLine & {head: 'J'}, issues: LinedIssue[]): DestructedLine {
		const attrs: JumperAttr[] = []
		let isOpenRange = false
		line.content.tokens.forEach((attrSymbol) => {
			let success = false
			success ||= pushIfNonNull(attrs,
				AttrMatcher.matchIter(attrSymbol)
			)
			success ||= pushIfNonNull(attrs,
				AttrMatcher.matchOctave(attrSymbol)
			)
			success ||= doIfNonNull(() => isOpenRange = true,
				AttrMatcher.matchOpenRange(attrSymbol)
			)
			success ||= pushIfNonNull(attrs,
				AttrMatcher.matchText(attrSymbol)
			)
			success ||= pushIfNonNull(attrs,
				AttrMatcher.matchScriptedText(attrSymbol)
			)
			if(!success) {
				addIssue(issues,
					line.lineNumber, attrSymbol.length == 0 ? 0 : attrSymbol[0].range[0], 'error', 'unknown_jumper_attr',
					'Cannot interpret `${0}` as a jumper attribute',
					Tokens.stringify(attrSymbol)
				)
			}
		})
		return {
			lineNumber: line.lineNumber,
			type: 'jumper',
			head: line.head,
			openRange: isOpenRange,
			attrs: attrs
		}
	}
	destructNotes(line: SparseLine & {head: 'N' | 'Na'}, issues: LinedIssue[], context: ScoreContext, acceptVariation?: boolean): DestructedLine {
		return {
			lineNumber: line.lineNumber,
			type: 'notes',
			head: line.head,
			tags: this.matchPartAttr(line.props.tokens, line.lineNumber, issues),
			sections: this.destructSections<'music'>(line.content.tokens[0], line.lineNumber, issues, context, 'music', acceptVariation)
		}
	}
	destructNotesSubstitute(line: SparseLine & {head: 'Ns'}, issues: LinedIssue[], context: ScoreContext): DestructedLine | undefined {
		const tokens = line.content.tokens[0]
		let splitIndex = new TokenFilter('symbol', ':').findIn(tokens)
		let substituteIndex = NaN
		if(splitIndex != -1) {
			substituteIndex = +Tokens.stringify(tokens.slice(0, splitIndex))
		}
		if(Math.floor(substituteIndex) != substituteIndex || isNaN(substituteIndex)) {
			substituteIndex = NaN
			addIssue(issues,
				line.lineNumber, 0, 'error', 'nan_substitute_index',
				'Where to substitute? Did you forget that?'
			)
		}
		return {
			lineNumber: line.lineNumber,
			type: 'notesSubstitute',
			head: line.head,
			substituteLocation: substituteIndex,
			tags: this.matchLrcAttr(line.props.tokens, line.lineNumber, issues),
			decorations: [],
			sections: this.destructSections<'music'>(tokens.slice(splitIndex + 1), line.lineNumber, issues, context, 'music')
		}
	}
	destructForce(line: SparseLine & {head: 'F'}, issues: LinedIssue[], context: ScoreContext): DestructedLine {
		return {
			lineNumber: line.lineNumber,
			type: 'annotationsForce',
			head: line.head,
			sections: this.destructSections<'force'>(line.content.tokens[0], line.lineNumber, issues, context, 'force')
		}
	}
	destructChord(line: SparseLine & {head: 'C'}, issues: LinedIssue[], context: ScoreContext): DestructedLine {
		return {
			lineNumber: line.lineNumber,
			type: 'annotationsChord',
			head: line.head,
			sections: this.destructSections<'chord'>(line.content.tokens[0], line.lineNumber, issues, context, 'chord')
		}
	}
	destructAnnotation(line: SparseLine & {head: 'A'}, issues: LinedIssue[], context: ScoreContext, index: number): DestructedLine {
		return {
			lineNumber: line.lineNumber,
			type: 'annotationsText',
			head: line.head,
			index: index,
			sections: this.destructSections<'text'>(line.content.tokens[0], line.lineNumber, issues, context, 'text')
		}
	}
	destructLyrics(line: SparseLine & {head: 'L' | 'Lc' | 'Lw'}, issues: LinedIssue[], context: ScoreContext): DestructedLine {
		return {
			lineNumber: line.lineNumber,
			type: 'lyrics',
			head: line.head,
			tags: this.matchLrcAttr(line.props.tokens, line.lineNumber, issues),
			chars: new LyricsParser(line.content.tokens[0], line.lineNumber, context).parseLyrics(issues, {
				'L': 'manual',
				'Lc': 'char',
				'Lw': 'word'
			}[line.head] as LyricDestructionType)
		}
	}

	destructSections<TypeSampler>(tokens: BracketTokenList, lineNumber: number, issues: LinedIssue[], context: ScoreContext, typeSampler: TypeSampler, acceptVariation?: boolean): MusicSection<NoteCharAny & {type: TypeSampler}>[] {
		return SectionsParser.parseSections<TypeSampler>(tokens, lineNumber, issues, context, typeSampler, acceptVariation) as any
	}

	matchPartAttr(items: BracketTokenList[], lineNumber: number, issues: LinedIssue[]): PartAttr[] {
		const attrs: PartAttr[] = []
		items.forEach((tokens) => {
			let success = false
			success ||= pushIfNonNull(attrs,
				AttrMatcher.matchText(tokens)
			)
			success ||= pushIfNonNull(attrs,
				AttrMatcher.matchScriptedText(tokens)
			)
			if(!success) {
				addIssue(issues,
					lineNumber, tokens.length > 0 ? tokens[0].range[0] : 0,
					'error', 'unknown_part_attr',
					'Cannot interpret ${0} as a part attribute',
					Tokens.stringify(tokens)
				)
			}
		})
		return attrs
	}
	matchLrcAttr(items: BracketTokenList[], lineNumber: number, issues: LinedIssue[]): LrcAttr[] {
		const attrs: LrcAttr[] = []
		items.forEach((tokens) => {
			let success = false
			success ||= pushIfNonNull(attrs,
				AttrMatcher.matchIter(tokens)
			)
			success ||= pushIfNonNull(attrs,
				AttrMatcher.matchText(tokens)
			)
			success ||= pushIfNonNull(attrs,
				AttrMatcher.matchScriptedText(tokens)
			)
			if(!success) {
				addIssue(issues,
					lineNumber, tokens.length > 0 ? tokens[0].range[0] : 0,
					'error', 'unknown_lrc_attr',
					'Cannot interpret ${0} as a lyricLine attribute',
					Tokens.stringify(tokens)
				)
			}
		})
		return attrs
	}
}

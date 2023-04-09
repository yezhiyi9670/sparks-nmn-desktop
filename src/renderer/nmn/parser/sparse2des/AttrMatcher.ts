import { inCheck } from "../../util/array";
import { Fraction, Frac } from "../../util/frac";
import { MusicTheory } from "../../util/music";
import { splitBy } from "../../util/string";
import { BracketPair } from "../lnt2sparse/SparseBuilder";
import { LinedIssue, addIssue } from "../parser";
import { BracketFilter, BracketPairFilters, BracketTokenList, TokenFilter, Tokens } from "../tokenizer/tokens";
import { scoreContextDefault } from "./context";
import { NoteEater } from "./sections/NoteEater";
import { AttrBeats, AttrDecor, attrDecorCheck, attrDecorPriority, AttrDelta, AttrDurability, AttrIter, AttrLabel, AttrNotes, AttrOctave, AttrOpenRange, AttrPadding, AttrQpm, AttrRepeat, AttrReset, AttrScriptedText, AttrShift, AttrSlide, AttrText, AttrTop, AttrWeight, Beats, MusicSection, NoteCharMusic, Qpm } from "./types";

export module AttrMatcher {
	export function matchIter(tokens: BracketTokenList): AttrIter | undefined {
		return new BracketPairFilters(
			new TokenFilter('word', /^(\d+)$/),
			new TokenFilter('symbol', '.')
		).testThen(tokens, (result) => {
			return {
				type: 'iter',
				iter: +(result[0] as string)
			}
		})
	}
	export function matchReset(tokens: BracketTokenList): AttrReset | undefined {
		return new BracketPairFilters(
			new TokenFilter('word', 'reset'),
		).testThen(tokens, (result) => {
			return {
				type: 'reset'
			}
		})
	}
	export function matchWeight(tokens: BracketTokenList): AttrWeight | undefined {
		const str = Tokens.stringify(tokens, '', ',')
		const matched = str.match(/^w=(.*?)$/)
		if(matched) {
			const val = +matched[1]
			if(val == val && 0 < val && val < 65536) {
				return {
					type: 'weight',
					weight: val
				}
			}
		}
		return undefined
	}
	export function matchPadding(tokens: BracketTokenList): AttrPadding | undefined {
		const str = Tokens.stringify(tokens, '', ',')
		const matched = str.match(/^p=(.*?)$/)
		if(matched) {
			const val = +matched[1]
			if(val == val && 0 < val && val < 65536) {
				return {
					type: 'padding',
					padding: val
				}
			}
		}
		return undefined
	}
	export function matchTop(tokens: BracketTokenList): AttrTop | undefined {
		const str = Tokens.stringify(tokens, '', ',')
		const matched = str.match(/^t=(.*?)$/)
		if(matched) {
			const val = +matched[1]
			if(val == val && 0 < val && val < 65536) {
				return {
					type: 'top',
					margin: val
				}
			}
		}
		return undefined
	}
	export function matchOpenRange(tokens: BracketTokenList): AttrOpenRange | undefined {
		return new BracketPairFilters(
			new TokenFilter('symbol', '*')
		).testThen(tokens, (result) => {
			return {
				type: 'openRange'
			}
		})
	}
	export function matchOctave(tokens: BracketTokenList): AttrOctave | undefined {
		return new BracketPairFilters(
			new TokenFilter('word', /^8v[a|b]$/)
		).testThen(tokens, (result) => {
			return {
				type: 'octave',
				sign: result[0] === '8va' ? 1 : -1
			}
		})
	}
	export function matchText(tokens: BracketTokenList): AttrText | undefined {
		return new BracketPairFilters(
			new TokenFilter('stringLiteral', null)
		).testThen(tokens, (result) => {
			return {
				type: 'text',
				text: result[0] as string
			}
		})
	}
	export function matchScriptedText(tokens: BracketTokenList): AttrScriptedText | undefined {
		return new BracketPairFilters(
			new TokenFilter('stringLiteral', null),
			new TokenFilter('symbol', '_'),
			new TokenFilter('stringLiteral', null)
		).testThen(tokens, (result) => {
			return {
				type: 'scriptedText',
				text: result[0] as string,
				sub: result[2] as string
			}
		})
	}
	export function matchLabel(tokens: BracketTokenList): AttrLabel | undefined {
		return new BracketPairFilters(
			new BracketFilter('[')
		).testThen(tokens, (val) => {
			const lst = (val[0] as BracketTokenList[])[0] ?? []
			let ret = matchText(lst) || matchScriptedText(lst)
			if(ret === undefined) {
				ret = {
					type: 'text',
					text: 'bracket' in tokens[0] ? tokens[0].text.substring(1, tokens[0].text.length - 1) : ''
				}
			}
			return {
				type: 'label',
				label: ret
			}
		})
	}
	export function matchRepeat(tokens: BracketTokenList): AttrRepeat | undefined {
		const char = ((tokens: BracketTokenList) => {
			if(new BracketPairFilters(
				new TokenFilter('word', 'D'),
				new TokenFilter('symbol', '.'),
				new TokenFilter('word', 'S'),
				new TokenFilter('symbol', '.')
			).test(tokens)) {
				return 'D.S.'
			}
			if(new BracketPairFilters(
				new TokenFilter('word', 'D'),
				new TokenFilter('symbol', '.'),
				new TokenFilter('word', 'C'),
				new TokenFilter('symbol', '.')
			).test(tokens)) {
				return 'D.C.'
			}
			if(new BracketPairFilters(
				new TokenFilter('word', 'Fine'),
				new TokenFilter('symbol', '.')
			).test(tokens)) {
				return 'Fine.'
			}
			if(new BracketPairFilters(
				new TokenFilter('symbol', '$')
			).test(tokens)) {
				return '$'
			}
			if(new BracketPairFilters(
				new TokenFilter('symbol', '@')
			).test(tokens)) {
				return '@'
			}
			return undefined
		})(tokens)
		if(undefined === char) {
			return undefined
		}
		return {
			type: 'repeat',
			char: char
		}
	}
	export function matchQpm(tokens: BracketTokenList, lineNumber: number, issues: LinedIssue[]): AttrQpm | undefined {
		const str = Tokens.stringify(tokens, '', ',')
		const qpm = stringQpm(str, lineNumber, tokens[0] ? tokens[0].range[0] : 0, issues)
		if(qpm === undefined) {
			return undefined
		}
		return {
			type: 'qpm',
			qpm: qpm
		}
	}
	export function matchBeats(tokens: BracketTokenList, lineNumber: number, issues: LinedIssue[]): AttrBeats | undefined {
		const str = Tokens.stringify(tokens, '', ',')
		const beats = stringBeats(str, lineNumber, tokens[0] ? tokens[0].range[0] : 0, issues)
		if(beats === undefined) {
			return undefined
		}
		return {
			type: 'beats',
			beats: beats
		}
	}
	export function matchShift(tokens: BracketTokenList, lineNumber: number, issues: LinedIssue[]): AttrShift | undefined {
		const str = Tokens.stringify(tokens, '', ',')
		let [ leftPart, rightPart ] = splitBy(str, '=')
		if(rightPart == '') {
			return undefined
		}
		let isRelative = false
		let changeTranspose = false
		if(leftPart == 'd1T') {
			isRelative = true
			changeTranspose = true
		} else if(leftPart == '1T') {
			changeTranspose = true
		} else if(leftPart == 'd1') {
			isRelative = true
		} else if(leftPart != '1') {
			return undefined
		}
		if(!isRelative) {
			let tune = {
				value: NaN,
				baseValue: NaN,
				explicitOctave: false
			}
			if(rightPart != '?') {
				tune = MusicTheory.absName2Pitch(rightPart)
				if(isNaN(tune.value)) {
					addIssue(issues,
						lineNumber, tokens[0] ? tokens[0].range[0] : 0,
						'error', 'unknown_base_shift',
						'Cannot figure out what the base tune ${0} is.',
						rightPart
					)
					return undefined
				}
			}
			return {
				type: 'shift',
				metrics: 'absolute',
				value: tune,
				changeTranspose: changeTranspose
			}
		} else {
			let matched = rightPart.match(/^(\-?\d+)(|key|thd|thm|th|thM|tha)$/)
			function addMatchFail() {
				addIssue(issues,
					lineNumber, tokens[0] ? tokens[0].range[0] : 0,
					'error', 'unknown_relative_shift',
					'Cannot figure out what the shift ${0} is.',
					rightPart
				)
			}
			if(matched === null) {
				addMatchFail()
				return undefined
			}
			let val = +matched[1]
			let unit = matched[2]
			if(val != val || Math.abs(val) >= 65536) {
				addMatchFail()
				return undefined
			}
			const metrics = ((unit: string) => {
				if(unit == '' || unit == 'key') {
					return 'key'
				}
				if(/^(st|nd|rd|th)d$/.test(unit)) {
					return 'thd'
				}
				if(/^(st|nd|rd|th)m$/.test(unit)) {
					return 'thm'
				}
				if(/^(st|nd|rd|th)M?$/.test(unit)) {
					return 'th'
				}
				if(/^(st|nd|rd|th)a$/.test(unit)) {
					return 'tha'
				}
				return undefined
			})(unit)
			if(metrics === undefined) {
				addMatchFail()
				return undefined
			}
			return {
				type: 'shift',
				metrics: metrics,
				value: val,
				changeTranspose: changeTranspose
			}
		}
	}
	export function matchDurability(tokens: BracketTokenList): AttrDurability | undefined {
		const str = Tokens.stringify(tokens, '', ',')
		if(/^x(\d+)$/.test(str)) {
			let val = +str.slice(1)
			if(val > 65536 || val < 0) {
				return undefined
			}
			return {
				type: 'durability',
				value: val
			}
		}
	}
	export function matchDecor(tokens: BracketTokenList, lineNumber: number, issues: LinedIssue[]): AttrDecor | undefined {
		const str = Tokens.stringify(tokens, '', ',')
		if(!inCheck(str, attrDecorCheck)) {
			return undefined
		}
		return {
			type: 'decor',
			char: str,
			priority: attrDecorPriority(str)
		}
	}
	export function matchSlide(tokens: BracketTokenList, lineNumber: number, issues: LinedIssue[]): AttrSlide | undefined {
		const str = Tokens.stringify(tokens, '', ',')
		if(str == 'sl' || str == 'sld') {
			return {
				type: 'slide',
				direction: str == 'sld' ? 'down' : 'up'
			}
		}
		return undefined
	}
	export function matchNotes(tokens: BracketTokenList, lineNumber: number, issues: LinedIssue[]): AttrNotes | undefined {
		let tokenIn: BracketPair | undefined = undefined as any
		let isPostfix = false
		new BracketPairFilters(
			new TokenFilter('word', 'p'),
			new BracketFilter('(')
		).testThen(tokens, (val) => {
			tokenIn = tokens[1] as BracketPair
			isPostfix = true
		})
		new BracketPairFilters(
			new BracketFilter('(')
		).testThen(tokens, (val) => {
			tokenIn = tokens[0] as BracketPair
		})
		if(tokenIn === undefined) {
			return undefined
		}
		const section: MusicSection<NoteCharMusic> = {
			idCard: {
				lineNumber: -1,
				index: -1,
				uuid: ''
			},
			range: [tokenIn.range[0] + 1, tokenIn.range[1] - 1],
			ordinal: 0,
			startPos: {x: 0, y: 0},
			separator: {
				before: {char: '/', attrs: []},
				after: {char: '/', attrs: []},
				next: {char: '/', attrs: []}
			},
			musicalProps: scoreContextDefault.musical,
			type: 'section',
			totalQuarters: {x: 0, y: 0},
			validation: 'pass',
			notes: [],
			decoration: [],
			leftSplit: false,
			leftSplitVoid: false,
			rightSplit: false
		}
		const [ writtenQuarters ] = new NoteEater(tokenIn.tokens[0] ?? [], lineNumber, scoreContextDefault, 0).parse<'music'>(
			section,
			Frac.create(1),
			Frac.create(0),
			issues,
			'music'
		)
		section.totalQuarters = writtenQuarters
		return {
			type: 'notes',
			slot: isPostfix ? 'postfix': 'prefix',
			notes: section
		}
	}
	export function matchDelta(tokens: BracketTokenList, lineNumber: number, issues: LinedIssue[]): AttrDelta | undefined {
		return new BracketPairFilters(
			new TokenFilter('word', 'delta'),
			new BracketFilter('(')
		).testThen(tokens, (val) => {
			const tokens1 = (val[1] as BracketTokenList[])[0] ?? []
			const str = Tokens.stringify(tokens1, '', ',')
			if(/^(|\-|\+)(\d+)$/.test(str)) {
				const num = +str
				if(Math.abs(num) < 65536) {
					return {
						type: 'delta',
						value: num
					}
				}
			}
			return undefined
		})
	}

	export function stringQpm(item: string, lineNumber: number, index: number, issues: LinedIssue[]): Qpm | undefined {
		if(!(/^[q|s|h]pm=/.test(item))) {
			return undefined
		}
		let symbol: 'qpm' | 'spm' | 'hpm' = 'qpm'
		if(item[0] == 's') {
			symbol = 'spm'
		} else if(item[0] == 'h') {
			symbol = 'hpm'
		}
		const descriptor = item.substring(4)
		let val = 0
		let desc = ''
		if(descriptor.indexOf('/') != -1) {
			let split = descriptor.indexOf('/')
			val = +descriptor.substring(0, split)
			desc = descriptor.substring(split + 1).replace(/_/g, ' ')
		} else {
			val = +descriptor
		}
		if(val != val || Math.abs(val) >= 65536) {
			addIssue(issues,
				lineNumber, index, 'error', 'unknown_qpm',
				'Cannot figure out what the speed value ${0} is.',
				descriptor
			)
			val = 120
		}
		return {
			value: val,
			symbol: symbol,
			text: desc != '' ? desc : undefined
		}
	}
	export function stringBeats(item: string, lineNumber: number, index: number, issues: LinedIssue[]): Beats | undefined {
		if(!(/^(\d+)\/(\d+)T?$/.test(item) || /^(\d+)\/(\d+)T?=/.test(item))) {
			return undefined
		}
		let leftPart = item
		let rightPart: string | undefined = undefined
		let defaultTriplet = false
		if(item.indexOf('=') != -1) {
			[leftPart, rightPart] = splitBy(item, '=')
		}
		if(leftPart[leftPart.length - 1] == 'T') {
			leftPart = leftPart.substring(0, leftPart.length - 1)
			defaultTriplet = true
		}
		function __extractFraction(name: string): Fraction {
			if(name.indexOf('/') == -1) {
				return { x: +name, y: 1 }
			}
			const [ x, y ] = name.split('/')
			return { x: +x, y: +y }
		}
		function extractFraction(name: string): Fraction | undefined {
			const frac = __extractFraction(name)
			if(frac.y == 0 || frac.x < 0 || frac.x >= 65536 || frac.y >= 65536 || isNaN(frac.x) || isNaN(frac.y)) {
				addIssue(issues,
					lineNumber, index, 'error', 'unknown_frac',
					'Cannot figure out what fraction ${0} is',
					name
				)
				return undefined
			}
			return frac
		}
		let value = extractFraction(leftPart)
		if(value === undefined) {
			return
		}
		let component: Fraction[] | undefined = undefined
		if(rightPart !== undefined) {
			component = rightPart.split('+').map((comp) => {
				let value = extractFraction(comp.trim())
				return value
			}).filter((x) => x !== undefined) as Fraction[]
			// 验证相等
			if(Frac.compare(Frac.sum(...component), value) != 0) {
				addIssue(issues,
					lineNumber, index, 'warning', 'unequal_beats',
					'The beats ${0} does not equal to its components ${1}.',
					Frac.repr(value), component.map((frac) => (
						Frac.repr(frac)
					)).join('+')
				)
			}
		}
		return {
			value: value,
			component: component,
			defaultReduction: defaultTriplet ? 3 : 2
		}
	}
}

import { Frac, Fraction } from "../../util/frac"
import { md5 } from "../../util/md5"
import { DestructedArticle, DestructedFCA, DestructedLine, DestructedLyricLine, DestructedPart, DestructedScore, JumperAttr, LrcAttr, LyricChar, MusicDecorationRange, PartAttr } from "../sparse2des/types"

/*
列统计需要的工作：
- Fragment 层拉平（移除 fragment，统计声部存在性） √
- 跨小节分数位置分配 √
- 跨小节连音线处理 √
- 歌词行标准化 √
- 分行 √
*/

export type ColumnScore<ArticleType> = {
	lineNumber: number
	scoreProps: {
		title?: DestructedLine & {head: 'Dt'}
		subtitle?: DestructedLine & {head: 'Ds'}
		prescript?: DestructedLine & {head: 'Dp'}
		version?: DestructedLine & {head: 'Dv'}
		authors: (DestructedLine & {head: 'Da'})[]
		footnotes: (DestructedLine & {head: 'Df'})[]
	}
	musicalProps?: DestructedLine & {head: 'P'}
	renderProps?: DestructedLine & {head: 'Rp'}
	articles: ArticleType[]
}

export type Jumper = {
	startSection: number
	endSection: number
	openRange: boolean
	attrs: JumperAttr[]
}

export type TextArticle = {
	lineNumber: number
	type: 'text'
	title?: DestructedLine & {head: 'S'}
	renderProps?: DestructedLine & {head: 'Srp'}
	text: (DestructedLine & {head: 'T'})[]
}

export type LinkedArticleBase<LrcType> = TextArticle | {
	lineNumber: number
	type: 'music'
	/**
	 * 小节数量
	 */
	sectionCount: number
	title?: DestructedLine & {head: 'S'}
	musicalProps?: DestructedLine & {head: 'Sp'}
	renderProps?: DestructedLine & {head: 'Srp'}
	partSignatures: PartSignature[]
	jumpers: Jumper[]
	columns: Fraction[]
	parts: LinkedPartBase<LrcType>[]
	/**
	 * 根据渲染属性，每个位置开始的渲染行需要的小节数
	 */
	nMap: number[]
	/**
	 * 根据 Fragment 标记需要强制换行的位置
	 */
	breakMap: boolean[]
	/**
	 * 各小节的起始列和场宽
	 */
	sectionFields: [Fraction, Fraction][]
}
export type LinkedArticle = LinkedArticleBase<Linked1LyricLine>

export type LinkedPartBase<LrcType> = DestructedFCA & {
	lineNumber: number
	signature: PartSignature
	decorations: MusicDecorationRange[]
	notes: DestructedLine & {head: 'N'}
	lyricLines: LrcType[]
	indexMap: number[]
}
export type LinkedPart = LinkedPartBase<Linked1LyricLine>

export type Linked1LyricLine = DestructedLyricLine & {
	offset: number
	index: number
}

// =====================================================================

export type Linked2Article = LinkedArticleBase<Linked2LyricLine> & ({
	type: 'music'
	parts: {
		lyricLineSignatures: LyricLineSignature[]
	}[]
} | {
	type: 'text'
})
export type Linked2Part = LinkedPartBase<Linked2LyricLine> & {
	lyricLineSignatures: LyricLineSignature[]
}

export type Linked2LyricLineBase = DestructedFCA & {
	lineNumber: number
	/**
	 * 歌词行小节
	 */
	sections: Linked2LyricSection[]
	/**
	 * 标签签名
	 */
	signature: LyricLineSignature
	/**
	 * 替代旋律
	 */
	notesSubstitute: (DestructedLine & {head: 'Ns'})[]
}
export type Linked2LyricLine = Linked2LyricLineBase & {
	indexMap: number[]
	/**
	 * 标签属性
	 */
	attrsMap: LrcAttr[][]
}

export type Linked2LyricSection = {
	/**
	 * 小节序号
	 */
	ordinal: number
	/**
	 * 四分音符量
	 */
	startPos: Fraction
} & ({
	type: 'section'
	/**
	 * 歌词字符
	 */
	chars: Linked2LyricChar[]
} | {
	type: 'nullish'
})

export type Linked2LyricChar = LyricChar & {
	/**
	 * 小节内的起始位置
	 */
	startPos: Fraction
	/**
	 * 对应音符长度
	 */
	length: Fraction
}

// =====================================================================

export type LinedArticle = TextArticle | {
	lineNumber: number
	type: 'music'
	title?: DestructedLine & {head: 'S'}
	musicalProps?: DestructedLine & {head: 'Sp'}
	renderProps?: DestructedLine & {head: 'Srp'}
	partSignatures: PartSignature[]
	lines: LinedLine[]
}

export type LinedLine = {
	/**
	 * 起始列与场宽
	 */
	field: [Fraction, Fraction]
	/**
	 * 各小节的权重
	 */
	sectionWeights: number[]
	/**
	 * 各小节的额外边距
	 */
	sectionPadding: number[]
	/**
	 * 起始小节编号
	 */
	startSection: number
	/**
	 * 根据渲染属性，应当具有的小节数量
	 */
	sectionCountShould: number
	/**
	 * 实际小节数量
	 */
	sectionCount: number
	/**
	 * 能够渲染的跳房子
	 */
	jumpers: Jumper[]
	partSignatures: PartSignature[]
	parts: LinedPart[]
	/**
	 * 各小节的起始列和场宽
	 */
	sectionFields: [Fraction, Fraction][]
}

export type LinedPart = DestructedFCA & {
	lineNumber: number
	signature: PartSignature
	decorations: MusicDecorationRange[]
	index: number[]
	notes: DestructedLine & {head: 'N'}
	lyricLineSignatures: LyricLineSignature[]
	lyricLines: LinedLyricLine[]
}
export type LinedLyricLine = Linked2LyricLineBase & {
	index: number[]
	attrs: LrcAttr[]
}

// =====================================================================

export type ColumnSignature = {
	hash: string
	value: Fraction
}
export function columnSignature(value: Fraction) {
	return {
		hash: Frac.repr(value),
		value: value
	}
}

export type LyricLineSignature = {
	hash: string
	attrs: LrcAttr[]
} & ({
	type: 'index'
	index: number
} | {
	type: 'iter'
	iters: number[]
} | {
	type: 'text'
	text: string
} | {
	type: 'sub'
	text: string
	sub: string
})
export function lyricLineSignature(tags: LrcAttr[], index: number): LyricLineSignature {
	if(tags.length == 0) {
		return {
			hash: md5('index_' + index.toString()),
			type: 'index',
			index: index,
			attrs: tags
		}
	}
	const tag0 = tags[0]
	if(tag0.type == 'text') {
		return {
			hash: md5('text_' + tag0.text),
			type: 'text',
			text: tag0.text,
			attrs: tags
		}
	}
	if(tag0.type == 'scriptedText') {
		return {
			hash: md5('sub_' + tag0.text + '_' + tag0.sub),
			type: 'sub',
			text: tag0.text,
			sub: tag0.sub,
			attrs: tags
		}
	}
	if(tag0.type == 'iter') {
		const iters = tags.filter((x) => x.type == 'iter').map((attr) => {
			if(attr.type == 'iter') {
				return attr.iter
			}
			return -1
		}).sort()
		return {
			hash: md5('iter_' + iters.join('_')),
			type: 'iter',
			iters: iters,
			attrs: tags
		}
	}
	const _: never = tag0
	return undefined as any
}

export type PartSignature = {
	hash: string
} & ({
	type: 'titled'
	value: PartAttr[]
} | {
	type: 'untitled'
	value: number
})
export function partSignature(tags: PartAttr[], index: number): PartSignature {
	let hashStr = ''
	if(tags.length > 0) {
		const tag = tags[0]
		if(tag.type == 'text') {
			hashStr = 'text_' + tag.text
		} else if(tag.type == 'scriptedText') {
			hashStr = 'sub_' + tag.text + '_' + tag.sub
		} else {
			const _: never = tag
		}
	} else {
		hashStr = 'index_' + index.toString()
	}
	return {
		hash: md5(hashStr),
		type: tags.length > 0 ? 'titled' : 'untitled',
		value: (tags.length > 0 ? tags[0] : index) as any
	}
}

export function connectSigs(arr: {hash: string}[] | undefined) {
	if(undefined === arr) {
		return ''
	}
	return arr.map((sig) => {
		return sig.hash
	}).join('')
}

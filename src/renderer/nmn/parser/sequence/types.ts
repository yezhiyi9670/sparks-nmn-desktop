import { Fraction } from "../../util/frac"
import { ColumnScore, Linked2Article, PartSignature } from "../des2cols/types"
import { Beats, MusicProps, MusicSection, NoteCharMusic } from "../sparse2des/types"

export type SequencedScoreData = {
	/**
	 * 拉平后的乐谱数据
	 */
	score: ColumnScore<Linked2Article>
	/**
	 * 反复序列数据
	 */
	sequence: SequenceData,
}

export type SequenceData = (SequenceArticle | undefined)[]

/**
 * 反复序列
 * 
 * 接受 reset 指令时，如果迭代数不是 1，那么将开辟新的 SequenceIteration
 */
export type SequenceArticle = {
	/**
	 * 反复次数是否超过限制（往往由于结构内有死循环导致）
	 */
	overflow: boolean
	/**
	 * 是否发生冲突（指针以相同的迭代数经过同一个小节）
	 */
	conflict: boolean
	/**
	 * 反复迭代节
	 */
	iterations: SequenceIteration[]
}

export type SequenceIteration = {
	/**
	 * 谱面上的迭代数。由于可能存在 reset，未必与下标相同。
	 */
	number: number
	/**
	 * 小节列表
	 */
	sections: SequenceSection[]
}

export type SequenceSection = {
	/**
	 * 声部数据，按 hash 分存
	 */
	parts: {[hash: string]: SequencePartInfo}
	/**
	 * 小节序（供调试）
	 */
	ordinal: number
	/**
	 * 小节下标
	 */
	index: number
	/**
	 * 每分钟四分音符数量
	 */
	qpm: number
	/**
	 * 拍号
	 */
	beats: Beats
	/**
	 * 按四分音符的小节长度，抄写自乐谱信息。
	 */
	lengthQuarters: Fraction
	/**
	 * 按毫秒数的小节长度
	 */
	lengthMillis: number
	/**
	 * 按毫秒数的累计小节长度
	 */
	cumulativeLengthMillis: number
}

export type SequencePartInfo = {
	/**
	 * 实际的声部签名
	 */
	signature: PartSignature
	/**
	 * 音乐小节信息
	 */
	section: MusicSection<NoteCharMusic>
	/**
	 * 实际音乐属性
	 *
	 * 与乐谱渲染数据中音乐属性的区别在于依赖于反复结构的基调和拍速。
	 */
	props: MusicProps
}

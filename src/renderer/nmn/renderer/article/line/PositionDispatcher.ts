import { NMNResult } from "../../.."
import { ScoreContext } from "../../../parser/sparse2des/context"
import { MusicSection, NoteCharAny, sectionSeparatorInset } from "../../../parser/sparse2des/types"
import { countArray, findIndexWithKey, findWithKey } from "../../../util/array"
import { Frac, Fraction } from "../../../util/frac"
import { DomPaint } from "../../backend/DomPaint"
import { MusicPaint } from "../../paint/MusicPaint"
import { RenderContext } from "../../renderer"
import { addNotesScale, getLineFont } from "./font/fontMetrics"

type NMNLine = (NMNResult['result']['articles'][0] & {type: 'music'})['lines'][0]
const checkEps = 0.001

export const positionDispatcherStats = {
	computeTime: 0
}

type SectionPositions = {
	/**
	 * 原本的边界位置
	 */
	realRange: [number, number]
	/**
	 * 边界位置
	 */
	range: [number, number]
	/**
	 * 边界边距
	 */
	padding: [number, number]
	/**
	 * 左边界和右边界的分数位置
	 */
	fraction: [Fraction, Fraction]
	/**
	 * 限制条件
	 */
	columns: ColumnPosition[]
}
type ColumnPosition = {
	/**
	 * 分数位置的签名
	 */
	hash: string
	/**
	 * 文本两侧占据排版空间的场宽（在边距内计算）
	 */
	field: [number, number]
	/**
	 * 文本两侧不占据排版空间，但是必须满足的场宽（可以与边距重叠，但不能超过边界）
	 */
	requiredField: [number, number]
	/**
	 * 是否将 requiredField 固化为 field
	 */
	rigid: [boolean, boolean]
	/**
	 * 分数位置
	 */
	fraction: Fraction
	/**
	 * 分配的位置
	 */
	position: number
}

/**
 * 列空间分配算法
 */
export class PositionDispatcher {
	root: DomPaint
	line: NMNLine
	context: RenderContext
	scale: number
	data: SectionPositions[] = []

	constructor(root: DomPaint, line: NMNLine, context: RenderContext, dispatch: boolean = true) {
		this.root = root
		this.line = line
		this.context = context
		this.scale = context.render.scale!
		if(dispatch) {
			this.dispatch()
		}
	}

	/**
	 * 获取起始位置
	 */
	startPosition(sectionIndex: number) {
		return this.data[sectionIndex].realRange[0]
	}
	/**
	 * 获取起始位置
	 */
	paddedStartPosition(sectionIndex: number) {
		return this.data[sectionIndex].realRange[0] + this.data[sectionIndex].padding[0]
	}
	/**
	 * 获取结束位置
	 */
	endPosition(sectionIndex: number) {
		return this.data[sectionIndex].realRange[1]
	}
	/**
	 * 获取结束位置
	 */
	paddedEndPosition(sectionIndex: number) {
		return this.data[sectionIndex].realRange[1] - this.data[sectionIndex].padding[1]
	}
	/**
	 * 获取分数位置的位置
	 */
	fracPosition(sectionIndex: number, frac: Fraction) {
		const columns = this.data[sectionIndex].columns
		const col = findWithKey(columns, 'hash', Frac.repr(frac))
		if(!col) {
			throw new Error('Unknown column queried in PositionDispatcher')
		}
		return col.position
	}
	/**
	 * 获取分数位置（或者其后的任意位置）在渲染行中的位置，如果不存在，返回最后一小节右边界位置
	 */
	fracEndPosition(frac: Fraction) {
		for(let section of this.data) {
			for(let column of section.columns) {
				if(Frac.compare(frac, column.fraction) <= 0) {
					return column.position
				}
			}
			// 这里使用右边界分数位置是不对的，因为它可能被修改过。好在目前没有。
			if(Frac.compare(frac, section.fraction[1]) <= 0) {
				return section.realRange[1] - section.padding[1]
			}
		}
		return this.paddedEndPosition(this.data.length - 1)
	}
	/**
	 * 获取分数位置的前间隙位置
	 */
	fracInsertPosition(sectionIndex: number, frac: Fraction, symbolOrdinal: number, totalSymbols: number) {
		const columns = this.data[sectionIndex].columns
		const colIndex = findIndexWithKey(columns, 'hash', Frac.repr(frac))
		const lastCol = columns[columns.length - 1]!
		let pos0 = 0
		let pos1 = 0
		if(-1 == colIndex) {
			if(Frac.compare(frac, lastCol.fraction) > 0) {
				pos1 = this.data[sectionIndex].range[1]
				pos0 = lastCol.position
			} else {
				throw new Error('Unknown column queried in PositionDispatcher')
			}
		} else {
			const col = columns[colIndex]!
			pos1 = col.position
			if(colIndex > 0) {
				pos0 = columns[colIndex - 1].position
			} else {
				pos0 = this.data[sectionIndex].range[0]
			}
		}
		return pos0 + (pos1 - pos0) / (1 + totalSymbols) * (1 + symbolOrdinal)
	}

	/**
	 * 分配位置
	 */
	dispatch() {
		positionDispatcherStats.computeTime -= +new Date()
		this.dispatch$setSections()
		this.dispatch$statColumns()
		this.dispatch$compute()
		// console.log('Column slot', this.data)
		positionDispatcherStats.computeTime += +new Date()
	}
	/**
	 * 分配位置 - 统计小节
	 */
	dispatch$setSections() {
		const msp = new MusicPaint(this.root)
		const gutterLeft = this.context.render.gutter_left!
		const leftBoundary = gutterLeft * this.scale
		const rightBoundary = 100
		const sectionPadding = 1 * this.scale
		
		let currentStart = leftBoundary
		let totalWeights = 0
		this.line.sectionWeights.forEach((weight) => {
			totalWeights += weight
		})
		totalWeights += this.line.sectionCountShould - this.line.sectionCount
		
		this.line.sectionFields.forEach((fields, index) => {
			let currentEnd = currentStart + (rightBoundary - leftBoundary) / totalWeights * this.line.sectionWeights[index]
			const [ rangeL, rangeR ] = [ currentStart, currentEnd ]
			currentStart = currentEnd
			const newSec: SectionPositions = {
				realRange: [rangeL, rangeR],
				range: [rangeL, rangeR],
				padding: [ sectionPadding, sectionPadding ],
				fraction: [ Frac.sub(fields[0], Frac.create(1, 2)), Frac.add(fields[0], fields[1]) ], // 开头扩展半个四分音符的位置，以调和“极不自然”的不对称性
				columns: []
			}
			let beforeBeatsWidth = 0
			let afterBeatsWidth = 0
			let maxInset = [0, 0]
			this.line.parts.forEach((part) => {
				const section = part.notes.sections[index]
				const beforeAttrs = section.separator.before.attrs
				const afterAttrs = section.separator.after.attrs
				const beforeBeats = findWithKey(beforeAttrs, 'type', 'beats')
				if(beforeBeats) {
					if(beforeBeats.type != 'beats') throw new Error('strange!')
					beforeBeatsWidth = Math.max(beforeBeatsWidth,
						msp.drawBeats(0, 0, beforeBeats.beats, 0.95, this.scale, {}, true)[0] + this.scale * 0.5
					)
				}
				const afterBeats = findWithKey(afterAttrs, 'type', 'beats')
				if(afterBeats) {
					if(afterBeats.type != 'beats') throw new Error('strange!')
					afterBeatsWidth = Math.max(afterBeatsWidth,
						msp.drawBeats(0, 0, afterBeats.beats, 0.95, this.scale, {}, true)[0] + this.scale * 0.5
					)
				}
				const separatorInset = sectionSeparatorInset(section.separator, index == 0)
				maxInset = [
					Math.max(maxInset[0], separatorInset[0]),
					Math.max(maxInset[1], separatorInset[1])
				]
			})
			
			if(beforeBeatsWidth != 0) {
				newSec.range[0] += beforeBeatsWidth + maxInset[0] * this.scale
			} else if(index == 0) {
				newSec.range[0] += maxInset[0] * this.scale * 0.75
			}
			if(afterBeatsWidth != 0) {
				newSec.range[1] -= afterBeatsWidth + maxInset[1] * this.scale
			}
			this.data.push(newSec)
		})
	}
	/**
	 * 分配位置 - 统计布局列
	 */
	dispatch$statColumns() {
		// 记录限制条件信息
		const addConstraint = (pos: Fraction, index: number, field: [number, number], occupiesSpace: boolean) => {
			const currentSection = this.data[index]
			const fracSign = Frac.repr(pos)
			let current = findWithKey(currentSection.columns, 'hash', fracSign)
			if(!current) {
				currentSection.columns.push(current = {
					hash: fracSign,
					fraction: pos,
					field: [0, 0],
					requiredField: [0, 0],
					rigid: [false, false],
					position: currentSection.range[0] + currentSection.padding[0]
				})
			}
			if(occupiesSpace) {
				current.field = [
					Math.max(current.field[0], field[0]),
					Math.max(current.field[1], field[1])
				]
			}
			current.requiredField = [
				Math.max(current.requiredField[0], field[0]),
				Math.max(current.requiredField[1], field[1])
			]
		}
		const handleSections = (sections: MusicSection<NoteCharAny>[] | undefined, isMusic: boolean, isSmall: boolean, rangeStart: number = 0) => {
			if(!sections) {
				return
			}
			const noteCharMetric = getLineFont(isSmall ? 'noteSmall' : 'note', this.context)
			const accidentalCharMetric = getLineFont(isSmall ? 'noteSmall' : 'note', this.context)
			accidentalCharMetric.fontFamily = 'SparksNMN-Bravura'
			const noteCharMeasure = this.root.measureTextFast('0', noteCharMetric, this.scale)
			const accidentalMeasure = this.root.measureTextFast("\uE10E", accidentalCharMetric, this.scale)
			const addNoteCharMeasure = [noteCharMeasure[0] * addNotesScale, 0]
			sections.forEach((section, sectionIndex) => {
				const actualIndex = sectionIndex + rangeStart
				if(actualIndex < 0 || actualIndex > this.line.sectionFields.length) {
					return
				}
				if(section.type != 'section') {
					return
				}
				section.notes.forEach((note) => {
					const fracPos = Frac.add(this.line.sectionFields[actualIndex][0], note.startPos)
					if(isMusic) {
						let hasAccidental = false
						let hasSlide = false
						let leftAddCount = 0
						let rightAddCount = 0
						let dotCount = 0
						if(note.type == 'note') {
							const noteChar = note.char
							if(noteChar.type != 'music') {
								throw new Error('Position dispatching occured with a non-music note.')
							}
							if(noteChar.delta == noteChar.delta) {
								hasAccidental = true
							}
							for(let attr of note.attrs) {
								if(attr.type == 'notes') {
									if(attr.slot == 'prefix') {
										leftAddCount = attr.notes.type == 'section' ? attr.notes.notes.length : 0
									} else if(attr.slot == 'postfix') {
										rightAddCount = attr.notes.type == 'section' ? attr.notes.notes.length : 0
									}
								} else if(attr.type == 'slide') {
									hasSlide = true
								}
							}
							dotCount = countArray(note.suffix, '.')
						}
						const normalCharWidthRatio = 1.1
						addConstraint(fracPos, actualIndex, [
							noteCharMeasure[0] / 2 * normalCharWidthRatio,
							noteCharMeasure[0] / 2 * normalCharWidthRatio
						], true) // 音符本身占据排版域
						addConstraint(fracPos, actualIndex, [
							noteCharMeasure[0] / 2 * normalCharWidthRatio + (+hasAccidental) * accidentalMeasure[0] + leftAddCount * addNoteCharMeasure[0] / 2 + noteCharMeasure[1] * 1.2,
							noteCharMeasure[0] / 2 * normalCharWidthRatio + Math.max(
								noteCharMeasure[0] / 2 * dotCount,
								rightAddCount * addNoteCharMeasure[0] / 2 + noteCharMeasure[1] * 1.2,
								(+hasSlide) * noteCharMeasure[1] * 0.45 * this.scale)
						], false) // 音符的附加符号（升降调、装饰音、滑音）的排版空间必须满足，但不需要参与计算
					} else {
						if(note.type != 'extend' && !('void' in note.char)) {
							addConstraint(fracPos, actualIndex, [0, 0], false) // 标记内容不参与自动排版，但是保留席位
						}
					}
				})
			})
		}
		const msp = new MusicPaint(this.root)
		this.line.parts.forEach((part) => {
			handleSections(part.notes.sections, true, false)
			handleSections(part.force?.sections, false, false)
			handleSections(part.chord?.sections, false, false)
			part.annotations.forEach((ann) => {
				handleSections(ann.sections, false, false)
			})
			part.lyricLines.forEach((lrcLine) => {
				// 歌词占位推断
				lrcLine.sections.forEach((lrcSection, sectionIndex) => {
					if(lrcSection.type != 'section') {
						return
					}
					const chars = lrcSection.chars
					chars.forEach((char, charIndex) => {
						const lrcMetric = getLineFont('lyrics', this.context)
						if(char.occupiesSpace) {
							const boundaries = msp.drawLyricChar(this.context, 0, 0, 0, char, 'center', this.scale, {}, true)
							let rpt = charIndex + 1
							while(true) {
								const rChar = chars[rpt]
								if(rChar === undefined || rChar.occupiesSpace) {
									break
								}
								rpt += 1
							}
							for(let i = charIndex + 1; i < rpt; i++) {
								const char2 = chars[i]
								boundaries[1] += msp.drawLyricChar(this.context, 0, 0, 0, char2, 'left', this.scale, {}, true)[1]
							}
							let lm = 0
							let rm = 0
							const dm = this.root.measureTextFast('a', lrcMetric, this.scale)[0] / 2
							// 词基歌词的单词左右需要留空位，防止单词粘连。
							if(!char.isCharBased) {
								const preChar = chars[charIndex - 1]
								if(!char.prefix && preChar && preChar.occupiesSpace) {
									lm = dm
								}
								const postChar = chars[charIndex - 1]
								if(!char.postfix && postChar && postChar.occupiesSpace) {
									rm = dm
								}
							}
							addConstraint(Frac.add(lrcSection.startPos, char.startPos), sectionIndex, [
								-boundaries[0] + lm,
								boundaries[1] + rm
							], false)
						}
					})
				})
				handleSections(lrcLine.force?.sections, false, false)
				handleSections(lrcLine.chord?.sections, false, false)
				lrcLine.annotations.forEach((ann) => {
					handleSections(ann.sections, false, false)
				})
				lrcLine.notesSubstitute.forEach((Ns) => {
					handleSections(Ns.sections, true, true, Ns.substituteLocation)
				})
			})
		})
		// 排序以便后续布局
		this.line.sectionFields.forEach((_, i) => {
			const data = this.data[i]
			// 若没有列，添加一个防止后续出现问题
			if(data.columns.length == 0) {
				addConstraint(data.fraction[1], i, [0, 0], true)
			}
			// 若最大列距离右边界有超过八分音符的距离，将右边界缩短一个八分音符
			// let maxCol = Frac.max(...data.columns.map((x) => x.fraction))
			// if(Frac.compare(Frac.sub(data.fraction[1], maxCol), Frac.create(1, 2)) > 0) {
			// 	if(Frac.compare(Frac.sub(data.fraction[1], data.fraction[0]), Frac.create(1, 1)) > 0) {
			// 		data.fraction[1] = Frac.sub(data.fraction[1], Frac.create(1, 2))
			// 	}
			// }
			data.columns.sort((x, y) => {
				return Frac.compare(x.fraction, y.fraction)
			})
		})
	}
	/**
	 * 分配位置 - 计算布局
	 */
	dispatch$compute() {
		this.line.sectionFields.forEach((_, sectionIndex) => {
			const attempDispatch = () => {
				const data = this.data[sectionIndex]
				
				// ===== 统计权重 =====
				let totalSpare = data.range[1] - data.range[0]
				const weights: Fraction[] = []
				for(let i = 0; i < data.columns.length; i++) {
					// 间隙 0 ~ L - 1
					let prevFrac = data.fraction[0]
					const isRigid = data.columns[i].rigid[0]
					if(i > 0) {
						prevFrac = data.columns[i - 1].fraction
					}
					if(isRigid) {
						weights.push(Frac.create(0))
					} else {
						weights.push(Frac.sub(data.columns[i].fraction, prevFrac))
					}
					// 计算总空间
					if(i > 0) {
						if(isRigid) {
							totalSpare -= Math.max(data.columns[i].field[0], data.columns[i].requiredField[0])
							totalSpare -= Math.max(data.columns[i - 1].field[1], data.columns[i - 1].requiredField[1])
						} else {
							totalSpare -= data.columns[i].field[0] + data.columns[i - 1].field[1]
						}
					} else {
						if(isRigid) {
							// 左边沿已经固化，不计算边距空间
							totalSpare -= Math.max(data.padding[0] + data.columns[i].field[0], data.columns[i].requiredField[0])
						} else {
							totalSpare -= data.padding[0] + data.columns[i].field[0]
						}
					}
				}
				// 间隙 L
				let lastColumn = data.columns[data.columns.length - 1]!
				if(lastColumn.rigid[1]) {
					totalSpare -= Math.max(data.padding[1] + lastColumn.field[1], lastColumn.requiredField[1])
					weights.push(Frac.create(0))
				} else {
					totalSpare -= data.padding[1] + lastColumn.field[1]
					weights.push(Frac.sub(data.fraction[1], lastColumn.fraction))
				}
				const totalWeight = Frac.sum(...weights)
				// ===== 分配位置 =====
				let currentPos = data.range[0]
				for(let i = 0; i < data.columns.length; i++) {
					let isRigid = data.columns[i].rigid[0]
					if(isRigid) {
						if(i > 0) {
							currentPos += data.columns[i].requiredField[0]
						} else {
							currentPos += Math.max(data.padding[0] + data.columns[i].field[0], data.columns[i].requiredField[0])
						}
					} else {
						if(i == 0) {
							currentPos += data.padding[0]
						}
						currentPos += data.columns[i].field[0]
						currentPos += totalSpare / Frac.toFloat(totalWeight) * Frac.toFloat(weights[i])
					}
					data.columns[i].position = currentPos
					isRigid = data.columns[i].rigid[1]
					if(isRigid) {
						currentPos += data.columns[i].requiredField[1]
					} else {
						currentPos += data.columns[i].field[1]
					}
				}
			}
			const checkRequired = (): 'pass' | 'dead' | 'continue' => {
				const data = this.data[sectionIndex]
				
				// 完成：所有条件被满足
				// 没救了：被固化的条件仍然无法满足（此时在不固化任何条件的情况下再分配一次即结束）
				let needContinue = false
				let lastPos = data.range[0]
				for(let i = 0; i < data.columns.length; i++) {
					const isRigid = data.columns[i].rigid[0]
					let requiredField = data.columns[i].requiredField[0]
					if(i > 0) {
						requiredField += data.columns[i - 1].requiredField[1]
					}
					const currPos = data.columns[i].position
					if(currPos - lastPos + checkEps < requiredField) {
						if(isRigid) {
							return 'dead'
						} else {
							data.columns[i].rigid[0] = true
							if(i > 0) {
								data.columns[i - 1].rigid[1] = true
							}
							needContinue = true
						}
					}
					lastPos = currPos
				}
				const currPos = data.range[1]
				let lastColumn = data.columns[data.columns.length - 1]!
				const isRigid = lastColumn.rigid[1]
				if(currPos - lastPos + checkEps < lastColumn.requiredField[1]) {
					if(isRigid) {
						return 'dead'
					} else {
						lastColumn.rigid[1] = true
						needContinue = true
					}
				}
				if(needContinue) {
					return 'continue'
				} else {
					return 'pass'
				}
			}
			const clearRigid = () => {
				const data = this.data[sectionIndex]
				data.columns.forEach((col) => {
					col.rigid[0] = col.rigid[1] = false
				})
			}
			let iters = 0
			clearRigid()
			while(true) {
				attempDispatch()
				const ch = checkRequired()
				if(ch == 'pass') {
					return
				} else if(ch == 'dead') {
					clearRigid()
					attempDispatch()
					break
				}
			}
		})
	}
}

import { NMNResult } from "../../.."
import { I18n } from "../../../i18n"
import { SectionStat } from "../../../parser/des2cols/section/SectionStat"
import { connectSigs, Linked2LyricChar } from "../../../parser/des2cols/types"
import { DestructedFCA, LrcAttr, MusicNote, MusicSection, NoteCharChord, NoteCharForce, NoteCharText } from "../../../parser/sparse2des/types"
import { findWithKey } from "../../../util/array"
import { Frac, Fraction } from "../../../util/frac"
import { DomPaint } from "../../backend/DomPaint"
import { FontMetric } from "../../FontMetric"
import { MusicPaint } from "../../paint/MusicPaint"
import { PaintTextToken } from "../../paint/PaintTextToken"
import { EquifieldSection, RenderContext } from "../../renderer"
import { reductionLineSpace } from "./font/fontMetrics"
import { PositionDispatcher } from "./PositionDispatcher"
import { SectionsRenderer } from "./SectionsRenderer"

type NMNLine = (NMNResult['result']['articles'][0] & {type: 'music'})['lines'][0]
type NMNPart = NMNLine['parts'][0]
type NMNLrcLine = NMNPart['lyricLines'][0]

type LrcSymbol = {
	char: Linked2LyricChar,
	boundaries: [number, number],
	startX: number,
	endX: number
}

export const lineRendererStats = {
	sectionsRenderTime: 0
}

type LyricFallbackStat = {
	sectionTop: number[]   // 各小节的顶端高度
	startY: number[]       // 歌词行分配得到的高度
}

export class LineRenderer {
	columns!: PositionDispatcher
	musicLineYs: { top: number, middle: number, bottom: number }[] = []

	/**
	 * 渲染曲谱行
	 */
	renderLine(line: NMNLine, sections: EquifieldSection[], context: RenderContext, lastLine: NMNLine | undefined, root: DomPaint, startY: number) {
		// const root = new DomPaint()
		const scale = context.render.scale!
		let currY = startY
		currY += context.render.margin_before_line!

		// ===== 列空间自动布局 =====
		this.columns = new PositionDispatcher(root, line, context)
		
		// ===== 渲染声部 =====
		let isFirst = true
		this.musicLineYs = []
		line.parts.forEach((part) => {
			currY += this.renderPart(currY, part, root, context, line, lastLine, isFirst)
			isFirst = false
		})

		// ===== 连谱号 =====
		if(line.parts.length > 1) {
			const upperY = this.musicLineYs[0].top
			const lowerY = this.musicLineYs[this.musicLineYs.length - 1].bottom
			const leftX = context.render.connector_left! * scale
			const rightX = leftX + 1 * scale
			root.drawLine(leftX, upperY, leftX, lowerY, 0.2, 0.1, scale)
			root.drawLine(leftX, upperY, rightX, upperY, 0.2, 0.1, scale)
			root.drawLine(leftX, lowerY, rightX, lowerY, 0.2, 0.1, scale)
		}

		sections.push({
			element: root.getElement(),
			height: currY * scale
		})

		sections.push({
			element: new DomPaint().getElement(),
			height: context.render.margin_after_line! * scale,
			isMargin: true
		})
	}

	/**
	 * 渲染声部，包含声部的名称标记
	 */
	renderPart(startY: number, part: NMNPart, root: DomPaint, context: RenderContext, line: NMNLine, lastLine: NMNLine | undefined, isFirst: boolean) {
		let currY = startY
		const scale = context.render.scale!
		let shouldLabel = context.render.explicitmarkers! || (connectSigs(line.partSignatures) != connectSigs(lastLine?.partSignatures))
		const msp = new MusicPaint(root)

		// ===== 渲染FCA =====
		currY += this.renderLineFCA(currY, part, false, root, context)
		// ===== 渲染跳房子 =====
		const jumperRet = this.renderJumpers(currY, part, line, isFirst, root, context)
		currY += jumperRet[0]
		const hasJumperOverlap = jumperRet[1]
		// ===== 渲染音乐行 =====
		currY += this.renderPartNotes(currY, part, root, context, hasJumperOverlap, isFirst)
		const lastYs = this.musicLineYs[this.musicLineYs.length - 1]
		// ===== 标记声部名称 =====
		if(shouldLabel) {
			msp.drawPartName(context, scale * (-0.5 + context.render.connector_left!), lastYs.middle, part.notes.tags, 1, scale)
		}

		currY += context.render.margin_after_part_notes!
		if(part.lyricLines.length != 0) {
			currY -= context.render.inset_before_lyrics!
		}

		// ===== 根据回落模型计算歌词行起始高度 =====
		const stat: LyricFallbackStat = {
			sectionTop: Array(line.sectionCount).fill(currY),
			startY: []
		}
		let cursorY = currY
		part.lyricLines.forEach((lyricLine, index) => {
			let putHeight = currY
			if(lyricLine.notesSubstitute.length != 0) {
				// 有替代旋律的不参与回落
				putHeight = cursorY
			} else {
				lyricLine.sections.forEach((section, index) => {
					if(SectionStat.isLyricSectionRenderWorthy(lyricLine, index)) {
						putHeight = Math.max(putHeight, stat.sectionTop[index])
					}
				})
			}

			// 统计等级占用
			stat.startY[index] = putHeight
			let currNextY = putHeight + this.heightLyricLine(putHeight, lyricLine, part, line, root, context)
			cursorY = Math.max(cursorY, currNextY)
			this.statLyricLineOccupation(lyricLine, stat.sectionTop, currNextY)
		})
		currY = cursorY

		// ===== 渲染歌词行 =====
		part.lyricLines.forEach((lyricLine, index) => {
			this.renderLyricLine(stat.startY[index], lyricLine, part, line, root, context)
		})

		currY += context.render.margin_after_part!

		return currY - startY
	}

	/**
	 * 统计歌词行的小节占用
	 */
	statLyricLineOccupation(lyricLine: NMNLrcLine, arr: number[], fill: number) {
		if(lyricLine.notesSubstitute.length > 0) {
			// 有替代旋律的占据整个小节
			for(let i = 0; i < arr.length; i++) {
				arr[i] = Math.max(arr[i], fill)
			}
			return
		}
		lyricLine.sections.forEach((section, index) => {
			if(SectionStat.isLyricSectionRenderWorthy(lyricLine, index)) {
				arr[index] = Math.max(arr[index], fill)
			}
		})
		// lyricLine.notesSubstitute.forEach((Ns) => {
		// 	for(let i = Ns.substituteLocation; i < Ns.substituteLocation + Ns.sections.length; i++) {
		// 		arr[i] = Math.max(arr[i], fill)
		// 	}
		// })
	}

	/**
	 * 推断歌词行的高度
	 */
	heightLyricLine(startY: number, lyricLine: NMNLrcLine, part: NMNPart, line: NMNLine, root: DomPaint, context: RenderContext) {
		const lrcLineField = 2.2 * new FontMetric(context.render.font_lyrics!, 2.16).fontScale
		const substituteField = 4.4
		const lrcLineMarginBottom = 1.0

		let currY = startY
		const shouldDrawLyrics = !SectionStat.allLyricEmpty(lyricLine.sections)
		const shouldDrawSubstitute = lyricLine.notesSubstitute.length > 0
		currY += this.heightLineFCA(startY, lyricLine, true, root, context)
		if(shouldDrawSubstitute) {
			currY += substituteField
		}
		if(shouldDrawLyrics) {
			currY += lrcLineField
		}
		currY += lrcLineMarginBottom

		return currY - startY
	}

	/**
	 * 渲染歌词行
	 */
	renderLyricLine(startY: number, lyricLine: NMNLrcLine, part: NMNPart, line: NMNLine, root: DomPaint, context: RenderContext) {
		let currY = startY

		const lrcLineField = 2.2 * new FontMetric(context.render.font_lyrics!, 2.16).fontScale
		const substituteField = 4.4
		const lrcLineMarginBottom = 1.0
		const labelPrevOffset = context.render.offset_lyrics_iter!

		const scale = context.render.scale!
		const msp = new MusicPaint(root)
		const noteMeasure = msp.measureNoteChar(context, false, scale)
		const lrcCharMeasure = root.measureText('0我', new FontMetric(context.render.font_lyrics!, 2.16), scale)

		// ===== 渲染歌词行FCA =====
		currY += this.renderLineFCA(startY, lyricLine, true, root, context)

		const shouldDrawLyrics = !SectionStat.allLyricEmpty(lyricLine.sections)
		const shouldDrawSubstitute = lyricLine.notesSubstitute.length > 0

		// ===== 替代旋律 =====
		if(shouldDrawSubstitute) {
			let labelPrevPos = 100

			currY += substituteField / 2

			let lastLabel: LrcAttr[] = []
			lyricLine.notesSubstitute.forEach((Ns) => {
				const startSection = Math.max(line.startSection, line.startSection + Ns.substituteLocation)
				const endSection = Math.min(line.startSection + line.sectionCount, line.startSection + Ns.substituteLocation + Ns.sections.length)
				
				const sections = Ns.sections.slice(startSection - Ns.substituteLocation - line.startSection, endSection - Ns.substituteLocation - line.startSection)
				const decorations = Ns.decorations

				const localColumns = new PositionDispatcher(root, line, context, false)
				localColumns.data = this.columns.data.slice(startSection - line.startSection, endSection - line.startSection)

				// 画小节
				lineRendererStats.sectionsRenderTime -= +new Date()
				new SectionsRenderer(localColumns).render(currY, { notes: { sections }, decorations: decorations }, root, context, false, false, true)
				lineRendererStats.sectionsRenderTime += +new Date()

				// 画括号
				msp.drawInsert(context, localColumns.startPosition(0), currY, { type: 'insert', char: 'lpr' }, true, scale)
				msp.drawInsert(context, localColumns.endPosition(localColumns.data.length - 1), currY, { type: 'insert', char: 'rpr' }, true, scale)
				labelPrevPos = Math.min(localColumns.startPosition(0)) - labelPrevOffset * scale

				if(Ns.tags.length > 0) {
					lastLabel = Ns.tags
				}
			})

			// 绘制迭代数符号
			if(labelPrevPos !== Infinity) {
				msp.drawLyricLabel(context, labelPrevPos, currY, lastLabel, scale)
			}

			currY += substituteField / 2
		}

		// ===== 歌词行 =====
		if(shouldDrawLyrics) {
			currY += lrcLineField / 2
			let labelPrevPos = 100

			const lrcSymbols: LrcSymbol[] = []
			// 统计此行歌词字符
			lyricLine.sections.forEach((section, sectionIndex) => {
				if(section.type != 'section') {
					return
				}
				section.chars.forEach((note) => {
					const startFrac = Frac.add(section.startPos, note.startPos)
					const endFrac = Frac.add(startFrac, note.length)
					const pos = this.columns.fracPosition(sectionIndex, startFrac)
					const endPos = this.columns.fracEndPosition(endFrac)
					lrcSymbols.push({
						char: note,
						startX: pos,
						endX: endPos,
						boundaries: [0, 0]
					})
				})
			})
			// 渲染不需要推断位置的符号
			lrcSymbols.forEach((symbol, index) => {
				if(symbol.char.occupiesSpace) {
					symbol.boundaries = msp.drawLyricChar(context, symbol.startX, symbol.endX, currY, symbol.char, 'center', scale)
					if(symbol.char.postfix || symbol.char.prefix || symbol.char.text || symbol.char.rolePrefix || symbol.char.extension) {
						labelPrevPos = Math.min(labelPrevPos, symbol.boundaries[0])
					}
				}
			})
			// 渲染需要推断位置的符号
			function isEffectiveSymbol(char: Linked2LyricChar) {
				return char.occupiesSpace && (
					char.text != '' || char.prefix != '' || char.postfix != ''
				)
			}
			function countInserts(symbols: LrcSymbol[], leftBound: number, rightBound: number) {
				let cnt = 0
				for(let i = leftBound; i < rightBound; i++) {
					if(symbols[i] && !symbols[i].char.occupiesSpace) {
						cnt += 1
					}
				}
				return cnt
			}
			lrcSymbols.forEach((symbol, index) => {
				if(!symbol.char.occupiesSpace) {
					let indexLpt = index
					while(indexLpt >= 0 && !isEffectiveSymbol(lrcSymbols[indexLpt].char)) {
						indexLpt -= 1
					}
					let indexRpt = index
					while(indexRpt < lrcSymbols.length && !isEffectiveSymbol(lrcSymbols[indexRpt].char)) {
						indexRpt += 1
					}
					let leftSymbol = lrcSymbols[indexLpt]
					let rightSymbol = lrcSymbols[indexRpt]
					if(!leftSymbol && !rightSymbol) {
						return
					}
					if(!leftSymbol) {
						// 左端孤儿
						const anchor = rightSymbol.boundaries[0]
						symbol.boundaries = msp.drawLyricChar(context, anchor, 0, currY, symbol.char, 'right', scale)
					} else if(!rightSymbol) {
						// 右端孤儿
						const anchor = leftSymbol.boundaries[1]
						symbol.boundaries = msp.drawLyricChar(context, anchor, 0, currY, symbol.char, 'left', scale)
					} else {
						// 双端
						let dispY = countInserts(lrcSymbols, indexLpt, indexRpt) + 1
						let dispX = countInserts(lrcSymbols, indexLpt, index) + 1
						let leftAnchor = leftSymbol.boundaries[1]
						let rightAnchor = rightSymbol.boundaries[0]
						const anchor = (rightAnchor - leftAnchor) * (dispX / dispY) + leftAnchor
						symbol.boundaries = msp.drawLyricChar(context, anchor, 0, currY, symbol.char, 'center', scale)
					}
					labelPrevPos = Math.min(labelPrevPos, symbol.boundaries[0])
				}
			})
			// 绘制延长线
			lrcSymbols.forEach((symbol, index) => {
				if(symbol.char.extension) {
					const startX = symbol.boundaries[1]
					let nextSymbol = lrcSymbols[index + 1]
					let endX = 0
					if(!nextSymbol) {
						endX = this.columns.endPosition(this.columns.data.length - 1)
					} else {
						endX = nextSymbol.boundaries[0]
					}
					endX = Math.min(endX, symbol.endX - noteMeasure[0] / 2)
					// 确保绘制连续的延长线
					if(nextSymbol && nextSymbol.char.text == '' && nextSymbol.char.extension) {
						endX = nextSymbol.startX
					}
					if(endX <= startX) {
						return
					}
					const lineY = currY + lrcCharMeasure[1] / 2
					root.drawLine(startX, lineY, endX, lineY, 0.15, 0, scale)
				}
			})

			// 绘制迭代数符号
			if(labelPrevPos) {
				msp.drawLyricLabel(context, labelPrevPos - labelPrevOffset * scale, currY, lyricLine.signature.attrs, scale)
			}

			currY += lrcLineField / 2
		}

		currY += lrcLineMarginBottom
		return currY - startY
	}

	/**
	 * 推断 FCA 标记高度
	 */
	heightLineFCA(startY: number, line: DestructedFCA, isSmall: boolean, root: DomPaint, context: RenderContext) {
		let currY = startY
		const msp = new MusicPaint(root)
		const scale = context.render.scale!
		const noteMeasure = msp.measureNoteChar(context, isSmall, scale)
		const FCALineField = 1.0 * noteMeasure[1]

		// ===== 文本标记 =====
		for(let i = line.annotations.length - 1; i >= 0; i--){
			let ann = line.annotations[i]
			if(SectionStat.allEmpty(ann.sections, 0, ann.sections.length)) {
				continue
			}
			currY += FCALineField / 2
			currY += FCALineField / 2
		}
		// ===== 力度 =====
		if(line.force && !SectionStat.allEmpty(line.force.sections, 0, line.force.sections.length)) {
			currY += FCALineField / 2
			currY += FCALineField / 2
		}
		// ===== 和弦 =====
		if(line.chord && !SectionStat.allEmpty(line.chord.sections, 0, line.chord.sections.length)) {
			currY += FCALineField / 2
			currY += FCALineField / 2
		}

		if(!isSmall) {
			currY -= 1.5
		}
		currY = Math.max(currY, startY)
		return currY - startY
	}
	/**
	 * 渲染 FCA 标记
	 */
	renderLineFCA(startY: number, line: DestructedFCA, isSmall: boolean, root: DomPaint, context: RenderContext) {
		let currY = startY
		const msp = new MusicPaint(root)
		const scale = context.render.scale!
		const noteMeasure = msp.measureNoteChar(context, isSmall, scale)
		const FCALineField = 1.0 * noteMeasure[1]

		function handleSections<T extends object>(sections: MusicSection<T>[], noteHandler: (note: MusicNote<T>, sectionIndex: number, section: MusicSection<T>) => void) {
			sections.forEach((section, sectionIndex) => {
				if(section.type != 'section') {
					return
				}
				section.notes.forEach((note) => {
					if(note.type != 'note') {
						return
					}
					if('void' in note.char) {
						return
					}
					noteHandler(note, sectionIndex, section)
				})
			})
		}

		const createNoteHandler = <T>(handler: (note: MusicNote<T> & {type: 'note'}, fracPos: Fraction, pos: number) => void) => {
			return (note: MusicNote<T>, sectionIndex: number, section: MusicSection<T>) => {
				const fracPos = Frac.add(section.startPos, note.startPos)
				const pos = this.columns.fracPosition(sectionIndex, fracPos)
				if(note.type != 'note') {
					return
				}
				handler(note, fracPos, pos)
			}
		}

		// ===== 文本标记 =====
		for(let i = line.annotations.length - 1; i >= 0; i--){
			let ann = line.annotations[i]
			if(SectionStat.allEmpty(ann.sections, 0, ann.sections.length)) {
				continue
			}
			currY += FCALineField / 2
			handleSections<NoteCharText>(ann.sections, createNoteHandler((note, fracPos, pos) => {
				msp.drawFCANote(context, pos, 0, currY, ann.index, note.char, isSmall, scale)
			}))
			currY += FCALineField / 2
		}
		// ===== 力度 =====
		if(line.force && !SectionStat.allEmpty(line.force.sections, 0, line.force.sections.length)) {
			currY += FCALineField / 2
			handleSections<NoteCharForce>(line.force.sections, createNoteHandler((note, fracPos, pos) => {
				if(note.voided) {
					return
				}
				const endFracPos = Frac.add(fracPos, note.length)
				let endPos = this.columns.fracEndPosition(endFracPos)
				msp.drawFCANote(context, pos, endPos, currY, -1, note.char, isSmall, scale)
			}))
			currY += FCALineField / 2
		}
		// ===== 和弦 =====
		if(line.chord && !SectionStat.allEmpty(line.chord.sections, 0, line.chord.sections.length)) {
			currY += FCALineField / 2
			handleSections<NoteCharChord>(line.chord.sections, createNoteHandler((note, fracPos, pos) => {
				if(note.voided) {
					return
				}
				msp.drawFCANote(context, pos, 0, currY, -1, note.char, isSmall, scale)
			}))
			currY += FCALineField / 2
		}

		if(!isSmall) {
			currY -= 1.5
		}
		currY = Math.max(currY, startY)
		return currY - startY
	}

	/**
	 * 渲染跳房子符号，并统计是否出现标记与属性、跳房子与属性的重叠
	 * 
	 * 返回第二个参数表明跳房子的文本标记是否可能与小节序号重叠
	 */
	renderJumpers(startY: number, part: NMNPart, line: NMNLine, isFirst: boolean, root: DomPaint, context: RenderContext): [number, boolean] {
		const scale = context.render.scale!
		const msp = new MusicPaint(root)
		const firstPart = line.parts[0]!
		let currY = startY

		const fieldHeight = 2.1
		const overlapField = 2.2
		const shift = 0.6

		let hasJumperAttrOverlap = false
		let hasAnnAttrOverlap = false
		
		let hasFirstStart = false
		let upsetMax = 0

		function getTopMargin(section: MusicSection<unknown>) {
			const topAttr = findWithKey(section.separator.before.attrs, 'type', 'top')
			return topAttr && topAttr.type == 'top' ? topAttr.margin : 0
		}

		if(isFirst && line.jumpers.length > 0) {
			let successCount = 0
			currY += fieldHeight
			const topY = currY - 1.17 + shift
			const bottomY = currY + 0.90 + shift
			const centerY = (topY + bottomY) / 2
			line.jumpers.forEach((jumper) => {
				let startX = 0
				let endX = 0
				let startIn = false
				let endIn = false
				if(line.startSection <= jumper.startSection && jumper.startSection < line.startSection + line.sectionCount) {
					startIn = true
					startX = this.columns.startPosition(jumper.startSection - line.startSection) + 0.5 * scale
				}
				if(line.startSection < jumper.endSection && jumper.endSection <= line.startSection + line.sectionCount) {
					endIn = true
					endX = this.columns.endPosition(jumper.endSection - 1 - line.startSection) - 0.5 * scale
				}
				if(!startIn) {
					startX = this.columns.startPosition(0)
				}
				if(!endIn) {
					endX = this.columns.endPosition(line.sectionCount - 1)
				}
				if(jumper.openRange) {
					if(!startIn && !endIn) {
						return
					}
					if(!startIn) {
						startX = Math.max(startX, endX - 30 * scale)
					}
					if(!endIn) {
						endX = Math.min(endX, startX + 60 * scale)
					}
				}
				successCount += 1
				root.drawLine(startX, topY, endX, topY, 0.14, 0.07, scale)
				if(startIn) {
					root.drawLine(startX, bottomY, startX, topY, 0.14, 0.07, scale)
					const sectionIndex = jumper.startSection - line.startSection
					const section = firstPart.notes.sections[sectionIndex]
					if(SectionStat.hasSeparatorAttrs(section, true)) {
						hasJumperAttrOverlap = true
					}
				}
				if(endIn) {
					root.drawLine(endX, bottomY, endX, topY, 0.14, 0.07, scale)
				}
				if(startIn) {
					msp.drawJumperAttrs(context, startX + 0.3 * scale, centerY, jumper.attrs, 1, scale)
				}
				if(startIn && jumper.startSection - line.startSection == 0) {
					hasFirstStart = true
				}
			})
			if(successCount == 0) {
				// rnm，退钱！
				currY -= fieldHeight
			}
		}

		const firstAnnotation = SectionStat.fcaPrimary(part)
		for(let i = 0; i < line.sectionCount; i++) {
			const section = part.notes.sections[i]
			if(firstAnnotation) {
				if(!SectionStat.allEmpty(firstAnnotation, i, 1) && SectionStat.hasSeparatorAttrs(section)) {
					hasAnnAttrOverlap = true
				}
			}
			upsetMax = Math.max(upsetMax, getTopMargin(section))
		}
		// 如有重叠情况，增加下边距，给小节线属性留出空间
		if(hasJumperAttrOverlap) {
			currY += overlapField
		} else {
			if(hasAnnAttrOverlap) {
				currY += overlapField
			}
		}
		currY += upsetMax

		return [currY - startY, hasFirstStart && !hasJumperAttrOverlap && !hasAnnAttrOverlap]
	}

	/**
	 * 渲染声部的音符行
	 */
	renderPartNotes(startY: number, part: NMNPart, root: DomPaint, context: RenderContext, hasJumperOverlap: boolean, isFirst: boolean) {
		let currY = startY
		currY += 2.5
		const fieldHeight = 5.5
		const scale = context.render.scale!

		currY += fieldHeight / 2

		lineRendererStats.sectionsRenderTime -= +new Date()
		
		new SectionsRenderer(this.columns).render(currY, part, root, context, hasJumperOverlap, isFirst, false)
		lineRendererStats.sectionsRenderTime += +new Date()

		currY += fieldHeight / 2

		this.musicLineYs.push({
			top: currY - fieldHeight,
			middle: currY - fieldHeight / 2,
			bottom: currY
		})

		return currY - startY
	}
}

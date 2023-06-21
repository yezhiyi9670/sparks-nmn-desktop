import { NMNResult } from "../../.."
import { EquifieldSection } from "../../../equifield/equifield"
import { I18n } from "../../../i18n"
import { SectionStat } from "../../../parser/des2cols/section/SectionStat"
import { connectSigs, Linked2LyricChar } from "../../../parser/des2cols/types"
import { DestructedFCA, LrcAttr, MusicNote, MusicSection, NoteCharAnnotation, NoteCharChord, NoteCharForce, NoteCharText } from "../../../parser/sparse2des/types"
import { findWithKey } from "../../../util/array"
import { Frac, Fraction } from "../../../util/frac"
import { DomPaint } from "../../backend/DomPaint"
import { FontMetric } from "../../FontMetric"
import { MusicPaint } from "../../paint/MusicPaint"
import { PaintTextToken } from "../../paint/PaintTextToken"
import { RenderContext } from "../../renderer"
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
	annotationInset = 1.45

	/**
	 * 渲染曲谱行
	 */
	renderLine(line: NMNLine, sections: EquifieldSection[], context: RenderContext, lastLine: NMNLine | undefined, root: DomPaint, startY: number, title: string) {
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
		const upperY = this.musicLineYs[0].top
		let lastIndex = this.musicLineYs.length - 1
		while(lastIndex >= 0 && line.parts[lastIndex].notes.head == 'Na') {
			lastIndex -= 1
		}
		if(lastIndex < 0) {
			lastIndex = this.musicLineYs.length - 1
		}
		if(lastIndex >= 1) {
			const lowerY = this.musicLineYs[lastIndex].bottom
			const leftX = context.render.connector_left! * scale
			const rightX = leftX + 1 * scale
			root.drawLine(leftX, upperY, leftX, lowerY, 0.2, 0.1, scale)
			root.drawLine(leftX, upperY, rightX, upperY, 0.2, 0.1, scale)
			root.drawLine(leftX, lowerY, rightX, lowerY, 0.2, 0.1, scale)
		}

		sections.push({
			element: root.getElement(),
			height: currY * scale,
			...I18n.efLabel(context.language, 'musicLine', title, '' + (line.startOrdinal + 1))
		})

		sections.push({
			element: new DomPaint().getElement(),
			height: context.render.margin_after_line! * scale,
			isMargin: true,
			...I18n.efLabel(context.language, 'musicLineMargin')
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

		// ===== 渲染跳房子 =====
		const jumperRet = this.renderJumpers(currY, part, line, isFirst, root, context)
		currY += jumperRet[0]
		const hasJumperOverlap = jumperRet[1]
		// ===== 渲染FCA =====
		currY += this.renderLineFCA(currY, part, false, root, context)
		// ===== 音乐行状态统计 =====
		const noteMeasure = msp.measureNoteChar(context, false, scale)
		const fieldHeight = 1.0 * noteMeasure[1]
		function getTopMargin(section: MusicSection<unknown>) {
			const topAttr = findWithKey(section.separator.before.attrs, 'type', 'top')
			return topAttr && topAttr.type == 'top' ? topAttr.margin : 0
		}
		let hasAnnAttrOverlap = false
		let upsetMax = 0
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
		currY += upsetMax
		if(hasAnnAttrOverlap) {
			currY += fieldHeight
		}
		// ===== 渲染音乐行 =====
		currY += this.renderPartNotes(currY, part, line.startOrdinal, root, context, hasJumperOverlap, isFirst)
		const lastYs = this.musicLineYs[this.musicLineYs.length - 1]
		// ===== 标记声部名称 =====
		if(shouldLabel) {
			msp.drawPartName(context, scale * (-0.5 + context.render.connector_left!), lastYs.middle, part.notes.tags, 1, scale)
		}

		if(!part.noMargin[1]) {
			currY += context.render.margin_after_part_notes!
			if(part.lyricLines.length != 0) {
				currY -= context.render.inset_before_lyrics!
			}
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
		let successCount = 0
		part.lyricLines.forEach((lyricLine, index) => {
			this.renderLyricLine(stat.startY[index], lyricLine, part, line, root, context)
			if(SectionStat.isLrcLineRenderWorthy(lyricLine, 0, line.sectionCount)) {
				successCount += 1
			}
		})
		if(successCount > 0) {
			currY += context.render.margin_after_lyrics!
		}

		if(!part.noMargin[1]) {
			currY += context.render.margin_after_part!
		}

		return currY - startY
	}
	/**
	 * 渲染跳房子符号，并统计是否出现标记与属性、跳房子与属性的重叠
	 * 
	 * 返回第二个参数表明跳房子的文本标记是否可能与小节序号重叠
	 * 
	 * 【意大利面警告！修改后请测试所有情况。请勿移除对此函数的调用，因为意大利面里面还有其他布局处理操作】
	 */
	renderJumpers(startY: number, part: NMNPart, line: NMNLine, isFirst: boolean, root: DomPaint, context: RenderContext): [number, boolean] {
		const scale = context.render.scale!
		const msp = new MusicPaint(root)
		const firstPart = line.parts[0]!
		let currY = startY

		const noteMeasure = msp.measureNoteChar(context, false, scale)
		const fieldHeight = 1.0 * noteMeasure[1]

		const shift = -1.3  // 跳房子记号位置偏移（nmd为什么会有这个）

		let hasJumperAttrOverlap = false
		let hasFirstStart = false
		
		// 统计跳房子存在性与重叠情况
		const firstAnnotation = SectionStat.fcaPrimary(part)
		let successCount = 0
		if(isFirst && line.jumpers.length > 0) {
			line.jumpers.forEach((jumper) => {
				let startIn = false
				let endIn = false
				if(line.startSection <= jumper.startSection && jumper.startSection < line.startSection + line.sectionCount) {
					startIn = true
				}
				if(line.startSection < jumper.endSection && jumper.endSection <= line.startSection + line.sectionCount) {
					endIn = true
				}
				if(jumper.openRange) {
					if(!startIn && !endIn) {
						return
					}
				}
				successCount += 1
				if(startIn) {
					const sectionIndex = jumper.startSection - line.startSection
					const section = firstPart.notes.sections[sectionIndex]
					if(SectionStat.hasSeparatorAttrs(section, true)) {
						hasJumperAttrOverlap = true
					}
				}
				if(startIn && jumper.startSection - line.startSection == 0) {
					hasFirstStart = true
				}
			})
		}

		let hasOwnField = false

		// 绘制跳房子
		currY += fieldHeight
		if(isFirst && line.jumpers.length > 0) {
			const topY = currY - 1.32 + shift
			const bottomY = currY + 1.05 + shift
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
				root.drawLine(startX, topY, endX, topY, 0.14, 0.07, scale)
				if(startIn) {
					root.drawLine(startX, bottomY, startX, topY, 0.14, 0.07, scale)
				}
				if(endIn) {
					root.drawLine(endX, bottomY, endX, topY, 0.14, 0.07, scale)
				}
				if(startIn) {
					msp.drawJumperAttrs(context, startX + 0.3 * scale, centerY, jumper.attrs, 1, scale)
				}
			})
		}
		currY -= fieldHeight
		if(successCount > 0) {
			if(!firstAnnotation) {
				currY += fieldHeight
				hasOwnField = true
				if(hasJumperAttrOverlap) {
					currY += fieldHeight
				}
			}
		}
		// 标记符号-属性重叠（且未触发 overlapField），标记符号-跳房子重叠，以及不存在标记符号时，跳房子需要自己的排版空间
		if(hasOwnField && !firstAnnotation) {
			currY -= this.annotationInset  // 与标记行的减高行为匹配
		}

		let annotationsCount = 0
		for(let ann of part.fcaItems) {
			if(!SectionStat.allEmpty(ann.sections, 0, line.sectionCount)) {
				annotationsCount += 1
			}
		}

		return [currY - startY, hasFirstStart && !hasJumperAttrOverlap && (annotationsCount <= 1)]
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
		const shouldDrawLyrics = SectionStat.isLrcLineTextRenderWorthy(lyricLine)
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

		const shouldDrawLyrics = SectionStat.isLrcLineTextRenderWorthy(lyricLine)
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
				new SectionsRenderer(localColumns).render(currY, { notes: { sections }, decorations: decorations }, -1, root, context, false, false, 'substitute')
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
					const endPos = this.columns.fracEndPosition(endFrac, true)
					lrcSymbols.push({
						char: note,
						startX: pos,
						endX: endPos,
						boundaries: [0, 0]
					})
				})
			})
			// 渲染简单轻松愉快的标记类歌词
			lyricLine.lyricAnnotations!.sections.forEach((section, index) => {
				if(section.type != 'section') {
					return
				}
				section.notes.forEach((note) => {
					if(note.type != 'note' || note.voided || 'void' in note.char) {
						return
					}
					const text = note.char.type == 'text'
					
					const fracPos = Frac.add(section.startPos, note.startPos)
					const startX = this.columns.fracPosition(index, fracPos) - noteMeasure[0] / 2
					labelPrevPos = Math.min(labelPrevPos, startX)
					msp.drawLyricChar(context, startX, currY, {
						startPos: fracPos,
						length: Frac.create(0),
						text: note.char.text,
						prefix: '',
						postfix: '',
						isCharBased: true,
						extension: false,
						occupiesSpace: false,
						grouped: false
					}, 'left', scale)
				})
			})
			// 渲染不需要推断位置的符号
			lrcSymbols.forEach((symbol, index) => {
				if(symbol.char.occupiesSpace) {
					symbol.boundaries = msp.drawLyricChar(context, symbol.startX, currY, symbol.char, 'center', scale)
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
						symbol.boundaries = msp.drawLyricChar(context, anchor, currY, symbol.char, 'right', scale)
					} else if(!rightSymbol) {
						// 右端孤儿
						const anchor = leftSymbol.boundaries[1]
						symbol.boundaries = msp.drawLyricChar(context, anchor, currY, symbol.char, 'left', scale)
					} else {
						// 双端
						let dispY = countInserts(lrcSymbols, indexLpt, indexRpt) + 1
						let dispX = countInserts(lrcSymbols, indexLpt, index) + 1
						let leftAnchor = leftSymbol.boundaries[1]
						let rightAnchor = rightSymbol.boundaries[0]
						const anchor = (rightAnchor - leftAnchor) * (dispX / dispY) + leftAnchor
						symbol.boundaries = msp.drawLyricChar(context, anchor, currY, symbol.char, 'center', scale)
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
					if(!nextSymbol || !(nextSymbol.char.text == '')) {
						endX = this.columns.endPosition(this.columns.data.length - 1)
					} else {
						endX = nextSymbol.boundaries[0]
					}
					endX = Math.min(endX, symbol.endX + noteMeasure[0] / 2)
					// 确保绘制连续的延长线
					if(nextSymbol && nextSymbol.char.text == '' && nextSymbol.char.extension) {
						endX = nextSymbol.startX
					}
					if(endX <= startX) {
						return
					}
					const lineY = currY + lrcCharMeasure[1] / 2
					root.drawLine(startX, lineY, endX, lineY, 0.1, 0, scale)
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
		for(let i = line.fcaItems.length - 1; i >= 0; i--){
			let ann = line.fcaItems[i]
			if(SectionStat.allEmpty(ann.sections, 0, ann.sections.length)) {
				continue
			}
			currY += FCALineField / 2
			currY += FCALineField / 2
		}

		if(!isSmall) {
			currY -= this.annotationInset
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

		// ===== 标记 =====
		for(let i = line.fcaItems.length - 1; i >= 0; i--){
			let ann = line.fcaItems[i]
			if(SectionStat.allEmpty(ann.sections, 0, ann.sections.length)) {
				continue
			}
			currY += FCALineField / 2
			handleSections<NoteCharAnnotation>(ann.sections, createNoteHandler((note, fracPos, pos) => {
				if(note.voided) {
					return
				}
				const endFracPos = Frac.add(fracPos, note.length)
				let endPos = this.columns.fracEndPosition(endFracPos, false)
				msp.drawFCANote(context, pos, endPos, currY, ann.originIndex, note.char, isSmall, scale)
			}))
			currY += FCALineField / 2
		}

		if(!isSmall) {
			currY -= this.annotationInset
		}
		currY = Math.max(currY, startY)
		return currY - startY
	}

	/**
	 * 渲染声部的音符行
	 */
	renderPartNotes(startY: number, part: NMNPart, sectionCount: number, root: DomPaint, context: RenderContext, hasJumperOverlap: boolean, isFirst: boolean) {
		let currY = startY

		const isAccompany = part.notes.head == 'Na'

		if(!part.noMargin[0]) {
			currY += isFirst ? 2.5 : context.render.margin_between_parts!
		}
		
		const fieldHeight = isAccompany ? 4.4 : 5.5
		const scale = context.render.scale!

		currY += fieldHeight / 2

		lineRendererStats.sectionsRenderTime -= +new Date()
		
		new SectionsRenderer(this.columns).render(currY, part, sectionCount, root, context, hasJumperOverlap, isFirst, isAccompany ? 'accompany' : 'normal')
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

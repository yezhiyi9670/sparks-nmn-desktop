import { I18n } from '../../i18n'
import { Linked2LyricChar } from '../../parser/des2cols/types'
import { getLrcSymbolEquivalent } from '../../parser/sparse2des/lyrics/symbols'
import { AttrInsert, AttrShift, BaseTune, Beats, JumperAttr, LrcAttr, MusicNote, MusicProps, MusicSection, NoteCharAny, noteCharChecker, NoteCharChord, NoteCharForce, NoteCharMusic, NoteCharText, PartAttr, Qpm, SectionSeparator, SectionSeparatorChar, sectionSeparatorInset, SectionSeparators, SeparatorAttr, SeparatorAttrBase } from '../../parser/sparse2des/types'
import { findWithKey } from '../../util/array'
import { Frac } from '../../util/frac'
import { MusicTheory } from '../../util/music'
import { addNotesScale, getLineFont, reductionLineSpace, topDecorSpace } from '../article/line/font/fontMetrics'
import { DomPaint } from '../backend/DomPaint'
import { FontMetric } from '../FontMetric'
import { RenderContext } from '../renderer'
import { PaintTextToken } from './PaintTextToken'

// Don't use these here!
const $ = null
const window = null
const document = null

type ExtraStyles = {[_: string]: number | string}

/**
 * 音乐符号绘制类
 */
export class MusicPaint {
	root: DomPaint
	
	constructor(root: DomPaint) {
		this.root = root
	}

	/**
	 * 升降还原符号
	 */
	symbolAccidental(delta: number) {
		if(delta == 0) {
			return "\uE113"
		}
		let absVal = Math.abs(delta)
		let sign = Math.round(delta / absVal)
		let ret = ''
		// 升降记号
		while(absVal >= 1) {
			absVal -= 1
			ret += sign > 0 ? "\uE10E" : "\uE114"
		}
		// 微分记号
		while(absVal >= 0.5) {
			absVal -= 0.5
			ret += sign > 0 ? "\uE1BE" : "\uE1BF"
		}
		if(ret == '') {
			return "\uE113"
		}
		return ret
	}
	/**
	 * 拍号音符
	 */
	symbolBeats(symbol: 'qpm' | 'hpm' | 'spm') {
		if(symbol == 'qpm') {
			return "\uE1D8"
		}
		if(symbol == 'hpm') {
			return "\uE1D6"
		}
		if(symbol == 'spm') {
			return "\uE1D9"
		}
		return ''
	}
	/**
	 * 小节线符号
	 */
	symbolSectionSeparator(char: SectionSeparatorChar) {
		return {
			'/': "",
			'/|': "\uE037",
			'|': "\uE030",
			'||': "\uE031",
			'|||': "\uE032",
			'||:': "\uE040",
			':||': "\uE041",
			':||:': "\uE042",
			'/||': "\uE037 \uE030",
			'/||:': "\uE037 \uE040",
			':/||': "\uE041",
			':/||:': "\uE042"
		}[char]
	}
	/**
	 * 音符属性符号
	 */
	symbolNoteDecor(char: string) {
		const ret = {
			'tr': "\uE171",
			'tr+': "\uE171\uE183",
			'wav': "\uE183",
			'wav+': "\uE185",
			'wavd': "\uE184",
			'wavd+': "\uE186",
			'echo': "\uE16F",
			'recho': "\uE170",
			'ext': "\uE158",
			'hold': "\uE166",
			'str': "\uE161",
			'brk': "\uE1DB",
			'brk+': "\uE1DC"
		}[char]
		if(ret === undefined) {
			throw new Error('Unknown note decorator ' + char)
		}
		return ret
	}
	/**
	 * 曲式结构反复记号
	 */
	symbolRepeat(char: string) {
		if(char == 'D.S.') {
			return "\uE045"
		}
		if(char == 'D.C.') {
			return "\uE046"
		}
		if(char == '$') {
			return "\uE047"
		}
		if(char == 'Fine.') {
			return "Fine."
		}
		if(char == '@') {
			return "\uE048"
		}
		return ''
	}

	/**
	 * 绘制小节线
	 * @param x 中心的横坐标
	 * @param y 中心的纵坐标
	 * @param sep 待绘制小节线
	 */
	drawSectionSeparator(context: RenderContext, x: number, y: number, sep: SectionSeparators, pos: 'before' | 'after' | 'next', fontScale: number = 1, scale: number = 1, extraStyles: ExtraStyles = {}) {
		let ch = sep[pos].char
		if(pos == 'before' && context.render.left_separator!) {
			if(ch == '/') {
				ch = '|'
			}
		}
		const separatorText = this.symbolSectionSeparator(ch)
		const separatorMetric = new FontMetric('SparksNMN-Bravura/400' , 5.072 * fontScale) // 实际高度 5.184
		const separatorSize = separatorMetric.fontScale * separatorMetric.fontSize
		// 此处行首小节线定位方式取 left，避免与连谱号发生重叠
		this.root.drawTextFast(x, y - separatorSize * 0.092, separatorText, separatorMetric, scale, pos == 'before' ? 'left' : 'center', 'top', extraStyles)

		let topPosY = y - 3.75

		if(pos != 'before') {
			sep.next.attrs.forEach((attr) => {
				if(attr.type == 'repeat') {
					const measure = this.drawSeparatorAttrText(context, x, topPosY, attr, 1, scale, extraStyles, true)
					this.drawSeparatorAttrText(context, x - measure[0] / 2, topPosY, attr, 1, scale, extraStyles, false)
				}
				if(attr.type == 'text' || attr.type == 'scriptedText') {
					const rectTopY = topPosY - 3
					const rectBottomY = topPosY + 0.5
					const rectCenterY = (rectTopY + rectBottomY) / 2
					const measure = this.drawSeparatorAttrText(context, x, rectCenterY, attr, 1, scale, extraStyles, true, 'large')
					const rectWidth = Math.max(measure[0] + 1 * scale * 2, (rectBottomY - rectTopY) * scale)
					const rectLeftX = x - rectWidth / 2
					const rectRightX = x + rectWidth / 2
					this.root.drawRectOutline(rectLeftX, rectTopY, rectRightX, rectBottomY, 0.15, scale, extraStyles)
					this.drawSeparatorAttrText(context, x - measure[0] / 2, rectCenterY, attr, 1, scale, extraStyles, false, 'large')
				}
			})
		}
	}
	/**
	 * 绘制属性
	 */
	drawBeforeAfterAttrs(context: RenderContext, x: number, y: number, attrs: SeparatorAttr[], section: MusicSection<unknown>, isFirstSection: boolean, pos: 'before' | 'after', fontScale: number = 1, scale: number = 1, extraStyles: ExtraStyles = {}, showTextLike: boolean = false) {
		let sign = pos == 'before' ? 1 : -1
		let currX = x
		let attrY = y - 4.5
		const margin = 0.7 * scale
		currX += sign * 1 * scale
		let hX = x + sign * 0.8 * scale
		const separatorInset = sectionSeparatorInset(section.separator, isFirstSection)
		if(sign > 0) {
			hX += separatorInset[0]
		} else {
			hX -= separatorInset[1]
		}
		let lastAttr: SeparatorAttr | undefined = undefined
		;(sign > 0 ? attrs : attrs.reverse()).forEach((attr) => {
			if(showTextLike && ['iter', 'repeat', 'qpm', 'shift', 'durability', 'text', 'scriptedText', 'label', 'reset'].indexOf(attr.type) != -1) {
				if(lastAttr && !(lastAttr.type == 'iter' && attr.type == 'iter')) {
					currX += sign * margin
				}
				const measure = this.drawSeparatorAttrText(context, currX, attrY, attr, fontScale, scale, extraStyles, true)
				currX += sign * this.drawSeparatorAttrText(context, currX - (sign > 0 ? 0 : measure[0]), attrY, attr, fontScale, scale, extraStyles, false)[0]
				lastAttr = attr
			}
			if(attr.type == 'beats') {
				const measure = this.drawBeats(hX, y, attr.beats, fontScale * 0.95, scale, extraStyles, true)
				this.drawBeats(hX - (sign > 0 ? 0 : measure[0]), y, attr.beats, fontScale * 0.95, scale, extraStyles, false)
			}
		})
	}
	/**
	 * 绘制歌词迭代数
	 */
	drawLyricLabel(context: RenderContext, x: number, y: number, attrs: LrcAttr[], scale: number = 1, extraStyles: ExtraStyles = {}) {
		let currX = x
		let attrY = y
		const margin = 0 * scale
		let totalWidth = 0
		const fontDesc = context.render.font_lyrics!
		attrs.forEach((attr) => {
			if(attr.type == 'iter') {
				const measure = this.drawIterOrString(context, currX, attrY, attr, fontDesc, 2.16, scale, {}, true)
				totalWidth += measure[0] + margin
			}
		})
		currX -= totalWidth
		attrs.forEach((attr) => {
			if(attr.type == 'iter') {
				currX += margin
				const measure = this.drawIterOrString(context, currX, attrY, attr, fontDesc, 2.16, scale, {}, false)
				currX += measure[0]
			}
		})
	}
	/**
	 * 绘制跳房子记号的属性
	 */
	drawJumperAttrs(context: RenderContext, startX: number, y: number, attrs: JumperAttr[], fontScale: number, scale: number) {
		let currX = startX
		let lastAttr: JumperAttr | undefined = undefined
		attrs.forEach((attr) => {
			if(lastAttr && !(lastAttr.type == 'iter' && attr.type == 'iter')) {
				currX += 0.5 * scale
			}
			currX += this.drawIterOrString(context, currX, y, attr, context.render.font_attr!, 1.79 * fontScale, scale)[0]
			lastAttr = attr
		})
	}
	/**
	 * 绘制声部名称
	 */
	drawPartName(context: RenderContext, x: number, y: number, attrs: PartAttr[], fontScale: number, scale: number) {
		if(attrs.length == 0) {
			return
		}
		const attr = attrs[0]
		const fontDesc = context.render.font_part!
		const measure = this.drawIterOrString(context, x, y, attr, fontDesc, 2.16, scale, {}, true)
		x -= measure[0]
		this.drawIterOrString(context, x, y, attr, fontDesc, 2.16, scale, {}, false)
	}
	/**
	 * 绘制单个类文本小节线属性
	 */
	drawSeparatorAttrText(context: RenderContext, x: number, y: number, attr: SeparatorAttrBase, fontScale: number = 1, scale: number = 1, extraStyles: ExtraStyles = {}, dryRun: boolean = false, labelType: 'normal' | 'large' | 'bold' = 'normal'): number[] {
		const fontMetricA = new FontMetric(context.render.font_attr!, 2.16 * fontScale)
		const fontSize = fontMetricA.fontSize * fontMetricA.fontScale
		const fontMetricB = new FontMetric('SimSun/400', fontSize)
		const fontMetricC = new FontMetric('SparksNMN-Bravura/400', fontSize * 1.5)
		const fontMetricLx = new FontMetric(context.render.font_checkpoint!, 2.3 * fontScale)
		const fontMetricLxr = new FontMetric(context.render.font_attr!, 2.06 * fontScale)
		fontMetricLxr.fontWeight = 700
		const extraStylesItalic = {
			...extraStyles,
			fontStyle: 'italic'
		}
		if(attr.type == 'durability' || attr.type == 'iter' || attr.type == 'reset') {
			let text = ''
			if(attr.type == 'durability') {
				text = 'x' + attr.value.toString()
			} else if(attr.type == 'iter') {
				text = attr.iter.toString() + '.'
			} else if(attr.type == 'reset') {
				text = 'reset'
			}
			const token = new PaintTextToken(
				text, fontMetricB,
				scale, extraStylesItalic
			)
			const measure = token.measureFast(this.root)
			if(!dryRun) {
				token.drawFast(this.root, x, y, 'left', 'middle')
			}
			return measure
		}
		if(attr.type == 'repeat') {
			let metric = attr.char == 'Fine.' ? fontMetricB : fontMetricC
			const text = this.symbolRepeat(attr.char)
			const token = new PaintTextToken(
				text, metric,
				scale, {
					...extraStyles,
					fontWeight: attr.char == 'Fine.' ? 900 : 400
				}
			)
			const measure = token.measureFast(this.root)
			if(!dryRun) {
				token.drawFast(this.root, x, y + (attr.char != 'Fine.' ? fontSize * 0.34: 0), 'left', 'middle')
			}
			return measure
		}
		if(attr.type == 'qpm') {
			return this.drawSpeed(x, y, attr.qpm, fontScale, scale, extraStyles, dryRun)
		}
		if(attr.type == 'shift') {
			return this.drawShift(context, x, y, attr, fontScale, scale, extraStyles, dryRun)
		}
		if(attr.type == 'scriptedText' || attr.type == 'text') {
			let text = attr.text
			let subs = ''
			if(attr.type == 'scriptedText') {
				subs = attr.sub
			}
			const token1 = new PaintTextToken(
				text, {large: fontMetricLx, normal: fontMetricA, bold: fontMetricLxr}[labelType],
				scale, extraStyles
			)
			const fontMetricAs = labelType == 'large' ? new FontMetric(context.render.font_checkpoint!, 2.3 * 0.75 * fontScale) : new FontMetric(context.render.font_attr!, 2.16 * 0.75 * fontScale)
			const token2 = new PaintTextToken(
				subs, fontMetricAs,
				scale, extraStyles
			)
			const measure1 = token1.measure(this.root)
			const measure = [
				measure1[0] + token2.measureFast(this.root)[0],
				0
			]
			let currX = x
			if(!dryRun) {
				token1.drawFast(this.root, currX, y, 'left', 'middle')
				currX += measure1[0]
				token2.drawFast(this.root, currX, y - 0.2 * measure1[1], 'left', 'top')
			}
			return measure
		}
		if(attr.type == 'label') {
			y -= 0.45
			const rectTopY = y - 1.3
			const rectBottomY = y + 1.3
			const rectCenterY = (rectTopY + rectBottomY) / 2
			const measure = this.drawSeparatorAttrText(context, x, rectCenterY, attr.label, 1, scale, extraStyles, true, 'bold')
			const rectWidth = Math.max(measure[0] + 0.5 * scale * 2, (rectBottomY - rectTopY) * scale)
			x += rectWidth / 2
			const rectLeftX = x - rectWidth / 2
			const rectRightX = x + rectWidth / 2
			if(!dryRun) {
				this.root.drawRectOutline(rectLeftX, rectTopY, rectRightX, rectBottomY, 0.15, scale, extraStyles)
				this.drawSeparatorAttrText(context, x - measure[0] / 2, rectCenterY, attr.label, 1, scale, extraStyles, false, 'bold')
			}
			return [rectWidth, rectBottomY - rectTopY]
		}
		return [0, 0]
	}
	/**
	 * 绘制歌词字符
	 */
	drawLyricChar(context: RenderContext, startX: number, endX: number, y: number, note: Linked2LyricChar, baseAnchor: 'left' | 'center' | 'right', scale: number = 1, extraStyles: ExtraStyles = {}, dryRun: boolean = false): [number, number] {
		const lrcMetric = new FontMetric(context.render.font_lyrics!, 2.16)
		const underlineExtraStyles = {
			...extraStyles,
			textDecoration: 'underline'
		}
		const tokenMain = new PaintTextToken(
			note.text, lrcMetric,
			scale, note.grouped ? underlineExtraStyles : extraStyles
		)
		const mainWidth = tokenMain.measureFast(this.root)[0]
		let baseX = startX
		if(baseAnchor == 'center') {
			if(note.isCharBased && note.grouped && note.text.length > 0) {
				const firstWidth = this.root.measureTextFast(note.text[0], lrcMetric)[0]
				baseX += mainWidth / 2 - firstWidth / 2
			}
		} else if(baseAnchor == 'left') {
			baseX += mainWidth / 2
		} else if(baseAnchor == 'right') {
			baseX -= mainWidth / 2
		}
		if(!dryRun) tokenMain.drawFast(this.root, baseX, y, 'center', 'middle')
		let currLeft = baseX - mainWidth / 2
		let currRight = baseX + mainWidth / 2
		
		for(let i = note.prefix.length - 1; i >= 0; i--) {
			const leftText = note.prefix[i]
			const tokenLeft = new PaintTextToken(
				leftText, lrcMetric,
				scale
			)
			if(!dryRun) tokenLeft.drawFast(this.root, currLeft, y, 'right', 'middle')
			tokenLeft.text = getLrcSymbolEquivalent(tokenLeft.text)
			currLeft -= tokenLeft.measureFast(this.root)[0]
		}

		if(note.rolePrefix) {
			let prefixText = '(' + note.rolePrefix + ')'
			const tokenRole = new PaintTextToken(
				prefixText, lrcMetric,
				scale
			)
			if(!dryRun) tokenRole.drawFast(this.root, currLeft, y, 'right', 'middle')
			currLeft -= tokenRole.measureFast(this.root)[0]
		}

		for(let i = 0; i < note.postfix.length; i++) {
			const rightText = note.postfix[i]
			const tokenRight = new PaintTextToken(
				rightText, lrcMetric,
				scale
			)
			if(!dryRun) tokenRight.drawFast(this.root, currRight, y, 'left', 'middle')
			tokenRight.text = getLrcSymbolEquivalent(tokenRight.text)
			currRight += tokenRight.measureFast(this.root)[0]
		}

		return [currLeft, currRight]
	}
	/**
	 * 绘制标记音符
	 */
	drawFCANote(context: RenderContext, startX: number, endX: number, y: number, annotationIndex: number, note: NoteCharForce | NoteCharChord | NoteCharText, isSmall: boolean, scale: number = 1, extraStyles: ExtraStyles = {}) {
		if('void' in note) {
			return
		}
		const annotationScale = 0.75
		const forceScale = 0.7
		const noteMeasure = this.measureNoteChar(context, isSmall, scale)
		const annotationMetric = (() => {
			if(annotationIndex == -1) {
				if(note.type == 'force') {
					return new FontMetric(context.render.font_force!, noteMeasure[1] * annotationScale)
				} else {
					return new FontMetric(context.render.font_chord!, noteMeasure[1] * annotationScale)
				}
			} else {
				return [
					new FontMetric(context.render.font_annotation1!, noteMeasure[1] * annotationScale),
					new FontMetric(context.render.font_annotation2!, noteMeasure[1] * annotationScale),
					new FontMetric(context.render.font_annotation3!, noteMeasure[1] * annotationScale),
				][Math.min(annotationIndex, 2)]
			}
		})()
		startX -= noteMeasure[0] / 2
		endX += noteMeasure[0] / 2
		if(note.type == 'force') {
			const forceTextMetric = new FontMetric('SparksNMN-mscore-20/400', noteMeasure[1] * forceScale)
			if(note.isText) {
				this.root.drawTextFast(startX, y, note.char, annotationMetric, scale, 'left', 'middle', extraStyles)
			} else {
				if(note.char == '<' || note.char == '>') {
					const topY = y - noteMeasure[1] * 0.28
					const bottomY = y + noteMeasure[1] * 0.28
					const centerY = y
					const lessX = note.char == '<' ? startX : endX
					const moreX = note.char == '<' ? endX : startX
					this.root.drawLine(lessX, centerY, moreX, topY, 0.15, 0.15 / 2, scale, extraStyles)
					this.root.drawLine(lessX, centerY, moreX, bottomY, 0.15, 0.15 / 2, scale, extraStyles)
				} else {
					this.root.drawTextFast(startX, y, note.char, forceTextMetric, scale, 'left', 'middle', extraStyles)
				}
			}
		} else if(note.type == 'chord') {
			const metric0 = new FontMetric('SparksNMN-mscore-20/400', noteMeasure[1] * annotationScale)
			const token0 = new PaintTextToken(
				(note.delta != note.delta || note.delta == 0) ? '' : this.symbolAccidental(note.delta),
				metric0, scale, extraStyles
			)
			const token1 = new PaintTextToken(
				note.root,
				annotationMetric, scale, extraStyles
			)
			const token2 = new PaintTextToken(
				note.suffix, new FontMetric(context.render.font_chord!, noteMeasure[1] * annotationScale * 0.75),
				scale, extraStyles
			)
			const token3 = new PaintTextToken(
				note.base === undefined ? '' : '/',
				annotationMetric, scale, extraStyles
			)
			const token4 = new PaintTextToken(
				(note.baseDelta != note.baseDelta || note.baseDelta == 0) ? '' : this.symbolAccidental(note.baseDelta),
				metric0, scale, extraStyles
			)
			const token5 = new PaintTextToken(
				note.base === undefined ? '' : note.base,
				annotationMetric, scale, extraStyles
			)
			let currX = startX
			token0.drawFast(this.root, currX, y, 'left', 'bottom')
			currX += token0.measureFast(this.root)[0]
			token1.drawFast(this.root, currX, y, 'left', 'middle')
			currX += token1.measureFast(this.root)[0]
			token2.drawFast(this.root, currX, y + noteMeasure[1] * 0.2, 'left', 'bottom')
			currX += token2.measureFast(this.root)[0]
			token3.drawFast(this.root, currX, y, 'left', 'middle')
			currX += token3.measureFast(this.root)[0]
			if(token4.text != '') {
				currX += 0.1 * scale
			}
			token4.drawFast(this.root, currX, y, 'left', 'bottom')
			currX += token4.measureFast(this.root)[0]
			token5.drawFast(this.root, currX, y, 'left', 'middle')
		} else {
			this.root.drawTextFast(startX, y, note.text, annotationMetric, scale, 'left', 'middle', extraStyles)
		}
	}
	/**
	 * 绘制单个跳房子属性
	 */
	drawIterOrString(context: RenderContext, x: number, y: number, attr: JumperAttr, fontDesc: string, initialFontSize: number = 2, scale: number = 1, extraStyles: ExtraStyles = {}, dryRun: boolean = false) {
		const fontMetricA = new FontMetric(fontDesc, initialFontSize)
		const fontSize = fontMetricA.fontSize * fontMetricA.fontScale
		const fontMetricB = new FontMetric('SimSun/700', 1 * fontSize)
		const fontMetricC = new FontMetric('SparksNMN-Bravura/400', 1.5 * fontSize)
		const extraStylesItalic = {
			...extraStyles,
			fontStyle: 'italic'
		}
		if(attr.type == 'iter') {
			let text = attr.iter.toString() + '.'
			const token = new PaintTextToken(
				text, fontMetricB,
				scale, extraStylesItalic
			)
			const measure = token.measureFast(this.root)
			if(!dryRun) {
				token.drawFast(this.root, x, y, 'left', 'middle')
			}
			return measure
		}
		if(attr.type == 'octave') {
			let text = attr.sign > 0 ? "\uE511" : "\uE51C"
			const token = new PaintTextToken(
				text, fontMetricC,
				scale, extraStyles
			)
			const measure = token.measureFast(this.root)
			if(!dryRun) {
				token.drawFast(this.root, x, y + fontSize * 0.35, 'left', 'middle')
			}
			return measure
		}
		if(attr.type == 'scriptedText' || attr.type == 'text') {
			let text = attr.text
			let subs = ''
			if(attr.type == 'scriptedText') {
				subs = attr.sub
			}
			const token1 = new PaintTextToken(
				text, fontMetricA,
				scale, extraStyles
			)
			const fontMetricAs = new FontMetric(context.render.font_attr!, 0.75 * initialFontSize)
			const token2 = new PaintTextToken(
				subs, fontMetricAs,
				scale, extraStyles
			)
			const measure1 = token1.measure(this.root)
			const measure = [
				measure1[0] + token2.measureFast(this.root)[0],
				0
			]
			let currX = x
			if(!dryRun) {
				token1.drawFast(this.root, currX, y, 'left', 'middle')
				currX += measure1[0]
				token2.drawFast(this.root, currX, y - 0.2 * measure1[1], 'left', 'top')
			}
			return measure
		}
		return [0, 0]
	}

	/**
	 * 绘制插入符号
	 */
	drawInsert(context: RenderContext, pos: number, currY: number, char: AttrInsert, isSmall: boolean, scale: number) {
		const noteMeasure = this.measureNoteChar(context, isSmall, scale)
		const renderData = {
			int: {
				metric: new FontMetric('SparksNMN-mscore-20', noteMeasure[1] * 1.2),
				text: "\uE16D",
				shift: -0.7
			},
			lpr: {
				metric: new FontMetric('SimSun/400', noteMeasure[1] * 1.1),
				text: "(",
				shift: 0
			},
			rpr: {
				metric: new FontMetric('SimSun/400', noteMeasure[1] * 1.1),
				text: ")",
				shift: 0
			},
			cas: {
				metric: new FontMetric('SparksNMN-Bravura', noteMeasure[1] * 1.3),
				text: "\uE2E6",
				shift: -0.7
			}
		}[char.char]
		if(!renderData) {
			throw new Error('Unknown insert token ' + char.char)
		}
		this.root.drawText(pos, currY + noteMeasure[1] * renderData.shift, renderData.text, renderData.metric, scale, 'center', 'middle')
	}
	/**
	 * 绘制音乐音符的字符
	 */
	drawMusicNoteChar(context: RenderContext, x: number, y: number, note: MusicNote<NoteCharMusic>, reductionLevel: number, isSmall: boolean, scale: number = 1, extraStyles: ExtraStyles = {}, dryRun: boolean = false) {
		const noteMetricA = getLineFont(isSmall ? 'noteSmall' : 'note', context)
		const noteMetricB = getLineFont(isSmall ? 'noteAltSmall' : 'noteAlt', context)
		const noteMeasure = this.root.measureText('0', noteMetricA, scale)

		if(dryRun) {
			return noteMeasure
		}

		let noteText = ''
		if(note.type == 'extend') {
			noteText = '-'
			if(note.voided) {
				noteText = ''
			}
		} else {
			noteText = note.char.char
		}
		const metric = (noteText == '-' || noteCharChecker[noteText] == 0) ? noteMetricA : noteMetricB
		this.root.drawTextFast(x, y, noteText, metric, scale, 'center', 'middle', extraStyles, () => {
			if(context.positionCallback) {
				context.positionCallback(note.lineNumber, note.range[0])
			}
		})

		return noteMeasure
	}
	/**
	 * 获取音符数字尺寸测量值
	 */
	measureNoteChar(context: RenderContext, isSmall: boolean, scale: number = 1) {
		const noteMetricA = getLineFont(isSmall ? 'noteSmall' : 'note', context)
		const noteMeasure = this.root.measureText('0', noteMetricA, scale)
		return noteMeasure
	}
	/**
	 * 绘制音乐音符
	 */
	drawMusicNote(context: RenderContext, x: number, y: number, note: MusicNote<NoteCharMusic>, reductionLineSpace: number, reductionLevel: number, isSmall: boolean, scale: number = 1, extraStyles: ExtraStyles = {}) {
		let grayoutStyle = {}
		if(note.type == 'note' && note.voided && context.render.grayout!) {
			grayoutStyle = {
				opacity: 0.5
			}
		}
		// ===== 音符 =====
		const noteMeasure = this.drawMusicNoteChar(context, x, y, note, reductionLevel, isSmall, scale, grayoutStyle)
		const noteMetric = getLineFont(isSmall ? 'noteSmall' : 'note', context)
		let leftCur = x - noteMeasure[0] / 2
		let rightCur = x + noteMeasure[0] / 2
		if(note.type != 'note') {
			return
		}
		// ===== 变化音符号 =====
		if(note.char.delta == note.char.delta) {
			const accidentalToken = new PaintTextToken(
				this.symbolAccidental(note.char.delta), new FontMetric('SparksNMN-mscore-20/400', noteMetric.fontSize),
				scale, { ...extraStyles, ...grayoutStyle }
			)
			accidentalToken.drawFast(this.root, leftCur, y, 'right', 'bottom')
			leftCur -= accidentalToken.measureFast(this.root)[0]
		}
		// ===== 附点 =====
		note.suffix.forEach((suf) => {
			if(suf == '.') {
				const dotToken = new PaintTextToken(
					'.', noteMetric,
					scale, extraStyles
				)
				dotToken.drawFast(this.root, rightCur, y, 'left', 'middle')
				rightCur += dotToken.measureFast(this.root)[0]
			}
		})
		// ===== 八度跨越 =====
		let topCur = y - noteMeasure[1] / 2
		let bottomCur = y + noteMeasure[1] / 2 + reductionLineSpace * reductionLevel
		let octave = note.char.octave
		const dotToken = new PaintTextToken(
			'.', noteMetric,
			scale, { ...extraStyles, ...grayoutStyle }
		)
		const octaveSpace = reductionLineSpace * 0.4
		while(octave > 0) {
			dotToken.drawFast(this.root, x, topCur + noteMeasure[1] * 0.2, 'center', 'bottom')
			topCur -= noteMeasure[1] * octaveSpace
			octave -= 1
		}
		while(octave < 0) {
			dotToken.drawFast(this.root, x, bottomCur - noteMeasure[1] * 0.7, 'center', 'top')
			bottomCur += noteMeasure[1] * octaveSpace
			octave += 1
		}
		// ===== 顶部属性 =====
		const decorMetric = new FontMetric('SparksNMN-mscore-20/400', noteMetric.fontSize * 1.5)
		note.attrs.forEach((attr) => {
			if(attr.type == 'decor') {
				const decorText = this.symbolNoteDecor(attr.char)
				const decorToken1 = new PaintTextToken(
					decorText[0],
					decorMetric,
					scale, {}
				)
				let xShift = 0
				if(['brk', 'brk+'].indexOf(attr.char) != -1) {
					xShift = -0.3
				} else if(attr.char == 'ext') {
					xShift = +0.1
				} else if(attr.char == 'hold') {
					xShift = -0.1
				} else if(attr.char == 'recho') {
					xShift = -0.35
				}
				let currX = x + noteMeasure[0] * (0.3 + xShift)
				decorToken1.drawFast(this.root, currX, topCur + noteMeasure[1] * 0.15, 'center', 'bottom')
				currX += decorToken1.measureFast(this.root)[0]
				if(decorText.length > 1) {
					const decorToken2 = new PaintTextToken(
						decorText.substring(1),
						decorMetric,
						scale, {}
					)
					decorToken2.drawFast(this.root, currX + noteMeasure[0] * 0.62, topCur - noteMeasure[1] * 0.1, 'left', 'bottom')
				}
				topCur -= topDecorSpace
			}
		})
		// ===== 滑音 =====
		rightCur = x + noteMeasure[0] / 2
		note.attrs.forEach((attr) => {
			if(attr.type == 'slide') {
				const handleX = rightCur
				const radius = noteMeasure[1] / 2 * 0.9
				const handleY = y + (attr.direction == 'up' ? -1 : 1) * radius
				this.root.drawQuarterCircle(handleX, handleY, radius, 'right', attr.direction == 'up' ? 'bottom' : 'top', 0.15, scale)
				const arrowMetric = new FontMetric('SparksNMN-Bravura/400', noteMetric.fontSize * 1)
				const arrowText = attr.direction == 'up' ? "\uEE57" : "\uEE56"
				this.root.drawTextFast(handleX + radius * scale - noteMeasure[0] * 0.06, handleY + noteMeasure[1] * 0.15, arrowText, arrowMetric, scale, 'center', 'middle')
			}
		})
		// ==== 装饰音符 ====
		note.attrs.forEach((attr) => {
			if(attr.type == 'notes') {
				if(attr.notes.type != 'section') {
					return
				}
				const handleX = attr.slot == 'postfix' ? rightCur : leftCur
				const radius = noteMeasure[1] / 2 * 0.6
				const handleY = y - radius * 1.15
				this.root.drawQuarterCircle(handleX, handleY, radius, attr.slot == 'postfix' ? 'right' : 'left', 'bottom', 0.15, scale)
				const topX = handleX + (attr.slot == 'postfix' ? 1 : -1) * scale * radius
				const totalWidth = noteMeasure[0] * addNotesScale * attr.notes.notes.length
				this.root.drawLine(topX - totalWidth / 2, handleY, topX + totalWidth / 2, handleY, 0.15, 0, scale)
				this.drawAddNotes(context, topX, handleY - addNotesScale * reductionLineSpace, attr.notes, isSmall, scale, extraStyles)
			}
		})
	}
	/**
	 * 绘制装饰音符
	 */
	drawAddNotes(context: RenderContext, x: number, y: number, section: (MusicSection<NoteCharMusic> & {type: 'section'}), isSmall: boolean, scale: number = 1, extraStyles: ExtraStyles = {}) {
		// ==== 统计 ====
		let maxReductionLevel = 0
		section.decoration.forEach((decor) => {
			if(decor.char == '_') {
				maxReductionLevel = Math.max(maxReductionLevel, decor.level)
			}
		})
		let maxOctaveDots = 0
		section.notes.forEach((note) => {
			if(note.type == 'note') {
				maxOctaveDots = Math.max(maxOctaveDots, -note.char.octave)
			}
		})
		let noteMetric = getLineFont(isSmall ? 'noteSmall' : 'note', context)
		noteMetric.fontSize *= addNotesScale
		let noteMeasure = this.measureNoteChar(context, isSmall, scale)
		noteMeasure = [ noteMeasure[0] * addNotesScale, noteMeasure[1] * addNotesScale ]
		let baseHeight = y - addNotesScale * reductionLineSpace * maxReductionLevel - Math.max((maxOctaveDots * 0.22 - 0.1) * noteMeasure[1], 0)
		let currY = baseHeight - noteMeasure[1] * 0.4
		let currX = x - noteMeasure[0] / 2 * section.notes.length
		let positions: {hash: string, index: number}[] = []
		section.notes.forEach((note, index) => {
			positions.push({
				hash: Frac.repr(note.startPos),
				index: index
			})
		})
		// ===== 画减时线 =====
		section.decoration.forEach((decor) => {
			if(decor.char == '_') {
				const lineY = y - addNotesScale * reductionLineSpace * (maxReductionLevel - decor.level)
				const startX = currX + noteMeasure[0] * (findWithKey(positions, 'hash', Frac.repr(decor.startPos))!.index)
				const endX = currX + noteMeasure[0] * (findWithKey(positions, 'hash', Frac.repr(decor.endPos))!.index + 1)
				this.root.drawLine(startX, lineY, endX, lineY, 0.15, 0, scale)
			}
		})
		// ==== 画音符 ====
		currX += noteMeasure[0] / 2
		section.notes.forEach((note) => {
			// ===== 音符 =====
			this.drawMusicNoteChar(context, currX, currY / addNotesScale, note, 0, isSmall, scale * addNotesScale, extraStyles)
			let leftCur = currX - noteMeasure[0] / 2
			let rightCur = currX + noteMeasure[0] / 2
			if(note.type != 'note') {
				return
			}
			// ===== 变化音符号 =====
			if(note.char.delta == note.char.delta) {
				const accidentalToken = new PaintTextToken(
					this.symbolAccidental(note.char.delta), new FontMetric('SparksNMN-mscore-20/400', noteMetric.fontSize),
					scale, extraStyles
				)
				accidentalToken.drawFast(this.root, leftCur, currY, 'center', 'bottom')
				leftCur -= accidentalToken.measureFast(this.root)[0]
			}
			// ===== 附点 =====
			note.suffix.forEach((suf) => {
				if(suf == '.') {
					const dotToken = new PaintTextToken(
						'.', noteMetric,
						scale, extraStyles
					)
					dotToken.drawFast(this.root, rightCur, currY, 'left', 'middle')
					rightCur += dotToken.measureFast(this.root)[0]
				}
			})
			// ===== 八度跨越 =====
			let topCur = currY - noteMeasure[1] / 2
			let bottomCur = currY + noteMeasure[1] / 2
			let octave = note.char.octave
			const dotToken = new PaintTextToken(
				'.', noteMetric,
				scale, extraStyles
			)
			while(octave > 0) {
				dotToken.drawFast(this.root, currX, topCur + noteMeasure[1] * 0.3, 'center', 'bottom')
				topCur -= noteMeasure[1] * 0.22
				octave -= 1
			}
			while(octave < 0) {
				dotToken.drawFast(this.root, currX, bottomCur - noteMeasure[1] * 0.8, 'center', 'top')
				bottomCur += noteMeasure[1] * 0.22
				octave += 1
			}
			currX += noteMeasure[0]
		})
	}

	/**
	 * 绘制拍号符号
	 * @param x 左边缘的横坐标
	 * @param y 竖直中心位置所在的纵坐标
	 * @param beats 拍号
	 * @param fontScale 字体缩放
	 * @returns 宽度为拍号符号的宽度，高度无效
	 */
	drawBeats(x: number, y: number, beats: Beats, fontScale: number = 1, scale: number = 1, extraStyles: ExtraStyles = {}, dryRun: boolean = false) {
		const numberMetrics = new FontMetric('SparksNMN-EOPNumber/400', 1.8 * fontScale)
		const textMetrics = new FontMetric('SimHei/700', 1.9 * fontScale)
		const xMeasure = this.root.measureTextFast(beats.value.x.toString(), numberMetrics, scale)
		const yMeasure = this.root.measureTextFast(beats.value.y.toString(), numberMetrics, scale)
		const numberWidth = Math.max(xMeasure[0], yMeasure[0])
		const numberHeight = Math.max(xMeasure[1], yMeasure[1])
		const linePadding = fontScale * 0.5 * scale
		const lineSpacing = fontScale * 0.2
		const lineWidth = numberWidth + 2 * linePadding
		const lineWeight = 0.2 * fontScale
		const tMargin = fontScale * 0.35 * scale
		const tMeasure = this.root.measureTextFast('T', textMetrics, scale)
		const totalMeasure = [
			lineWidth + (beats.defaultReduction > 2 ? tMargin + tMeasure[0] : 0),
			(lineSpacing + numberHeight) * 2
		]
		if(dryRun) {
			return totalMeasure
		}
		
		this.root.drawLine(x, y, x + lineWidth, y, lineWeight, 0, scale, extraStyles)
		this.root.drawTextFast(x + lineWidth / 2, y - lineSpacing, beats.value.x.toString(), numberMetrics, scale, 'center', 'bottom', extraStyles)
		this.root.drawTextFast(x + lineWidth / 2, y + lineSpacing, beats.value.y.toString(), numberMetrics, scale, 'center', 'top', extraStyles)
		if(beats.defaultReduction > 2) {
			this.root.drawTextFast(x + lineWidth + tMargin, y, 'T', textMetrics, scale, 'left', 'middle')
		}

		return totalMeasure
	}

	/**
	 * 绘制调性符号
	 * @param x 左边缘的横坐标
	 * @param y 竖直中心位置所在的纵坐标
	 * @param base 基调
	 * @param fontScale 字体缩放
	 * @returns 测量值，高度无效
	 */
	drawBase(x: number, y: number, base: BaseTune, fontScale: number = 1, scale: number = 1, extraStyles: ExtraStyles = {}, dryRun: boolean = false) {
		const textMetrics = new FontMetric('Deng/700', 2.16 * fontScale)
		const accidentalMetrics = new FontMetric('SparksNMN-mscore-20', 2.16 * fontScale)
		
		const text1Measure = this.root.measureTextFast('1=', textMetrics, scale)
		const rootText = MusicTheory.pitch2AbsName(base)
		const delta = base.value - base.baseValue
		const rootMeasure = this.root.measureTextFast(rootText, textMetrics, scale)
		let accidentalText = ''
		if(delta == delta && delta != 0) {
			accidentalText = this.symbolAccidental(delta)
		}
		const accidentalMeasure = this.root.measureTextFast(accidentalText, accidentalMetrics, scale)
		const totalMeasure = [
			text1Measure[0] + rootMeasure[0] + accidentalMeasure[0],
			Math.max(text1Measure[1], rootMeasure[1])
		]
		if(dryRun) {
			return totalMeasure
		}

		let currX = x
		this.root.drawTextFast(currX, y, '1=', textMetrics, scale, 'left', 'middle', extraStyles)
		currX += text1Measure[0]
		this.root.drawTextFast(currX, y, accidentalText, accidentalMetrics, scale, 'left', 'bottom', extraStyles)
		currX += accidentalMeasure[0]
		this.root.drawTextFast(currX, y, rootText, textMetrics, scale, 'left', 'middle', extraStyles)
		currX += rootMeasure[0]

		return totalMeasure
	}
	/**
	 * 绘制转调符号
	 */
	drawShift(context: RenderContext, x: number, y: number, shift: AttrShift, fontScale: number = 1, scale: number = 1, extraStyles: ExtraStyles = {}, dryRun: boolean = false) {
		const textMetrics = new FontMetric('Deng/700', 2.0 * fontScale)
		const accidentalMetrics = new FontMetric('SparksNMN-mscore-20', 2.0 * fontScale)

		let text1 = '', accidental = '', text2 = ''
		if(shift.metrics == 'absolute') {
			if(shift.changeTranspose) {
				text1 = I18n.renderToken(context.language, 'shift_prop_at_1')
				text2 = I18n.renderToken(context.language, 'shift_prop_at_2')
			} else {
				text1 = I18n.renderToken(context.language, 'shift_prop_a_1')
				text2 = I18n.renderToken(context.language, 'shift_prop_a_2')
			}
			const rootText = MusicTheory.pitch2AbsName(shift.value)
			text2 = rootText + text2
			const delta = shift.value.value - shift.value.baseValue
			if(delta == delta && delta != 0) {
				accidental = this.symbolAccidental(delta)
			}
		} else {
			const absVal = Math.abs(shift.value)
			let sign = 0
			if(absVal != 0) {
				sign = Math.round(shift.value / absVal)
			}
			text1 = I18n.renderToken(context.language, shift.changeTranspose ? 'shift_prop_rt' : 'shift_prop_r',
				I18n.upDownText(context.language, sign >= 0 ? 'up' : 'down'),
				I18n.metricText(context.language, shift.metrics, absVal.toString())
			)
		}

		const textToken1 = new PaintTextToken(
			text1, textMetrics, scale, extraStyles
		)
		const textMeasure1 = textToken1.measureFast(this.root)
		const textToken2 = new PaintTextToken(
			text2, textMetrics, scale, extraStyles
		)
		const textMeasure2 = textToken2.measureFast(this.root)
		const accidentalToken = new PaintTextToken(
			accidental, accidentalMetrics, scale, extraStyles
		)
		const accidentalMeasure = accidentalToken.measureFast(this.root)

		const totalMeasure = [
			textMeasure1[0] + textMeasure2[0] + accidentalMeasure[0],
			0
		]

		if(dryRun) {
			return totalMeasure
		}

		let currX = x
		textToken1.drawFast(this.root, currX, y, 'left', 'middle')
		currX += textMeasure1[0]
		accidentalToken.drawFast(this.root, currX, y, 'left', 'bottom')
		currX += accidentalMeasure[0]
		textToken2.drawFast(this.root, currX, y, 'left', 'middle')

		return totalMeasure
	}
	/**
	 * 绘制拍速符号
	 */
	drawSpeed(x: number, y: number, speed: Qpm, fontScale: number = 1, scale: number = 1, extraStyles: ExtraStyles = {}, dryRun: boolean = false) {
		let text = '=' + speed.value.toString()
		if(speed.text) {
			text = speed.text
		}
		const textToken = new PaintTextToken(
			text,
			new FontMetric('Deng/700', 2.0 * fontScale),
			scale, extraStyles
		)
		const textMeasure = textToken.measureFast(this.root)
		
		let symbolText = this.symbolBeats(speed.symbol)
		if(speed.text) {
			symbolText = ''
		}
		const symbolToken = new PaintTextToken(
			symbolText,
			new FontMetric('SparksNMN-mscore-20', 3.2 * fontScale),
			scale, extraStyles
		)
		const symbolMeasure = symbolToken.measure(this.root)

		const totalMeasure = [
			textMeasure[0] + symbolMeasure[0],
			textMeasure[1]
		]

		if(dryRun) {
			return totalMeasure
		}

		let currX = x
		if(symbolText) {
			symbolToken.drawFast(this.root, currX, y + symbolMeasure[1] * 0.08, 'left', 'middle')
			currX += symbolMeasure[0]
			if(speed.symbol != 'spm') {
				currX -= symbolMeasure[0] * 0.35
			} else {
				currX -= symbolMeasure[0] * 0.08
			}
		}
		textToken.drawFast(this.root, currX, y, 'left', 'middle')
		currX += textMeasure[0]

		return totalMeasure
	}
	/**
	 * 绘制移调符号
	 */
	drawTranspose(context: RenderContext, x: number, y: number, transpose: number, fontScale: number = 1, scale: number = 1, extraStyles: ExtraStyles = {}, dryRun: boolean = false) {
		let numberText = transpose.toString()
		if(transpose > 0) {
			numberText = '+' + numberText
		}
		const textToken = new PaintTextToken(
			I18n.renderToken(context.language, 'transpose_prop', numberText),
			new FontMetric('Deng/700', 2.0 * fontScale),
			scale, extraStyles
		)
		const measure = textToken.measureFast(this.root)

		if(dryRun) {
			return measure
		}

		textToken.drawFast(this.root, x, y, 'left', 'middle')

		return measure
	}
	/**
	 * 绘制其他
	 */
	drawOther(x: number, y: number, text: string, fontScale: number = 1, scale: number = 1, extraStyles: ExtraStyles = {}, dryRun: boolean = false) {
		const textToken = new PaintTextToken(
			text,
			new FontMetric('Deng/700', 2.0 * fontScale),
			scale, extraStyles
		)
		const measure = textToken.measureFast(this.root)

		if(dryRun) {
			return measure
		}

		textToken.drawFast(this.root, x, y, 'left', 'middle')

		return measure
	}
	/**
	 * 绘制所有音乐属性
	 */
	drawMusicalProps(context: RenderContext, requireBeats: boolean, x: number, y: number, musicalProps: MusicProps, fontScale: number = 1, scale: number = 1, extraStyles: ExtraStyles = {}) {
		
		const spacer = 2 * fontScale
		let currX = x
		// ==== 基调 ====
		if(musicalProps.base) {
			currX += this.drawBase(currX, y, musicalProps.base, fontScale, scale, extraStyles)[0]
			if(musicalProps.beats || requireBeats) {
				currX += 1 * fontScale * scale
			} else {
				currX += spacer * scale
			}
		}
		// ==== 拍号 ====
		if(musicalProps.beats || requireBeats) {
			currX += this.drawBeats(currX, y, musicalProps.beats ? musicalProps.beats : context.musical.beats!, fontScale, scale, extraStyles)[0]
			currX += spacer * scale
		}
		// ==== 拍速 ====
		if(musicalProps.qpm) {
			currX += this.drawSpeed(currX, y, musicalProps.qpm, fontScale, scale, extraStyles)[0] + spacer * scale
		}
		// ==== 移调 ====
		if(musicalProps.transp) {
			currX += this.drawTranspose(context, currX, y, musicalProps.transp, fontScale, scale, extraStyles)[0] + spacer * scale
		}
		// ==== 其他参数 ====
		musicalProps.extras.forEach((str) => {
			currX += this.drawOther(currX, y, str, fontScale, scale, extraStyles)[0] + 1 * fontScale * scale
		})

		return currX - x
	}
}

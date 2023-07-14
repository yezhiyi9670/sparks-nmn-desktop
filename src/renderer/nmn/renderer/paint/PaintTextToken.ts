import { DomPaint } from "../backend/DomPaint";
import { FontMetric } from "../FontMetric";

type ExtraStyles = {[_: string]: number | string}

export class PaintTextToken {
	text!: string
	fontMetric!: FontMetric
	scale!: number
	extraStyles!: ExtraStyles

	constructor(text: string, fontMetric: FontMetric, scale: number = 1, extraStyles: ExtraStyles = {}) {
		Object.assign(this, { text, fontMetric, scale, extraStyles })
	}

	/**
	 * 测量文本
	 */
	measure(root: DomPaint, extraStyles: ExtraStyles = {}) {
		return root.measureText(this.text, this.fontMetric, this.scale, {
			...this.extraStyles,
			...extraStyles
		})
	}
	measureFast(root: DomPaint) {
		return root.measureTextFast(this.text, this.fontMetric, this.scale)
	}

	/**
	 * 绘制文本
	 */
	draw(root: DomPaint, x: number, y: number, align: 'left' | 'center' | 'right', alignY: 'top' | 'middle' | 'bottom', clickHandler?: () => void) {
		return root.drawText(x, y, this.text, this.fontMetric, this.scale, align, alignY, this.extraStyles, [], clickHandler)
	}
	drawFast(root: DomPaint, x: number, y: number, align: 'left' | 'center' | 'right', alignY: 'top' | 'middle' | 'bottom', clickHandler?: () => void) {
		root.drawTextFast(x, y, this.text, this.fontMetric, this.scale, align, alignY, this.extraStyles, [], clickHandler)
	}
}

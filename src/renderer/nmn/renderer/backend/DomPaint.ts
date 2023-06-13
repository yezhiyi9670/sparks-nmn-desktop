import $ from 'jquery'
import { FontMetric } from '../FontMetric'
import { md5 } from '../../util/md5'
import { iterateMap } from '../../util/array'
import { camelCase2Hyphen } from '../../util/string'

type ExtraStyles = {[_: string]: number | string}

const measureCache: {[_: string]: [number, number]} = {}
const measureCacheFast: {[_: string]: [number, number]} = {}

/*
Edge 与 Chrome 有最小字体限制，通过调节字体尺度绕过
Edge 与 Chrome 导致连音线等图形出现不规则边缘，通过较大的放缩可缓解
*/
const getScaler = () => {
	const browserType =
		window.navigator.userAgent.indexOf('Edg') != -1 ? 'edge' :
		window.navigator.userAgent.indexOf('Firefox') != -1 ? 'firefox' :
		'normal'
	return {
		edge: [ 2, 2 ],
		normal: [ 2, 2 ],
		firefox: [ 2, 2 ]
	}[browserType]
}

export const domPaintStats = {
	measureTime: 0,
	domDrawTime: 0
}

// 替换XML
function escapeXml(unsafe: string) {
	return unsafe.replace(/[<>&'"]/g, function (c: string) {
		switch (c) {
			case '<': return '&lt;';
			case '>': return '&gt;';
			case '&': return '&amp;';
			case '\'': return '&apos;';
			case '"': return '&quot;';
		}
		return ''
	});
}

// 生成 style 字符串
function translateStyles(styles: ExtraStyles) {
	return escapeXml(iterateMap(styles, (value, key) => {
		return `${camelCase2Hyphen(key)}:${escapeXml(value.toString())};`
	}).join(''))
}

// 生成 Token
function generateToken() {
	let length = 24
	let charset = '0123456789abcdfghijkmopqrstuvxyz'
	let str = ''
	for(let i = 0; i < length; i++) {
		let randChar = charset[Math.floor(Math.random() * charset.length)]
		str += randChar
	}
	return str
}

// 用于测量的组件
const measurer = {
	span: undefined as (undefined | HTMLSpanElement),
	canvas: undefined as (undefined | HTMLCanvasElement),
}

export class DomPaint {
	element: HTMLDivElement
	htmlContent: string
	token: string
	clickCallbacks: {[_: string]: () => void} = {}
	clickableOrder: number = 0

	truncateDecimal(item: number, digits: number) {
		const str = item.toFixed(digits)
		if(str.length < ("" + item).length) {
			return str
		}
		return "" + item
	}
	limitPrecisionShape(item: number) {
		return this.truncateDecimal(item, 3)
	}
	limitPrecisionEm(item: number) {
		return this.truncateDecimal(item, 5)
	}

	getElement() {
		this.element.innerHTML = this.htmlContent
		for(let i = 0; i < this.element.children.length; i++) {
			const innerElement = this.element.children[i]
			const prefix = 'DomPaint-clickable__'
			if(innerElement.id.startsWith(prefix)) {
				const token = innerElement.id.substring(prefix.length)
				if(token in this.clickCallbacks) {
					innerElement.addEventListener('click', this.clickCallbacks[token])
				}
			}
		}
		return this.element
	}
	
	constructor() {
		this.token = generateToken()
		this.element = $<HTMLDivElement>('<div></div>').css({position: 'relative'}).addClass('DomPaint__' + this.token)[0]
		this.htmlContent = ''
	}

	/**
	 * 多边形模拟四分之一圆弧形状
	 */
	polygonQuarterCircle(innerRatio: number, outerRatio: number = 1, ease: (position: number) => number): [number, number][] {
		let points: [number, number][] = []
		let sides = 24
		let clampEase = (position: number) => {
			return Math.min(1, Math.max(0, ease(position)))
		}
		for(let i = 0; i <= sides; i++) {
			let position = i / sides
			let widthRatio = clampEase(position)
			let angle = Math.PI / 2 / sides * i
			let mid = (innerRatio + outerRatio) / 2, div = (outerRatio - innerRatio) / 2
			points.push([Math.cos(angle) * (mid + div * widthRatio), Math.sin(angle) * (mid + div * widthRatio)])
		}
		for(let i = sides; i >= 0; i--) {
			let position = i / sides
			let widthRatio = clampEase(position)
			let angle = Math.PI / 2 / sides * i
			let mid = (innerRatio + outerRatio) / 2, div = (outerRatio - innerRatio) / 2
			points.push([Math.cos(angle) * (mid - div * widthRatio), Math.sin(angle) * (mid - div * widthRatio)])
		}
		return points.map((point) => {
			return [0.5 * point[0] + 0.5, 0.5 * point[1] + 0.5]
		})
	}
	/**
	 * 全尺寸正方形
	 */
	polygonFullSquare(): [number, number][] {
		const points = [
			[0, 0], [1, 0], [1, 1], [0, 1]
		]
		return points.map((point) => {
			return [point[0], point[1]]
		})
	}
	/**
	 * 根据碰撞箱取整规则微调（保证图元碰撞箱在整数坐标上，其他细节通过外形路径调整）
	 */
	processPolygon(centerX: number, centerY: number, width: number, height: number, points: [number, number][], rotateDeg: number = 0) {
		// 统一度量后旋转
		const uniMetric = Math.max(width, height)
		const rotatedPoints: [number, number][] = points.map(point => {
			const c = Math.cos(Math.PI / 180 * rotateDeg)
			const s = Math.sin(Math.PI / 180 * rotateDeg)
			const x = (point[0] - 0.5) * (width / uniMetric)
			const y = (point[1] - 0.5) * (height / uniMetric)
			return [ 0.5 + x * c - y * s, 0.5 + x * s + y * c ]
		})

		// 重新计算高度与宽度
		let maxWidthRatio = Math.min(width / height, height / width)
		let maxHeightRatio = maxWidthRatio
		rotatedPoints.forEach(point => {
			maxWidthRatio = Math.max(maxWidthRatio, 2 * Math.abs(point[0] - 0.5))
			maxHeightRatio = Math.max(maxHeightRatio, 2 * Math.abs(point[1] - 0.5))
		})
		rotatedPoints.forEach(point => {
			point[0] = (point[0] - 0.5) / maxWidthRatio + 0.5
			point[1] = (point[1] - 0.5) / maxHeightRatio + 0.5
		})
		width = uniMetric * maxWidthRatio
		height = uniMetric * maxHeightRatio

		// 分配整数碰撞箱
		const minX = centerX - width / 2; let minXf = Math.floor(minX) - 1
		const maxX = centerX + width / 2; let maxXf = Math.ceil(maxX) + 1
		const minY = centerY - height / 2; let minYf = Math.floor(minY) - 1
		const maxY = centerY + height / 2; let maxYf = Math.ceil(maxY) + 1
		// 计算图形偏移
		const bbWidth = maxXf - minXf
		const bbHeight = maxYf - minYf
		const shiftX = minX - minXf
		const shiftY = minY - minYf
		const scaleX = width / bbWidth
		const scaleY = height / bbHeight
		const newPoints: [number, number][] = rotatedPoints.map((point) => {
			return [
				shiftX / bbWidth + scaleX * point[0],
				shiftY / bbHeight + scaleY * point[1]
			]
		})
		// 打包数据
		return {
			centerX: (minXf + maxXf) / 2,
			centerY: (minYf + maxYf) / 2,
			width: bbWidth,
			height: bbHeight,
			points: newPoints,
		}
	}

	/**
	 * 测量文本框的宽度和高度（以 em 为单位）
	 * @param text 文本内容
	 * @param font 字体，类型为 FontMetric
	 * @returns 
	 */
	measureText(text: string, font: FontMetric, widthScale: number = 1, extraStyles: ExtraStyles = {}) {
		if(text == '') {
			return [0, 0]
		}
		domPaintStats.measureTime -= +new Date()
		const hash = md5(JSON.stringify({
			text: text,
			font: font.fontFamily + '/' + font.fontWeight + '/' + (font.fontSize * font.fontScale),
			extraStyles: extraStyles
		}))
		if(hash in measureCache) {
			const [ width, height ] = measureCache[hash]
			domPaintStats.measureTime += +new Date()
			return [ width * widthScale, height ]
		}
		let fontSize = font.fontSize * font.fontScale
		
		if(!measurer.span) {
			measurer.span = $('<span></span>')
				.addClass('DomPaint-text-measure')
				.css('display', 'none')
				.css('line-height', 1.15)
				.css('white-space', 'pre')
				.css('position', 'fixed')
				.css('top', 0)
				.css('left', 0)
				[0]
		}
		
		const $measure = $(measurer.span!).text(text)
		.css('display', 'inline-block')
		.css('font-family', font.fontFamily)
		.css('font-size', `${fontSize * 50}px`)  // 50 倍的尺寸减小最小字体限制造成的影响
		.css('font-weight', font.fontWeight)
		.css(extraStyles)
		$('body').append($measure)
		const width = $measure[0].clientWidth / 50
		const height = $measure[0].clientHeight / 50
		$measure.css('display', 'none')

		// 暂时去除 span 测量复用。因为存在 ExtraStyles，这玩意可能会爆炸
		$measure.remove()
		measurer.span = undefined
		
		measureCache[hash] = [ width, height ]
		domPaintStats.measureTime += +new Date()
		return [ width * widthScale, height ]
	}
	/**
	 * 测量文本框的宽度和高度（仅适用单行简单文本）
	 * @param text 文本内容
	 * @param font 字体，类型为 FontMetric
	 * @returns 
	 */
	measureTextFast(text: string, font: FontMetric, widthScale: number = 1) {
		// return this.measureText(text, font, widthScale)
		if(text == '') {
			return [0, 0]
		}
		domPaintStats.measureTime -= +new Date()
		const hash = md5(JSON.stringify({
			text: text,
			font: font.fontFamily + '/' + font.fontWeight + '/' + (font.fontSize * font.fontScale),
		}))
		if(hash in measureCacheFast) {
			const [ width, height ] = measureCacheFast[hash]
			domPaintStats.measureTime += +new Date()
			return [ width * widthScale, height ]
		}
		
		if(!measurer.canvas) {
			measurer.canvas = document.createElement('canvas')
		}

		let canvas = measurer.canvas
		let context = canvas.getContext('2d')
		let fontSize = font.fontSize * font.fontScale
		if(context == null) {
			domPaintStats.measureTime += +new Date()
			return [0, 0]
		}
		context.font = `${font.fontWeight >= 550 ? 'bold ' : ''}${fontSize}px ${font.fontFamily}`
		let width = context.measureText(text).width
		
		measureCacheFast[hash] = [ width, 0 ]
		domPaintStats.measureTime += +new Date()
		return [width * widthScale, 0]
	}
	/**
	 * 绘制文本框
	 * @param x 到页面左基线的距离（以 em 为单位，页面宽度是 100em）
	 * @param y 到页面上基线的距离（以 em 为单位）
	 * @param text 文本内容
	 * @param font 字体，类型为 FontMetric
	 * @param scale 尺寸缩放，应用于字体大小和
	 * @param align 文本的水平贴靠方式，同时是定位锚点的方位
	 * @param alignY 竖直定位锚点的方位
	 * @param extraStyles 应用在 <span> 元素上的额外样式
	 * @returns 文本的尺寸测量数据，不受 scale 参数影响，但受 fontScale 影响
	 */
	drawTextFast(x: number, y: number, text: string, font: FontMetric, scale: number, align: 'left' | 'center' | 'right' = 'left', alignY: 'top' | 'middle' | 'bottom' = 'top', extraStyles: ExtraStyles = {}, clickHandler?: () => void) {
		const textUpScale = getScaler()[0]
		
		let fontSize = font.fontSize * font.fontScale
		x /= fontSize
		y /= fontSize
		const tx = {left: 0, center: -50, right: -100}[align]
		const ty = {top: 0, middle: -50, bottom: -100}[alignY]

		domPaintStats.domDrawTime -= +new Date()
		let token = ''
		if(clickHandler) {
			token = (this.clickableOrder++).toString()
			this.clickCallbacks[token] = clickHandler
		}
		const textSpanText = `<span style="${translateStyles(
			{
				color: '#000',
				whiteSpace: 'pre',
				display: 'inline-block',
				position: 'absolute',
				textAlign: align,
				fontFamily: font.fontFamily,
				fontSize: `${this.limitPrecisionEm(fontSize * scale * textUpScale)}em`,
				fontWeight: font.fontWeight,
				top: 0,
				left: 0,
				transformOrigin: 'top left',
				transform: `translateX(${this.limitPrecisionEm(x/scale/textUpScale)}em) translateY(${this.limitPrecisionEm(y / textUpScale)}em) scale(${this.limitPrecisionEm(1/textUpScale)}) translateX(${tx}%) translateY(${ty}%)`,
				...(clickHandler ? {
					cursor: 'pointer',
					zIndex: 1
				} : {}),
				...extraStyles
			}
		)}" ${clickHandler ? 'id="DomPaint-clickable__' + token + '"' : ''}>${escapeXml(text)}</span>`
		this.htmlContent += textSpanText
		domPaintStats.domDrawTime += +new Date()
	}
	/**
	 * 绘制文本框
	 * @param x 到页面左基线的距离（以 em 为单位，页面宽度是 100em）
	 * @param y 到页面上基线的距离（以 em 为单位）
	 * @param text 文本内容
	 * @param font 字体，类型为 FontMetric
	 * @param scale 尺寸缩放，应用于字体大小和
	 * @param align 文本的水平贴靠方式，同时是定位锚点的方位
	 * @param alignY 竖直定位锚点的方位
	 * @param extraStyles 应用在 <span> 元素上的额外样式
	 * @returns 文本的尺寸测量数据，不受 scale 参数影响，但受 fontScale 影响
	 */
	drawText(x: number, y: number, text: string, font: FontMetric, scale: number, align: 'left' | 'center' | 'right' = 'left', alignY: 'top' | 'middle' | 'bottom' = 'top', extraStyles: ExtraStyles = {}, clickHandler?: () => void) {
		this.drawTextFast(x, y, text, font, scale, align, alignY, extraStyles, clickHandler)
		return this.measureText(text, font, scale, extraStyles)
	}

	/**
	 * 绘制多边形图元
	 * @param centerX 中心点 X
	 * @param centerY 中心点 Y
	 * @param width 宽度
	 * @param height 高度
	 * @param number 角度
	 * @param points 图形点
	 */
	drawPolygonUnit(centerX: number, centerY: number, width: number, height: number, rotate: number, points:[number, number][], extraStyles: ExtraStyles = {}, extraClasses: string[] = []) {
		if(width <= 0 || height <= 0) {
			return
		}
		
		const figureUpScale = getScaler()[1]
		
		const bbMetrics = this.processPolygon(
			centerX, centerY,
			width, height,
			points,
			rotate
		)

		domPaintStats.domDrawTime -= +new Date()
		const textSpanText = `<div style="${translateStyles(
			{
				boxShadow: `inset 0 0 0 ${this.limitPrecisionEm(Math.max(bbMetrics.width, bbMetrics.height) * figureUpScale)}em`,
				position: 'absolute',
				clipPath: `polygon(${bbMetrics.points.map(point => {
					return `${this.limitPrecisionShape(point[0] * 100)}% ${this.limitPrecisionShape(point[1] * 100)}%`
				}).join(',')})`,
				width: `${this.limitPrecisionEm(bbMetrics.width * figureUpScale)}em`,
				height: `${this.limitPrecisionEm(bbMetrics.height * figureUpScale)}em`,
				transformOrigin: 'left top',
				transform: `
					scale(${this.limitPrecisionEm(1 / figureUpScale)})
					translateX(${this.limitPrecisionEm(
						bbMetrics.centerX * figureUpScale
					)}em)
					translateY(${this.limitPrecisionEm(
						bbMetrics.centerY * figureUpScale
					)}em)
					translateX(-50%) translateY(-50%)
				`,
				...extraStyles
			}
		)}" class="${extraClasses.join(' ')}"></div>`
		this.htmlContent += textSpanText
		domPaintStats.domDrawTime += +new Date()
	}
	/**
	 * 绘制直线
	 * @param x1 第一点到页面左基线的距离
	 * @param y1 第一点到页面上基线的距离
	 * @param x2 第二点到页面左基线的距离
	 * @param y2 第二点到页面上基线的距离
	 * @param width 直线宽度（以 em 为单位）
	 * @param padding 直线在两端加长的长度
	 * @param extraStyles 应用在 <div> 元素上的额外样式
	 */
	drawLine(x1: number, y1: number, x2: number, y2: number, width: number, padding: number = 0, scale: number = 1, extraStyles: ExtraStyles = {}, extraClasses: string[] = []) {
		y1 *= scale
		y2 *= scale
		padding *= scale
		width *= scale
		let dx = x2 - x1
		let dy = y2 - y1
		let lineLength = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2))
		let centerX = (x1 + x2) / 2
		let centerY = (y1 + y2) / 2
		let angle = Math.atan2(dy, dx) * 180 / Math.PI

		this.drawPolygonUnit(
			centerX, centerY,
			lineLength + 2 * padding,
			width,
			angle,
			this.polygonFullSquare(),
			extraStyles,
			extraClasses
		)
	}
	/**
	 * 绘制圆弧线
	 */
	drawQuarterCircle(x: number, y: number, r: number, halfX: 'left' | 'right', halfY: 'top' | 'bottom', width: number, ease: (position: number) => number, scale: number = 1, extraStyles: ExtraStyles = {}, extraClasses: string[] = []) {
		y *= scale
		r *= scale
		width *= scale
		r += width / 2
		const outerRatio = 0.95
		const ratio = 1 - width / r
		r /= outerRatio
		let rotate = 0
		if(halfX == 'left') {
			if(halfY == 'top') {
				rotate = 180
			} else {
				rotate = 90
			}
		} else {
			if(halfY == 'top') {
				rotate = 270
			} else {
				rotate = 0
			}
		}

		this.drawPolygonUnit(
			x, y,
			r * 2,
			r * 2,
			rotate,
			this.polygonQuarterCircle(ratio* outerRatio, outerRatio, ease),
			extraStyles,
			extraClasses
		)
	}
	/**
	 * 绘制空心矩形
	 */
	drawRectOutline(x1: number, y1: number, x2: number, y2: number, width: number, scale: number = 1, extraStyles: ExtraStyles = {}) {
		const padding = width / 2
		this.drawLine(x1, y1, x2, y1, width, padding, scale, extraStyles)
		this.drawLine(x2, y1, x2, y2, width, padding, scale, extraStyles)
		this.drawLine(x2, y2, x1, y2, width, padding, scale, extraStyles)
		this.drawLine(x1, y2, x1, y1, width, padding, scale, extraStyles)
	}
}

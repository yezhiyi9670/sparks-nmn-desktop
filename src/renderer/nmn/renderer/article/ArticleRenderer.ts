import { NMNResult } from '../../index'
import { DomPaint } from '../backend/DomPaint'
import { FontMetric } from '../FontMetric'
import { MusicPaint } from '../paint/MusicPaint'
import { PaintTextToken } from '../paint/PaintTextToken'
import { EquifieldSection, RenderContext } from '../renderer'
import { LineRenderer } from './line/LineRenderer'

type NMNArticle = NMNResult['result']['articles'][0]
type NMNMusicArticle = NMNArticle & {type: 'music'}
type NMNTextArticle = NMNArticle & {type: 'text'}

class ArticleRendererClass {
	/**
	 * 渲染章节
	 */
	renderArticle(article: NMNArticle, sections: EquifieldSection[], context: RenderContext) {
		if(article.type == 'text') {
			this.renderTextArticle(article, sections, context)
		} else if(article.type == 'music') {
			this.renderMusicArticle(article, sections, context)
		} else {
			const _: never = article
		}
		// 渲染下边距
		if(article.type != 'music' || article.lines.length != 0) {
			sections.push({
				element: new DomPaint().getElement(),
				height: 1.5,
				isMargin: true
			})
		}
	}
	/**
	 * 渲染文本章节
	 */
	renderTextArticle(article: NMNTextArticle, sections: EquifieldSection[], context: RenderContext) {
		const root = new DomPaint()
		const scale = context.render.scale!

		let currY = 0
		const textMetric = new FontMetric(context.render.font_text!, 2.16)
		const textSize = textMetric.fontSize * textMetric.fontScale * scale
		article.text.forEach((textLine) => {
			let text = textLine.text
			if(text == '') {
				text = ' '
			}
			const textToken = new PaintTextToken(text, textMetric, scale, {
				width: `${100 / textSize}em`,
				whiteSpace: 'pre-wrap',
			})
			currY += textToken.draw(root, 0, currY, 'left', 'top')[1] * 1.2
		})
		currY += 0

		sections.push({
			element: root.getElement(),
			height: currY * scale
		})
	}
	/**
	 * 渲染音乐章节
	 */
	renderMusicArticle(article: NMNMusicArticle, sections: EquifieldSection[], context: RenderContext) {
		// 渲染章节头部
		let halfRoot = this.renderMusicArticleHeader(article, sections, context)
		// 渲染内容行
		let lastLine: NMNMusicArticle['lines'][0] | undefined = undefined as any
		article.lines.forEach((line, index) => {
			if(index != 0) {
				halfRoot = [new DomPaint(), 0]
			}
			new LineRenderer().renderLine(line, sections, context, lastLine, halfRoot[0], halfRoot[1])
			lastLine = line
		})
		if(article.lines.length == 0) {
			sections.push({
				element: halfRoot[0].getElement(),
				height: halfRoot[1]
			})
		}
	}
	/**
	 * 渲染音乐章节头
	 */
	renderMusicArticleHeader(article: NMNMusicArticle, sections: EquifieldSection[], context: RenderContext): [DomPaint, number] {
		if(!article.title && !article.musicalProps) {
			return [new DomPaint(), 0]
		}
		const root = new DomPaint()
		const msp = new MusicPaint(root)
		const scale = context.render.scale!
		let currY = 0

		const headerFieldWidth = 5
		currY += headerFieldWidth / 2

		let currX = 0
		// 章节标题
		;(() => {
			if(!article.title) {
				return
			}

			const headerToken = new PaintTextToken(
				article.title.text,
				new FontMetric(context.render.font_article!, 2.4),
				scale, {}
			)
			const headerMeasure = headerToken.measureFast(root)
			const headerPadding = 1.1 * scale

			const rectHeight = 4.0
			const rectWidth = Math.max(rectHeight * scale, headerMeasure[0] + headerPadding * 2)

			root.drawRectOutline(currX, currY - rectHeight / 2, currX + rectWidth, currY + rectHeight / 2, 0.15, scale)
			headerToken.draw(root, currX + rectWidth / 2, currY, 'center', 'middle', () => {
				if(context.positionCallback) {
					context.positionCallback(article.title!.lineNumber, 0)
				}
			})
			
			currX += rectWidth

			currX += 2 * scale
		})()
		// 音乐属性
		;(() => {
			if(!article.musicalProps) {
				return
			}
			currX += msp.drawMusicalProps(context, false, currX, currY, article.musicalProps.props, 0.95, scale)
		})()

		currY += headerFieldWidth / 2
		currY += 1

		return [root, currY]
	}
}

export const ArticleRenderer = new ArticleRendererClass()

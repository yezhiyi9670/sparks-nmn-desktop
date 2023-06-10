import { NMNResult } from ".."
import { EquifieldSection } from "../equifield/equifield"
import { I18n, LanguageArray } from "../i18n"
import { addRenderProp, scoreContextDefault } from "../parser/sparse2des/context"
import { getLanguageValue } from "../util/template"
import { FontMetric } from "./FontMetric"
import { DomPaint } from "./backend/DomPaint"

class PaginizerClass {
	paginize(result: NMNResult['result'], fields: EquifieldSection[], lng: LanguageArray): {
		result: EquifieldSection[]
		pages: number
	} {
		const renderProps = addRenderProp(scoreContextDefault, result.renderProps?.props).render
		const scale = renderProps.scale!

		const separatorField = 8
		const separatorWidth = 0.5
		const descendMetric = new FontMetric(renderProps.font_descend!, 2.0)
		const descendTextField = 1.5 * descendMetric.fontSize * descendMetric.fontScale

		const leftText = result.scoreProps.descendText.left?.text ?? ''
		const rightText = result.scoreProps.descendText.right?.text ?? I18n.renderToken(lng, 'page')
		const hasDescend = !!(leftText || rightText)

		const uniformWidth = 1
		const uniformHeight = renderProps.page!
		const innerRatio = (uniformHeight - uniformWidth * 0.08 * 2) / (uniformWidth * 0.98 * (100 / 120))
		const descendExtraMargin = (+hasDescend) * descendTextField * scale * 0.3  // 0.3 是有意为之的调整参数
		const maxHeightEm = innerRatio * 100 - (+hasDescend) * descendTextField * scale * (0.5) - descendExtraMargin

		function isConsideredEmpty(efLabel?: string) {
			if(efLabel === undefined) {
				return false
			}
			return ['topMargin', 'articleMargin', 'musicLineMargin'].includes(efLabel)
		}

		if(uniformHeight == 0) { // 不启用程序分页
			return {
				result: fields,
				pages: NaN
			}
		}

		// 初步分页
		const pageFields: EquifieldSection[][] = []
		let frontier: EquifieldSection[] = []
		let currHeight = Infinity
		let isFirst = true
		for(let field of [...fields, null]) {
			if(field === null || field.height + currHeight > maxHeightEm) {
				// 开启新的页面
				pageFields.push(frontier = [])
				currHeight = 0
				isFirst = true
			}
			if(field === null) {
				break
			}
			currHeight += field.height
			if(!isFirst || !isConsideredEmpty(field.label)) {
				frontier.push(field)
				isFirst = false
			}
		}

		// 删除每页末尾空白
		for(let page of pageFields) {
			while(page.length > 0) {
				const lastField = page[page.length - 1]
				if(isConsideredEmpty(lastField.label)) {
					page.splice(page.length - 1, 1)
				} else {
					break
				}
			}
		}

		// 删除末尾空白页，太讨厌了！
		while(pageFields.length > 0) {
			const lastPage = pageFields[pageFields.length - 1]
			if(lastPage.length == 0) {
				pageFields.splice(pageFields.length - 1, 1)
			} else {
				break
			}
		}

		// 渲染页面并添加空白和页脚
		const newFields: EquifieldSection[] = []
		const pages = pageFields.length
		for(let page = 0; page < pages; page++) {
			const pageNumber = page + 1
			const isLastPage = pageNumber == pages
			let originalHeight = 0
			let emptyCount = 0
			let doneHeight = 0

			// 统计总高度
			for(let field of pageFields[page]) {
				originalHeight += field.height
				if(isConsideredEmpty(field.label)) {
					emptyCount += 1
				}
			}
			let lackHeight = maxHeightEm - originalHeight

			// 推入内容
			for(let field of pageFields[page]) {
				let height = field.height
				if(!isLastPage && isConsideredEmpty(field.label)) {  // 最后一页不使用空白分布，不然...
					height += lackHeight / (emptyCount + (+hasDescend) * 0.5)  // 最后一项是调节参数
				}
				newFields.push({
					...field,
					height: height,
					breakAfter: 'avoid'
				})
				doneHeight += height
			}

			// 创建页面底部边距
			newFields.push({
				element: new DomPaint().getElement(),
				height: maxHeightEm - doneHeight + descendExtraMargin,
				breakAfter: hasDescend ? 'avoid' : 'always',
				...I18n.efLabel(lng, 'pageBottomMargin')
			})
			// 创建页脚
			if(hasDescend) {
				const descendPaint = new DomPaint()
				descendPaint.drawTextFast(
					0, descendTextField / 2,
					getLanguageValue(leftText, pageNumber.toString(), pages.toString()), descendMetric, scale,
					'left', 'middle'
				)
				descendPaint.drawTextFast(
					100, descendTextField / 2,
					getLanguageValue(rightText, pageNumber.toString(), pages.toString()), descendMetric, scale,
					'right', 'middle'
				)
				newFields.push({
					element: descendPaint.getElement(),
					height: descendTextField * scale,
					breakAfter: 'always',
					...I18n.efLabel(lng, 'pageDescend', pageNumber.toString())
				})
			}
			// 创建页面分割线
			const separatorPaint = new DomPaint()
			separatorPaint.drawLine(-5, separatorField / 2, 105, separatorField / 2, separatorWidth, 0, scale, {opacity: 0.125})
			/* TODO[yezhiyi9670]: Make this less breaking */
			separatorPaint.htmlContent += `<style>
				@media print { @page { margin-bottom: 0 !important; } } 
			</style>`
			newFields.push({
				element: separatorPaint.getElement(),
				height: separatorField * scale,
				...I18n.efLabel(lng, 'pageSeparator')
			})
		}

		return {
			result: newFields,
			pages: pages
		}
	}
}

export const Paginizer = new PaginizerClass()

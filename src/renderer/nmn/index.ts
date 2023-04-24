import nmnExamples from "./examples/examples"
import { ColumnScore, LinedArticle } from "./parser/des2cols/types"
import { LinedIssue, Parser, SectionPositions } from "./parser/parser"
import { getLanguageValue } from './util/template'
import { I18n, LanguageArray } from './i18n'
import { commandDefs } from "./parser/commands"
import { EquifieldSection, Renderer, RenderPositionCallback } from "./renderer/renderer"
import { FontLoader } from "./renderer/FontLoader"
import { FontLoaderProxy } from "./renderer/FontLoaderProxy"

/**
 * 渲染错误
 */
class RenderError extends Error {}
/**
 * 渲染器缺失导致的错误。请检查构造 SparksNMN 对象时是否提供了 window 对象。
 *
 * 在没有 DOM 的服务器环境下，可以使用 Virtual DOM 提供虚拟的 window。
 */
class NoRendererError extends RenderError {}

class SparksNMNClass {
	/**
	 * 创建 SparksNMN 解析器
	 */
	constructor() {}

	/**
	 * 解析 SparksNMN 文本文档
	 */
	parse(doc: string): NMNResult {
		return Parser.parse(doc)
	}

	/**
	 * 将解析结果渲染为 DOM
	 *
	 * 结果采用“精确渲染”型的格式。为了保证不同设备宽度（以及打印）下结果的一致性（像图片那样），应当使用 Equifield 模块进行展示。
	 * 
	 * 结果假设纸张的宽度是 120em，双侧页边距均为 10em。
	 * 
	 * positionCallback 用于定义点击可定位元素后的行为。
	 * 
	 * 声部小节的高亮背景可以认为（在同一份渲染结果中）有唯一的 ID，形如 `SparksNMN-sechl SparksNMN-sechl-uuidofmusicsection`。通过操作其 `display` 属性实现显示和隐藏。
	 * 
	 * @return `{element: HTMLElement, height: number, noBreakAfter?: boolean}[]` element 为 DOM 元素，height 为以 em 为单位的高度。单个元素不应当在打印时截断，除非太长
	 */
	render(result: NMNResult['result'], lng: LanguageArray, positionCallback?: RenderPositionCallback): EquifieldSection[] {
		if(!window || !('document' in window)) {
			throw new NoRendererError('Sparks NMN renderer cannot work without a DOM window.')
		}
		return Renderer.render(result, lng, positionCallback)
	}

	/**
	 * 已知源代码当前行、光标的当前行号以及列号和解析结果，确定需要高亮的声部 uuid 以及声部内的小节序号
	 * 
	 * 无法找到相关小节时，给出 undefined。
	 */
	getHighlightedSection(table: SectionPositions, code: string, position: [number, number]): string | undefined {
		return Parser.getHighlightedSection(table, code, position)
	}

	/**
	 * 针对折行情况转换位置坐标
	 */
	convertPosition(code: string, row: number, col: number) {
		const lines = code.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
		row -= 1
		while(row < lines.length) {
			const currentLine = lines[row]
			if(currentLine[currentLine.length - 1] == "\\") {
				if(col >= currentLine.length - 1) {
					row += 1
					col -= currentLine.length - 1
				} else {
					break
				}
			} else {
				break
			}
		}
		row += 1
		return { row, col }
	}
	/**
	 * 反向转换代码位置坐标
	 */
	unconvertCursor(code: string, position_: [number, number]) {
		const position = position_.slice() as [number, number]
		const lines = code.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
		let codeLine = lines[position[0] - 1]
		while(position[0] > 1) {
			const rowPtr = position[0] - 1
			const prevLine = lines[rowPtr - 1]
			if(prevLine[prevLine.length - 1] == "\\") {
				codeLine = prevLine.substring(0, prevLine.length - 1) + codeLine
				position[0] -= 1
				position[1] += prevLine.length - 1
			} else {
				break
			}
		}
		return {
			code: codeLine,
			position: position
		}
	}

	fontLoader = FontLoaderProxy
}

export const SparksNMN = new SparksNMNClass()

class SparksNMNLanguageClass {
	commandDefs = commandDefs
}

export const SparksNMNLanguage = new SparksNMNLanguageClass()

export type NMNResult = {
	issues: LinedIssue[],
	result: ColumnScore<LinedArticle>,
	sectionPositions: SectionPositions
}
export type NMNIssue = LinedIssue
export const NMNI18n = I18n
export type NMNLanguageArray = LanguageArray

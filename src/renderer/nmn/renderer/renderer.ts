import { NMNResult } from "..";
import { LanguageArray } from "../i18n";
import { addMusicProp, addRenderProp, ScoreContext, scoreContextDefault } from "../parser/sparse2des/context";
import { DomPaint } from "./backend/DomPaint";
import { HeaderRenderer } from "./header/HeaderRenderer";
import $ from 'jquery'
import { ArticleRenderer } from "./article/ArticleRenderer";
import { EquifieldSection } from "../equifield/equifield";
import { MusicSection, NoteCharMusic } from "../parser/sparse2des/types";

export type RenderContext = ScoreContext & {
	language: LanguageArray
	positionCallback: RenderPositionCallback | undefined
	sectionPickCallback: RenderSectionPickCallback | undefined
	articleOrdinal: number
}
export type RenderPositionCallback = (lineNumber: number, charPos: number) => void
export type RenderSectionPickCallback = (articleOrdinal: number, section: MusicSection<NoteCharMusic>) => void

class RendererClass {
	render(
		score: NMNResult['result'],
		lng: LanguageArray,
		positionCallback: RenderPositionCallback | undefined,
		sectionPickCallback: RenderSectionPickCallback | undefined
	): EquifieldSection[] {
		let sections: EquifieldSection[] = []
		const context: RenderContext = {
			language: lng,
			positionCallback: positionCallback,
			sectionPickCallback: sectionPickCallback,
			...addMusicProp(addRenderProp(
				scoreContextDefault, score.renderProps?.props
			), score.musicalProps?.props),
			articleOrdinal: NaN
		}

		// ==== 头部信息 ====
		HeaderRenderer.renderTop(score, sections, context)
		HeaderRenderer.renderPropsAndAuthors(score, sections, context)
		HeaderRenderer.renderTopSpacer(score, sections, context)
		// ==== 章节 ====
		let context1 = context
		score.articles.forEach((article, articleOrdinal) => {
			let contextPre = addRenderProp(context1, article.renderProps?.props)
			if(article.type == 'music') {
				contextPre = addMusicProp(contextPre, article.musicalProps?.props)
			}
			const context = {
				...context1,
				...contextPre,
				articleOrdinal: articleOrdinal,
			}
			ArticleRenderer.renderArticle(article, sections, context)
		})
		// ==== 脚注 ====
		HeaderRenderer.renderFooter(score, sections, context)

		// ==== 移除末尾空白 ====
		while(sections.length > 0 && sections[sections.length - 1].isMargin) {
			sections.pop()
		}

		return sections
	}
}

export const Renderer = new RendererClass()

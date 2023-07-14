import { ColumnScore, Linked2Article } from "../des2cols/types";
import { LinedIssue } from "../parser";
import { addMusicProp, addRenderProp, scoreContextDefault } from "../sparse2des/context";
import { ArticleSequenceReader } from "./ArticleSequenceReader";
import { SequencedScoreData } from "./types";

export class SequenceReader {
	score: ColumnScore<Linked2Article>
	issues: LinedIssue[]

	constructor(score: ColumnScore<Linked2Article>, issues: LinedIssue[]) {
		this.score = score
		this.issues = issues
	}

	parse(): SequencedScoreData {
		const defaultContext = addRenderProp(
			addMusicProp(scoreContextDefault, this.score.musicalProps?.props),
			this.score.renderProps?.props
		)
		
		const sequences = this.score.articles.map(article => {
			if(article.type != 'music') {
				return undefined
			}

			const context = addRenderProp(
				addMusicProp(defaultContext, article.musicalProps?.props),
				article.renderProps?.props
			)

			const normal = new ArticleSequenceReader(article, context, this.issues, false).parse()
			const flat = new ArticleSequenceReader(article, context, this.issues, true).parse()

			normal.iterations = [...flat.iterations, ...normal.iterations]

			return normal
		})

		return {
			score: this.score,
			sequence: sequences
		}
	}
}

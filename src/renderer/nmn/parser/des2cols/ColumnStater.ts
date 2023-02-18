import { expandArray, fillArray, findWithKey, iterateMap, paintArray } from "../../util/array";
import { Frac, Fraction } from "../../util/frac";
import { randomToken } from "../../util/random";
import { LinedIssue } from "../parser";
import { addMusicProp, addRenderProp, ScoreContext, scoreContextDefault } from "../sparse2des/context";
import { AttrWeight, DestructedArticle, DestructedFCA, DestructedLine, DestructedScore, LyricChar, MusicProps, MusicSection, NoteCharMusic } from "../sparse2des/types";
import { SectionStat } from "./section/SectionStat";
import { ColumnScore, Jumper, LinedArticle, LinedLine, LinedLyricLine, LinedPart, Linked1LyricLine, Linked2Article, Linked2LyricChar, Linked2LyricLine, Linked2LyricSection, LinkedArticle, LinkedPart, LyricLineSignature, lyricLineSignature, partSignature, PartSignature } from "./types";

type ArticleBase = {
	type: 'music'
	musicalProps?: DestructedLine & {type: 'props'}
	renderProps?: DestructedLine & {type: 'renderProps'}
} | {
	type: 'text'
}

export class ColumnStater {
	input: DestructedScore

	constructor(input: DestructedScore) {
		this.input = input
	}

	parse(issues: LinedIssue[]): ColumnScore<LinedArticle> {
		const linked = this.applyArticle(this.flattenArticle, this.input, issues)
		this.applyArticle(this.allocateLocation, linked, issues)
		this.applyArticle(this.interLink1, linked, issues)
		const linked2 = this.applyArticle(this.flatten2Article, linked, issues)
		const lined = this.applyArticle(this.linifyArticle, linked2, issues)
		return lined
	}

	applyArticle<I extends ArticleBase, O>(func: (article: I, context: ScoreContext, issues: LinedIssue[]) => O, input: ColumnScore<I>, issues: LinedIssue[]): ColumnScore<O> {
		const oldContext: ScoreContext = addMusicProp(addRenderProp(
			scoreContextDefault, input.renderProps?.props
		), input.musicalProps?.props)
		return Object.assign({}, this.input, {
			articles: input.articles.map((article) => {
				return func(article, addMusicProp(
					addRenderProp(oldContext, article.type == 'music' ? article.renderProps?.props : undefined),
					article.type == 'music' ? article.musicalProps?.props : undefined
				), issues)
			})
		})
	}

	flattenArticle = (article: DestructedArticle, context: ScoreContext, issues: LinedIssue[]): LinkedArticle => {
		const nMap: number[] = []
		const breakMap: boolean[] = []
		if(article.type == 'text') {
			return {
				lineNumber: article.lineNumber,
				type: 'text',
				renderProps: article.renderProps,
				text: article.text
			}
		}
		const jumpers: Jumper[] = []
		// 第一轮合并
		let partSignatures: PartSignature[] = []
		const parts1: {[_: string]: LinkedPart} = {}
		let sectionIndex = 0
		article.fragments.forEach((fragment) => {
			let maxSectionCount = 0
			const fragContext = addRenderProp(context, fragment.renderProps?.props)
			fragment.parts.forEach((part) => {
				maxSectionCount = Math.max(maxSectionCount, part.notes.sections.length)
			})
			fragment.parts.forEach((part, index) => {
				const sig = partSignature(part.notes.tags, index)
				if(!findWithKey(partSignatures, 'hash', sig.hash)) {
					partSignatures.push(sig)
					parts1[sig.hash] = {
						lineNumber: part.lineNumber,
						signature: sig,
						notes: {
							lineNumber: -1,
							type: 'notes',
							head: 'N',
							tags: part.notes.tags,
							sections: [],
						},
						lyricLines: [],
						force: {
							lineNumber: -1,
							type: 'annotationsForce',
							head: 'F',
							sections: []
						},
						chord: {
							lineNumber: -1,
							type: 'annotationsChord',
							head: 'C',
							sections: []
						},
						annotations: [],
						indexMap: [],
						decorations: []
					}
				}
				const frontier = parts1[sig.hash]
				// 合并小节
				SectionStat.paint(frontier.notes.sections, part.notes.sections, sectionIndex, maxSectionCount)
				this.mergeFCA(frontier, part, sectionIndex, maxSectionCount)
				// 歌词行暂时性合并操作
				part.lyricLines.forEach((lrcLine, index) => {
					const newLrcLine = Object.assign({}, lrcLine, {
						offset: sectionIndex,
						index: index
					})
					frontier.lyricLines.push(newLrcLine)
					// 替换位置换算
					newLrcLine.notesSubstitute.forEach((Ns) => {
						Ns.substituteLocation += sectionIndex - 1
					})
				})
				// 合并 indexMap
				fillArray(frontier.indexMap, sectionIndex, maxSectionCount, index, -1)
			})
			if(fragment.jumper) {
				jumpers.push({
					startSection: sectionIndex,
					endSection: sectionIndex + maxSectionCount,
					openRange: fragment.jumper.openRange,
					attrs: fragment.jumper.attrs
				})
			}
			fillArray(nMap, sectionIndex, maxSectionCount, fragContext.render.n!, -1)
			if(fragment.break !== undefined) {
				fillArray(breakMap, sectionIndex, 1, true, false)
			}
			sectionIndex += maxSectionCount
		})
		// 填充
		iterateMap(parts1, (data, index) => {
			expandArray(data.notes.sections, sectionIndex, SectionStat.nullish)
			this.refineFCA(data, sectionIndex)
			let val0 = -1
			for(let i = data.indexMap.length - 1; i >= 0; i--) {
				if(data.indexMap[i] == -1) {
					data.indexMap[i] = val0
				} else {
					val0 = data.indexMap[i]
				}
			}
		})
		expandArray(breakMap, sectionIndex, false)
		const parts: LinkedPart[] = []
		iterateMap(parts1, (data) => parts.push(data))
		return {
			lineNumber: article.lineNumber,
			type: 'music',
			sectionCount: sectionIndex,
			title: article.title,
			musicalProps: article.musicalProps,
			renderProps: article.renderProps,
			partSignatures: partSignatures,
			jumpers: jumpers,
			columns: [],
			parts: parts,
			nMap: nMap,
			breakMap: breakMap,
			sectionFields: []
		}
	}
	mergeFCA(frontier: DestructedFCA, data: DestructedFCA, offset: number, length: number) {
		SectionStat.paint(frontier.force!.sections, data.force?.sections, offset, length)
		SectionStat.paint(frontier.chord!.sections, data.chord?.sections, offset, length)
		// 辅助符号
		data.annotations.forEach((ann) => {
			expandArray(frontier.annotations, ann.index + 1, {
				lineNumber: -1,
				type: 'annotationsText',
				head: 'A',
				index: -1,
				sections: []
			})
			const curr = frontier.annotations[ann.index]
			curr.index = ann.index
			SectionStat.paint(curr.sections, ann.sections, offset, length)
		})
	}
	refineFCA(frontier: DestructedFCA, totalLength: number) {
		expandArray(frontier.chord!.sections, totalLength, SectionStat.nullish)
		expandArray(frontier.force!.sections, totalLength, SectionStat.nullish)
		frontier.annotations.forEach((ann) => {
			expandArray(ann.sections, totalLength, SectionStat.nullish)
		})
	}

	allocateLocation = (article: LinkedArticle, context: ScoreContext, issues: LinedIssue[]) => {
		if(article.type == 'text') {
			return
		}
		let currOrdinal = 0
		let currQuarter = Frac.create(0)
		for(let i = 0; i < article.sectionCount; i++) {
			let ordinalCount = Math.max(...article.parts.map((part) => {
				return SectionStat.ordinalCount(part.notes.sections[i])
			}))
			let quarterCount = Frac.max(...article.parts.map((part) => {
				return SectionStat.quarterCount(part.notes.sections[i])
			}))

			article.parts.forEach((part) => {
				part.notes.sections[i].ordinal = currOrdinal
				part.notes.sections[i].startPos = Frac.copy(currQuarter)
				this.allocateFCA(part, i, currOrdinal, currQuarter)
			})

			article.sectionFields.push([currQuarter, quarterCount])

			currOrdinal += ordinalCount
			currQuarter = Frac.add(currQuarter, quarterCount)
		}
	}
	allocateFCA(part: LinkedPart, index: number, currOrdinal: number, currQuarter: Fraction) {
		part.force!.sections[index].ordinal = currOrdinal
		part.force!.sections[index].startPos = currQuarter
		part.chord!.sections[index].ordinal = currOrdinal
		part.chord!.sections[index].startPos = currQuarter
		part.annotations.map((ann) => {
			ann.sections[index].ordinal = currOrdinal
			ann.sections[index].startPos = currQuarter
		})
	}

	interLink1 = (article: LinkedArticle, context: ScoreContext, issues: LinedIssue[]) => {
		if(article.type == 'text') {
			return
		}
		article.parts.forEach((part) => {
			SectionStat.interLink(part.notes.sections, part.decorations)
			SectionStat.interLink(part.chord!.sections, [])
			SectionStat.interLink(part.force!.sections, [])
			part.annotations.forEach((ann) => {
				SectionStat.interLink(ann.sections, [])
			})
		})
	}

	flatten2Article = (article: LinkedArticle, context: ScoreContext, issues: LinedIssue[]): Linked2Article => {
		if(article.type == 'text') {
			return article
		}
		const { parts, ...articleMore } = article
		const sectionCount = article.sectionCount
		return {
			parts: parts.map((part) => {
				const { lyricLines, ...partMore } = part
				const lyricLineSignatures: LyricLineSignature[] = []
				const lyricLines1: {[_: string]: Linked2LyricLine} = {}
				const lyricSectionNullish = {
					ordinal: 0, startPos: Frac.create(0),
					type: 'nullish'
				}
				// 第一轮合并
				part.lyricLines.map((lyricLine) => {
					const sig = lyricLineSignature(lyricLine.lyric.tags, lyricLine.index)
					if(!findWithKey(lyricLineSignatures, 'hash', sig.hash)) {
						lyricLineSignatures.push(sig)
						lyricLines1[sig.hash] = {
							lineNumber: -1,
							sections: [],
							notesSubstitute: [],
							force: {
								lineNumber: -1,
								type: 'annotationsForce',
								head: 'F',
								sections: []
							},
							chord: {
								lineNumber: -1,
								type: 'annotationsChord',
								head: 'C',
								sections: []
							},
							attrsMap: [],
							annotations: [],
							indexMap: [],
							signature: sig
						}
					}
					const frontier = lyricLines1[sig.hash]
					// 歌词小节化并合并
					const lrcSections = this.sectionifyLyrics(lyricLine, part.notes.sections, context, issues)
					paintArray(frontier.sections, lrcSections, lyricLine.offset, -1, lyricSectionNullish)
					// 合并小节
					this.mergeFCA(frontier, lyricLine, lyricLine.offset, -1)
					// 合并 indexMap
					fillArray(frontier.indexMap, lyricLine.offset, sectionCount - lyricLine.offset, lyricLine.index, -1)
					// 合并 attrsMap
					fillArray(frontier.attrsMap, lyricLine.offset, sectionCount - lyricLine.offset, lyricLine.lyric.tags, [])
					// 合并替代段落
					lyricLine.notesSubstitute.forEach((Ns) => {
						Ns.sections.forEach((section, index) => {
							const myIndex = index + Ns.substituteLocation
							const mySection = part.notes.sections[myIndex]
							if(mySection) {
								section.startPos = mySection.startPos
							}
						})
						SectionStat.interLink(Ns.sections, Ns.decorations)
						frontier.notesSubstitute.push(Ns)
					})
				})
				// 填充
				iterateMap(lyricLines1, (lyricLine) => {
					expandArray(lyricLine.sections, sectionCount, lyricSectionNullish)
					this.refineFCA(lyricLine, sectionCount)
					let val0 = -1
					for(let i = lyricLine.indexMap.length - 1; i >= 0; i--) {
						if(lyricLine.indexMap[i] == -1) {
							lyricLine.indexMap[i] = val0
						} else {
							val0 = lyricLine.indexMap[i]
						}
					}
				})
				// 返回结果
				return {
					lyricLines: iterateMap(lyricLines1, (val) => val),
					lyricLineSignatures: [],
					...partMore
				}
			}),
			...articleMore
		}
	}
	sectionifyLyrics(lyricLine: Linked1LyricLine, reference: MusicSection<NoteCharMusic>[], context: ScoreContext, issues: LinedIssue[]): Linked2LyricSection[] {
		let ret: Linked2LyricSection[] = []
		const chars = lyricLine.lyric.chars
		let tokenPtr = 0
		for(let secPtr = lyricLine.offset; secPtr < reference.length; secPtr++) {
			if(tokenPtr >= chars.length) {
				break
			}
			let matchedChars: Linked2LyricChar[] = []
			const section0 = reference[secPtr]
			let section = section0
			lyricLine.notesSubstitute.forEach((Ns) => {
				if(Ns.substituteLocation <= secPtr && Ns.substituteLocation + Ns.sections.length > secPtr) {
					section = Ns.sections[secPtr - Ns.substituteLocation]
				}
			})
			if(section.type != 'section') {
				ret.push({
					ordinal: section0.ordinal,
					startPos: section0.startPos,
					type: 'nullish'
				})
				continue
			}
			for(let note of section.notes) {
				if(note.type != 'note' || note.voided || note.char.char == '0') {
					continue
				}
				if(tokenPtr >= chars.length) {
					break
				}
				let readMine = false
				while(true) {
					const myChar = chars[tokenPtr++]
					if(myChar === undefined) {
						break
					}
					if(myChar.occupiesSpace && readMine) {
						tokenPtr--
						break
					}
					matchedChars.push(Object.assign({}, myChar, {
						startPos: Frac.copy(note.startPos),
						length: note.length
					}))
					if(myChar.occupiesSpace) {
						readMine = true
					}
				}
			}
			ret.push({
				ordinal: section0.ordinal,
				startPos: section0.startPos,
				type: 'section',
				chars: matchedChars
			})
		}
		return ret
	}

	linifyArticle = (article: Linked2Article, context: ScoreContext, issues: LinedIssue[]): LinedArticle => {
		let lines: LinedLine[] = []
		if(article.type == 'text') {
			return article
		}
		let sectionPtr = 0
		while(sectionPtr < article.sectionCount) {
			const sectionCountShould = article.nMap[sectionPtr]
			let sectionCount = Math.min(article.sectionCount - sectionPtr, sectionCountShould)
			for(let i = sectionPtr + 1; i < sectionPtr + sectionCount; i++) {
				if(i < article.sectionCount && article.breakMap[i]) {
					sectionCount = i - sectionPtr
					break
				}
			}
			const secIndices: number[] = []
			for(let i = sectionPtr; i < sectionPtr + sectionCount; i++) {
				secIndices.push(i)
			}
			const field = [
				article.sectionFields[sectionPtr][0],
				Frac.sum(...secIndices.map((idx) => {
					return article.sectionFields[idx][1]
				}))
			] as [Fraction, Fraction]
			article.jumpers = SectionStat.connectJumpers(article.jumpers)
			// 确定需要的声部
			const sigs: PartSignature[] = []
			const parts: LinedPart[] = []
			const sectionWeights: number[] = Array(sectionCount).fill(0)
			article.parts.forEach((part) => {
				if(SectionStat.allNullish(part.notes.sections, sectionPtr, sectionCount)) {
					// 此渲染行可以不包含这一声部。正常而言，空白区下方不会有非空的歌词行。
					return
				}
				sigs.push(part.signature)

				const mappedNotes = SectionStat.subLine(part.notes, sectionPtr, sectionCount)
				const sectionsIn = mappedNotes.sections

				const lrcSigs: LyricLineSignature[] = []
				const lrcLines: LinedLyricLine[] = []
				part.lyricLines.forEach((lrcLine) => {
					const mappedNs = lrcLine.notesSubstitute.filter((Ns) => {
						return SectionStat.sectionRangeOverlaps([sectionPtr, sectionCount], [
							Ns.substituteLocation,
							Ns.sections.length
						])
					}).map((Ns) => {
						return {
							...Ns,
							substituteLocation: Ns.substituteLocation - sectionPtr
						}
					}).map((Ns) => {
						// Clipping
						if(Ns.substituteLocation < 0) {
							Ns.sections = Ns.sections.slice(-Ns.substituteLocation)
							Ns.substituteLocation = 0
						}
						const leftLength = sectionCount - Ns.substituteLocation
						if(Ns.sections.length > leftLength) {
							Ns.sections = Ns.sections.slice(0, leftLength)
						}
						Ns.decorations = Ns.decorations.filter((decor) => {
							return SectionStat.fieldOverlaps(
								field,
								[decor.startPos, decor.endPos]
							)
						})
						return Ns
					})
					if(SectionStat.allNullish(lrcLine.sections, sectionPtr, sectionCount) && mappedNs.length == 0) {
						// 此行声部可以不包含这一歌词行
						return
					}
					lrcSigs.push(lrcLine.signature)
					const { force, chord, annotations, sections, indexMap, attrsMap, notesSubstitute, ...others } = lrcLine
					lrcLines.push({
						sections: sections.slice(sectionPtr, sectionPtr + sectionCount),
						index: indexMap.slice(sectionPtr, sectionPtr + sectionCount),
						attrs: attrsMap[sectionPtr],
						notesSubstitute: mappedNs,
						...this.subFCA({ force, chord, annotations }, sectionPtr, sectionCount, sectionsIn),
						...others
					})
				})
				SectionStat.indexSort(lrcLines)
				// 统计布局权重
				mappedNotes.sections.forEach((section, sectionIndex) => {
					const weightProp = findWithKey(section.separator.before.attrs, 'type', 'weight') as AttrWeight
					if(weightProp) {
						sectionWeights[sectionIndex] = Math.max(sectionWeights[sectionIndex], weightProp.weight)
					}
				})
				parts.push({
					lineNumber: part.lineNumber,
					signature: part.signature,
					decorations: part.decorations.filter((decor) => {
						return SectionStat.fieldOverlaps(field, [
							decor.startPos,
							decor.endPos
						])
					}),
					index: part.indexMap.slice(sectionPtr, sectionPtr + sectionCount),
					notes: mappedNotes,
					lyricLineSignatures: lrcSigs,
					lyricLines: lrcLines,
					...this.subFCA(part, sectionPtr, sectionCount, sectionsIn),
				})
			})
			SectionStat.indexSort(parts)
			sectionWeights.forEach((val, index) => {
				if(val == 0) {
					sectionWeights[index] = 1
				}
			})
			lines.push({
				field: field,
				sectionWeights: sectionWeights,
				startSection: sectionPtr,
				sectionCountShould: sectionCountShould,
				sectionCount: sectionCount,
				partSignatures: sigs,
				parts: parts,
				jumpers: article.jumpers.filter((jumper) => {
					return SectionStat.sectionRangeOverlaps([ sectionPtr, sectionCount ], [
						jumper.startSection,
						jumper.endSection - jumper.startSection
					])
				}),
				sectionFields: article.sectionFields.slice(sectionPtr, sectionPtr + sectionCount),
			})

			sectionPtr += sectionCount
		}
		const { parts, ...other } = article
		return {
			lines: lines,
			...other
		}
	}
	subFCA(part: DestructedFCA, startSection: number, sectionCount: number, overwriteIdSections?: MusicSection<unknown>[]): DestructedFCA {
		return {
			force: SectionStat.subLine(part.force!, startSection, sectionCount, overwriteIdSections),
			chord: SectionStat.subLine(part.chord!, startSection, sectionCount, overwriteIdSections),
			annotations: part.annotations.map((ann) => {
				return SectionStat.subLine(ann, startSection, sectionCount, overwriteIdSections)
			})
		}
	}
}

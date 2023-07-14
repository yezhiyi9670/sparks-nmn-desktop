import { SectionStat } from "../des2cols/section/SectionStat";
import { Linked2LyricLine, Linked2MusicArticle, Linked2Part, LinkedPartBase } from "../des2cols/types";
import { handleMusicShift } from "../sparse2des/context";
import { JumperAttr, MusicProps, MusicSection, NoteCharAny, SectionSeparator, SectionSeparators, SeparatorAttr } from "../sparse2des/types";
import { SequenceData } from "./types";

export module SequenceSectionStat {

	export type AttrPosition = 'before' | 'after' | 'next' | 'nextPrev'

	/**
	 * 检索各声部同位置的小节线属性
	 */
	function mapPartsSeparators<T>(article: Linked2MusicArticle, index: number, mapper: (sep: SectionSeparators) => T) {
		return article.parts.map(part => {
			const section = part.notes.sections[index]
			if(!section || section.type == 'nullish') {
				return undefined
			}
			return mapper(section.separator)
		})
	}
	/**
	 * 获取位置处的小节线属性
	 */
	export function getAttr(sep: SectionSeparators, pos: AttrPosition) {
		if(pos == 'after') {
			return sep.after
		}
		if(pos == 'before') {
			return sep.before
		}
		if(pos == 'nextPrev') {
			return sep.nextPrev
		}
		return sep.next
	}

	/**
	 * 检查跳房子记号属性列是否与当前信息匹配
	 */
	export function jumperAttrMatch(attrs: (JumperAttr | SeparatorAttr)[], iteration: number) {
		let foundIters = false
		for(let attr of attrs) {
			if(attr.type == 'iter') {
				foundIters = true
				if(attr.iter == iteration) {
					return true
				}
			}
		}
		if(!foundIters) {
			return true
		}
		return false
	}
	/**
	 * 检查小节是否有 reset
	 */
	export function checkReset(article: Linked2MusicArticle, index: number, pos: AttrPosition) {
		return (
			mapPartsSeparators(article, index, sep => {
				return getAttr(sep, pos).attrs.filter(item => item.type == 'reset').length > 0
			}).filter(item => item == true).length > 0
		)
	}
	/**
	 * 获取某小节处非空的第一个声部小节
	 */
	export function getPrimoSection(article: Linked2MusicArticle, sectionIndex: number) {
		let primoSection = article.parts[0].notes.sections[sectionIndex] // 找到编号最小的非 nullish 小节
		let minIndex = Infinity
		for(let part of article.parts) {
			const section = part.notes.sections[sectionIndex]
			if(section.type == 'nullish') {
				break
			}
			let index = part.indexMap[sectionIndex]
			if(index < minIndex) {
				minIndex = index
				primoSection = section
			}
		}
		return primoSection
	}
	/**
	 * 根据音乐属性变更指令重建音乐属性
	 */
	export function recreateMusicalProps(props: MusicProps, attr: SeparatorAttr & {type : 'qpm' | 'shift'}): MusicProps {
		if(attr.type == 'qpm') {
			return {
				...props,
				qpm: attr.qpm
			}
		}
		if(attr.type == 'shift') {
			const newProps = handleMusicShift(props, attr)
			return newProps
		}
		return props
	}
	/**
	 * 判断小节线是否为小节线反复指令记号
	 */
	export function isSeparatorRepeatCommand(article: Linked2MusicArticle, index: number) {
		return mapPartsSeparators(article, index, sep => {
			if([':||', ':/||'].includes(sep.after.char)) {
				return true
			}
		}).filter(item => item == true).length > 0
	}
	/**
	 * 判断小节线是否为终止线
	 */
	export function isSeparatorFinal(article: Linked2MusicArticle, index: number) {
		return mapPartsSeparators(article, index, sep => {
			if(['|||'].includes(sep.after.char)) {
				return true
			}
		}).filter(item => item == true).length > 0
	}
	/**
	 * 判断小节线是否为小节线反复位置记号
	 */
	export function isSeparatorRepeatPos(article: Linked2MusicArticle, index: number) {
		return mapPartsSeparators(article, index, sep => {
			if(['||:'].includes(sep.before.char)) {
				return true
			}
		}).filter(item => item == true).length > 0
	}
	/**
	 * 获取小节处的所有属性
	 */
	export function getMergedAttrs(article: Linked2MusicArticle, index: number, pos: AttrPosition) {
		return mapPartsSeparators(article, index, sep => {
			const attr = getAttr(sep, pos)
			return attr.attrs
		}).filter(item => item !== undefined).reduce((a, b) => {
			return a!.concat(b!)
		}, [])!
	}
	/**
	 * 判断小节线是否为结构反复指令（D.C., D.S., @）
	 */
	export function isStructureRepeatCommand(article: Linked2MusicArticle, index: number) {
		const attrs = getMergedAttrs(article, index, 'after').concat(
			getMergedAttrs(article, index, 'next')
		).filter(item => item.type == 'repeat')
		if(attrs.length == 0) {
			return false
		}
		const attr = attrs[0]
		if(attr.type != 'repeat') {
			return false
		}
		if(attr.char == 'D.S.') {
			return 'D.S.'
		}
		if(attr.char == 'D.C.') {
			return 'D.C.'
		}
		if(attr.char == 'Fine.') {
			return 'Fine.'
		}
		if(attr.char == '@') {
			return '@'
		}
		return false
	}
	/**
	 * 判断小节线是否为结构反复目标
	 */
	export function isStructureRepeatPos(article: Linked2MusicArticle, index: number) {
		const attrs = getMergedAttrs(article, index, 'nextPrev').concat(
			getMergedAttrs(article, index, 'before')
		).filter(item => item.type == 'repeat')
		if(attrs.length == 0) {
			return false
		}
		const attr = attrs[0]
		if(attr.type != 'repeat') {
			return false
		}
		if(attr.char == '$') {
			return '$'
		}
		if(attr.char == '@') {
			return '@'
		}
		return false
	}
	/**
	 * 在前面寻找最近符合条件的小节序号
	 */
	export function findPrevSectionIndex(article: Linked2MusicArticle, index: number, filter: (cursor: number) => boolean) {
		for(let cursor = index; cursor >= 0; cursor--) {
			if(filter(cursor)) {
				return cursor
			}
		}
		return undefined
	}
	/**
	 * 在后面寻找最近符合条件的小节序号
	 */
	export function findNextSectionIndex(article: Linked2MusicArticle, index: number, filter: (cursor: number) => boolean) {
		for(let cursor = index; cursor < article.sectionCount; cursor++) {
			if(filter(cursor)) {
				return cursor
			}
		}
		return undefined
	}

	/**
	 * 寻找某小节的对应歌词行
	 */
	export function pickLrcLine(part: LinkedPartBase<Linked2LyricLine>, index: number, iteration: number) {
		const lrcLines = part.lyricLines.filter(lrcLine => {
			for(let substitute of lrcLine.notesSubstitute) {
				const startSection = substitute.substituteLocation
				const endSection = startSection + substitute.sections.length
				if(startSection <= index && index < endSection) {
					return true
				}
			}
			return SectionStat.isLyricSectionRenderWorthy(lrcLine, index)
		}).sort((a, b) => {
			return a.indexMap[index] - b.indexMap[index]
		})
		let numberedLines: Linked2LyricLine[] = []
		let unnumberedLines: Linked2LyricLine[] = []
		for(let lrcLine of lrcLines) {
			const attrs = lrcLine.attrsMap[index]
			const hasIter = attrs.filter(item => item.type == 'iter').length > 0
			if(hasIter) {
				numberedLines.push(lrcLine)
			} else {
				unnumberedLines.push(lrcLine)
			}
		}
		// 从已标号行中选取
		for(let lrcLine of numberedLines) {
			const attrs = lrcLine.attrsMap[index]
			if(attrs.filter(item => item.type == 'iter' && item.iter == iteration).length > 0) {
				return lrcLine
			}
		}
		// 无法选取
		if(unnumberedLines.length == 0) {
			return undefined
		}
		// 从未标号行中选取
		return unnumberedLines[
			Math.min(unnumberedLines.length - 1, iteration - 1)
		]
	}

	/**
	 * 寻找小节定位信息对应的下标
	 */
	export function locateSection(sequences: SequenceData, articleIndex: number, preferredIter: number, sectionId: string) {
		const sequence = sequences[articleIndex]
		if(!sequence || sequence.iterations.length == 0) {
			return {
				article: articleIndex,
				iteration: -1,
				section: -1
			}
		}
		const iterIndexes: number[] = []
		for(let i = 1; i < sequence.iterations.length; i++) {
			if(i == preferredIter) {
				iterIndexes.push(i)
			}
		}
		for(let i = 1; i < sequence.iterations.length; i++) {
			if(i != preferredIter) {
				iterIndexes.push(i)
			}
		}
		iterIndexes.push(0)
		for(let iterationIndex of iterIndexes) {
			const iteration = sequence.iterations[iterationIndex]
			let sectionIndex = 0
			for(let section of iteration.sections) {
				for(let partId in section.parts) {
					const part = section.parts[partId]
					if(part.section.idCard.uuid == sectionId) {
						return {
							article: articleIndex,
							iteration: iterationIndex,
							section: section.index
						}
					}
				}
				sectionIndex += 1
			}
		}
		return {
			article: articleIndex,
			iteration: -1,
			section: -1
		}
	}
}

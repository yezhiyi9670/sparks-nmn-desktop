import { Frac, Fraction } from "../../util/frac";
import { MusicTheory } from "../../util/music";
import { Jumper, Linked2MusicArticle } from "../des2cols/types";
import { LinedIssue, addIssue } from "../parser";
import { ScoreContext } from "../sparse2des/context";
import { Beats, JumperAttr, MusicProps, MusicSection, NoteCharAny, SeparatorAttr } from "../sparse2des/types";
import { SequenceSectionStat } from "./SequenceSectionStat";
import { SequenceArticle, SequenceIteration, SequencePartInfo, SequenceSection } from "./types";

export class ArticleSequenceReader {
	article: Linked2MusicArticle
	context: ScoreContext
	issues: LinedIssue[]
	flat: boolean

	constructor(article: Linked2MusicArticle, context: ScoreContext, issues: LinedIssue[], flat: boolean) {
		this.article = article
		this.context = context
		this.issues = issues
		this.flat = flat
	}

	/**
	 * 迭代节数量限制
	 */
	iterationLimit: number = 2048

	/**
	 * 小节数指针位置
	 */
	sectionCursor: number = 0
	/**
	 * 当前每个声部的属性信息
	 * 
	 * 某声部出现 nullish 时，若其他声部有信息变更，则以排在最前的声部为准。
	 */
	currentProps: {[partHash: string]: MusicProps} = {}
	/**
	 * 经过小节的次数
	 */
	passingTimes: number[] = []
	/**
	 * 反复指令记号的耐久度信息
	 */
	repeatDamage: number[] = []
	/**
	 * 经过此小节时出现过的迭代数
	 */
	passingIterations: {
		[iteration: number]: 'passed' | 'warned'
	}[] = []
	/**
	 * 跳房子记号统计
	 */
	jumperHeadStat: (Jumper | undefined)[] = []
	/**
	 * 跳房子八度变化统计
	 */
	jumperSectionStat: JumperAttr[][] = []

	/**
	 * 迭代节前沿
	 */
	frontier: SequenceIteration | undefined = undefined

	iterations: SequenceIteration[] = []
	overflow: boolean = false
	conflict: boolean = false

	parse(): SequenceArticle {
		if(this.article.sectionCount == 0) {
			return {
				overflow: false,
				conflict: false,
				iterations: []
			}
		}

		this.initialize()

		while(this.exploreSection()) {}

		return {
			overflow: this.overflow,
			conflict: this.conflict,
			iterations: this.iterations
		}
	}

	/**
	 * 初始化
	 */
	initialize() {
		this.sectionCursor = 0
		this.repeatDamage = Array(this.article.sectionCount).fill(0)
		this.passingTimes = Array(this.article.sectionCount).fill(0)
		this.jumperHeadStat = Array(this.article.sectionCount).fill(undefined)
		this.jumperSectionStat = Array(this.article.sectionCount).fill(0).map(() => [])
		this.passingIterations = Array(this.article.sectionCount).fill(0).map(() => ({}))

		this.statJumpers()

		for(let partSig of this.article.partSignatures) {
			this.currentProps[partSig.hash] = {
				...this.context.musical
			}
		}

		if(!this.expandFrontier(this.flat ? 0 : 1)) {
			throw new Error('ArticleSequenceReader: Failed to create the first iteration. How?')
		}
	}
	/**
	 * 初始化统计跳房子信息
	 */
	statJumpers() {
		for(let jumper of this.article.jumpers) {
			this.jumperHeadStat[jumper.startSection] = jumper
			for(let index = jumper.startSection; index < jumper.endSection; index++) {
				this.jumperSectionStat[index] = jumper.attrs
			}
		}
	}

	/**
	 * 创建新的迭代节
	 * 
	 * 返回值：是否成功
	 */
	expandFrontier(iteration: number) {
		if(this.iterations.length >= this.iterationLimit) {
			const primoSection = SequenceSectionStat.getPrimoSection(this.article, this.sectionCursor)
			addIssue(
				this.issues, primoSection.idCard.lineNumber, primoSection.range[0],
				'error', 'repeat_overflow',
				'Total number of repeat iterations exceeded the limit ${0}. This may be caused by dead loops.',
				'' + this.iterationLimit
			)
			return false
		}
		this.iterations.push(this.frontier = {
			number: iteration,
			sections: []
		})
		return true
	}

	/**
	 * 探索当前小节，并自动更新对应值。如果有必要，将添加新的前沿迭代节
	 * 
	 * 返回值表示能否继续操作，终止条件如下：
	 * - 指针超出乐谱末尾
	 * - 发现不加注 Fine. 的终止线，直接结束
	 * - 发现加注 Fine. 的小节线，如果之后存在被用过的反复指令记号或结构反复标记，则结束
	 * - 为下一小节创建新的前沿时失败（超出最大限制）
	 */
	exploreSection(): boolean {
		if(this.sectionCursor < 0 || this.sectionCursor >= this.article.sectionCount) {
			throw new Error('ArticleSequenceReader/exploreSection: Section cursor is out of range.')
		}

		if(!this.flat) {
			// 跳房子
			if(this.checkJumperHead()) {
				if(this.sectionCursor >= this.article.sectionCount) {
					return false
				} else {
					return true
				}
			}
			// Portal 跳转
			if(this.checkPortalHead()) {
				if(this.sectionCursor >= this.article.sectionCount) {
					return false
				} else {
					return true
				}
			}

			// 之前的事情：检查 reset、检查音乐属性变更
			if(!this.checkReset('before')) {
				return false
			}
		}
		
		this.checkMusicalVariation('nextPrev')
		this.checkMusicalVariation('before')
		// 检测冲突、检查跳房子八度变更、小节推入信息
		this.checkConflict()
		this.pushCurrentSection()
		this.checkPropsMatch()
		// 之后的事情：检查音乐属性变更、检查 reset、检查反复记号并跳转、若未跳转检查结束
		this.checkMusicalVariation('after')
		if(!this.flat) {
			if(!this.checkReset('after')) {
				return false
			}
			if(!this.checkRepeatJump()) {
				return false
			}
		} else {
			this.sectionCursor += 1
			if(this.sectionCursor >= this.article.sectionCount) {
				return false
			}
		}

		return true
	}
	/**
	 * 检测跳房子的开头，如果不符合进入条件则跳过
	 * 
	 * 返回值表示是否跳过
	 */
	checkJumperHead() {
		const jumper = this.jumperHeadStat[this.sectionCursor]
		if(jumper && !SequenceSectionStat.jumperAttrMatch(jumper.attrs, this.frontier!.number)) {
			this.sectionCursor = jumper.endSection
			return true
		}
		return false
	}
	/**
	 * 检测结构反复 Portal 记号，如果符合跳过条件（之后存在用过的反复记号）则跳过
	 * 
	 * 返回值表示是否跳过
	 */
	checkPortalHead() {
		if(
			SequenceSectionStat.isStructureRepeatPos(this.article, this.sectionCursor).includes('@') &&
			this.hasUsedRepeatsAfter(this.sectionCursor)
		) {
			const jumpTo = SequenceSectionStat.findNextSectionIndex(this.article, this.sectionCursor, cursor => {
				return SequenceSectionStat.isStructureRepeatCommand(this.article, cursor).includes('@')
			})
			if(jumpTo === undefined) {
				return false
			}
			this.sectionCursor = jumpTo + 1
			return true
		}
		return false
	}
	/**
	 * 检测之后是否有用过的反复记号
	 */
	hasUsedRepeatsAfter(cursor: number) {
		return SequenceSectionStat.findNextSectionIndex(this.article, cursor, cursor => {
			return this.repeatDamage[cursor] > 0
		}) !== undefined
	}
	/**
	 * 检测小节的 reset，如果存在则启动新的迭代节
	 * 
	 * 返回是否成功的检查
	 */
	checkReset(pos: SequenceSectionStat.AttrPosition) {
		if(this.frontier!.number > 1 && SequenceSectionStat.checkReset(this.article, this.sectionCursor, pos)) {
			if(!this.frontier || this.frontier.sections.length > 0) {
				return this.expandFrontier(1)
			} else {
				this.frontier.number = 1
			}
		}
		return true
	}
	/**
	 * 检测小节线属性，进行音乐属性变更
	 *
	 * 这里不处理变拍，因为处理过了
	 */
	checkMusicalVariation(pos: SequenceSectionStat.AttrPosition) {
		if(pos == 'before') { // 更新拍号，这里没有考虑替代旋律，因为不需要考虑
			for(let part of this.article.parts) {
				const section = part.notes.sections[this.sectionCursor]
				if(section.type == 'nullish') {
					continue
				}
				this.currentProps[part.signature.hash] = {
					...this.currentProps[part.signature.hash],
					beats: section.musicalProps.beats
				}
			}
		}
		this.checkOneVariation(pos, 'qpm')
		this.checkOneVariation(pos, 'shift')
	}
	/**
	 * 速度变更
	 */
	checkOneVariation(pos: SequenceSectionStat.AttrPosition, type: 'qpm' | 'shift') {
		const primoSection = SequenceSectionStat.getPrimoSection(this.article, this.sectionCursor)

		for(let part of this.article.parts) {
			const section = part.notes.sections[this.sectionCursor]
			
			const applyingSeq: SeparatorAttr[] = (() => {
				if(section.type != 'nullish') {
					return SequenceSectionStat.getAttr(section.separator, pos).attrs
				}
				for(let part of this.article.parts) {
					const section = part.notes.sections[this.sectionCursor]
					const attrs = SequenceSectionStat.getAttr(section.separator, pos).attrs
					if(attrs.length > 0) {
						return attrs
					}
				}
				return []
			})()
			
			for(let attr of applyingSeq) {
				if(attr.type == type) {
					// 重建修改后的音乐属性
					this.currentProps[part.signature.hash] = SequenceSectionStat.recreateMusicalProps(
						this.currentProps[part.signature.hash],
						attr
					)
				}
			}
		}
	}
	/**
	 * 标记当前小节并检测冲突
	 */
	checkConflict() {
		const primoSection = SequenceSectionStat.getPrimoSection(this.article, this.sectionCursor)
		const iter = this.frontier!.number
		const passingMap = this.passingIterations[this.sectionCursor]

		if(passingMap[iter]) {
			if(passingMap[iter] == 'passed') {
				passingMap[iter] = 'warned'
				addIssue(
					this.issues, primoSection.idCard.lineNumber, primoSection.range[0],
					'warning', 'repeat_conflict',
					'Section ${0} is passed twice by iteration number ${1}',
					'' + (primoSection.ordinal + 1), '' + iter
				)
				for(let part of this.article.parts) {
					part.notes.sections[this.sectionCursor].structureValidation = 'conflict'
				}
				this.conflict = true
			}
		} else {
			passingMap[iter] = 'passed'
		}
	}
	/**
	 * 推入当前小节
	 */
	pushCurrentSection() {
		let passingTimes = this.passingTimes[this.sectionCursor] += 1
		let octaveShift = 0
		if(this.jumperSectionStat[this.sectionCursor]) {
			for(let attr of this.jumperSectionStat[this.sectionCursor]) {
				if(attr.type == 'octave') {
					octaveShift += attr.sign
				}
			}
		}
		const quarters = this.article.sectionFields[this.sectionCursor][1]
		let minSpeed = Infinity
		const partsInfo: SequencePartInfo[] = this.article.parts.map(part => {
			let mProps = this.currentProps[part.signature.hash]
			if(octaveShift != 0) {
				mProps = {
					...mProps,
					base: {
						...mProps.base!,
						value: (isNaN(mProps.base!.value) ? 0 : mProps.base!.value) + octaveShift * 12,
						baseValue: (isNaN(mProps.base!.baseValue) ? 0 : mProps.base!.baseValue) + octaveShift * 12
					}
				}
			}
			let section = part.notes.sections[this.sectionCursor]
			if(section.type != 'nullish') {
				minSpeed = Math.min(minSpeed, MusicTheory.speedToQpm(
					mProps.qpm!.value, mProps.qpm!.symbol, mProps.beats!.defaultReduction
				))
			}
			if(!this.flat) { // 替代旋律
				const lrcLine = SequenceSectionStat.pickLrcLine(part, this.sectionCursor, passingTimes)
				if(lrcLine) {
					for(let substitute of lrcLine.notesSubstitute) {
						const startIndex = substitute.substituteLocation
						const endIndex = substitute.substituteLocation + substitute.sections.length
						if(startIndex <= this.sectionCursor && this.sectionCursor < endIndex) {
							section = substitute.sections[this.sectionCursor - startIndex]
							break
						}
					}
				}
			}
			return {
				signature: part.signature,
				section: section,
				props: mProps
			}
		})
		const minutes = Frac.toFloat(quarters) / minSpeed

		const partsMap: {[hash: string]: SequencePartInfo} = {}
		for(let partInfo of partsInfo) {
			partsMap[partInfo.signature.hash] = partInfo
		}

		const primoSection = SequenceSectionStat.getPrimoSection(this.article, this.sectionCursor)

		this.frontier!.sections.push({
			parts: partsMap,
			ordinal: this.article.parts[0].notes.sections[this.sectionCursor].ordinal,
			index: this.sectionCursor,
			qpm: minSpeed,
			beats: primoSection.musicalProps.beats!,
			lengthQuarters: quarters,
		})
	}
	/**
	 * 检查声部间音乐属性的匹配
	 */
	checkPropsMatch() {
		const section = this.frontier!.sections[this.frontier!.sections.length - 1]
		if(!section) {
			return	
		}
		let rememberedBeats: Beats | undefined = undefined
		for(let partId in section.parts) {
			const part = section.parts[partId]
			if(part.section.type == 'nullish') {
				continue
			}
			// 拍号校验，仅限于平铺模式
			if(this.flat) {
				const beats = part.props.beats!
				if(rememberedBeats === undefined) {
					rememberedBeats = beats
				} else {
					if(
						beats.value.x != rememberedBeats.value.x ||
						beats.value.y != rememberedBeats.value.y ||
						beats.defaultReduction != rememberedBeats.defaultReduction ||
						beats.swing != rememberedBeats.swing
					) {
						addIssue(this.issues,
							part.section.idCard.lineNumber, part.section.range[0],
							'error', 'mismatching_beats',
							'Section ${0} (m${1}) has mismatching beats against other concurrent sections.',
							'' + part.section.idCard.uuid, '' + (part.section.ordinal + 1)
						)
					}
				}
			}
			// 拍速校验，仅限于非平铺模式
			if(!this.flat) {
				const mProps = part.props
				const speed = MusicTheory.speedToQpm(
					mProps.qpm!.value, mProps.qpm!.symbol, mProps.beats!.defaultReduction
				)
				if(Math.abs(speed - section.qpm) >= 1e-3) {
					addIssue(this.issues,
						part.section.idCard.lineNumber, part.section.range[0],
						'warning', 'mismatching_speed',
						'Section ${0} (m${1}) at iteration ${2} has mismatching speed against other concurrent sections (${3}≠${4})',
						'' + part.section.idCard.uuid, '' + (part.section.ordinal + 1), '' + this.frontier!.number,
						'' + speed, '' + section.qpm
					)
				}
			}
		}
	}
	/**
	 * 寻找反复记号并跳转
	 * 
	 * 返回值能否继续
	 */
	checkRepeatJump() {
		// 小节线反复记号
		if(
			SequenceSectionStat.isSeparatorRepeatCommand(this.article, this.sectionCursor) &&
			this.checkConditionalRepeat(this.sectionCursor, 'after', this.frontier!.number)
		) {
			let jumpTo = SequenceSectionStat.findPrevSectionIndex(this.article, this.sectionCursor, cursor => {
				return (
					SequenceSectionStat.isSeparatorRepeatPos(this.article, cursor) &&
					this.checkConditionalRepeat(cursor, 'before', this.frontier!.number + 1)
				)
			})
			if(jumpTo === undefined) {
				jumpTo = 0
			}
			this.sectionCursor = jumpTo
			if(!this.expandFrontier(this.frontier!.number + 1)) {
				return false
			}
			return true
		}
		// 结构反复记号
		const repeatAttrs = SequenceSectionStat.isStructureRepeatCommand(this.article, this.sectionCursor)
		if(
			(repeatAttrs.includes('D.S.') || repeatAttrs.includes('D.C.')) &&
			this.checkDurability(this.sectionCursor, 1, +1)
		) {
			let jumpTo: number | undefined = 0
			if(repeatAttrs.includes('D.S.')) {
				jumpTo = SequenceSectionStat.findPrevSectionIndex(this.article, this.sectionCursor, cursor => {
					return SequenceSectionStat.isStructureRepeatPos(this.article, cursor).includes('$')
				})
			}
			if(jumpTo === undefined) {
				jumpTo = 0
			}
			this.sectionCursor = jumpTo
			if(!this.expandFrontier(this.frontier!.number + 1)) {
				return false
			}
			return true
		}
		// Fine. 结束判定
		const hasFine = repeatAttrs.includes('Fine.')
		if(
			hasFine &&
			this.hasUsedRepeatsAfter(this.sectionCursor)
		) {
			return false
		}
		// 终止线结束判定
		if(
			!hasFine &&
			SequenceSectionStat.isSeparatorFinal(this.article, this.sectionCursor)
		) {
			return false
		}
		// 后推一位并判断是否越界
		this.sectionCursor += 1
		if(this.sectionCursor >= this.article.sectionCount) {
			return false
		}
		return true
	}
	/**
	 * 条件性反复检测（迭代数条件、耐久度）
	 * 
	 * 返回表示条件是否满足
	 */
	checkConditionalRepeat(cursor: number, pos: SequenceSectionStat.AttrPosition, iteration: number) {
		let conditioned = false
		let checkedList: (JumperAttr | SeparatorAttr)[] = []
		const attrList = SequenceSectionStat.getMergedAttrs(this.article, cursor, pos)

		// 小节线属性作为条件
		const iterList = attrList.filter(item => item.type == 'iter')
		if(iterList.length > 0) {
			checkedList = iterList
			conditioned = true
		}
		// 跳房子记号作为条件
		if(!conditioned) {
			const jumperIterList = this.jumperSectionStat[cursor].filter(item => item.type == 'iter')
			if(jumperIterList.length > 0) {
				checkedList = jumperIterList
				conditioned = true
			}
		}
		// 条件序列筛选
		if(conditioned) {
			return SequenceSectionStat.jumperAttrMatch(checkedList, iteration)
		}

		// 反复位置记号不适用耐久度标记
		if(pos == 'before') {
			return true
		}

		// 计算耐久度
		let durability = 1
		for(let attr of attrList) {
			if(attr.type == 'durability') {
				durability = Math.max(durability, attr.value)
			}
		}
		return this.checkDurability(cursor, durability, +1)
	}
	/**
	 * 检查并标记耐久度
	 */
	checkDurability(cursor: number, durability: number, addition: number) {
		// 按耐久度筛选
		if(this.repeatDamage[cursor] + addition <= durability) {
			this.repeatDamage[cursor] += addition
			return true
		}

		return false
	}

}

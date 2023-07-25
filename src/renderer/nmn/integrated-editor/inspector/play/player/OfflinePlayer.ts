import { SequenceSectionStat } from "../../../../parser/sequence/SequenceSectionStat";
import { SequenceArticle, SequenceSection } from "../../../../parser/sequence/types";
import { ControlData } from "../../../../tone/ControlData";
import { NMNInstrumentUtils } from "../../../../tone/scheduler/NMNInstrumentUtils";
import * as Tone from 'tone'
import { NMNToneScheduler } from "../../../../tone/scheduler/NMNToneScheduler";

type SectionIndex = {
	section: SequenceSection,
	ptr: [number, number]
}

export class OfflinePlayer {
	sequence: SequenceArticle
	speedModifier: number
	pitchModifier: number

	constructor(sequence: SequenceArticle, speedModifier: number, pitchModifier: number) {
		this.sequence = sequence
		this.speedModifier = speedModifier
		this.pitchModifier = pitchModifier
	}

	startingPoint: [number, number] = [0, 0]
	repo: NMNInstrumentUtils.InstrumentRepo = {}
	controlData: ControlData = {}
	indexes: SectionIndex[] = []

	/**
	 * 初始化
	 */
	init(useIteration0: boolean, controlData: ControlData): boolean {
		// 寻找起始位置
		const fakeStart: [number, number] = [useIteration0 ? 0 : 1, -1]
		const findResult = SequenceSectionStat.findSectionInSequence(this.sequence, fakeStart[0], fakeStart[1], true)
		if(!findResult.next) {
			return false
		}
		this.startingPoint = findResult.next
		this.controlData = controlData
		this.indexes = []

		return true
	}

	/**
	 * 渲染
	 */
	async render(
		instrLoadUrl: string,
		progressCallback?: (finishedMillis: number, durationMillis: number) => void
	): Promise<AudioBuffer | undefined> {
		await Tone.start()
		NMNInstrumentUtils.loadInstruments(this.controlData, instrLoadUrl)
		await Tone.loaded()

		const duration = this.setSectionIndexes()
		let progressCheckerHandle: NodeJS.Timer | undefined = undefined
		const result = await Tone.Offline((context) => {
			NMNInstrumentUtils.createInstruments(this.repo, this.controlData)
			NMNInstrumentUtils.updateInstruments(this.repo, this.controlData, false)
			this.renderSections()
			progressCallback && progressCallback(0, duration)

			const baseContext = context.rawContext as OfflineAudioContext

			progressCheckerHandle = setInterval(() => {
				const finishMillis = baseContext.currentTime * 1000
				if(duration == 0) {
					progressCallback && progressCallback(1, 1)
				} else {
					progressCallback && progressCallback(Math.min(finishMillis, duration), duration)
				}
				if(baseContext.state == 'closed') {
					clearInterval(progressCheckerHandle)
				}
			}, 250)
		}, 0.5 + duration / 1000 + 1)  // 最后一个音被完全释放至多还需要 1 秒
		const buffer = result.get()

		progressCallback && progressCallback(duration, duration)

		if(progressCheckerHandle) {
			clearInterval(progressCheckerHandle)
		}

		return buffer
	}

	/**
	 * 计算总时间
	 */
	setSectionIndexes() {
		this.indexes = []
		let ret = 0

		let ptr = this.startingPoint
		while(true) {
			let findResult = SequenceSectionStat.findSectionInSequence(this.sequence, ptr[0], ptr[1])
			if(findResult.section) {
				ret += findResult.section.lengthMillis / this.speedModifier
				this.indexes.push({
					section: findResult.section,
					ptr: ptr,
				})
			}
			if(!findResult.next) {
				break
			}
			ptr = findResult.next
		}

		return ret
	}

	/**
	 * 渲染音频
	 */
	renderSections() {
		let totalTime = 500
		let sectionCount = 0

		for(let indexObj of this.indexes) {
			const { section } = indexObj

			sectionCount += 1
			this.renderSection(totalTime, section)
			totalTime += section.lengthMillis / this.speedModifier
		}
	}

	/**
	 * 渲染当前小节
	 */
	renderSection(startTime: number, thisSection: SequenceSection) {
		NMNToneScheduler.scheduleBeatMachine(
			startTime / 1000, thisSection, this.speedModifier,
			(name) => this.repo[name],
			(name) => this.controlData[name]?.control,
		)
		NMNToneScheduler.scheduleNotes(
			startTime / 1000, thisSection, this.speedModifier, this.pitchModifier,
			(name) => this.repo[name],
			(name) => this.controlData[name]?.control,
		)
	}
}

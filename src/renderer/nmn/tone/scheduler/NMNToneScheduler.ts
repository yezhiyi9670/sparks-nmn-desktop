import { SequenceSectionStat } from "../../parser/sequence/SequenceSectionStat";
import { SequenceSection } from "../../parser/sequence/types";
import { MusicNote, MusicProps, NoteCharMusic } from "../../parser/sparse2des/types";
import { Frac } from "../../util/frac";
import { ControlDataPart } from "../ControlData";
import { TonicToneInstrument, DrumlineToneInstrument } from "../instrument/ToneInstrument";

export type PartInstruments = {
	type: 'part'
	tonicInstrument: TonicToneInstrument
	drumlineInstrument: DrumlineToneInstrument
} | {
	type: 'beatMachine'
	drumlineInstrument: DrumlineToneInstrument
}

/**
 * 根据乐谱信息渲染音符
 */
export module NMNToneScheduler {
	/**
	 * 判断音符是否是音乐音符
	 */
	export function isTonicNote(char: NoteCharMusic) {
		return ['1', '2', '3', '4', '5', '6', '7'].includes(char.char)
	}
	/**
	 * 判断是否是鼓点音符
	 */
	export function isDrunlimeNote(char: NoteCharMusic) {
		return ['X', 'Y', 'Z'].includes(char.char)
	}
	/**
	 * 计算音高值
	 */
	export function getPitchValue(char: NoteCharMusic, mProps: MusicProps, globalTuning: number) {
		return (
			globalTuning +
			[-1, 0, 2, 4, 5, 7, 9, 11][+char.char] +
			char.octave * 12 +
			char.finalDelta +
			(isNaN(mProps.base!.value) ? 0 : mProps.base!.value)
		)
	}
	/**
	 * 计算小节的节拍时长信息
	 */
	export function interceptBeats(thisSection: SequenceSection) {
		const qpm = thisSection.qpm
		const beats = thisSection.beats

		const quarterLength = 60 * 1000 / qpm

		const fullNoteLength = quarterLength * 4
		const beatNoteLength = fullNoteLength / beats.value.y

		// 用于计算散板拍数
		const maxBeatPoints = Math.floor(Frac.toFloat(Frac.div(thisSection.lengthQuarters, Frac.create(4, beats.value.y))))

		return { qpm, beats, quarterLength, fullNoteLength, beatNoteLength, maxBeatPoints }
	}
	/**
	 * 计划节拍器打拍
	 */
	export function scheduleBeatMachine(
		now: number,
		thisSection: SequenceSection,
		speedModifier: number,
		getInstruments: (name: string) => PartInstruments | undefined,
		getControlData: (name: string) => ControlDataPart | undefined,
		visualizerStart?: (time: number, point: number) => void,
		visualizerEnd?: (time: number, point: number) => void
	) {
		const beatsInfo = interceptBeats(thisSection)
		const beatMachineInstrument = getInstruments('beatMachine')
		const control = getControlData('beatMachine')

		if(!beatMachineInstrument || !control) {
			return
		}

		const { beats, maxBeatPoints, beatNoteLength } = beatsInfo
		
		beatMachineInstrument.drumlineInstrument.now = now
		for(let n = 0; n < (beats.value.x == 0 ? maxBeatPoints : Math.min(maxBeatPoints, beats.value.x)); n++) {
			visualizerStart && visualizerStart(beatNoteLength * n / speedModifier, n)
			visualizerEnd && visualizerEnd(beatNoteLength * (n + 1) / speedModifier, n)
			if(control && control.type == 'beatMachine' && beats.value.y > 4 && n % control.beatModulo != 0) {
				continue
			}
			beatMachineInstrument.drumlineInstrument.scheduleNote(
				n == 0 ? 'X' : 'Y',
				beatNoteLength * n / speedModifier,
				beatNoteLength / speedModifier,
			)
		}
	}
	/**
	 * 计划播放小节
	 */
	export function scheduleNotes(
		now: number,
		thisSection: SequenceSection,
		speedModifier: number,
		pitchModifier: number,
		getInstruments: (name: string) => PartInstruments | undefined,
		getControlData: (name: string) => ControlDataPart | undefined,
		visualizerStart?: (time: number, note: MusicNote<NoteCharMusic>) => void,
		visualizerEnd?: (time: number, note: MusicNote<NoteCharMusic>) => void,
	) {
		const beatInfo = interceptBeats(thisSection)
		const { quarterLength } = beatInfo
		SequenceSectionStat.handleSequenceNotes(thisSection, (part, partId) => {
			const instruments = getInstruments(partId)
			const control = getControlData(partId)
			if(!instruments || !control || instruments.type == 'beatMachine' || control.type == 'beatMachine') {
				return undefined
			}
			instruments.drumlineInstrument.now = now
			instruments.tonicInstrument.now = now
			const mProps = part.props
			return (note) => {
				const startTime = quarterLength * Frac.toFloat(note.startPos) / speedModifier
				const length = quarterLength * Frac.toFloat(note.length) / speedModifier

				visualizerStart && visualizerStart(startTime, note)
				visualizerEnd && visualizerEnd(startTime + length, note)

				if(note.type != 'note' || note.voided) {
					return
				}
				const char = note.char
				if(isTonicNote(char)) {
					const pitchValue = getPitchValue(char, mProps, pitchModifier + control.octave * 12)
					const freqValue = 440 * 2 ** ((pitchValue - 9) / 12)
					instruments.tonicInstrument.scheduleNote(freqValue, startTime, length)
				} else if(isDrunlimeNote(char)) {
					instruments.drumlineInstrument.scheduleNote(char.char, startTime, length)
				}
			}
		})
	}
}

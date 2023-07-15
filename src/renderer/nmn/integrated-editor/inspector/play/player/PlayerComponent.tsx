import React, { memo, useContext, useEffect, useRef } from 'react'
import { Linked2MusicArticle } from '../../../../parser/des2cols/types'
import { SequenceArticle, SequenceSection } from '../../../../parser/sequence/types'
import { DrumlineToneInstrument, DrumlineToneInstrumentClass, ToneInstrument, TonicToneInstrument, TonicToneInstrumentClass } from '../../../../tone/instrument/ToneInstrument'
import { DisposableAudioTimer } from '../../../../tone/DisposableAudioTimer'
import { ControlData, ControlDataPart, DrumlineInstruments, MixingControlUtils, TonicInstruments } from '../control/ControlData'
import { useMethod } from '../../../../util/hook'
import * as Tone from 'tone'
import { Frac } from '../../../../util/frac'
import { randomToken } from '../../../../util/random'
import { IntegratedEditorContext } from '../../../IntegratedEditor'
import { noteCharChecker } from '../../../../parser/sparse2des/types'
import { iterateMap } from '../../../../util/array'
import { useOnceEffect } from '../../../../util/event'

type PartInstruments = {
	type: 'part'
	tonicInstrument: TonicToneInstrument
	drumlineInstrument: DrumlineToneInstrument
} | {
	type: 'beatMachine'
	drumlineInstrument: DrumlineToneInstrument
}

const beatMachineName = 'beatMachine'

// eslint-disable-next-line react/display-name
export const PlayerComponent = memo((props: {
	playing: boolean
	setPlaying: (val: boolean) => void
	preSection: boolean
	setPreSection: (val: boolean) => void

	sequence: SequenceArticle
	controlData: ControlData

	iterationIndex: number
	setIterationIndex: (val: number) => void
	sectionIndex: number
	setSectionIndex: (val: number) => void

	speedModifier: number
	pitchModifier: number

	updateNoteHighlight: (val: string[]) => void
}) => {
	const synthRef = useRef<{[_: string]: PartInstruments}>({})
	const timerRef = useRef<DisposableAudioTimer>()
	const playToken = useRef<string>(randomToken(12))

	let { iterationIndex, sectionIndex, preSection } = props
	const { prefs } = useContext(IntegratedEditorContext)

	useEffect(() => {
		return () => {
			timerRef.current?.dispose()
		}
	}, [])

	const updateNoteHighlight = useMethod(props.updateNoteHighlight)
	const highlightsRef = useRef<{[_: string]: boolean}>({})
	const clearHighlight = useMethod(() => {
		highlightsRef.current = {}
	})
	const addHighlight = useMethod((id: string) => {
		highlightsRef.current[id] = true
	})
	const removeHighlight = useMethod((id: string) => {
		delete highlightsRef.current[id]
	})
	const actuateHighlight = useMethod(() => {
		updateNoteHighlight(iterateMap(highlightsRef.current, (value, id) => id))
	})

	/**
	 * 触发结束
	 */
	const invokeEnd = useMethod(() => {
		props.setPlaying(false)
	})
	/**
	 * 触发预播放小节结束
	 */
	const invokePreEnd = useMethod(() => {
		props.setPreSection(false)
	})

	/**
	 * 处理开始播放事件
	 */
	const handlePlay = useMethod((preSec: boolean) => {
		let token = playToken.current = randomToken(12)
		Tone.start().then(() => {
			prepareInstruments()
			Tone.loaded().then(() => {
				if(token != playToken.current) {
					return
				}
				if(!preSec) {
					clearHighlight()
					actuateHighlight()
				}
				DisposableAudioTimer.init()
				createInstruments()
				scheduleCurrentSection(Tone.now())
			})
		})
	})
	/**
	 * 调教乐器
	 */
	const letMeDoItForYou = useMethod(<T extends ToneInstrument>(instrument: T, controlPart: ControlDataPart, hasSolo: boolean): T => {
		if(((!hasSolo || controlPart.solo) && !controlPart.mute) || (controlPart.type == 'beatMachine' && preSection)) {
			instrument.setVolume((controlPart.volume / MixingControlUtils.maxVolume) ** 2)
		} else {
			instrument.setVolume(0)
		}
		instrument.setPan(controlPart.pan)
		return instrument
	})
	/**
	 * 准备乐器
	 */
	const prepareInstruments = useMethod(() => {
		for(let partId in props.controlData) {
			const controlPart = props.controlData[partId].control
			if(controlPart.type == 'beatMachine') {
				DrumlineInstruments[controlPart.drumlineInstrument].load(prefs.instrumentSourceUrl!)
			} else {
				DrumlineInstruments[controlPart.drumlineInstrument].load(prefs.instrumentSourceUrl!)
				TonicInstruments[controlPart.tonicInstrument].load(prefs.instrumentSourceUrl!)
			}
		}
	})
	/**
	 * 创建乐器
	 */
	const createInstruments = useMethod(() => {
		timerRef.current = new DisposableAudioTimer()
		synthRef.current = {}
		const synthObj = synthRef.current
		for(let partId in props.controlData) {
			const controlPart = props.controlData[partId].control
			if(controlPart.type == 'beatMachine') {
				synthObj[partId] = {
					type: 'beatMachine',
					drumlineInstrument: new DrumlineInstruments[controlPart.drumlineInstrument]
				}
			} else {
				synthObj[partId] = {
					type: 'part',
					drumlineInstrument: new DrumlineInstruments[controlPart.drumlineInstrument],
					tonicInstrument: new TonicInstruments[controlPart.tonicInstrument]
				}
			}
		}
		updateInstruments()
	})
	/**
	 * 更新乐器信息
	 */
	const updateInstruments = useMethod(() => {
		let hasSolo = false
		for(let partId in props.controlData) {
			const controlPart = props.controlData[partId]?.control
			if(!controlPart) {
				return
			}
			if(controlPart.solo) {
				hasSolo = true
			}
		}
		const synthObj = synthRef.current
		for(let partId in synthObj) {
			const controlPart = props.controlData[partId].control
			const synthPart = synthObj[partId]
			if(!controlPart) {
				return
			}
			letMeDoItForYou(synthPart.drumlineInstrument, controlPart, hasSolo)
			if(synthPart.type != 'beatMachine') {
				letMeDoItForYou(synthPart.tonicInstrument, controlPart, hasSolo)
			}
		}
	})
	/**
	 * 处理结束事件
	 */
	const handleEnd = useMethod(() => {
		playToken.current = randomToken(12)
		if(timerRef.current) {
			timerRef.current.dispose()
		}
		const synthObj = synthRef.current
		for(let partId in synthObj) {
			const synth = synthObj[partId]
			synth.drumlineInstrument.dispose()
			if(synth.type != 'beatMachine') {
				synth.tonicInstrument.dispose()
			}
		}
		synthRef.current = {}
		clearHighlight()
		actuateHighlight()
	})

	/**
	 * 内容变更强制结束播放
	 */
	useEffect(() => {
		if(props.playing) {
			invokeEnd()
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [props.sequence, invokeEnd])
	/**
	 * 开始/结束播放
	 */
	useEffect(() => {
		if(props.playing == true) {
			handlePlay(preSection)
		} else {
			handleEnd()
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ handleEnd, handlePlay, props.playing ])
	/**
	 * 销毁时结束播放
	 */
	useOnceEffect(() => {
		return () => {
			invokeEnd()
			handleEnd()
		}
	})
	/**
	 * 更新乐器
	 */
	useEffect(() => {
		updateInstruments()
	}, [ props.controlData, updateInstruments ])
	
	/**
	 * 寻找小节
	 */
	const findSection = useMethod((iterationIndex: number, sectionIndex: number) => {
		let foundSection: SequenceSection | undefined = undefined
		let foundNext: [number, number] | undefined = undefined
		for(let i = iterationIndex; i < props.sequence.iterations.length; i++) {
			const iteration = props.sequence.iterations[i]
			if(i != iterationIndex && !foundSection) {
				break
			}
			for(let j = 0; j < iteration.sections.length; j++) {
				const section = iteration.sections[j]
				if(foundSection) {
					foundNext = [i, section.index]
					break
				}
				if(i == iterationIndex) {
					if(!foundSection && section.index == sectionIndex) {
						foundSection = section
					}
				}
			}
			if(foundSection && foundNext) {
				break
			}
		}
		if(foundNext && iterationIndex == 0 && foundNext[0] > 0) {
			foundNext = undefined
		}
		return {
			section: foundSection,
			next: foundNext
		}
	})

	/**
	 * 计划当前小节（包括预打拍小节）
	 */
	const scheduleCurrentSection = useMethod((now: number) => {
		const thisSection = findSection(iterationIndex, sectionIndex).section
		if(!thisSection) {
			invokeEnd()
			return
		}

		const qpm = thisSection.qpm
		const beats = thisSection.beats

		const quarterLength = 60 * 1000 / qpm

		const fullNoteLength = quarterLength * 4
		const beatNoteLength = fullNoteLength / beats.value.y

		// 防止散板打拍打穿
		const maxBeatPoints = Math.floor(Frac.toFloat(Frac.div(thisSection.lengthQuarters, Frac.create(4, beats.value.y))))

		// 打节拍
		const beatMachineInstrument = synthRef.current['beatMachine']
		if(beatMachineInstrument) {
			beatMachineInstrument.drumlineInstrument.now = now
			const control = props.controlData[beatMachineName]?.control
			for(let n = 0; n < (beats.value.x == 0 ? maxBeatPoints : Math.min(maxBeatPoints, beats.value.x)); n++) {
				if(control && control.type == 'beatMachine' && beats.value.y > 4 && n % control.beatModulo != 0) {
					continue
				}
				beatMachineInstrument.drumlineInstrument.scheduleNote(
					n == 0 ? 'X' : 'Y',
					beatNoteLength * n / props.speedModifier,
					beatNoteLength / props.speedModifier
				)
			}
		}

		timerRef.current!.now = now
		
		// 播放音符
		if(!preSection) {
			for(let partId in thisSection.parts) {
				const part = thisSection.parts[partId]
				const instruments = synthRef.current[partId]
				const control = props.controlData[partId]?.control
				if(!instruments || !control || instruments.type == 'beatMachine' || control.type == 'beatMachine') {
					continue
				}
				if(part.section.type != 'section') {
					continue
				}
				instruments.drumlineInstrument.now = now
				instruments.tonicInstrument.now = now
				const mProps = part.props
				for(let note of part.section.notes) {
					const startTime = quarterLength * Frac.toFloat(note.startPos) / props.speedModifier
					const length = quarterLength * Frac.toFloat(note.length) / props.speedModifier
					
					timerRef.current!.schedule(time => {
						addHighlight(note.uuid)
						actuateHighlight()
					}, startTime)
					timerRef.current!.schedule(time => {
						removeHighlight(note.uuid)
						actuateHighlight()
					}, startTime + length)

					if(note.type != 'note' || note.voided) {
						continue
					}
					const char = note.char
					if('1234567'.indexOf(char.char) != -1) {
						const pitchValue =
							props.pitchModifier + control.octave * 12 +
							[-1, 0, 2, 4, 5, 7, 9, 11][+char.char] +
							char.octave * 12 +
							char.finalDelta +
							(isNaN(mProps.base!.value) ? 0 : mProps.base!.value)
						const freqValue = 440 * 2 ** ((pitchValue - 9) / 12)
						instruments.tonicInstrument.scheduleNote(freqValue, startTime, length)
					} else if(['X', 'Y', 'Z'].includes(char.char)) {
						instruments.drumlineInstrument.scheduleNote(char.char, startTime, length)
					}
				}
			}
		}

		// 准备跳转下一小节
		timerRef.current!.schedule(time => {
			if(props.playing) {
				jumpNextSection(time)
			}
		}, Frac.toFloat(thisSection.lengthQuarters) * quarterLength / props.speedModifier)
	})

	/**
	 * 跳转下一小节（包括结束打拍小节以及终止播放）
	 */
	const jumpNextSection = useMethod((now: number) => {
		if(preSection) {
			props.setPreSection(preSection = false)
			// 初始打拍结束后清空高亮
			clearHighlight()
			actuateHighlight()
			// 初始打拍结束后可能需要静音节拍器
			updateInstruments()
		} else {
			const next = findSection(iterationIndex, sectionIndex).next
			if(next === undefined) {
				invokeEnd()
				return
			}
			props.setIterationIndex(iterationIndex = next[0])
			props.setSectionIndex(sectionIndex = next[1])
		}
		scheduleCurrentSection(now)
	})

	return <></>
})

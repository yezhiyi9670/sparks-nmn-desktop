import React, { memo, useContext, useEffect, useRef } from 'react'
import { Linked2MusicArticle } from '../../../../parser/des2cols/types'
import { SequenceArticle, SequenceSection } from '../../../../parser/sequence/types'
import { DrumlineToneInstrument, DrumlineToneInstrumentClass, ToneInstrument, TonicToneInstrument, TonicToneInstrumentClass } from '../../../../tone/instrument/ToneInstrument'
import { DisposableAudioTimer } from '../../../../tone/DisposableAudioTimer'
import { ControlData, ControlDataPart, DrumlineInstruments, MixingControlUtils, TonicInstruments } from '../../../../tone/ControlData'
import { useMethod } from '../../../../util/hook'
import * as Tone from 'tone'
import { Frac } from '../../../../util/frac'
import { randomToken } from '../../../../util/random'
import { IntegratedEditorContext } from '../../../IntegratedEditor'
import { noteCharChecker } from '../../../../parser/sparse2des/types'
import { iterateMap } from '../../../../util/array'
import { useOnceEffect } from '../../../../util/event'
import { SequenceSectionStat } from '../../../../parser/sequence/SequenceSectionStat'
import { NMNToneScheduler, PartInstruments } from '../../../../tone/scheduler/NMNToneScheduler'
import { NMNInstrumentUtils } from '../../../../tone/scheduler/NMNInstrumentUtils'

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
	const synthRef = useRef<NMNInstrumentUtils.InstrumentRepo>({})
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
	 * 准备乐器
	 */
	const prepareInstruments = useMethod(() => {
		NMNInstrumentUtils.loadInstruments(props.controlData, prefs.instrumentSourceUrl!)
	})
	/**
	 * 创建乐器
	 */
	const createInstruments = useMethod(() => {
		timerRef.current = new DisposableAudioTimer()
		synthRef.current = {}
		NMNInstrumentUtils.createInstruments(synthRef.current, props.controlData)
		NMNInstrumentUtils.updateInstruments(synthRef.current, props.controlData, preSection)
	})
	/**
	 * 处理结束事件
	 */
	const handleEnd = useMethod(() => {
		playToken.current = randomToken(12)
		if(timerRef.current) {
			timerRef.current.dispose()
		}
		NMNInstrumentUtils.clearInstruments(synthRef.current)
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
		NMNInstrumentUtils.updateInstruments(synthRef.current, props.controlData, preSection)
	}, [ props.controlData, preSection ])
	
	/**
	 * 寻找小节
	 */
	const findSection = useMethod((iterationIndex: number, sectionIndex: number) => {
		return SequenceSectionStat.findSectionInSequence(props.sequence, iterationIndex, sectionIndex)
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

		// 打节拍
		NMNToneScheduler.scheduleBeatMachine(
			now, thisSection, props.speedModifier,
			(name) => synthRef.current[name],
			(name) => props.controlData[name]?.control,
		)

		timerRef.current!.now = now
		
		// 播放音符
		if(!preSection) {
			NMNToneScheduler.scheduleNotes(
				now, thisSection, props.speedModifier, props.pitchModifier,
				(name) => synthRef.current[name],
				(name) => props.controlData[name]?.control,
				(time, note) => timerRef.current!.schedule(() => {
					addHighlight(note.uuid)
					actuateHighlight()
				}, time),
				(time, note) => timerRef.current!.schedule(() => {
					removeHighlight(note.uuid)
					actuateHighlight()
				}, time)
			)
		}

		// 准备跳转下一小节
		timerRef.current!.schedule(time => {
			if(props.playing) {
				jumpNextSection(time)
			}
		}, thisSection.lengthMillis / props.speedModifier)
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
			// 初始打拍结束后的更新由 effect 处理
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

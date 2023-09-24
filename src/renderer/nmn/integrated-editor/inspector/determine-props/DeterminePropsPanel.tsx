import React, { ReactNode, useContext, useMemo, useState } from 'react'
import { createUseStyles } from 'react-jss'
import { IntegratedEditorContext } from '../../IntegratedEditor'
import { NMNI18n } from '../../..'
import { Button } from '../component/button'
import { PianoInstrument } from '../../../tone/instrument/tonic/PianoInstrument'
import * as Tone from 'tone'
import { KeyGroupTable } from './KeyGroupTable'
import { useMethod } from '../../../util/hook'
import { MusicTheory } from '../../../util/music'
import { CopyInfoBox } from '../component/CopyInfoBox'

function useStyles() {
	const { colorScheme } = useContext(IntegratedEditorContext)
	const useStylesFunc = useMemo(() => {
		return createUseStyles({
			container: {
				padding: '12px',
				height: '100%',
				overflowY: 'auto'
			},
			title: {
				fontWeight: 700,
				fontSize: '1.08em',
				marginBottom: '12px',
				marginTop: '18px',
				lineHeight: 1.35
			},
			pline: {
				marginBottom: '12px',
				lineHeight: 1.35,
			},
			buttonBoxOuter: {
				display: 'table',
				height: '240px',
				width: '100%',
				border: '2px dashed #0002',
				boxSizing: 'border-box',
				background: colorScheme.voidary,
				outline: 'none',
				'&:focus': {
					borderColor: '#0004',
					background: colorScheme.voidaryActive
				},
				marginBottom: '12px',
				lineHeight: 1.35,
			},
			buttonBoxInner: {
				display: 'table-cell',
				textAlign: 'center',
				verticalAlign: 'middle',
				padding: '16px',
			}
		})
	}, [ colorScheme ])
	return useStylesFunc()
}

export function DeterminePropsPanel(props: {}) {
	const i18nPrefix = 'inspector.determine_props.'

	const classes = useStyles()
	const { language } = useContext(IntegratedEditorContext)

	return <div className={classes.container}>
		<div className={classes.pline}>
			{NMNI18n.editorText(language, `${i18nPrefix}tips`)}
		</div>
		<BaseTester />
		<SpeedTester />
	</div>
}

function absoluteKeysToName(value: number): ReactNode {
	const name = MusicTheory.absoluteKeysToName(value)
	if(name[0] == '#' || name[0] == 'b') {
		return <>
			<sup>{name[0]}</sup>{name.substring(1, name.length - 1)}<sub>{name.substring(name.length - 1)}</sub>
		</>
	} else {
		return <>
			&nbsp;{name.substring(0, name.length - 1)}<sub>{name.substring(name.length - 1)}</sub>
		</>
	}
}
function relativeKeysToName(value: number): ReactNode {
	const name = MusicTheory.relativeKeysToName(value)
	if(name[0] == '#' || name[0] == 'b') {
		return <>
			<sup>{name[0]}</sup>{name.substring(1)}
		</>
	} else {
		return <>
			&nbsp;{name}
		</>
	}
}

function BaseTester(props: {}) {
	const i18nPrefix = 'inspector.determine_props.base.'

	const classes = useStyles()
	const { prefs, colorScheme, language } = useContext(IntegratedEditorContext)

	const [ selectedNote, setSelectedNote ] = useState(NaN)
	const [ selectedRelation, setSelectedRelation ] = useState(NaN)

	const handleNoteSelect = useMethod(async (pitch: number) => {
		setSelectedNote(pitch)
		if(prefs.instrumentSourceUrl === undefined) {
			return
		}
		const freq = 440 * 2 ** ((pitch - 9) / 12)
		PianoInstrument.load(prefs.instrumentSourceUrl)
		await Tone.start()
		await Tone.loaded()
		const instr = new PianoInstrument()
		instr.scheduleNote(freq, 0, 1000)
	})
	const handleRelationSelect = useMethod((relation: number) => {
		setSelectedRelation(relation)
	})

	return <>
		<div className={classes.title}>
			{NMNI18n.editorText(language, `${i18nPrefix}title`)}
		</div>
		<div className={classes.pline}>
			{NMNI18n.editorText(language, `${i18nPrefix}tips.1.sound`)}
		</div>
		<div className={classes.pline}>
			{NMNI18n.editorText(language, `${i18nPrefix}tips.1`)}
		</div>
		<KeyGroupTable
			value={selectedNote}
			onSelect={handleNoteSelect}
			deleteValue={NaN}
			buttons={[4, 5, 6, 7, 8, 9, 10, 11].map(halfOctave => (
				[0, 1, 2, 3, 4, 5].map(tune => {
					const pitchValue = 6 * (halfOctave - 8) + tune
					return {
						label: absoluteKeysToName(pitchValue),
						value: pitchValue
					}
				})
			))}
		/>
		{!isNaN(selectedNote) && <>
			<div className={classes.pline}>
				{NMNI18n.editorText(language, `${i18nPrefix}tips.2`)}
			</div>
			<KeyGroupTable
				value={selectedRelation}
				onSelect={handleRelationSelect}
				deleteValue={NaN}
				buttons={[-2, -1, 0, 1, 2, 3].map(halfOctave => (
					[0, 1, 2, 3, 4, 5].map(tune => {
						const relationValue = 6 * halfOctave + tune
						return {
							label: relativeKeysToName(relationValue),
							value: relationValue
						}
					})
				))}
			/>
		</>}
		{!isNaN(selectedNote) && !isNaN(selectedRelation) && <>
			<div className={classes.pline}>
				{NMNI18n.editorText(language, `${i18nPrefix}tips.3`)}
			</div>
			<div className={classes.pline}>
				<CopyInfoBox value={'1=' + MusicTheory.absoluteKeysToName(selectedNote - selectedRelation, true)} />
			</div>
			<div className={classes.pline} style={{opacity: 0.6, fontSize: '0.9em'}}>
				{NMNI18n.editorText(language, `${i18nPrefix}tips.3.hint`)}
			</div>
		</>}
	</>
}

function SpeedTester(props: {}) {
	const i18nPrefix = 'inspector.determine_props.speed.'

	const classes = useStyles()
	const { colorScheme, language } = useContext(IntegratedEditorContext)
	
	const [ state, setState ] = useState<'idle' | 'preparing' | 'measuring'>('idle')
	const [ startTime, setStartTime ] = useState(NaN)
	const [ lastTime, setLastTime ] = useState(NaN)
	const [ clickTimes, setClickTimes ] = useState(0)

	function handleFocus() {
		if(state == 'idle') {
			setState('preparing')
		}
	}
	function handleBlur() {
		if(state == 'preparing') {
			setState('idle')
		}
	}
	function handleKeyDown(evt: React.KeyboardEvent) {
		if(!evt.ctrlKey) {
			if(evt.key == ' ' || evt.key == '.' || evt.key == 'Enter') {
				handleClick()
				evt.preventDefault()
			} else if(evt.key == 'Escape') {
				reset('preparing')
				evt.preventDefault()
			}
		}
	}
	function reset(state: 'idle' | 'preparing') {
		setState(state)
		setClickTimes(0)
	}
	function handleClick() {
		if(state == 'preparing') {
			setState('measuring')
			const clock = +new Date()
			setStartTime(clock)
			setLastTime(clock)
			setClickTimes(1)
		} else if(state == 'measuring') {
			const clock = +new Date()
			setLastTime(clock)
			setClickTimes(c => c + 1)
		}
	}

	const bpm = (clickTimes <= 1) ? NaN : ((clickTimes - 1) / (lastTime - startTime) * 1000 * 60)

	return <>
		<div className={classes.title}>
			{NMNI18n.editorText(language, `${i18nPrefix}title`)}
		</div>
		<div className={classes.buttonBoxOuter} tabIndex={0} onFocus={handleFocus} onBlur={handleBlur} onKeyDown={handleKeyDown} onMouseDown={handleClick}>
			<div className={classes.buttonBoxInner}>
				{state != 'idle' && <div style={{textAlign: 'center'}}>
					<span style={{fontSize: '2.5em', fontWeight: 700}}>{bpm.toFixed(1)}</span>BPM
				</div>}
				<div style={{textAlign: 'center', fontSize: '0.95em'}}>
					{state == 'idle' && NMNI18n.editorText(language, `${i18nPrefix}idle`)}
					{state == 'preparing' && NMNI18n.editorText(language, `${i18nPrefix}preparing`)}
					{state == 'measuring' && NMNI18n.editorText(language, `${i18nPrefix}measuring`,
						clickTimes.toFixed(0),
						((lastTime - startTime) / 1000).toFixed(2)
					)}
				</div>
			</div>
		</div>
		<div>
			<Button style={{width: '100%', fontSize: '16px'}} onClick={() => reset('idle')} disabled={state != 'measuring'}>
				{NMNI18n.editorText(language, `${i18nPrefix}reset`)}
			</Button>
		</div>
	</>
}

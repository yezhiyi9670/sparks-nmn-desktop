import React, { useContext, useEffect } from 'react'
import { createUseStyles } from 'react-jss'
import { PianoInstrument } from '../../../tone/instrument/tonic/PianoInstrument'
import * as Tone from 'tone'
import { Button } from '../component/button'
import { ChipInstrument } from '../../../tone/instrument/tonic/ChipInstrument'
import { DrumlineToneInstrumentClass, TonicToneInstrument, TonicToneInstrumentClass } from '../../../tone/instrument/ToneInstrument'
import { iterateMap } from '../../../util/array'
import { DrumlineInstruments, TonicInstruments } from '../../../tone/ControlData'
import { IntegratedEditorContext } from '../../IntegratedEditor'
import { NMNI18n } from '../../..'
import { SawInstrument } from '../../../tone/instrument/tonic/SawInstrument'
import { FlacLibUtil } from '../../../util/flac-encoder'

const useStyles = createUseStyles({
	root: {
		padding: '12px',
		overflowY: 'auto'
	}
})

const i18nPrefix = 'inspector.instrument_test.'
const i18nPrefixIns = 'inspector.play.controls.instrument.'

export function InstrumentTestPanel() {
	const classes = useStyles()
	const baseDir = './nmn/resource/audio'

	const { language } = useContext(IntegratedEditorContext)

	function testTonicInstrument(freq: number, instrument: TonicToneInstrumentClass) {
		Tone.start().then(() => {
			instrument.load(baseDir)
			Tone.loaded().then(() => {
				const ins = new instrument()
				ins.setPan(0)
				ins.scheduleNote(freq, 0, 250)
			})
		})
	}

	function testDrumlineInstrument(note: string, instrument: DrumlineToneInstrumentClass) {
		Tone.start().then(() => {
			instrument.load(baseDir)
			Tone.loaded().then(() => {
				new instrument().scheduleNote(note, 0, 250)
			})
		})
	}
	
	function testOfflineRendering() {
		Tone.start().then(async () => {
			const renderer = Tone.Offline(() => {
				new ChipInstrument().scheduleNote(440, 0, 5)
			}, 5)
			const buffer = (await renderer).get()
			if(!buffer) {
				return
			}

			const encData = await FlacLibUtil.encodeBuffer(buffer)
			const blob = new Blob([encData], {type: 'audio/flac'})
			const url = URL.createObjectURL(blob)
			window.open(url)
			setTimeout(() => {
				URL.revokeObjectURL(url)
			}, 10000)
		})
	}

	return <div className={classes.root}>
		<div style={{marginBottom: '12px', fontWeight: 'bold'}}>
			{NMNI18n.editorText(language, `${i18nPrefix}tonic`)}
		</div>
		{iterateMap(TonicInstruments, (instrument, key) => {
			if(instrument === null) {
				return undefined
			}
			return <div key={key} style={{marginBottom: '12px'}}>
				<span style={{paddingRight: '0.4em'}}>
					{NMNI18n.editorText(language, `${i18nPrefixIns}${key}`)}
				</span>
				{[131, 220, 262, 440, 524].map(freq => (
					<Button style={{marginRight: '8px'}} key={freq} small onMouseDown={() => testTonicInstrument(
						freq,
						instrument,
					)}>
						{freq}
					</Button>
				))}
			</div>
		})}
		<div style={{marginBottom: '12px', fontWeight: 'bold'}}>
		{NMNI18n.editorText(language, `${i18nPrefix}drumline`)}
		</div>
		{iterateMap(DrumlineInstruments, (instrument, key) => {
			if(instrument === null) {
				return undefined
			}
			return <div key={key} style={{marginBottom: '12px'}}>
				<span style={{paddingRight: '0.4em'}}>
					{NMNI18n.editorText(language, `${i18nPrefixIns}${key}`)}
				</span>
				{['X', 'Y', 'Z'].map(freq => (
					<Button style={{marginRight: '8px'}} key={freq} small onMouseDown={() => testDrumlineInstrument(
						freq,
						instrument,
					)}>
						{freq}
					</Button>
				))}
			</div>
		})}
		<div style={{marginBottom: '12px', fontWeight: 'bold'}}>
		{NMNI18n.editorText(language, `${i18nPrefix}offline`)}
		</div>
		<Button style={{marginRight: '8px'}} small onMouseDown={() => testOfflineRendering()}>
			Test
		</Button>
		<div style={{marginTop: '24px', fontStyle: 'italic'}}>
			{NMNI18n.editorText(language, `${i18nPrefix}comment`)}
		</div>
	</div>
}

/* eslint-disable react/display-name */
import React, { memo, useContext } from 'react'
import { BeatMachineSignature, ControlData, ControlDataPart, DrumlineInstruments, MixingControlUtils, TonicInstruments } from './ControlData'
import { iterateMap } from '../../../../util/array'
import { PartSignature } from '../../../../parser/des2cols/types'
import { useMethod } from '../../../../util/hook'
import { createUseStyles } from 'react-jss'
import { IntegratedEditorContext } from '../../../IntegratedEditor'
import { LanguageArray } from '../../../../i18n'
import { NMNI18n } from '../../../..'
import { Button, ButtonGroup, ButtonMargin, ButtonSelect } from '../../component/button'
import { ReactSelect } from '../../component/react-select'
import { ReactSlider } from '../../component/react-slider'

import * as IconsGo from 'react-icons/go'
import * as IconsTb from 'react-icons/tb'

const i18nPrefix = `inspector.play.controls.`

const useStyles = createUseStyles({
	partCard: {
		padding: '12px 0',
		borderBottom: '1px solid #0004'
	},
	labelLine: {
		fontSize: '16px',
		display: 'flex',
		flexDirection: 'row',
		alignContent: 'middle'
	},
	partLabel: {
		flex: 'auto',
		whiteSpace: 'nowrap',
		flexBasis: 0,
		overflowX: 'hidden',
		tableLayout: 'fixed',
		display: 'block',
	},
	partLabelIn: {
		display: 'inline-block',
		verticalAlign: 'middle',
		width: '100%'
	},
	volumeLine: {
		fontSize: '16px',
		display: 'flex',
		flexDirection: 'row',
		padding: '8px 0'
	},
	miscLine: {
		display: 'flex',
		flexDirection: 'row',
		fontSize: '15px'
	},
	controlLabel: {
		paddingRight: '0.4em',
	},
	controlValue: {
		padding: '0 0.4em'
	},
	saveCard: {
		padding: '12px 0'
	},
	saveButton: {
		flexBasis: 0,
		flex: 1,
		fontSize: '15px !important'
	},
	hint: {
		paddingBottom: '0.8em',
		fontSize: '14px',
		opacity: 0.6,
		lineHeight: 1.5
	}
})

// eslint-disable-next-line react/display-name
export const Controls = memo((props: {
	data: ControlData
	setData: (newData: ControlData) => void
	onSaveData: () => void
	onLoadData: () => void
	canLoadData: boolean
	playing: boolean
}) => {
	const classes = useStyles()
	const { language } = useContext(IntegratedEditorContext)

	const updatePartData = useMethod((hash: string, newData: ControlDataPart) => {
		const data1: ControlData = {
			...props.data,
			[hash]: {
				...props.data[hash],
				control: newData
			}
		}
		props.setData(data1)
	})

	return <>
		{iterateMap(props.data, (part, hash) => {
			return (
				<ControlsPart
					signature={part.signature}
					key={hash}
					partData={part.control}
					setPartData={updatePartData}
					playing={props.playing}
				/>
			)
		})}
		<div className={classes.saveCard}>
			<div className={classes.hint}>{NMNI18n.editorText(language, `${i18nPrefix}prefab.hint`)}</div>
			<ButtonGroup>
				<Button classes={[classes.saveButton]} onClick={props.onSaveData}>
					{NMNI18n.editorText(language, `${i18nPrefix}prefab.save`)}
				</Button>
				<ButtonMargin />
				<Button disabled={props.playing || !props.canLoadData} classes={[classes.saveButton]} onClick={props.onLoadData}>
					{NMNI18n.editorText(language, `${i18nPrefix}prefab.load`)}
				</Button>
			</ButtonGroup>
		</div>
	</>
})

export const ControlsPart = memo((props: {
	signature: PartSignature | BeatMachineSignature
	partData: ControlDataPart,
	setPartData: (hash: string, newData: ControlDataPart) => void
	playing: boolean
}) => {
	const { language, colorScheme } = useContext(IntegratedEditorContext)
	const { partData } = props
	const classes = useStyles()
	const isBeatMachine = partData.type == 'beatMachine'

	function setPartData(data: ControlDataPart) {
		props.setPartData(props.signature.hash, data)
	}

	function modifyOctave(val: number) {
		if(isBeatMachine) {
			return
		}
		const newOctave = partData.octave + val
		if(Math.abs(newOctave) > MixingControlUtils.maxOctave) {
			return
		}
		setPartData({
			...partData,
			octave: newOctave
		})
	}

	return (
		<div className={classes.partCard}>
			<div className={classes.labelLine}>
				<div className={classes.partLabel} style={{...(isBeatMachine && {fontStyle: 'italic'})}}>
					<span className={classes.partLabelIn}>
						{partLabel(language, props.signature)}
					</span>
				</div>
				<div style={{display: 'table', paddingRight: '0.4em', paddingLeft: '0.4em', flex: 0}}>
					<div style={{display: 'table-cell', verticalAlign: 'middle'}}>
						<ReactSlider
							style={{width: '100px', fontSize: '18px'}}
							highlightColor={colorScheme.positive}
							trackColor={colorScheme.voidaryHover}
							thumbColor={'white'}
							hoverColor={colorScheme.voidary}
							activeColor={colorScheme.voidaryHover}
							min={-1} max={1} step={0.25} value={partData.pan}
							onChange={(val) => {setPartData({...partData, pan: val})}}
							noRange
							onRootKeyDown={(evt) => {
								evt.stopPropagation()
							}}
						/>
					</div>
				</div>
				<Button
					selected={partData.mute}
					onClick={() => {setPartData({...partData, mute: !partData.mute, solo: partData.solo && partData.mute})}}
					style={{borderRight: 'none'}}
					mini
				>M</Button>
				<Button
					selected={partData.solo}
					onClick={() => {setPartData({...partData, mute: partData.mute && partData.solo, solo: !partData.solo})}}
					style={{borderLeft: 'none'}}
					mini
				>S</Button>
			</div>
			<div className={classes.volumeLine}>
				<ReactSlider
					style={{flex: 'auto', fontSize: '18px'}}
					highlightColor={colorScheme.positive}
					trackColor={colorScheme.voidaryHover}
					thumbColor={'white'}
					hoverColor={colorScheme.voidary}
					activeColor={colorScheme.voidaryHover}
					min={0} max={MixingControlUtils.maxVolume} step={5} value={partData.volume}
					onChange={(val) => {setPartData({...partData, volume: val})}}
					onRootKeyDown={(evt) => {
						evt.stopPropagation()
					}}
				/>
				<div style={{display: 'table', flex: 0, flexBasis: '2.4em'}}>
					<span style={{display: 'table-cell', textAlign: 'right'}}>
						{partData.volume}
					</span>
				</div>
			</div>
			<div className={classes.miscLine}>
				<span style={{flexBasis: 0, flex: 3}}>
					{!isBeatMachine && <span style={{marginRight: '0.2em'}}>
						<IconsGo.GoNumber style={{fontSize: '1.2em', transform: 'translateY(0.2em)', marginLeft: '-0.1em'}} />
						<ButtonSelect
							mini
							items={iterateMap(TonicInstruments, (instrument, id) => ({
								value: id,
								label: NMNI18n.editorText(language, `${i18nPrefix}instrument.${id}`)
							}))}
							onChange={val => setPartData({...partData, tonicInstrument: val as any})}
							itemFontSize='14px'
							value={partData.tonicInstrument}
							style={{minWidth: '4.8em', marginRight: '0.4em'}}
							disabled={props.playing}
						/>
					</span>}
					<span>
						<IconsTb.TbLetterX style={{fontSize: '1.2em', transform: 'translateY(0.2em)', marginLeft: '-0.2em'}} />
						<ButtonSelect
							mini
							items={iterateMap(DrumlineInstruments, (instrument, id) => ({
								value: id,
								label: NMNI18n.editorText(language, `${i18nPrefix}instrument.${id}`)
							}))}
							onChange={val => setPartData({...partData, drumlineInstrument: val as any})}
							itemFontSize='14px'
							value={partData.drumlineInstrument}
							style={{minWidth: '4.8em', marginRight: '0.4em'}}
							disabled={props.playing}
						/>
					</span>
					{isBeatMachine && <span>
						<IconsTb.TbPercentage style={{fontSize: '1.2em', transform: 'translateY(0.2em)'}} />
						<ButtonSelect
							mini
							items={MixingControlUtils.moduloList().map(item => ({
								value: '' + item,
								label: '' + item
							}))}
							onChange={val => setPartData({...partData, beatModulo: +val})}
							itemFontSize='14px'
							value={'' + partData.beatModulo}
							style={{minWidth: '4.8em', paddingRight: '0.4em'}}
							disabled={props.playing}
						/>
					</span>}
				</span>
				{!isBeatMachine && <span style={{}}>
					<span className={classes.controlLabel}>
						{NMNI18n.editorText(language, `${i18nPrefix}octave`)}
					</span>
					<Button onClick={() => modifyOctave(-1)} mini>{'-'}</Button>
					<span className={classes.controlValue}>
						{(partData.octave < 0 ? '-' : '+') + Math.abs(partData.octave)}
					</span>
					<Button onClick={() => modifyOctave(1)} mini>{'+'}</Button>
				</span>}
			</div>
		</div>
	)
})

function partLabelPrimary(language: LanguageArray, signature: PartSignature | BeatMachineSignature) {
	if(signature.type == 'beatMachine') {
		return NMNI18n.editorText(language, `${i18nPrefix}part.beat_machine`)
	}
	if(signature.type == 'titled') {
		let text = ''
		const label = signature.value
		if(label.type == 'scriptedText') {
			text = label.text + '_' + label.sub
		} else {
			text = label.text
		}
		return NMNI18n.editorText(language, `${i18nPrefix}part.titled`, text)
	}
	return NMNI18n.editorText(language, `${i18nPrefix}part.untitled`, '' + (signature.value + 1))
}

function partLabel(language: LanguageArray, signature: PartSignature | BeatMachineSignature) {
	const label = partLabelPrimary(language, signature)
	if(signature.type != 'beatMachine' && signature.head == 'Na') {
		return label + NMNI18n.editorText(language, `${i18nPrefix}part.accompany`)
	} else {
		return label
	}
}

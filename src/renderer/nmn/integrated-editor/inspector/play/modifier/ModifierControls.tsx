import React, { useContext } from 'react'
import { NMNI18n } from '../../../..'
import { IntegratedEditorContext } from '../../../IntegratedEditor'
import { createUseStyles } from 'react-jss'
import { Button } from '../../component/button'

const useStyles = createUseStyles({
	label: {
		paddingRight: '0.5em'
	},
	value: {
		padding: '0 0.4em',
	}
})

export function ModifierControls(props: {
	speed: number,
	pitch: number,
	onSpeedChange: (val: number) => void,
	onPitchChange: (val: number) => void
}) {
	const i18nPrefix = 'inspector.play.modifier.'
	const { language } = useContext(IntegratedEditorContext)
	const classes = useStyles()

	const changeSpeed = (delta: number) => {
		const newSpeed = props.speed + delta
		if(newSpeed > 4 || newSpeed < 0.1) {
			return
		}
		props.onSpeedChange(newSpeed)
	}
	const changePitch = (delta: number) => {
		const newPitch = props.pitch + delta
		if(newPitch > 48 || newPitch < -48) {
			return
		}
		props.onPitchChange(newPitch)
	}

	return <>
		<div>
			<span className={classes.label}>
				{NMNI18n.editorText(language, `${i18nPrefix}speed`)}
			</span>
			<Button onClick={() => changeSpeed(-0.1)} small>{'-'}</Button>
			<span className={classes.value}>
				{props.speed.toFixed(1)}
			</span>
			<Button onClick={() => changeSpeed(0.1)} small>{'+'}</Button>
		</div>
		<div>
			<span className={classes.label}>
				{NMNI18n.editorText(language, `${i18nPrefix}pitch`)}
			</span>
			<Button onClick={() => changePitch(-0.5)} small>{'-'}</Button>
			<span className={classes.value}>
				{(props.pitch < 0 ? '-' : '+') + Math.abs(props.pitch).toFixed(1)}
			</span>
			<Button onClick={() => changePitch(0.5)} small>{'+'}</Button>
		</div>
	</>
}

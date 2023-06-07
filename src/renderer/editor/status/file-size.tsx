import React from 'react'
import { createUseStyles } from 'react-jss'
import { useI18n } from '../../i18n/i18n'
import { useStyles } from './styles'
import { usePref } from '../../prefs/PrefProvider'

export function StatusFileSize(props: {
	sourceSize: number
	previewSize: number
	showPreviewSize: boolean
}) {
	const LNG = useI18n()
	const classes = useStyles()
	const prefs = usePref()
	const i18nPrefix = 'status.size.'

	const sizeUnit = prefs.getValue<string>('fileSizeUnit')
	const unitCount = {
		'b': 1,
		'kunb': 2.5,
		'kb': 1024,
		'kkunb': 1024 * 2.5,
		'mb': 1024 ** 2,
		'mkunb': 1024 ** 2 * 2.5
	}[sizeUnit]!
	const unitString = LNG(`${i18nPrefix}unit.${sizeUnit}`)

	const formatUnitString = (value: number) => {
		let roundBits = 0
		if(unitCount > 1.1) {
			roundBits = 1
		}
		if(unitCount > 500) {
			roundBits = 2
		}
		if(unitCount > 500 * 1024) {
			roundBits = 3
		}
		return (value / unitCount).toFixed(roundBits) + unitString
	}

	return <>
		<button type='button' className={classes.pill}>
			{formatUnitString(props.sourceSize)}
			{props.showPreviewSize && '/' + formatUnitString(props.previewSize)}
		</button>
	</>
}

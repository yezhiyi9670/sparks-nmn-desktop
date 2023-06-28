import React, { useContext } from 'react'
import { createUseStyles } from 'react-jss'
import { IntegratedEditorContext } from '../IntegratedEditor'
import { useRecreatedStyles } from './styles'
import { NMNI18n } from '../..'

export function StatusFileSize(props: {
	sourceSize: number
	previewSize: number
	showPreviewSize: boolean
}) {
	const { language, prefs, colorScheme } = useContext(IntegratedEditorContext)

	const classes = useRecreatedStyles(colorScheme)
	const i18nPrefix = 'status.size.'

	const sizeUnit = prefs.fileSizeUnit!
	const unitCount = {
		'b': 1,
		'kunb': 2.5,
		'kb': 1024,
		'kkunb': 1024 * 2.5,
		'mb': 1024 ** 2,
		'mkunb': 1024 ** 2 * 2.5
	}[sizeUnit]
	const unitString = NMNI18n.editorText(language, `${i18nPrefix}unit.${sizeUnit}`)

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

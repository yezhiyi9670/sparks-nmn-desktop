import React, { useContext } from 'react'
import { createUseStyles } from 'react-jss'
import { IntegratedEditorContext } from '../IntegratedEditor'
import { useRecreatedStyles } from './styles'
import { NMNI18n } from '../..'

export function StatusProcessTime(props: {
	parseTime: number
	renderTime: number
}) {
	const { language, prefs, colorScheme } = useContext(IntegratedEditorContext)

	const classes = useRecreatedStyles(colorScheme)
	const i18nPrefix = 'status.timing.'

	return <>
		<button type='button' className={classes.pill}>
			{NMNI18n.editorText(language, `${i18nPrefix}both`, "" + props.parseTime, "" + props.renderTime)}
		</button>
	</>
}

import React from 'react'
import { createUseStyles } from 'react-jss'
import { useI18n } from '../../i18n/i18n'
import { useStyles } from './styles'

export function StatusProcessTime(props: {
	parseTime: number
	renderTime: number
}) {
	const LNG = useI18n()
	const classes = useStyles()
	const i18nPrefix = 'status.timing.'

	return <>
		<button type='button' className={classes.pill}>
			{LNG(`${i18nPrefix}both`, props.parseTime, props.renderTime)}
		</button>
	</>
}

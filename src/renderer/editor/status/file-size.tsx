import React from 'react'
import { createUseStyles } from 'react-jss'
import { useI18n } from '../../i18n/i18n'
import { useStyles } from './styles'

export function StatusFileSize(props: {
	sourceSize: number
	previewSize: number
	showPreviewSize: boolean
}) {
	const LNG = useI18n()
	const classes = useStyles()
	const i18nPrefix = 'status.size.'

	return <>
		<button type='button' className={classes.pill}>
			{LNG(`${i18nPrefix}source`, (props.sourceSize / 1024).toFixed(2))}
			{props.showPreviewSize && '/' + LNG(`${i18nPrefix}source`, (props.previewSize / 1024).toFixed(2))}
		</button>
	</>
}

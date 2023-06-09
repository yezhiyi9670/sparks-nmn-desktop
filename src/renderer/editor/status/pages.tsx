import React from 'react'
import { useI18n } from '../../i18n/i18n'
import { useStyles } from './styles'

export function StatusPages(props: {
	pages: number
}) {
	const LNG = useI18n()
	const classes = useStyles()
	const i18nPrefix = 'status.pages.'

	return <>
		<button type='button' className={classes.pill}>
			{props.pages != props.pages ?
				LNG(`${i18nPrefix}nan`) :
				LNG(`${i18nPrefix}value`, props.pages)}
		</button>
	</>
}

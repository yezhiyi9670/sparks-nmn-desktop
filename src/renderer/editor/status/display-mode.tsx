import React from 'react'
import { createUseStyles } from 'react-jss'
import { useI18n } from '../../i18n/i18n'
import { useStyles } from './styles'

type DisplayMode = 'edit' | 'split' | 'preview'
export function StatusDisplayMode(props: {
	value: DisplayMode,
	onChange: (value: DisplayMode) => void
}) {
	const LNG = useI18n()
	const classes = useStyles()
	const i18nPrefix = 'status.displaymode.'

	return <>
		{['edit', 'split', 'preview'].map((mode) => {
			return <button type='button' className={[
				classes.pill,
				...(props.value == mode ? ['active'] : [])
			].join(' ')} style={{color: '#000'}} key={mode} onClick={() => props.onChange(mode as any)}>
				{LNG(i18nPrefix + mode)}
			</button>
		})}
	</>
}

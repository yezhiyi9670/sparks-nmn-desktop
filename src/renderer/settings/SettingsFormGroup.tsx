import React from 'react'
import { createUseStyles } from 'react-jss'
import { PrefRendererInfo } from '../../util/prefs/PrefRenderer'
import { useI18n } from '../i18n/i18n'
import { SettingsFormUpdateHandler, SettingsFormValues } from './SettingsForm'
import { SettingsFormItem } from './SettingsFormItem'

const useStyles = createUseStyles({
	title: {
		marginBlockEnd: '0.38em'
	},
	desc: {
		marginBlockStart: '0.5em',
		whiteSpace: 'pre-wrap'
	}
})

export function SettingsFormGroup(props: {
	i18nPrefix: string
	group: PrefRendererInfo[0]
	values: SettingsFormValues
	onUpdate?: SettingsFormUpdateHandler
}) {
	const LNG = useI18n()
	const group = props.group
	const classes = useStyles()

	return <>
		<h2 className={classes.title}>{LNG(`${props.i18nPrefix}group.${group.group}.title`)}</h2>
		{group.hasDescription && <p className={classes.desc}>
			{LNG(`${props.i18nPrefix}group.${group.group}.desc`)}
		</p>}
		{group.entries.map((entry) => {
			return <SettingsFormItem
				key={entry.key}
				i18nPrefix={props.i18nPrefix}
				entry={entry}
				values={props.values}
				onUpdate={props.onUpdate}
			/>
		})}
	</>
}

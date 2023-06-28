import React, { useContext } from 'react'
import { IntegratedEditorContext } from '../IntegratedEditor'
import { useRecreatedStyles } from './styles'
import { NMNI18n } from '../..'

export function StatusPages(props: {
	pages: number
}) {
	const { language, prefs, colorScheme } = useContext(IntegratedEditorContext)

	const classes = useRecreatedStyles(colorScheme)
	const i18nPrefix = 'status.pages.'

	return <>
		<button type='button' className={classes.pill}>
			{props.pages != props.pages ?
				NMNI18n.editorText(language, `${i18nPrefix}nan`) :
				NMNI18n.editorText(language, `${i18nPrefix}value`, "" + props.pages)}
		</button>
	</>
}

import React, { useContext } from 'react'
import { createUseStyles } from 'react-jss'
import { useRecreatedStyles } from './styles'
import { IntegratedEditorContext } from '../IntegratedEditor'
import { NMNI18n } from '../..'

type DisplayMode = 'edit' | 'split' | 'preview'
export function StatusDisplayMode(props: {
	value: DisplayMode,
	onChange: (value: DisplayMode) => void
}) {
	const { language, prefs, colorScheme } = useContext(IntegratedEditorContext)

	const classes = useRecreatedStyles(colorScheme)
	const i18nPrefix = 'status.displaymode.'

	return <>
		{['edit', 'split', 'preview'].map((mode) => {
			return <button type='button' className={[
				classes.pill,
				...(props.value == mode ? ['active'] : [])
			].join(' ')} style={{color: '#000'}} key={mode} onClick={() => props.onChange(mode as any)}>
				{NMNI18n.editorText(language, i18nPrefix + mode)}
			</button>
		})}
	</>
}

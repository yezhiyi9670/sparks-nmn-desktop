import React, { useContext, useEffect } from 'react'
import { createUseStyles } from 'react-jss'
import { useRecreatedStyles } from './styles'
import { IntegratedEditorContext } from '../IntegratedEditor'
import { NMNI18n } from '../..'
import { getLanguageValue } from '../../util/template'
import { basename } from '../../util/basename'

/**
 * 编辑器的保存状态，同时设置窗口标题
 */
export function StatusDirty(props: {
	isDirty: boolean
	isPreviewDirty: boolean
	filename: string | undefined
	onForceUpdate?: () => void
	onRequestSave?: () => void
}) {
	const { language, prefs, colorScheme } = useContext(IntegratedEditorContext)

	const classes = useRecreatedStyles(colorScheme)
	const i18nPrefix = 'status.dirty.'

	let state = 'new'
	if(props.isDirty) {
		state = 'dirty'
	} else if(props.filename !== undefined) {
		state = 'clean'
	}

	useEffect(() => {
		let state: 'default' | 'newDirty' | 'new' | 'dirty' | 'clean' = 'default'
		if(props.filename === undefined) {
			state = props.isDirty ? 'newDirty' : 'new'
		} else {
			state = props.isDirty ? 'dirty' : 'clean'
		}
		if(prefs.modifyTitle) {
			document.title = getLanguageValue(prefs.modifyTitle[state], props.filename ? basename(props.filename) : '')
		}
	})

	const temporaryFlag = prefs.temporarySave! ? 'Temporary' : ''

	return <>
		<button type='button' className={classes.pill} onClick={props.onForceUpdate}>
			{NMNI18n.editorText(language, i18nPrefix + 'preview.' + (props.isPreviewDirty ? 'dirty' : 'clean'))}
		</button>
		<button type='button' className={classes.pill} onClick={props.onRequestSave}>
			{NMNI18n.editorText(language, i18nPrefix + state + temporaryFlag)}
		</button>
	</>
}

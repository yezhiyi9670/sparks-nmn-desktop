import React, { useEffect } from 'react'
import { createUseStyles } from 'react-jss'
import { useI18n } from '../../i18n/i18n'
import { useStyles } from './styles'

/**
 * 编辑器的保存状态，同时设置窗口标题
 */
export function StatusDirty(props: {
	isDirty: boolean
	isPreviewDirty: boolean
	filename: string | undefined
	onForceUpdate?: () => void
}) {
	const LNG = useI18n()
	const classes = useStyles()
	const i18nPrefix = 'status.dirty.'

	let state = 'new'
	if(props.isDirty) {
		state = 'dirty'
	} else if(props.filename !== undefined) {
		state = 'clean'
	}

	useEffect(() => {
		let state = 'default'
		if(props.filename === undefined) {
			state = props.isDirty ? 'newDirty' : 'new'
		} else {
			state = props.isDirty ? 'dirty' : 'clean'
		}
		document.title = LNG('title.' + state, props.filename ? window.Path.basename(props.filename) : '')
	})

	return <>
		<button type='button' className={classes.pill} onClick={props.onForceUpdate}>
			{LNG(i18nPrefix + 'preview.' + (props.isPreviewDirty ? 'dirty' : 'clean'))}
		</button>
		<button type='button' className={classes.pill}>
			{LNG(i18nPrefix + state)}
		</button>
	</>
}

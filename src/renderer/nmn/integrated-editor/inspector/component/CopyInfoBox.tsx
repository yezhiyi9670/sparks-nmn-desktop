import React, { useContext, useRef } from 'react'
import { IntegratedEditorContext } from '../../IntegratedEditor'
import { useRecreatedStyles } from './styles'

function useStyles() {
	const { colorScheme } = useContext(IntegratedEditorContext)
	return useRecreatedStyles(colorScheme)
}

export function CopyInfoBox(props: {
	value: string
	style?: React.CSSProperties
}) {
	const classes = useStyles()
	const inputRef = useRef<HTMLInputElement>(null)

	function handleFocus() {
		inputRef.current?.select()
	}
	function handleClick() {
		setTimeout(() => {
			inputRef.current?.select()
		}, 0)
	}

	return (
		<input ref={inputRef} onFocus={handleFocus} onClick={handleClick} style={{
			...props.style
		}} className={classes.copyInfoBox} type={'text'} value={props.value} readOnly />
	)
}

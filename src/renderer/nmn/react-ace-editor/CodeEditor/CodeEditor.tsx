import React from 'react'
import AceEditor from 'react-ace'
import 'ace-builds/src-noconflict/ext-searchbox'
import 'ace-builds/src-noconflict/mode-text'
import 'ace-builds/src-noconflict/mode-plain_text'
import 'ace-builds/src-noconflict/theme-tomorrow'
import 'ace-builds/src-noconflict/theme-twilight'
import 'ace-builds/src-noconflict/theme-tomorrow_night'
import 'ace-builds/src-noconflict/ext-language_tools'
import { Ace } from 'ace-builds'

interface CodeEditorProps {
	name: string
	mode: string
	value: string
	onChange?: (val: string) => void
	onCursorChange?: (val: string) => void
	ref: React.RefObject<AceEditor>
	lineWrap?: boolean
	widthFlag?: number
	onLoad?: (editor: Ace.Editor) => void
	annotations?: Ace.Annotation[]
	fontSize?: number
}
/**
 * 代码编辑器
 */
// eslint-disable-next-line react/display-name
export const CodeEditor = React.forwardRef((props: CodeEditorProps, ref: React.ForwardedRef<AceEditor>) => {
	const isMobile = false
	const darkMode = false

	let rd = (props.widthFlag ?? 0).toString()

	return (
		<AceEditor
			name={props.name}
			mode={props.mode}
			theme={darkMode ? 'tomorrow_night' : 'tomorrow'}
			value={props.value}
			height='100%'
			width={`calc(100% - ${rd}px + ${rd}px)`}
			fontSize={props.fontSize ?? 15}
			highlightActiveLine={false}
			onChange={props.onChange}
			onCursorChange={props.onCursorChange}
			setOptions={{
				scrollPastEnd: true,
				enableLiveAutocompletion: true,
				printMarginColumn: 143
			}}
			wrapEnabled={props.lineWrap}
			ref={ref}
			onLoad={props.onLoad}
			annotations={props.annotations}
		/>
	)
})

import React, { createRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createUseStyles } from 'react-jss'
import { randomToken } from '../../util/random'
import { useI18n } from '../i18n/i18n'
import { NMNI18n, SparksNMN } from '../nmn'
import { SparksNMNEditor } from '../nmn/react-ace-editor/SparksNMNEditor'
import { StatusDisplayMode } from './status/display-mode'
import AceEditor from 'react-ace'
import { usePref } from '../prefs/PrefProvider'
import { useImmer } from 'use-immer'
import { createDethrottledApplier } from '../../util/event'
import { useMethod } from '../../util/hook'
import { StatusProcessTime } from './status/process-time'
import { StatusFileSize } from './status/file-size'
import { PreviewCursor, PreviewView } from './preview/PreviewView'

const useStyles = createUseStyles({
	editor: {
		height: '100%',
		display: 'flex',
		flexDirection: 'column'
	},
	groupPreview: {
		height: 0,
		flex: 5,
		overflowY: 'auto'
	},
	groupSeparator: {
		height: '1px',
		background: '#0002'
	},
	groupEdit: {
		height: 0,
		flex: 4,
	},
	groupStatusBar: {
		borderTop: '1px solid #0002',
		height: '28px',
		background: '#F0EEF1',
		whiteSpace: 'nowrap',
		display: 'flex',
		flexDirection: 'row'
	},
	statusBarGroup: {
		padding: '0 8px',
		height: '100%',
		flexGrow: 0,
	},
	statusBarSpacer: {
		height: '100%',
		flex: 'auto'
	},
	hidden: {
		display: 'none'
	}
})

type DisplayMode = 'edit' | 'split' | 'preview'

interface Props {}

// eslint-disable-next-line react/display-name
export const IntegratedEditor = React.forwardRef<IntegratedEditorApi, Props>((props, ref) => {
	const name = useMemo(() => {
		return randomToken(24)
	}, [])
	const LNG = useI18n()
	const prefs = usePref()
	const languageArray = NMNI18n.languages.zh_cn
	const classes = useStyles()
	const editorRef = createRef<AceEditor>()

	// ===== 显示模式 =====
	const prevDisplayMode = useRef<DisplayMode>('split')
	const [ displayMode, setDisplayMode ] = useState<DisplayMode>('split')
	const displayModeChanged = displayMode != prevDisplayMode.current
	prevDisplayMode.current = displayMode
	useLayoutEffect(() => {
		if(displayModeChanged) {
			window.dispatchEvent(new Event('resize')) // 强制编辑器刷新自己的尺寸信息
		}
	})

	// ===== 预览刷新模式 =====
	const updateChoice = prefs.getValue<string>('previewRefresh')
	let updateMode: 'instant' | 'dethrottle' | 'none' = 'none'
	let updateDelay: number = 1000
	if(updateChoice == 'realtime') {
		updateMode = 'instant'
	} else if(updateChoice.startsWith('delay')) {
		updateMode = 'dethrottle'
		updateDelay = +updateChoice.substring(5)
	}
	const parseDethrottler = useMemo(() => createDethrottledApplier(updateDelay), [updateDelay])
	const cursorChangeDethrottler = useMemo(() => createDethrottledApplier(50), [])
	const saveDethrottler = useMemo(() => createDethrottledApplier(100), [])

	// ===== 数值与处理 =====
	const initialValue = ''
	const [ value, setValue ] = useState(initialValue)
	const [ filename, setFilename ] = useState<string | undefined>(undefined)
	const [ cursor, setCursor ] = useState<PreviewCursor | undefined>(undefined)
	const [ renderTiming, setRenderTiming ] = useState(0)
	const [ renderedSize, setRenderedSize ] = useState(0)

	function parseNMN(newValue: string) {
		let startTime = +new Date()
		const result = SparksNMN.parse(newValue)
		return {result: result, time: +new Date() - startTime }
	}
	const [ parseResult, setParseResult ] = useState(() => {
		const parsed = parseNMN(initialValue)
		return {
			result: parsed.result,
			timing: parsed.time
		}
	})
	const updateResult = useMethod((valueOverride?: string) => {
		const parsed = parseNMN(valueOverride ?? value)
		setParseResult({
			result: parsed.result,
			timing: parsed.time
		})
	})

	function handleChange(newValue: string) {
		setValue(newValue)
		if(updateMode == 'instant') {
			updateResult(newValue)
		} else if(updateMode == 'dethrottle') {
			parseDethrottler(updateResult)()
		}
	}
	function handleCursorChangeIn() {
		const editor = editorRef.current?.editor
		if(!editor) {
			return
		}
		const code = editor.session.getValue()
		const cursorPoint = editor.getCursorPosition()
		setCursor({
			code: code,
			position: [cursorPoint.row + 1, cursorPoint.column]
		})
	}
	const handleCursorChange = useMethod((newValue: string) => {
		cursorChangeDethrottler(handleCursorChangeIn)()
	})
	const handlePosition = useMethod((row: number, col: number) => {
		const editor = editorRef.current?.editor
		if(!editor) {
			return
		}
		const newPos = SparksNMN.convertPosition(value, row, col)
		editor.clearSelection()
		editor.moveCursorTo(newPos.row - 1, newPos.col)
		editor.renderer.scrollCursorIntoView(editor.getCursorPosition())
		editor.focus()
	})

	const cursorShown = (displayMode == 'preview') ? undefined : cursor
	const previewView = useMemo(() => {
		const ret = <PreviewView
			result={parseResult.result}
			onPosition={handlePosition}
			language={languageArray}
			cursor={cursorShown}
			onReportSize={setRenderedSize}
			onReportTiming={setRenderTiming}
		/>
		return ret
	}, [parseResult, handlePosition, languageArray, cursorShown])

	const fileSizeMode = prefs.getValue<string>('showFileSize')
	const ret = <div className={classes.editor}>
		<div className={`${classes.groupPreview} ${displayMode == 'edit' ? classes.hidden : ''}`}>
			{previewView}
		</div>
		<div className={`${classes.groupSeparator} ${displayMode != 'split' ? classes.hidden : ''}`} />
		<div className={`${classes.groupEdit} ${displayMode == 'preview' ? classes.hidden : ''}`}>
			<style>
				{`
					.${classes.groupEdit} .ace_editor, .ace_editor.ace_autocomplete {
						font-family: ${prefs.getValue<string>('fontFamily').replace(/(;|\{|\})/g, '')}
					}
				`}
			</style>
			<SparksNMNEditor
				name={name}
				language={languageArray}
				value={value}
				onChange={handleChange}
				onCursorChange={handleCursorChange}
				ref={editorRef}
				issues={parseResult.result.issues}
				fontSize={prefs.getValue<number>('fontSize')}
			/>
		</div>
		<div className={classes.groupStatusBar}>
			<div className={classes.statusBarGroup}>
				<StatusDisplayMode value={displayMode} onChange={setDisplayMode} />
			</div>
			<div className={classes.statusBarSpacer} />
			<div className={classes.statusBarGroup}>
				{prefs.getValue<string>('showProcessTime') == 'on' && (
					<StatusProcessTime parseTime={parseResult.timing} renderTime={renderTiming} />
				)}
				{fileSizeMode != 'off' && (
					<StatusFileSize
						sourceSize={new TextEncoder().encode(value).length}
						previewSize={renderedSize}
						showPreviewSize={fileSizeMode == 'all'}
					/>
				)}
			</div>
		</div>
	</div>

	// ===== Editor API =====
	const getValue = useMethod(() => {
		return value
	})
	const handleSave = useMethod(() => {
		updateResult()
		/* TODO[yezhiyi9670]: File logic */
	})
	useImperativeHandle(ref, () => ({
		getValue: () => {
			return getValue()
		},
		triggerSave: () => {
			return saveDethrottler(handleSave)()
		}
	}))

	return ret
})

export interface IntegratedEditorApi {
	getValue: () => string
	triggerSave: () => void
}

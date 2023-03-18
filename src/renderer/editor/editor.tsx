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
import { callRef, useMethod } from '../../util/hook'
import { StatusProcessTime } from './status/process-time'
import { StatusFileSize } from './status/file-size'
import { PreviewCursor, PreviewView } from './preview/PreviewView'
import { StatusDirty } from './status/dirty-state'
import { useExportTemplate } from '..'

const useStyles = createUseStyles({
	editor: {
		height: '100%',
		display: 'flex',
		flexDirection: 'column'
	},
	groupPreview: {
		height: 0,
		flex: 4,
		overflowY: 'auto'
	},
	groupSeparator: {
		height: '1px',
		background: '#0002'
	},
	groupEdit: {
		height: 0,
		flex: 3,
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
	const exportTemplate = useExportTemplate()
	const languageArray = NMNI18n.languages.zh_cn
	const classes = useStyles()
	const editorRef = createRef<AceEditor>()
	const [ sessionToken, setSessionToken ] = useState(() => randomToken(24))

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

	// ===== 数值与处理 =====
	const initialValue = ''
	const [ value, setValue ] = useState(initialValue)
	const [ filename, setFilename ] = useState<string | undefined>(undefined)
	const [ isDirty, setIsDirty ] = useState(false)
	const [ isPreviewDirty, setIsPreviewDirty ] = useState(false)
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
		setIsPreviewDirty(false)
	})

	function handleChange(newValue: string) {
		setValue(newValue)
		setIsDirty(true)
		setIsPreviewDirty(true)
		cursorChangeDethrottler(handleCursorChangeIn)()
		if(updateMode == 'instant') {
			updateResult(newValue)
		} else if(updateMode == 'dethrottle') {
			parseDethrottler(updateResult)()
		}
	}
	const handleCursorChangeIn = useMethod(() => {
		const editor = editorRef.current?.editor
		if(!editor) {
			return
		}
		const code = editor.session.getValue()
		const cursorPoint = editor.getCursorPosition()
		if(cursor && cursor.position[1] == cursorPoint.column && cursor.position[0] == cursorPoint.row + 1 && cursor.code == code) {
			return
		}
		setCursor({
			code: code,
			position: [cursorPoint.row + 1, cursorPoint.column]
		})
	})
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

	function handleEditorKey(evt: React.KeyboardEvent) {
		if(evt.key == 'Escape') { // 键盘导航无障碍：允许 ESC 键离开编辑器
			callRef(editorRef, api => api.editor.blur())
		}
	}

	function handleForceUpdate() {
		if(isPreviewDirty) {
			updateResult()
		}
	}

	const fileSizeMode = prefs.getValue<string>('showFileSize')
	const ret = <div className={classes.editor}>
		<div className={`${classes.groupPreview} ${displayMode == 'edit' ? classes.hidden : ''}`}>
			{previewView}
		</div>
		<div className={`${classes.groupSeparator} ${displayMode != 'split' ? classes.hidden : ''}`} />
		<div className={`${classes.groupEdit} ${displayMode == 'preview' ? classes.hidden : ''}`} onKeyDown={handleEditorKey}>
			<style>
				{`
					.${classes.groupEdit} .ace_editor, .ace_editor.ace_autocomplete {
						font-family: ${prefs.getValue<string>('fontFamily').replace(/(;|\{|\})/g, '')}
					}
				`}
			</style>
			<SparksNMNEditor
				key={sessionToken}
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
				<StatusDirty
					filename={filename}
					isDirty={isDirty}
					isPreviewDirty={isPreviewDirty}
					onForceUpdate={handleForceUpdate}
				/>
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
	const resetSession = () => {
		callRef(editorRef, api => {
			api.editor.destroy()
		})
		setSessionToken(randomToken(24))
	}
	const getValue = useMethod(() => {
		return value
	})
	const getIsDirty = useMethod(() => {
		return isDirty
	})
	const getFilename = useMethod(() => {
		return filename
	})
	const handleNew = useMethod(() => {
		setValue('')
		updateResult('')
		setDisplayMode('split')
		setFilename(undefined)
		setIsDirty(false)
		setIsPreviewDirty(false)
		resetSession()
	})
	const handleBeforeSave = useMethod(() => {
		if(!isPreviewDirty) {
			return
		}
		updateResult()
	})
	const handleSaved = useMethod((filename: string) => {
		setFilename(filename)
		setIsDirty(false)
	})
	const handleOpen = useMethod((data: {path: string, content: string}) => {
		setValue(data.content)
		updateResult(data.content)
		setDisplayMode(prefs.getValue<'split' | 'preview'>('displayMode'))
		setFilename(data.path)
		setIsDirty(false)
		setIsPreviewDirty(false)
		resetSession()
	})
	const handleExport = useMethod(() => {
		if(isPreviewDirty) {
			updateResult()
		}
		const fields = SparksNMN.render(parseResult.result.result, languageArray)
		let title = LNG('preview.new_title')
		if(filename !== undefined) {
			title = window.Path.parse(filename).name
		}
		const packedData = 'window.efData=' + JSON.stringify(fields.map((field) => ({
			...field,
			element: field.element.outerHTML
		}))).replace(/</g, "\\x3c") + ';document.title=' + JSON.stringify(title).replace(/</g, "\\x3c")
		const htmlData = exportTemplate.replace('/*{script:content:data}*/', packedData)
		return htmlData
	})
	useImperativeHandle(ref, () => ({
		getValue: () => {
			return getValue()
		},
		getIsDirty: () => {
			return getIsDirty()
		},
		getFilename: () => {
			return getFilename()
		},
		triggerBeforeSave: () => {
			return handleBeforeSave()
		},
		triggerSaved: (filename: string) => {
			return handleSaved(filename)
		},
		triggerNew: () => {
			return handleNew()
		},
		triggerOpen: (data) => {
			return handleOpen(data)
		},
		exportHtml: () => {
			return handleExport()
		}
	}))

	return ret
})

export interface IntegratedEditorApi {
	getValue: () => string
	getIsDirty: () => boolean
	getFilename: () => string | undefined
	triggerBeforeSave: () => void
	triggerSaved: (filename: string) => void
	triggerNew: () => void
	triggerOpen: (data: {path: string, content: string}) => void
	exportHtml: () => string
}

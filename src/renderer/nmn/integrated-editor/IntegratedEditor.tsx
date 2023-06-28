import React, { createRef, useContext, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createUseStyles } from 'react-jss'
import { randomToken } from '../util/random'
import { NMNI18n, SparksNMN } from '..'
import { SparksNMNEditor } from '../react-ace-editor/SparksNMNEditor'
import { StatusDisplayMode } from './status/display-mode'
import AceEditor from 'react-ace'
import { createDethrottledApplier } from '../util/event'
import { callRef, useMethod } from '../util/hook'
import { StatusProcessTime } from './status/process-time'
import { StatusFileSize } from './status/file-size'
import { PreviewCursor, PreviewView } from './preview/PreviewView'
import { StatusDirty } from './status/dirty-state'
import { StatusPages } from './status/pages'
import { LanguageArray } from '../i18n'
import { basenameName } from '../util/basename'

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
	},
	'@media print': {
		groupSeparator: {
			display: 'none'
		},
		groupEdit: {
			display: 'none'
		},
		groupStatusBar: {
			display: 'none'
		}
	}
})

type DisplayMode = 'edit' | 'split' | 'preview'

export interface IntegratedEditorColorScheme {
	voidary?: string,
	voidaryHover?: string,
	voidarySelected?: string,
	voidaryActive?: string,
}
const defaultColorScheme: IntegratedEditorColorScheme = {
	voidary: '#F0EEF1',
	voidaryActive: '#0002',
	voidaryHover: '#0001',
	voidarySelected: '#00000019'
}

export interface IntegratedEditorPrefs {
	fontFamily?: string,
	fontSize?: number,
	autoSave?: 'off' | 'overwrite',
	previewRefresh?: string,
	showFileSize?: 'off' | 'source' | 'all',
	fileSizeUnit?: 'b' | 'kunb' | 'kb' | 'kkunb' | 'mb' | 'mkunb'
	showProcessTime?: 'off' | 'on'
	previewMaxWidth?: number,
	previewAlign?: 'left' | 'center',
	displayMode?: 'split' | 'preview',
	modifyTitle?: {
		"default": string,
		"new": string,
		"newDirty": string,
		"clean": string,
		"dirty": string
	},

	importantWarning?: {text: string, height: number},
	temporarySave?: boolean
}
const defaultEditorPrefs: IntegratedEditorPrefs = {
	fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', 'Sarasa Mono SC'",
	fontSize: 14.5,
	autoSave: 'off',
	previewRefresh: 'delay2000',
	showFileSize: 'all',
	fileSizeUnit: 'kb',
	showProcessTime: 'on',
	previewMaxWidth: 1000,
	previewAlign: 'left',
	displayMode: 'split',
	modifyTitle: undefined,

	importantWarning: undefined,
	temporarySave: false
}

interface Context {
	language: LanguageArray
	prefs: IntegratedEditorPrefs
	colorScheme: IntegratedEditorColorScheme
}
export const IntegratedEditorContext = React.createContext<Context>({
	language: NMNI18n.languages.zh_cn,
	prefs: defaultEditorPrefs,
	colorScheme: defaultColorScheme
})

interface Props {
	language: LanguageArray
	editorPrefs?: IntegratedEditorPrefs
	colorScheme?: IntegratedEditorColorScheme
	onRequestSave?: () => void
}

// eslint-disable-next-line react/display-name
export const IntegratedEditor = React.forwardRef<IntegratedEditorApi, Props>((props: Props, ref) => {
	const contextValue: Context = useMemo(() => ({
		language: props.language,
		prefs: {
			...defaultEditorPrefs,
			...props.editorPrefs,
		},
		colorScheme: {
			...defaultColorScheme,
			...props.colorScheme
		}
	}), [props.colorScheme, props.editorPrefs, props.language])

	return (
		<IntegratedEditorContext.Provider value={contextValue}>
			<__IntegratedEditor ref={ref} onRequestSave={props.onRequestSave} />
		</IntegratedEditorContext.Provider>
	)
})

interface __Props {
	onRequestSave?: () => void
}

// eslint-disable-next-line react/display-name
export const __IntegratedEditor = React.forwardRef<IntegratedEditorApi, __Props>((props: __Props, ref) => {
	const { language, prefs, colorScheme } = useContext(IntegratedEditorContext)

	const name = useMemo(() => {
		return randomToken(24)
	}, [])
	const languageArray = NMNI18n.languages.zh_cn
	const classes = useStyles()
	const editorRef = useRef<AceEditor>(null)
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
	const updateChoice = prefs.previewRefresh!
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
	const [ renderedPages, setRenderedPages ] = useState(NaN)

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
			onReportPages={setRenderedPages}
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

	const fileSizeMode = prefs.showFileSize!
	const ret = <div className={classes.editor}>
		<div className={`${classes.groupPreview} ${displayMode == 'edit' ? classes.hidden : ''}`}>
			{previewView}
		</div>
		<div className={`${classes.groupSeparator} ${displayMode != 'split' ? classes.hidden : ''}`} />
		<div className={`${classes.groupEdit} ${displayMode == 'preview' ? classes.hidden : ''}`} onKeyDown={handleEditorKey}>
			<style>
				{`
					.${classes.groupEdit} .ace_editor, .ace_editor.ace_autocomplete {
						font-family: ${prefs.fontFamily!}
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
				fontSize={prefs.fontSize!}
			/>
		</div>
		<div className={classes.groupStatusBar} style={{background: colorScheme.voidary}}>
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
					onRequestSave={props.onRequestSave}
				/>
				<StatusPages
					pages={renderedPages}
				/>
				{prefs.showProcessTime! == 'on' && (
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
		setDisplayMode(prefs.displayMode!)
		setFilename(data.path)
		setIsDirty(false)
		setIsPreviewDirty(false)
		resetSession()
	})
	const handleExport = useMethod((template: string, localFontLocation: string) => {
		if(isPreviewDirty) {
			updateResult()
		}
		const fields = SparksNMN.render(parseResult.result.result, languageArray)
		const pagedFields = SparksNMN.paginize(parseResult.result.result, fields, languageArray).result
		let title = NMNI18n.editorText(language, 'preview.new_title')
		if(filename !== undefined) {
			title = basenameName(filename)
		}
		const packedData = 'window.efData=' + JSON.stringify(pagedFields.map((field) => ({
			...field,
			element: field.element.outerHTML
		}))).replace(/</g, "\\x3c") + ';document.title=' + JSON.stringify(title).replace(/</g, "\\x3c")
		const htmlData = template
			.replace('/*{script:content:data}*/', packedData)
			.replace('/*{script:content:flags}*/', 'window.localFontLocation = ' + JSON.stringify(
				localFontLocation
			))
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
		exportHtml: (template: string, localFontLocation: string) => {
			return handleExport(template, localFontLocation)
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
	exportHtml: (template: string, localFontLocation: string) => string
}

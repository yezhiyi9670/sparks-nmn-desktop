import React, { createContext, createRef, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createUseStyles } from 'react-jss'
import { AppBar } from './appbar/appbar'
import { AboutDialog } from './dialog/about'
import { HintDialog } from './dialog/hint/HintDialog'
import { SettingsDialog } from './dialog/settings/settings'
import { IntegratedEditor, IntegratedEditorApi } from './editor/editor'
import ErrorBoundary from './ErrorBoundary'
import { I18nProvider, useI18n } from './i18n/i18n'
import { PrefProvider, usePref } from './prefs/PrefProvider'
import hintDialogEntries from './dialog/hint/entries'
import { HintController, HintControllerApi } from './dialog/hint/hint'
import { useOnceEffect } from '../util/event'
import { SparksNMN } from './nmn'
import { callRef, useMethod } from '../util/hook'
import { ToastProvider, useToast } from './dialog/toast/ToastProvider'
import $ from 'jquery'

document.title = 'Sparks NMN Desktop'

const useStyles = createUseStyles({
	main: {
		borderTop: '1px solid #0002',
		height: 'calc(100% - 1px)',
		display: 'flex',
		flexDirection: 'row',
		userSelect: 'none'
	},
	appbar: {
		flexGrow: 0,
		flexShrink: 0,
		width: 56,
		height: '100%',
		background: '#F0EEF1',
		borderRight: '1px solid #0002'
	},
	content: {
		flex: 'auto',
		height: '100%'
	}
})

const exportCooldown = 1000
function AppIn() {
	const classes = useStyles()
	const LNG = useI18n()
	const hintApiRef = createRef<HintControllerApi>()
	const editorApiRef = createRef<IntegratedEditorApi>()
	const showToast = useToast()
	const prefs = usePref()

	const fileFiltersOpen: Electron.FileFilter[] = [
		{name: LNG('browse.format.spnmn'), extensions: ['spnmn', 'spnmn.txt']},
		{name: LNG('browse.format.all'), extensions: ['*']}
	]
	const fileFiltersSave: Electron.FileFilter[] = [
		{name: LNG('browse.format.spnmn'), extensions: ['spnmn']},
		{name: LNG('browse.format.spnmn_txt'), extensions: ['spnmn.txt']},
		{name: LNG('browse.format.all'), extensions: ['*']}
	]

	function dirtyConfirm() {
		return new Promise((resolve) => {
			callRef(editorApiRef, async api => {
				callRef(hintApiRef, async hint => {
					let ch = true
					if(api.getIsDirty()) {
						ch = await hint.invoke('unsavedChanges')
					}
					resolve(ch)
				}, () => resolve(true))
			}, () => resolve(true))
		})
	}
	async function newDocument() {
		callRef(editorApiRef, async api => {
			if(await dirtyConfirm()) {
				api.triggerNew()
			}
		})
	}
	async function recordOpenTimes() {
		const times = Math.min(prefs.getValue<number>('openTimes') + 1, 999)
		await prefs.setValueAsync('openTimes', times)
		await prefs.commit()
		if(times > 3) {
			callRef(hintApiRef, hint => {
				hint.trigger('rate')
			})
		}
	}
	async function openDocument() {
		callRef(editorApiRef, async api => {
			if(await dirtyConfirm()) {
				const data = await window.FileSystem.browseOpenText(LNG('browse.open'), fileFiltersOpen)
				if(undefined === data) {
					return
				}
				const content = data.content
				if(content === undefined) {
					showToast(LNG('toast.open_fail', window.Path.basename(data.path)))
					return
				}
				await recordOpenTimes()
				api.triggerOpen({path: data.path, content})
			}
		})
	}
	async function saveDocument() {
		callRef(editorApiRef, async api => {
			api.triggerBeforeSave()
			await saveIn()
		})
	}
	async function saveIn() {
		callRef(editorApiRef, async api => {
			const filename = api.getFilename()
			if(filename === undefined) {
				await saveAsIn()
				return
			}
			if(!api.getIsDirty()) {
				return
			}
			const result = await window.FileSystem.saveText(filename, api.getValue())
			if(result) {
				api.triggerSaved(filename)
			} else {
				showToast(LNG('toast.save_fail', window.Path.basename(filename)))
				await saveAsIn()
			}
		})
	}
	async function saveAs() {
		callRef(editorApiRef, async api => {
			api.triggerBeforeSave()
			await saveAsIn()
		})
	}
	async function saveAsIn() {
		callRef(editorApiRef, async api => {
			const filename = await window.FileSystem.browseSave(LNG('browse.save'), fileFiltersSave)
			if(filename === undefined) {
				return
			}
			console.log(filename)
			const result = await window.FileSystem.saveText(filename, api.getValue())
			if(result) {
				api.triggerSaved(filename)
			} else {
				showToast(LNG('toast.save_fail', window.Path.basename(filename)))
				await saveAsIn()
			}
		})
	}
	const autoSave = useMethod(() => {
		if(prefs.getValue<string>('autoSave') == 'off') {
			return
		}
		callRef(editorApiRef, async api => {
			if(api.getIsDirty() && api.getFilename() !== undefined) {
				await saveIn()
			}
		})
	})
	const lastExportTime = useRef(0)
	function checkExportCooldown() {
		if(+new Date() - lastExportTime.current < exportCooldown) {
			return false
		}
		lastExportTime.current = +new Date()
		return true
	}
	async function exportHtmlIn(path: string, editorApi: IntegratedEditorApi) {
		const exportContent = editorApi.exportHtml()
		const basename = window.Path.basename(path)
		if(await window.FileSystem.saveText(path, exportContent)) {
			showToast(LNG('toast.exported', basename))
		} else {
			showToast(LNG('toast.export_fail', basename))
		}
	}
	function exportHtml() {
		if(!checkExportCooldown()) {
			return
		}
		callRef(editorApiRef, api => {
			callRef(hintApiRef, async hint => {
				const filename = api.getFilename()
				if(filename === undefined) {
					showToast(LNG('toast.save_before_export'))
					return
				}
				if(!await hint.invoke('largeHtml')) {
					return
				}
				const parsedFn = window.Path.parse(filename)
				const exportPath = window.Path.join(parsedFn.dir, parsedFn.name + '.html')
				await exportHtmlIn(exportPath, api)
			})
		})
	}
	function printHtml() {
		if(!checkExportCooldown()) {
			return
		}
		callRef(editorApiRef, api => {
			callRef(hintApiRef, async hint => {
				if(!await hint.invoke('printEssence')) {
					return
				}
				const filename = api.getFilename()
				const tempPath = await window.FileSystem.getTempPath()
				let exportPath = ''
				if(filename === undefined || prefs.getValue<string>('tempHtmlLocation') == 'temp') {
					exportPath = window.Path.join(tempPath, 'print.html')
				} else {
					const parsedFn = window.Path.parse(filename)
					exportPath = window.Path.join(parsedFn.dir, parsedFn.name + '.html')
				}
				// 直接启动浏览器并不能实现追加 `#print` 参数，因此用另一个 HTML 来引导
				const prePath = window.Path.join(tempPath, 'print-pre.html')
				const preHtml = '<script>location.href=' + JSON.stringify(
					'file://' + exportPath.replace(/\\/g, '/') + '#print'
				).replace('/</g', "\\x3c") + '</script>'
				if(!await window.FileSystem.saveText(prePath, preHtml)) {
					showToast(LNG('toast.print_fail'))
					return
				}
				await exportHtmlIn(exportPath, api)
				if(!await window.FileSystem.openHtml(prePath)) {
					showToast(LNG('toast.print_launch_fail'))
				}
			})
		})
	}
	// 自动保存
	useOnceEffect(() => {
		let interval = setInterval(() => {
			autoSave()
		}, 45000)
		return () => {
			clearInterval(interval)
		}
	})
	
	async function handleAppBarItem(key: string) {
		if(key == 'about') {
			setAboutOpen(true)
		} else if(key == 'settings') {
			setSettingsOpen(true)
		} else if(key == 'save') {
			saveDocument()
		} else if(key == 'save_as') {
			saveAs()
		} else if(key == 'new') {
			await newDocument()
		} else if(key == 'open') {
			await openDocument()
		} else if(key == 'export') {
			exportHtml()
		} else if(key == 'print') {
			printHtml()
		}
	}
	async function openDocumentPath(path: string) {
		callRef(editorApiRef, async api => {
			const data = await window.FileSystem.openText(path)
			const content = data.content
			if(content === undefined) {
				showToast(LNG('toast.open_fail', window.Path.basename(data.path)))
				return
			}
			await recordOpenTimes()
			api.triggerOpen({path: data.path, content})
		})
	}
	// 处理命令行打开文件
	useOnceEffect(() => {
		const handleOpenFile = async() => {
			const filename = await window.AppMain.queryOpen()
			if(filename === undefined) {
				return
			}
			openDocumentPath(filename)
		}
		handleOpenFile()
	})
	// 处理拖拽打开文件
	function hackDrag(evt: React.DragEvent) {
		evt.dataTransfer.dropEffect = 'copy'
		evt.stopPropagation()
		evt.preventDefault()
	}
	function handleDrag(evt: React.DragEvent) {
		if(evt.dataTransfer.files.length == 0) {
			return
		}
		const path = evt.dataTransfer.files[0].path
		openDocumentPath(path)
	}

	// ===== 关闭事件 =====
	const handleClose = useMethod(async () => {
		if(await dirtyConfirm()) {
			window.AppMain.close()
		}
	})
	useOnceEffect(() => {
		window.AppMain.setClose(handleClose)
	})

	// ===== 对话框 =====
	const [ aboutOpen, setAboutOpen ] = useState(false)
	const [ settingsOpen, setSettingsOpen ] = useState(false)
	const aboutDialog = useMemo(() => (
		<AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
	), [aboutOpen])
	const settingsDialog = useMemo(() => (
		<SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
	), [settingsOpen])

	// ===== 提示弹窗 =====
	const hintController = useMemo(() => (
		<HintController entries={hintDialogEntries} ref={hintApiRef} />
	), [hintApiRef])
	useOnceEffect(() => {
		const api = hintApiRef.current
		if(api) {
			api.trigger('welcome')
		}
	})

	// ===== 键盘事件 =====
	useEffect(() => {
		const keyHandler = (evt: KeyboardEvent) => {
			if(evt.ctrlKey && evt.key == 'i') {
				window.AppMain.openDevTools()
			} else if(evt.ctrlKey) {
				if(evt.altKey && evt.key == 's') {
					saveAs()
				} else if(evt.key == 's') {
					saveDocument()
				} else if(evt.key == 'n') {
					newDocument()
				} else if(evt.key == 'o') {
					openDocument()
				} else if(evt.key == 'r') {
					callRef(editorApiRef, api => {
						api.triggerBeforeSave()
					})
				} else if(evt.key == 'p') {
					printHtml()
				}
			}
		}
		window.addEventListener('keydown', keyHandler)
		return () => {
			window.removeEventListener('keydown', keyHandler)
		}
	})

	return (
		<div className={classes.main} onDragOver={hackDrag} onDrop={handleDrag}>
			<div className={classes.appbar}>
				<AppBar onItemClick={handleAppBarItem} />
			</div>
			<div className={classes.content}>
				<IntegratedEditor ref={editorApiRef} />
			</div>
			{aboutDialog}
			{settingsDialog}
			{hintController}
		</div>
	)
}

function App() {
	const prefs = usePref()

	return <I18nProvider languageKey={prefs.getValue<string>('language')}>
		<AppIn />
	</I18nProvider>
}

const ExportTemplateContext = createContext('')

export function useExportTemplate() {
	return useContext(ExportTemplateContext)
}

SparksNMN.loadFonts(() => {
	$.get('static/export-template.html', (data) => {
		createRoot(document.getElementById('root')!).render(
			<ErrorBoundary fallback={(recover) => (<>
				<div style={{padding: '16px'}}>
					<h1>寄！Rendering error</h1>
					<p>An error occured in this application.</p>
					<button type='button' onClick={() => recover()}>Try to recover</button>
				</div>
			</>)}>
				<ExportTemplateContext.Provider value={data.toString() as string}>
					<PrefProvider>
						<ToastProvider>
							<App />
						</ToastProvider>
					</PrefProvider>
				</ExportTemplateContext.Provider>
			</ErrorBoundary>
		)
		setTimeout(() => {
			window.AppMain.loaded()
		}, 1)
	})
})

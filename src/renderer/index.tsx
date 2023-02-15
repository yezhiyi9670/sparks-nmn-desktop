import React, { createRef, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { callRef } from '../util/hook'

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

function AppIn() {
	const classes = useStyles()
	const LNG = useI18n()
	const hintApiRef = createRef<HintControllerApi>()
	const editorApiRef = createRef<IntegratedEditorApi>()

	useEffect(() => {
		document.title = LNG('title.default')
	})
	
	async function handleAppBarItem(key: string) {
		if(key == 'about') {
			setAboutOpen(true)
		} else if(key == 'settings') {
			setSettingsOpen(true)
		} else if(key == 'save') {
			callRef(editorApiRef, api => api.triggerSave())
		}
	}

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
				if(evt.key == 's') {
					callRef(editorApiRef, api => api.triggerSave())
				}
			} else {
				
			}
		}
		window.addEventListener('keydown', keyHandler)
		return () => {
			window.removeEventListener('keydown', keyHandler)
		}
	})

	return (
		<div className={classes.main}>
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

SparksNMN.loadFonts(() => {
	createRoot(document.getElementById('root')!).render(
		<ErrorBoundary fallback={(recover) => (<>
			<div style={{padding: '16px'}}>
				<h1>寄！Rendering error</h1>
				<p>An error occured in this application.</p>
				<button type='button' onClick={() => recover()}>Try to recover</button>
			</div>
		</>)}>
			<PrefProvider>
				<App />
			</PrefProvider>
		</ErrorBoundary>
	)
})

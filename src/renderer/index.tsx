import React, { ReactNode, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createUseStyles } from 'react-jss'
import { AppBar } from './appbar/appbar'
import { AboutDialog } from './dialog/about'
import { SettingsDialog } from './dialog/settings/settings'
import { IntegratedEditor } from './editor/editor'
import ErrorBoundary from './ErrorBoundary'
import { I18nProvider } from './i18n/i18n'
import { SwitchableLanguageProvider } from './i18n/SwitchableLanguage'
import { PrefProvider, usePref } from './prefs/PrefProvider'

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

function App() {
	const classes = useStyles()
	const prefs = usePref()

	const [ aboutOpen, setAboutOpen ] = useState(false)
	const [ settingsOpen, setSettingsOpen ] = useState(false)

	function handleAppBarItem(key: string) {
		if(key == 'about') {
			setAboutOpen(true)
		} else if(key == 'settings') {
			setSettingsOpen(true)
		}
	}

	const aboutDialog = useMemo(() => (
		<AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
	), [aboutOpen])
	const settingsDialog = useMemo(() => (
		<SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
	), [settingsOpen])

	return <I18nProvider languageKey={prefs.getValue<string>('language')}>
		<div className={classes.main}>
			<div className={classes.appbar}>
				<AppBar onItemClick={handleAppBarItem} />
			</div>
			<div className={classes.content}>
				<IntegratedEditor />
			</div>
			{aboutDialog}
			{settingsDialog}
		</div>
	</I18nProvider>
}

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

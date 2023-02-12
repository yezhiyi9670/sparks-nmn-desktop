import React from 'react'
import { createRoot } from 'react-dom/client'
import { createUseStyles } from 'react-jss'
import { AppBar } from './appbar/appbar'
import { IntegratedEditor } from './editor/editor'
import { SwitchableLanguageProvider } from './i18n/SwitchableLanguage'

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

	return <div className={classes.main}>
		<div className={classes.appbar}>
			<AppBar />
		</div>
		<div className={classes.content}>
			<IntegratedEditor />
		</div>
	</div>
}

createRoot(document.getElementById('root')!).render(<SwitchableLanguageProvider defaultValue='zh_cn'>
	<App />
</SwitchableLanguageProvider>)

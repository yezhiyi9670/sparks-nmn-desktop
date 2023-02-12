import React, { useState } from 'react'
import { createUseStyles } from 'react-jss'
import { useI18n } from '../i18n/i18n'
import { StatusDisplayMode } from './status/display-mode'

const useStyles = createUseStyles({
	editor: {
		height: '100%',
		display: 'flex',
		flexDirection: 'column'
	},
	groupPreview: {
		height: 0,
		flex: 5,
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
	},
	statusBarGroup: {
		margin: '0 8px',
		height: '100%'
	}
})

interface IntegratedEditorProps {}

export function IntegratedEditor(props: IntegratedEditorProps) {
	const LNG = useI18n()
	const classes = useStyles()

	const [ displayMode, setDisplayMode ] = useState<'edit' | 'split' | 'preview'>('split')
	
	return <div className={classes.editor}>
		<div className={classes.groupPreview}></div>
		<div className={classes.groupSeparator}></div>
		<div className={classes.groupEdit}></div>
		<div className={classes.groupStatusBar}>
			<div className={classes.statusBarGroup}>
				<StatusDisplayMode value={displayMode} onChange={setDisplayMode} />
			</div>
		</div>
	</div>
}

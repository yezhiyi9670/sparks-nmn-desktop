import React, { useContext } from 'react'
import { createUseStyles } from 'react-jss'
import { IntegratedEditorContext } from '../IntegratedEditor'
import { useRecreatedStyles } from './styles'
import { NMNI18n } from '../..'

const useStyles = createUseStyles({
	group: {
		width: '100%',
		display: 'flex',
		flexDirection: 'row',
		height: '100%'
	},
	progressBarWrapper: {
		flex: 'auto',
		minWidth: '50px',
		padding: '8px 0',
		paddingRight: '8px'
	},
	progressBarOuter: {
		height: '100%',
		background: '#3333',
		position: 'relative'
	},
	progressBarInner: {
		height: '100%',
		width: '50%',
		background: '#333',
		position: 'absolute'
	}
})

export function StatusExporting(props: {
	exporting: string
	exportProgress: [number, number]
}) {
	const { language, prefs, colorScheme } = useContext(IntegratedEditorContext)

	const classes = useRecreatedStyles(colorScheme)
	const classesIn = useStyles()
	const i18nPrefix = 'status.exporting.'

	const ratio = Math.min(100, Math.max(0, props.exportProgress[0] / props.exportProgress[1] * 100))

	return <div className={classesIn.group}>
		{props.exporting != '' && <>
			<button type='button' disabled className={classes.pill}>
				{ratio == 100 ? NMNI18n.editorText(language, `${i18nPrefix}encoding`) : NMNI18n.editorText(language, `${i18nPrefix}rendering`)}
			</button>
			<div className={classesIn.progressBarWrapper}>
				<div className={classesIn.progressBarOuter}>
					<div className={classesIn.progressBarInner} style={{
						width: ratio + '%'
					}} />
				</div>
			</div>
		</>}
	</div>
}

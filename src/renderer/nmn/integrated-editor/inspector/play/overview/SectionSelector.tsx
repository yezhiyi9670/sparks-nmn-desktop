import React, { ReactNode, memo, useContext } from 'react'
import { Linked2MusicArticle } from '../../../../parser/des2cols/types'
import { SequenceIteration } from '../../../../parser/sequence/types'
import { createUseStyles } from 'react-jss'
import { Button, ButtonSpacer } from '../../component/button'
import { NMNI18n } from '../../../..'
import { IntegratedEditorContext } from '../../../IntegratedEditor'

const useStyles = createUseStyles({
	container: {
		padding: '12px',
		paddingTop: 0,
		overflowY: 'auto',
	},
	containerIn: {
		display: 'flex',
		flexDirection: 'row',
		flexWrap: 'wrap',
	},
	pill: {
		flex: 'auto',
	}
})

const i18nPrefix = 'inspector.play.overview.'

// eslint-disable-next-line react/display-name
export const SectionSelector = memo((props: {
	article: Linked2MusicArticle
	iteration: SequenceIteration
	value: number
	onChange: (val: number) => void
}) => {
	const classes = useStyles()
	const { article, iteration } = props
	const { language } = useContext(IntegratedEditorContext)

	// 生成按钮列表
	let buttons: ReactNode[] = []
	let walkPtr = 0
	for(let i = 0; i < article.sectionCount; i++) {
		while(walkPtr < iteration.sections.length && iteration.sections[walkPtr].index < i) {
			walkPtr += 1
		}
		const included = iteration.sections[walkPtr]?.index == i
		buttons.push(
			<Button
				disabled={!included}
				selected={props.value == i}
				onClick={() => props.onChange(i)}
				key={i}
				classes={[classes.pill]}
				style={{
					fontSize: '16px',
					borderWidth: '0',
					borderBottomWidth: '1px',
				}}
				index={i}
				title={(() => {
					if(!included) {
						return NMNI18n.editorText(language, `${i18nPrefix}section_unavailable`)
					}
					const seconds = iteration.sections[walkPtr].cumulativeLengthMillis / 1000
					const timeSeconds = seconds % 60
					const timeMinutes = Math.floor(seconds / 60)
					if(timeMinutes == 0) {
						return NMNI18n.editorText(language, `${i18nPrefix}time_seconds`, timeSeconds.toFixed(1))
					} else {
						return NMNI18n.editorText(language, `${i18nPrefix}time_minutes`, timeMinutes.toFixed(0), timeSeconds.toFixed(1))
					}
				})()}
			>
				{article.parts[0].notes.sections[i].ordinal + 1}
			</Button>
		)
	}

	return (
		<div className={classes.container} data-tag="container">
			<div className={classes.containerIn} data-tag="containerIn">
				{buttons}
				<div style={{flex: 20}}></div>
			</div>
		</div>
	)
})

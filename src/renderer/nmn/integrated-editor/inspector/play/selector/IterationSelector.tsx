import React, { forwardRef, memo, useContext } from 'react'
import { Linked2Article } from '../../../../parser/des2cols/types'
import { createUseStyles } from 'react-jss'
import { Button, ButtonGroup, ButtonMargin } from '../../component/button'
import { SequenceArticle } from '../../../../parser/sequence/types'
import { IntegratedEditorContext } from '../../../IntegratedEditor'
import * as Icons from 'react-icons/vsc'
import { NMNI18n } from '../../../..'

const useStyles = createUseStyles({
	void: {
		padding: '12px',
		paddingTop: 0,
	},
	scroller: {
		padding: '12px',
		paddingTop: 0,
		overflowX: 'auto',
		'&>*': {
			flexShrink: 0
		}
	},
	label: {
		display: 'table',
		fontSize: '15px',
	}
})

const i18nPrefix = 'inspector.play.selector.'

type IterationSelectorProps = {
	article: Linked2Article
	sequence: SequenceArticle
	value: number
	onChange: (val: number) => void
}
// eslint-disable-next-line react/display-name
export const IterationSelector = forwardRef<HTMLDivElement, IterationSelectorProps>((props, ref) => {
	const classes = useStyles()
	const { language } = useContext(IntegratedEditorContext)
	const { article, sequence } = props

	const onIterSelect = (index: number) => {
		props.onChange(index)
	}

	return sequence.iterations.length > 0 ? (<>
		<ButtonGroup ref={ref} classes={[classes.scroller]}>
			<span className={classes.label}>
				<span style={{verticalAlign: 'middle', display: 'table-cell'}}>{NMNI18n.editorText(language, `${i18nPrefix}iter_number`)}</span>
			</span>
			<ButtonMargin />
			<Button
				selected={props.value == 0}
				onClick={() => onIterSelect(0)}
				title={NMNI18n.editorText(language, `${i18nPrefix}ignore_repeats`)}
				index={0}
			>
				<Icons.VscCircleSlash style={{transform: 'translateY(0.13em)'}} />
			</Button>
			<ButtonMargin />
			{sequence.iterations.map((iteration, index) => {
				if(index == 0) {
					return undefined
				}
				return (
					<Button
						key={index}
						selected={props.value == index}
						onClick={() => onIterSelect(index)} style={{borderLeft: index == 1 ? undefined : 'none'}}
						index={index}
					>
						<span style={{fontFamily: 'RomanItalic'}}>
							{iteration.number}{'.'}
						</span>
					</Button>
				)
			})}
		</ButtonGroup>
	</>) : (
		<div className={classes.void}>
			{NMNI18n.editorText(language, `${i18nPrefix}no_sections`)}
		</div>
	)
})

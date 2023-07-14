/* eslint-disable react/display-name */
import React, { ReactNode, forwardRef, useContext } from 'react'
import { IntegratedEditorContext } from '../../IntegratedEditor'
import { useRecreatedStyles } from './styles'
import { ReactSelect, ReactSelectItem } from './react-select'

function useStyles() {
	const { colorScheme } = useContext(IntegratedEditorContext)
	return useRecreatedStyles(colorScheme)
}

type ButtonGroup = {
	children: ReactNode
	style?: React.CSSProperties
	classes?: string[]
}
export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroup>((props, ref) => {
	const classes = useStyles()

	return <div ref={ref} className={[classes.buttonGroup, ...(props.classes ?? [])].join(' ')} style={props.style}>
		{props.children}
	</div>
})

export function Button(props: {
	children?: ReactNode
	title?: string
	small?: boolean
	mini?: boolean
	large?: boolean
	selected?: boolean
	disabled?: boolean
	onClick?: () => void
	style?: React.CSSProperties
	classes?: string[]
	index?: number
	onMouseDown?: () => void
	onMouseUp?: () => void
}) {
	const classes = useStyles()

	return <button
		title={props.title}
		className={
			[`${classes.button} ${props.small ? classes.buttonSmall : ''} ${props.large ? classes.buttonLarge : ''} ${props.selected ? 'active' : ''} ${props.mini ? classes.buttonMini : ''}`,
				...(props.classes ?? [])
			].join(' ')
		}
		onClick={props.onClick}
		disabled={props.disabled}
		style={props.style}
		data-index={props.index}
		onMouseDown={props.onMouseDown}
		onMouseUp={props.onMouseUp}
	>
		{props.children}
	</button>
}

export function ButtonMargin() {
	const classes = useStyles()
	return <div className={classes.buttonMargin}></div>
}

export function ButtonSpacer() {
	const classes = useStyles()
	return <div className={classes.buttonSpacer}></div>
}

export function ButtonSelect(props: {
	items: ReactSelectItem[]
	small?: boolean
	large?: boolean
	mini?: boolean
	value: string
	onChange?: (val: string) => void
	style?: React.CSSProperties
	itemFontSize?: number | string
	disabled?: boolean
}) {
	const classes = useStyles()
	const { colorScheme } = useContext(IntegratedEditorContext)

	return (
		<ReactSelect
			className={`${classes.button} ${props.small ? classes.buttonSmall : ''} ${props.large ? classes.buttonLarge : ''} ${props.mini ? classes.buttonMini : ''}`}
			style={{flex: 'auto', ...props.style}}
			onChange={props.onChange}
			value={props.value}
			items={props.items}
			backgroundColor={colorScheme.voidary}
			itemFontSize={props.itemFontSize}
			disabled={props.disabled}
		/>
	)
}

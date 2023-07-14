import React, { ReactNode } from 'react'
import { createUseStyles } from 'react-jss'
import * as Select from '@radix-ui/react-select'
import * as Icons from 'react-icons/vsc'

const useStyles = createUseStyles({
	SelectTrigger: {
		display: 'inline-flex',
		alignItems: 'center'
	},
	SelectContent: {
		boxShadow: '0px 10px 38px -10px rgba(22, 23, 24, 0.35), 0px 10px 20px -15px rgba(22, 23, 24, 0.2)',
		borderRadius: '5px',
		padding: '5px 0',
		border: '1px solid #0002'
	},
	SelectItem: {
		padding: '0.4em',
		cursor: 'pointer',
		'&:hover:not(.disabled)': {
			background: '#0001'
		},
		'&.disabled': {
			opacity: 0.6
		}
	}
})

export type ReactSelectItem = {value: string, label: ReactNode, disabled?: boolean}

export function ReactSelect(props: {
	value: string
	items: ReactSelectItem[]
	selectedHighlight?: string
	onChange?: (val: string) => void
	label?: string
	className?: string
	style?: React.CSSProperties
	backgroundColor?: string
	itemFontSize?: number | string
	disabled?: boolean
}) {
	const classes = useStyles()

	return (
		<Select.Root value={props.value} onValueChange={props.onChange} disabled={props.disabled}>
			<Select.Trigger className={[classes.SelectTrigger, props.className].join(' ')} style={props.style} aria-label={props.label}>
				<Select.Value />
				<Select.Icon style={{marginLeft: 'auto'}}>
					<Icons.VscChevronDown style={{transform: 'translateY(0.13em)'}} />
				</Select.Icon>
			</Select.Trigger>
			<Select.Portal>
				<Select.Content position='item-aligned' className={classes.SelectContent} style={{
					backgroundColor: props.backgroundColor ?? '#FFF'
				}}>
					<Select.Viewport>
						<Select.Group>
							{props.items.map(item => (
								// onMouseDown 用于修复 body 内卡键的问题
								<Select.Item
									onMouseDown={evt => evt.preventDefault()}
									className={[classes.SelectItem, ...(item.disabled ? ['disabled']: [])].join(' ')}
									key={item.value}
									disabled={item.disabled} value={item.value}
									style={{
										...(item.value == props.value && {
											background: props.selectedHighlight ?? '#0002',
											color: props.selectedHighlight ? '#FFF' : 'inherit'
										}),
										fontSize: props.itemFontSize ?? '16px'
									}}
								>
									<Select.ItemText>{item.label}</Select.ItemText>
								</Select.Item>
							))}
						</Select.Group>
					</Select.Viewport>
				</Select.Content>
			</Select.Portal>
		</Select.Root>
	)
}

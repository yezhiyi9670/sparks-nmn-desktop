import React from 'react'
import { createUseStyles } from 'react-jss'
import { useI18n } from '../i18n/i18n'

const useStyles = createUseStyles({
	item: {
		display: 'block',
		width: '100%',
		padding: '8px 0',
		border: '1px solid #0000',
		background: '#0000',
		'&:hover': {
			background: '#0001'
		},
		'&:active': {
			background: '#0002'
		}
	},
	iconContainer: {
		textAlign: 'center',
		fontSize: '24px'
	},
	labelContainer: {
		textAlign: 'center',
		fontSize: '13px'
	}
})

interface AppBarButtonProps {
	i18nPrefix: string
	itemKey: string
	icon: React.ReactNode
	onClick?: () => void
}
export function AppBarButton(props: AppBarButtonProps) {
	const classes = useStyles()
	const LNG = useI18n()

	return <button onClick={props.onClick} type='button' className={classes.item}>
		<div className={classes.iconContainer}>
			{props.icon}
		</div>
		<div className={classes.labelContainer}>
			{LNG(props.i18nPrefix + props.itemKey)}
		</div>
	</button>
}

import React from 'react'
import { createUseStyles } from 'react-jss'
import { randomToken } from '../../../util/random'

const ToastContext = React.createContext((text: string, duration?: number) => {})

let displayToken = ''
export function ToastProvider({ children }: {children: React.ReactNode}) {
	const [ open, setOpen ] = React.useState(false)
	const [ text, setText ] = React.useState('')

	function handleClose() {
		setOpen(false)
	}
	function showSnackbar(text: string, duration: number = 2500) {
		const myToken = randomToken(12)
		displayToken = myToken
		setText(text)
		setOpen(true)
		setTimeout(() => {
			if(myToken == displayToken) {
				setOpen(false)
			}
		}, duration)
	}

	return <>
		<ToastContext.Provider value={showSnackbar}>
			{children}
		</ToastContext.Provider>
		<Toast open={open} text={text} />
	</>
}

export function useToast() {
	return React.useContext(ToastContext)
}

const useStyles = createUseStyles({
	toastbox: {
		position: 'fixed',
		right: '24px',
		bottom: '24px',
		width: 'calc(100% - 48px)',
		maxWidth: '320px',
		padding: '12px',
		background: '#fffbe6', // 此颜色取自开发者工具中的 Warning
		border: '1px solid #f4bd00',
		pointerEvents: 'none',
		userSelect: 'none',
		fontSize: '14px',
		color: '#000D',
		transform: 'translateY(100%) translateY(32px)',
		'&.open': {
			transform: 'none'
		},
		transition: '.35s transform',
		zIndex: 10000,
		lineHeight: 1.5
	}
})

function Toast(props: {
	open: boolean
	text: string
}) {
	const classes = useStyles()

	return (
		<div className={classes.toastbox + ' ' + (props.open ? 'open' : '')}>
			{props.text}
		</div>
	)
}

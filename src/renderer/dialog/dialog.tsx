import React, { ReactNode, useEffect } from 'react'
import { createUseStyles } from 'react-jss'
import { useOnceEffect } from '../../util/event'
import FocusTrap from 'focus-trap-react'

const useStyles = createUseStyles({
	backdrop: {
		position: 'fixed',
		background: '#000',
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
		opacity: 0.5
	},
	dialogTable: {
		position: 'fixed',
		left: 0,
		width: '100%',
		top: 0,
		height: '100%',
		display: 'block',
		pointerEvents: 'none',
		overflow: 'hidden'
	},
	dialogTableIn: {
		display: 'block',
		verticalAlign: 'middle',
		height: '100%',
		overflow: 'hidden'
	},
	dialogWindow: {
		background: '#FFF',
		marginTop: '50vh',
		marginBottom: '-50vh',
		marginLeft: '50%',
		marginRight: '-50%',
		transform: 'translateX(-50%) translateY(-50%)',
		position: 'relative',
		userSelect: 'text',
		padding: '24px 0',
		boxSizing: 'border-box',
		pointerEvents: 'all',
		display: 'flex',
		flexDirection: 'column',
		outline: 'none'
	},
	contentTitle: {
		fontSize: '24px',
		color: '#000',
		paddingBottom: '16px',
		whiteSpace: 'pre',
		padding: '0 24px',
		'&.separator': {
			borderBottom: '1px solid #0002'
		}
	},
	contentBody: {
		fontSize: '14px',
		color: '#444',
		lineHeight: 1.5,
		padding: '0 24px',
		overflowY: 'auto',
		flex: 'auto'
	},
	contentButtons: {
		paddingTop: '16px',
		textAlign: 'right',
		whiteSpace: 'nowrap',
		userSelect: 'none',
		padding: '0 24px',
		'&.separator': {
			borderTop: '1px solid #0002'
		}
	},
	button: {
		border: '1px solid #0002',
		padding: '8px 12px',
		fontSize: '14px',
		background: '#0000',
		marginLeft: '12px',
		'&:hover:not([disabled])': {background: '#0001'}, '&:active:not([disabled])': {background: '#0002'},
		whiteSpace: 'pre',
		'&.positive': {
			background: '#5C6BC0',
			color: '#FFF',
			borderColor: 'transparent',
			'&:hover:not([disabled])': {background: '#3F51B5'}, '&:active:not([disabled])': {background: '#3949AB'},
		},
		'&.negative': {
			background: '#EC407A',
			color: '#FFF',
			borderColor: 'transparent',
			'&:hover:not([disabled])': {background: '#E91E63'}, '&:active:not([disabled])': {background: '#D81B60'},
		},
		'&[disabled]': {
			opacity: 0.75
		}
	},
	outlink: {
		textDecoration: 'none',
		color: '#1E88E5'
	}
})

export type DialogButton = {
	color: 'positive' | 'neutral' | 'negative'
	text: string
	disabled?: boolean
	onClick?: () => void
	focus?: boolean
}
interface Props {
	open: boolean
	title?: string
	children?: ReactNode
	buttons?: DialogButton[]
	width?: number | string
	maxWidth?: number | string
	minWidth?: number | string
	height?: number | string
	maxHeight?: number | string
	minHeight?: number | string
	onEscape?: () => void
	separators?: boolean
}
export function Dialog(props: Props) {
	const classes = useStyles()
	const focusRef = React.createRef<HTMLButtonElement>()
	const selfRef = React.createRef<HTMLDivElement>()
	const [ isOpened, setIsOpened ] = React.useState(props.open)

	function handleEscape() {
		if(props.onEscape) {
			props.onEscape()
		}
	}

	function handleKeyDown(evt: React.KeyboardEvent) {
		if(evt.key == 'Escape') {
			handleEscape()
		}
	}

	useEffect(() => {
		const isOpening = !isOpened && props.open
		if(isOpened != props.open) {
			setIsOpened(props.open)
		}
		if(isOpening) {
			const btn = focusRef.current
			if(!btn) {
				if(selfRef.current) {
					selfRef.current.focus()
				}
				return
			}
			btn.focus()
		}
	}, [isOpened, props.open, focusRef, selfRef])

	const dialogWindow = props.open && <>
		{/* 需要保证没有按钮的对话框能够正常且自动地接收焦点以接收 ESC，并且防止焦点逃出 */}
		<div className={classes.dialogWindow} tabIndex={0} ref={selfRef} style={{
			width: props.width ?? '100%',
			maxWidth: props.maxWidth ?? '600px',
			minWidth: props.minWidth ?? '0',
			height: props.height ?? 'unset',
			maxHeight: props.maxHeight ?? 'calc(100% - 48px)',
			minHeight: props.minHeight ?? '0'
		}}>
				{props.title !== undefined && <div className={classes.contentTitle + ' ' + (props.separators ? 'separator' : '')}>
					{props.title}
				</div>}
				<div className={classes.contentBody}>
					{props.children}
				</div>
				{props.buttons && <div className={classes.contentButtons + ' ' + (props.separators ? 'separator' : '')}>
					{props.buttons.map((btn, index) => {
						return <button
							type='button'
							key={index}
							className={`${classes.button} ${btn.color}`}
							onClick={btn.onClick}
							ref={btn.focus ? focusRef : undefined}
							{...btn.disabled && {disabled: true}}
						>
							{btn.text}
						</button>
					})}
				</div>}
		</div>
	</>
	return <>
		{props.open && <>
			<FocusTrap focusTrapOptions={{ escapeDeactivates: false }}>
				<div>
					<div className={classes.backdrop} onClick={handleEscape}></div>
					<div className={classes.dialogTable} onKeyDown={handleKeyDown}>
						<div className={classes.dialogTableIn}>
							{dialogWindow}
						</div>
					</div>
				</div>
			</FocusTrap>
		</>}
	</>
}

export function OutLink(props: {
	href: string,
	children?: ReactNode,
}) {
	const classes = useStyles()

	function handleClick(evt: React.MouseEvent) {
		evt.preventDefault()
		window.FileSystem.openExternal(props.href)
	}

	return (
		<a
			href={props.href}
			target='_blank'
			rel='noreferrer'
			onClick={handleClick}
			className={classes.outlink}
		>{props.children}</a>
	)
}

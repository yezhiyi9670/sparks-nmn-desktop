import { createUseStyles } from "react-jss";
import ColorScheme from "../ColorScheme";

export const useCheckboxClass = createUseStyles({
	label: {
		'& input[type=checkbox]': {
			display: 'none'
		},
		'&::before': {
			boxSizing: 'border-box',
			display: 'inline-block',
			textAlign: 'center',
			content: "''",
			width: 'calc(1em + 0px)',
			height: 'calc(1em + 0px)',
			background: '#0002',
			verticalAlign: 'middle',
			transform: 'translateY(-1px)',
		},
		'&:hover::before': {
			background: '#00000028'
		},
		'&:active::before': {
			background: '#0003'
		},
	},
	checked: {
		'&::before': {
			background: '#FFF',
			padding: '1px',
			border: '0.3em solid ' + ColorScheme.positive,
		},
		'&:hover::before': {
			background: '#FFF',
			borderColor: ColorScheme.positiveHover
		},
		'&:active::before': {
			background: '#FFF',
			borderColor: ColorScheme.positiveActive
		}
	}
})

import { createUseStyles } from "react-jss";

export const useStyles = createUseStyles({
	pill: {
		verticalAlign: 'middle',
		fontSize: '13.5px',
		padding: '0 8px',
		height: '100%',
		border: 'none',
		background: '#0000',
		color: '#333',
		'&:hover': {
			background: '#0001',
		},
		'&:active': {
			background: '#0002',
		},
		'&.active': {
			background: '#00000019'
		}
	}
})

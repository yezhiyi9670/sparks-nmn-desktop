import { createUseStyles } from "react-jss";
import ColorScheme from "../../ColorScheme";

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
			background: ColorScheme.voidaryHover,
		},
		'&:active': {
			background: ColorScheme.voidaryActive,
		},
		'&.active': {
			background: ColorScheme.voidarySelected
		}
	}
})

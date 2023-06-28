import { createUseStyles } from "react-jss";
import { IntegratedEditorColorScheme } from "../IntegratedEditor";
import { useMemo } from "react";

export const useRecreatedStyles = (colorScheme: IntegratedEditorColorScheme) => {
	const useStyles = useMemo(() => createUseStyles({
		pill: {
			verticalAlign: 'middle',
			fontSize: '13.5px',
			padding: '0 8px',
			height: '100%',
			border: 'none',
			background: '#0000',
			color: '#333',
			'&:hover': {
				background: colorScheme.voidaryHover,
			},
			'&:active': {
				background: colorScheme.voidaryActive,
			},
			'&.active': {
				background: colorScheme.voidarySelected
			}
		}
	}), [colorScheme])

	return useStyles()
}

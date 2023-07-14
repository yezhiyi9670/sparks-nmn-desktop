import { createUseStyles } from "react-jss";
import { IntegratedEditorColorScheme } from "./IntegratedEditor";
import { useMemo } from "react";

export const useRecreatedStyles = (colorScheme: IntegratedEditorColorScheme) => {
	const useStyles = useMemo(() => createUseStyles({
		voidaryButton: {
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

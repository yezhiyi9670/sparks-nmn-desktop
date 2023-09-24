import { createUseStyles } from "react-jss";
import { IntegratedEditorColorScheme } from "../../IntegratedEditor";
import { useMemo } from "react";

export const useRecreatedStyles = (colorScheme: IntegratedEditorColorScheme) => {
	const useStyles = useMemo(() => createUseStyles({
		buttonGroup: {
			display: 'flex',
			flexDirection: 'row'
		},
		button: {
			minWidth: '32px',
			height: '32px',
			fontSize: '18px',
			border: '1px solid #0002',
			borderRadius: 0,
			background: colorScheme.voidary,
			'&:hover:not([disabled])': {
				background: colorScheme.voidaryHover
			},
			'&:active:not([disabled])': {
				background: colorScheme.voidaryActive
			},
			'&[disabled]': {
				opacity: 0.6
			},
			'&.active.active': {
				background: colorScheme.positive,
				color: '#FFF',
				borderColor: 'transparent',
				'&:hover:not([disabled])': {
					background: colorScheme.positiveHover
				},
				'&:active:not([disabled])': {
					background: colorScheme.positiveActive
				},
			},
		},
		buttonLarge: {
			minWidth: '36px',
			height: '36px',
			fontSize: '20px',
		},
		buttonSmall: {
			minWidth: '28px',
			height: '28px',
			fontSize: '16px',
		},
		buttonMini: {
			minWidth: '24px',
			height: '24px',
			fontSize: '14px',
		},
		buttonMargin: {
			flex: 0,
			flexBasis: '12px',
			flexShrink: 0
		},
		buttonSpacer: {
			flex: 'auto'
		},
		copyInfoBox: {
			width: '100%',
			height: '32px',
			background: colorScheme.voidary,
			border: 'none',
			outline: 'none',
			'&:focus': {
				background: colorScheme.voidaryActive
			},
			boxSizing: 'border-box',
			padding: '0 8px',
			fontSize: '15px',
		}
	}), [colorScheme])

	return useStyles()
}

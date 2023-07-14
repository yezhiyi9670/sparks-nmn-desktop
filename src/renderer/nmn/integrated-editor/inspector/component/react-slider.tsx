import React, { useMemo } from 'react'
import * as Slider from '@radix-ui/react-slider'
import { createUseStyles } from 'react-jss'

const useStyles = createUseStyles({
	SliderRoot: {
		position: 'relative',
		display: 'flex',
		alignItems: 'center',
		userSelect: 'none',
		touchAction: 'none',
		height: '1em',
	},
	SliderTrack: {
		position: 'relative',
		flexGrow: 1,
		borderRadius: '114514px',
		height: '0.15em',
	},
	SliderRange: {
		position: 'absolute',
		borderRadius: '114514px',
		height: '100%',
	}
})

const useThumbStyles = (color: string, hoverColor: string, activeColor: string, highlightColor: string) => {
	return useMemo(() => {
		return createUseStyles({
			SliderThumb: {
				display: 'block',
				width: '1em',
				height: '1em',
				backgroundColor: color,
				borderRadius: '114514px',
				border: '2px solid ' + highlightColor,
				'&:hover': { backgroundColor: hoverColor },
				'&:focus': { baclgroundColor: activeColor },
				outline: 'none',
			}
		})
	}, [color, hoverColor, activeColor, highlightColor])()
}

export function ReactSlider(props: {
	min: number
	max: number
	step?: number
	value: number
	className?: string
	style?: React.CSSProperties
	highlightColor?: string
	trackColor?: string
	thumbColor?: string
	hoverColor?: string
	activeColor?: string
	noRange?: boolean
	onChange?: (val: number) => void
	onRootKeyDown?: (evt: React.KeyboardEvent) => void
}) {
	const classes = useStyles()
	const thumbClasses = useThumbStyles(
		props.thumbColor ?? '#FFF', props.hoverColor ?? '#EEE', props.activeColor ?? '#DDD',
		props.highlightColor ?? '#777'
	)

	return (
		<Slider.Root
			min={props.min}
			max={props.max}
			step={props.step}
			value={[props.value]}
			onValueChange={val => props.onChange && props.onChange(val[0])}
			className={[classes.SliderRoot, props.className].join(' ')}
			style={props.style}
			onKeyDown={props.onRootKeyDown}
		>
			<Slider.Track style={{background: props.trackColor ?? '#0002'}} className={classes.SliderTrack}>
				<Slider.Range style={{
					background: props.highlightColor ?? '#0004',
					...(props.noRange && {
						display: 'none'
					})
				}} className={classes.SliderRange} />
			</Slider.Track>
			<Slider.Thumb className={thumbClasses.SliderThumb} style={{
				...(props.noRange && props.value == 0 && {
					borderColor: props.trackColor
				})
			}} />
		</Slider.Root>
	)
}

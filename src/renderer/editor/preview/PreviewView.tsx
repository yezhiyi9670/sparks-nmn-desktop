import React, { useEffect, useRef } from "react"
import { createUseStyles } from "react-jss"
import { NMNLanguageArray, NMNResult } from "../../nmn"
import { SparksNMNPreview } from "../../nmn/react-ace-editor/SparksNMNPreview"
import { usePref } from "../../prefs/PrefProvider"

const useStyles = createUseStyles({
	root: {
		padding: '32px 0',
		width: '100%',
		boxSizing: 'border-box',
		userSelect: 'text'
	}
})

export type PreviewCursor = {
	code: string,
	position: [number, number]
}

export function PreviewView(props: {
	result: NMNResult | undefined
	language: NMNLanguageArray
	onPosition?: (row: number, col: number) => void
	cursor?: PreviewCursor
	onReportTiming?: (value: number) => void
	onReportSize?: (value: number) => void
}) {
	const classes = useStyles()
	const prefs = usePref()

	const prevMaxWidth = useRef(prefs.getValue<number>('previewMaxWidth'))
	const maxWidth = prefs.getValue<number>('previewMaxWidth')
	const updateWidth = prevMaxWidth.current != maxWidth
	prevMaxWidth.current = maxWidth
	useEffect(() => {
		if(updateWidth) {
			window.dispatchEvent(new Event('resize')) // 使 Equifield 更新其宽度
		}
	})

	return (
		<div className={classes.root} style={{
			maxWidth: maxWidth,
			margin: (prefs.getValue<string>('previewAlign') == 'center') ? '0 auto' : ''
		}}>
			<SparksNMNPreview
				result={props.result}
				language={props.language}
				cursor={props.cursor}
				onPosition={props.onPosition}
				onReportTiming={props.onReportTiming}
				onReportSize={props.onReportSize}
			/>
		</div>
	)
}

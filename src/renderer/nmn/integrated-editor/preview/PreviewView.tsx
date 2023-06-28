import React, { createRef, useContext, useEffect, useMemo, useRef } from "react"
import { createUseStyles } from "react-jss"
import { callRef } from "../../util/hook"
import { NMNI18n, NMNLanguageArray, NMNResult } from "../.."
import { SparksNMNPreview } from "../../react-ace-editor/SparksNMNPreview"
import $ from 'jquery'
import { Equifield } from "../../equifield/equifield"
import { IntegratedEditorContext } from "../IntegratedEditor"
import { useOnceEffect } from "../../util/event"

const useStyles = createUseStyles({
	root: {
		padding: '32px 0',
		paddingBottom: '320px',
		width: '100%',
		boxSizing: 'border-box',
		userSelect: 'text',
		minHeight: '100%',
	},
	warningEf: {},
	'@media print': {
		warningEf: {
			display: 'none'
		},
		root: {
			border: 'none !important',
			'& .SparksNMN-sechl': {
				display: 'none'
			}
		},
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
	onReportPages?: (value: number) => void
}) {
	const { language, prefs, colorScheme } = useContext(IntegratedEditorContext)

	const classes = useStyles()
	const warningDivRef = useRef<HTMLDivElement | null>(null)

	const prevMaxWidth = useRef(prefs.previewMaxWidth!)
	const maxWidth = prefs.previewMaxWidth!
	const updateWidth = prevMaxWidth.current != maxWidth
	prevMaxWidth.current = maxWidth
	const hasContent = !props.result || props.result.result.musicalProps

	useEffect(() => {
		if(updateWidth) {
			window.dispatchEvent(new Event('resize')) // 使 Equifield 更新其宽度
		}
		if(!hasContent) {
			props.onReportSize && props.onReportSize(0)
			props.onReportTiming && props.onReportTiming(0)
			props.onReportPages && props.onReportPages(NaN)
		}
	})
	useOnceEffect(() => {
		if(warningDivRef.current) {
			const ef = new Equifield(warningDivRef.current)
			const fontSize = 1.8
			ef.render([{
				element: $('<div></div>').text(prefs.importantWarning?.text ?? '').css({
					whiteSpace: 'pre',
					padding: `${1.8 / fontSize}em`,
					fontSize: `${fontSize * 5}em`,
					width: `${100 / fontSize}em`,
					boxSizing: 'border-box',
					background: '#fffbe6',
					border: `${0.15 / fontSize}em solid #f4bd00`,
					color: '#000D',
					lineHeight: 1.35,
					transformOrigin: 'left top',
					transform: 'scale(0.2)'
				})[0],
				height: prefs.importantWarning?.height ?? 0,
			}])
		}
	})

	const blankPreview = useMemo(() => (
		<PreviewBlank />
	), [])
	const alignMode = prefs.previewAlign!
	console.log(alignMode)
	return (
		<div className={classes.root} style={{
			maxWidth: maxWidth,
			margin: (alignMode == 'center') ? '0 auto' : '',
			borderRight: (alignMode == 'left') ? '1px solid #0002' : ''
		}}>
			{prefs.importantWarning && <div ref={warningDivRef} className={classes.warningEf}></div>}
			{hasContent ? <SparksNMNPreview
				result={props.result}
				language={props.language}
				cursor={props.cursor}
				onPosition={props.onPosition}
				onReportTiming={props.onReportTiming}
				onReportSize={props.onReportSize}
				onReportPages={props.onReportPages}
			/> : blankPreview}
		</div>
	)
}

function PreviewBlank(props: {}) {
	const { language, prefs, colorScheme } = useContext(IntegratedEditorContext)

	const divRef = createRef<HTMLDivElement>()

	useEffect(() => {
		callRef(divRef, div => {
			const ef = new Equifield(div)
			ef.render([
				{
					element: $('<span></span>').css({
						fontSize: '3em',
						fontWeight: 700,
						color: '#999'
					}).text(NMNI18n.editorText(language, 'preview.blank.title'))[0],
					height: 6
				},
				{
					element: $('<span></span>').css({
						fontSize: '2em',
						color: '#999'
					}).text(NMNI18n.editorText(language, 'preview.blank.desc.1'))[0],
					height: 4
				},
				{
					element: $('<span></span>').css({
						fontSize: '2em',
						color: '#999'
					}).text(NMNI18n.editorText(language, 'preview.blank.desc.2'))[0],
					height: 4
				},
			])
		})
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [language])

	return <div ref={divRef}></div>
}

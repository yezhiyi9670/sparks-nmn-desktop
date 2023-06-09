import $ from 'jquery'
import React, { useEffect } from 'react'
import { NMNResult, SparksNMN } from '..'
import { Equifield, EquifieldSection } from '../equifield/equifield'
import { LanguageArray } from '../i18n'
import { lineRendererStats } from '../renderer/article/line/LineRenderer'
import { positionDispatcherStats } from '../renderer/article/line/PositionDispatcher'
import { domPaintStats } from '../renderer/backend/DomPaint'
import { randomToken } from '../util/random'
import { createUseStyles } from 'react-jss'

const useStyles = createUseStyles({
	previewEf: {
		'@media print': {
			'& .wcl-equifield-field[data-label=pageSeparator]': {
				display: 'none'
			}
		}
	}
})

type SparksNMNPreviewProps = {
	result: NMNResult | undefined
	language: LanguageArray
	onPosition?: (row: number, col: number) => void
	logTimeStat?: boolean
	cursor?: {
		code: string,
		position: [number, number]
	}
	onReportTiming?: (value: number) => void
	onReportSize?: (value: number) => void
	onReportError?: (_err: any | undefined) => void
	onReportPages?: (value: number) => void
}
export function SparksNMNPreview(props: SparksNMNPreviewProps) {
	const { onPosition, result, language, logTimeStat } = props

	const classes = useStyles()
	
	const divRef = React.createRef<HTMLDivElement>()

	const token = React.useMemo(() => randomToken(24), [])
	const tokenClass = `SparksNMN-preview-${token}`

	const positionCallback = React.useCallback((row: number, col: number) => {
		if(onPosition) {
			onPosition(row, col)
		}
	}, [onPosition])

	let hasRendered = false
	let timing = 0
	const renderResult = React.useMemo(() => {
		// eslint-disable-next-line react-hooks/exhaustive-deps
		hasRendered = true
		if(result) {
			domPaintStats.measureTime = 0
			domPaintStats.domDrawTime = 0
			lineRendererStats.sectionsRenderTime = 0
			positionDispatcherStats.computeTime = 0
			let startTime = +new Date()
			const renderResult = (() => {
				try {
					let fields1 = SparksNMN.render(result.result, language, positionCallback)
					const paginized = SparksNMN.paginize(result.result, fields1, language)
					const fields = paginized.result
					return {
						fields: fields,
						error: undefined,
						pages: paginized.pages
					}
				} catch(_err) {
					console.error('Rendering error occured', _err)
					return {
						fields: [{
							element: $('<span style="font-size: 2em">Failed to render preview due to error.</span>')[0],
							height: 3
						} as EquifieldSection],
						error: _err,
						pages: NaN
					}
				}
			})()
			// console.log(fields)
			let endTime = +new Date()
			// eslint-disable-next-line react-hooks/exhaustive-deps
			timing = endTime - startTime
			if(logTimeStat) {
				console.log('===== Preview Render Stats =====')
				console.log(renderResult.fields.map(item => item.label))
				console.log('Render took ', endTime - startTime, 'milliseconds')
				console.log('  Measure took ', domPaintStats.measureTime, 'milliseconds')
				console.log('  Dom draw took ', domPaintStats.domDrawTime, 'milliseconds')
				console.log('  Section render took ', lineRendererStats.sectionsRenderTime, 'milliseconds')
				console.log('  Dispatching took ', positionDispatcherStats.computeTime, 'milliseconds')
			}

			return renderResult
		} else {
			return {
				fields: [{
					element: $('<span style="font-size: 2em">Loading preview...</span>')[0],
					height: 3
				}],
				error: undefined,
				pages: NaN
			}
		}
	}, [result, language, logTimeStat, positionCallback])

	useEffect(() => {
		if(hasRendered) {
			if(props.onReportError) {
				props.onReportError(renderResult.error)
			}
			if(props.onReportPages) {
				props.onReportPages(renderResult.pages)
			}
			if(props.onReportTiming) {
				props.onReportTiming(timing)
			}
			if(props.onReportSize) {
				const textData = JSON.stringify(renderResult.fields.map((field) => {
					return {
						...field,
						element: field.element.outerHTML
					}
				})).replace(/</g, "\\x3c")
				props.onReportSize(new TextEncoder().encode(textData).length)
			}
		}
	})
	
	React.useEffect(() => {
		const element = divRef.current
		if(!element) {
			return
		}
		if(!$(element).hasClass(tokenClass)) {
			$(element).addClass(tokenClass)
		}
		let startTime = +new Date()
		const ef = new Equifield(element)
		ef.render(renderResult.fields)
		let endTime = +new Date()
		if(logTimeStat) {
			console.log('Actuation took', endTime - startTime, 'milliseconds')
		}

		return () => {
			ef.destroy()
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [renderResult, logTimeStat, tokenClass])

	React.useEffect(() => {
		if(!result) {
			return
		}
		$(`.${tokenClass} .SparksNMN-sechl`).css({visibility: 'hidden'})
		if(props.cursor) {
			const id = SparksNMN.getHighlightedSection(result.sectionPositions, props.cursor.code, props.cursor.position)
			$(`.${tokenClass} .SparksNMN-sechl-${id}`).css({visibility: 'visible'})
		}
	}, [result, renderResult, props.cursor, tokenClass])

	return <div className={classes.previewEf} ref={divRef}></div>
}

import $ from 'jquery'
import React, { useEffect } from 'react'
import { NMNResult, SparksNMN } from '..'
import { Equifield } from '../equifield/equifield'
import { LanguageArray } from '../i18n'
import { lineRendererStats } from '../renderer/article/line/LineRenderer'
import { positionDispatcherStats } from '../renderer/article/line/PositionDispatcher'
import { domPaintStats } from '../renderer/backend/DomPaint'
import { randomToken } from '../util/random'

type Props = {
	result: NMNResult | undefined
	language: LanguageArray
	efRange?: [string, string]
	onPosition?: (row: number, col: number) => void
	cursor?: {
		code: string,
		position: [number, number]
	}
	onReportError?: (_err: any | undefined) => void
}
export function SparksNMNDisplay(props: Props) {
	const { onPosition, result, language } = props
	
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
	const renderResultFields = React.useMemo(() => {
		// eslint-disable-next-line react-hooks/exhaustive-deps
		hasRendered = true
		if(result) {
			domPaintStats.measureTime = 0
			domPaintStats.domDrawTime = 0
			lineRendererStats.sectionsRenderTime = 0
			positionDispatcherStats.computeTime = 0
			let startTime = +new Date()
			const fields = (() => {
				try {
					const ret = SparksNMN.render(result.result, language, positionCallback)
					if(props.onReportError) {
						props.onReportError(undefined)
					}
					return ret
				} catch(_err) {
					console.error('Rendering error occured', _err)
					if(props.onReportError) {
						props.onReportError(_err)
					}
					return [{
						element: $('<span style="font-size: 2em">Failed to render preview due to error.</span>')[0],
						height: 3
					}]
				}
			})()

			return fields
		} else {
			return [{
				element: $('<span style="font-size: 2em">Loading preview...</span>')[0],
				height: 3
			}]
		}
	}, [result, language, positionCallback])

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

		const labels = renderResultFields.map(field => field.label)
		let startIndex = 0
		let endIndex = labels.length
		if(props.efRange) {
			startIndex = Math.max(0, labels.indexOf(props.efRange[0]))
			endIndex = labels.lastIndexOf(props.efRange[1]) + 1
			if(endIndex == 0) {
				endIndex = labels.length
			}
		}

		ef.render(renderResultFields.slice(startIndex, endIndex))
		let endTime = +new Date()

		return () => {
			ef.destroy()
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [renderResultFields, tokenClass, props.efRange])

	React.useEffect(() => {
		if(!result) {
			return
		}
		$(`.${tokenClass} .SparksNMN-sechl`).css({visibility: 'hidden'})
		if(props.cursor) {
			const id = SparksNMN.getHighlightedSection(result.sectionPositions, props.cursor.code, props.cursor.position)
			$(`.${tokenClass} .SparksNMN-sechl-${id}`).css({visibility: 'visible'})
		}
	}, [result, renderResultFields, props.cursor, tokenClass])

	return <div ref={divRef}></div>
}

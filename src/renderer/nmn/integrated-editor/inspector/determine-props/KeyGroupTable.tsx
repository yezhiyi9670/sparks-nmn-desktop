import React, { ReactNode, useRef } from 'react'
import { createUseStyles } from 'react-jss'
import { Button } from '../component/button'

const useStyles = createUseStyles({
	keyGroup: {
		marginBottom: '12px',
		display: 'table',
		borderCollapse: 'collapse',
		tableLayout: 'fixed',
		width: '100%'
	},
	keyLine: {
	},
	keyCell: {
		padding: 0,
		border: '1px solid #0003',
	}
})

export type KeyGroupButtons<ValueType> = {
	label: ReactNode
	value: ValueType
}[][]

export function KeyGroupTable<ValueType>(props: {
	buttons: KeyGroupButtons<ValueType>
	value: ValueType
	deleteValue?: ValueType
	onSelect: (value: ValueType) => void
}) {
	const classes = useStyles()
	const tableRef = useRef<HTMLTableElement>(null)

	function getCoord() {
		for(let i = 0; i < props.buttons.length; i++) {
			let row = props.buttons[i]
			for(let j = 0; j < row.length; j++) {
				let buttonInfo = row[j]
				if(buttonInfo.value == props.value) {
					return [i, j]
				}
			}
		}
		return undefined
	}
	function handleKeyDown(evt: React.KeyboardEvent) {
		if(!evt.ctrlKey) {
			let handled = true
			if(evt.key == ' ') {
				props.onSelect(props.value)
			} else if(evt.key == 'Delete') {
				if(props.deleteValue !== undefined) {
					props.onSelect(props.deleteValue)
				}
			} else {
				;(() => {
					const delta = {
						'ArrowUp': [-1, 0],
						'ArrowDown': [1, 0],
						'ArrowLeft': [0, -1],
						'ArrowRight': [0, 1],
					}[evt.key]
					if(delta === undefined) {
						handled = false
						return
					}
					let coord = getCoord()
					if(coord === undefined) {
						coord = [0, 0]
					} else {
						coord = [coord[0] + delta[0], coord[1] + delta[1]]
					}
					let row = props.buttons[coord[0]]
					while(row && coord[1] >= row.length) {
						coord[0] += 1
						row = props.buttons[coord[0]]
						coord[1] = 0
					}
					while(row && coord[1] < 0) {
						coord[0] -= 1
						row = props.buttons[coord[0]]
						if(row) coord[1] = row.length - 1
					}
					let btn = row && row[coord[1]]
					if(!btn) {
						return
					}
					props.onSelect(btn.value)
				})()
			}
			if(handled) {
				evt.preventDefault()
				if(tableRef.current) {
					tableRef.current.focus()
				}
			}
		}
	}

	return (
		<table ref={tableRef} className={classes.keyGroup} tabIndex={0} onKeyDown={handleKeyDown}>
			<tbody>
				{props.buttons.map((rowGroup, rowId) => (
					<tr className={classes.keyLine} key={rowId}>
						{rowGroup.map((buttonInfo, colId) => (
							<td className={classes.keyCell} key={colId}>
								<Button
									small
									selected={props.value == buttonInfo.value}
									style={{
										minWidth: '0',
										fontSize: '15px',
										width: '100%',
										border: 'none',
									}}
									tabIndex={-1}
									onMouseDown={() => props.onSelect(buttonInfo.value)}
								>{buttonInfo.label}</Button>
							</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	)
}

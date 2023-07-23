import React from 'react'
import { createUseStyles } from 'react-jss'
import { AppBarButton } from './button'
import entries from './entries'

const useStyles = createUseStyles({
	root: {
		padding: '8px 0',
		boxSizing: 'border-box',
		display: 'flex',
		flexDirection: 'column',
		height: '100%',
		overflow: 'hidden',
		scrollbarWidth: 'none',
	},
	group: {
		flexGrow: 0,
		flexShrink: 0,
	},
	spacer: {
		flexGrow: 1,
		flexShrink: 1
	}
})

interface AppBarProps {
	onItemClick: (key: string) => void
	onItemRightClick: (key: string) => void
}
export function AppBar(props: AppBarProps) {
	const classes = useStyles()

	const entryMapper = (entry: (typeof entries)['entries'][0]) => {
		return <AppBarButton
			key={entry.key}
			i18nPrefix={entries.i18nPrefix}
			itemKey={entry.key}
			icon={entry.icon}
			onClick={() => {props.onItemClick(entry.key)}}
			onRightClick={() => {props.onItemRightClick(entry.key)}}
		/>
	}

	return <div className={classes.root}>
		<div className={classes.group}>
			{entries.entries.map(entryMapper)}
		</div>
		<div className={classes.spacer}></div>
		<div className={classes.group}>
			{entries.bottomEntries.map(entryMapper)}
		</div>
	</div>
}

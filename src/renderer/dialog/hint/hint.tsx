import React, { useCallback, useImperativeHandle, useMemo } from 'react'
import { useImmer } from 'use-immer'
import { findWithKey } from '../../../util/array'
import { usePref } from '../../prefs/PrefProvider'
import { HintEntries } from './entries'
import { HintDialog } from './HintDialog'

export interface HintControllerApi {
	trigger: (key: string) => void
	invoke: (key: string) => Promise<boolean>
}
interface Props {
	entries: HintEntries
	onClose?: (key: string) => void
	onConfirm?: (key: string) => void
}
// eslint-disable-next-line react/display-name
export const HintController = React.forwardRef<HintControllerApi, Props>((props, ref) => {
	const prefs = usePref()

	const [ hintState, updateHintState ] = useImmer(() => {
		const ret: {[_: string]: {
			open: boolean,
			loading: boolean,
			resolver: (_: boolean) => void
		}} = {}
		props.entries.forEach((entry) => {
			ret[entry.key] = {
				open: false,
				loading: false,
				resolver: () => {}
			}
		})
		return ret
	})

	useImperativeHandle(ref, () => {
		const that: HintControllerApi = {
			trigger: (key) => {
				if(key in hintState) {
					const def = findWithKey(props.entries, 'key', key)!
					if(prefs.getValue<boolean>(def.prefKey)) {
						updateHintState(hs => {
							hs[key].loading = false
							hs[key].open = true
							hs[key].resolver = () => {}
						})
					}
				}
			},
			invoke: (key) => {
				if(key in hintState) {
					if(hintState[key].open) {
						return new Promise((resolve) => resolve(false))
					}
					const def = findWithKey(props.entries, 'key', key)!
					if(!prefs.getValue<boolean>(def.prefKey)) {
						return new Promise((resolve) => resolve(true))
					}
					that.trigger(key)
					let resolver: (_: boolean) => void = () => {}
					const ret = new Promise<boolean>((resolve) => {
						resolver = resolve
					})
					updateHintState(hs => {
						hs[key].resolver = resolver
					})
					return ret
				}
				return new Promise((resolve) => resolve(false))
			}
		}
		return that
	})

	const handleDismiss = useCallback(async (entry: HintEntries[0], dismiss: boolean) => {
		if(dismiss) {
			await prefs.setValueAsync(entry.prefKey, false)
			await prefs.commit()
		}
	}, [prefs])

	const { onClose, onConfirm } = props
	const doClose = useCallback(async (entry: HintEntries[0], dismiss: boolean) => {
		updateHintState(hs => {
			hs[entry.key].loading = true
		})
		await handleDismiss(entry, dismiss)
		updateHintState(hs => {
			hs[entry.key].loading = false
			hs[entry.key].open = false
		})
	}, [handleDismiss, updateHintState])
	const handleClose = useCallback(async (entry: HintEntries[0], dismiss: boolean) => {
		if(onClose) {
			onClose(entry.key)
		}
		await doClose(entry, dismiss && !entry.confirm)
		hintState[entry.key].resolver(false)
	}, [doClose, hintState, onClose])
	const handleConfirm = useCallback(async (entry: HintEntries[0], dismiss: boolean) => {
		if(onConfirm) {
			onConfirm(entry.key)
		}
		await doClose(entry, dismiss)
		hintState[entry.key].resolver(true)
	}, [doClose, hintState, onConfirm])

	const dialogs = useMemo(() => props.entries.map((entry) => (
		<HintDialog
			key={entry.key}
			entry={entry}
			onClose={(dismiss) => handleClose(entry, dismiss)}
			onConfirm={(dismiss) => handleConfirm(entry, dismiss)}
			open={hintState[entry.key].open}
			loading={hintState[entry.key].loading}
		/>
	)), [props.entries, hintState, handleClose, handleConfirm])

	return <>
		{dialogs}
	</>
})

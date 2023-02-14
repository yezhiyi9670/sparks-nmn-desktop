import React, { useEffect, useImperativeHandle } from 'react'
import { PrefCommitter, PrefRendererInfo, PrefUpdater, RendererPrefStorage } from '../../util/prefs/PrefRenderer'
import { useImmer } from 'use-immer'
import { SettingsFormGroup } from './SettingsFormGroup'
import { createUseStyles } from 'react-jss'
import { iterateMap } from '../../util/array'

export type SettingsFormApi = {
	save: () => Promise<void>
}
interface Props {
	prefs: RendererPrefStorage
	entries: PrefRendererInfo
	retrievePassAll?: (_: boolean) => void
}
type Value = string | number | boolean
type Validate = 'pass' | 'less' | 'more' | 'invalid'
export type SettingsFormValues = {
	[_: string]: {
		value: Value
		isNumber: boolean
		validate: Validate
	}
}
export type SettingsFormUpdateHandler = (key: string, value: Value, validate: Validate) => void

const i18nPrefix = 'settings.'

const useStyles = createUseStyles({
	separator: {
		marginTop: '1em',
		opacity: 0
	}
})

/**
 * 设置表单
 */
// eslint-disable-next-line react/display-name
export const SettingsForm = React.forwardRef<SettingsFormApi, Props>((props, ref) => {
	const prefs = props.prefs
	const classes = useStyles()

	useImperativeHandle(ref, () => ({
		/**
		 * 保存表单的所有内容，然后提交更改
		 */
		save: async () => {
			let hasChanges = false
			for(let key in values) {
				const value = values[key].isNumber ? (+values[key].value) : values[key].value
				const prevValue = prefs.getValue<Value>(key)
				if(value !== prevValue) {
					await prefs.setValueAsync(key, value)
					hasChanges = true
				}
			}
			if(hasChanges) {
				await prefs.commit()
			}
		}
	}))

	useEffect(() => {
		if(props.retrievePassAll) {
			const passAll = 0 == iterateMap(values, (value) => value.validate).filter(ch => ch != 'pass').length
			props.retrievePassAll(passAll)
		}
	})

	const [ values, updateValues ] = useImmer<SettingsFormValues>(() => {
		const ret: SettingsFormValues = {}
		props.entries.forEach((group) => {
			group.entries.forEach((entry) => {
				if(entry.type == 'boolean') {
					ret[entry.key] = { value: prefs.getValue<boolean>(entry.key), isNumber: false, validate: 'pass' }
				} else if(entry.type == 'number') {
					ret[entry.key] = { value: prefs.getValue<number>(entry.key).toString(), isNumber: true, validate: 'pass' }
				} else {
					ret[entry.key] = { value: prefs.getValue<string>(entry.key), isNumber: false, validate: 'pass' }
				}
			})
		})
		return ret
	})

	function handleChange(key: string, value: Value, validate: Validate) {
		updateValues(v => {
			v[key].value = value
			v[key].validate = validate
		})
	}

	let isFirst = true
	const mappedEntries = props.entries.map((group) => {
		const localFirst = isFirst
		isFirst = false
		return <React.Fragment key={group.group}>
			{!localFirst && <hr className={classes.separator} />}
			<SettingsFormGroup
				i18nPrefix={i18nPrefix}
				group={group}
				values={values}
				onUpdate={handleChange}
			/>
		</React.Fragment>
	})

	return <>
		{mappedEntries}
		<div style={{height: '24px'}}></div>
	</>
})

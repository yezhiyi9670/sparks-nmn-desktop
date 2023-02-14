import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { useOnceEffect } from '../../util/event'
import { PrefData } from '../../util/prefs/PrefBackend'
import { PrefCommitter, PrefUpdater, RendererPrefStorage } from '../../util/prefs/PrefRenderer'

const PrefContext = createContext<RendererPrefStorage>(new RendererPrefStorage({}))

/**
 * 自动的偏好设置提供器
 */
export function PrefProvider(props: {
	children: ReactNode
}) {
	const [ prefStorage, setPrefStorage ] = useState(() => {
		const initialData = window.PrefAPI.getSettings()
		return new RendererPrefStorage(initialData)
	})

	useOnceEffect(() => {
		const handleUpdate = (evt: Electron.IpcRendererEvent, data: PrefData) => {
			console.log('Settings updated', data)
			setPrefStorage(new RendererPrefStorage(data))
		}
		window.PrefAPI.handleSettingsUpdate(handleUpdate)
		Object.assign(window, { prefs: prefStorage })
		return () => {
			window.PrefAPI.offSettingsUpdate(handleUpdate)
		}
	})

	return <PrefContext.Provider value={prefStorage}>
		{props.children}
	</PrefContext.Provider>
}

/**
 * 获取偏好设置
 * 
 * @returns [设置存储对象, 更新设置函数, 提交设置函数]
 */
export function usePref() {
	return useContext(PrefContext)
}

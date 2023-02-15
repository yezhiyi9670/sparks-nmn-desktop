import { app, ipcRenderer } from 'electron'
import { PrefTypes } from '../util/prefs/types'
import { PrefData } from '../util/prefs/PrefBackend'

const PrefAPI = {
	/**
	 * 同步地获取所有设置
	 */
	getSettings: (): PrefData => {
		return ipcRenderer.sendSync('pref_getSettings')
	},
	/**
	 * 异步地设置项目值
	 */
	setSettingsItemAsync: async <T extends PrefTypes.ValueTypes>(
		demandedType: PrefTypes.TypeDescriptor,
		key: string, value: T
	) => {
		const ret: boolean = await ipcRenderer.invoke('pref_setSettingsItem', demandedType, key, value)
		return ret
	},
	/**
	 * 发起设置提交
	 */
	commitSettings: async () => {
		await ipcRenderer.invoke('pref_commitSettings')
	},
	/**
	 * 处理设置更新
	 */
	handleSettingsUpdate: (handler: (event: Electron.IpcRendererEvent, data: PrefData) => void) => {
		ipcRenderer.on('pref_updateSettings', handler)
	},
	/**
	 * 清除
	 */
	offSettingsUpdate: (handler: (event: Electron.IpcRendererEvent, data: PrefData) => void) => {
		ipcRenderer.removeListener('pref_updateSettings', handler)
	}
}

const FileSystem = {
	/**
	 * 在浏览器中打开链接
	 */
	openExternal: (link: string) => {
		ipcRenderer.invoke('openExternal', link)
	}
}

const AppMain = {
	/**
	 * 打开开发者工具
	 */
	openDevTools: () => {
		ipcRenderer.invoke('openDevTools')
	}
}

const Versions = {
	app: '0.1.0'
}

export default {
	PrefAPI, Versions, FileSystem, AppMain
} as {[_: string]: any}

declare global {
	interface Window {
		PrefAPI: typeof PrefAPI,
		Versions: typeof Versions,
		FileSystem: typeof FileSystem,
		AppMain: typeof AppMain
	}
}

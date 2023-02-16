import { ipcRenderer } from "electron"
import { PrefData } from "../../util/prefs/PrefBackend"
import { PrefTypes } from "../../util/prefs/types"

export default {
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

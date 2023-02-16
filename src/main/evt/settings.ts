import { BrowserWindow, ipcMain } from "electron"
import { PrefStorage } from "../../util/prefs/PrefBackend"
import { PrefTypes } from "../../util/prefs/types"

export module EventSettings {
	export function register(win: BrowserWindow, settingsPref: PrefStorage) {
		// 由 Renderer 进行同步读取操作，获取所有偏好设置数据。此操作用于初始化。
		ipcMain.on('pref_getSettings', (evt) => {
			evt.returnValue = settingsPref.data
		})
		// 由 Renderer 发起异步的设置修改操作。
		ipcMain.handle('pref_setSettingsItem', async <T extends PrefTypes.ValueTypes>(
			evt: Electron.IpcMainInvokeEvent, demandedType: PrefTypes.TypeDescriptor,
			key: string, value: T
		) => {
			await settingsPref.setValueAsync(demandedType, key, value)
		})
		// 由 Renderer 发起异步的设置提交操作。
		ipcMain.handle('pref_commitSettings', async (evt) => {
			await settingsPref.saveDataAsync()
			// 设置保存完毕后，请求 Renderer 更新设置
			win.webContents.send('pref_updateSettings', settingsPref.data)
		})
	}
}

import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { PrefTypes } from '../util/prefs/types'
import { PrefBackend } from '../util/prefs/PrefBackend'

function distPath(filename: string) {
	return path.join(app.getAppPath(), 'dist', filename)
}

// 记住上次的窗口大小
PrefBackend.initialize()

;(async () => {
	const windowSizePref = await PrefBackend.createPrefStorage('window-size', false)
	const settingsPref = await PrefBackend.createPrefStorage('settings', true)

	// 创建窗口
	function createWindow() {
		const win = new BrowserWindow({
			width: windowSizePref.getValue('number', 'windowWidth', 1536),
			height: windowSizePref.getValue('number', 'windowHeight', 864),
			show: false,
			webPreferences: {
				nodeIntegration: true,
				contextIsolation: true,
				preload: distPath('preload/index.js')
			}
		})
		win.setMenu(null)
		return win
	}

	// 准备好之后
	app.whenReady().then(() => {
		const win = createWindow()
		if(app.isPackaged) {
			win.loadFile(distPath('public/template.html'))
		} else {
			win.loadURL('http://localhost:8497')
		}

		// 网页加载后再显示窗口，避免出现短时间的空白页面
		win.webContents.on('dom-ready', () => {
			win.show()
			if(!app.isPackaged) {
				win.webContents.openDevTools({mode: 'right'})
			}
		})
		// 记住窗口大小
		win.on('resized', async () => {
			const size = win.getSize()
			await windowSizePref.setValueAsync('number', 'windowWidth', size[0])
			await windowSizePref.setValueAsync('number', 'windowHeight', size[1])
			await windowSizePref.saveDataAsync()
		})
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
		// 打开外链
		ipcMain.handle('openExternal', (evt, link: string) => {
			shell.openExternal(link)
		})
	})
})()

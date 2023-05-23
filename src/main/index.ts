import { app, BrowserWindow } from 'electron'
import path from 'path'
import { PrefTypes } from '../util/prefs/types'
import { PrefBackend } from '../util/prefs/PrefBackend'
import { EventAppMain } from './evt/appmain'
import { EventSettings } from './evt/settings'
import { EventFileSystem } from './evt/filesystem'

function distPath(filename: string) {
	return path.join(app.getAppPath(), 'dist', filename)
}

EventAppMain.init()

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
				preload: distPath('preload/index.js'),
				defaultEncoding: 'UTF-8',
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

		// 窗口的显示由 AppMain 处理 loaded 事件

		// 记住窗口大小
		win.on('resized', async () => {
			const size = win.getSize()
			await windowSizePref.setValueAsync('number', 'windowWidth', size[0])
			await windowSizePref.setValueAsync('number', 'windowHeight', size[1])
			await windowSizePref.saveDataAsync()
		})
		EventAppMain.register(win)
		EventSettings.register(win, settingsPref)
		EventFileSystem.register(win, settingsPref)
	})
})()

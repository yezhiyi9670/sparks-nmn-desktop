import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { PrefBackend } from '../util/prefs/PrefBackend'

function distPath(filename: string) {
	return path.join(app.getAppPath(), 'dist', filename)
}

// 记住上次的窗口大小
PrefBackend.initialize()
const windowSizePref = PrefBackend.createPrefStorage('window-size')

// 创建窗口
function createWindow() {
	const win = new BrowserWindow({
		width: windowSizePref.getValue('number', 'windowWidth', 800),
		height: windowSizePref.getValue('number', 'windowHeight', 600),
		show: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: true,
			preload: distPath('preload/index.js')
		}
	})
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
			win.webContents.openDevTools({mode: 'detach'})
		}
	})
	// 记住窗口大小
	win.on('resized', async () => {
		const size = win.getSize()
		windowSizePref.setValue('number', 'windowWidth', size[0])
		windowSizePref.setValue('number', 'windowHeight', size[1])
		await windowSizePref.saveDataAsync()
	})
})

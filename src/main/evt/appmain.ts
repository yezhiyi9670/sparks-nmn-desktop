import { app, BrowserWindow, ipcMain, systemPreferences } from "electron";

let openingPath: string | undefined = undefined
export module EventAppMain {
	export function init() {
		// 处理打开文件
		const fileArgPos = app.isPackaged ? 1 : 2
		if(process.argv.length > fileArgPos) {
			openingPath = process.argv[fileArgPos]
		}
	}
	export function register(win: BrowserWindow) {
		// 处理关闭事件
		win.on('close', (evt) => {
			evt.preventDefault()
			win.webContents.send('close')
		})
		// 查询要打开的文件
		ipcMain.handle('queryOpen', () => {
			return openingPath
		})
		// 关闭窗口
		ipcMain.handle('close', () => {
			app.exit()
		})
		// 加载完成
		ipcMain.handle('loaded', () => {
			win.show()
			if(!app.isPackaged) {
				win.webContents.openDevTools({mode: 'right'})
			}
		})
		// 打开开发者工具
		ipcMain.handle('openDevTools', (evt) => {
			win.webContents.openDevTools({mode: 'right'})
		})
		// 获取系统主题色
		ipcMain.on('getSystemColor', (evt) => {
			evt.returnValue = systemPreferences.getColor('highlight') ?? '#5C6BC0'
		})
	}
}

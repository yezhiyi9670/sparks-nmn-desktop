import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import fs from 'fs'
import path from "path";
import { DataStore } from "../../util/dataStore";
import { PrefStorage } from "../../util/prefs/PrefBackend";
import child_process from 'node:child_process'

export module EventFileSystem {
	export function register(win: BrowserWindow, settingsPref: PrefStorage) {
		// 打开外链
		ipcMain.handle('openExternal', (evt, link: string) => {
			shell.openExternal(link)
		})
		// 浏览器预览 HTML
		ipcMain.handle('openHtml', async (evt, path: string) => {
			const url = 'file://' + path.replace(/\\/g, '/')
			const preferredBrowser = settingsPref.getValue('string', 'browser', '')
			if(preferredBrowser == '') {
				await shell.openExternal(url)
				return true
			} else {
				return await new Promise((resolve) => {
					child_process.execFile(preferredBrowser, [url], (error) => {
						resolve(!error)
					})
				})
			}
		})
		// 请求用户选择文本文件并打开
		ipcMain.handle('browseOpenText', async (evt, title: string, filters: Electron.FileFilter[]) => {
			const result = await dialog.showOpenDialog(win, {
				title: title,
				filters: filters,
				properties: ['openFile']
			})
			if(result.canceled) {
				return undefined
			}
			const path = result.filePaths[0]
			try {
				const content = (await fs.promises.readFile(path)).toString()
				return { path, content }
			} catch(err) {
				return { path, content: undefined }
			}
		})
		// 请求用户选择保存路径
		ipcMain.handle('browseSave', async (evt, title: string, filters: Electron.FileFilter[]) => {
			const result = await dialog.showSaveDialog(win, {
				title: title,
				filters: filters,
				properties: ['showOverwriteConfirmation']
			})
			const path = result.filePath
			if(path == '') {
				return undefined
			}
			return path
		})
		// 打开文本文件
		ipcMain.handle('openText', async (evt, path: string) => {
			try {
				const content = (await fs.promises.readFile(path)).toString()
				return { path, content }
			} catch(err) {
				return { path, content: undefined }
			}
		})
		// 写入文本文件
		ipcMain.handle('saveText', async (evt, path: string, content: string) => {
			try {
				await fs.promises.writeFile(path, content)
				return true
			} catch(err) {
				return false
			}
		})
		// 写入二进制文件
		ipcMain.handle('saveBinary', async (evt, path: string, content: Uint8Array) => {
			try {
				await fs.promises.writeFile(path, content)
				return true
			} catch(err) {
				return false
			}
		})
		// 获取临时文件夹路径
		ipcMain.handle('getTempPath', async (evt) => {
			const dataPath = DataStore.getDataPath()
			const tempPath = path.join(dataPath, 'temp')
			if(!fs.existsSync(tempPath)) {
				await fs.promises.mkdir(tempPath, {recursive: true})
			}
			return tempPath
		})
		// 获取应用资源文件目录
		ipcMain.on('getResourcePath', (evt) => {
			let resPath = app.getAppPath()
			if(app.isPackaged) {
				resPath += '.unpacked'
			}
			evt.returnValue = resPath
		})
	}
}

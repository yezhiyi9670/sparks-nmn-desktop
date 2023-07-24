import { ipcRenderer } from "electron"

export default {
	/**
	 * 在浏览器中打开链接
	 */
	openExternal: (link: string) => {
		ipcRenderer.invoke('openExternal', link)
	},
	/**
	 * 在配置的浏览器中打开 HTML
	 */
	openHtml: async (path: string): Promise<boolean> => {
		return await ipcRenderer.invoke('openHtml', path)
	},
	/**
	 * 浏览并读取文本文件
	 */
	browseOpenText: async (title: string, filters: Electron.FileFilter[]): Promise<undefined | {
		path: string
		content: string | undefined
	}> => {
		return await ipcRenderer.invoke('browseOpenText', title, filters)
	},
	/**
	 * 浏览文件保存位置
	 */
	browseSave: async (title: string, filters: Electron.FileFilter[]): Promise<string | undefined> => {
		return await ipcRenderer.invoke('browseSave', title, filters)
	},
	/**
	 * 读取文本文件
	 */
	openText: async (path: string): Promise<{
		path: string
		content: string | undefined
	}> => {
		return await ipcRenderer.invoke('openText', path)
	},
	/**
	 * 存储文本文件
	 */
	saveText: async (path: string, content: string): Promise<boolean> => {
		return await ipcRenderer.invoke('saveText', path, content)
	},
	/**
	 * 存储二进制文件
	 */
	saveBinary: async (path: string, content: Uint8Array): Promise<boolean> => {
		return await ipcRenderer.invoke('saveBinary', path, content)
	},
	/**
	 * 获取临时目录
	 */
	getTempPath: async (): Promise<string> => {
		return await ipcRenderer.invoke('getTempPath')
	},
	/**
	 * 获取资源文件目录
	 */
	getResourcePath: (): string => {
		return ipcRenderer.sendSync('getResourcePath')
	},
}

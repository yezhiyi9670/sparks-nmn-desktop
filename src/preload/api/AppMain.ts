import { ipcRenderer } from "electron"

let windowCloseAction = () => {
	AppMain.close()
}
const AppMain = {
	/**
	 * 打开开发者工具
	 */
	openDevTools: () => {
		ipcRenderer.invoke('openDevTools')
	},
	/**
	 * 查询要打开的文件
	 */
	queryOpen: async (): Promise<string | undefined> => {
		return await ipcRenderer.invoke('queryOpen')
	},
	/**
	 * 绑定关闭处理事件
	 */
	setClose: (func: () => void) => {
		windowCloseAction = func
	},
	/**
	 * 关闭窗口
	 */
	close: () => {
		ipcRenderer.invoke('close')
	},
	/**
	 * 报告加载完成
	 */
	loaded: () => {
		ipcRenderer.invoke('loaded')
	}
}
ipcRenderer.on('close', () => {
	windowCloseAction()
})

export default AppMain

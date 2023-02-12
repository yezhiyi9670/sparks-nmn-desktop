import { app, ipcRenderer } from 'electron'

const JSBridge = {}

export default {
	JSBridge
} as {[_: string]: any}

declare global {
	interface Window {
		JSBridge: typeof JSBridge
	}
}

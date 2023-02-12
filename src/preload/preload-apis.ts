import { app, ipcRenderer } from 'electron'

const JSBridge = {
	test: () => {
		console.log('Hello, bridge!')
	}
}

export default {
	JSBridge
} as {[_: string]: any}

declare global {
	interface Window {
		JSBridge: typeof JSBridge
	}
}

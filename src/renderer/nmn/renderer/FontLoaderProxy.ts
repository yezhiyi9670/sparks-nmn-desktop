import { FontLoader } from "./FontLoader"

let fontPhase: 'none' | 'loading' | 'loaded' = 'none'
let pendingRequests: (() => void)[] = []

const fonts = [
	{ family: 'SimSun', name: 'simsun', format: 'woff' },
	{ family: 'SimHei', name: 'simhei', format: 'woff' },
	{ family: 'Deng', name: 'deng', format: 'woff' },
	{ family: 'SparksNMN-EOPNumber', name: 'eop_number', format: 'ttf' },
	{ family: 'SparksNMN-mscore-20', name: 'mscore-20', format: 'ttf' },
	{ family: 'SparksNMN-Bravura', name: 'bravura', format: 'woff' },
]

const tasksRaw = fonts.map(font => ({
	name: font.family,
	url: `${font.name}/${font.name}.${font.format}`
}))

export module FontLoaderProxy {
	export function getState() {
		return fontPhase
	}
	export function requestFontLoad(fontStatic: string, callback?: () => void) {
		if(fontPhase == 'loaded') {
			callback && callback()
			return
		}
		if(fontPhase == 'none') {
			const tasks = tasksRaw.map(task => ({
				...task,
				url: fontStatic + '/' + task.url
			}))
			FontLoader.loadFonts(tasks, () => {
				fontPhase = 'loaded'
				pendingRequests.forEach(func => func())
			})
			fontPhase = 'loading'
		}
		callback && pendingRequests.push(callback)
	}
}

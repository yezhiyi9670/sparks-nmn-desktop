import { FontLoader } from "./FontLoader"

let fontPhase: 'none' | 'loading' | 'loaded' = 'none'
let pendingRequests: (() => void)[] = []

const fonts = [
	{ family: 'Deng', name: 'deng', format: 'woff2' },
	{ family: 'Deng', name: 'deng', format: 'woff2', weight: 'bold' },
	{ family: 'SimSun', name: 'simsun', format: 'woff2' },
	{ family: 'SimSun', name: 'simsun', format: 'woff2', weight: 'bold' },
	{ family: 'SimHei', name: 'simhei', format: 'woff2' },
	{ family: 'SparksNMN-EOPNumber', name: 'eop_number', format: 'ttf' },
	{ family: 'SparksNMN-mscore-20', name: 'mscore-20', format: 'ttf' },
	{ family: 'SparksNMN-Bravura', name: 'bravura', format: 'woff' },
]

const tasksRaw = fonts.map(font => ({
	name: font.family,
	url: `${font.name}/${font.name}${font.weight ? ('-' + font.weight) : ''}.${font.format}`,
	weight: font.weight ?? 'normal'
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
				url: fontStatic + '/' + task.url,
				weight: task.weight
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

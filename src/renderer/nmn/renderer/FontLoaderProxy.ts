import { FontLoader } from "./FontLoader"

let fontPhase: 'none' | 'loading' | 'loaded' = 'none'
let pendingRequests: (() => void)[] = []

const fonts = [
	{ family: 'CommonLight', name: 'noto_sans_sc_light', format: 'woff2', asc: 85, desc: 6 },
	{ family: 'CommonLight', name: 'noto_sans_sc_light', format: 'woff2', weight: 'bold', asc: 85, desc: 6 },
	{ family: 'CommonSerif', name: 'uming_cn_dotfix', format: 'woff2', asc: 85, desc: 6 },
	{ family: 'CommonSerif', name: 'uming_cn_dotfix', format: 'woff2', weight: 'bold', asc: 85, desc: 6 },
	{ family: 'CommonBlack', name: 'wqy_microhei', format: 'woff2' },
	{ family: 'SparksNMN-EOPNumber', name: 'eop_number', format: 'ttf' },
	{ family: 'SparksNMN-mscore-20', name: 'mscore-20', format: 'ttf' },
	{ family: 'SparksNMN-Bravura', name: 'bravura', format: 'woff' },
]

const tasksRaw = fonts.map(font => ({
	name: font.family,
	url: `${font.name}/${font.name}${font.weight ? ('-transformed-' + font.weight) : ''}.${font.format}`,
	weight: font.weight ?? 'normal',
	asc: font.asc,
	desc: font.desc,
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

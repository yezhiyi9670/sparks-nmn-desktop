import { FontLoader } from "./FontLoader"

let fontPhase: 'none' | 'loading' | 'loaded' = 'none'
let pendingRequests: (() => void)[] = []
let pendingProgresses: ((progress: number, total: number) => void)[] = []
let fontLoadProgress: number = 0

const fonts = [
	{ family: 'CommonLight', name: 'noto_sans_sc_light', format: 'woff2', asc: undefined, desc: undefined },
	{ family: 'CommonLight', name: 'noto_sans_sc_light', format: 'woff2', weight: 'bold', asc: undefined, desc: undefined },
	{ family: 'CommonSerif', name: 'uming_cn_dotfix', format: 'woff2' },
	{ family: 'CommonSerif', name: 'uming_cn_dotfix', format: 'woff2', weight: 'bold' },
	{ family: 'CommonBlack', name: 'wqy_microhei', format: 'woff2' },
	{ family: 'Roman', name: 'roman', format: 'woff2' },
	{ family: 'Roman', name: 'roman', format: 'woff2', weight: 'bold' },
	{ family: 'RomanItalic', name: 'roman_italic', format: 'woff2' },
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
	export function requestFontLoad(fontStatic: string, callback?: () => void, progressCallback?: (progress: number, total: number) => void) {
		const totalCount = fonts.length

		progressCallback && progressCallback(fontLoadProgress, totalCount)
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
				pendingRequests = []
			}, () => {
				fontLoadProgress += 1
				pendingProgresses.forEach(func => func(fontLoadProgress, totalCount))
				if(fontLoadProgress == totalCount) {
					pendingProgresses = []
				}
			})
			fontPhase = 'loading'
		}
		callback && pendingRequests.push(callback)
		progressCallback && pendingProgresses.push(progressCallback)
	}
}

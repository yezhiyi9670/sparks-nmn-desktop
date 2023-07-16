export module FontLoader {
	type FontData = {
		name: string
		url: string | string[]
		weight: string
		asc?: number
		desc?: number
	}
	/**
	 * 检测字体是否加载完成
	 */
	export function hasFont(name: string) {
		let values = document.fonts.values()
		let item = values.next()
		while(!item.done) {
			if(item.value.family == name) {
				return true
			}
			item = values.next()
		}
		return false
	}
	/**
	 * 加载字体
	 */
	export function loadFont(data: FontData, callback?: (_: boolean) => void, error?: (_: any) => void) {
		if(document.fonts) {
			let urlList = typeof(data.url) == 'string' ? [data.url] : data.url
			let fontFace = new FontFace(data.name, urlList.map(e => `url('${e}')`).join(','))
			fontFace.weight = data.weight
			if(data.asc !== undefined) {
				fontFace.ascentOverride = data.asc + '%'
			}
			if(data.desc !== undefined) {
				fontFace.descentOverride = data.desc + '%'
			}
			fontFace.load().then((loaded) => {
				document.fonts.add(loaded)
				if(callback) {
					callback(true)
				}
			}).catch((e) => {
				if(error) {
					error(e)
				}
			})
		}
	}
	/**
	 * 加载多个字体
	 */
	export function loadFonts(data: FontData[], finishCallback?: () => void, loadCallback?: () => void) {
		const tasks = data.map(font => ({
			...font,
			state: 'none' as ('none' | 'loading' | 'loaded')
		}))
		const maxLoadOnce = 3
		let loadings = 0
		const startTasks = () => {
			let loaded = 0
			tasks.forEach(task => {
				if(task.state == 'loaded') {
					loaded += 1
				}
				if(task.state != 'none') {
					return
				}
				if(loadings >= maxLoadOnce) {
					return
				}
				loadings += 1
				task.state = 'loading'
				loadFont(task, () => {
					loadings -= 1
					task.state = 'loaded'
					loadCallback && loadCallback()
					startTasks()
				}, () => {
					loadings -= 1
					task.state = 'none'
					setTimeout(() => {
						startTasks()
					}, 1000)
				})
			})
			if(loaded == data.length) {
				if(finishCallback) {
					finishCallback()
				}
			}
		}
		startTasks()
	}
}

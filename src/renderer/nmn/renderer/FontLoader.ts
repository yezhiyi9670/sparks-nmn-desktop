export module FontLoader {
	type FontData = {
		name: string
		url: string
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
	export function loadFont(data: FontData, callback?: (_: boolean) => void) {
		if(hasFont(data.name)) {
			if(callback) {
				callback(false)
			}
		}
		if(document.fonts) {
			let fontFace = new FontFace(data.name, `url('${data.url}')`)
			fontFace.load().then((loaded) => {
				document.fonts.add(loaded)
				if(callback) {
					callback(true)
				}
			})
		}
	}
	/**
	 * 加载多个字体
	 */
	export function loadFonts(data: FontData[], finishCallback?: () => void, loadCallback?: () => void) {
		let loaded = 0
		data.forEach((font) => {
			loadFont(font, (state) => {
				loaded += 1
				if(state) {
					if(loadCallback) {
						loadCallback()
					}
				}
				if(loaded == data.length) {
					if(finishCallback) {
						finishCallback()
					}
				}
			})
		})
	}
}

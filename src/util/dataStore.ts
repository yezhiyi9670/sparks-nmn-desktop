import { app } from "electron"
import path from "path"

export module DataStore {
	export function getDataPath() {
		if(app.isPackaged) {
			if(process.platform == 'win32') {
				// Windows 平台下使用安装路径下的 data 目录
				return path.join(path.dirname(app.getPath('exe')), 'data/')
			} else {
				// Linux/Mac 平台使用主目录中的 .config
				return path.join(app.getPath('home'), '.config/sparks-nmn-desktop/')
			}
		} else {
			// 开发时使用工作目录下的 data 目录
			return path.join(app.getAppPath(), 'data/')
		}
	}
}

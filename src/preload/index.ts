import { contextBridge } from "electron"
import preloadApis from './preload-apis'

for(let key in preloadApis) {
	contextBridge.exposeInMainWorld(key, preloadApis[key])
}

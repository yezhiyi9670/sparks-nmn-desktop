import { app, ipcRenderer } from 'electron'
import { PrefTypes } from '../util/prefs/types'
import { PrefData } from '../util/prefs/PrefBackend'
import path from 'path'
import PrefAPI from './api/PrefAPI'
import Path from './api/Path'
import FileSystem from './api/FileSystem'
import AppMain from './api/AppMain'
import Versions from './api/Versions'

export default {
	PrefAPI, Versions, FileSystem, AppMain, Path
} as {[_: string]: any}

declare global {
	interface Window {
		PrefAPI: typeof PrefAPI,
		Versions: typeof Versions,
		FileSystem: typeof FileSystem,
		AppMain: typeof AppMain,
		Path: typeof Path
	}
}

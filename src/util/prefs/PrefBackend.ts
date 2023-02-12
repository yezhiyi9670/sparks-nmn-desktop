import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { PrefTypes } from './types'

export class PrefBackend {
	static dataPath: string = ''
	/**
	 * 初始化数据目录
	 */
	static initialize() {
		this.dataPath = (() => {
			if(app.isPackaged) {
				if(process.platform == 'win32') {
					// Windows 平台下使用安装路径下的 data 目录
					return path.join(path.dirname(app.getPath('exe')), 'data/prefs')
				} else {
					// Linux/Mac 平台使用主目录中的 .config
					return path.join(app.getPath('home'), '.config/sparks-nmn-desktop/prefs')
				}
			} else {
				// 开发时使用工作目录下的 data 目录
				return path.join(app.getAppPath(), 'data/prefs')
			}
		})()
		if(!fs.existsSync(this.dataPath)) {
			fs.mkdirSync(this.dataPath, {recursive: true})
		}
	}
	/**
	 * 获取数据目录
	 */
	static getDataPath() {
		return this.dataPath
	}
	/**
	 * 获取数据存储
	 */
	static createPrefStorage(namespace: string) {
		return new PrefStorage(this.dataPath, namespace)
	}
}

type PrefData = {
	[key: string]: {
		type: PrefTypes.TypeDescriptor
		value: PrefTypes.ValueTypes
	}
}

export class PrefStorage {
	dataPath: string = ''
	storePath: string = ''
	data: PrefData = {}
	constructor(dataPath: string, namespace: string) {
		this.dataPath = dataPath
		this.storePath = path.join(dataPath, `${namespace}.json`)
		this.initialize()
	}
	/**
	 * 初始化存储文件
	 */
	initialize() {
		if(!fs.existsSync(this.storePath)) {
			fs.writeFileSync(this.storePath, '{}')
		} else {
			this.data = JSON.parse(fs.readFileSync(this.storePath).toString()) as any
		}
	}
	/**
	 * 保存数据
	 */
	async saveDataAsync() {
		await fs.promises.writeFile(this.storePath, JSON.stringify(this.data, undefined, "\t"))
	}
	/**
	 * 获取数值
	 */
	getValue<T extends PrefTypes.ValueTypes>(demandedType: PrefTypes.TypeDescriptor, key: string, defaultValue: T): T {
		if(!PrefTypes.validate(demandedType, defaultValue)) {
			throw new Error(`Inconsistent type ${demandedType} and value ${JSON.stringify(defaultValue)} on key ${key}`)
		}
		if(key in {}) {
			throw new Error(`String ${key} cannot be a preference key`)
		}
		if(key in this.data) {
			let result = this.data[key]
			if(result.type != demandedType) {
				throw new Error(`Inconsistent type ${demandedType} and type ${result.type} on key ${key}`)
			}
			return result.value as T
		}
		return defaultValue
	}
	/**
	 * 存储数值
	 */
	setValue<T extends PrefTypes.ValueTypes>(demandedType: PrefTypes.TypeDescriptor, key: string, value: T) {
		if(!PrefTypes.validate(demandedType, value)) {
			throw new Error(`Inconsistent type ${demandedType} and value ${JSON.stringify(value)} on key ${key}`)
		}
		if(key in {}) {
			throw new Error(`String ${key} cannot be a preference key`)
		}
		if(key in this.data) {
			let result = this.data[key]
			if(result.type != demandedType) {
				throw new Error(`Inconsistent type ${demandedType} and type ${result.type} on key ${key}`)
			}
			result.value = value
		} else {
			this.data[key] = {
				type: demandedType,
				value: value
			}
		}
	}
}

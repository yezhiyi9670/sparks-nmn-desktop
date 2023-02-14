import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { PrefTypes } from './types'
import { PrefDataGetter } from './PrefDataGetter'
import { FileLock } from './FileLock'
import { DataStore } from '../dataStore'

export class PrefBackend {
	static dataPath: string = ''
	/**
	 * 初始化数据目录
	 */
	static initialize() {
		this.dataPath = path.join(DataStore.getDataPath(), 'prefs')
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
	static async createPrefStorage(namespace: string, readOnSet: boolean) {
		const ret = new PrefStorage(this.dataPath, namespace, readOnSet)
		await ret.initializeAsync()
		return ret
	}
}

export type PrefData = {
	[key: string]: {
		type: PrefTypes.TypeDescriptor
		value: PrefTypes.ValueTypes
	}
}

export class PrefStorage {
	dataPath: string = ''
	storePath: string = ''
	lockPath: string = ''
	readOnSet: boolean = false
	data: PrefData = {}
	isDirty: boolean = false
	constructor(dataPath: string, namespace: string, readOnSet: boolean) {
		this.dataPath = dataPath
		this.storePath = path.join(dataPath, `${namespace}.json`)
		this.lockPath = path.join(dataPath, `${namespace}.lock`)
		this.readOnSet = readOnSet
		this.isDirty = false
	}
	/**
	 * 初始化存储文件
	 */
	async initializeAsync() {
		if(!fs.existsSync(this.storePath)) {
			fs.writeFileSync(this.storePath, '{}')
		}
		await this.readDataAsync()
	}
	/**
	 * 读取数据
	 */
	async readDataAsync() {
		await FileLock.waitAsync(this.lockPath)
		const fileHandle = await fs.promises.open(this.storePath, 'r')
		this.data = JSON.parse((await fileHandle.readFile()).toString())
		await fileHandle.close()
		this.isDirty = false
		return
	}
	/**
	 * 保存数据
	 */
	async saveDataAsync() {
		await FileLock.waitAsync(this.lockPath)
		await FileLock.lockAsync(this.lockPath)
		const fileHandle = await fs.promises.open(this.storePath, 'w')
		await fileHandle.writeFile(JSON.stringify(this.data, undefined, "\t"))
		await fileHandle.close()
		await FileLock.unlockAsync(this.lockPath)
		this.isDirty = false
		return
	}
	/**
	 * 获取数值
	 */
	getValue<T extends PrefTypes.ValueTypes>(demandedType: PrefTypes.TypeDescriptor, key: string, defaultValue: T): T {
		return PrefDataGetter.getPrefItem(this.data, demandedType, key, defaultValue)
	}
	/**
	 * 存储数值
	 */
	async setValueAsync<T extends PrefTypes.ValueTypes>(demandedType: PrefTypes.TypeDescriptor, key: string, value: T) {
		if(this.readOnSet && !this.isDirty) {
			await this.readDataAsync()
		}
		this.isDirty = true
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

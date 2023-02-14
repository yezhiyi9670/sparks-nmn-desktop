import { findWithKey } from "../array";
import { PrefData } from "./PrefBackend";
import { PrefDataGetter } from "./PrefDataGetter";
import { PrefTypes } from "./types";
import prefRendererInfo from './entries'

export type PrefRendererItem = (
	{
		key: string
		defaultValue: [PrefTypes.TypeDescriptor, PrefTypes.ValueTypes]
	} & ({
		type: 'string'
	} | {
		type: 'number'
		range: [number, number]
	} | {
		type: 'select'
		choices: string[]
	} | {
		type: 'boolean'
	} | {
		type: 'language'
	})
)

export type PrefRendererList = PrefRendererItem[]

/**
 * 配置选项的描述
 * 
 * i18n 格式：
 * - 组标题 `${prefix}group.${group}.title`
 * - 组描述 `${prefix}group.${group}.desc`
 * - 设置项标题 `${prefix}.item.${key}.title`
 * - 设置项描述 `${prefix}.item.${key}.desc`
 * - 选择选项 `${prefix}.item.${key}.choice.${id}`
 */
export type PrefRendererInfo = {
	group: string
	hasDescription?: boolean
	entries: PrefRendererList
}[]

const prefRendererFullList: PrefRendererList = []
prefRendererInfo.forEach((group) => {
	group.entries.forEach((entry) => {
		prefRendererFullList.push(entry)
	})
})

export class RendererPrefStorage {
	data: PrefData = {}
	constructor(data: PrefData) {
		this.data = data
	}

	/**
	 * 获取数值
	 */
	getValue<T extends PrefTypes.ValueTypes>(key: string): T {
		const prefDef = findWithKey(prefRendererFullList, 'key', key)
		if(!prefDef) {
			throw new Error('Unknown preference item ' + key)
		}
		const demandedType = prefDef.defaultValue[0]
		const realDefault = prefDef.defaultValue[1]
		return PrefDataGetter.getPrefItem<T>(this.data, demandedType, key, realDefault as any)
	}

	/**
	 * 设置数值
	 */
	async setValueAsync<T extends PrefTypes.ValueTypes>(key: string, value: T) {
		const prefDef = findWithKey(prefRendererFullList, 'key', key)
		if(!prefDef) {
			throw new Error('Unknown preference item ' + key)
		}
		const demandedType = prefDef.defaultValue[0]
		return await window.PrefAPI.setSettingsItemAsync(demandedType, key, value)
	}

	/**
	 * 提交更改
	 */
	async commit() {
		await window.PrefAPI.commitSettings()
	}
}

export type PrefUpdater = <T extends PrefTypes.ValueTypes>(key: string, value: T) => void
export type PrefCommitter = () => void

import React from 'react'
import { iterateFirstKey, iterateMap, zipArray } from '../../util/array'
import { randomToken } from '../../util/random'
import { multiReplace, replaceAll } from '../../util/string'
import lang_en_us from './lang/en_us'
import lang_zh_cn from './lang/zh_cn'

interface I18nProviderProps {
	children: React.ReactNode
	languageKey: string
}

export type LanguageFunction = (key: string, ...args: any[]) => string

type RawI18nData = {[_: string]: string | RawI18nData}
type FlattenedI18nData = {[_: string]: string}
/**
 * 拉平多语言数组
 */
export function flattenI18nData(data: RawI18nData) {
	function writeData(prefix: string, data: RawI18nData, dst: FlattenedI18nData) {
		iterateMap(data, (item, key) => {
			const writeKey = prefix + key
			if(typeof item == 'string') {
				dst[writeKey] = item
			} else {
				writeData(writeKey + '.', item, dst)
			}
		})
	}

	const ret: FlattenedI18nData = {}
	writeData('', data, ret)
	return ret
}

/**
 * 提供多语言的上下文
 */
export const I18nContext = React.createContext(Object.assign((key: string, ...args: any[]) => {
	return getLanguageValue('void', key, ...args)
}, { languageKey: 'void' }))

/**
 * 获取多语言解析函数
 */
export function useI18n() {
	return React.useContext(I18nContext)
}

/**
 * 提供多语言字符串
 * @prop languageKey 语言的键名，例如 en_us
 */
export function I18nProvider({languageKey, children}: I18nProviderProps) {
	const i18nFunc = Object.assign((key: string, ...args: any[]) => {
		return getLanguageValue(languageKey, key, ...args)
	}, { languageKey: languageKey })
	return (
		<I18nContext.Provider value={i18nFunc}>
			{children}
		</I18nContext.Provider>
	)
}

/**
 * 获取语言键对应的语言数组
 */
function languageArray(languageKey: string): {[_: string]: string} {
	switch(languageKey) {
		case 'en_us':
			return lang_en_us
		case 'zh_cn':
			return lang_zh_cn
		case 'void':
			return {}
		default:
			throw new Error(`i18n: Unknown language key ${languageKey}`)
	}
}

/**
 * 获取语言值
 * - 给出项目键对应的字符串
 * - 字符串中 ${0}, ${1} 等占位符被替换为 args 中对应的值的 toString。如果 args 不够长，占位符保持原样
 * - 形如 ${$0}, ${$1} 的占位符被解析作 ${0}, ${1}
 * - 若语言中没有对应的项目键，则将原样输出项目键，如果有参数，将写成 item.key(a,b,c) 的形式
 */
export function getLanguageValue(languageKey: string, itemKey: string, ...args: any[]): string {
	const data = languageArray(languageKey)
	if(data[itemKey] === undefined) {
		let str = itemKey
		if(args.length > 0) {
			str += '('
			for(let i = 0; i < args.length; i++) {
				let argStr: string = args[i].toString()
				if(i > 0) {
					str += ','
				}
				str += argStr
			}
			str += ')'
		}
		return str
	}
	let str = data[itemKey]

	// 先将 ${$0}, ${$1} 等变成非常随机的东西，避免通过参数插入的 ${$0} 等造成干扰
	let intermToken = randomToken(32)
	let intermStart = /\$\{\$(\d+)\}/g
	let intermStr = `{${intermToken}$1}`
	let intermRegex = new RegExp("\\{" + intermToken + "(\\d+)\\}", 'g')
	let intermEnd = "${$1}"

	// 第一轮替换
	str = str.replace(intermStart, intermStr)

	// 模板参数替换
	let pairs: [string, string][] = []
	for(let i = 0; i < args.length; i++) {
		let templateStr = '${' + i.toString() + '}'
		let argStr: string = args[i].toString()
		
		pairs.push([templateStr, argStr])
	}
	str = multiReplace(str, pairs)

	// 第二轮替换（还原）
	str = str.replace(intermRegex, intermEnd)

	return str
}

/**
 * 获取可供选择的语言列表
 */
export function getAvailableLanguages() {
	return {
		'void': 'void (debug only)',
		...zipArray(['zh_cn'].map((key) => {
			return [ key, getLanguageValue(key, 'i18n.self_name') ]
		}))
	}
}

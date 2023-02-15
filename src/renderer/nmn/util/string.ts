import { randomToken } from "./random"

function replacePlaceholder() {
	return '{' + randomToken(32) + '}'
}

/**
 * 替换字符串中所有模式串，且保证不重复操作
 * @param haystack 待查找字符串
 * @param needle 模式串
 * @param replace 替换串
 */
export function replaceAll(haystack: string, needle: string, replace: string) {
	return haystack.split(needle).join(replace)
}

/**
 * 替换字符串中多个模式串为对应的替换串，且保证不重复操作 ~~(真的吗？)~~
 * @param haystack 待查找字符串
 * @param pairs 模式串-替换串对
 */
export function multiReplace(haystack: string, pairs: [string, string][]) {
	type Parts = (string | number)[]
	let parts: Parts = [haystack]

	// 模式串替换为数值
	function replaceWithNumber(haystack: string, needle: string, num: number): Parts {
		let split = haystack.split(needle)
		let ret: Parts = []
		
		for(let i = 0; i < split.length; i++) {
			if(i > 0) {
				ret.push(num)
			}
			if(split[i].length > 0) {
				ret.push(split[i])
			}
		}
		return ret
	}

	// 将模式串逐个替换为数值
	for(let idx = 0; idx < pairs.length; idx++) {
		let needle = pairs[idx][0]
		let newParts: Parts = []

		for(let i = 0; i < parts.length; i++) {
			let part = parts[i]
			if(typeof(part) == 'string') {
				newParts = newParts.concat(replaceWithNumber(part, needle, idx))
			} else {
				newParts.push(part)
			}
		}
		
		parts = newParts
	}

	// 将数值全部替换为替换串
	let ret = parts.map((val) => {
		if(typeof(val) == 'string') {
			return val
		}
		return pairs[val][1]
	}).join('')

	return ret
}

/**
 * 字符串能否用作别名
 * 规则：数字、字母、连字符，长度至少2
 */
export function isValidAlias(alias: string) {
	return /^[0-9A-Za-z\-]+$/.test(alias) && alias.length >= 2
}

/**
 * 是否合法日期描述
 */
export function isValidDateStr(str: string) {
	return !isNaN(new Date(str).getDate())
}

/**
 * 寻找下标所在行
 */
export function findLineNumber(code: string, position: number) {
	let lineNumber = 1
	let ptr = 0
	while(ptr < code.length) {
		if(ptr >= position) {
			return lineNumber
		}
		if(code[ptr] == '\r' && code[ptr + 1] == '\n') {
			ptr += 2
			lineNumber += 1
		} else if(code[ptr] == '\r' || code[ptr] == '\n') {
			ptr += 1
			lineNumber += 1
		} else {
			ptr += 1
		}
	}
	return lineNumber
}

/**
 * 分解字符串为两段
 */
export function splitBy(haystack: string, needle: string): [string, string] {
	const split = haystack.indexOf(needle)
	if(split == -1) {
		return [ haystack, '' ]
	}
	return [
		haystack.substring(0, split),
		haystack.substring(split + 1)
	]
}

/**
 * 字符定界
 */
export function withinCharRange(char: string, lower: string, upper: string) {
	return lower.charCodeAt(0) <= char.charCodeAt(0) && char.charCodeAt(0) <= upper.charCodeAt(0)
}

/**
 * 小驼峰转换为连字符
 */
export function camelCase2Hyphen(str: string) {
	return str.replace(/[A-Z]/g, (c) => {return '-' + c.toLowerCase()});
}

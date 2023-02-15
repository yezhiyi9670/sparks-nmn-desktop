import { randomToken } from "./random"
import { multiReplace } from "./string"

/**
 * 向模板字符串中填入参数
 * - 字符串中 ${0}, ${1} 等占位符被替换为 args 中对应的值的 toString。如果 args 不够长，占位符保持原样
 * - 形如 ${$0}, ${$1} 的占位符被解析作 ${0}, ${1}
 */
export function getLanguageValue(str: string, ...args: any[]): string {
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

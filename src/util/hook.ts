import React from 'react'
import { randomToken } from './random'

/**
 * 记忆回调函数
 */
export function useCallback<T>(val: T, deps: React.DependencyList, updateCall?: () => void) {
	return React.useMemo(() => {
		if(updateCall) updateCall()
		return val
	}, deps)
}

const realFunctionDb: {[_: string]: Function} = {}
const implFunctionDb: {[_: string]: Function} = {}

/**
 * 暴力的记忆回调函数方式（基于 token 状态，以内存流失为代价）
 * 去你妈的 dependecies
 */
export function useMethod<T extends Function>(val: T): T {
	const [ token ] = React.useState(() => randomToken(48))
	realFunctionDb[token] = val
	if(implFunctionDb[token] === undefined) {
		implFunctionDb[token] = function() {
			return realFunctionDb[token].apply(this, arguments)
		}
	}
	return implFunctionDb[token] as T
}

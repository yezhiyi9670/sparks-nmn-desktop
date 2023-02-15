import React from 'react'
import { randomToken } from "./random"

/**
 * 回调函数注册
 */
export class CallbackRegistry<Func_t extends Function> {
	registry: {[_: string]: Func_t | null} = {}

	constructor() {}

	/**
	 * 注册回调函数
	 * @param prevToken? 指定 token；若 token 未注册过，则回调函数立即执行
	 * @return token，用于移除回调函数
	 */
	register(func: Func_t, prevToken?: string): string {
		let token = randomToken(32)
		let prevExist = false
		if(prevToken) {
			token = prevToken
			prevExist = undefined !== this.registry[prevToken]
		}
		this.registry[token] = func
		if(prevToken && !prevExist) {
			func()
		}
		return token
	}

	/**
	 * 迭代
	 * @param func 迭代函数，参数为回调函数和 token
	 */
	iterate(func: (func: Func_t, token: string) => void) {
		for(let token in this.registry) {
			let item = this.registry[token]
			if(item) {
				func(item, token)
			}
		}
	}

	/**
	 * 依次调用
	 */
	call() {
		this.iterate((func) => {
			func()
		})
	}

	/**
	 * 移除
	 * @param token 注册时返回的 token
	 */
	remove(token: string) {
		if(this.registry[token]) {
			this.registry[token] = null
		}
	}
}

/**
 * 使用仅有一次的 effect，并且可以在结束时清除
 */
export function useOnceEffect(func: () => void) {
	return React.useEffect(() => {
		return func()
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])
}

/**
 * 创建节流执行器
 * 保证执行器总是延迟 delay，且两次触发的间隔不小于 delay
 */
export function createDethrottledApplier(timeout: number) {
	let timer: NodeJS.Timeout | undefined = undefined
	return function<T extends (...args: any[]) => void>(func: T): T {
		return function(this: any) {
			const context = this
			const args = arguments
			if(timer) {
				clearTimeout(timer)
			}
			timer = setTimeout(() => func.apply(context, args as any), timeout)
		} as T
	}
}

/**
 * 创建节流函数
 * 保证目标函数总是延迟 delay 调用，且两次调用的间隔不小于 delay
 */
export function dethrottle<T extends (...args: any[]) => void>(func: T, timeout: number): T {
	const dethrottler = createDethrottledApplier(timeout)
	return dethrottler(func)
}

/**
 * 在数组中找到满足键值关系的项
 */
export function findWithKey<T>(arr: T[], key: string, value: any): T | null {
	for(let item of arr) {
		if((item as any)[key] == value) {
			return item
		}
	}
	return null
}
/**
 * 在数组中找到满足键值关系的下表
 */
export function findIndexWithKey<T>(arr: T[], key: string, value: any): number {
	let foundIndex = -1
	arr.forEach((item, index) => {
		if((item as any)[key] == value) {
			if(foundIndex == -1) {
				foundIndex = index
			}
		}
	})
	return foundIndex
}

/**
 * 根据键值对数组创建关联数组
 */
export function zipArray<T>(arr: [string, T][]): {[_: string]: T} {
	let ret: {[_: string]: T} = {}
	arr.forEach((item) => {
		ret[item[0]] = item[1]
	})
	return ret
}

/**
 * 计量关联数组的大小
 */
export function iterateSize(obj: {[_: string]: unknown}) {
	let count = 0
	for(let index in obj) {
		count += 1
	}
	return count
}

/**
 * 获取非空关联数组第一项键
 */
export function iterateFirstKey(obj: {[_: string]: unknown}) {
	for(let index in obj) {
		return index
	}
	return ''
}

/**
 * 迭代关联数组
 */
export function iterateMap<T, S>(obj: {[_: string]: T}, iterator: (value: T, index: string) => S | undefined): S[] {
	let ret: S[] = []
	for(let index in obj) {
		const value = obj[index]
		const result = iterator(value, index)
		if(result !== undefined) {
			ret.push(result)
		}
	}

	return ret
}

/**
 * 比较值
 * @return -1 = 小于, 1 = 大于, 0 = 不小于也不大于
 */
export function sortCompare<T>(a: T, b: T): -1 | 0 | 1 {
	if(a < b) {
		return -1
	}
	if(a > b) {
		return 1
	}
	return 0
}

import { iterateMap } from "../util/array"

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

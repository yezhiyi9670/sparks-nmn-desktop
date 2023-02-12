export module PrefTypes {
	/**
	 * 配置项类型
	 */
	export type Types = {
		type: 'number'
		value: number
	} | {
		type: 'string'
		value: string
	} | {
		type: 'numberArray'
		value: number[]
	} | {
		type: 'stringArray'
		value: string[]
	} | {
		type: 'boolean'
		value: boolean
	}
	export type TypeDescriptor = Types['type']
	export type ValueTypes = Types['value']
	/**
	 * 验证配置项的类型
	 */
	export function validate(type: TypeDescriptor, value: ValueTypes) {
		if(type == 'number') {
			return typeof(value) == 'number'
		} else if(type == 'string') {
			return typeof(value) == 'string'
		} else if(type == 'numberArray') {
			return typeof(value) == 'object' && (value.length == 0 || typeof(value[0]) == 'number')
		} else if(type == 'stringArray') {
			return typeof(value) == 'object' && (value.length == 0 || typeof(value[0]) == 'string')
		} else if(type == 'boolean') {
			return typeof(value) == 'boolean'
		}
	}
}

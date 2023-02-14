import { PrefData } from "./PrefBackend";
import { PrefTypes } from "./types";

export module PrefDataGetter {
	export function getPrefItem<T extends PrefTypes.ValueTypes>(data: PrefData, demandedType: PrefTypes.TypeDescriptor, key: string, defaultValue: T) {
		if(!PrefTypes.validate(demandedType, defaultValue)) {
			throw new Error(`Inconsistent type ${demandedType} and value ${JSON.stringify(defaultValue)} on key ${key}`)
		}
		if(key in {}) {
			throw new Error(`String ${key} cannot be a preference key`)
		}
		if(key in data) {
			let result = data[key]
			if(result.type != demandedType) {
				throw new Error(`Inconsistent type ${demandedType} and type ${result.type} on key ${key}`)
			}
			return result.value as T
		}
		return defaultValue
	}
}

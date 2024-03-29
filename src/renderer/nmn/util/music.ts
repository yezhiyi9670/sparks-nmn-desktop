export module MusicTheory {
	/**
	 * 根据绝对名称给出基调（BaseTune）。
	 *
	 * 绝对名称：形如 `D` `D4` `#D5` `bD`。如果省略组号，则 C-F 默认为 4，G-B 默认为 3，此判断无视升降号。
	 * 
	 * 音高值：音高与 C4（262Hz）相差的键数（100 音分的数量）。
	 */
	export function absNameToPitch(name: string) {
		let delta = 0
		while(name[0] == '#' || name[0] == 'b' || name[0] == '$' || name[0] == '%' || name[0] == '=') {
			delta += {
				'#': 1,
				'b': -1,
				'=': 0,
				'$': 0.5,
				'%': -0.5
			}[name[0]]
			name = name.substring(1)
		}
		let value: number | undefined = 0
		let octave = 4
		value = {
			'C': 0,
			'D': 2,
			'E': 4,
			'F': 5,
			'G': 7,
			'A': 9,
			'B': 11
		}[name[0]]
		octave = +name.substring(1)
		if(value === undefined || !/^(\d*)$/.test(name.substring(1)) || octave > 12) {
			return {
				value: NaN,
				baseValue: NaN,
				explicitOctave: false
			}
		}
		if(name.length == 1) {
			// use default
			if(value < 6) {
				octave = 4
			} else {
				octave = 3
			}
		}
		octave = 12 * (octave - 4)
		return {
			value: octave + value + delta,
			baseValue: octave + value,
			explicitOctave: name.length > 1
		}
	}

	/**
	 * 根据基调（BaseTune）给出绝对名称。
	 */
	export function pitchToAbsName(pitch: {baseValue: number, explicitOctave: boolean}) {
		if(isNaN(pitch.baseValue)) {
			return '?'
		}
		let octave = Math.floor(pitch.baseValue / 12)
		let tune = pitch.baseValue - octave * 12
		return [
			'C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'
		][Math.floor(tune)] + (pitch.explicitOctave ? (octave + 4).toString() : '')
	}

	/**
	 * 以“度”衡量的音程转换至 Key
	 */
	export function pitchIntervalToDKey(value: number, metrics: 'key' | 'thd' | 'thm' | 'th' | 'tha') {
		if(metrics == 'key') {
			return value
		}
		if(value == 0) {
			return 0
		}
		const absValue = Math.abs(value) - 1
		const sgn = value > 0 ? 1 : -1
		
		const majors = [0, 2, 4, 5, 7, 9, 11]
		const minorChecks = [0, 1, 1, 0, 0, 1, 1]
		
		const octaves = Math.floor(absValue / 7)
		const remainder = absValue - octaves * 7
		
		const remainderValue = (() => {
			if(metrics == 'thd') {
				return majors[remainder] - minorChecks[remainder] - 1
			}
			if(metrics == 'thm') {
				return majors[remainder] - minorChecks[remainder]
			}
			if(metrics == 'th') {
				return majors[remainder]
			}
			if(metrics == 'tha') {
				return majors[remainder] + 1
			}
			const _:never = metrics
			return 0
		})()

		return sgn * (remainderValue + 12 * octaves)
	}

	/**
	 * 速度统一翻译到 qpm
	 * 
	 * metrics 是 hpm, qpm, spm 或其附点形式
	 */
	export function speedToQpm(value: number, metrics: string, defaultReduction: number) {
		const translateSize = {
			'hpm': 2,
			'h.pm': 3,
			'qpm': 1,
			'q.pm': 1.5,
			'spm': 1 / defaultReduction,
			's.pm': 1 / defaultReduction * 1.5
		}[metrics]
		if(translateSize === undefined) {
			throw new Error('Unknown speed metric ' + metrics)
		}
		return value * translateSize
	}

	/**
	 * 以 Key 衡量的绝对音高翻译为文本名称（字母音名）
	 */
	export function absoluteKeysToName(value: number, preferNearFifth: boolean = false) {
		const octave = Math.floor(value / 12)
		const remainder = value - octave * 12

		const name = (preferNearFifth ?
			['C', 'bD', 'D', 'bE', 'E', 'F', '#F', 'G', 'bA', 'A', 'bB', 'B'] :
			['C', '#C', 'D', 'bE', 'E', 'F', '#F', 'G', 'bA', 'A', 'bB', 'B']
		)[remainder]
		const octaveSuffix = '' + (octave + 4)

		return name + octaveSuffix
	}

	/**
	 * 以 Key 衡量的相对音高翻译为文本名称（简谱风格）
	 */
	export function relativeKeysToName(value: number) {
		const octave = Math.floor(value / 12)
		const remainder = value - octave * 12

		const name = ['1', '#1', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'][remainder]
		const octaveSuffix = (octave >= 0) ? ("'".repeat(octave)) : (','.repeat(-octave))

		return name + octaveSuffix
	}
}

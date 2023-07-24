import { PartSignature } from "../parser/des2cols/types"
import { ChipInstrument } from "./instrument/tonic/ChipInstrument"
import { SnareDrumlineInstrument, SnareTonicInstrument } from "./instrument/SnareInstrument"
import { FluteInstrument } from "./instrument/tonic/FluteInstrument"
import { PianoInstrument } from "./instrument/tonic/PianoInstrument"
import { inCheck, iterateMap } from "../util/array"
import { OrganInstrument } from "./instrument/tonic/OrganInstrument"
import { GuitarInstrument } from "./instrument/tonic/GuitarInstrument"
import { ViolinInstrument } from "./instrument/tonic/ViolinInstrument"
import { BeatInstrument1 } from "./instrument/drumline/BeatInstrument1"
import { BeatInstrument2 } from "./instrument/drumline/BeatInstrument2"
import { DrumsInstrument } from "./instrument/drumline/DrumsInstrument"
import { SawInstrument } from "./instrument/tonic/SawInstrument"

export type ControlData = {[partHash: string]: {
	control: ControlDataPart
	signature: PartSignature | BeatMachineSignature
}}

export type ControlDataPart = {
	mute: boolean
	solo: boolean
	volume: number
	pan: number
} & ({
	type: 'part'
	octave: number
	tonicInstrument: TonicInstrumentName,
	drumlineInstrument: DrumlineInstrumentName
} | {
	type: 'beatMachine',
	drumlineInstrument: DrumlineInstrumentName
	beatModulo: number
})

export const controlDataPartDefault: ControlDataPart = {
	mute: false,
	solo: false,
	volume: 100,
	pan: 0,
	type: 'part',
	octave: 0,
	tonicInstrument: 'piano',
	drumlineInstrument: 'snare'
}
export const controlDataPartBeatMachine: ControlDataPart = {
	mute: false,
	solo: false,
	volume: 100,
	pan: 0,
	type: 'beatMachine',
	drumlineInstrument: 'beat2',
	beatModulo: 1
}

export const TonicInstruments = {
	chip: ChipInstrument,
	saw: SawInstrument,
	flute: FluteInstrument,
	piano: PianoInstrument,
	organ: OrganInstrument,
	violin: ViolinInstrument,
	guitar: GuitarInstrument,
	snare: SnareTonicInstrument
}
export type TonicInstrumentName = keyof(typeof TonicInstruments)

export const DrumlineInstruments = {
	drum: DrumsInstrument,
	beat1: BeatInstrument1,
	beat2: BeatInstrument2,
	snare: SnareDrumlineInstrument
}
export type DrumlineInstrumentName = keyof(typeof DrumlineInstruments)

export type BeatMachineSignature = {
	hash: 'beatMachine',
	type: 'beatMachine'
}

export module MixingControlUtils {
	export const maxVolume = 150
	export const maxOctave = 6
	export const maxModulo = 18

	export function moduloList() {
		let ret: number[] = []
		for(let i = 1; i <= maxModulo; i++) {
			ret.push(i)
		}
		return ret
	}

	export function dehydrate(data: ControlData): string[] {
		const result: string[] = []
		iterateMap(data, (part, partId) => {
			result.push(JSON.stringify({
				id: partId,
				c: {
					m: part.control.mute,
					s: part.control.solo,
					p: part.control.pan,
					v: part.control.volume,
					nx: part.control.drumlineInstrument,
					...(part.control.type != 'beatMachine' && {
						nn: part.control.tonicInstrument,
						o: part.control.octave
					}),
					...(part.control.type == 'beatMachine' && {
						bm: part.control.beatModulo
					})
				}
			}))
		})
		return result
	}

	function reviveOne(configObj: unknown, isBeatMachine: boolean): ControlDataPart | undefined {
		if(!configObj || typeof configObj != 'object') {
			return undefined
		}
		const target = isBeatMachine ? {...controlDataPartBeatMachine} : {...controlDataPartDefault}
		if('m' in configObj && typeof configObj.m == 'boolean') {
			target.mute = configObj.m
		}
		if('s' in configObj && typeof configObj.s == 'boolean') {
			target.solo = configObj.s
		}
		if('p' in configObj && typeof configObj.p == 'number' && configObj.p == configObj.p) {
			target.pan = Math.min(1, Math.max(-1, configObj.p))
		}
		if('v' in configObj && typeof configObj.v == 'number' && configObj.v == configObj.v) {
			target.volume = Math.min(maxVolume, Math.max(0, Math.floor(configObj.v)))
		}
		if('nx' in configObj && typeof configObj.nx == 'string' && inCheck(configObj.nx, DrumlineInstruments)) {
			target.drumlineInstrument = configObj.nx as any
		}
		if(target.type != 'beatMachine') {
			if('nn' in configObj && typeof configObj.nn == 'string' && inCheck(configObj.nn, TonicInstruments)) {
				target.tonicInstrument = configObj.nn as any
			}
			if('o' in configObj && typeof configObj.o == 'number' && configObj.o == configObj.o) {
				target.octave = Math.min(maxOctave, Math.max(-maxOctave, Math.floor(configObj.o)))
			}
		} else {
			if('bm' in configObj && typeof configObj.bm == 'number' && configObj.bm == configObj.bm) {
				target.beatModulo = Math.min(maxModulo, Math.max(0, Math.floor(configObj.bm)))
			}
		}
		return target
	}

	export function revive(currentData: ControlData, lines: string[]): ControlData {
		const referenceObj: {[_: string]: ControlDataPart} = {}
		for(let line of lines) {
			try {
				const obj: unknown = JSON.parse(line.trim())
				if(!obj || typeof obj != 'object') {
					continue
				}
				if(!('id' in obj) || typeof obj.id != 'string') {
					continue
				}
				if(!('c' in obj)) {
					continue
				}
				const isBeatMachine = obj.id == 'beatMachine'
				const revivedData = reviveOne(obj.c, isBeatMachine)
				if(!revivedData) {
					continue
				}
				referenceObj[obj.id] = revivedData
			} catch(_err) {
				console.warn('Cannot parse part data', line.trim(), _err)
			}
		}
		const newData = { ...currentData }
		for(let partId in newData) {
			if(referenceObj[partId]) {
				newData[partId] = {
					...newData[partId],
					control: referenceObj[partId]
				}
			}
		}
		return newData
	}
}

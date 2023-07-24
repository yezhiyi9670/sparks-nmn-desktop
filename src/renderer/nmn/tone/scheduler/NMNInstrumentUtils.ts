import { ControlData, ControlDataPart, DrumlineInstruments, MixingControlUtils, TonicInstruments } from "../ControlData";
import { ToneInstrument } from "../instrument/ToneInstrument";
import { PartInstruments } from "./NMNToneScheduler";

export module NMNInstrumentUtils {
	export type InstrumentRepo = {[partId: string]: PartInstruments}

	/**
	 * 根据控制数据创建乐器
	 */
	export function createInstruments(
		repo: InstrumentRepo, controlData: ControlData
	) {
		for(let partId in controlData) {
			const controlPart = controlData[partId].control
			if(controlPart.type == 'beatMachine') {
				repo[partId] = {
					type: 'beatMachine',
					drumlineInstrument: new DrumlineInstruments[controlPart.drumlineInstrument]
				}
			} else {
				repo[partId] = {
					type: 'part',
					drumlineInstrument: new DrumlineInstruments[controlPart.drumlineInstrument],
					tonicInstrument: new TonicInstruments[controlPart.tonicInstrument]
				}
			}
		}
	}
	/**
	 * 加载所有乐器
	 */
	export function loadInstruments(
		controlData: ControlData, rootUrl: string
	) {
		for(let partId in controlData) {
			const controlPart = controlData[partId].control
			if(controlPart.type == 'beatMachine') {
				DrumlineInstruments[controlPart.drumlineInstrument].load(rootUrl)
			} else {
				DrumlineInstruments[controlPart.drumlineInstrument].load(rootUrl)
				TonicInstruments[controlPart.tonicInstrument].load(rootUrl)
			}
		}
	}
	/**
	 * 更新乐器信息
	 */
	export function updateInstruments(
		repo: InstrumentRepo, controlData: ControlData, forceEnableBeater: boolean
	) {
		let hasSolo = false
		for(let partId in controlData) {
			const controlPart = controlData[partId]?.control
			if(!controlPart) {
				return
			}
			if(controlPart.solo) {
				hasSolo = true
			}
		}
		const synthObj = repo
		for(let partId in synthObj) {
			const controlPart = controlData[partId].control
			const synthPart = synthObj[partId]
			if(!controlPart) {
				return
			}
			NMNInstrumentUtils.tuneInstrument(synthPart.drumlineInstrument, controlPart, hasSolo, forceEnableBeater)
			if(synthPart.type != 'beatMachine') {
				NMNInstrumentUtils.tuneInstrument(synthPart.tonicInstrument, controlPart, hasSolo, forceEnableBeater)
			}
		}
	}
	/**
	 * 实时调节乐器
	 */
	export function tuneInstrument<T extends ToneInstrument>(
		instrument: T, controlPart: ControlDataPart, hasSolo: boolean, forceEnableBeater: boolean
	) {
		if(((!hasSolo || controlPart.solo) && !controlPart.mute) || (controlPart.type == 'beatMachine' && forceEnableBeater)) {
			instrument.setVolume(controlPart.volume / MixingControlUtils.maxVolume)
		} else {
			instrument.setVolume(0)
		}
		instrument.setPan(controlPart.pan)
		return instrument
	}
	/**
	 * 丢弃所有乐器并清空
	 */
	export function clearInstruments(
		repo: InstrumentRepo
	) {
		for(let partId in repo) {
			const synth = repo[partId]
			synth.drumlineInstrument.dispose()
			if(synth.type != 'beatMachine') {
				synth.tonicInstrument.dispose()
			}
		}
	}
}

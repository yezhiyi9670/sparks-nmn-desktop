import * as Tone from 'tone'
import { Instrument, InstrumentOptions } from 'tone/build/esm/instrument/Instrument'

/**
 * Tone 乐器
 */
export abstract class ToneInstrument {
	static resourceSubfolder: string = ''
	static resourceUrls: {[_: string]: string} = {}
	static loadedResources: {[_: string]: Tone.ToneAudioBuffer} = {}
	static loaded = false
	/**
	 * 加载音源。不返回任何东西，开始播放前请等待 Tone.loaded。
	 */
	static load(baseDir: string) {
		if(this.loaded) {
			return false
		}
		this.loadedResources = {}
		this.loaded = true
		for(let key in this.resourceUrls) {
			const url = baseDir + '/' + this.resourceSubfolder + this.resourceUrls[key]
			this.loadedResources[key] = new Tone.ToneAudioBuffer(url)
		}
	}

	synth: Instrument<InstrumentOptions>
	panner: Tone.Panner
	volumeController: Tone.Volume
	now: number

	abstract create(): Instrument<InstrumentOptions>

	constructor() {
		this.volumeController = new Tone.Volume({
			volume: 0
		}).toDestination()
		this.panner = new Tone.Panner({
			pan: 0,
			channelCount: 2
		}).connect(this.volumeController)
		this.synth = this.create().connect(this.panner)
		this.now = Tone.now()
	}

	/**
	 * 获取时间
	 */
	resetTime() {
		this.now = Tone.now()
	}
	/**
	 * 设置音量，数值为能量的比例
	 */
	setVolume(volumeFrac: number) {
		this.volumeController.volume.value = Math.max(-114514, 20 * Math.log10(volumeFrac))
	}
	/**
	 * 设置声相偏移
	 */
	setPan(position: number) {
		this.panner.pan.value = position
	}
	/**
	 * 停止播放并丢弃
	 */
	dispose() {
		this.synth.disconnect()
	}
}

/**
 * 音符型 Tone 乐器
 */
export abstract class TonicToneInstrument extends ToneInstrument {
	/**
	 * 计划播放音符
	 */
	scheduleNote(freq: number, timeMillis: number, durationMillis: number) {
		try {
			this.synth.triggerAttackRelease(this.transformPitch(freq), durationMillis / 1000, this.now + timeMillis / 1000)
		} catch(_err) {}
	}
	/**
	 * 转换音高
	 */
	transformPitch(freq: number): Tone.Unit.Frequency {
		return freq
	}
}

/**
 * 鼓点型 Tone 乐器
 *
 * 实现方式是为不同音高分配不同声音，并将音符转化为音高
 */
export abstract class DrumlineToneInstrument extends ToneInstrument {
	/**
	 * 计划播放音符
	 */
	scheduleNote(note: string, timeMillis: number, durationMillis: number) {
		try {
			this.synth.triggerAttackRelease(this.transformPitch(note), durationMillis / 1000, this.now + timeMillis / 1000)
		} catch(_err) {}
	}
	/**
	 * 转换音高
	 */
	transformPitch(note: string): Tone.Unit.Frequency {
		return 'C2'
	}
}

export module ToneInstrumentUtils {

}

export type TonicToneInstrumentClass = (new () => TonicToneInstrument) & {
	load: (baseDir: string) => void
}
export type DrumlineToneInstrumentClass = (new () => DrumlineToneInstrument) & {
	load: (baseDir: string) => void
}

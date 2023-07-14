import * as Tone from 'tone'
import { DrumlineToneInstrument, ToneInstrument, TonicToneInstrument } from "./ToneInstrument"

export class SnareTonicInstrument extends TonicToneInstrument {
	static resourceSubfolder: string = 'drum/'
	static resourceUrls: {[_: string]: string} = {
		C5: 'kit8-snare.mp3'
	}

	create() {
		return new Tone.Sampler({
			urls: SnareTonicInstrument.loadedResources,
			release: 1,
			volume: -14
		})
	}

	transformPitch(freq: number): Tone.Unit.Frequency {
		return 'C5'
	}
}

export class SnareDrumlineInstrument extends DrumlineToneInstrument {
	static resourceSubfolder: string = 'drum/'
	static resourceUrls: {[_: string]: string} = {
		C5: 'kit8-snare.mp3'
	}

	create() {
		return new Tone.Sampler({
			urls: SnareDrumlineInstrument.loadedResources,
			release: 1,
			volume: -14
		})
	}

	transformPitch(note: string): Tone.Unit.Frequency {
		return 'C5'
	}
}

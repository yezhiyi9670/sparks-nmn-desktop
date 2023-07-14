import * as Tone from 'tone'
import { TonicToneInstrument } from "../ToneInstrument"

export class ViolinInstrument extends TonicToneInstrument {
	static resourceSubfolder: string = 'violin/'
	static resourceUrls: {[_: string]: string} = {
		'A3': 'A3.mp3',
		'A4': 'A4.mp3',
		'A5': 'A5.mp3',
		'A6': 'A6.mp3',
		'C4': 'C4.mp3',
		'C5': 'C5.mp3',
		'C6': 'C6.mp3',
		'C7': 'C7.mp3',
		'E4': 'E4.mp3',
		'E5': 'E5.mp3',
		'E6': 'E6.mp3',
		'G4': 'G4.mp3',
		'G5': 'G5.mp3',
		'G6': 'G6.mp3'
	}

	create() {
		return new Tone.Sampler({
			urls: ViolinInstrument.loadedResources,
			volume: -10,
			release: 1
		})
	}
}

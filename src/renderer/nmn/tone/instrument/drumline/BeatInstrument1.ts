import * as Tone from 'tone'
import { DrumlineToneInstrument } from "../ToneInstrument"

export class BeatInstrument1 extends DrumlineToneInstrument {
	static resourceSubfolder: string = 'drum/'
	static resourceUrls: {[_: string]: string} = {
		D5: 'CR78-tom1.mp3',
		G4: 'CR78-tom2.mp3',
		G3: 'CR78-tom3.mp3'
	}

	create() {
		return new Tone.Sampler({
			urls: BeatInstrument1.loadedResources,
			release: 1,
			volume: -4
		})
	}

	transformPitch(note: string): Tone.Unit.Frequency {
		if(note.toUpperCase() == 'X') {
			return 'D5'
		}
		if(note.toUpperCase() == 'Y') {
			return 'G4'
		}
		return 'G3'
	}
}

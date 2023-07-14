import * as Tone from 'tone'
import { DrumlineToneInstrument } from "../ToneInstrument"

export class BeatInstrument2 extends DrumlineToneInstrument {
	static resourceSubfolder: string = 'drum/'
	static resourceUrls: {[_: string]: string} = {
		D5: 'TC2-kick.mp3',
		G4: 'TC2-snare.mp3',
		G3: 'TC2-hithat.mp3'
	}

	create() {
		return new Tone.Sampler({
			urls: BeatInstrument2.loadedResources,
			release: 1,
			volume: -8
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

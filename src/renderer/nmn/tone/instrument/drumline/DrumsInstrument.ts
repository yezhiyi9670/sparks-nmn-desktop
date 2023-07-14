import * as Tone from 'tone'
import { DrumlineToneInstrument } from "../ToneInstrument"

export class DrumsInstrument extends DrumlineToneInstrument {
	static resourceSubfolder: string = 'drum/'
	static resourceUrls: {[_: string]: string} = {
		D5: '4OP-kick.mp3',
		G4: 'BB13-hithat.mp3',
		G3: 'CR78-hihat.mp3'
	}

	create() {
		return new Tone.Sampler({
			urls: DrumsInstrument.loadedResources,
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

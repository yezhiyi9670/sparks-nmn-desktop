import { randomToken } from "../util/random"
import * as Tone from 'tone'

export class DisposableAudioTimer {
	static init() {}
	
	disposed: boolean = false
	now: number

	constructor() {
		this.now = Tone.now()
	}

	resetTime() {
		this.now = Tone.now()
	}

	schedule(func: (time: number) => void, timeMillis: number) {
		Tone.getContext().setTimeout(() => {
			if(this.disposed) {
				return
			}
			func(this.now + timeMillis / 1000)
		}, this.now + timeMillis / 1000 - Tone.now())
	}

	dispose() {
		this.disposed = true
	}
}

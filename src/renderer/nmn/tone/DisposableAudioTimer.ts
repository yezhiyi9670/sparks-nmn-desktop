import { randomToken } from "../util/random"
import * as Tone from 'tone'

export class DisposableAudioTimer {
	static init() {}
	
	disposed: boolean = false
	now: number = 0
	visualLatency: number = 0

	constructor() {
		this.resetTime()
	}

	resetTime() {
		this.now = Tone.now()
		this.visualLatency = Math.max(0, Tone.context.lookAhead * 1000 - 60)
	}

	schedule(func: (time: number) => void, timeMillis: number, delayLookAhead: boolean = false) {
		Tone.getContext().setTimeout(() => {
			if(this.disposed) {
				return
			}
			func(this.now + timeMillis / 1000)
		}, this.now + timeMillis / 1000 - Tone.now() + (delayLookAhead ? this.visualLatency : 0) / 1000)
	}

	dispose() {
		this.disposed = true
	}
}

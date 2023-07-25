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
		this.visualLatency = Math.max(0, Tone.context.lookAhead * 1000 - 50)
	}

	schedule(func: (time: number) => void, timeMillis: number, delayLookAhead: boolean = false) {
		Tone.getContext().setTimeout(() => {
			if(this.disposed) {
				return
			}
			if(!delayLookAhead) {
				func(this.now + timeMillis / 1000)
			} else {
				setTimeout(() => {
					if(this.disposed) {
						return
					}
					func(this.now + timeMillis / 1000)
				}, this.visualLatency)
			}
		}, this.now + timeMillis / 1000 - Tone.now())
	}

	visualDelayed(func: () => void) {
		setTimeout(() => {
			if(this.disposed) {
				return
			}
			func()
		}, this.visualLatency)
	}

	dispose() {
		this.disposed = true
	}
}

import { SequenceSectionStat } from "../../../../parser/sequence/SequenceSectionStat";
import { SequenceArticle, SequenceSection } from "../../../../parser/sequence/types";
import { ControlData } from "../../../../tone/ControlData";
import { NMNInstrumentUtils } from "../../../../tone/scheduler/NMNInstrumentUtils";
import * as Tone from 'tone'
import { NMNToneScheduler } from "../../../../tone/scheduler/NMNToneScheduler";
import { AudioEncodingUtils } from "../../../../tone/audio-encoder/AudioEncodingUtils";
import { randomToken } from "../../../../util/random";
import PromiseWorker from 'promise-worker'
import { OfflinePlayer } from "./OfflinePlayer";

export module RenderAudio {
	/**
	 * 离线音频渲染逻辑
	 */
	export function renderAudio(
		sequence: SequenceArticle, controlData: ControlData, speedModifier: number, pitchModifier: number, iterationIndex: number,
		loadUrl: string,
		checkAvailability: () => boolean,
		onProgressUpdate: (finished: number, total: number) => void
	) {
		let cancelFunc = () => {}
		const returnedCancel = () => {
			cancelFunc()
		}

		const promise = (async () => {
			// 音频离线渲染
			const player = new OfflinePlayer(sequence, speedModifier, pitchModifier)
			if(!player.init(iterationIndex == 0, controlData)) {
				return
			}
			const buffer = await player.render(loadUrl, (finished, total) => {
				onProgressUpdate(finished, total)
			})
			if(!buffer) {
				return
			}
			const bufferMeta = AudioEncodingUtils.unpackBuffer(buffer)
			if(!checkAvailability()) {
				return
			}
		
			// 音频编码
			const codecWorker = new Worker(
				new URL('./worker/audio-encode.ts', import.meta.url),
				{type: 'module'}
			)
			const codecWorkerPromise = new PromiseWorker(codecWorker)
			cancelFunc = () => {codecWorker.terminate()} // 取消编码将中断编码工作
			const encData: Uint8Array = await codecWorkerPromise.postMessage(bufferMeta)
			codecWorker.terminate()
			cancelFunc = () => {}
			if(!checkAvailability()) {
				return
			}
		
			return encData
		})()
		
		return {
			promise: promise,
			cancel: returnedCancel
		}
	}
}

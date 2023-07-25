// Requires module libflacjs

export module AudioEncodingUtils {
	export type AudioBufferMeta = {
		sampleRate: number,
		channelCount: number,
		data: Float32Array[]
	}
	
	/**
	 * 浮点到定点格式转换
	 */
	function float32ToInt16(arr: Float32Array) {
		const topVal = 65535
		const decay = 10 ** (0 / 20)
		return new Int32Array(arr.map(item => {
			return Math.min(topVal, Math.max(-topVal, Math.round(item * topVal * decay)))
		}))
	}
	/**
	 * buffer 转换为 metadata
	 */
	export function unpackBuffer(buffer: AudioBuffer): AudioBufferMeta {
		return {
			sampleRate: buffer.sampleRate,
			channelCount: buffer.numberOfChannels,
			data: Array(buffer.numberOfChannels).fill(0).map((_, index) => {
				return buffer.getChannelData(index)
			})
		}
	}
	// /**
	//  * 获取编码器对象
	//  */
	// export async function getFlacEncoder() {
	// 	const Flac = await import('libflacjs/dist/libflac')
	// 	const { Encoder } = await import('libflacjs/src/encoder')
	// 	await new Promise(resolve => {
	// 		Flac.on('ready', () => resolve(undefined))
	// 	})
	// 	return { Flac: Flac, Encoder: Encoder }
	// }
	// /**
	//  * 编码
	//  */
	// export async function encodeFlac(metadata: AudioBufferMeta, quality: number = 0.25) {
	// 	const clampQuality = Math.min(1, Math.max(0, quality))

	// 	const { Flac, Encoder } = await getFlacEncoder()
	// 	const encoder = new Encoder(Flac, {
	// 		sampleRate: metadata.sampleRate,
	// 		channels: metadata.channelCount,
	// 		bitsPerSample: 16,
	// 		compression: Math.round(8 * (1 - clampQuality)) as any,
	// 		verify: true,
	// 		isOgg: true,
	// 	})
	// 	encoder.encode(metadata.data.map(item => float32ToInt16(item)))
	// 	encoder.encode()
	// 	const encData = encoder.getSamples()
	// 	encoder.destroy()
	// 	return encData
	// }
	/**
	 * 获取 Vorbis 编码器
	 */
	export async function getVorbisEncoder() {
		const Encoder = (await import('vorbis-encoder-js')).encoder
		return Encoder
	}
	/**
	 * 编码
	 */
	export async function encodeVorbis(metadata: AudioBufferMeta, quality: number = 1) {
		const clampQuality = Math.min(1, Math.max(0, quality))

		const Encoder = await getVorbisEncoder()
		const encoder = new Encoder(metadata.sampleRate, metadata.channelCount, clampQuality * 2 - 1, {})
		encoder.encodeFrom({
			getChannelData: (index: number) => metadata.data[index]
		})
		const blob: Blob = encoder.finish()
		const arrayBuffer = await blob.arrayBuffer()

		return new Uint8Array(arrayBuffer)
	}
}

// Requires module libflacjs

export module FlacLibUtil {
	export type AudioBufferMeta = {
		sampleRate: number,
		channelCount: number,
		data: Int32Array[]
	}
	
	/**
	 * 获取编码器对象
	 */
	export async function getEncoder() {
		const Flac = await import('libflacjs/dist/libflac')
		const { Encoder } = await import('libflacjs/src/encoder')
		await new Promise(resolve => {
			Flac.on('ready', () => resolve(undefined))
		})
		return { Flac: Flac, Encoder: Encoder }
	}
	/**
	 * 浮点到定点格式转换
	 */
	function float32ToInt16(arr: Float32Array) {
		const topVal = 65535
		const ratioVal = 10 ** (-4 / 20)
		return new Int32Array(arr.map(item => {
			return Math.min(topVal, Math.max(-topVal, Math.round(item * topVal * ratioVal)))
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
				return float32ToInt16(buffer.getChannelData(index))
			})
		}
	}
	/**
	 * 编码 metadata
	 */
	export async function encodeMetadata(metadata: AudioBufferMeta) {
		const { Flac, Encoder } = await getEncoder()
		const encoder = new Encoder(Flac, {
			sampleRate: metadata.sampleRate,
			channels: metadata.channelCount,
			bitsPerSample: 16,
			compression: 6,
			verify: true,
			isOgg: true,
		})
		encoder.encode(metadata.data)
		encoder.encode()
		const encData = encoder.getSamples()
		encoder.destroy()
		return encData
	}
	/**
	 * 编码音频
	 */
	export async function encodeBuffer(buffer: AudioBuffer) {
		const meta = unpackBuffer(buffer)
		return await encodeMetadata(meta)
	}
}

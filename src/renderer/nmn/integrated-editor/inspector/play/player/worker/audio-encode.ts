import register from 'promise-worker/register'
import { AudioEncodingUtils } from '../../../../../tone/audio-encoder/AudioEncodingUtils'

register(function(metadata: AudioEncodingUtils.AudioBufferMeta) {
	return AudioEncodingUtils.encodeVorbis(metadata)
})

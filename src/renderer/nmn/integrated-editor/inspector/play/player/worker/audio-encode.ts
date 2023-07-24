import register from 'promise-worker/register'
import { FlacLibUtil } from '../../../../../util/flac-encoder'

register(function(metadata: FlacLibUtil.AudioBufferMeta) {
	return FlacLibUtil.encodeMetadata(metadata)
})

import fs from 'fs'

let pendingLocks: string[] = []

export module FileLock {
	/**
	 * 等待直到解锁或超时
	 */
	export async function waitAsync(path: string) {
		const waitTime = 250
		const maxTickets = 40
		let usedTickets = 0
		while(usedTickets < maxTickets && fs.existsSync(path)) {
			await new Promise(resolve => {
				setTimeout(() => resolve(undefined), waitTime)
			})
			usedTickets += 1
		}
		unlockAsync(path)
	}
	/**
	 * 锁定
	 */
	export async function lockAsync(path: string) {
		try {
			await fs.promises.writeFile(path, '1')
		} catch(_) {}
		pendingLocks.push(path)
	}
	/**
	 * 解锁
	 */
	export async function unlockAsync(path: string) {
		if(fs.existsSync(path)) {
			try {
				await fs.promises.unlink(path)
			} catch(_) {}
		}
		pendingLocks = pendingLocks.filter((item) => {
			return item != path
		})
	}
}

process.on('exit', () => {
	for(let item of pendingLocks) {
		try {
			fs.unlinkSync(item)
		} catch(_) {}
	}
})

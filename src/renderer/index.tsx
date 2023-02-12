import React from 'react'
import { createRoot } from 'react-dom/client'

function TestApp() {
	return <div>
		Hello, world!
	</div>
}

window.JSBridge.test()

createRoot(document.getElementById('root')!).render(<TestApp />)

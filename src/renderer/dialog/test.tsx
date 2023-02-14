import React from "react"
import { Dialog } from "./dialog"

export function TestDialog(props: {
	open: boolean
}) {
	return (
		<Dialog
			open={props.open}
			title='Attention'
			onEscape={() => console.log('backdrop click')}
			buttons={[
				{
					color: 'negative',
					text: 'Cancel',
					onClick: () => console.log('Cancel'),
				},
				{
					color: 'positive',
					text: 'Confirm',
					onClick: () => console.log('Confirm'),
					focus: true
				}
			]}
		>
			Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
		</Dialog>
	)
}

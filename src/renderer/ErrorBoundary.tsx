import React from 'react'

interface ErrorBoundaryProps {
	children: React.ReactNode,
	fallback: (recover: () => void) => React.ReactNode
}

interface ErrorBoundaryState {
	hasError: boolean
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false };
	}

	componentDidCatch(error: unknown, errorInfo: unknown) {
		this.setState({
			hasError: true
		})
	}

	recover = () => {
		this.setState({
			hasError: false
		})
	}

	render() {
		if (this.state.hasError) {
			return this.props.fallback(this.recover);
		}

		return this.props.children;
	}
}

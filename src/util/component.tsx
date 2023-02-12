import React, { CSSProperties, HTMLAttributes, ReactNode } from "react";

export function Box(props: {children?: ReactNode, style?: CSSProperties, className: string}) {
	return <div style={{height: '100%', ...props.style}} className={props.className}>
		{ props.children }
	</div>
}

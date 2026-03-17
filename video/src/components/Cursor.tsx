import React from 'react';

export const Cursor: React.FC<{x: number, y: number, isPressed: boolean}> = ({x, y, isPressed}) => {
	return (
		<div 
			className="fixed z-[100] rounded-full pointer-events-none transition-transform duration-150"
			style={{
				left: x,
				top: y,
				width: 40,
				height: 40,
				marginLeft: -20,
				marginTop: -20,
				background: 'rgba(255, 255, 255, 0.2)',
				border: '2px solid rgba(255, 255, 255, 0.4)',
				boxShadow: '0 0 20px rgba(0,0,0,0.2)',
				transform: `scale(${isPressed ? 0.8 : 1})`,
				backdropFilter: 'blur(2px)'
			}}
		/>
	);
};

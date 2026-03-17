import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { MainComposition } from './MainComposition';
import './index.css';

const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="TransactionAnimation"
				component={MainComposition}
				durationInFrames={510} // 8.5 seconds at 60fps
				fps={60}
				width={1080}
				height={1920}
			/>
		</>
	);
};

registerRoot(RemotionRoot);

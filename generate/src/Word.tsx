import { Easing, interpolate } from 'remotion';
import React from 'react';
import { WordTiming } from './composition_helpers';

export const Word: React.FC<{
	item: {
		id: number;
		start: number;
		end: number;
		text: string;
		wordTimings?: WordTiming[];
	};
	frame: number;
	fps: number;
}> = ({ item, frame, fps }) => {
	const currentTimeInSeconds = frame / fps;

	const opacity = interpolate(frame, [item.start, item.start + 15], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const scale = interpolate(frame, [item.start, item.start + 15], [0.9, 1], {
		easing: Easing.out(Easing.quad),
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const translateY = interpolate(frame, [item.start, item.start + 15], [5, 0], {
		easing: Easing.out(Easing.quad),
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<span
			style={{
				display: 'inline',
				opacity,
				transform: `scale(${scale}) translateY(${translateY}px)`,
				fontSize: 'inherit',
				transformOrigin: 'center bottom',
				transition: 'color 0.1s ease-in-out',
			}}
		>
			{item.wordTimings?.map((wt, index) => (
				<span key={index} style={{ marginRight: '0.25em' }}>
					<span
						style={{
							color:
								currentTimeInSeconds >= wt.start &&
								currentTimeInSeconds < wt.end
									? '#FFD700'
									: 'inherit',
							transition: 'color 0.1s ease-in-out',
						}}
					>
						{wt.word}
					</span>
				</span>
			))}
		</span>
	);
};

import { Easing } from 'remotion';
import { interpolate } from 'remotion';
import React from 'react';
import { SubtitleItem } from 'parse-srt';

export const Word: React.FC<{
	item: SubtitleItem;
	frame: number;
}> = ({ item, frame }) => {
	const opacity = interpolate(frame, [item.start, item.start + 15], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const translateY = interpolate(
		frame,
		[item.start, item.start + 10],
		[0.25, 0],
		{
			easing: Easing.out(Easing.quad),
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}
	);

	return (
		<span
			style={{
				display: 'inline-block',
			}}
		>
			{item.text}
		</span>
	);
};

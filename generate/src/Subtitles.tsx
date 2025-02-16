import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCurrentFrame } from 'remotion';
import { Word } from './Word';
import { SubtitleEntry } from './Composition';

export const PaginatedSubtitles: React.FC<{
	subtitlesData: SubtitleEntry[];
	startFrame: number;
	endFrame: number;
	linesPerPage: number;
	subtitlesZoomMeasurerSize: number;
	subtitlesLineHeight: number;
	fps: number;
}> = ({
	subtitlesData,
	startFrame,
	endFrame,
	linesPerPage,
	subtitlesZoomMeasurerSize,
	subtitlesLineHeight,
	fps,
}) => {
	const frame = useCurrentFrame();
	const windowRef = useRef<HTMLDivElement>(null);
	const zoomMeasurer = useRef<HTMLDivElement>(null);
	// const [handle] = useState(() => delayRender());
	// const [fontHandle] = useState(() => delayRender());
	// const [fontLoaded, setFontLoaded] = useState(false);
	console.log('subtitles', subtitlesData);
	let windowedFrameSubs = useMemo(() => {
		return subtitlesData
			.map((item) => ({
				id: Number(item.index),
				start: Math.floor(item.startTime * fps),
				end: Math.floor(item.endTime * fps),
				text: item.text,
				wordTimings: item.wordTimings,
			}))
			.filter(({ start }) => start >= startFrame && start <= endFrame);
	}, [subtitlesData, fps, startFrame, endFrame]);

	const [lineOffset, setLineOffset] = useState(0);

	const currentAndFollowingSentences = useMemo(() => {
		// If we don't want to only display the current sentence, return all the words

		const indexOfCurrentSentence = windowedFrameSubs.findIndex((w) => {
			return w.end > frame; // Find the first subtitle that hasn't ended yet
		});

		if (indexOfCurrentSentence === -1) {
			return []; // No more subtitles to display
		}

		// Optionally, find the end of the current sentence
		const indexOfCurrentSentenceEnd = windowedFrameSubs.findIndex(
			(w, i) =>
				i > indexOfCurrentSentence &&
				(w.text.endsWith('?') || w.text.endsWith('.') || w.text.endsWith('!'))
		);

		// If we found the end of the sentence, return up to that. Otherwise, return everything after the current sentence
		return windowedFrameSubs.slice(
			indexOfCurrentSentence,
			indexOfCurrentSentenceEnd !== -1
				? indexOfCurrentSentenceEnd + 1
				: undefined
		);
	}, [frame, windowedFrameSubs]);

	useEffect(() => {
		const zoom =
			(zoomMeasurer.current?.getBoundingClientRect().height as number) /
			subtitlesZoomMeasurerSize;
		const linesRendered =
			(windowRef.current?.getBoundingClientRect().height as number) /
			(subtitlesLineHeight * zoom);
		const linesToOffset = Math.max(0, linesRendered - linesPerPage);
		setLineOffset(linesToOffset);
		// continueRender(handle);
	}, [frame, linesPerPage, subtitlesLineHeight, subtitlesZoomMeasurerSize]);

	const currentFrameSentences = currentAndFollowingSentences.filter((word) => {
		return word.start < frame;
	});

	return (
		<div className="w-[80%] mx-auto flex justify-center">
			<div
				ref={windowRef}
				style={{
					wordWrap: 'break-word',
					transform: `translateY(-${lineOffset * subtitlesLineHeight}px)`,
					textAlign: 'center',
				}}
			>
				{currentFrameSentences.map((item) => (
					<span
						key={item.id}
						id={String(item.id)}
						style={{
							display: 'inline',
						}}
					>
						<Word frame={frame} item={item} fps={fps} />{' '}
					</span>
				))}
				<div
					ref={zoomMeasurer}
					style={{
						height: subtitlesZoomMeasurerSize,
						width: subtitlesZoomMeasurerSize,
					}}
				/>
			</div>
		</div>
	);
};

declare global {
	interface Array<T> {
		findLastIndex(
			predicate: (value: T, index: number, obj: T[]) => unknown,
			thisArg?: unknown
		): number;
	}
}

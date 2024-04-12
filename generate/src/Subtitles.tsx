import parseSRT, { SubtitleItem } from 'parse-srt';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { Word } from './Word';

const useWindowedFrameSubs = (
	src: string,
	options: { windowStart: number; windowEnd: number }
) => {
	const { windowStart, windowEnd } = options;
	const config = useVideoConfig();
	const { fps } = config;

	const parsed = useMemo(() => parseSRT(src), [src]);

	return useMemo(() => {
		return parsed
			.map((item) => {
				const start = Math.floor(item.start * fps);
				const end = Math.floor(item.end * fps);
				return { item, start, end };
			})
			.filter(({ start }) => {
				return start >= windowStart && start <= windowEnd;
			})
			.map<SubtitleItem>(({ item, start, end }) => {
				return {
					...item,
					start,
					end,
				};
			}, []);
	}, [fps, parsed, windowEnd, windowStart]);
};

export const PaginatedSubtitles: React.FC<{
	subtitles: string;
	startFrame: number;
	endFrame: number;
	linesPerPage: number;
	subtitlesZoomMeasurerSize: number;
	subtitlesLineHeight: number;
}> = ({
	startFrame,
	endFrame,
	subtitles,
	linesPerPage,
	subtitlesZoomMeasurerSize,
	subtitlesLineHeight,
}) => {
	const frame = useCurrentFrame();
	const windowRef = useRef<HTMLDivElement>(null);
	const zoomMeasurer = useRef<HTMLDivElement>(null);
	// const [handle] = useState(() => delayRender());
	// const [fontHandle] = useState(() => delayRender());
	// const [fontLoaded, setFontLoaded] = useState(false);
	const windowedFrameSubs = useWindowedFrameSubs(subtitles, {
		windowStart: startFrame,
		windowEnd: endFrame,
	});

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
		<div>
			<div
				ref={windowRef}
				style={{
					transform: `translateY(-${lineOffset * subtitlesLineHeight}px)`,
				}}
			>
				{currentFrameSentences.map((item) => (
					<span key={item.id} id={String(item.id)}>
						<Word frame={frame} item={item} />{' '}
					</span>
				))}
			</div>
			<div
				ref={zoomMeasurer}
				style={{
					height: subtitlesZoomMeasurerSize,
					width: subtitlesZoomMeasurerSize,
				}}
			/>
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

import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import React from 'react';
import { useCurrentFrame, staticFile } from 'remotion';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

/**
 * Represents timing information for a single word in the subtitles
 */
export type WordTiming = {
	word: string;
	start: number;
	end: number;
};

/**
 * Represents a complete subtitle entry with timing and text information
 */
export type SubtitleEntry = {
	index: string;
	startTime: number;
	endTime: number;
	text: string;
	srt: string;
	srtFileIndex: number;
	wordTimings: WordTiming[];
};

/**
 * Schema for subtitle file configuration
 */
export const SubtitleFileSchema = z.object({
	name: z.string(),
	file: z.string().refine((s) => s.endsWith('.srt'), {
		message: 'Subtitle file must be a .srt file',
	}),
	asset: z.string(),
});

/**
 * Converts SRT timestamp format to seconds
 */
export const srtTimeToSeconds = (srtTime: string): number => {
	const [hours, minutes, secondsAndMillis] = srtTime.split(':');
	const [seconds, milliseconds] = secondsAndMillis.split(',');
	return (
		Number(hours) * 3600 +
		Number(minutes) * 60 +
		Number(seconds) +
		Number(milliseconds) / 1000
	);
};

/**
 * Converts seconds to SRT timestamp format
 */
export const secondsToSrtTime = (seconds: number): string => {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);
	const millis = Math.floor((seconds % 1) * 1000);

	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
		2,
		'0'
	)}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
};

/**
 * Parses SRT content into structured subtitle entries
 */
export const parseSRT = (
	srtContent: string,
	srtFileIndex: number
): SubtitleEntry[] => {
	const blocks = srtContent.split('\n\n');
	const MIN_DURATION = 0.5;

	const preliminaryEntries = blocks
		.map((block) => {
			const lines = block.split('\n');
			const indexLine = lines[0];
			const timeLine = lines[1];

			if (!indexLine || !timeLine || lines.length < 3) {
				return null;
			}

			const [startTime, endTime] = timeLine
				.split(' --> ')
				.map(srtTimeToSeconds);

			const textLines = lines.slice(2).join(' ');

			// Calculate word timings
			const words = textLines.split(' ');
			const timePerWord = (endTime - startTime) / words.length;
			const wordTimings = words.map((word, idx) => ({
				word,
				start: startTime + idx * timePerWord,
				end: startTime + (idx + 1) * timePerWord,
			}));

			return {
				index: indexLine,
				startTime,
				endTime,
				text: textLines,
				srt: block,
				srtFileIndex,
				wordTimings,
			};
		})
		.filter((entry): entry is SubtitleEntry => entry !== null);

	const combinedEntries: SubtitleEntry[] = [];
	let currentEntry: SubtitleEntry | null = null;
	let accumulatedText: string[] = [];
	let accumulatedWordTimings: WordTiming[] = [];

	for (const entry of preliminaryEntries) {
		if (!currentEntry) {
			currentEntry = entry;
			accumulatedText = [entry.text];
			accumulatedWordTimings = [...entry.wordTimings];
			continue;
		}

		const currentDuration = currentEntry.endTime - currentEntry.startTime;

		if (currentDuration < MIN_DURATION) {
			accumulatedText.push(entry.text);
			accumulatedWordTimings.push(...entry.wordTimings);
			currentEntry = {
				...currentEntry,
				endTime: entry.endTime,
				text: accumulatedText.join(' '),
				wordTimings: accumulatedWordTimings,
				srt: `${currentEntry.index}\n${secondsToSrtTime(
					currentEntry.startTime
				)} --> ${secondsToSrtTime(entry.endTime)}\n${accumulatedText.join(
					' '
				)}`,
			};
		} else {
			combinedEntries.push(currentEntry);
			currentEntry = entry;
			accumulatedText = [entry.text];
			accumulatedWordTimings = [...entry.wordTimings];
		}
	}

	if (currentEntry) {
		combinedEntries.push(currentEntry);
	}

	return combinedEntries;
};

/**
 * Props for the AudioViz component
 */
interface AudioVizProps {
	numberOfSamples: number;
	freqRangeStartIndex: number;
	waveColor: string;
	waveLinesToDisplay: number;
	mirrorWave: boolean;
	audioSrc: string;
}

/**
 * Component for visualizing audio waveforms
 */
export const AudioViz: React.FC<AudioVizProps> = ({
	numberOfSamples,
	waveColor,
	freqRangeStartIndex,
	waveLinesToDisplay,
	mirrorWave,
	audioSrc,
}) => {
	const frame = useCurrentFrame();
	const audioData = useAudioData(audioSrc);

	if (!audioData) {
		return null;
	}

	const frequencyData = visualizeAudio({
		fps: 60,
		frame,
		audioData,
		numberOfSamples,
	});

	const frequencyDataSubset = frequencyData.slice(
		freqRangeStartIndex,
		freqRangeStartIndex +
			(mirrorWave ? Math.round(waveLinesToDisplay / 2) : waveLinesToDisplay)
	);

	const frequencesToDisplay = mirrorWave
		? [...frequencyDataSubset.slice(1).reverse(), ...frequencyDataSubset]
		: frequencyDataSubset;

	return (
		<div className="transition-all audio-viz z-30">
			{frequencesToDisplay.map((v: number, i: number) => {
				return (
					<div
						key={i}
						className={`z-30 bar `}
						style={{
							backgroundColor: waveColor,
							minWidth: '1px',
							opacity: 0.5,
							height: `${500 * Math.sqrt(v)}%`,
						}}
					/>
				);
			})}
		</div>
	);
};

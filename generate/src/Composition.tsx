import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import React, { useEffect, useRef, useState } from 'react';
import {
	AbsoluteFill,
	Audio,
	continueRender,
	Img,
	OffthreadVideo,
	Sequence,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import { fps, music } from './tmp/context';
import { PaginatedSubtitles } from './Subtitles';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

type SubtitleEntry = {
	index: string;
	startTime: number;
	endTime: number;
	text: string;
	srt: string;
	srtFileIndex: number;
};

const AgentDetailsSchema = z.record(
	z.object({
		color: zColor(),
		image: z.string().refine((s) => s.endsWith('.png'), {
			message: 'Agent image must be a .png file',
		}),
	})
);

const srtTimeToSeconds = (srtTime: string) => {
	const [hours, minutes, secondsAndMillis] = srtTime.split(':');
	const [seconds, milliseconds] = secondsAndMillis.split(',');
	return (
		Number(hours) * 3600 +
		Number(minutes) * 60 +
		Number(seconds) +
		Number(milliseconds) / 1000
	);
};

const parseSRT = (
	srtContent: string,
	srtFileIndex: number
): SubtitleEntry[] => {
	// Split content into subtitle blocks
	const blocks = srtContent.split('\n\n');

	// Extract timestamps and text from each block
	return blocks
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

			// Combine all text lines into one text block
			const textLines = lines.slice(2).join(' ');

			return {
				index: indexLine,
				startTime,
				endTime,
				text: textLines,
				srt: block, // Include only this block of text
				srtFileIndex, // Add the index of the SRT file
			};
		})
		.filter((entry): entry is SubtitleEntry => entry !== null);
};

const SubtitleFileSchema = z.object({
	name: z.string(),
	file: z.string().refine((s) => s.endsWith('.srt'), {
		message: 'Subtitle file must be a .srt file',
	}),
	asset: z.string(),
});

export const AudioGramSchema = z.object({
	initialAgentName: z.string(),
	agentDetails: AgentDetailsSchema,
	videoFileName: z.string(),
	durationInSeconds: z.number().positive(),
	audioOffsetInSeconds: z.number().min(0),
	subtitlesFileName: z.array(SubtitleFileSchema),
	audioFileName: z.string().refine((s) => s.endsWith('.mp3'), {
		message: 'Audio file must be a .mp3 file',
	}),
	titleText: z.string(),
	titleColor: zColor(),
	subtitlesTextColor: zColor(),
	subtitlesLinePerPage: z.number().int().min(0),
	subtitlesLineHeight: z.number().int().min(0),
	subtitlesZoomMeasurerSize: z.number().int().min(0),
	mirrorWave: z.boolean(),
	waveLinesToDisplay: z.number().int().min(0),
	waveFreqRangeStartIndex: z.number().int().min(0),
	waveNumberOfSamples: z.enum(['32', '64', '128', '256', '512']),
});

type AudiogramCompositionSchemaType = z.infer<typeof AudioGramSchema>;

const AudioViz: React.FC<{
	numberOfSamples: number;
	freqRangeStartIndex: number;
	waveColor: string;
	waveLinesToDisplay: number;
	mirrorWave: boolean;
	audioSrc: string;
}> = ({
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
		fps,
		frame,
		audioData,
		numberOfSamples, // Use more samples to get a nicer visualisation
	});

	// Pick the low values because they look nicer than high values
	// feel free to play around :)
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
			{frequencesToDisplay.map((v, i) => {
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

export const AudiogramComposition: React.FC<AudiogramCompositionSchemaType> = ({
	subtitlesFileName,
	agentDetails,
	audioFileName,
	subtitlesLinePerPage,
	initialAgentName,
	waveNumberOfSamples,
	waveFreqRangeStartIndex,
	waveLinesToDisplay,
	subtitlesZoomMeasurerSize,
	subtitlesLineHeight,
	mirrorWave,
	audioOffsetInSeconds,
	videoFileName,
}) => {
	const [currentAgentName, setCurrentAgentName] = useState<string>('');
	const { durationInFrames, fps } = useVideoConfig();
	const frame = useCurrentFrame();
	const [subtitlesData, setSubtitlesData] = useState<SubtitleEntry[]>([]);
	const [currentSubtitle, setCurrentSubtitle] = useState<SubtitleEntry | null>(
		null
	);
	const [handle] = useState<number | null>(null);
	const [prevImageIdx, setPrevImageIdx] = useState<number>(0);
	const ref = useRef<HTMLDivElement>(null);
	const [currentSrtContent, setCurrentSrtContent] = useState<string>('');

	// Determine the current subtitle and agent based on the frame
	useEffect(() => {
		if (subtitlesData.length > 0) {
			const currentTime = frame / fps;
			const currentSubtitle = subtitlesData.find(
				(subtitle) =>
					currentTime >= subtitle.startTime && currentTime < subtitle.endTime
			);

			if (currentSubtitle) {
				setPrevImageIdx(currentSubtitle.srtFileIndex);
				setCurrentSubtitle(currentSubtitle);
				// Use the srtFileIndex to find the corresponding agent name
				const agentInfo = subtitlesFileName[currentSubtitle.srtFileIndex];
				setCurrentAgentName(agentInfo.name);
			}
		}
	}, [frame, fps, subtitlesData, subtitlesFileName]);

	// Fetch and parse all SRT files
	useEffect(() => {
		const fetchSubtitlesData = async () => {
			try {
				const data = await Promise.all(
					subtitlesFileName.map(async ({ file }, index) => {
						// Pass the index to parseSRT
						const response = await fetch(file);
						const text = await response.text();
						return parseSRT(text, index);
					})
				);
				setSubtitlesData(data.flat().sort((a, b) => a.startTime - b.startTime));
			} catch (error) {
				console.error('Error fetching subtitles:', error);
			}
		};

		fetchSubtitlesData();
	}, [subtitlesFileName]);

	// Determine the current subtitle based on the frame
	useEffect(() => {
		if (subtitlesData.length > 0) {
			const currentTime = frame / fps;
			const current = subtitlesData.find(
				(subtitle) =>
					currentTime >= subtitle.startTime && currentTime < subtitle.endTime
			);
			setCurrentSubtitle(current || null);
		}
	}, [frame, fps, subtitlesData]);

	// Ensure that the delayRender handle is cleared when the component unmounts
	useEffect(() => {
		return () => {
			if (handle !== null) {
				continueRender(handle);
			}
		};
	}, [handle]);

	useEffect(() => {
		if (currentSubtitle) {
			setCurrentSrtContent(currentSubtitle.srt);
		}
	}, [currentSubtitle]);

	const audioOffsetInFrames = Math.round(audioOffsetInSeconds * fps);

	return (
		<div ref={ref}>
			<AbsoluteFill>
				<Sequence from={-audioOffsetInFrames}>
					{/*@ts-ignore */}
					<Audio src={audioFileName} />
					{music !== 'NONE' && <Audio volume={0.25} src={staticFile(music)} />}
					<div className="relative -z-20 flex flex-col w-full h-full font-remotionFont">
						<div className="w-full h-[50%] relative">
							{/*@ts-ignore */}
							<Img
								src={
									subtitlesFileName[
										currentSubtitle?.srtFileIndex
											? currentSubtitle.srtFileIndex
											: prevImageIdx
									].asset
								}
								onError={(e) => {
									/*@ts-ignore */
									e.target.onerror = null; // Prevent looping if the fallback also fails
									/*@ts-ignore */
									e.target.src = '/black.png';
								}}
								className="w-full h-full"
							/>
							<div className="absolute bottom-2 left-2 flex flex-row gap-24 items-end h-full p-8 z-30">
								{/*@ts-ignore */}
								<Img
									width={200}
									height={200}
									className="z-30 transition-all rounded-full"
									src={staticFile(
										`/${currentAgentName || initialAgentName}.png`
									)}
								/>

								<div>
									<AudioViz
										audioSrc={audioFileName}
										mirrorWave={mirrorWave}
										waveColor={
											agentDetails[currentAgentName || initialAgentName].color
										}
										numberOfSamples={Number(waveNumberOfSamples)}
										freqRangeStartIndex={waveFreqRangeStartIndex}
										waveLinesToDisplay={waveLinesToDisplay}
									/>
								</div>
							</div>
						</div>
						<div className="relative w-full h-[50%]">
							<OffthreadVideo
								muted
								className=" h-full w-full object-cover"
								src={staticFile(videoFileName)}
							/>
							<div
								className="absolute flex flex-col items-center gap-2 opacity-[65%] z-30 bottom-12 right-12 text-white font-bold text-7xl"
								style={{
									textShadow: '4px 4px 0px #000000',
									WebkitTextStroke: '2px black',
								}}
							>
								brainrotjs
								<br></br>.com 🧠
							</div>
							<div
								style={{
									lineHeight: `${subtitlesLineHeight}px`,
									textShadow: '4px 4px 0px #000000',
									WebkitTextStroke: '2px black',
								}}
								className="font-remotionFont z-10 absolute text-center text-8xl drop-shadow-2xl text-white mx-24 top-8 left-0 right-0"
							>
								<PaginatedSubtitles
									subtitles={currentSrtContent.toUpperCase()}
									startFrame={audioOffsetInFrames}
									endFrame={audioOffsetInFrames + durationInFrames}
									linesPerPage={subtitlesLinePerPage}
									subtitlesZoomMeasurerSize={subtitlesZoomMeasurerSize}
									subtitlesLineHeight={subtitlesLineHeight}
								/>
							</div>
						</div>
					</div>
				</Sequence>
				<Sequence from={durationInFrames - 3 * fps}>
					<OffthreadVideo
						startFrom={20}
						muted
						className={`absolute -left-[1px] -top-[1px] h-full w-[101%] object-cover z-50 `}
						src={'https://images.smart.wtf/brainrot.mp4'}
					/>
				</Sequence>
			</AbsoluteFill>
		</div>
	);
};

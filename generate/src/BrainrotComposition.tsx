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
import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import { music, speakerOrder } from './tmp/context';
import { PaginatedSubtitles } from './Subtitles';
import {
	SubtitleEntry,
	SubtitleFileSchema,
	parseSRT,
} from './composition_helpers';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

export const BrainrotSchema = z.object({
	initialAgentName: z.string(),
	videoFileName: z.string().optional(),
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
});

export type BrainrotSchemaType = z.infer<typeof BrainrotSchema>;

export const BrainrotComposition: React.FC<BrainrotSchemaType> = ({
	subtitlesFileName,
	audioFileName,
	subtitlesLinePerPage,
	initialAgentName,
	subtitlesZoomMeasurerSize,
	subtitlesLineHeight,
	audioOffsetInSeconds,
	videoFileName,
}) => {
	const [currentAgentName, setCurrentAgentName] = useState<string>('');
	const { durationInFrames, fps } = useVideoConfig();
	const frame = useCurrentFrame();
	const audioData = useAudioData(audioFileName);
	const [subtitlesData, setSubtitlesData] = useState<SubtitleEntry[]>([]);
	const [currentSubtitle, setCurrentSubtitle] = useState<SubtitleEntry | null>(
		null
	);
	const [handle] = useState<number | null>(null);
	const ref = useRef<HTMLDivElement>(null);

	const getCurrentAmplitude = () => {
		console.log('audio datw', audioData);
		if (!audioData) return 0;
		const frequencyData = visualizeAudio({
			fps,
			frame,
			audioData,
			numberOfSamples: 32,
		});
		console.log('frequency data', frequencyData);

		// Get the average amplitude
		const amplitude =
			frequencyData.reduce((sum, val) => sum + val, 0) / frequencyData.length;
		console.log('amplitude', amplitude * 50);
		return amplitude * 50; // Adjust this multiplier to control the bounce intensity
	};

	useEffect(() => {
		if (subtitlesData.length > 0) {
			const currentTime = frame / fps;
			const currentSubtitle = subtitlesData.find(
				(subtitle) =>
					currentTime >= subtitle.startTime && currentTime < subtitle.endTime
			);

			if (currentSubtitle) {
				setCurrentSubtitle(currentSubtitle);
				const agentInfo = subtitlesFileName[currentSubtitle.srtFileIndex];
				setCurrentAgentName(agentInfo.name);
			}
		}
	}, [frame, fps, subtitlesData, subtitlesFileName]);

	useEffect(() => {
		const fetchSubtitlesData = async () => {
			try {
				const data = await Promise.all(
					subtitlesFileName.map(async ({ file }, index) => {
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

	useEffect(() => {
		return () => {
			if (handle !== null) {
				continueRender(handle);
			}
		};
	}, [handle]);

	const audioOffsetInFrames = Math.round(audioOffsetInSeconds * fps);
	const resolvedSpeakerOrder =
		speakerOrder.length > 0
			? speakerOrder
			: Array.from(new Set(subtitlesFileName.map(({ name }) => name)));
	const activeSpeakerName = currentAgentName || initialAgentName;
	const activeSpeakerIndex = resolvedSpeakerOrder.indexOf(activeSpeakerName);
	const useRightSide =
		activeSpeakerIndex === -1 ? true : activeSpeakerIndex % 2 === 0;

	return (
		<div ref={ref}>
			<AbsoluteFill>
				<Sequence from={-audioOffsetInFrames}>
					<Audio src={audioFileName} />
					{music !== 'NONE' && <Audio volume={0.1} src={staticFile(music)} />}
					<div className="relative -z-20 flex flex-col w-full h-full font-remotionFont">
						{videoFileName && (
							<OffthreadVideo
								muted
								className="h-full w-full object-cover"
								src={staticFile(videoFileName)}
							/>
						)}
						<div
							className="absolute flex flex-col items-center gap-2 opacity-[65%] z-30 bottom-8 right-8 text-white font-bold text-5xl"
							style={{
								textShadow: '3px 3px 0px #000000',
								WebkitTextStroke: '1.5px black',
							}}
						>
							brainrotjs
							<br></br>.com 🧠
						</div>
						<div
							className={`absolute left-0 right-0 flex flex-row p-5 z-30 transition-all duration-500 ease-in-out ${
								currentSubtitle ? '-bottom-[75px]' : '-bottom-[1000px]'
							} ${useRightSide ? 'justify-end' : 'justify-start'}`}
						>
							<Img
								width={400}
								height={400}
								style={{
									transform: `translateY(${-getCurrentAmplitude() * 17}px)`,
								}}
								className="z-30 transition-all rounded-full"
								src={staticFile(
									`/pose/${
										useRightSide ? 'right' : 'left'
									}/${activeSpeakerName}.png`
								)}
							/>
						</div>
						<div
							style={{
								lineHeight: `${subtitlesLineHeight}px`,
								textShadow: '3px 3px 0px #000000',
								WebkitTextStroke: '1.5px black',
							}}
							className="font-remotionFont z-10 absolute text-center text-6xl drop-shadow-2xl text-white mx-16 top-1/2 -translate-y-1/2 left-0 right-0"
						>
							<PaginatedSubtitles
								fps={fps}
								startFrame={audioOffsetInFrames}
								endFrame={audioOffsetInFrames + durationInFrames}
								linesPerPage={subtitlesLinePerPage}
								subtitlesZoomMeasurerSize={subtitlesZoomMeasurerSize}
								subtitlesLineHeight={subtitlesLineHeight}
								subtitlesData={subtitlesData}
							/>
						</div>
					</div>
				</Sequence>
			</AbsoluteFill>
		</div>
	);
};

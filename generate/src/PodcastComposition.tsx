import React, { useEffect, useState } from 'react';
import {
	AbsoluteFill,
	Audio,
	Img,
	OffthreadVideo,
	Sequence,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import { music } from './tmp/context';
import { PaginatedSubtitles } from './Subtitles';
import {
	findSubtitleForTime,
	SubtitleEntry,
	SubtitleFileSchema,
	parseSRT,
} from './composition_helpers';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

export const PodcastSchema = z.object({
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

export type PodcastSchemaType = z.infer<typeof PodcastSchema>;

export const PodcastComposition: React.FC<PodcastSchemaType> = ({
	subtitlesFileName,
	audioFileName,
	subtitlesLinePerPage,
	initialAgentName,
	subtitlesZoomMeasurerSize,
	subtitlesLineHeight,
	audioOffsetInSeconds,
	videoFileName,
}) => {
	const { durationInFrames, fps } = useVideoConfig();
	const frame = useCurrentFrame();
	const audioData = useAudioData(audioFileName);
	const [subtitlesData, setSubtitlesData] = useState<SubtitleEntry[]>([]);

	const getCurrentAmplitude = () => {
		if (!audioData) return 0;
		const frequencyData = visualizeAudio({
			fps,
			frame,
			audioData,
			numberOfSamples: 32,
		});

		const amplitude =
			frequencyData.reduce((sum, val) => sum + val, 0) / frequencyData.length;
		return amplitude * 50;
	};

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

	const audioOffsetInFrames = Math.round(audioOffsetInSeconds * fps);
	const currentSubtitle = findSubtitleForTime(subtitlesData, frame / fps, {
		holdSameSpeakerGaps: true,
	});
	const activeAgentName = currentSubtitle
		? subtitlesFileName[currentSubtitle.srtFileIndex]?.name ?? initialAgentName
		: initialAgentName;
	const useRightSide = subtitlesFileName[0]
		? activeAgentName === subtitlesFileName[0].name
		: true;

	return (
		<div>
			<AbsoluteFill>
				<Sequence from={-audioOffsetInFrames}>
					<Audio src={audioFileName} />
					{music !== 'NONE' && (
						<Audio loop volume={0.1} src={staticFile(music)} />
					)}
					<div className="relative -z-20 flex h-full w-full flex-col font-remotionFont">
						{videoFileName && (
							<OffthreadVideo
								muted
								className="h-full w-full object-cover"
								src={staticFile(videoFileName)}
							/>
						)}
						<div
							className="absolute bottom-8 right-8 z-30 flex flex-col items-center gap-2 text-5xl font-bold text-white opacity-[65%]"
							style={{
								textShadow: '3px 3px 0px #000000',
								WebkitTextStroke: '1.5px black',
							}}
						>
							brainrotjs
							<br></br>.com 🧠
						</div>
						<div
							className={`absolute left-0 right-0 z-30 flex flex-row p-5 transition-all duration-500 ease-in-out ${
								currentSubtitle ? '-bottom-[170px]' : '-bottom-[1000px]'
							} ${useRightSide ? 'justify-end' : 'justify-start'}`}
						>
							<Img
								width={400}
								height={400}
								style={{
									transform: `translateY(${-getCurrentAmplitude() * 17}px)`,
								}}
								className="z-30 rounded-full transition-all"
								src={staticFile(
									`/pose/${useRightSide ? 'right' : 'left'}/${activeAgentName}.png`
								)}
							/>
						</div>
						<div
							style={{
								lineHeight: `${subtitlesLineHeight}px`,
								textShadow: '3px 3px 0px #000000',
								WebkitTextStroke: '1.5px black',
							}}
							className="absolute left-0 right-0 top-1/2 z-10 -translate-y-1/2 text-center text-6xl text-white drop-shadow-2xl font-remotionFont"
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

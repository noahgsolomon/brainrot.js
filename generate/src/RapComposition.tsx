import React, { useEffect, useRef, useState } from 'react';
import {
	AbsoluteFill,
	Audio,
	continueRender,
	Img,
	Sequence,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import { PaginatedSubtitles } from './Subtitles';
import {
	SubtitleEntry,
	SubtitleFileSchema,
	parseSRT,
} from './composition_helpers';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';
// import { rapper, imageBackground } from './tmp/context';

export const RapSchema = z.object({
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

export type RapSchemaType = z.infer<typeof RapSchema>;

export const RapComposition: React.FC<RapSchemaType> = ({
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
	const [subtitlesData, setSubtitlesData] = useState<SubtitleEntry[]>([]);
	const [handle] = useState<number | null>(null);
	const ref = useRef<HTMLDivElement>(null);

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
		return () => {
			if (handle !== null) {
				continueRender(handle);
			}
		};
	}, [handle]);

	const audioOffsetInFrames = Math.round(audioOffsetInSeconds * fps);

	return (
		<div ref={ref}>
			<AbsoluteFill>
				<Sequence from={-audioOffsetInFrames}>
					<Audio src={audioFileName} />
					{/* <Img
						src={staticFile(imageBackground)}
						className="h-full w-full object-cover"
					/> */}
					<div className="relative -z-20 flex flex-col w-full h-full font-remotionFont">
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
							className="font-remotionFont z-10 absolute text-center text-8xl drop-shadow-2xl text-white mx-24 top-1/2 -translate-y-1/2 left-0 right-0"
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

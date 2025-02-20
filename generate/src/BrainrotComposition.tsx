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
import {
	AudioViz,
	SubtitleEntry,
	AudiogramCompositionSchemaType,
	parseSRT,
} from './composition_helpers';

export const BrainrotComposition: React.FC<AudiogramCompositionSchemaType> = ({
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
	useBackground,
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

	return (
		<div ref={ref}>
			<AbsoluteFill>
				<Sequence from={-audioOffsetInFrames}>
					<Audio src={audioFileName} />
					{music !== 'NONE' && <Audio volume={0.25} src={staticFile(music)} />}
					<div className="relative -z-20 flex flex-col w-full h-full font-remotionFont">
						<div className="w-full h-[50%] relative">
							<Img
								src={
									subtitlesFileName[
										currentSubtitle?.srtFileIndex
											? currentSubtitle.srtFileIndex
											: prevImageIdx
									].asset
								}
								onError={(e) => {
									e.target.onerror = null;
									e.target.src = '/black.png';
								}}
								className="w-full h-full"
							/>
							<div className="absolute bottom-2 left-2 flex flex-row gap-24 items-end h-full p-8 z-30">
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
							{useBackground && videoFileName && (
								<OffthreadVideo
									muted
									className="h-full w-full object-cover"
									src={staticFile(videoFileName)}
								/>
							)}
							{!useBackground && (
								<div className="h-full w-full bg-black" />
							)}
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

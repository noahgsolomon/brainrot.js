import { Composition, staticFile } from 'remotion';
import { AudioGramSchema, AudiogramComposition, fps } from './Composition';
import './style.css';
import { useEffect, useState } from 'react';
import {
	initialAgentName,
	subtitlesFileName,
	videoFileName,
} from './tmp/context';
import { getAudioDuration } from '@remotion/media-utils';

export const RemotionRoot: React.FC = () => {
	const [audioDuration, setAudioDuration] = useState<number>(60);

	useEffect(() => {
		const loadAudio = async () => {
			const duration = await getAudioDuration(staticFile('audio.mp3'));
			setAudioDuration(Math.round(duration));
		};

		loadAudio();
	}, []);

	return (
		<>
			<Composition
				id="Video"
				component={AudiogramComposition}
				fps={fps}
				width={1080}
				height={1920}
				schema={AudioGramSchema}
				defaultProps={{
					// Audio settings
					audioOffsetInSeconds: 0,
					// Title settings
					audioFileName: staticFile('audio.mp3'),
					titleText: 'Back propagation',
					titleColor: 'rgba(186, 186, 186, 0.93)',

					initialAgentName,

					// Subtitles settings
					subtitlesFileName,
					videoFileName,
					agentDetails: {
						JOE_ROGAN: {
							color: '#bc462b',
							image: 'JOE_ROGAN.png',
						},
						JORDAN_PETERSON: {
							color: '#ffffff',
							image: 'JORDAN_PETERSON.png',
						},
						BEN_SHAPIRO: {
							color: '#90EE90',
							image: 'BEN_SHAPIRO.png',
						},
						BARACK_OBAMA: {
							color: '#A020F0',
							image: 'BARACK_OBAMA.png',
						},
						RICK_SANCHEZ: {
							color: '#b6def1',
							image: 'rick.png',
						},
					},
					onlyDisplayCurrentSentence: true,
					subtitlesTextColor: 'rgba(255, 255, 255, 0.93)',
					subtitlesLinePerPage: 6,
					subtitlesZoomMeasurerSize: 10,
					subtitlesLineHeight: 128,

					// Wave settings
					waveFreqRangeStartIndex: 7,
					waveLinesToDisplay: 15,
					waveNumberOfSamples: '256', // This is string for Remotion controls and will be converted to a number
					mirrorWave: true,
					durationInSeconds: audioDuration,
				}}
				// Determine the length of the video based on the duration of the audio file
				calculateMetadata={({ props }) => {
					return {
						durationInFrames: props.durationInSeconds * fps,
						props,
					};
				}}
			/>
		</>
	);
};

import { Composition, staticFile } from 'remotion';
import { AudioGramSchema, AudiogramComposition } from './Composition';
import './style.css';
import {
	initialAgentName,
	subtitlesFileName,
	videoFileName,
	fps,
} from './tmp/context';
import { getAudioDuration } from '@remotion/media-utils';

const PROCESS_ID = 0;

export const RemotionRoot: React.FC = () => {
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
					audioFileName: staticFile(`audio-${PROCESS_ID}.mp3`),
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
						DONALD_TRUMP: {
							color: '#b32134',
							image: 'DONALD_TRUMP.png',
						},
						JOE_BIDEN: {
							color: '#0000ff',
							image: 'JOE_BIDEN.png',
						},
						KAMALA_HARRIS: {
							color: '#0000ff',
							image: 'KAMALA_HARRIS.png',
						},
						ANDREW_TATE: {
							color: '#0000ff',
							image: 'ANDREW_TATE.png',
						},
					},
					subtitlesTextColor: 'rgba(255, 255, 255, 0.93)',
					subtitlesLinePerPage: 6,
					subtitlesZoomMeasurerSize: 10,
					subtitlesLineHeight: 128,

					// Wave settings
					waveFreqRangeStartIndex: 7,
					waveLinesToDisplay: 30,
					waveNumberOfSamples: '256', // This is string for Remotion controls and will be converted to a number
					mirrorWave: true,
					durationInSeconds: 60,
				}}
				// Determine the length of the video based on the duration of the audio file
				calculateMetadata={async ({ props }) => {
					const duration =
						(await getAudioDuration(staticFile(`audio-${PROCESS_ID}.mp3`))) + 3;
					return {
						durationInFrames: Math.ceil(duration * fps),
						props,
					};
				}}
			/>
		</>
	);
};

import { Composition, staticFile } from 'remotion';
import { BrainrotComposition, BrainrotSchema } from './BrainrotComposition';
import { PodcastComposition, PodcastSchema } from './PodcastComposition';
import { MonologueComposition, MonologueSchema } from './MonologueComposition';
import './style.css';
import {
	initialAgentName,
	subtitlesFileName,
	videoFileName,
	videoMode,
} from './tmp/context';
import { getAudioDuration } from '@remotion/media-utils';

export const RemotionRoot: React.FC = () => {
	const getCompositionProps = () => {
		const baseProps = {
			// Audio settings
			audioOffsetInSeconds: 0,
			// Title settings
			audioFileName: staticFile(`audio.mp3`),
			titleText: 'Back propagation',
			titleColor: 'rgba(186, 186, 186, 0.93)',
			initialAgentName,
			// Video settings
			videoFileName,
			// Subtitles settings
			subtitlesFileName: subtitlesFileName.map((sub) => ({
				...sub,
				asset: sub.file,
			})),
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
			waveNumberOfSamples: '256',
			mirrorWave: true,
			durationInSeconds: 60,
		};

		// Mode-specific modifications
		switch (videoMode as VideoMode) {
			case 'podcast':
				return {
					...baseProps,
				};
			case 'monologue':
				return {
					...baseProps,
				};
			case 'brainrot':
				return {
					...baseProps,
				};
			case 'rap':
				return {
					...baseProps,
				};
			default:
				return baseProps;
		}
	};

	const getCompositionComponent = () => {
		switch (videoMode as VideoMode) {
			case 'podcast':
				return PodcastComposition;
			case 'monologue':
				return MonologueComposition;
			case 'brainrot':
				return BrainrotComposition;
			case 'rap':
				return RapComposition;
			default:
				return BrainrotComposition;
		}
	};

	const getCompositionSchema = () => {
		switch (videoMode as VideoMode) {
			case 'podcast':
				return PodcastSchema;
			case 'monologue':
				return MonologueSchema;
			case 'brainrot':
			default:
				return BrainrotSchema;
		}
	};

	return (
		<>
			<Composition
				id="Video"
				component={getCompositionComponent()}
				fps={60}
				width={1080}
				height={1920}
				schema={getCompositionSchema()}
				defaultProps={getCompositionProps()}
				calculateMetadata={async ({ props }) => {
					const duration =
						(await getAudioDuration(staticFile(`audio.mp3`))) + 0.5;
					return {
						durationInFrames: Math.ceil(duration * 60),
						props,
					};
				}}
			/>
		</>
	);
};

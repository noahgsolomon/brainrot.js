// this is so that we don't get import errors for other compositions.
export const generateFillerContext = (videoMode: VideoMode) => {
		switch (videoMode) {
			case 'rap':
				return `
	
	            export const music: string = 'NONE';
	            export const initialAgentName = 'JORDAN_PETERSON';
	            export const videoFileName = '/background/MINECRAFT-1.mp4';
	            export const speakerOrder = [];
	            export const slowModeIntervals = [];
	            
	            export const subtitlesFileName = [];
	            `;
			case 'brainrot':
				return `
	
	            export const speakerOrder = [];
	            export const slowModeIntervals = [];
	            export const rapper: string = 'SPONGEBOB';
	            export const imageBackground: string = '/rap/SPONGEBOB.png';
	            `;
		default:
			return '';
	}
};

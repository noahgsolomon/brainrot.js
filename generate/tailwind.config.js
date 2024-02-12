/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{ts,tsx}'],
	theme: {
		extend: {
			spacing: {
				baseSize: 'var(--base-size)',
			},
			fontFamily: {
				remotionFont: 'var(--remotion-font)',
			},
		},
	},
	plugins: [],
};

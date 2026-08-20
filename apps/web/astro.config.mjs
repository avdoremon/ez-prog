// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
	integrations: [
		react(),
		starlight({
			// Named from IMPLEMENTATION_PLAN.md's own title. This string is the
			// site header and every page's <title> suffix — change it here if
			// the project is ever branded differently.
			title: 'CS Learning Platform',
			customCss: ['./src/styles/tokens.css', './src/styles/viz.css'],
			// Expressive Code (the fenced-code-block renderer) keeps its own
			// dark/light theme pair and swaps on `data-theme`, independently of
			// the --sl-color-* variables. Left at its default it kept painting
			// dark syntax colours onto the now-light background — #c792ea on
			// #edeef3, 2.07:1. One palette means one code theme.
			expressiveCode: { themes: ['github-light'] },
			components: {
				// The project has one palette (§8); tokens.css forces it on.
				// A theme toggle here would change nothing — see the component.
				ThemeSelect: './src/components/EmptyThemeSelect.astro',
			},
			head: [
				{
					// Marks the document as JS-capable before first paint, so
					// `.js .viz` can reserve the space the visualization island
					// will occupy once it hydrates (see viz.css). Without the
					// reservation the island expands from one line to ~700px and
					// shoves the rest of the lesson down — a 0.307 layout shift.
					// Gated on this class so readers with JS disabled, who only
					// ever see the short <noscript> text, get no blank gap.
					tag: 'script',
					content: "document.documentElement.classList.add('js');",
				},
			],
			// No social links: the scaffold's pointed at withastro/starlight,
			// which is not this project. Add a real one when the repository has
			// a public home.
			sidebar: [
				{
					label: 'Algorithms',
					items: [{ autogenerate: { directory: 'algorithms' } }],
				},
				{
					label: 'Complexity',
					items: [{ autogenerate: { directory: 'complexity' } }],
				},
			],
		}),
	],
});

// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
	integrations: [
		react(),
		starlight({
			title: 'My Docs',
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
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/withastro/starlight' }],
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

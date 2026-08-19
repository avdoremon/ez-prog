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

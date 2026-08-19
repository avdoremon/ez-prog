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

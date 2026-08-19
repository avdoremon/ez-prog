import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { LANGS } from './lib/langs.js';

export const lessonSchema = z.object({
  order: z.number().int(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedMinutes: z.number().int().min(2).max(12),
  viz: z.string().optional(),
  prerequisites: z.array(z.string()).default([]),
  languages: z.array(z.enum(LANGS)).default([]),
  problems: z.array(z.string()).default([]),
});

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({ extend: lessonSchema }),
  }),
};

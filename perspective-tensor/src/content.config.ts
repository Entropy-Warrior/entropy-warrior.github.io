import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    pubDate: z.coerce.date().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().optional()
  })
});

const code = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/code' }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    pubDate: z.coerce.date().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().optional()
  })
});

const growth = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/growth' }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    pubDate: z.coerce.date().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().optional()
  })
});

export const collections = { blog, code, growth };

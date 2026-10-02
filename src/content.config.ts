import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Educational guides (`/learn/*`). Each is a Markdown file in `src/content/learn/`.
 * Frontmatter drives the page title, meta description, Article JSON-LD and the FAQ block.
 */
const learn = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/learn' }),
  schema: z.object({
    title: z.string().max(70),
    description: z.string().max(170),
    /** Section on the index page. */
    group: z.enum(['Basics', 'Returns and risk', 'Fund types', 'Tax']),
    /** Sort order within the index. */
    order: z.number(),
    /** ISO dates; `dateModified` is when the facts were last checked. */
    datePublished: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateModified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    faqs: z.array(z.object({ question: z.string(), answer: z.string() })).min(2),
    /** Slugs of related guides. */
    related: z.array(z.string()).default([]),
  }),
});

/** Site pages written in Markdown: methodology, about, privacy, disclaimer. */
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string().max(70),
    description: z.string().max(170),
    /** ISO date the content was last reviewed. */
    dateModified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
});

export const collections = { learn, pages };

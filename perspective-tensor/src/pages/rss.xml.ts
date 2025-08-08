import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';

export const GET: APIRoute = async ({ site }) => {
  const posts = await getCollection('blog', ({ data }) => data.draft !== true);
  
  // Sort posts by date (newest first)
  posts.sort((a, b) => {
    const dateA = a.data.pubDate || new Date(0);
    const dateB = b.data.pubDate || new Date(0);
    return dateB.getTime() - dateA.getTime();
  });

  return rss({
    title: 'Perspective Tensor',
    description: 'Personal blog exploring AI, machine learning, complexity theory, and data science through a first principles lens.',
    site: site!,
    items: posts.map(post => ({
      title: post.data.title || post.id,
      description: post.data.description || '',
      pubDate: post.data.pubDate || new Date(),
      link: `/blog/${post.id}`,
      author: post.data.author || 'Lin Wang',
    })),
    customData: '<language>en-us</language>',
  });
};

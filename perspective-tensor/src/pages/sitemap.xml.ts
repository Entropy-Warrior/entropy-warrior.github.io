import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async ({ site }) => {
  const posts = await getCollection('blog', ({ data }) => data.draft !== true);
  
  const staticPages = [
    '',
    'blog',
  ];

  const sitemapEntries = [
    ...staticPages.map(page => ({
      url: `${site}${page}`,
      lastmod: new Date().toISOString(),
      changefreq: page === '' ? 'weekly' : 'monthly',
      priority: page === '' ? '1.0' : '0.8'
    })),
    ...posts.map(post => ({
      url: `${site}blog/${post.id}`,
      lastmod: post.data.pubDate?.toISOString() || new Date().toISOString(),
      changefreq: 'monthly',
      priority: '0.6'
    }))
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.map(entry => `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
};

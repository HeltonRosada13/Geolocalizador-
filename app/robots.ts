import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: 'https://ais-pre-qf7s6bypdukcb5bwdncfuc-388026503543.europe-west2.run.app/sitemap.xml',
  };
}

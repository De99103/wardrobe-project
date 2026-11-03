import Head from 'expo-router/head';

const siteUrl = 'https://wearly-closet-app.vercel.app';

type RouteSeoProps = {
  title: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
};

/** Web metadata only. It has no effect on the native iOS or Android experience. */
export function RouteSeo({ title, description, path = '/', noIndex = false }: RouteSeoProps) {
  const url = `${siteUrl}${path}`;
  return (
    <Head>
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}
      <link rel="canonical" href={url} />
      {noIndex ? <meta name="robots" content="noindex, nofollow" /> : null}
    </Head>
  );
}

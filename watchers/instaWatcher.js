// Fetches an embed-fix mirror page (e.g. ddinstagram.com) server-side and
// pulls the Open Graph media tags out of the HTML ourselves, so the bot can
// build its own Discord embed instead of relying on Discord's automatic
// link unfurler. This means the mirror URL never has to appear as visible,
// clickable plain text in the channel.
//
// IMPORTANT: these embed-fix services only serve the "fixed" HTML (with
// og:image/og:video tags) to requests whose User-Agent matches Discord's
// real crawler. Anything else gets redirected straight to instagram.com,
// which has no scrapable data without a logged-in session. The string
// below must match Discord's actual crawler UA exactly.
const USER_AGENT =
  'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)';

function extractMetaTags(html) {
  const tags = html.match(/<meta[^>]*>/gi) || [];
  return tags
    .map(tag => {
      const property = tag.match(/property=["']([^"']+)["']/i);
      const content = tag.match(/content=["']([^"']*)["']/i);
      if (!property || !content) return null;
      return { property: property[1].toLowerCase(), content: content[1] };
    })
    .filter(Boolean);
}

module.exports = async function fetchInstaEmbed(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    redirect: 'follow'
  });

  if (!res.ok) {
    console.error(`fetchInstaEmbed: ${url} -> HTTP ${res.status}`);
    return null;
  }

  // If the final URL landed back on instagram.com, the mirror redirected
  // us instead of serving fixed OG tags — usually a User-Agent mismatch
  // or the post genuinely being unavailable via that mirror.
  if (/(?:^|\/\/)(?:www\.)?instagram\.com/i.test(res.url)) {
    console.error(`fetchInstaEmbed: ${url} redirected to ${res.url}, no fixed data available`);
    return null;
  }

  const html = await res.text();
  const meta = extractMetaTags(html);

  const images = meta
    .filter(m => m.property === 'og:image')
    .map(m => m.content);

  const video = meta.find(
    m => m.property === 'og:video' || m.property === 'og:video:secure_url'
  );

  const title = meta.find(m => m.property === 'og:title');
  const description = meta.find(m => m.property === 'og:description');

  if (!images.length && !video) {
    console.error(`fetchInstaEmbed: ${url} returned HTML with no og:image/og:video tags`);
    return null;
  }

  return {
    images,
    video: video ? video.content : null,
    title: title ? title.content : null,
    description: description ? description.content : null
  };
};

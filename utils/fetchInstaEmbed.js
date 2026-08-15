// Fetches a zzinstagram.com page server-side and pulls the Open Graph
// media tags out of the HTML ourselves, so the bot can build its own
// Discord embed instead of relying on Discord's automatic link unfurler.
// This means the zzinstagram.com URL never has to appear as visible,
// clickable plain text in the channel.

const USER_AGENT =
  'Mozilla/5.0 (compatible; DiscordBot/1.0; +https://discordapp.com)';

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
  if (!res.ok) return null;

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

  if (!images.length && !video) return null;

  return {
    images,
    video: video ? video.content : null,
    title: title ? title.content : null,
    description: description ? description.content : null
  };
};

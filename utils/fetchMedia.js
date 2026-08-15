const { igdl } = require('btch-downloader');

module.exports = async function fetchInstaMedia(url) {
  const response = await igdl(url);
  if (!response || !response.status || !response.result || !response.result.length) {
    return null;
  }
  return response.result[0].url;
};

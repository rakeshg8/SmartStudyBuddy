// simple chunker by words or characters
export function chunkText(pageText, chunkSize=500) {
  const words = pageText.split(/\s+/);
  const chunks = [];
  for (let i=0; i<words.length; i+=chunkSize) {
    chunks.push(words.slice(i, i+chunkSize).join(' '));
  }
  return chunks;
}

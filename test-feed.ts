import { parseRssFeed } from './lib/content';

async function test() {
  const res = await fetch('https://www.nacaojuridica.com.br/feed/', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  console.log('Status:', res.status);
  const xml = await res.text();
  console.log('XML size:', xml.length);
  try {
    const { feed, items } = parseRssFeed(xml);
    console.log('Items parsed:', items.length);
  } catch (e) {
    console.error('Parse error:', e);
  }
}
test();

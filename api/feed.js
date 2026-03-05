export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://danielssal.com');

  try {
    const response = await fetch('https://daniconomics.substack.com/api/v1/posts?limit=20');
    if (!response.ok) throw new Error(`Substack ${response.status}`);
    const posts = await response.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json(posts);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}

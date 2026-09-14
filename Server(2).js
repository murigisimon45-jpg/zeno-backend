require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors({origin: '*'}));
app.use(express.json());

async function googleSearch(query){
  const key = process.env.SERPER_API_KEY;
  if(!key) throw new Error("Missing SERPER_API_KEY");
  const res = await fetch('https://google.serper.dev/search',{
    method:'POST',
    headers:{'X-API-KEY':key, 'Content-Type':'application/json'},
    body: JSON.stringify({q: query, num: 8, gl: 'ke'})
  });
  const data = await res.json();
  if(!data.organic) throw new Error("Serper error: "+JSON.stringify(data));
  return data.organic.map(i => ({title:i.title, snippet:i.snippet, link:i.link}));
}

app.get('/', (req,res)=> res.send('Zeno AI backend live - use POST /api/chat'));
app.get('/api/health', (req,res)=> res.json({status:'online', time:new Date().toISOString()}));

app.post('/api/chat', async (req,res)=>{
  try{
    const {prompt} = req.body;
    if(!prompt) return res.json({answer:"Ask me anything"});
    const results = await googleSearch(prompt);
    const context = results.map(r => `${r.title}: ${r.snippet} [${r.link}]`).join('\n');
    // Permanent knowledge: answer from live Google snippets (no OpenAI needed)
    const answer = `**Live Google results for: ${prompt}**\n\n` + 
      results.map((r,i)=> `**${i+1}. ${r.title}**\n${r.snippet}\n_Source: ${r.link}_`).join('\n\n') +
      `\n\nWant a summarized answer? Add OPENAI_API_KEY in Render dashboard and I'll summarize these results intelligently.`;
    res.json({answer, sources: results.map(r=>r.link)});
  }catch(e){
    console.error(e);
    res.status(500).json({answer:"Backend error: "+e.message});
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log(`Zeno backend live on ${PORT}`));
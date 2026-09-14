require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors({origin: '*'}));
app.use(express.json());

app.get('/', (req,res)=> res.send('Zeno backend live'));
app.get('/api/health', (req,res)=> res.json({status:'online'}));

async function googleSearch(query){
  const key = process.env.SERPER_API_KEY;
  if(!key) throw new Error("Missing SERPER_API_KEY in Render env vars");
  const r = await fetch('https://google.serper.dev/search',{
    method:'POST',
    headers:{'X-API-KEY':key,'Content-Type':'application/json'},
    body: JSON.stringify({q: query, num: 6, gl: 'ke'})
  });
  const data = await r.json();
  if(!data.organic) throw new Error(JSON.stringify(data));
  return data;
}

function makeShortAnswer(prompt, data){
  const q = prompt.toLowerCase();
  const organic = data.organic || [];
  const answerBox = data.answerBox || {};
  const first = organic[0] || {};

  // 1. If Google has direct answerBox (capital, definition)
  if(answerBox.answer) return answerBox.answer;
  if(answerBox.snippet) return answerBox.snippet.split('.').slice(0,2).join('. ') + '.';

  // 2. Capital city -> extract short
  if(q.includes('capital') && first.snippet){
     // try to find "capital is X" or "Hanoi is the capital"
     const m = first.snippet.match(/([A-Z][a-z]+) is the capital/i) || first.title.match(/([A-Z][a-z]+)/);
     if(m) return `${m[1]}.`;
  }

  // 3. For simple factual queries (what is, who is, where is, capital, currency, etc) -> give first result short
  const isShortQuery = q.split(' ').length <= 8 || q.includes('capital') || q.includes('currency') || q.includes('population') || q.startsWith('what is') || q.startsWith('who is');
  if(isShortQuery && first.snippet){
    // Take first 1-2 sentences max 180 chars
    let s = first.snippet.split('. ').slice(0,2).join('. ');
    if(s.length > 220) s = s.substring(0,200) + '...';
    // Clean
    return s.trim();
  }

  // 4. Default: concise summary of top result
  if(first.snippet){
    let s = first.snippet.split('. ').slice(0,2).join('. ');
    if(s.length > 280) s = s.substring(0,260) + '...';
    return s;
  }
  return first.title || "I couldn't find a short answer.";
}

app.post('/api/chat', async (req,res)=>{
  try{
    const {prompt} = req.body;
    if(!prompt) return res.json({answer:"Ask me anything", sources:[]});
    const data = await googleSearch(prompt);
    const shortAnswer = makeShortAnswer(prompt, data);
    const sources = (data.organic||[]).slice(0,3).map(x=>x.link);
    res.json({answer: shortAnswer, sources, full: data.organic});
  }catch(e){
    console.error(e);
    res.status(500).json({answer:"Error: "+e.message});
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log('Zeno short-answer live '+PORT));


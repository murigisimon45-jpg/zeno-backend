require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors({origin: '*'}));
app.use(express.json());

app.get('/', (req,res)=> res.send('Zeno backend live - Murigi-inc'));
app.get('/api/health', (req,res)=> res.json({status:'online', time: new Date().toISOString()}));

const CAPITALS = {
"japan":"Tokyo","vietnam":"Hanoi","kenya":"Nairobi","usa":"Washington, D.C.","united states":"Washington, D.C.",
"uk":"London","united kingdom":"London","france":"Paris","germany":"Berlin","italy":"Rome","spain":"Madrid",
"china":"Beijing","india":"New Delhi","russia":"Moscow","brazil":"Brasilia","canada":"Ottawa","australia":"Canberra",
"ethiopia":"Addis Ababa","tanzania":"Dodoma","uganda":"Kampala","rwanda":"Kigali","south africa":"Pretoria",
"nigeria":"Abuja","egypt":"Cairo","morocco":"Rabat","ghana":"Accra","south korea":"Seoul","north korea":"Pyongyang"
};

async function googleSearch(query){
  const key = process.env.SERPER_API_KEY;
  if(!key) throw new Error("Missing SERPER_API_KEY");
  const r = await fetch('https://google.serper.dev/search',{
    method:'POST',
    headers:{'X-API-KEY':key,'Content-Type':'application/json'},
    body: JSON.stringify({q: query, num: 8, gl: 'ke'})
  });
  const data = await r.json();
  return data;
}

function detectIntent(prompt){
  const q = prompt.toLowerCase().trim();
  const capMatch = q.match(/capital(?: city)? of ([a-z\s\.]+)\??/i);
  if(capMatch) return {intent:'capital', country: capMatch[1].trim()};
  if(q.includes('help me') && (q.includes('calcul') || q.includes('math'))) return {intent:'help_calc'};
  if(q.match(/^(hi|hello|hey|good morning|good afternoon)/i)) return {intent:'greeting'};
  return {intent:'general'};
}

function makeAccurateAnswer(prompt, data){
  const q = prompt.toLowerCase();
  const intent = detectIntent(prompt);
  const organic = data.organic || [];
  const answerBox = data.answerBox || {};
  if(intent.intent==='capital'){
    const countryKey = intent.country.toLowerCase().replace(/[^a-z ]/g,'').trim();
    if(CAPITALS[countryKey]) return CAPITALS[countryKey];
    for(const k of Object.keys(CAPITALS)){
      if(countryKey.includes(k) || k.includes(countryKey)) return CAPITALS[k];
    }
    if(answerBox.answer && answerBox.answer.length < 40) return answerBox.answer;
    for(const o of organic){
      const sn = (o.snippet||'') + ' ' + (o.title||'');
      let m = sn.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+is the capital of/i);
      if(m && m[1].toLowerCase()!=='capital') return m[1].trim();
      m = sn.match(/capital of [^ ]+ is ([A-Z][a-z]+(?:\s[A-Z][a-z\.]+)?)/i);
      if(m) return m[1].trim();
    }
  }
  if(answerBox.answer && answerBox.answer.length < 80) return answerBox.answer;
  if(answerBox.snippet && answerBox.snippet.length < 200) return answerBox.snippet.split('.').slice(0,1).join('.').trim()+'.';
  const isShort = q.split(' ').length <= 9 || ['capital','currency','population','president'].some(w=>q.includes(w));
  if(isShort){
    const first = organic[0];
    if(first){
      let s = first.snippet || first.title || '';
      s = s.split('. ')[0];
      if(s.length > 180) s = s.substring(0,170).trim();
      return s.trim();
    }
  }
  const first = organic[0];
  if(first && first.snippet){
    let s = first.snippet.split('. ').slice(0,2).join('. ');
    if(s.length > 280) s = s.substring(0,260)+ '...';
    return s;
  }
  return organic[0]?.title || "I couldn't find that, can you rephrase?";
}

app.post('/api/chat', async (req,res)=>{
  try{
    const {prompt} = req.body;
    if(!prompt) return res.json({answer:"Hey! How can I help today?", sources:[]});
    const lower = prompt.toLowerCase();
    if(lower.match(/can you help me.*calc/)){
      return res.json({answer:"Of course, I can help! 😊 Just drop the numbers or formula — for example `25*45` or `/math (150*0.15)` — and I'll solve it instantly.", sources:[]});
    }
    if(lower.match(/^(hi|hello|hey)\b/)){
      return res.json({answer:`Hey there! 👋 I'm Zeno. How can I help you today?`, sources:[]});
    }
    if(lower.includes('who made you') || lower.includes('who created you') || lower.includes('who founded you')){
      return res.json({answer:"I am Zeno AI, founded through Murigi-inc company.", sources:[]});
    }
    const data = await googleSearch(prompt);
    let answer = makeAccurateAnswer(prompt, data);
    const sources = (data.organic||[]).slice(0,3).map(x=>x.link);
    res.json({answer, sources});
  }catch(e){
    console.error(e);
    res.status(500).json({answer:"Sorry, I had a hiccup. Try again?"});
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log('Zeno brain v2 live '+PORT));


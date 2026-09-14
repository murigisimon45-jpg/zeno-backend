require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors({origin: '*'}));
app.use(express.json());

app.get('/', (req,res)=> res.send('Zeno backend live'));
app.get('/api/health', (req,res)=> res.json({status:'online'}));

app.post('/api/chat', async (req,res)=>{
  try{
    const key = process.env.SERPER_API_KEY;
    const r = await fetch('https://google.serper.dev/search',{
      method:'POST',
      headers:{'X-API-KEY':key,'Content-Type':'application/json'},
      body: JSON.stringify({q:req.body.prompt, num:8, gl:'ke'})
    });
    const data = await r.json();
    const results = data.organic || [];
    const answer = results.map((x,i)=>`**${i+1}. ${x.title}**\n${x.snippet}\n${x.link}`).join('\n\n');
    res.json({answer, sources: results.map(x=>x.link)});
  }catch(e){ res.status(500).json({answer:'Error: '+e.message}); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log('live '+PORT));

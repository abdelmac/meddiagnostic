import fs from 'node:fs';import path from 'node:path';
if(!fs.existsSync('.local/supabase-keys.json')){console.log('No local server keys available for exact-match scan.');process.exitCode=0;}else{
 const raw=JSON.parse(fs.readFileSync('.local/supabase-keys.json','utf8'));const keys=Array.isArray(raw)?raw:raw.api_keys??raw.apiKeys??raw.keys;
 const secrets=keys.filter(k=>k.name==='service_role'||k.type==='secret').map(k=>k.api_key??k.key).filter(k=>typeof k==='string'&&k.length>20&&!k.includes('*'));
 if(fs.existsSync('.local/supabase-project.json'))secrets.push(JSON.parse(fs.readFileSync('.local/supabase-project.json','utf8')).databasePassword);
 function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())scan(p);else if(/\.(js|json|html|map)$/.test(p)){const data=fs.readFileSync(p,'utf8');if(secrets.some(secret=>secret&&data.includes(secret)))throw Error('A server secret was found in a client artifact. Deployment blocked.');}}}
 scan('dist');console.log('No known server secret found in client artifacts.');
}

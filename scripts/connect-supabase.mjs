import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const npx='C:/Program Files/nodejs/node_modules/npm/bin/npx-cli.js';const project='wpukzqrqajcnjltnqxvh';
const run=args=>spawnSync(process.execPath,[npx,'--yes','supabase@latest',...args],{encoding:'utf8',windowsHide:true,timeout:90000});
const result=run(['projects','api-keys','--project-ref',project,'--output','json']);if(result.status!==0){console.error('API keys unavailable.');process.exit(1);}
const data=JSON.parse(result.stdout);fs.writeFileSync('.local/supabase-keys.json',JSON.stringify(data),{mode:0o600});
const keys=Array.isArray(data)?data:data.api_keys??data.apiKeys??data.keys??[];
if(!Array.isArray(keys)){console.log('Unexpected response keys:',Object.keys(data));process.exit(1);}
console.log('Available key labels:',keys.map(k=>k.name??k.type??k.id));
const key=keys.find(k=>k.type==='publishable'||k.name==='publishable')??keys.find(k=>k.name==='anon');
const value=key?.api_key??key?.key;
if(!value){console.log('Key field names:',keys.map(k=>Object.keys(k)));process.exit(1);}
fs.writeFileSync('.env',`EXPO_PUBLIC_SUPABASE_URL=https://${project}.supabase.co\nEXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${value}\n`,{mode:0o600});
const provisioning=JSON.parse(fs.readFileSync('.local/supabase-project.json','utf8'));
const linked=run(['link','--project-ref',project,'--password',provisioning.databasePassword]);
console.log((linked.stdout+'\n'+linked.stderr).replaceAll(provisioning.databasePassword,'[REDACTED]'));if(linked.status!==0)process.exitCode=1;

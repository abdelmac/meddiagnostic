import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import fs from 'node:fs';
fs.mkdirSync('.local',{recursive:true});
const file='.local/supabase-project.json';
const existing=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
if(existing?.stage==='created'){console.log('Project already created.');process.exit(0);}
const password=existing?.databasePassword??randomBytes(32).toString('base64url');
fs.writeFileSync(file,JSON.stringify({organization:'hyfbnpzekiyhehyjnujo',databasePassword:password,stage:'requested'}),{mode:0o600});
const npx='C:/Program Files/nodejs/node_modules/npm/bin/npx-cli.js';
const run=args=>spawnSync(process.execPath,[npx,'--yes','supabase@latest',...args],{encoding:'utf8',timeout:180000,windowsHide:true});
const listed=run(['projects','list']);if(listed.status!==0){console.log('Could not reconcile projects; not creating.');process.exit(1);}
const projects=JSON.parse(listed.stdout).projects;
const match=projects.find(p=>p.organization_id==='hyfbnpzekiyhehyjnujo'&&p.name==='MedQuiz');
if(match){fs.writeFileSync(file,JSON.stringify({...existing,stage:'created',projectId:match.id}),{mode:0o600});console.log(JSON.stringify({projectId:match.id,status:match.status}));process.exit(0);}
const result=run(['projects','create','MedQuiz','--org-id','hyfbnpzekiyhehyjnujo','--region','eu-west-3','--db-password',password]);
const output=(result.stdout??'')+'\n'+(result.stderr??'');
console.log(output.replaceAll(password,'[REDACTED]'));
if(result.status!==0){console.log('Creation did not confirm success. Reconcile the organization project list before retrying.');process.exitCode=1;}else{fs.writeFileSync(file,JSON.stringify({organization:'hyfbnpzekiyhehyjnujo',databasePassword:password,stage:'created',result:result.stdout}),{mode:0o600});}

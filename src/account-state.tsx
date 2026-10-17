import AsyncStorage from '@react-native-async-storage/async-storage';
import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {initialState} from './domain/engine';
import type {LocalState} from './domain/types';
import {captureChanges,mergeProgress} from './domain/sync';
import {isLocalState} from './state-validation';
import {synchronize} from './services/progress';
import {useAuth} from './auth';
const GUEST_KEY='medquiz.local.v1';
type Store={state:LocalState;update:(fn:(s:LocalState)=>LocalState)=>void;ready:boolean;error:string;clearError:()=>void;syncStatus:'local'|'syncing'|'synced'|'offline';syncNow:()=>Promise<void>;importGuest:()=>Promise<void>};
const Context=createContext<Store>(null!);
export function StoreProvider({children}:{children:React.ReactNode}){const {user,ready}=useAuth();if(!ready)return null;return <AccountStore key={user?.id??'guest'} userId={user?.id??null}>{children}</AccountStore>;}
function AccountStore({children,userId}:{children:React.ReactNode;userId:string|null}){
 const key=userId?`medquiz.account.${userId}.v1`:GUEST_KEY;
 const [state,setState]=useState<LocalState>(initialState);const [ready,setReady]=useState(false);const [error,setError]=useState('');const [syncStatus,setSyncStatus]=useState<Store['syncStatus']>('local');
 const queue=useRef(Promise.resolve());const current=useRef(state);const busy=useRef(false);const alive=useRef(true);const corrupt=useRef(false);const mounted=useRef(false);
 useEffect(()=>{alive.current=true;AsyncStorage.getItem(key).then(raw=>{if(!alive.current)return;if(raw){const parsed:unknown=JSON.parse(raw);if(!isLocalState(parsed))throw Error('Format incompatible');current.current=parsed;setState(parsed);}}).catch(()=>{corrupt.current=true;if(alive.current)setError('Vos données locales ne peuvent pas être chargées. Elles ne seront pas écrasées. Exportez-les avant de réinitialiser le stockage du navigateur.');}).finally(()=>{if(alive.current)setReady(true);});return()=>{alive.current=false;};},[key]);
 const apply=(next:LocalState)=>{current.current=next;setState(next);};
 const update:Store['update']=fn=>{if(!ready||corrupt.current)return;const next=fn(current.current);apply(userId?captureChanges(current.current,next):next);};
 useEffect(()=>{if(!ready||corrupt.current)return;if(!mounted.current){mounted.current=true;return;}const raw=JSON.stringify(state);queue.current=queue.current.catch(()=>{}).then(()=>AsyncStorage.setItem(key,raw)).catch(()=>{if(alive.current)setError('La sauvegarde locale a échoué. Libérez de l’espace avant de quitter cette page.');});},[state,ready,key]);
 const syncNow=async()=>{if(!userId||!ready||corrupt.current||busy.current)return;busy.current=true;setSyncStatus('syncing');try{const result=await synchronize(userId,current.current);if(alive.current){const merged=mergeProgress(current.current,result);if(JSON.stringify(merged)!==JSON.stringify(current.current))apply(merged);setSyncStatus('synced');}}catch{if(alive.current)setSyncStatus('offline');}finally{busy.current=false;}};
 useEffect(()=>{if(!userId||!ready)return;const timeout=setTimeout(()=>void syncNow(),1500);return()=>clearTimeout(timeout);},[state,ready,userId]);
 useEffect(()=>{if(!userId||!ready)return;const timer=setInterval(()=>void syncNow(),60000);const subscription=AppState.addEventListener('change',status=>{if(status==='active')void syncNow();});return()=>{clearInterval(timer);subscription.remove();};},[ready,userId]);
 const importGuest=async()=>{if(!userId||corrupt.current)return;const raw=await AsyncStorage.getItem(GUEST_KEY);if(!raw)return;const guest:unknown=JSON.parse(raw);if(!isLocalState(guest))throw Error('Format incompatible');update(s=>mergeProgress(s,guest));await queue.current;await syncNow();};
 return <Context.Provider value={{state,update,ready,error,clearError:()=>setError(''),syncStatus,syncNow,importGuest}}>{children}</Context.Provider>;
}
export const useStore=()=>useContext(Context);

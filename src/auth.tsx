import React,{createContext,useContext,useEffect,useState} from 'react';
import {AppState,Platform} from 'react-native';
import type {User} from '@supabase/supabase-js';
import {getSupabase} from './services/supabase';
type Auth={user:User|null;ready:boolean;configured:boolean;sendCode:(email:string,create:boolean)=>Promise<void>;verifyCode:(email:string,token:string)=>Promise<void>;signOut:()=>Promise<void>};
const Context=createContext<Auth>(null!);
export function AuthProvider({children}:{children:React.ReactNode}){
 const client=getSupabase();const [user,setUser]=useState<User|null>(null);const [ready,setReady]=useState(!client);
 useEffect(()=>{if(!client)return;let alive=true;client.auth.getSession().then(({data})=>{if(alive){setUser(data.session?.user??null);setReady(true);}}).catch(()=>{if(alive)setReady(true);});const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{if(alive){setUser(session?.user??null);setReady(true);}});const listener=Platform.OS!=='web'?AppState.addEventListener('change',status=>{if(status==='active')client.auth.startAutoRefresh();else client.auth.stopAutoRefresh();}):null;return()=>{alive=false;subscription.unsubscribe();listener?.remove();};},[client]);
 const sendCode=async(email:string,create:boolean)=>{if(!client)throw Error('Comptes indisponibles pour le moment.');const {error}=await client.auth.signInWithOtp({email:email.trim(),options:{shouldCreateUser:create}});if(error)throw error;};
 const verifyCode=async(email:string,token:string)=>{if(!client)throw Error('Comptes indisponibles pour le moment.');const {error}=await client.auth.verifyOtp({email:email.trim(),token:token.trim(),type:'email'});if(error)throw error;};
 const signOut=async()=>{if(!client)return;const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;};
 return <Context.Provider value={{user,ready,configured:!!client,sendCode,verifyCode,signOut}}>{children}</Context.Provider>;
}
export const useAuth=()=>useContext(Context);

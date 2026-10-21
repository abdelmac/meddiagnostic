-- Invitation-only educational beta. Questions, answer keys and scores stay private.
create schema if not exists competition;
revoke all on schema competition from public, anon, authenticated;
grant usage on schema competition to authenticated, service_role;

create table competition.profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 nickname text not null check (char_length(nickname) between 3 and 24),
 study_year smallint not null check (study_year between 1 and 6),
 season text not null,
 rating integer not null default 1000 check (rating between 0 and 10000),
 played integer not null default 0 check (played >= 0),
 wins integer not null default 0 check (wins >= 0),
 draws integer not null default 0 check (draws >= 0),
 updated_at timestamptz not null default now()
);
create table competition.question_bank (
 id text primary key,
 version integer not null check (version > 0),
 content jsonb not null check (jsonb_typeof(content)='object'),
 active boolean not null default true
);
create table competition.matches (
 id uuid primary key default gen_random_uuid(),
 invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
 host_id uuid not null references auth.users(id) on delete cascade,
 mode text not null check (mode in ('duel','race')),
 season text not null,
 ranked boolean not null default true,
 status text not null default 'waiting' check (status in ('waiting','playing','finished','cancelled')),
 questions jsonb not null check (jsonb_array_length(questions)=10),
 created_at timestamptz not null default now(),
 starts_at timestamptz,
 ends_at timestamptz,
 finished_at timestamptz
);
create index competition_matches_host on competition.matches(host_id,created_at desc);
create table competition.players (
 match_id uuid not null references competition.matches(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 nickname text not null,
 study_year smallint not null,
 initial_rating integer not null,
 rating_delta integer,
 joined_at timestamptz not null default now(),
 primary key (match_id,user_id)
);
create index competition_players_user on competition.players(user_id,joined_at desc);
create table competition.answers (
 match_id uuid not null,
 user_id uuid not null,
 ordinal integer not null check (ordinal between 0 and 9),
 choice integer not null check (choice between 0 and 3),
 correct boolean not null,
 answered_at timestamptz not null default clock_timestamp(),
 primary key (match_id,user_id,ordinal),
 foreign key (match_id,user_id) references competition.players(match_id,user_id) on delete cascade
);
create index competition_rankings on competition.profiles(season,study_year,rating desc) where played > 0;
alter table competition.profiles enable row level security;
alter table competition.question_bank enable row level security;
alter table competition.matches enable row level security;
alter table competition.players enable row level security;
alter table competition.answers enable row level security;
revoke all on all tables in schema competition from public, anon, authenticated;
grant all on all tables in schema competition to service_role;

create function competition.season_name() returns text
language sql stable security invoker set search_path='' as $$
 select (extract(year from current_date)::int - case when extract(month from current_date)<9 then 1 else 0 end)::text || '-' ||
 (extract(year from current_date)::int + case when extract(month from current_date)>=9 then 1 else 0 end)::text
$$;
revoke all on function competition.season_name() from public, anon, authenticated;

-- Only the authenticated dispatcher can call this helper (as its owner).
create function competition.settle(target uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare m competition.matches%rowtype; a record; b record; result_a numeric; change_a integer;
begin
 select * into m from competition.matches where id=target for update;
 if not found or m.status<>'playing' then return; end if;
 if clock_timestamp()<m.ends_at and (select count(*) from competition.answers where match_id=target)<20 then return; end if;
 select p.user_id,p.initial_rating,count(ans.ordinal) filter(where ans.correct) as score into a
 from competition.players p left join competition.answers ans on ans.match_id=p.match_id and ans.user_id=p.user_id
 where p.match_id=target and p.user_id=m.host_id group by p.user_id,p.initial_rating;
 select p.user_id,p.initial_rating,count(ans.ordinal) filter(where ans.correct) as score into b
 from competition.players p left join competition.answers ans on ans.match_id=p.match_id and ans.user_id=p.user_id
 where p.match_id=target and p.user_id<>m.host_id group by p.user_id,p.initial_rating;
 result_a := case when a.score>b.score then 1 when a.score<b.score then 0 else 0.5 end;
 change_a := round(24 * (result_a - 1/(1+power(10::numeric,(b.initial_rating-a.initial_rating)/400.0))));
 if not m.ranked then change_a:=0; end if;
 update competition.matches set status='finished',finished_at=clock_timestamp() where id=target;
 update competition.players set rating_delta=case when user_id=a.user_id then change_a else -change_a end where match_id=target;
 update competition.profiles set rating=greatest(0,least(10000,rating+case when user_id=a.user_id then change_a else -change_a end)),
 played=played+1,wins=wins+case when (user_id=a.user_id and result_a=1) or (user_id=b.user_id and result_a=0) then 1 else 0 end,
 draws=draws+case when result_a=0.5 then 1 else 0 end,updated_at=clock_timestamp()
 where user_id in (a.user_id,b.user_id) and season=m.season and m.ranked;
end;
$$;
revoke all on function competition.settle(uuid) from public, anon, authenticated;

create function competition.snapshot(target uuid, viewer uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare m competition.matches%rowtype; n integer; q jsonb; result jsonb;
begin
 select * into m from competition.matches where id=target;
 if not found or not exists(select 1 from competition.players where match_id=target and user_id=viewer) then
  raise exception 'match_not_found' using errcode='42501';
 end if;
 select count(*) into n from competition.answers where match_id=target and user_id=viewer;
 if m.status='playing' and clock_timestamp()>=m.starts_at and clock_timestamp()<m.ends_at and n<10 then
  q:=m.questions->n;
 end if;
 result:=jsonb_build_object('id',m.id,'code',m.invite_code,'mode',m.mode,'season',m.season,'status',m.status,'ranked',m.ranked,
 'host',m.host_id=viewer,'serverNow',clock_timestamp(),'startsAt',m.starts_at,'endsAt',m.ends_at,
 'total',10,'ordinal',n,'question',case when q is null then null else jsonb_build_object('fr',(q->'fr')-'reasoning','en',(q->'en')-'reasoning') end,
 'players',(select coalesce(jsonb_agg(jsonb_build_object('nickname',p.nickname,'studyYear',p.study_year,'self',p.user_id=viewer,
 'answered',(select count(*) from competition.answers ans where ans.match_id=target and ans.user_id=p.user_id),
 'score',case when m.status='finished' then (select count(*) from competition.answers ans where ans.match_id=target and ans.user_id=p.user_id and ans.correct) else null end,
 'ratingDelta',p.rating_delta) order by p.joined_at),'[]'::jsonb) from competition.players p where p.match_id=target));
 if m.status='finished' then
  result:=result || jsonb_build_object('review',(select coalesce(jsonb_agg(jsonb_build_object('ordinal',ans.ordinal,'choice',ans.choice,'correct',ans.correct,
  'correctChoice',(m.questions->ans.ordinal)->'correct','fr',(m.questions->ans.ordinal)->'fr','en',(m.questions->ans.ordinal)->'en') order by ans.ordinal),'[]'::jsonb)
  from competition.answers ans where ans.match_id=target and ans.user_id=viewer));
 end if;
 return result;
end;
$$;
revoke all on function competition.snapshot(uuid,uuid) from public, anon, authenticated;

create function competition.action(command text, payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); profile competition.profiles%rowtype; m competition.matches%rowtype;
 target uuid; n integer; bank jsonb; reserved jsonb; ord integer; chosen integer; nickname_value text; year_value integer; answer_time timestamptz;
begin
 if me is null or not exists(select 1 from auth.users where id=me) then raise exception 'authentication_required' using errcode='42501'; end if;
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>4096 then raise exception 'invalid_request'; end if;
 -- Serialize operations for one account, including profile/year changes and lobby creation.
 perform pg_advisory_xact_lock(hashtextextended(me::text,51783));
 if command='profile' then
  select * into profile from competition.profiles where user_id=me;
  if payload ? 'nickname' then
   nickname_value:=btrim(payload->>'nickname'); year_value:=(payload->>'studyYear')::integer;
   if char_length(nickname_value) not between 3 and 24 or nickname_value !~ '^[[:alnum:] _.-]+$' or year_value not between 1 and 6 then raise exception 'invalid_profile'; end if;
   if profile.user_id is not null and profile.study_year<>year_value and
    ((profile.season=competition.season_name() and profile.played>0) or exists(select 1 from competition.players p join competition.matches mm on mm.id=p.match_id where p.user_id=me and mm.status in ('waiting','playing'))) then
    raise exception 'study_year_locked';
   end if;
   insert into competition.profiles(user_id,nickname,study_year,season) values(me,nickname_value,year_value,competition.season_name())
   on conflict(user_id) do update set nickname=excluded.nickname,study_year=excluded.study_year,
   rating=case when competition.profiles.season=excluded.season then competition.profiles.rating else 1000 end,
   played=case when competition.profiles.season=excluded.season then competition.profiles.played else 0 end,
   wins=case when competition.profiles.season=excluded.season then competition.profiles.wins else 0 end,
   draws=case when competition.profiles.season=excluded.season then competition.profiles.draws else 0 end,
   season=excluded.season,updated_at=clock_timestamp();
  end if;
  select * into profile from competition.profiles where user_id=me;
  return case when profile.user_id is null then 'null'::jsonb else to_jsonb(profile)-'user_id' end;
 end if;
 if command='leaderboard' then
  year_value:=(payload->>'studyYear')::integer;
  if year_value not between 1 and 6 then raise exception 'invalid_study_year'; end if;
  return jsonb_build_object('season',competition.season_name(),'studyYear',year_value,'players',
  (select coalesce(jsonb_agg(row_data order by place),'[]'::jsonb) from
   (select row_number() over(order by rating desc,wins desc,played desc,nickname,user_id) as place,
    jsonb_build_object('nickname',nickname,'rating',rating,'played',played,'wins',wins,'draws',draws,'self',user_id=me) as row_data
    from competition.profiles where season=competition.season_name() and study_year=year_value and played>0
    order by rating desc,wins desc,played desc,nickname,user_id limit 100) ranked));
 end if;
 if command='list' then
  -- Expired invitations are closed when their owner next visits; no background worker is needed.
  update competition.matches set status='cancelled',finished_at=clock_timestamp()
  where host_id=me and status='waiting' and created_at<clock_timestamp()-interval '1 hour';
  return (select coalesce(jsonb_agg(jsonb_build_object('id',mm.id,'mode',mm.mode,'status',mm.status,'code',mm.invite_code,'createdAt',mm.created_at) order by mm.created_at desc),'[]'::jsonb)
   from (select mm.* from competition.players p join competition.matches mm on mm.id=p.match_id where p.user_id=me order by mm.created_at desc limit 10) mm);
 end if;
 if command='create' then
  select * into profile from competition.profiles where user_id=me;
  if not found then raise exception 'profile_required'; end if;
  if payload->>'mode' not in ('duel','race') then raise exception 'invalid_mode'; end if;
  select mm.* into m from competition.players p join competition.matches mm on mm.id=p.match_id
   where p.user_id=me and mm.status in ('waiting','playing') and (mm.status='playing' or mm.created_at>clock_timestamp()-interval '1 hour') order by mm.created_at desc limit 1;
  if found then
   perform competition.settle(m.id);
   if (select status from competition.matches where id=m.id) in ('waiting','playing') then return competition.snapshot(m.id,me); end if;
  end if;
  select jsonb_agg(content order by random_order) into bank from
   (select content,random() as random_order from competition.question_bank where active order by random_order limit 10) selected;
  if jsonb_array_length(bank) is distinct from 10 then raise exception 'question_bank_unavailable'; end if;
  target:=(payload->>'requestId')::uuid;
  if target is null then raise exception 'request_id_required'; end if;
  if exists(select 1 from competition.matches where id=target) then raise exception 'request_id_conflict'; end if;
  reserved:=public.reserve_quiz_session(target,10);
  if not coalesce((reserved->>'allowed')::boolean,false) then return jsonb_build_object('quota',reserved); end if;
  if profile.season<>competition.season_name() then
   update competition.profiles set season=competition.season_name(),rating=1000,played=0,wins=0,draws=0 where user_id=me returning * into profile;
  end if;
  insert into competition.matches(id,host_id,mode,season,questions) values(target,me,payload->>'mode',profile.season,bank) returning * into m;
  insert into competition.players(match_id,user_id,nickname,study_year,initial_rating) values(target,me,profile.nickname,profile.study_year,profile.rating);
  return competition.snapshot(target,me);
 end if;
 if command='join' then
  select * into profile from competition.profiles where user_id=me;
  if not found then raise exception 'profile_required'; end if;
  select * into m from competition.matches where invite_code=upper(btrim(payload->>'code')) for update;
  if not found then raise exception 'invalid_invitation'; end if;
  if exists(select 1 from competition.players where match_id=m.id and user_id=me) then
   perform competition.settle(m.id); return competition.snapshot(m.id,me);
  end if;
  if m.status<>'waiting' or m.created_at<clock_timestamp()-interval '1 hour' or m.season<>competition.season_name() then raise exception 'invitation_closed'; end if;
  if (select count(*) from competition.players where match_id=m.id)>=2 then raise exception 'lobby_full'; end if;
  if profile.study_year<>(select p.study_year from competition.players p where p.match_id=m.id and p.user_id=m.host_id) then raise exception 'study_year_mismatch'; end if;
  if exists(select 1 from competition.players p join competition.matches mm on mm.id=p.match_id where p.user_id=me and mm.status in ('waiting','playing') and (mm.status='playing' or mm.created_at>clock_timestamp()-interval '1 hour')) then raise exception 'active_match_exists'; end if;
  reserved:=public.reserve_quiz_session(m.id,10);
  if not coalesce((reserved->>'allowed')::boolean,false) then return jsonb_build_object('quota',reserved); end if;
  if profile.season<>competition.season_name() then
   update competition.profiles set season=competition.season_name(),rating=1000,played=0,wins=0,draws=0 where user_id=me returning * into profile;
  end if;
  insert into competition.players(match_id,user_id,nickname,study_year,initial_rating) values(m.id,me,profile.nickname,profile.study_year,profile.rating);
  update competition.matches set ranked=not exists(
   select 1 from competition.matches prior
   join competition.players p1 on p1.match_id=prior.id and p1.user_id=me
   join competition.players p2 on p2.match_id=prior.id and p2.user_id=m.host_id
   where prior.status='finished' and prior.ranked and prior.season=m.season
   and (prior.finished_at at time zone 'Europe/Paris')::date=(clock_timestamp() at time zone 'Europe/Paris')::date
  ) where id=m.id;
  return competition.snapshot(m.id,me);
 end if;
 target:=(payload->>'matchId')::uuid;
 select * into m from competition.matches where id=target for update;
 if not found or not exists(select 1 from competition.players where match_id=target and user_id=me) then raise exception 'match_not_found' using errcode='42501'; end if;
 if command='start' then
  if m.host_id<>me then raise exception 'host_required' using errcode='42501'; end if;
  if m.status='waiting' then
   if m.created_at<clock_timestamp()-interval '1 hour' then raise exception 'invitation_closed'; end if;
   if (select count(*) from competition.players where match_id=target)<>2 then raise exception 'second_player_required'; end if;
   update competition.matches set status='playing',starts_at=clock_timestamp()+interval '3 seconds',
    ends_at=clock_timestamp()+interval '3 seconds'+case when mode='duel' then interval '180 seconds' else interval '60 seconds' end where id=target;
  end if;
 elsif command='answer' then
  perform competition.settle(target);
  select * into m from competition.matches where id=target;
  if m.status='playing' then
   if clock_timestamp()<m.starts_at then raise exception 'match_not_started'; end if;
   ord:=(payload->>'ordinal')::integer; chosen:=(payload->>'choice')::integer;
   if ord is null or chosen is null or ord not between 0 and 9 or chosen not between 0 and 3 then raise exception 'invalid_answer'; end if;
   if not exists(select 1 from competition.answers where match_id=target and user_id=me and ordinal=ord) then
    select count(*) into n from competition.answers where match_id=target and user_id=me;
    if n<>ord then raise exception 'answer_out_of_order'; end if;
    answer_time:=clock_timestamp();
    if answer_time<m.ends_at then
     insert into competition.answers(match_id,user_id,ordinal,choice,correct,answered_at) values(target,me,ord,chosen,chosen=(m.questions->ord->>'correct')::integer,answer_time);
    end if;
   end if;
  end if;
 elsif command='cancel' then
  if m.status='waiting' and m.host_id=me then update competition.matches set status='cancelled',finished_at=clock_timestamp() where id=target;
  elsif m.status='waiting' then delete from competition.players where match_id=target and user_id=me;
   return jsonb_build_object('left',true);
  else raise exception 'match_already_started'; end if;
 elsif command<>'get' then raise exception 'unknown_command';
 end if;
 perform competition.settle(target);
 return competition.snapshot(target,me);
end;
$$;
revoke all on function competition.action(text,jsonb) from public, anon, authenticated;
grant execute on function competition.action(text,jsonb) to authenticated;

-- Data API wrapper runs as caller. The narrowly scoped private implementation checks identity and membership on every call.
create function public.competitive(command text,payload jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select competition.action(command,payload) $$;
revoke all on function public.competitive(text,jsonb) from public, anon, authenticated;
grant execute on function public.competitive(text,jsonb) to authenticated;

-- BEGIN ORIGINAL DEMO BANK
-- Original fictional educational drafts; not medically reviewed. Never expose answer keys through the Data API.
insert into competition.question_bank(id,version,content) values
('dermatologie-1',1,'{"correct":0,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne de 29 ans présente depuis plusieurs mois des plaques symétriques bien limitées sur les coudes et les genoux. Elles sont couvertes de squames épaisses. On observe de petites dépressions sur les ongles.","options":["Psoriasis en plaques","Dermatite atopique","Gale","Impétigo"],"reasoning":"La distribution, les limites nettes et les anomalies unguéales convergent vers un psoriasis en plaques."},"en":{"title":"What is the most likely diagnosis?","context":"A 29-year-old has had symmetrical, well-defined plaques on the elbows and knees for several months. They are covered with thick scales. Small pits are visible on the nails.","options":["Plaque psoriasis","Atopic dermatitis","Scabies","Impetigo"],"reasoning":"The distribution, sharp borders and nail changes together suggest plaque psoriasis."}}'::jsonb),
('dermatologie-2',1,'{"correct":3,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une étudiante de 19 ans, avec antécédents personnels d’asthme, décrit des poussées de lésions prurigineuses et mal limitées des plis des coudes. Sa peau est sèche en dehors des poussées.","options":["Urticaire aiguë","Zona","Rosacée","Dermatite atopique"],"reasoning":"Le prurit, la xérose et la topographie flexurale sur terrain atopique orientent vers une dermatite atopique."},"en":{"title":"What is the most likely diagnosis?","context":"A 19-year-old student with a history of asthma describes flares of itchy, poorly defined lesions in the elbow creases. The skin is dry between flares.","options":["Acute urticaria","Shingles","Rosacea","Atopic dermatitis"],"reasoning":"Itching, dry skin and flexural involvement in an atopic patient suggest atopic dermatitis."}}'::jsonb),
('dermatologie-3',1,'{"correct":2,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne de 24 ans présente des plaques surélevées très prurigineuses. Chaque lésion disparaît en quelques heures sans trace, tandis que d’autres apparaissent ailleurs. Il n’y a pas d’atteinte muqueuse.","options":["Dermatophytie du corps","Acné vulgaire","Urticaire aiguë","Gale"],"reasoning":"La disparition individuelle en moins de 24 heures est un argument majeur pour une urticaire."},"en":{"title":"What is the most likely diagnosis?","context":"A 24-year-old develops very itchy raised patches. Each lesion disappears within hours without leaving a mark, while others appear elsewhere. There is no mucosal involvement.","options":["Tinea corporis","Acne vulgaris","Acute urticaria","Scabies"],"reasoning":"Individual lesions disappearing within 24 hours strongly suggest urticaria."}}'::jsonb),
('dermatologie-4',1,'{"correct":1,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Plusieurs membres d’un même foyer se grattent surtout la nuit. Une personne présente des papules entre les doigts et aux poignets, avec de fins sillons.","options":["Dermatite de contact allergique","Gale","Zona","Impétigo"],"reasoning":"Le caractère collectif et nocturne du prurit associé aux sillons évoque la gale."},"en":{"title":"What is the most likely diagnosis?","context":"Several people in the same household have itching, especially at night. One has papules between the fingers and on the wrists, with fine burrows.","options":["Allergic contact dermatitis","Scabies","Shingles","Impetigo"],"reasoning":"Nocturnal itching affecting several household members, together with burrows, suggests scabies."}}'::jsonb),
('dermatologie-5',1,'{"correct":0,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne de 67 ans ressent une douleur brûlante sur un côté du thorax. Deux jours après apparaissent des vésicules groupées en bande, sans franchir la ligne médiane.","options":["Zona","Dermatophytie du corps","Rosacée","Psoriasis en plaques"],"reasoning":"Une éruption vésiculeuse douloureuse suivant un dermatome évoque une réactivation du virus varicelle-zona."},"en":{"title":"What is the most likely diagnosis?","context":"A 67-year-old develops burning pain on one side of the chest. Two days later, grouped blisters appear in a band that does not cross the midline.","options":["Shingles","Tinea corporis","Rosacea","Plaque psoriasis"],"reasoning":"A painful vesicular eruption following a dermatome suggests reactivation of varicella-zoster virus."}}'::jsonb),
('dermatologie-6',1,'{"correct":3,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne présente une plaque annulaire qui s’étend progressivement. Sa bordure est rouge et squameuse, tandis que le centre devient plus clair. Le prurit est modéré.","options":["Impétigo","Acné vulgaire","Dermatite atopique","Dermatophytie du corps"],"reasoning":"La bordure active et l’extension centrifuge orientent vers une dermatophytie ; un prélèvement mycologique peut confirmer."},"en":{"title":"What is the most likely diagnosis?","context":"A person has a ring-shaped patch that gradually expands. Its edge is red and scaly, while the centre becomes clearer. Itching is moderate.","options":["Impetigo","Acne vulgaris","Atopic dermatitis","Tinea corporis"],"reasoning":"An active border with outward expansion suggests a dermatophyte infection; mycological sampling can confirm it."}}'::jsonb),
('dermatologie-7',1,'{"correct":2,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Un enfant de 6 ans a des érosions superficielles autour du nez et de la bouche, recouvertes de croûtes jaunâtres couleur miel. Un autre enfant de sa classe a des lésions similaires.","options":["Dermatite de contact allergique","Urticaire aiguë","Impétigo","Rosacée"],"reasoning":"Les croûtes mélicériques sur lésions superficielles chez l’enfant sont évocatrices d’impétigo."},"en":{"title":"What is the most likely diagnosis?","context":"A 6-year-old has superficial erosions around the nose and mouth, covered with yellow, honey-coloured crusts. Another child in the class has similar lesions.","options":["Allergic contact dermatitis","Acute urticaria","Impetigo","Rosacea"],"reasoning":"Honey-coloured crusts over superficial lesions in a child suggest impetigo."}}'::jsonb),
('dermatologie-8',1,'{"correct":1,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne de 43 ans rapporte des bouffées vasomotrices puis une rougeur persistante des joues et du nez. Des télangiectasies et des papules sont présentes, sans comédons.","options":["Gale","Rosacée","Acné vulgaire","Psoriasis en plaques"],"reasoning":"Le siège centrofacial, les flushs et l’absence de comédons orientent vers la rosacée plutôt que l’acné."},"en":{"title":"What is the most likely diagnosis?","context":"A 43-year-old reports flushing followed by persistent redness of the cheeks and nose. Telangiectasias and papules are present, without comedones.","options":["Scabies","Rosacea","Acne vulgaris","Plaque psoriasis"],"reasoning":"Central facial involvement, flushing and the absence of comedones favour rosacea over acne."}}'::jsonb),
('dermatologie-9',1,'{"correct":0,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une adolescente présente des comédons ouverts et fermés sur le front, associés à des papules inflammatoires et quelques pustules sur le visage et le haut du dos.","options":["Acné vulgaire","Dermatite de contact allergique","Dermatite atopique","Zona"],"reasoning":"La présence de comédons parmi des lésions inflammatoires dans les zones séborrhéiques oriente vers l’acné."},"en":{"title":"What is the most likely diagnosis?","context":"An adolescent has open and closed comedones on the forehead, together with inflammatory papules and a few pustules on the face and upper back.","options":["Acne vulgaris","Allergic contact dermatitis","Atopic dermatitis","Shingles"],"reasoning":"Comedones alongside inflammatory lesions in sebaceous areas suggest acne."}}'::jsonb),
('dermatologie-10',1,'{"correct":3,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne développe des plaques eczémateuses prurigineuses sous un nouveau bracelet métallique, environ deux jours après l’avoir porté. Les lésions débordent légèrement la zone de contact.","options":["Psoriasis en plaques","Urticaire aiguë","Dermatophytie du corps","Dermatite de contact allergique"],"reasoning":"La relation topographique et le délai après contact suggèrent un mécanisme allergique retardé ; des tests épicutanés peuvent être indiqués."},"en":{"title":"What is the most likely diagnosis?","context":"A person develops itchy eczematous patches beneath a new metal bracelet about two days after wearing it. The lesions extend slightly beyond the contact area.","options":["Plaque psoriasis","Acute urticaria","Tinea corporis","Allergic contact dermatitis"],"reasoning":"The distribution and delayed onset after contact suggest a delayed allergic mechanism; patch testing may be indicated."}}'::jsonb),
('cardiologie-1',1,'{"correct":0,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne de 28 ans présente une douleur thoracique augmentée par l’inspiration et le décubitus, soulagée en se penchant en avant. L’ECG décrit un sus-décalage ST diffus et un sous-décalage PR.","options":["Péricardite aiguë","Infarctus du myocarde aigu","Insuffisance cardiaque gauche","Endocardite infectieuse"],"reasoning":"L’association douleur positionnelle et anomalies diffuses du ST/PR évoque une inflammation péricardique."},"en":{"title":"What is the most likely diagnosis?","context":"A 28-year-old has chest pain worsened by inspiration and lying flat, relieved by leaning forward. The ECG report describes diffuse ST elevation and PR depression.","options":["Acute pericarditis","Acute myocardial infarction","Left-sided heart failure","Infective endocarditis"],"reasoning":"Positional pain with diffuse ST and PR changes suggests pericardial inflammation."}}'::jsonb),
('cardiologie-2',1,'{"correct":3,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne de 61 ans présente une douleur rétrosternale constrictive prolongée avec sueurs. L’ECG montre un sus-décalage ST dans des dérivations contiguës et les troponines augmentent avec une cinétique significative.","options":["Fibrillation auriculaire","Rétrécissement aortique","Dissection aortique","Infarctus du myocarde aigu"],"reasoning":"Le contexte ischémique, les modifications territoriales et la lésion myocardique aiguë convergent vers un infarctus."},"en":{"title":"What is the most likely diagnosis?","context":"A 61-year-old has prolonged constricting retrosternal pain with sweating. The ECG shows ST elevation in contiguous leads and troponin levels rise with a significant dynamic change.","options":["Atrial fibrillation","Aortic stenosis","Aortic dissection","Acute myocardial infarction"],"reasoning":"Ischaemic symptoms, territorial changes and acute myocardial injury together suggest myocardial infarction."}}'::jsonb),
('cardiologie-3',1,'{"correct":2,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne de 76 ans consulte pour des palpitations. Le pouls est irrégulier. L’ECG décrit des intervalles RR irréguliers sans ondes P organisées, avec des QRS fins.","options":["Insuffisance mitrale","Tamponnade cardiaque","Fibrillation auriculaire","Insuffisance cardiaque gauche"],"reasoning":"L’irrégularité complète et l’absence d’activité atriale organisée orientent vers la fibrillation auriculaire."},"en":{"title":"What is the most likely diagnosis?","context":"A 76-year-old presents with palpitations and an irregular pulse. The ECG report describes irregular RR intervals without organized P waves and with narrow QRS complexes.","options":["Mitral regurgitation","Cardiac tamponade","Atrial fibrillation","Left-sided heart failure"],"reasoning":"Complete irregularity and the absence of organized atrial activity suggest atrial fibrillation."}}'::jsonb),
('cardiologie-4',1,'{"correct":1,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne de 72 ans se réveille essoufflée et dort désormais avec trois oreillers. L’examen retrouve des crépitants bilatéraux et l’échographie une fraction d’éjection ventriculaire gauche diminuée.","options":["Syncope réflexe vasovagale","Insuffisance cardiaque gauche","Rétrécissement aortique","Endocardite infectieuse"],"reasoning":"La congestion pulmonaire associée à une dysfonction ventriculaire gauche explique la dyspnée."},"en":{"title":"What is the most likely diagnosis?","context":"A 72-year-old wakes up breathless and now sleeps with three pillows. Examination finds bilateral crackles and echocardiography shows a reduced left ventricular ejection fraction.","options":["Vasovagal syncope","Left-sided heart failure","Aortic stenosis","Infective endocarditis"],"reasoning":"Pulmonary congestion with left ventricular dysfunction explains the breathlessness."}}'::jsonb),
('cardiologie-5',1,'{"correct":0,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne de 79 ans présente une dyspnée et une syncope à l’effort. L’auscultation décrit un souffle systolique éjectionnel au foyer aortique irradiant vers les carotides.","options":["Rétrécissement aortique","Insuffisance mitrale","Dissection aortique","Péricardite aiguë"],"reasoning":"La clinique d’effort et le souffle éjectionnel irradiant aux carotides orientent vers un obstacle aortique ; l’échographie l’évalue."},"en":{"title":"What is the most likely diagnosis?","context":"A 79-year-old has breathlessness and syncope on exertion. Auscultation reveals an ejection systolic murmur at the aortic area radiating to the carotid arteries.","options":["Aortic stenosis","Mitral regurgitation","Aortic dissection","Acute pericarditis"],"reasoning":"Exertional symptoms with an ejection murmur radiating to the carotids suggest aortic obstruction; echocardiography assesses it."}}'::jsonb),
('cardiologie-6',1,'{"correct":3,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne présente une dyspnée progressive et un souffle holosystolique maximal à la pointe, irradiant vers l’aisselle. L’échographie montre un reflux systolique vers l’oreillette gauche.","options":["Endocardite infectieuse","Tamponnade cardiaque","Infarctus du myocarde aigu","Insuffisance mitrale"],"reasoning":"Le reflux systolique ventriculo-atrial et la sémiologie du souffle correspondent à une insuffisance mitrale."},"en":{"title":"What is the most likely diagnosis?","context":"A person has progressive breathlessness and a pansystolic murmur loudest at the apex, radiating to the axilla. Echocardiography shows systolic backflow into the left atrium.","options":["Infective endocarditis","Cardiac tamponade","Acute myocardial infarction","Mitral regurgitation"],"reasoning":"Systolic ventricular-to-atrial backflow with this murmur pattern indicates mitral regurgitation."}}'::jsonb),
('cardiologie-7',1,'{"correct":2,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne porteuse d’une prothèse valvulaire a une fièvre persistante. Plusieurs hémocultures sont positives au même germe et l’échographie transœsophagienne décrit une végétation sur la prothèse.","options":["Syncope réflexe vasovagale","Fibrillation auriculaire","Endocardite infectieuse","Dissection aortique"],"reasoning":"L’association microbiologique et échographique sur terrain à risque est très évocatrice d’endocardite."},"en":{"title":"What is the most likely diagnosis?","context":"A person with a prosthetic valve has persistent fever. Several blood cultures grow the same organism and transoesophageal echocardiography describes a vegetation on the prosthesis.","options":["Vasovagal syncope","Atrial fibrillation","Infective endocarditis","Aortic dissection"],"reasoning":"Microbiological and echocardiographic findings in a high-risk setting strongly suggest endocarditis."}}'::jsonb),
('cardiologie-8',1,'{"correct":1,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne hypertendue de 64 ans présente brutalement une douleur thoracique maximale d’emblée irradiant dans le dos, avec une asymétrie des pouls. L’angioscanner décrit un flap intimal aortique.","options":["Insuffisance cardiaque gauche","Dissection aortique","Tamponnade cardiaque","Péricardite aiguë"],"reasoning":"Le dédoublement de la lumière aortique par un flap confirme la dissection dans ce contexte."},"en":{"title":"What is the most likely diagnosis?","context":"A 64-year-old with hypertension develops sudden chest pain that is maximal at onset and radiates to the back, with unequal pulses. CT angiography describes an aortic intimal flap.","options":["Left-sided heart failure","Aortic dissection","Cardiac tamponade","Acute pericarditis"],"reasoning":"An intimal flap dividing the aortic lumen confirms dissection in this context."}}'::jsonb),
('cardiologie-9',1,'{"correct":0,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne ayant un épanchement péricardique devient hypotendue, avec turgescence jugulaire. L’échographie retrouve une compression diastolique des cavités droites.","options":["Tamponnade cardiaque","Syncope réflexe vasovagale","Infarctus du myocarde aigu","Rétrécissement aortique"],"reasoning":"Un épanchement compromettant le remplissage cardiaque produit une tamponnade."},"en":{"title":"What is the most likely diagnosis?","context":"A person with a pericardial effusion becomes hypotensive with distended neck veins. Echocardiography shows diastolic compression of the right-sided chambers.","options":["Cardiac tamponade","Vasovagal syncope","Acute myocardial infarction","Aortic stenosis"],"reasoning":"An effusion compromising cardiac filling causes tamponade."}}'::jsonb),
('cardiologie-10',1,'{"correct":3,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une étudiante perd brièvement connaissance après être restée longtemps debout dans une pièce chaude. Elle avait des nausées, une sensation de chaleur et des sueurs. La récupération est rapide et l’ECG de repos est normal.","options":["Péricardite aiguë","Fibrillation auriculaire","Insuffisance mitrale","Syncope réflexe vasovagale"],"reasoning":"Le déclencheur et les prodromes sont compatibles avec une syncope réflexe ; les signes d’alarme doivent néanmoins être recherchés."},"en":{"title":"What is the most likely diagnosis?","context":"A student briefly loses consciousness after standing for a long time in a hot room. Nausea, warmth and sweating preceded the event. Recovery is rapid and the resting ECG is normal.","options":["Acute pericarditis","Atrial fibrillation","Mitral regurgitation","Vasovagal syncope"],"reasoning":"The trigger and prodrome fit reflex syncope, although warning signs must still be assessed."}}'::jsonb),
('pneumologie-1',1,'{"correct":0,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne de 22 ans décrit des épisodes de dyspnée sifflante nocturne et à l’effort, avec des périodes sans symptômes. La spirométrie objective une obstruction variable avec réversibilité significative après bronchodilatateur.","options":["Asthme","BPCO","Pneumothorax spontané","Tuberculose pulmonaire"],"reasoning":"La variabilité des symptômes et du débit expiratoire oriente vers l’asthme."},"en":{"title":"What is the most likely diagnosis?","context":"A 22-year-old describes episodes of wheezing breathlessness at night and during exercise, with symptom-free periods. Spirometry documents variable obstruction with significant reversibility after a bronchodilator.","options":["Asthma","COPD","Spontaneous pneumothorax","Pulmonary tuberculosis"],"reasoning":"Variable symptoms and expiratory airflow suggest asthma."}}'::jsonb),
('pneumologie-2',1,'{"correct":3,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne de 65 ans avec 45 paquets-années présente toux chronique et dyspnée progressive. La spirométrie après bronchodilatateur confirme une obstruction persistante selon les critères adaptés au contexte.","options":["Embolie pulmonaire","Pneumonie communautaire","Bronchectasies","BPCO"],"reasoning":"L’exposition, la chronicité et l’obstruction persistante sont compatibles avec une bronchopneumopathie chronique obstructive."},"en":{"title":"What is the most likely diagnosis?","context":"A 65-year-old with a 45 pack-year smoking history has chronic cough and progressive breathlessness. Post-bronchodilator spirometry confirms persistent obstruction using criteria appropriate to the clinical context.","options":["Pulmonary embolism","Community-acquired pneumonia","Bronchiectasis","COPD"],"reasoning":"Exposure, chronic symptoms and persistent obstruction fit chronic obstructive pulmonary disease."}}'::jsonb),
('pneumologie-3',1,'{"correct":2,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne de 38 ans, opérée récemment, présente une dyspnée brutale et une douleur thoracique inspiratoire. L’angioscanner met en évidence un défaut de rehaussement endoluminal d’une artère pulmonaire.","options":["Épanchement pleural liquidien","Syndrome d’apnées obstructives du sommeil","Embolie pulmonaire","Pneumothorax spontané"],"reasoning":"Un défaut endoluminal artériel pulmonaire dans ce contexte correspond à une embolie pulmonaire."},"en":{"title":"What is the most likely diagnosis?","context":"A 38-year-old who recently underwent surgery develops sudden breathlessness and pleuritic chest pain. CT pulmonary angiography shows an intraluminal filling defect in a pulmonary artery.","options":["Pleural effusion","Obstructive sleep apnoea","Pulmonary embolism","Spontaneous pneumothorax"],"reasoning":"An intraluminal pulmonary arterial filling defect in this setting indicates pulmonary embolism."}}'::jsonb),
('pneumologie-4',1,'{"correct":1,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne de 21 ans présente une douleur thoracique unilatérale brutale et une dyspnée. Le murmure vésiculaire est diminué d’un côté ; la radiographie décrit une ligne pleurale avec absence de trame vasculaire au-delà.","options":["Fibrose pulmonaire","Pneumothorax spontané","Pneumonie communautaire","Tuberculose pulmonaire"],"reasoning":"La présence d’air dans l’espace pleural explique le décollement pulmonaire."},"en":{"title":"What is the most likely diagnosis?","context":"A 21-year-old develops sudden unilateral chest pain and breathlessness. Breath sounds are reduced on one side; the chest X-ray report describes a pleural line with no vascular markings beyond it.","options":["Pulmonary fibrosis","Spontaneous pneumothorax","Community-acquired pneumonia","Pulmonary tuberculosis"],"reasoning":"Air in the pleural space explains separation of the lung from the chest wall."}}'::jsonb),
('pneumologie-5',1,'{"correct":0,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne de 47 ans présente fièvre, toux productive et douleur basithoracique. Des crépitants sont localisés à droite et la radiographie montre une opacité alvéolaire systématisée avec bronchogramme aérien.","options":["Pneumonie communautaire","Épanchement pleural liquidien","Bronchectasies","Asthme"],"reasoning":"L’infection aiguë avec un foyer de condensation est compatible avec une pneumonie communautaire."},"en":{"title":"What is the most likely diagnosis?","context":"A 47-year-old has fever, productive cough and lower chest pain. Crackles are localized on the right and the chest X-ray shows a lobar air-space opacity with air bronchograms.","options":["Community-acquired pneumonia","Pleural effusion","Bronchiectasis","Asthma"],"reasoning":"Acute infection with focal consolidation is consistent with community-acquired pneumonia."}}'::jsonb),
('pneumologie-6',1,'{"correct":3,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne présente une dyspnée progressive. L’examen retrouve une matité déclive et une diminution du murmure vésiculaire. L’échographie montre une collection liquidienne dans l’espace pleural.","options":["Tuberculose pulmonaire","Syndrome d’apnées obstructives du sommeil","BPCO","Épanchement pleural liquidien"],"reasoning":"La collection pleurale explique la matité et la diminution des bruits respiratoires ; sa cause reste à préciser."},"en":{"title":"What is the most likely diagnosis?","context":"A person has progressive breathlessness. Examination finds dependent dullness and reduced breath sounds. Ultrasound shows a collection of fluid in the pleural space.","options":["Pulmonary tuberculosis","Obstructive sleep apnoea","COPD","Pleural effusion"],"reasoning":"Pleural fluid explains the dullness and reduced breath sounds; its cause still needs investigation."}}'::jsonb),
('pneumologie-7',1,'{"correct":2,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne décrit une toux depuis six semaines, des sueurs nocturnes et un amaigrissement. L’imagerie retrouve des cavernes apicales et un test moléculaire sur expectoration détecte Mycobacterium tuberculosis.","options":["Fibrose pulmonaire","Embolie pulmonaire","Tuberculose pulmonaire","Bronchectasies"],"reasoning":"La mise en évidence du complexe tuberculeux confirme l’hypothèse suggérée par la clinique et l’imagerie."},"en":{"title":"What is the most likely diagnosis?","context":"A person reports six weeks of cough, night sweats and weight loss. Imaging shows apical cavities and a molecular test on sputum detects Mycobacterium tuberculosis.","options":["Pulmonary fibrosis","Pulmonary embolism","Pulmonary tuberculosis","Bronchiectasis"],"reasoning":"Detection of the tuberculosis complex confirms the suspicion raised by symptoms and imaging."}}'::jsonb),
('pneumologie-8',1,'{"correct":1,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne a des infections respiratoires répétées et des expectorations quotidiennes abondantes. Le scanner montre des bronches dilatées dont le calibre dépasse celui de l’artère adjacente.","options":["Pneumothorax spontané","Bronchectasies","Syndrome d’apnées obstructives du sommeil","Asthme"],"reasoning":"Le scanner objective des dilatations bronchiques permanentes responsables de l’encombrement."},"en":{"title":"What is the most likely diagnosis?","context":"A person has recurrent respiratory infections and large amounts of daily sputum. CT shows dilated bronchi with a diameter exceeding that of the adjacent artery.","options":["Spontaneous pneumothorax","Bronchiectasis","Obstructive sleep apnoea","Asthma"],"reasoning":"CT demonstrates permanent bronchial dilatation responsible for impaired clearance."}}'::jsonb),
('pneumologie-9',1,'{"correct":0,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne de 54 ans décrit une somnolence diurne. Son entourage signale des ronflements et des pauses respiratoires nocturnes. L’enregistrement montre des interruptions répétées du débit avec persistance de l’effort respiratoire.","options":["Syndrome d’apnées obstructives du sommeil","Fibrose pulmonaire","BPCO","Pneumonie communautaire"],"reasoning":"La persistance de l’effort lors d’une interruption du débit caractérise un mécanisme obstructif."},"en":{"title":"What is the most likely diagnosis?","context":"A 54-year-old reports daytime sleepiness. Their partner describes snoring and pauses in breathing at night. A sleep recording shows repeated interruptions of airflow with continued respiratory effort.","options":["Obstructive sleep apnoea","Pulmonary fibrosis","COPD","Community-acquired pneumonia"],"reasoning":"Continued effort during interruption of airflow indicates an obstructive mechanism."}}'::jsonb),
('pneumologie-10',1,'{"correct":3,"fr":{"title":"Quelle est l’hypothèse la plus probable ?","context":"Une personne de 70 ans présente une dyspnée d’effort progressive et des crépitants secs aux bases. Les EFR montrent un trouble restrictif et le scanner des réticulations avec rayon de miel sous-pleural basal.","options":["Asthme","Embolie pulmonaire","Épanchement pleural liquidien","Fibrose pulmonaire"],"reasoning":"Ces éléments évoquent une atteinte interstitielle fibrosante. Le caractère idiopathique ne peut être affirmé sans bilan étiologique."},"en":{"title":"What is the most likely diagnosis?","context":"A 70-year-old has progressive exertional breathlessness and fine basal crackles. Lung function tests show restriction and CT shows reticulation with basal subpleural honeycombing.","options":["Asthma","Pulmonary embolism","Pleural effusion","Pulmonary fibrosis"],"reasoning":"These findings suggest fibrosing interstitial lung disease. An idiopathic cause cannot be assumed without investigation."}}'::jsonb);

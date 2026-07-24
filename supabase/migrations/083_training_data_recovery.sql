-- NCR Suite V2.21.1 - Reprise de donnees Formation
-- A executer apres 082_training_portals_signatures.sql.

begin;

create or replace function public.preview_training_recovery_import(
  p_organization_id uuid,
  p_import_type text,
  p_rows jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_total integer := 0;
  v_ready integer := 0;
  v_skipped integer := 0;
  v_line integer := 1;
  v_errors jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_seen_keys text[] := '{}'::text[];
  v_key text;
  v_duplicate boolean;
  v_program_id uuid;
  v_trainer_id uuid;
  v_session_id uuid;
  v_trainee_id uuid;
  v_site_id uuid;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_status text;
  v_value text;
  v_plan text;
begin
  if not public.has_org_role(p_organization_id, array['owner','admin']) then
    raise exception 'Seul le proprietaire ou un administrateur peut verifier un import.';
  end if;

  select plan into v_plan
  from public.organizations
  where id=p_organization_id and business_type='formation';
  if not found then
    raise exception 'Cet import est reserve aux espaces Formation.';
  end if;

  if p_import_type not in (
    'training_trainees','training_trainers','training_programs',
    'training_customers','training_funders','training_opportunities',
    'training_sessions','training_enrollments'
  ) then
    raise exception 'Type d import Formation inconnu.';
  end if;

  if p_import_type in ('training_funders','training_opportunities')
     and not public.organization_has_plan_feature(p_organization_id,'training_commercial') then
    raise exception 'Le module CRM et commercial Formation doit etre actif pour cet import.';
  end if;

  if jsonb_typeof(p_rows)<>'array' then
    raise exception 'Le fichier importe est invalide.';
  end if;
  v_total:=jsonb_array_length(p_rows);
  if v_total<1 then raise exception 'Le fichier ne contient aucune donnee.'; end if;
  if v_total>1000 then raise exception 'Un import est limite a 1 000 lignes.'; end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_line:=v_line+1;
    v_key:=null;
    v_duplicate:=false;
    v_program_id:=null;
    v_trainer_id:=null;
    v_session_id:=null;
    v_trainee_id:=null;
    v_site_id:=null;
    begin
      if p_import_type='training_trainees' then
        if nullif(trim(coalesce(v_row->>'first_name','')),'') is null
           or nullif(trim(coalesce(v_row->>'last_name','')),'') is null then
          raise exception 'Prenom et nom obligatoires.';
        end if;
        if nullif(lower(trim(v_row->>'email')),'') is not null then
          v_key:='trainee-email:'||lower(trim(v_row->>'email'));
          v_duplicate:=exists(
            select 1 from public.training_trainees
            where organization_id=p_organization_id
              and lower(coalesce(email,''))=lower(trim(v_row->>'email'))
          );
        end if;

      elsif p_import_type='training_trainers' then
        if nullif(trim(coalesce(v_row->>'first_name','')),'') is null
           or nullif(trim(coalesce(v_row->>'last_name','')),'') is null then
          raise exception 'Prenom et nom obligatoires.';
        end if;
        if nullif(lower(trim(v_row->>'email')),'') is not null then
          v_key:='trainer-email:'||lower(trim(v_row->>'email'));
          v_duplicate:=exists(
            select 1 from public.training_trainers
            where organization_id=p_organization_id
              and lower(coalesce(email,''))=lower(trim(v_row->>'email'))
          );
        end if;

      elsif p_import_type='training_programs' then
        if nullif(trim(coalesce(v_row->>'title','')),'') is null then
          raise exception 'Titre du programme obligatoire.';
        end if;
        if coalesce(nullif(replace(v_row->>'duration_hours',',','.'),''),'7')::numeric<=0 then
          raise exception 'La duree doit etre superieure a zero.';
        end if;
        v_status:=lower(coalesce(nullif(trim(v_row->>'modality'),''),'presentiel'));
        if v_status not in ('presentiel','distanciel','hybride') then
          raise exception 'Modalite attendue : presentiel, distanciel ou hybride.';
        end if;
        v_key:='program:'||lower(trim(v_row->>'title'));
        v_duplicate:=exists(
          select 1 from public.training_programs
          where organization_id=p_organization_id
            and lower(title)=lower(trim(v_row->>'title'))
        );

      elsif p_import_type='training_customers' then
        if nullif(trim(coalesce(v_row->>'legal_name','')),'') is null then
          raise exception 'Raison sociale obligatoire.';
        end if;
        v_status:=lower(coalesce(nullif(trim(v_row->>'customer_type'),''),'company'));
        if v_status not in ('company','individual') then
          raise exception 'Type client attendu : company ou individual.';
        end if;
        v_key:='customer:'||coalesce(
          nullif(regexp_replace(coalesce(v_row->>'siret',''),'[^0-9]','','g'),''),
          nullif(lower(trim(v_row->>'email')),''),
          lower(trim(v_row->>'legal_name'))
        );
        v_duplicate:=exists(
          select 1 from public.training_customers c
          where c.organization_id=p_organization_id
            and (
              (nullif(regexp_replace(coalesce(v_row->>'siret',''),'[^0-9]','','g'),'') is not null
                and regexp_replace(coalesce(c.siret,''),'[^0-9]','','g')=regexp_replace(v_row->>'siret','[^0-9]','','g'))
              or (nullif(lower(trim(v_row->>'email')),'') is not null
                and lower(coalesce(c.email,''))=lower(trim(v_row->>'email')))
              or lower(c.legal_name)=lower(trim(v_row->>'legal_name'))
            )
        );

      elsif p_import_type='training_funders' then
        if nullif(trim(coalesce(v_row->>'name','')),'') is null then
          raise exception 'Nom du financeur obligatoire.';
        end if;
        v_status:=lower(coalesce(nullif(trim(v_row->>'funder_type'),''),'opco'));
        if v_status not in ('opco','employer','cpf','public','self','other') then
          raise exception 'Type financeur invalide.';
        end if;
        v_key:='funder:'||coalesce(
          nullif(lower(trim(v_row->>'reference_code')),''),
          lower(trim(v_row->>'name'))
        );
        v_duplicate:=exists(
          select 1 from public.training_funders f
          where f.organization_id=p_organization_id
            and (
              lower(f.name)=lower(trim(v_row->>'name'))
              or (nullif(lower(trim(v_row->>'reference_code')),'') is not null
                and lower(coalesce(f.reference_code,''))=lower(trim(v_row->>'reference_code')))
            )
        );

      elsif p_import_type='training_opportunities' then
        if nullif(trim(coalesce(v_row->>'title','')),'') is null then
          raise exception 'Titre de l opportunite obligatoire.';
        end if;
        if nullif(trim(coalesce(v_row->>'company_name','')),'') is null
           and nullif(trim(coalesce(v_row->>'contact_name','')),'') is null then
          raise exception 'Entreprise ou contact obligatoire.';
        end if;
        v_status:=lower(coalesce(nullif(trim(v_row->>'stage'),''),'new'));
        if v_status not in ('new','qualified','proposal','negotiation','won','lost') then
          raise exception 'Etape CRM invalide.';
        end if;
        v_value:=lower(coalesce(nullif(trim(v_row->>'source'),''),'other'));
        if v_value not in ('website','referral','outbound','event','partner','existing_customer','other') then
          raise exception 'Source CRM invalide.';
        end if;
        if coalesce(nullif(replace(v_row->>'estimated_value_euros',',','.'),''),'0')::numeric<0 then
          raise exception 'Le montant estime ne peut pas etre negatif.';
        end if;
        if nullif(trim(v_row->>'probability'),'') is not null
           and (v_row->>'probability')::integer not between 0 and 100 then
          raise exception 'La probabilite doit etre comprise entre 0 et 100.';
        end if;
        if nullif(trim(v_row->>'expected_close_date'),'') is not null then
          perform (v_row->>'expected_close_date')::date;
        end if;
        if nullif(trim(v_row->>'next_action_at'),'') is not null
           and nullif(trim(v_row->>'next_action_label'),'') is null then
          raise exception 'Le libelle de relance est obligatoire lorsque sa date est renseignee.';
        end if;
        if nullif(trim(v_row->>'next_action_at'),'') is not null then
          perform (v_row->>'next_action_at')::timestamptz;
        end if;
        if nullif(trim(v_row->>'program_code'),'') is not null then
          select id into v_program_id
          from public.training_programs
          where organization_id=p_organization_id
            and lower(coalesce(code,''))=lower(trim(v_row->>'program_code'))
          limit 1;
          if v_program_id is null then
            raise exception 'Programme introuvable : %',trim(v_row->>'program_code');
          end if;
        end if;
        v_key:='opportunity:'||lower(trim(v_row->>'title'))||':'||
          lower(coalesce(nullif(trim(v_row->>'contact_email'),''),
                         nullif(trim(v_row->>'company_name'),''),
                         trim(v_row->>'contact_name')));
        v_duplicate:=exists(
          select 1 from public.training_crm_opportunities o
          where o.organization_id=p_organization_id
            and lower(o.title)=lower(trim(v_row->>'title'))
            and lower(coalesce(o.contact_email,o.company_name,o.contact_name,''))=
                lower(coalesce(nullif(trim(v_row->>'contact_email'),''),
                               nullif(trim(v_row->>'company_name'),''),
                               trim(v_row->>'contact_name')))
        );

      elsif p_import_type='training_sessions' then
        if nullif(trim(coalesce(v_row->>'title','')),'') is null then
          raise exception 'Titre de session obligatoire.';
        end if;
        if nullif(trim(v_row->>'starts_at'),'') is null
           or nullif(trim(v_row->>'ends_at'),'') is null then
          raise exception 'Dates de debut et de fin obligatoires.';
        end if;
        v_starts_at:=(v_row->>'starts_at')::timestamptz;
        v_ends_at:=(v_row->>'ends_at')::timestamptz;
        if v_ends_at<=v_starts_at then raise exception 'La fin doit etre posterieure au debut.'; end if;
        if coalesce(nullif(trim(v_row->>'capacity'),''),'12')::integer not between 1 and 500 then
          raise exception 'La capacite doit etre comprise entre 1 et 500.';
        end if;
        v_status:=lower(coalesce(nullif(trim(v_row->>'status'),''),'draft'));
        if v_status not in ('draft','scheduled','in_progress','completed','canceled') then
          raise exception 'Statut de session invalide.';
        end if;
        v_value:=lower(coalesce(nullif(trim(v_row->>'modality'),''),'presentiel'));
        if v_value not in ('presentiel','distanciel','hybride') then
          raise exception 'Modalite attendue : presentiel, distanciel ou hybride.';
        end if;

        if nullif(trim(v_row->>'program_code'),'') is not null then
          select id into v_program_id from public.training_programs
          where organization_id=p_organization_id
            and lower(coalesce(code,''))=lower(trim(v_row->>'program_code'))
          limit 1;
        elsif nullif(trim(v_row->>'program_title'),'') is not null then
          select id into v_program_id from public.training_programs
          where organization_id=p_organization_id
            and lower(title)=lower(trim(v_row->>'program_title'))
          limit 1;
        end if;
        if v_program_id is null then
          raise exception 'Programme introuvable. Renseignez program_code ou program_title.';
        end if;

        if nullif(trim(v_row->>'trainer_email'),'') is not null then
          select id into v_trainer_id from public.training_trainers
          where organization_id=p_organization_id
            and lower(coalesce(email,''))=lower(trim(v_row->>'trainer_email'))
          limit 1;
          if v_trainer_id is null then
            raise exception 'Formateur introuvable : %',trim(v_row->>'trainer_email');
          end if;
        end if;

        if nullif(trim(v_row->>'site_name'),'') is not null then
          select id into v_site_id from public.organization_sites
          where organization_id=p_organization_id and status='active'
            and lower(name)=lower(trim(v_row->>'site_name'))
          limit 1;
          if v_site_id is null then
            raise exception 'Etablissement introuvable : %',trim(v_row->>'site_name');
          end if;
        elsif v_plan='metier' then
          select id into v_site_id from public.organization_sites
          where organization_id=p_organization_id and status='active'
          order by created_at limit 1;
          if v_site_id is null then
            raise exception 'Un etablissement actif est requis pour une offre Metier.';
          end if;
        end if;

        if v_status in ('scheduled','in_progress') then
          v_warnings:=v_warnings||jsonb_build_array(jsonb_build_object(
            'line',v_line,
            'message','La session sera importee en brouillon pour eviter les envois automatiques. Elle devra etre validee depuis Sessions.'
          ));
        end if;
        v_key:='session:'||lower(trim(v_row->>'title'))||':'||v_starts_at::text;
        v_duplicate:=exists(
          select 1 from public.training_sessions s
          where s.organization_id=p_organization_id
            and lower(s.title)=lower(trim(v_row->>'title'))
            and s.starts_at=v_starts_at
        );

      elsif p_import_type='training_enrollments' then
        if nullif(trim(v_row->>'session_title'),'') is null
           or nullif(trim(v_row->>'session_starts_at'),'') is null then
          raise exception 'Session et date de debut obligatoires.';
        end if;
        v_starts_at:=(v_row->>'session_starts_at')::timestamptz;
        select id into v_session_id from public.training_sessions
        where organization_id=p_organization_id
          and lower(title)=lower(trim(v_row->>'session_title'))
          and starts_at=v_starts_at
        limit 1;
        if v_session_id is null then
          raise exception 'Session introuvable : %',trim(v_row->>'session_title');
        end if;

        if nullif(trim(v_row->>'trainee_email'),'') is not null then
          select id into v_trainee_id from public.training_trainees
          where organization_id=p_organization_id
            and lower(coalesce(email,''))=lower(trim(v_row->>'trainee_email'))
          limit 1;
        elsif nullif(trim(v_row->>'trainee_first_name'),'') is not null
              and nullif(trim(v_row->>'trainee_last_name'),'') is not null then
          select id into v_trainee_id from public.training_trainees
          where organization_id=p_organization_id
            and lower(first_name)=lower(trim(v_row->>'trainee_first_name'))
            and lower(last_name)=lower(trim(v_row->>'trainee_last_name'))
          limit 1;
        end if;
        if v_trainee_id is null then
          raise exception 'Stagiaire introuvable. Renseignez son e-mail ou son nom complet.';
        end if;

        v_status:=lower(coalesce(nullif(trim(v_row->>'status'),''),'registered'));
        if v_status not in ('registered','confirmed','completed','absent','canceled') then
          raise exception 'Statut d inscription invalide.';
        end if;
        v_value:=lower(coalesce(nullif(trim(v_row->>'bpf_trainee_type'),''),''));
        if v_value<>'' and v_value not in ('private_employee','apprentice','jobseeker','individual','other') then
          raise exception 'Categorie BPF du stagiaire invalide.';
        end if;
        if nullif(trim(v_row->>'attended_hours'),'') is not null
           and replace(v_row->>'attended_hours',',','.')::numeric<0 then
          raise exception 'Les heures suivies ne peuvent pas etre negatives.';
        end if;
        v_key:='enrollment:'||v_session_id::text||':'||v_trainee_id::text;
        v_duplicate:=exists(
          select 1 from public.training_session_enrollments
          where organization_id=p_organization_id
            and session_id=v_session_id and trainee_id=v_trainee_id
        );
      end if;

      if v_duplicate or (v_key is not null and v_key=any(v_seen_keys)) then
        v_skipped:=v_skipped+1;
      else
        v_ready:=v_ready+1;
        if v_key is not null then v_seen_keys:=array_append(v_seen_keys,v_key); end if;
      end if;
    exception when others then
      v_errors:=v_errors||jsonb_build_array(jsonb_build_object('line',v_line,'message',sqlerrm));
    end;
  end loop;

  return jsonb_build_object(
    'status',case when jsonb_array_length(v_errors)=0 then 'ready' else 'blocked' end,
    'total_rows',v_total,
    'ready_rows',v_ready,
    'inserted_rows',0,
    'skipped_rows',v_skipped,
    'error_rows',jsonb_array_length(v_errors),
    'errors',v_errors,
    'warnings',v_warnings
  );
end;
$$;

-- Le verrou de cloture reste inchangé pour l application. Seule la fonction
-- d import, reservee aux proprietaires et administrateurs, peut ajouter les
-- inscriptions historiques d une session deja terminee.
create or replace function public.prevent_closed_training_session_child_change()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_session_id uuid;
  v_status text;
begin
  v_organization_id:=case when tg_op='DELETE' then old.organization_id else new.organization_id end;
  v_session_id:=case when tg_op='DELETE' then old.session_id else new.session_id end;

  select status into v_status
  from public.training_sessions
  where organization_id=v_organization_id and id=v_session_id;

  if v_status='completed'
     and coalesce(current_setting('ncr.allow_training_history_import',true),'')<>'1' then
    raise exception 'La session est cloturee. Rouvrez-la avant toute modification.';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.import_training_recovery_records(
  p_organization_id uuid,
  p_import_type text,
  p_file_name text,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_preflight jsonb;
  v_job_id uuid;
  v_row jsonb;
  v_inserted integer := 0;
  v_skipped integer := 0;
  v_program_id uuid;
  v_trainer_id uuid;
  v_customer_id uuid;
  v_session_id uuid;
  v_trainee_id uuid;
  v_site_id uuid;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_status text;
  v_source text;
  v_plan text;
  v_notes text;
begin
  if p_import_type not in (
    'training_customers','training_funders','training_opportunities',
    'training_sessions','training_enrollments'
  ) then
    raise exception 'Ce type doit utiliser l import de demarrage deja valide.';
  end if;

  v_preflight:=public.preview_training_recovery_import(p_organization_id,p_import_type,p_rows);
  if coalesce((v_preflight->>'error_rows')::integer,0)>0 then
    return v_preflight;
  end if;

  select plan into v_plan from public.organizations where id=p_organization_id;

  insert into public.organization_import_jobs(
    organization_id,import_type,file_name,status,total_rows,created_by
  ) values (
    p_organization_id,p_import_type,nullif(trim(coalesce(p_file_name,'')),''),
    'processing',jsonb_array_length(p_rows),auth.uid()
  ) returning id into v_job_id;

  if p_import_type='training_enrollments' then
    perform set_config('ncr.allow_training_history_import','1',true);
  end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_program_id:=null;
    v_trainer_id:=null;
    v_customer_id:=null;
    v_session_id:=null;
    v_trainee_id:=null;
    v_site_id:=null;

    if p_import_type='training_customers' then
      if exists(
        select 1 from public.training_customers c
        where c.organization_id=p_organization_id
          and (
            (nullif(regexp_replace(coalesce(v_row->>'siret',''),'[^0-9]','','g'),'') is not null
              and regexp_replace(coalesce(c.siret,''),'[^0-9]','','g')=regexp_replace(v_row->>'siret','[^0-9]','','g'))
            or (nullif(lower(trim(v_row->>'email')),'') is not null
              and lower(coalesce(c.email,''))=lower(trim(v_row->>'email')))
            or lower(c.legal_name)=lower(trim(v_row->>'legal_name'))
          )
      ) then
        v_skipped:=v_skipped+1;
      else
        insert into public.training_customers(
          organization_id,customer_type,legal_name,contact_name,email,phone,
          billing_address,postal_code,city,siret,vat_number,notes,created_by
        ) values (
          p_organization_id,
          lower(coalesce(nullif(trim(v_row->>'customer_type'),''),'company')),
          trim(v_row->>'legal_name'),nullif(trim(v_row->>'contact_name'),''),
          lower(nullif(trim(v_row->>'email'),'')),nullif(trim(v_row->>'phone'),''),
          nullif(trim(v_row->>'billing_address'),''),nullif(trim(v_row->>'postal_code'),''),
          nullif(trim(v_row->>'city'),''),nullif(trim(v_row->>'siret'),''),
          nullif(trim(v_row->>'vat_number'),''),nullif(trim(v_row->>'notes'),''),auth.uid()
        );
        v_inserted:=v_inserted+1;
      end if;

    elsif p_import_type='training_funders' then
      if exists(
        select 1 from public.training_funders f
        where f.organization_id=p_organization_id
          and (
            lower(f.name)=lower(trim(v_row->>'name'))
            or (nullif(lower(trim(v_row->>'reference_code')),'') is not null
              and lower(coalesce(f.reference_code,''))=lower(trim(v_row->>'reference_code')))
          )
      ) then
        v_skipped:=v_skipped+1;
      else
        insert into public.training_funders(
          organization_id,funder_type,name,contact_name,email,phone,billing_address,
          postal_code,city,siret,vat_number,reference_code,notes,created_by
        ) values (
          p_organization_id,lower(coalesce(nullif(trim(v_row->>'funder_type'),''),'opco')),
          trim(v_row->>'name'),nullif(trim(v_row->>'contact_name'),''),
          lower(nullif(trim(v_row->>'email'),'')),nullif(trim(v_row->>'phone'),''),
          nullif(trim(v_row->>'billing_address'),''),nullif(trim(v_row->>'postal_code'),''),
          nullif(trim(v_row->>'city'),''),nullif(trim(v_row->>'siret'),''),
          nullif(trim(v_row->>'vat_number'),''),nullif(trim(v_row->>'reference_code'),''),
          nullif(trim(v_row->>'notes'),''),auth.uid()
        );
        v_inserted:=v_inserted+1;
      end if;

    elsif p_import_type='training_opportunities' then
      if exists(
        select 1 from public.training_crm_opportunities o
        where o.organization_id=p_organization_id
          and lower(o.title)=lower(trim(v_row->>'title'))
          and lower(coalesce(o.contact_email,o.company_name,o.contact_name,''))=
              lower(coalesce(nullif(trim(v_row->>'contact_email'),''),
                             nullif(trim(v_row->>'company_name'),''),
                             trim(v_row->>'contact_name')))
      ) then
        v_skipped:=v_skipped+1;
      else
        if nullif(trim(v_row->>'program_code'),'') is not null then
          select id into v_program_id from public.training_programs
          where organization_id=p_organization_id
            and lower(coalesce(code,''))=lower(trim(v_row->>'program_code'))
          limit 1;
        end if;
        if nullif(trim(v_row->>'customer_name'),'') is not null then
          select id into v_customer_id from public.training_customers
          where organization_id=p_organization_id
            and lower(legal_name)=lower(trim(v_row->>'customer_name'))
          limit 1;
        end if;
        v_status:=lower(coalesce(nullif(trim(v_row->>'stage'),''),'new'));
        v_source:=lower(coalesce(nullif(trim(v_row->>'source'),''),'other'));
        insert into public.training_crm_opportunities(
          organization_id,customer_id,program_id,title,company_name,contact_name,
          contact_email,contact_phone,source,stage,estimated_value_cents,probability,
          expected_close_date,next_action_label,next_action_at,notes,created_by,
          won_at,lost_at
        ) values (
          p_organization_id,v_customer_id,v_program_id,trim(v_row->>'title'),
          nullif(trim(v_row->>'company_name'),''),nullif(trim(v_row->>'contact_name'),''),
          lower(nullif(trim(v_row->>'contact_email'),'')),nullif(trim(v_row->>'contact_phone'),''),
          v_source,v_status,
          greatest(0,round(coalesce(nullif(replace(v_row->>'estimated_value_euros',',','.'),'')::numeric,0)*100)::integer),
          coalesce(nullif(trim(v_row->>'probability'),'')::integer,
            case v_status when 'won' then 100 when 'lost' then 0 else 20 end),
          nullif(trim(v_row->>'expected_close_date'),'')::date,
          nullif(trim(v_row->>'next_action_label'),''),
          nullif(trim(v_row->>'next_action_at'),'')::timestamptz,
          nullif(trim(v_row->>'notes'),''),auth.uid(),
          case when v_status='won' then now() end,
          case when v_status='lost' then now() end
        );
        v_inserted:=v_inserted+1;
      end if;

    elsif p_import_type='training_sessions' then
      v_starts_at:=(v_row->>'starts_at')::timestamptz;
      v_ends_at:=(v_row->>'ends_at')::timestamptz;
      if exists(
        select 1 from public.training_sessions s
        where s.organization_id=p_organization_id
          and lower(s.title)=lower(trim(v_row->>'title'))
          and s.starts_at=v_starts_at
      ) then
        v_skipped:=v_skipped+1;
      else
        if nullif(trim(v_row->>'program_code'),'') is not null then
          select id into v_program_id from public.training_programs
          where organization_id=p_organization_id
            and lower(coalesce(code,''))=lower(trim(v_row->>'program_code'))
          limit 1;
        else
          select id into v_program_id from public.training_programs
          where organization_id=p_organization_id
            and lower(title)=lower(trim(v_row->>'program_title'))
          limit 1;
        end if;
        if nullif(trim(v_row->>'trainer_email'),'') is not null then
          select id into v_trainer_id from public.training_trainers
          where organization_id=p_organization_id
            and lower(coalesce(email,''))=lower(trim(v_row->>'trainer_email'))
          limit 1;
        end if;
        if nullif(trim(v_row->>'site_name'),'') is not null then
          select id into v_site_id from public.organization_sites
          where organization_id=p_organization_id and status='active'
            and lower(name)=lower(trim(v_row->>'site_name'))
          limit 1;
        elsif v_plan='metier' then
          select id into v_site_id from public.organization_sites
          where organization_id=p_organization_id and status='active'
          order by created_at limit 1;
        end if;
        v_status:=lower(coalesce(nullif(trim(v_row->>'status'),''),'draft'));
        v_notes:=nullif(trim(v_row->>'notes'),'');
        if v_status in ('scheduled','in_progress') then
          v_notes:=concat_ws(E'\n',v_notes,'Statut d origine : '||v_status||'. Session importee en brouillon pour validation.');
          v_status:='draft';
        end if;
        insert into public.training_sessions(
          organization_id,site_id,program_id,trainer_id,title,starts_at,ends_at,
          capacity,location,modality,status,notes,created_by,
          validated_at,validated_by,closed_at,closed_by,closure_notes,delivery_completed_at
        ) values (
          p_organization_id,v_site_id,v_program_id,v_trainer_id,trim(v_row->>'title'),
          v_starts_at,v_ends_at,coalesce(nullif(trim(v_row->>'capacity'),'')::integer,12),
          nullif(trim(v_row->>'location'),''),
          lower(coalesce(nullif(trim(v_row->>'modality'),''),'presentiel')),
          v_status,v_notes,auth.uid(),
          case when v_status='completed' then v_starts_at end,
          case when v_status='completed' then auth.uid() end,
          case when v_status='completed' then v_ends_at end,
          case when v_status='completed' then auth.uid() end,
          case when v_status='completed' then 'Session historique importee sans envoi automatique.' end,
          case when v_status='completed' then v_ends_at end
        ) returning id into v_session_id;

        -- Le declencheur PWA historique annonce chaque INSERT. Les evenements
        -- de cette reprise sont retires avant le commit pour ne pas notifier
        -- les utilisateurs au sujet d anciennes sessions.
        delete from public.notification_events
        where organization_id=p_organization_id
          and entity_type='training_session'
          and entity_id=v_session_id::text;

        v_inserted:=v_inserted+1;
      end if;

    elsif p_import_type='training_enrollments' then
      v_starts_at:=(v_row->>'session_starts_at')::timestamptz;
      select id into v_session_id from public.training_sessions
      where organization_id=p_organization_id
        and lower(title)=lower(trim(v_row->>'session_title'))
        and starts_at=v_starts_at
      limit 1;
      if nullif(trim(v_row->>'trainee_email'),'') is not null then
        select id into v_trainee_id from public.training_trainees
        where organization_id=p_organization_id
          and lower(coalesce(email,''))=lower(trim(v_row->>'trainee_email'))
        limit 1;
      else
        select id into v_trainee_id from public.training_trainees
        where organization_id=p_organization_id
          and lower(first_name)=lower(trim(v_row->>'trainee_first_name'))
          and lower(last_name)=lower(trim(v_row->>'trainee_last_name'))
        limit 1;
      end if;
      if exists(
        select 1 from public.training_session_enrollments
        where organization_id=p_organization_id
          and session_id=v_session_id and trainee_id=v_trainee_id
      ) then
        v_skipped:=v_skipped+1;
      else
        insert into public.training_session_enrollments(
          organization_id,session_id,trainee_id,status,bpf_trainee_type,
          bpf_attended_hours,created_by
        ) values (
          p_organization_id,v_session_id,v_trainee_id,
          lower(coalesce(nullif(trim(v_row->>'status'),''),'registered')),
          nullif(lower(trim(v_row->>'bpf_trainee_type')),''),
          nullif(replace(v_row->>'attended_hours',',','.'),'')::numeric,
          auth.uid()
        );
        v_inserted:=v_inserted+1;
      end if;
    end if;
  end loop;

  update public.organization_import_jobs
  set status='completed',
      inserted_rows=v_inserted,
      skipped_rows=v_skipped,
      error_rows=0,
      errors='[]'::jsonb,
      completed_at=now()
  where id=v_job_id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    p_organization_id,auth.uid(),'training.data_recovery_completed',
    'organization_import_job',v_job_id::text,
    jsonb_build_object(
      'import_type',p_import_type,
      'inserted',v_inserted,
      'skipped',v_skipped,
      'preflight',v_preflight
    )
  );

  return jsonb_build_object(
    'job_id',v_job_id,
    'status','completed',
    'total_rows',jsonb_array_length(p_rows),
    'ready_rows',v_inserted,
    'inserted_rows',v_inserted,
    'skipped_rows',v_skipped,
    'error_rows',0,
    'errors','[]'::jsonb,
    'warnings',coalesce(v_preflight->'warnings','[]'::jsonb)
  );
end;
$$;

revoke all on function public.preview_training_recovery_import(uuid,text,jsonb) from public,anon;
revoke all on function public.import_training_recovery_records(uuid,text,text,jsonb) from public,anon;
grant execute on function public.preview_training_recovery_import(uuid,text,jsonb) to authenticated;
grant execute on function public.import_training_recovery_records(uuid,text,text,jsonb) to authenticated;

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.21.1','2.21.1','ncr-suite-shell-v2.21.1-training-data-recovery',
  now(),auth.uid(),
  'V2.21.1 : controle et reprise des clients, financeurs, prospects, sessions et inscriptions Formation sans declencher les automatisations historiques.'
) on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;

select pg_notify('pgrst','reload schema');

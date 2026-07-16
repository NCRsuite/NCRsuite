import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  formatSecurityDateTime,
  securityPersonName,
  type SecurityAgentPositionRecord
} from '../features/security/types';
import { supabase } from '../lib/supabase';

export function SecurityGeolocationPage() {
  const { organization } = useOrganization();
  const [positions, setPositions] = useState<SecurityAgentPositionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organization || !supabase) return;
    setLoading(true);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error: queryError } = await supabase
      .from('security_agent_positions')
      .select('id,organization_id,agent_id,shift_id,latitude,longitude,accuracy_m,recorded_at,created_at,security_agents(first_name,last_name,phone),security_shifts(starts_at,ends_at,title,security_sites(name,address,city))')
      .eq('organization_id', organization.id)
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: false })
      .limit(500);
    if (queryError) setError(queryError.message);
    else {
      setPositions((data ?? []) as unknown as SecurityAgentPositionRecord[]);
      setError('');
      setUpdatedAt(new Date().toISOString());
    }
    setLoading(false);
  }, [organization]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const client = supabase;
    if (!organization || !client) return;
    const channel = client.channel(`security-geo-${organization.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'security_agent_positions', filter: `organization_id=eq.${organization.id}` }, () => void load())
      .subscribe();
    const timer = window.setInterval(() => void load(), 60000);
    return () => { window.clearInterval(timer); void client.removeChannel(channel); };
  }, [organization?.id, load]);

  const latest = useMemo(() => {
    const map = new Map<string, SecurityAgentPositionRecord>();
    for (const position of positions) if (!map.has(position.agent_id)) map.set(position.agent_id, position);
    return [...map.values()];
  }, [positions]);

  const recentCount = latest.filter((row) => Date.now() - new Date(row.recorded_at).getTime() < 5 * 60 * 1000).length;

  if (!organization) return null;

  return (
    <div className="page security-page security-geolocation-page">
      <header className="page-header">
        <div><p className="eyebrow">SÉCURITÉ PROFESSIONNELLE</p><h1>Géolocalisation des agents</h1><p>Dernière position transmise pendant une vacation active. Les agents restent maîtres du démarrage et de l’arrêt du suivi.</p></div>
        <button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}><Icon name="activity" size={18}/>{loading ? 'Actualisation…' : 'Actualiser'}</button>
      </header>
      {error && <div className="error-message page-message">{error}</div>}
      <section className="security-planning-summary"><article><Icon name="users" size={20}/><div><strong>{latest.length}</strong><span>agents localisés sur 24 h</span></div></article><article><Icon name="activity" size={20}/><div><strong>{recentCount}</strong><span>position depuis moins de 5 min</span></div></article><article><Icon name="map" size={20}/><div><strong>{updatedAt ? new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date(updatedAt)) : '—'}</strong><span>dernière actualisation</span></div></article></section>

      <section className="panel security-location-panel">
        <div className="panel-header"><div><p className="eyebrow">POSITIONS RÉCENTES</p><h2>Agents en vacation</h2></div></div>
        {loading && latest.length === 0 ? <div className="security-empty">Chargement des positions…</div> : latest.length === 0 ? <div className="security-empty"><Icon name="map" size={32}/><strong>Aucune position reçue</strong><span>Un agent doit ouvrir PTI / SOS et démarrer le suivi GPS pendant sa vacation.</span></div> : <div className="security-location-list">{latest.map((row) => {
          const age = Date.now() - new Date(row.recorded_at).getTime();
          const live = age < 5 * 60 * 1000;
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${row.latitude},${row.longitude}`)}`;
          return <article key={row.agent_id} className={live ? 'live' : ''}>
            <span className="security-location-avatar">{row.security_agents?.first_name?.slice(0,1) || 'A'}</span>
            <div className="security-location-main"><strong>{row.security_agents ? securityPersonName(row.security_agents.first_name,row.security_agents.last_name) : 'Agent'}</strong><span>{row.security_shifts?.security_sites?.name || 'Vacation'} · {row.security_shifts?.title || 'Mission de sécurité'}</span><small>{formatSecurityDateTime(row.recorded_at)} · précision {Math.round(row.accuracy_m || 0)} m</small></div>
            <span className={`status-chip ${live ? 'active' : 'pending'}`}>{live ? 'En direct' : 'Ancienne'}</span>
            <a className="secondary-button compact-button" href={mapsUrl} target="_blank" rel="noreferrer"><Icon name="map" size={16}/>Ouvrir la carte</a>
          </article>;
        })}</div>}
      </section>
      <div className="security-callout"><Icon name="alert" size={20}/><div><strong>Limite technique iPhone</strong><span>Une PWA ne peut pas garantir un suivi GPS permanent lorsque Safari est fermé ou suspendu. La position est transmise tant que l’application reste active pendant la vacation.</span></div></div>
    </div>
  );
}

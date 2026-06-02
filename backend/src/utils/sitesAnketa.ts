export interface SitesAnketaRow {
  name: string;
  location: string;
}

export interface SitesAnketaData {
  sites: SitesAnketaRow[];
  apps: SitesAnketaRow[];
  hasDirectories: boolean;
  contactEmail: string;
}

export function normalizeSitesAnketaData(data: Record<string, unknown>): SitesAnketaData {
  if (Array.isArray(data.sites) || Array.isArray(data.apps)) {
    const mapRows = (rows: unknown) =>
      (Array.isArray(rows) ? rows : []).map(row => {
        const r = row as Record<string, unknown>;
        return {
          name: String(r.name || '').trim(),
          location: String(r.location ?? r.url ?? '').trim(),
        };
      }).filter(r => r.name);

    return {
      sites: mapRows(data.sites),
      apps: mapRows(data.apps),
      hasDirectories: Boolean(data.hasDirectories),
      contactEmail: String(data.contactEmail || '').trim(),
    };
  }

  const sites = String(data.sitesList || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .map(line => {
      const [name, location] = line.split('|').map(x => x.trim());
      return { name: name || line, location: location || '' };
    });

  const apps = String(data.appsList || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .map(name => ({ name, location: '' }));

  return {
    sites,
    apps,
    hasDirectories: Boolean(data.hasDirectories),
    contactEmail: String(data.contactEmail || '').trim(),
  };
}

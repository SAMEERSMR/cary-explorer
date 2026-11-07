export function fetchArcgis(
  source: { url: string; fields?: string[] },
  deps?: { fetch?: typeof fetch },
): Promise<{ features: any[]; expectedCount: number; sourceModified: string | null; idField: string }>

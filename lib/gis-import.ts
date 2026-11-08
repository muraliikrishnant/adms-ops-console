import type { EdgeDoc, NetworkModel, NodeDoc } from "./types";

interface GeoJsonFeature {
  type: "Feature";
  geometry: { type: "Point" | "LineString"; coordinates: number[] | number[][] };
  properties: Record<string, unknown>;
}

interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

export interface GisImportSummary {
  nodesImported: number;
  edgesImported: number;
  sourcesFound: number;
  capBanksFound: number;
}

/**
 * Translates a GIS-style GeoJSON extract (Point features = buses,
 * LineString features = line segments with a switch) into the ADMS
 * network model, mirroring the GIS -> DMS extraction/translation/load
 * step a DMS application engineer configures for a utility.
 */
export function importFromGeoJson(
  geojson: GeoJsonFeatureCollection,
  name = "Imported Feeder",
): { network: NetworkModel; summary: GisImportSummary } {
  if (geojson.type !== "FeatureCollection" || !Array.isArray(geojson.features)) {
    throw new Error("Expected a GeoJSON FeatureCollection with a features array");
  }

  const nodes: NodeDoc[] = [];
  const edges: EdgeDoc[] = [];

  for (const feature of geojson.features) {
    if (feature.geometry.type === "Point") {
      const [lng, lat] = feature.geometry.coordinates as number[];
      const p = feature.properties;
      if (!p.id) throw new Error("Point feature missing required property 'id'");
      const node: NodeDoc = {
        id: String(p.id),
        label: String(p.label ?? p.id),
        lat: typeof lat === "number" ? lat : 0,
        lng: typeof lng === "number" ? lng : 0,
        isSource: Boolean(p.isSource),
        sourceVpu: typeof p.sourceVpu === "number" ? p.sourceVpu : p.isSource ? 1.0 : undefined,
        loadP: typeof p.loadP === "number" ? p.loadP : 0,
        loadQ: typeof p.loadQ === "number" ? p.loadQ : 0,
      };
      if (p.capBankId) {
        node.capBank = {
          id: String(p.capBankId),
          qInjection: typeof p.capQInjection === "number" ? p.capQInjection : 0.03,
          status: "off",
        };
      }
      nodes.push(node);
    } else if (feature.geometry.type === "LineString") {
      const p = feature.properties;
      if (!p.id || !p.from || !p.to) {
        throw new Error("LineString feature missing required properties 'id', 'from', 'to'");
      }
      const normallyOpen = Boolean(p.normallyOpen);
      edges.push({
        id: String(p.id),
        from: String(p.from),
        to: String(p.to),
        r: typeof p.r === "number" ? p.r : 0.02,
        x: typeof p.x === "number" ? p.x : 0.04,
        switch: {
          id: String(p.switchId ?? `${p.id}-SW`),
          normallyOpen,
          status: normallyOpen ? "open" : "closed",
          isBreaker: Boolean(p.isBreaker),
        },
      });
    }
  }

  if (!nodes.length || !edges.length) {
    throw new Error("Import produced no nodes or no edges; check the GeoJSON feature properties");
  }

  const network: NetworkModel = {
    id: "default",
    name,
    nodes,
    edges,
    updatedAt: new Date().toISOString(),
  };

  return {
    network,
    summary: {
      nodesImported: nodes.length,
      edgesImported: edges.length,
      sourcesFound: nodes.filter((n) => n.isSource).length,
      capBanksFound: nodes.filter((n) => n.capBank).length,
    },
  };
}

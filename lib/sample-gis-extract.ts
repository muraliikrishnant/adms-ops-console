// A small alternate feeder, shaped like a GIS extract (GeoJSON), used to
// demonstrate the "extract, translate, and load" workflow in the Network
// page's GIS import panel.
export const sampleGisExtract = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", geometry: { type: "Point", coordinates: [-93.5, 44.98] }, properties: { id: "SUB-A", label: "Substation A", isSource: true, sourceVpu: 1.0 } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-93.49, 44.975] }, properties: { id: "B1", label: "B1 - Junction" } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-93.48, 44.97] }, properties: { id: "B2", label: "B2 - Residential", loadP: 0.05, loadQ: 0.025 } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-93.47, 44.965] }, properties: { id: "B3", label: "B3 - Commercial", loadP: 0.07, loadQ: 0.035, capBankId: "CAP-C", capQInjection: 0.03 } },
    { type: "Feature", geometry: { type: "LineString", coordinates: [[-93.5, 44.98], [-93.49, 44.975]] }, properties: { id: "LA1", from: "SUB-A", to: "B1", r: 0.013, x: 0.026, switchId: "CB-A", isBreaker: true } },
    { type: "Feature", geometry: { type: "LineString", coordinates: [[-93.49, 44.975], [-93.48, 44.97]] }, properties: { id: "LA2", from: "B1", to: "B2", r: 0.017, x: 0.034, switchId: "SA2" } },
    { type: "Feature", geometry: { type: "LineString", coordinates: [[-93.48, 44.97], [-93.47, 44.965]] }, properties: { id: "LA3", from: "B2", to: "B3", r: 0.019, x: 0.038, switchId: "SA3" } },
  ],
};

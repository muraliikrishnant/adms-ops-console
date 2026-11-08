import type { NetworkModel } from "./types";

// Sample radial feeder, inspired by the kind of simplified single-line model
// an ADMS builds after extracting a GIS network: two substation sources,
// a main trunk with two laterals, two capacitor banks, and a normally-open
// tie switch between feeders used to demonstrate FLISR restoration.
export function defaultNetwork(): NetworkModel {
  return {
    id: "default",
    name: "Sample Feeder 12.47kV",
    updatedAt: new Date().toISOString(),
    nodes: [
      { id: "SUB1", label: "Substation 1 (Breaker CB1)", lat: 44.95, lng: -93.4, isSource: true, sourceVpu: 1.0, loadP: 0, loadQ: 0 },
      { id: "SUB2", label: "Substation 2 (Breaker CB2)", lat: 44.9, lng: -93.25, isSource: true, sourceVpu: 1.0, loadP: 0, loadQ: 0 },
      { id: "N1", label: "N1 - Trunk Junction", lat: 44.945, lng: -93.39, isSource: false, loadP: 0, loadQ: 0 },
      { id: "N2", label: "N2 - Trunk Junction", lat: 44.94, lng: -93.38, isSource: false, loadP: 0, loadQ: 0 },
      { id: "N3", label: "N3 - Residential Load", lat: 44.935, lng: -93.37, isSource: false, loadP: 0.06, loadQ: 0.03 },
      { id: "N4", label: "N4 - Residential Load", lat: 44.93, lng: -93.36, isSource: false, loadP: 0.08, loadQ: 0.04 },
      { id: "N5", label: "N5 - Edge of Feeder (near tie)", lat: 44.925, lng: -93.35, isSource: false, loadP: 0.07, loadQ: 0.035 },
      { id: "N6", label: "N6 - Lateral Junction", lat: 44.938, lng: -93.36, isSource: false, loadP: 0, loadQ: 0 },
      { id: "N7", label: "N7 - Commercial Load", lat: 44.935, lng: -93.34, isSource: false, loadP: 0.05, loadQ: 0.025, capBank: { id: "CAP-A", qInjection: 0.03, status: "off" } },
      { id: "N8", label: "N8 - Industrial Load", lat: 44.95, lng: -93.37, isSource: false, loadP: 0.09, loadQ: 0.045, capBank: { id: "CAP-B", qInjection: 0.04, status: "off" } },
      { id: "N9", label: "N9 - Feeder 2 Load", lat: 44.9, lng: -93.3, isSource: false, loadP: 0.06, loadQ: 0.03 },
    ],
    edges: [
      { id: "L1", from: "SUB1", to: "N1", r: 0.012, x: 0.024, switch: { id: "CB1", normallyOpen: false, status: "closed", isBreaker: true } },
      { id: "L2", from: "N1", to: "N2", r: 0.015, x: 0.03, switch: { id: "S2", normallyOpen: false, status: "closed", isBreaker: false } },
      { id: "L3", from: "N2", to: "N3", r: 0.02, x: 0.04, switch: { id: "S3", normallyOpen: false, status: "closed", isBreaker: false } },
      { id: "L4", from: "N3", to: "N4", r: 0.018, x: 0.036, switch: { id: "S4", normallyOpen: false, status: "closed", isBreaker: false } },
      { id: "L5", from: "N4", to: "N5", r: 0.022, x: 0.044, switch: { id: "S5", normallyOpen: false, status: "closed", isBreaker: false } },
      { id: "L6", from: "N2", to: "N6", r: 0.025, x: 0.05, switch: { id: "S6", normallyOpen: false, status: "closed", isBreaker: false } },
      { id: "L7", from: "N6", to: "N7", r: 0.02, x: 0.04, switch: { id: "S7", normallyOpen: false, status: "closed", isBreaker: false } },
      { id: "L8", from: "N1", to: "N8", r: 0.03, x: 0.06, switch: { id: "S8", normallyOpen: false, status: "closed", isBreaker: false } },
      { id: "L9", from: "SUB2", to: "N9", r: 0.014, x: 0.028, switch: { id: "CB2", normallyOpen: false, status: "closed", isBreaker: true } },
      { id: "L-TIE", from: "N5", to: "N9", r: 0.01, x: 0.02, switch: { id: "TS1", normallyOpen: true, status: "open", isBreaker: false } },
    ],
  };
}

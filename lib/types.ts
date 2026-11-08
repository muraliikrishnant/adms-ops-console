// Simplified per-unit distribution network model.
// Mirrors the kind of model an ADMS loads after GIS extraction/translation:
// sources (substation breakers), nodes (buses with load/cap bank), and
// edges (line segments, each carrying a switch for sectionalizing/FLISR).

export type SwitchStatus = "open" | "closed";

export interface SwitchDoc {
  id: string;
  normallyOpen: boolean;
  status: SwitchStatus;
  isBreaker: boolean;
  faulted?: boolean;
}

export interface CapBankDoc {
  id: string;
  qInjection: number; // pu reactive support when switched on
  status: "on" | "off";
}

export interface NodeDoc {
  id: string;
  label: string;
  lat: number;
  lng: number;
  isSource: boolean;
  sourceVpu?: number; // fixed voltage magnitude (pu) if isSource
  loadP: number; // pu
  loadQ: number; // pu
  capBank?: CapBankDoc;
}

export interface EdgeDoc {
  id: string;
  from: string;
  to: string;
  r: number; // pu resistance
  x: number; // pu reactance
  switch: SwitchDoc;
}

export interface NetworkModel {
  id: string;
  name: string;
  nodes: NodeDoc[];
  edges: EdgeDoc[];
  updatedAt: string;
}

export interface NodeResult {
  nodeId: string;
  vpu: number;
  status: "energized" | "de-energized";
  sourceId: string | null;
  violation: boolean;
}

export interface BranchResult {
  edgeId: string;
  flowP: number;
  flowQ: number;
  lossP: number;
}

export interface DpfResult {
  nodeResults: NodeResult[];
  branchResults: BranchResult[];
  totalLossP: number;
  minVpu: number;
  maxVpu: number;
  violations: string[];
  deenergized: string[];
}

export interface FlisrResult {
  faultedEdgeId: string;
  steps: string[];
  switchActions: { switchId: string; action: SwitchStatus; reason: string }[];
  dpfBefore: DpfResult;
  dpfAfter: DpfResult;
  network: NetworkModel;
}

export interface VvoResult {
  actions: { capBankId: string; action: "on" | "off"; reason: string }[];
  steps: string[];
  dpfBefore: DpfResult;
  dpfAfter: DpfResult;
  network: NetworkModel;
}

export interface TestLogEntry {
  _id?: string;
  title: string;
  scenarioType: "DPF" | "FLISR" | "VVO" | "GIS_IMPORT" | "OTHER";
  passFail: "pass" | "fail" | "n/a";
  notes: string;
  createdAt: string;
}

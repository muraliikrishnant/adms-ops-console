import type { BranchResult, DpfResult, NetworkModel, NodeDoc, NodeResult } from "./types";

const V_MIN = 0.95;
const V_MAX = 1.05;

interface AdjEntry {
  edgeId: string;
  neighborId: string;
  r: number;
  x: number;
}

function buildAdjacency(network: NetworkModel) {
  const adj = new Map<string, AdjEntry[]>();
  for (const node of network.nodes) adj.set(node.id, []);
  for (const edge of network.edges) {
    if (edge.switch.status !== "closed") continue;
    adj.get(edge.from)?.push({ edgeId: edge.id, neighborId: edge.to, r: edge.r, x: edge.x });
    adj.get(edge.to)?.push({ edgeId: edge.id, neighborId: edge.from, r: edge.r, x: edge.x });
  }
  return adj;
}

function nodeNetQ(node: NodeDoc): number {
  const capOffset = node.capBank?.status === "on" ? node.capBank.qInjection : 0;
  return node.loadQ - capOffset;
}

/**
 * Simplified radial Distribution Power Flow using the LinDistFlow
 * (Baran & Wu) linearized branch-flow model: for a closed-switch spanning
 * forest rooted at each energized source, cumulative downstream P/Q is
 * summed post-order, then voltage magnitude is propagated pre-order via
 * V_child^2 = V_parent^2 - 2*(r*P + x*Q).
 */
export function computeDpf(network: NetworkModel): DpfResult {
  const nodesById = new Map(network.nodes.map((n) => [n.id, n]));
  const adj = buildAdjacency(network);
  const sources = network.nodes.filter((n) => n.isSource);

  const parent = new Map<string, { nodeId: string; edgeId: string } | null>();
  const sourceOf = new Map<string, string>();
  const order: string[] = []; // BFS visit order (pre-order-ish, good enough for a tree)
  const visited = new Set<string>();

  for (const source of sources) {
    if (visited.has(source.id)) continue;
    const queue: string[] = [source.id];
    visited.add(source.id);
    parent.set(source.id, null);
    sourceOf.set(source.id, source.id);
    while (queue.length) {
      const cur = queue.shift()!;
      order.push(cur);
      for (const edge of adj.get(cur) ?? []) {
        if (visited.has(edge.neighborId)) continue;
        visited.add(edge.neighborId);
        parent.set(edge.neighborId, { nodeId: cur, edgeId: edge.edgeId });
        sourceOf.set(edge.neighborId, source.id);
        queue.push(edge.neighborId);
      }
    }
  }

  // Post-order cumulative P/Q per node (sum of own load + all descendants).
  const cumP = new Map<string, number>();
  const cumQ = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const nodeId of order) children.set(nodeId, []);
  for (const [nodeId, p] of parent) {
    if (p) children.get(p.nodeId)?.push(nodeId);
  }
  for (let i = order.length - 1; i >= 0; i--) {
    const nodeId = order[i];
    const node = nodesById.get(nodeId)!;
    let p = node.isSource ? 0 : node.loadP;
    let q = node.isSource ? 0 : nodeNetQ(node);
    for (const childId of children.get(nodeId) ?? []) {
      p += cumP.get(childId) ?? 0;
      q += cumQ.get(childId) ?? 0;
    }
    cumP.set(nodeId, p);
    cumQ.set(nodeId, q);
  }

  // Pre-order voltage propagation.
  const vSq = new Map<string, number>();
  for (const source of sources) {
    if (sourceOf.get(source.id) !== source.id) continue;
    vSq.set(source.id, (source.sourceVpu ?? 1) ** 2);
  }
  const branchResults: BranchResult[] = [];
  let totalLossP = 0;
  for (const nodeId of order) {
    const p = parent.get(nodeId);
    if (!p) continue; // source root, already set
    const edge = network.edges.find((e) => e.id === p.edgeId)!;
    const vParentSq = vSq.get(p.nodeId) ?? 1;
    const flowP = cumP.get(nodeId) ?? 0;
    const flowQ = cumQ.get(nodeId) ?? 0;
    const vChildSq = Math.max(0, vParentSq - 2 * (edge.r * flowP + edge.x * flowQ));
    vSq.set(nodeId, vChildSq);
    const lossP = vParentSq > 0 ? (edge.r * (flowP ** 2 + flowQ ** 2)) / vParentSq : 0;
    totalLossP += lossP;
    branchResults.push({ edgeId: edge.id, flowP, flowQ, lossP });
  }

  const nodeResults: NodeResult[] = network.nodes.map((node) => {
    const energized = visited.has(node.id);
    const vpu = energized ? Math.sqrt(vSq.get(node.id) ?? 0) : 0;
    const violation = energized && (vpu < V_MIN || vpu > V_MAX);
    return {
      nodeId: node.id,
      vpu: Math.round(vpu * 10000) / 10000,
      status: energized ? "energized" : "de-energized",
      sourceId: energized ? sourceOf.get(node.id) ?? null : null,
      violation,
    };
  });

  const energizedResults = nodeResults.filter((n) => n.status === "energized");
  const minVpu = energizedResults.length ? Math.min(...energizedResults.map((n) => n.vpu)) : 0;
  const maxVpu = energizedResults.length ? Math.max(...energizedResults.map((n) => n.vpu)) : 0;

  return {
    nodeResults,
    branchResults,
    totalLossP: Math.round(totalLossP * 100000) / 100000,
    minVpu,
    maxVpu,
    violations: nodeResults.filter((n) => n.violation).map((n) => n.nodeId),
    deenergized: nodeResults.filter((n) => n.status === "de-energized").map((n) => n.nodeId),
  };
}

export const VOLTAGE_LIMITS = { min: V_MIN, max: V_MAX };

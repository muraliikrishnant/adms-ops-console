import { computeDpf } from "./powerflow";
import type { FlisrResult, NetworkModel } from "./types";

function cloneNetwork(network: NetworkModel): NetworkModel {
  return JSON.parse(JSON.stringify(network));
}

function findPathToEdge(network: NetworkModel, edgeId: string): string[] {
  // Returns the sequence of switch IDs from the nearest source breaker
  // down to (and including) the faulted edge's own switch.
  const targetEdge = network.edges.find((e) => e.id === edgeId)!;
  const adjacency = new Map<string, { edgeId: string; neighborId: string }[]>();
  for (const n of network.nodes) adjacency.set(n.id, []);
  for (const e of network.edges) {
    adjacency.get(e.from)?.push({ edgeId: e.id, neighborId: e.to });
    adjacency.get(e.to)?.push({ edgeId: e.id, neighborId: e.from });
  }
  const sources = network.nodes.filter((n) => n.isSource).map((n) => n.id);
  for (const sourceId of sources) {
    const queue: { nodeId: string; path: string[] }[] = [{ nodeId: sourceId, path: [] }];
    const visited = new Set([sourceId]);
    while (queue.length) {
      const { nodeId, path } = queue.shift()!;
      if (nodeId === targetEdge.from || nodeId === targetEdge.to) {
        if (path.length === 0 || path[path.length - 1] !== edgeId) {
          return [...path, edgeId];
        }
        return path;
      }
      for (const { edgeId: eId, neighborId } of adjacency.get(nodeId) ?? []) {
        if (visited.has(neighborId)) continue;
        const edge = network.edges.find((e) => e.id === eId)!;
        if (edge.switch.normallyOpen) continue; // don't route the search through the tie
        visited.add(neighborId);
        queue.push({ nodeId: neighborId, path: [...path, eId] });
      }
    }
  }
  return [edgeId];
}

/**
 * Simplified Fault Location, Isolation & Service Restoration (FLISR).
 * 1. Protection trips the nearest upstream breaker (feeder-wide outage).
 * 2. The faulted segment's own switch opens, isolating just that section.
 * 3. The upstream breaker recloses, restoring everything above the fault.
 * 4. Any orphaned downstream section is restored via a normally-open tie
 *    switch to an alternate energized source, if one exists.
 */
export function runFlisr(network: NetworkModel, faultedEdgeId: string): FlisrResult {
  const dpfBefore = computeDpf(network);
  const working = cloneNetwork(network);
  const steps: string[] = [];
  const switchActions: FlisrResult["switchActions"] = [];

  const faultedEdge = working.edges.find((e) => e.id === faultedEdgeId);
  if (!faultedEdge) {
    throw new Error(`Edge ${faultedEdgeId} not found`);
  }
  faultedEdge.switch.faulted = true;

  const pathEdgeIds = findPathToEdge(working, faultedEdgeId);
  const breakerEdgeId = pathEdgeIds.find((id) => working.edges.find((e) => e.id === id)?.switch.isBreaker);
  const breakerEdge = breakerEdgeId ? working.edges.find((e) => e.id === breakerEdgeId) : undefined;

  if (breakerEdge) {
    breakerEdge.switch.status = "open";
    switchActions.push({ switchId: breakerEdge.switch.id, action: "open", reason: "Protection trip clears the fault feeder-wide" });
    steps.push(`Protection trips breaker ${breakerEdge.switch.id}, de-energizing the feeder to clear fault on ${faultedEdgeId}.`);
  } else {
    steps.push(`No upstream breaker found for ${faultedEdgeId}; treating fault as already cleared locally.`);
  }

  faultedEdge.switch.status = "open";
  switchActions.push({ switchId: faultedEdge.switch.id, action: "open", reason: `Isolate faulted segment ${faultedEdgeId}` });
  steps.push(`Sectionalizing switch ${faultedEdge.switch.id} opens, isolating the faulted segment ${faultedEdgeId}.`);

  if (breakerEdge) {
    breakerEdge.switch.status = "closed";
    switchActions.push({ switchId: breakerEdge.switch.id, action: "closed", reason: "Restore upstream (unfaulted) section" });
    steps.push(`Breaker ${breakerEdge.switch.id} recloses, restoring service upstream of the fault.`);
  }

  const afterIsolationDpf = computeDpf(working);
  const orphanIds = afterIsolationDpf.deenergized.filter((id) => {
    const node = working.nodes.find((n) => n.id === id);
    return node && !node.isSource;
  });

  if (orphanIds.length) {
    const tieEdge = working.edges.find(
      (e) => e.switch.normallyOpen && (orphanIds.includes(e.from) || orphanIds.includes(e.to)),
    );
    if (tieEdge) {
      tieEdge.switch.status = "closed";
      switchActions.push({ switchId: tieEdge.switch.id, action: "closed", reason: "Restore downstream section from alternate source via tie" });
      steps.push(`Tie switch ${tieEdge.switch.id} closes on ${tieEdge.id}, restoring the downstream section from an alternate source.`);
    } else {
      steps.push(`No tie switch available to restore de-energized nodes: ${orphanIds.join(", ")}.`);
    }
  } else {
    steps.push("No downstream section was left de-energized; isolation only affected the faulted segment.");
  }

  const dpfAfter = computeDpf(working);
  if (dpfAfter.violations.length) {
    steps.push(`Voltage violations remain after restoration at: ${dpfAfter.violations.join(", ")}.`);
  } else {
    steps.push("All restored nodes are within the 0.95-1.05 pu voltage band.");
  }

  working.updatedAt = new Date().toISOString();
  return { faultedEdgeId, steps, switchActions, dpfBefore, dpfAfter, network: working };
}

import { computeDpf, VOLTAGE_LIMITS } from "./powerflow";
import type { NetworkModel, VvoResult } from "./types";

function cloneNetwork(network: NetworkModel): NetworkModel {
  return JSON.parse(JSON.stringify(network));
}

/**
 * Simplified Volt/VAR Control & Optimization (VVC/VVO).
 * Greedily switches in capacitor banks, most-depressed-voltage-first, to
 * bring energized nodes back within the ANSI-style 0.95-1.05 pu band.
 * Each candidate switching action is validated by re-running the DPF
 * before being kept (if it doesn't help, it's reverted).
 */
export function runVvo(network: NetworkModel): VvoResult {
  const dpfBefore = computeDpf(network);
  const working = cloneNetwork(network);
  const steps: string[] = [];
  const actions: VvoResult["actions"] = [];

  let guard = 0;
  while (guard++ < 10) {
    const dpf = computeDpf(working);
    const undervoltage = dpf.nodeResults
      .filter((n) => n.status === "energized" && n.vpu < VOLTAGE_LIMITS.min)
      .sort((a, b) => a.vpu - b.vpu);

    if (!undervoltage.length) {
      steps.push(guard === 1 ? "No undervoltage violations detected; no capacitor switching needed." : "All violations resolved.");
      break;
    }

    const availableBank = working.nodes.find(
      (n) => n.capBank && n.capBank.status === "off",
    );
    if (!availableBank?.capBank) {
      steps.push(`Undervoltage remains at ${undervoltage.map((n) => n.nodeId).join(", ")}, but no more capacitor banks are available.`);
      break;
    }

    availableBank.capBank.status = "on";
    const trialDpf = computeDpf(working);
    const worstBefore = Math.min(...undervoltage.map((n) => n.vpu));
    const worstAfter = Math.min(
      ...trialDpf.nodeResults.filter((n) => n.status === "energized").map((n) => n.vpu),
    );

    if (worstAfter > worstBefore) {
      actions.push({ capBankId: availableBank.capBank.id, action: "on", reason: `Boost voltage support near ${availableBank.id}` });
      steps.push(`Switched in capacitor bank ${availableBank.capBank.id} at ${availableBank.id}; minimum voltage improved from ${worstBefore.toFixed(4)} to ${worstAfter.toFixed(4)} pu.`);
    } else {
      availableBank.capBank.status = "off";
      steps.push(`Capacitor bank ${availableBank.capBank.id} at ${availableBank.id} gave no improvement; left off.`);
      break;
    }
  }

  // Check for banks causing overvoltage and switch them back off.
  const finalCheck = computeDpf(working);
  const overvoltage = finalCheck.nodeResults.filter((n) => n.status === "energized" && n.vpu > VOLTAGE_LIMITS.max);
  for (const violatingNode of overvoltage) {
    const node = working.nodes.find((n) => n.id === violatingNode.nodeId);
    if (node?.capBank?.status === "on") {
      node.capBank.status = "off";
      actions.push({ capBankId: node.capBank.id, action: "off", reason: `Relieve overvoltage at ${node.id}` });
      steps.push(`Switched off capacitor bank ${node.capBank.id} at ${node.id} to relieve an overvoltage condition.`);
    }
  }

  const dpfAfter = computeDpf(working);
  working.updatedAt = new Date().toISOString();
  return { actions, steps, dpfBefore, dpfAfter, network: working };
}

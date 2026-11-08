import type { DpfResult, NetworkModel } from "@/lib/types";

const WIDTH = 760;
const HEIGHT = 420;
const PAD = 50;

function project(network: NetworkModel) {
  const lats = network.nodes.map((n) => n.lat);
  const lngs = network.nodes.map((n) => n.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 1;
  const spanLng = maxLng - minLng || 1;

  const pos = new Map<string, { x: number; y: number }>();
  for (const node of network.nodes) {
    const x = PAD + ((node.lng - minLng) / spanLng) * (WIDTH - 2 * PAD);
    const y = PAD + (1 - (node.lat - minLat) / spanLat) * (HEIGHT - 2 * PAD);
    pos.set(node.id, { x, y });
  }
  return pos;
}

export default function OneLineDiagram({ network, dpf }: { network: NetworkModel; dpf?: DpfResult }) {
  const pos = project(network);
  const vpuByNode = new Map(dpf?.nodeResults.map((r) => [r.nodeId, r]) ?? []);

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto bg-slate-950 rounded border border-slate-800">
      {network.edges.map((edge) => {
        const from = pos.get(edge.from);
        const to = pos.get(edge.to);
        if (!from || !to) return null;
        const faulted = edge.switch.faulted;
        const open = edge.switch.status === "open";
        const stroke = faulted ? "#f43f5e" : open ? "#475569" : "#38bdf8";
        const dash = open ? "6 4" : undefined;
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        return (
          <g key={edge.id}>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={stroke} strokeWidth={open ? 2 : 3} strokeDasharray={dash} />
            <circle cx={midX} cy={midY} r={5} fill={open ? "#1e293b" : "#38bdf8"} stroke="#0f172a" />
            <text x={midX} y={midY - 8} fontSize="9" fill="#94a3b8" textAnchor="middle">
              {edge.switch.id}
            </text>
          </g>
        );
      })}
      {network.nodes.map((node) => {
        const p = pos.get(node.id);
        if (!p) return null;
        const result = vpuByNode.get(node.id);
        let fill = "#64748b";
        if (result) {
          if (result.status === "de-energized") fill = "#1e293b";
          else if (result.violation) fill = "#f43f5e";
          else fill = "#10b981";
        } else if (node.isSource) {
          fill = "#fbbf24";
        }
        return (
          <g key={node.id}>
            <circle cx={p.x} cy={p.y} r={node.isSource ? 10 : 7} fill={fill} stroke="#0f172a" strokeWidth={2} />
            <text x={p.x} y={p.y + 20} fontSize="10" fill="#cbd5e1" textAnchor="middle">
              {node.id}
            </text>
            {result && (
              <text x={p.x} y={p.y - 14} fontSize="9" fill="#94a3b8" textAnchor="middle">
                {result.status === "energized" ? result.vpu.toFixed(3) : "de-energ."}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

import { useEffect, useRef, useState } from 'react';
import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';
import { select, type Selection } from 'd3-selection';
import { drag as d3Drag } from 'd3-drag';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import { RefreshCw, Loader2, X, Network } from 'lucide-react';
import type { Memory, MemoryEdge, KnowledgeGraph } from '../../types';

interface NodeDatum extends SimulationNodeDatum {
  id: string;
  label: string;
  full: Memory;
}

interface LinkDatum extends SimulationLinkDatum<NodeDatum> {
  id: string;
  relation: string;
  weight: number;
}

function truncate(text: string, max = 30): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function KnowledgeGraphView() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const simRef = useRef<Simulation<NodeDatum, LinkDatum> | null>(null);
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Memory | null>(null);

  const loadGraph = async () => {
    setLoading(true);
    setError(null);
    try {
      const g = await window.quickCowork.memory.getGraph();
      setGraph(g);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraph();
    return () => {
      simRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (!graph || !svgRef.current || !containerRef.current) return;
    if (graph.nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const svgEl = svgRef.current;
    const svg = select(svgEl) as Selection<SVGSVGElement, unknown, null, undefined>;
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const root = svg.append('g');

    const nodes: NodeDatum[] = graph.nodes.map((m) => ({
      id: m.id,
      label: truncate(m.content, 30),
      full: m,
    }));
    const idSet = new Set(nodes.map((n) => n.id));
    const links: LinkDatum[] = (graph.edges as MemoryEdge[])
      .filter((e) => idSet.has(e.sourceId) && idSet.has(e.targetId))
      .map((e) => ({
        id: e.id,
        source: e.sourceId,
        target: e.targetId,
        relation: e.relation,
        weight: e.weight,
      }));

    const linkGroup = root.append('g').attr('stroke', '#52525b').attr('stroke-opacity', 0.7);
    const linkSel = linkGroup
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', (d) => Math.max(1, Math.min(3, d.weight)));

    const linkLabelGroup = root.append('g');
    const linkLabelSel = linkLabelGroup
      .selectAll('text')
      .data(links)
      .join('text')
      .text((d) => d.relation)
      .attr('font-size', 9)
      .attr('fill', '#a1a1aa')
      .attr('text-anchor', 'middle')
      .attr('pointer-events', 'none');

    const nodeGroup = root.append('g');
    const nodeSel = nodeGroup
      .selectAll<SVGGElement, NodeDatum>('g')
      .data(nodes, (d) => d.id)
      .join('g')
      .attr('cursor', 'grab')
      .on('click', (_event, d) => setSelected(d.full));

    nodeSel
      .append('circle')
      .attr('r', 16)
      .attr('fill', '#3b82f6')
      .attr('stroke', '#1e3a8a')
      .attr('stroke-width', 1.5);

    nodeSel
      .append('text')
      .text((d) => d.label)
      .attr('font-size', 10)
      .attr('fill', '#d4d4d8')
      .attr('text-anchor', 'middle')
      .attr('y', 30)
      .attr('pointer-events', 'none');

    const sim = forceSimulation<NodeDatum>(nodes)
      .force(
        'link',
        forceLink<NodeDatum, LinkDatum>(links)
          .id((d) => d.id)
          .distance(120)
          .strength(0.4),
      )
      .force('charge', forceManyBody<NodeDatum>().strength(-300))
      .force('center', forceCenter(width / 2, height / 2))
      .on('tick', () => {
        linkSel
          .attr('x1', (d) => (d.source as NodeDatum).x ?? 0)
          .attr('y1', (d) => (d.source as NodeDatum).y ?? 0)
          .attr('x2', (d) => (d.target as NodeDatum).x ?? 0)
          .attr('y2', (d) => (d.target as NodeDatum).y ?? 0);
        linkLabelSel
          .attr(
            'x',
            (d) =>
              (((d.source as NodeDatum).x ?? 0) + ((d.target as NodeDatum).x ?? 0)) / 2,
          )
          .attr(
            'y',
            (d) =>
              (((d.source as NodeDatum).y ?? 0) + ((d.target as NodeDatum).y ?? 0)) / 2,
          );
        nodeSel.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

    simRef.current = sim;

    const dragBehavior = d3Drag<SVGGElement, NodeDatum>()
      .on('start', (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
    nodeSel.call(dragBehavior);

    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        root.attr('transform', event.transform.toString());
      });
    svg.call(zoomBehavior);
    svg.call(zoomBehavior.transform, zoomIdentity);

    return () => {
      sim.stop();
    };
  }, [graph]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-zinc-900">
      <button
        onClick={loadGraph}
        data-testid="graph-refresh-button"
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <RefreshCw size={14} />
        )}
        Refresh
      </button>

      {error && (
        <div className="absolute top-3 left-3 z-10 px-3 py-2 text-sm bg-red-900/60 border border-red-800 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {!loading && graph && graph.nodes.length === 0 ? (
        <div
          data-testid="graph-empty-state"
          className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500"
        >
          <Network size={32} className="mb-2 opacity-50" />
          <p className="text-sm">No graph nodes yet</p>
          <p className="text-xs mt-1">Add memories to build the knowledge graph</p>
        </div>
      ) : (
        <svg
          ref={svgRef}
          data-testid="memory-graph-svg"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        />
      )}

      {selected && (
        <div className="absolute top-3 right-32 z-10 w-[320px] max-w-[60vw] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-100">Memory</h3>
            <button
              onClick={() => setSelected(null)}
              className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            >
              <X size={14} />
            </button>
          </div>
          <div className="px-4 py-3 max-h-[60vh] overflow-y-auto">
            <p className="text-sm text-zinc-100 whitespace-pre-wrap break-words">
              {selected.content}
            </p>
            {selected.metadata && Object.keys(selected.metadata).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {Object.entries(selected.metadata).map(([k, v]) => (
                  <span
                    key={k}
                    className="px-2 py-0.5 text-[10px] rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700"
                  >
                    {k}: {String(v).slice(0, 30)}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-zinc-500 mt-3">
              Created {new Date(selected.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

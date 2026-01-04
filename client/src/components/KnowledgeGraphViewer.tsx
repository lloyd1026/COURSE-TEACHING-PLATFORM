
import React, { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    MarkerType,
    Position,
    Background,
    Controls,
    MiniMap,
    Node,
    Handle,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { BookOpen, Map, GraduationCap } from 'lucide-react';

// --- Custom Node Types ---

const CourseNode = ({ data }: any) => {
    return (
        <div className="px-4 py-3 shadow-lg rounded-xl bg-blue-50 border-2 border-blue-500 min-w-[150px] text-center">
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
            <div className="flex flex-col items-center gap-2">
                <BookOpen className="h-6 w-6 text-blue-600" />
                <div className="font-bold text-blue-900">{data.label}</div>
            </div>
        </div>
    );
};

const ChapterNode = ({ data }: any) => {
    return (
        <div className="px-3 py-2 shadow-md rounded-lg bg-green-50 border border-green-400 min-w-[120px] text-center">
            <Handle type="target" position={Position.Top} className="w-2 h-2 bg-green-400" />
            <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-green-400" />
            <div className="flex flex-col items-center gap-1">
                <Map className="h-4 w-4 text-green-600" />
                <div className="font-semibold text-green-900 text-sm">{data.label}</div>
            </div>
        </div>
    );
};

const KPNode = ({ data }: any) => {
    return (
        <div className="px-3 py-2 shadow-sm rounded-md bg-white border border-purple-300 min-w-[100px] text-center hover:border-purple-500 transition-colors cursor-pointer">
            <Handle type="target" position={Position.Top} className="w-2 h-2 bg-purple-300" />
            <div className="flex flex-col items-center gap-1">
                <GraduationCap className="h-4 w-4 text-purple-600" />
                <div className="text-gray-800 text-xs">{data.label}</div>
            </div>
        </div>
    );
};

const nodeTypes = {
    course: CourseNode,
    chapter: ChapterNode,
    kp: KPNode,
};

// --- Layout Logic ---

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction, ranksep: 80, nodesep: 50 });

    nodes.forEach((node) => {
        // 估算宽高，因为 dagre 需要尺寸来计算布局
        // 可以做得更精确，这里用近似值
        const width = node.type === 'course' ? 180 : node.type === 'chapter' ? 150 : 120;
        const height = node.type === 'course' ? 80 : 60;
        dagreGraph.setNode(node.id, { width, height });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const newNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = isHorizontal ? Position.Left : Position.Top;
        node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

        // Shift 'node' slightly so the center matches dagre's position
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - (nodeWithPosition.width / 2),
                y: nodeWithPosition.y - (nodeWithPosition.height / 2),
            },
        };
    });

    return { nodes: newNodes, edges };
};

// --- Main Component ---

interface KnowledgeGraphViewerProps {
    courseName?: string;
    chapters: any[];
    knowledgePoints: any[];
    onNodeClick?: (event: React.MouseEvent, node: Node) => void;
    loading?: boolean;
}

export default function KnowledgeGraphViewer({
    courseName = "课程根节点",
    chapters = [],
    knowledgePoints = [],
    onNodeClick,
    loading = false,
}: KnowledgeGraphViewerProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Data to Graph Transformation
    useEffect(() => {
        if (loading) return;

        const initialNodes: Node[] = [];
        const initialEdges: Edge[] = [];

        // 1. Root Course Node
        initialNodes.push({
            id: 'root-course',
            type: 'course',
            data: { label: courseName },
            position: { x: 0, y: 0 },
        });

        // 2. Chapter Nodes
        chapters.forEach((chapter) => {
            const chapterNodeId = `chapter-${chapter.id}`;
            initialNodes.push({
                id: chapterNodeId,
                type: 'chapter',
                data: { label: chapter.title, original: chapter },
                position: { x: 0, y: 0 }, // Position calculated later
            });
            initialEdges.push({
                id: `e-root-${chapterNodeId}`,
                source: 'root-course',
                target: chapterNodeId,
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
                style: { stroke: '#94a3b8', strokeWidth: 2 }
            });
        });

        // 3. Knowledge Point Nodes
        knowledgePoints.forEach((kp) => {
            if (!kp.chapterId) return; // Ignore KPs without chapter for now

            const kpNodeId = `kp-${kp.id}`;
            const chapterNodeId = `chapter-${kp.chapterId}`;

            initialNodes.push({
                id: kpNodeId,
                type: 'kp',
                data: { label: kp.name, original: kp },
                position: { x: 0, y: 0 },
            });

            initialEdges.push({
                id: `e-${chapterNodeId}-${kpNodeId}`,
                source: chapterNodeId,
                target: kpNodeId,
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed, color: '#e2e8f0' },
                style: { stroke: '#e2e8f0' }
            });
        });

        // 4. Compute Layout
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            initialNodes,
            initialEdges
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

    }, [courseName, chapters, knowledgePoints, loading, setNodes, setEdges]);

    // Handle auto layout refresh
    const onLayout = useCallback(() => {
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            nodes,
            edges
        );
        setNodes([...layoutedNodes]);
        setEdges([...layoutedEdges]);
    }, [nodes, edges, setNodes, setEdges]);

    return (
        <div className="w-full h-full min-h-[600px] bg-slate-50 rounded-xl overflow-hidden border">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                onNodeClick={onNodeClick}
                fitView
                attributionPosition="bottom-right"
                defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
            >
                <Controls />
                <MiniMap nodeStrokeColor={(n) => {
                    if (n.type === 'course') return '#3b82f6';
                    if (n.type === 'chapter') return '#22c55e';
                    if (n.type === 'kp') return '#a855f7';
                    return '#eee';
                }} />
                <Background gap={12} size={1} />
            </ReactFlow>
        </div>
    );
}

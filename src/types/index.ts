export type KeywordItem = {
  keyword: string;
  url: string;
  description: string;
};

export type GraphNode = {
  id: string;
  keyword: string;
  category: string;
  nodeType: string;
  nodeColor: string;
  nodeIconSize: number;
  icon: string;
  iconColor: string;
  textClass: string;
  visible: boolean;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
};

export type GraphLink = {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
  thickness: number;
  linkText: string;
  distance: number;
};

export type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};
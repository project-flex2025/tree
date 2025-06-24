export interface NodeData {
  id: string;
  keyword: string;
  category: string;
  nodeType: string;
  nodeColor: string;
  icon: string;
  iconColor: string;
  nodeIconSize: number;
  textClass: string;
  visible?: boolean;
}

export interface LinkData {
  source: string | { id: string };
  target: string | { id: string };
  value: number;
  thickness: number;
  distance: number;
  linkText: string;
}
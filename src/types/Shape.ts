// types/Shape.ts

export interface Shape {
  type: "text" | "container" | "input" | "button" | "sidebar" | "sidebarItem" | "sidebarToggle";
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  text: string;
  fontSize: number;
  group: string;
  targetScreen: string;
}

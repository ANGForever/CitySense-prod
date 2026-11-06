import type { Metadata } from "next";
import "./snow.css";

export const metadata: Metadata = {
  title: "青唐冰雪烩 · 园区地图"
};

export default function SnowLayout({ children }: { children: React.ReactNode }) {
  return children;
}

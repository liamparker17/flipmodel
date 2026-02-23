import type { CSSProperties, ReactNode } from "react";

export declare const theme: {
  bg: string;
  card: string;
  cardBorder: string;
  accent: string;
  accentDim: string;
  green: string;
  red: string;
  orange: string;
  text: string;
  textDim: string;
  input: string;
  inputBorder: string;
};

export declare const styles: {
  card: CSSProperties;
  cardMb: CSSProperties;
  sectionHeading: CSSProperties;
  flexBetween: CSSProperties;
  flexCenter: CSSProperties;
  mono: CSSProperties;
  linkBtn: CSSProperties;
};

export declare function fmt(n: number | undefined | null): string;
export declare function pct(n: number): string;
export declare function calcTransferDuty(price: number): number;

export declare function Toast(props: { message: string; visible: boolean }): ReactNode;
export declare function Accordion(props: { title: string; defaultOpen?: boolean; children: ReactNode }): ReactNode;
export declare function Tooltip(props: { text: string }): ReactNode;
export declare function NumInput(props: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  width?: string;
  small?: boolean;
  tooltip?: string;
  isMobile?: boolean;
}): ReactNode;
export declare function Toggle(props: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  tooltip?: string;
}): ReactNode;
export declare function Select(props: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  tooltip?: string;
}): ReactNode;
export declare function Card(props: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  style?: CSSProperties;
}): ReactNode;
export declare function MetricBox(props: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  isMobile?: boolean;
}): ReactNode;
export declare function BarChart(props: {
  data: { label: string; value: number }[];
  maxVal?: number;
  isMobile?: boolean;
}): ReactNode;
export declare function SectionDivider(props: { label: string }): ReactNode;
export declare function CTAButton(props: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  style?: CSSProperties;
  isMobile?: boolean;
}): ReactNode;
export declare function SliderInput(props: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  tooltip?: string;
}): ReactNode;

export declare const MobileProvider: (props: { children: ReactNode }) => ReactNode;
export declare function useIsMobile(): boolean;

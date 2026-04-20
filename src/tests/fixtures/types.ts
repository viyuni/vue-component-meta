export interface CommonProps {
  disabled?: boolean;
  loading?: boolean;
  readonly: boolean;
  size?: "sm" | "md" | "lg";
  config: {
    label: string;
    nested: {
      count: number;
    };
  };
  options?: Array<"sm" | "md">;
  tuple: [string, number, boolean];
  true: true;
}

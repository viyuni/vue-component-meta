export interface Options {
  name: string;
  title: string;
}

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
  options?: Options;
  tuple: [string, number, boolean];
  true: true;
}

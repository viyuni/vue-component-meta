export interface Options {
  name: string;
  title: string;
}

export interface CommonProps {
  disabled?: boolean;
  expandedBoolean: true | false;
  loading?: boolean;
  maybeLabel: string | null;
  maybeName: string | undefined;
  nil: null;
  readonly: boolean;
  size?: "sm" | "md" | "lg";
  undef: undefined;
  variant: "solid";
  config: {
    label: string;
    nested: {
      count: number;
    };
  };
  retryCount: 3;
  options?: Options;
  tuple: [string, number, boolean];
  true: true;
  false: false;
}

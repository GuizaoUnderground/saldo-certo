// Tipos mínimos de React para checagem local (sem @types/react disponível)
declare namespace React {
  type ReactNode = ReactElement | string | number | boolean | null | undefined | ReactNode[];
  interface ReactElement { type: any; props: any; key: any }
  type FC<P = {}> = (props: P) => ReactElement | null;
  type Dispatch<A> = (value: A) => void;
  type SetStateAction<S> = S | ((prev: S) => S);
  interface Context<T> { Provider: FC<{ value: T; children?: ReactNode }> }
  function useState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  function useCallback<T extends (...args: any[]) => any>(cb: T, deps: readonly unknown[]): T;
  function useRef<T>(initial: T): { current: T };
  function createContext<T>(v: T): Context<T>;
  function useContext<T>(c: Context<T>): T;
  const Fragment: any;
  function createElement(...a: any[]): ReactElement;
}
declare module 'react' { export = React; }
declare namespace JSX {
  type Element = React.ReactElement;
  interface ElementChildrenAttribute { children: {} }
  interface IntrinsicAttributes { key?: string | number | null }
  interface IntrinsicElements { [name: string]: any }
}
declare module 'react/jsx-runtime' { export const jsx: any; export const jsxs: any; export const Fragment: any; }

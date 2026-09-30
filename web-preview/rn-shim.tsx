/**
 * Camada mínima de compatibilidade React Native -> DOM, usada apenas para
 * gerar a prévia do protótipo no navegador (e as capturas de tela do TCC).
 * No celular o aplicativo usa o React Native de verdade.
 */
import React, { createContext, useContext, useState } from 'react';

type AnyStyle = any;

const UNITLESS = new Set(['flex', 'flexGrow', 'flexShrink', 'opacity', 'zIndex', 'fontWeight', 'aspectRatio']);

export function flatten(style: AnyStyle): Record<string, any> {
  if (!style) return {};
  if (Array.isArray(style)) return style.reduce((acc, s) => Object.assign(acc, flatten(s)), {});
  return { ...style };
}

function toCss(style: AnyStyle, base: Record<string, any> = {}): React.CSSProperties {
  const s = flatten(style);
  const out: Record<string, any> = { ...base };
  const expand: Record<string, string[]> = {
    paddingHorizontal: ['paddingLeft', 'paddingRight'], paddingVertical: ['paddingTop', 'paddingBottom'],
    marginHorizontal: ['marginLeft', 'marginRight'], marginVertical: ['marginTop', 'marginBottom'],
  };
  let hasBorder = false;
  for (const [k, v] of Object.entries(s)) {
    if (v === undefined || v === null) continue;
    if (expand[k]) { for (const kk of expand[k]) out[kk] = v; continue; }
    if (/^border(Top|Bottom|Left|Right)?Width$/.test(k)) hasBorder = true;
    if (k === 'flex' && typeof v === 'number') { out.flexGrow = v; out.flexShrink = 1; out.flexBasis = '0%'; continue; }
    if (k === 'lineHeight' && typeof v === 'number') { out.lineHeight = v + 'px'; continue; }
    if (k.startsWith('shadow') || k === 'elevation') continue;
    out[k] = typeof v === 'number' && !UNITLESS.has(k) ? v + 'px' : v;
  }
  if (hasBorder) {
    out.borderStyle = 'solid';
    for (const side of ['Top', 'Bottom', 'Left', 'Right']) {
      const key = `border${side}Width`;
      if (out[key] === undefined) out[key] = out.borderWidth ?? '0px';
    }
    delete out.borderWidth;
    if (!Object.keys(out).some(k => /^border\w*Color$/.test(k))) out.borderColor = '#000';
  }
  return out;
}

const VIEW_BASE: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', position: 'relative', boxSizing: 'border-box',
  flexShrink: 0, minWidth: 0, minHeight: 0, alignItems: 'stretch',
};

function a11y(p: any) {
  const o: any = {};
  if (p.accessibilityLabel) o['aria-label'] = p.accessibilityLabel;
  if (p.accessibilityRole) o.role = p.accessibilityRole === 'header' ? 'heading' : p.accessibilityRole;
  if (p.testID) o['data-testid'] = p.testID;
  return o;
}

export function View(p: any) {
  return <div style={toCss(p.style, VIEW_BASE)} {...a11y(p)}>{p.children}</div>;
}
export const SafeAreaView = View;
export const KeyboardAvoidingView = View;

const InText = createContext(false);
export function Text(p: any) {
  const nested = useContext(InText);
  const base: React.CSSProperties = nested
    ? { display: 'inline' }
    : { display: 'block', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', margin: 0, fontFamily: 'inherit', fontSize: 14, color: '#000' };
  const clamp: React.CSSProperties = p.numberOfLines === 1 ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } : {};
  const Tag: any = nested ? 'span' : 'div';
  return (
    <InText.Provider value={true}>
      <Tag style={{ ...toCss(p.style, base), ...clamp }} {...a11y(p)} onClick={p.onPress}>{p.children}</Tag>
    </InText.Provider>
  );
}

export function Pressable(p: any) {
  const [pressed, setPressed] = useState(false);
  const style = typeof p.style === 'function' ? p.style({ pressed }) : p.style;
  return (
    <div
      style={{ ...toCss(style, VIEW_BASE), cursor: p.onPress ? 'pointer' : 'default', userSelect: 'none' }}
      {...a11y(p)} role={p.accessibilityRole === 'tab' ? 'tab' : 'button'}
      aria-selected={p.accessibilityState?.selected}
      onClick={p.onPress}
      onPointerDown={() => setPressed(true)} onPointerUp={() => setPressed(false)} onPointerLeave={() => setPressed(false)}
    >
      {typeof p.children === 'function' ? p.children({ pressed }) : p.children}
    </div>
  );
}
export const TouchableOpacity = Pressable;

export function ScrollView(p: any) {
  return (
    <div style={{ ...toCss(p.style, VIEW_BASE), flexGrow: 1, flexShrink: 1, flexBasis: '0%', overflowY: 'auto' }} className="rn-scroll">
      <div style={toCss(p.contentContainerStyle, VIEW_BASE)}>{p.children}</div>
    </div>
  );
}

const MODOS: Record<string, string> = { 'decimal-pad': 'decimal', 'number-pad': 'numeric', 'numbers-and-punctuation': 'text' };
export function TextInput(p: any) {
  return (
    <input
      style={{ ...toCss(p.style), outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
      value={p.value} placeholder={p.placeholder} maxLength={p.maxLength} autoFocus={p.autoFocus}
      inputMode={MODOS[p.keyboardType] as any}
      onChange={e => p.onChangeText?.(e.target.value)}
      aria-label={p.accessibilityLabel}
    />
  );
}
export type TextInputProps = any;
export type ViewStyle = any;

export function Modal(p: any) {
  if (!p.visible) return null;
  return <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column' }}>{p.children}</div>;
}

export function ActivityIndicator() {
  return <div style={{ fontSize: 24 }}>…</div>;
}

export const StyleSheet = {
  create<T>(s: T): T { return s; },
  hairlineWidth: 1,
  flatten,
};

export const Platform = { OS: 'web', select: (o: any) => o.web ?? o.default };

export const Alert = {
  alert(t: string, m?: string) { window.alert(`${t}\n\n${m ?? ''}`); },
};

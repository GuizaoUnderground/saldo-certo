// Substitutos de módulos nativos para a prévia web
import React from 'react';
import { View } from './rn-shim';

export function StatusBar() { return null; }
export function SafeAreaProvider({ children }: { children: React.ReactNode }) { return <>{children}</>; }
export function SafeAreaView(p: any) { return <View style={p.style}>{p.children}</View>; }

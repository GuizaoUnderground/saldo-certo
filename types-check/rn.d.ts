// Subconjunto das APIs reais usadas pelo app (React Native 0.8x, Expo SDK 55)
declare module 'react-native' {
  import { ReactNode, ReactElement } from 'react';
  type Style = { [k: string]: any } | null | undefined | false | Style[];
  type Role = 'button' | 'header' | 'tab' | 'tablist' | 'text' | 'link' | 'none';
  interface A11y {
    accessibilityLabel?: string; accessibilityRole?: Role; accessibilityState?: { selected?: boolean; disabled?: boolean };
    testID?: string;
  }
  export interface ViewStyle { [k: string]: any }
  export interface ViewProps extends A11y { style?: Style; children?: ReactNode; pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only' }
  export function View(p: ViewProps): ReactElement;
  export interface TextProps extends A11y { style?: Style; children?: ReactNode; numberOfLines?: number; onPress?: () => void }
  export function Text(p: TextProps): ReactElement;
  export interface PressableProps extends A11y {
    onPress?: () => void; onLongPress?: () => void; hitSlop?: number;
    style?: Style | ((s: { pressed: boolean }) => Style); children?: ReactNode; disabled?: boolean;
  }
  export function Pressable(p: PressableProps): ReactElement;
  export interface ScrollViewProps { style?: Style; contentContainerStyle?: Style; keyboardShouldPersistTaps?: 'always' | 'never' | 'handled'; children?: ReactNode }
  export function ScrollView(p: ScrollViewProps): ReactElement;
  export interface TextInputProps extends A11y {
    value?: string; onChangeText?: (t: string) => void; placeholder?: string; placeholderTextColor?: string;
    keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'numeric' | 'email-address' | 'phone-pad' | 'numbers-and-punctuation';
    autoFocus?: boolean; maxLength?: number; style?: Style; editable?: boolean;
  }
  export function TextInput(p: TextInputProps): ReactElement;
  export interface ModalProps { visible?: boolean; transparent?: boolean; animationType?: 'none' | 'slide' | 'fade'; onRequestClose?: () => void; children?: ReactNode }
  export function Modal(p: ModalProps): ReactElement;
  export function KeyboardAvoidingView(p: ViewProps & { behavior?: 'height' | 'position' | 'padding' }): ReactElement;
  export function ActivityIndicator(p: { size?: 'small' | 'large' | number; color?: string }): ReactElement;
  export const StyleSheet: { create<T extends Record<string, Style>>(s: T): T; hairlineWidth: number };
  export const Platform: { OS: 'ios' | 'android' | 'web'; select<T>(o: { ios?: T; android?: T; web?: T; default?: T }): T };
  interface AlertButton { text?: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }
  export const Alert: { alert(title: string, message?: string, buttons?: AlertButton[], options?: { cancelable?: boolean; onDismiss?: () => void }): void };
}
declare module 'expo-status-bar' {
  export function StatusBar(p: { style?: 'auto' | 'light' | 'dark' | 'inverted' }): import('react').ReactElement;
}
declare module 'react-native-safe-area-context' {
  import { ReactNode, ReactElement } from 'react';
  export function SafeAreaProvider(p: { children?: ReactNode }): ReactElement;
  export function SafeAreaView(p: { style?: any; edges?: ('top' | 'bottom' | 'left' | 'right')[]; children?: ReactNode }): ReactElement;
}
declare module 'expo' {
  export function registerRootComponent(c: any): void;
}
declare module 'expo-sqlite' {
  type Param = string | number | null | boolean;
  export interface SQLiteRunResult { lastInsertRowId: number; changes: number }
  export interface SQLiteDatabase {
    execAsync(source: string): Promise<void>;
    runAsync(source: string, ...params: Param[]): Promise<SQLiteRunResult>;
    getFirstAsync<T>(source: string, ...params: Param[]): Promise<T | null>;
    getAllAsync<T>(source: string, ...params: Param[]): Promise<T[]>;
    withTransactionAsync(task: () => Promise<void>): Promise<void>;
  }
  export function openDatabaseAsync(name: string): Promise<SQLiteDatabase>;
}
declare module 'expo-notifications' {
  export enum AndroidImportance { MIN = 1, LOW = 2, DEFAULT = 3, HIGH = 4, MAX = 5 }
  export enum SchedulableTriggerInputTypes { DATE = 'date', TIME_INTERVAL = 'timeInterval', DAILY = 'daily' }
  export interface NotificationBehavior { shouldShowBanner: boolean; shouldShowList: boolean; shouldPlaySound: boolean; shouldSetBadge: boolean }
  export function setNotificationHandler(h: { handleNotification: (n: any) => Promise<NotificationBehavior> }): void;
  export function setNotificationChannelAsync(id: string, ch: { name: string; importance: AndroidImportance }): Promise<unknown>;
  export function getPermissionsAsync(): Promise<{ granted: boolean }>;
  export function requestPermissionsAsync(): Promise<{ granted: boolean }>;
  export function cancelAllScheduledNotificationsAsync(): Promise<void>;
  export function scheduleNotificationAsync(r: {
    content: { title?: string; body?: string };
    trigger: { type: SchedulableTriggerInputTypes.DATE; date: Date | number; channelId?: string };
  }): Promise<string>;
}

import { Platform, Text as NativeText, TextInput as NativeTextInput } from 'react-native';
import type { TextInputProps, TextProps } from 'react-native';

export const appFontFamily = Platform.select({
  ios: 'Helvetica Neue',
  android: 'sans-serif',
  web: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  default: 'sans-serif',
});

export function Text({ style, ...props }: TextProps) {
  return <NativeText {...props} style={[{ fontFamily: appFontFamily }, style]} />;
}

export function TextInput({ style, ...props }: TextInputProps) {
  return <NativeTextInput {...props} style={[{ fontFamily: appFontFamily }, style]} />;
}

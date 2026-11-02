import { Platform, Text as NativeText, TextInput as NativeTextInput } from 'react-native';
import type { TextInputProps, TextProps } from 'react-native';

export const appFontFamily = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  web: 'Georgia',
});

export function Text({ style, ...props }: TextProps) {
  return <NativeText {...props} style={[{ fontFamily: appFontFamily }, style]} />;
}

export function TextInput({ style, ...props }: TextInputProps) {
  return <NativeTextInput {...props} style={[{ fontFamily: appFontFamily }, style]} />;
}

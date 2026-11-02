import { Platform, Text as NativeText, TextInput as NativeTextInput } from 'react-native';
import type { TextInputProps, TextProps } from 'react-native';
import { translate, useLanguage } from '../services/i18n';

export const appFontFamily = Platform.select({
  ios: 'Helvetica Neue',
  android: 'sans-serif',
  web: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  default: 'sans-serif',
});

export function Text({ style, children, ...props }: TextProps) {
  const { language } = useLanguage();
  const translatedChildren = typeof children === 'string' ? translate(children) : children;
  return <NativeText {...props} style={[{ fontFamily: appFontFamily, writingDirection: language === 'ar' ? 'rtl' : 'ltr' }, style]}>{translatedChildren}</NativeText>;
}

export function TextInput({ style, ...props }: TextInputProps) {
  const { language } = useLanguage();
  return <NativeTextInput {...props} placeholder={props.placeholder ? translate(props.placeholder) : props.placeholder} style={[{ fontFamily: appFontFamily, writingDirection: language === 'ar' ? 'rtl' : 'ltr' }, style]} />;
}

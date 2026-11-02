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
  const translatedChildren = typeof children === 'string' ? translate(children, language) : children;
  const isArabic = language === 'ar';
  return <NativeText {...props} style={[{ fontFamily: appFontFamily, writingDirection: isArabic ? 'rtl' : 'ltr', textAlign: isArabic ? 'right' : 'left' }, style]}>{translatedChildren}</NativeText>;
}

export function TextInput({ style, ...props }: TextInputProps) {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  return <NativeTextInput {...props} placeholder={props.placeholder ? translate(props.placeholder, language) : props.placeholder} style={[{ fontFamily: appFontFamily, writingDirection: isArabic ? 'rtl' : 'ltr', textAlign: isArabic ? 'right' : 'left' }, style]} />;
}

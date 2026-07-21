import React from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = 'handled',
  ...props
}: ScrollViewProps) {
  return (
    <ScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={false}
      {...props}
    >
      {children}
    </ScrollView>
  );
}

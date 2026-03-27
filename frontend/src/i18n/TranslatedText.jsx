import React, { memo } from 'react';
import { useTranslatedText } from './useTranslation';

/**
 * TranslatedText - Component that automatically translates its text content
 */
export const TranslatedText = memo(function TranslatedText({
  children,
  as: Component = 'span',
  ...props
}) {
  const text = typeof children === 'string' ? children : '';
  const translated = useTranslatedText(text);

  if (typeof children !== 'string') {
    return <Component {...props}>{children}</Component>;
  }

  return <Component {...props}>{translated}</Component>;
});

/**
 * T - Shorthand for TranslatedText
 */
export const T = TranslatedText;

/**
 * HOC for translation (basic implementation)
 */
export function withTranslation(WrappedComponent) {
  function WithTranslation(props) {
    return <WrappedComponent {...props} />;
  }

  WithTranslation.displayName = `WithTranslation(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return WithTranslation;
}

export default TranslatedText;

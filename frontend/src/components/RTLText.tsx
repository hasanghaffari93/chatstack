import React from 'react';
import { useRTLText, getRTLStyles } from '../utils/rtl';

interface RTLTextProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
  forceDirection?: 'ltr' | 'rtl';
  style?: React.CSSProperties;
}

/**
 * Component that automatically detects and handles RTL text
 * Supports Persian, Arabic, Hebrew, Urdu, and other RTL languages
 */
export function RTLText({ 
  children, 
  className = '', 
  as: Component = 'div',
  forceDirection,
  style = {}
}: RTLTextProps) {
  const textContent = React.useMemo(() => {
    if (typeof children === 'string') {
      return children;
    }
    // For non-string children, try to extract text content
    if (React.isValidElement(children) && children.props && typeof children.props === 'object') {
      const childProps = children.props as Record<string, unknown>;
      if ('children' in childProps && typeof childProps.children === 'string') {
        return childProps.children;
      }
    }
    return '';
  }, [children]);

  const rtlInfo = useRTLText(textContent);
  const rtlStyles = getRTLStyles(textContent);
  
  const finalDirection = forceDirection || rtlInfo.direction;
  const finalStyles = {
    ...rtlStyles,
    ...style,
    direction: finalDirection,
  };

  // Add RTL-specific classes
  const rtlClasses = rtlInfo.hasRTL ? 'rtl-content' : 'ltr-content';
  const finalClassName = `${className} ${rtlClasses}`.trim();

  return React.createElement(
    Component,
    {
      className: finalClassName,
      style: finalStyles,
      dir: finalDirection,
      lang: rtlInfo.language || undefined,
    },
    children
  );
}

/**
 * Hook to get RTL text information for custom components
 */
export function useRTLTextInfo(text: string) {
  return useRTLText(text);
}

/**
 * Higher-order component to add RTL support to any component
 */
export function withRTLSupport<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function RTLWrapper(props: P & { text?: string; rtlProps?: Partial<RTLTextProps> }) {
    const { text, rtlProps, ...otherProps } = props;
    // Always call the hook, but with empty string if no text
    const rtlInfo = useRTLText(text || '');
    
    return (
      <RTLText {...rtlProps} forceDirection={rtlInfo.direction}>
        <WrappedComponent
          {...(otherProps as P)}
          rtlInfo={rtlInfo}
        />
      </RTLText>
    );
  };
} 
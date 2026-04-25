import React from 'react';
import { Text as RNText, StyleSheet, type TextProps, type TextStyle } from 'react-native';
import { getAktifFontOlcek } from '../utils/fontOlcek';

export const ScaledText = React.forwardRef<React.ComponentRef<typeof RNText>, TextProps>(
  function ScaledText(props, ref) {
    const scale = getAktifFontOlcek();
    const tekSatir = props.numberOfLines === 1;
    const otoFit = props.adjustsFontSizeToFit ?? (scale !== 1 && tekSatir);
    const minOlcek = props.minimumFontScale ?? (otoFit ? 0.75 : undefined);

    if (scale === 1) {
      return (
        <RNText
          ref={ref}
          {...props}
          adjustsFontSizeToFit={props.adjustsFontSizeToFit}
          minimumFontScale={props.minimumFontScale}
        />
      );
    }

    const flat = StyleSheet.flatten(props.style as TextStyle | TextStyle[] | undefined);
    if (!flat || typeof flat.fontSize !== 'number') {
      return (
        <RNText
          ref={ref}
          {...props}
          adjustsFontSizeToFit={otoFit}
          minimumFontScale={minOlcek}
        />
      );
    }

    return (
      <RNText
        ref={ref}
        {...props}
        adjustsFontSizeToFit={otoFit}
        minimumFontScale={minOlcek}
        style={[flat, { fontSize: flat.fontSize * scale }]}
      />
    );
  },
);

ScaledText.displayName = 'Text';

// Brand imagery.
//
// The WPI logo and the coffee hero photo live in the Figma file but could not be
// downloaded from this build environment. Export them from Figma and save them as
//   assets/brand/wpi-logo.png   and   assets/brand/hero-coffee.png
// then set the two constants below to require(...) of those files.
import { Coffee } from 'lucide-react-native';
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { colors, fonts } from '../theme';

const LOGO: ImageSourcePropType | null = null; // require('../../assets/brand/wpi-logo.png')
const HERO: ImageSourcePropType | null = null; // require('../../assets/brand/hero-coffee.png')

export function BrandMark({ size, radius = 4 }: { size: number; radius?: number }) {
  if (LOGO) {
    return <Image source={LOGO} style={{ width: size, height: size, borderRadius: radius }} resizeMode="cover" />;
  }
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: radius }]}>
      <Text style={[styles.markText, { fontSize: size * 0.3 }]}>WPI</Text>
    </View>
  );
}

export function HeroImage({ height }: { height: number }) {
  if (HERO) {
    return <Image source={HERO} style={{ width: '100%', height }} resizeMode="cover" blurRadius={2} />;
  }
  return (
    <View style={[styles.hero, { height }]}>
      <Coffee size={48} color={colors.blue} strokeWidth={1.25} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  markText: { color: colors.white, fontFamily: fonts.semibold, letterSpacing: 1 },
  hero: { width: '100%', backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' },
});

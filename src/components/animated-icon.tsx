import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 600;
const SPLASH_DURATION = 2800;

const overlayKeyframe = new Keyframe({
  0: { opacity: 1 },
  90: { opacity: 1 },
  100: { opacity: 0 },
});

const pawKeyframe = new Keyframe({
  0: {
    opacity: 0,
    transform: [{ translateY: 120 }, { scale: 0.82 }, { rotateZ: '0deg' }],
  },
  24: {
    opacity: 1,
    transform: [{ translateY: 0 }, { scale: 1 }, { rotateZ: '0deg' }],
    easing: Easing.out(Easing.cubic),
  },
  38: {
    transform: [{ translateY: 0 }, { scale: 1 }, { rotateZ: '-10deg' }],
    easing: Easing.inOut(Easing.cubic),
  },
  52: {
    transform: [{ translateY: 0 }, { scale: 1 }, { rotateZ: '10deg' }],
    easing: Easing.inOut(Easing.cubic),
  },
  66: {
    transform: [{ translateY: 0 }, { scale: 1 }, { rotateZ: '-8deg' }],
    easing: Easing.inOut(Easing.cubic),
  },
  80: {
    transform: [{ translateY: 0 }, { scale: 1 }, { rotateZ: '8deg' }],
    easing: Easing.inOut(Easing.cubic),
  },
  92: {
    transform: [{ translateY: 0 }, { scale: 1 }, { rotateZ: '0deg' }],
    easing: Easing.out(Easing.cubic),
  },
  100: {
    opacity: 1,
    transform: [{ translateY: 0 }, { scale: 1 }, { rotateZ: '0deg' }],
  },
});

export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return animate ? (
    <Animated.View
      entering={overlayKeyframe
        .duration(SPLASH_DURATION)
        .withCallback((finished) => {
          'worklet';
          if (finished) scheduleOnRN(setVisible, false);
        })}
      style={styles.splashOverlay}>
      <Image
        source={require('@/assets/images/splash-background.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <Animated.View
        entering={pawKeyframe.duration(SPLASH_DURATION)}
        style={styles.pawStage}>
        <Image
          source={require('@/assets/images/splash-paw.png')}
          style={styles.paw}
          contentFit="contain"
        />
      </Animated.View>
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={styles.splashOverlay}>
      <Image
        source={require('@/assets/images/splash-background.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
    </View>
  );
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
  },
  40: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
    easing: Easing.elastic(0.7),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: '0deg' }],
  },
  100: {
    transform: [{ rotateZ: '7200deg' }],
  },
});

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Animated.View entering={glowKeyframe.duration(60 * 1000 * 4)} style={styles.glow}>
        <Image style={styles.glow} source={require('@/assets/images/logo-glow.png')} />
      </Animated.View>

      <Animated.View entering={keyframe.duration(DURATION)} style={styles.background} />
      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 201,
    height: 201,
    position: 'absolute',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: {
    width: 76,
    height: 71,
  },
  background: {
    borderRadius: 40,
    experimental_backgroundImage: `linear-gradient(180deg, #3C9FFE, #0274DF)`,
    width: 128,
    height: 128,
    position: 'absolute',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  pawStage: {
    width: '88%',
    maxWidth: 560,
    aspectRatio: 1,
  },
  paw: {
    width: '100%',
    height: '100%',
  },
});

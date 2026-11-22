import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Keyframe, Easing } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import classes from './animated-icon.module.css';
const DURATION = 300;
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
    <View onLayout={() => setAnimate(true)} style={styles.splashOverlay}>
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
    transform: [{ scale: 0 }],
  },
  60: {
    transform: [{ scale: 1.2 }],
    easing: Easing.elastic(1.2),
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(1.2),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    opacity: 0,
  },
  60: {
    transform: [{ scale: 1.2 }],
    opacity: 0,
    easing: Easing.elastic(1.2),
  },
  100: {
    transform: [{ scale: 1 }],
    opacity: 1,
    easing: Easing.elastic(1.2),
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: '-180deg' }, { scale: 0.8 }],
    opacity: 0,
  },
  [DURATION / 1000]: {
    transform: [{ rotateZ: '0deg' }, { scale: 1 }],
    opacity: 1,
    easing: Easing.elastic(0.7),
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

      <Animated.View style={styles.background} entering={keyframe.duration(DURATION)}>
        <div className={classes.expoLogoBackground} />
      </Animated.View>

      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    zIndex: 1000,
    position: 'absolute',
    top: 128 / 2 + 138,
  },
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
  },
  image: {
    position: 'absolute',
    width: 76,
    height: 71,
  },
  background: {
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

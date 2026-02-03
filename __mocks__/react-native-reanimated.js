// Mock react-native-reanimated for Jest tests
module.exports = {
  default: {
    View: 'AnimatedView',
  },
  useSharedValue: (initial) => ({ value: initial }),
  useAnimatedStyle: () => ({}),
  withTiming: (value) => value,
  withDelay: (_delay, value) => value,
  withSpring: (value) => value,
  withSequence: (...values) => values[values.length - 1],
  withRepeat: (value) => value,
  Easing: {
    out: (fn) => fn,
    in: (fn) => fn,
    inOut: (fn) => fn,
    quad: (t) => t,
    cubic: (t) => t,
    linear: (t) => t,
    ease: (t) => t,
    bezier: () => (t) => t,
  },
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
};

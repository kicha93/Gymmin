const React = require("react");
const ReactNative = require("react-native");

function stripMotionProps(props) {
  const {
    animate,
    animateProps,
    animationComponentGluestack,
    exit,
    initial,
    initialProps,
    onAnimationComplete,
    transition,
    transformOrigin,
    whileHover,
    whileTap,
    ...rest
  } = props || {};

  return rest;
}

function plainComponent(Component) {
  const Wrapped = React.forwardRef((props, ref) =>
    React.createElement(Component, { ...stripMotionProps(props), ref })
  );

  Wrapped.displayName = `GymminGluestackAnimationShim`;
  return Wrapped;
}

function optionalSvgComponent(name, fallback) {
  try {
    const Svg = require("react-native-svg");
    return plainComponent(Svg[name] || fallback);
  } catch {
    return plainComponent(fallback);
  }
}

const AnimatedText = plainComponent(ReactNative.Text);
const AnimatedView = plainComponent(ReactNative.View);
const AnimatedPressable = plainComponent(ReactNative.Pressable);
const AnimatedImage = plainComponent(ReactNative.Image);
const AnimatedScrollView = plainComponent(ReactNative.ScrollView);
const AnimatedSafeAreaView = plainComponent(ReactNative.SafeAreaView || ReactNative.View);
const AnimatedFlatList = plainComponent(ReactNative.FlatList);
const AnimatedSectionList = plainComponent(ReactNative.SectionList);
const AnimatedSvg = optionalSvgComponent("Svg", ReactNative.View);
const AnimatedRect = optionalSvgComponent("Rect", ReactNative.View);
const AnimatedCircle = optionalSvgComponent("Circle", ReactNative.View);
const AnimatedEllipse = optionalSvgComponent("Ellipse", ReactNative.View);
const AnimatedLine = optionalSvgComponent("Line", ReactNative.View);
const AnimatedPolyline = optionalSvgComponent("Polyline", ReactNative.View);
const AnimatedPath = optionalSvgComponent("Path", ReactNative.View);
const AnimatedTSpan = optionalSvgComponent("TSpan", ReactNative.Text);
const AnimatedTextPath = optionalSvgComponent("TextPath", ReactNative.Text);
const AnimatedG = optionalSvgComponent("G", ReactNative.View);
const AnimatedClipPath = optionalSvgComponent("ClipPath", ReactNative.View);

function AnimatePresence({ children }) {
  return React.createElement(React.Fragment, null, children);
}

class AnimationResolver {
  constructor() {
    this.name = "AnimationResolver";
    this.componentDriver = {
      config: {},
      engine: {
        AnimatePresence
      }
    };
    this.config = {
      aliases: {},
      animatedPropMap: {},
      tokens: {}
    };
  }

  register() {}

  inputMiddleWare(styledObj = {}, shouldUpdateConfig = true, third, Component) {
    return [styledObj, shouldUpdateConfig, third, Component, new Set()];
  }

  updateStyledObject() {
    return {};
  }

  renameObjectKey(obj) {
    return obj;
  }

  componentMiddleWare({ Component }) {
    return Component;
  }
}

module.exports = {
  AnimatePresence,
  AnimatedCircle,
  AnimatedClipPath,
  AnimatedEllipse,
  AnimatedFlatList,
  AnimatedG,
  AnimatedImage,
  AnimatedLine,
  AnimatedPath,
  AnimatedPolyline,
  AnimatedPressable,
  AnimatedRect,
  AnimatedSafeAreaView,
  AnimatedScrollView,
  AnimatedSectionList,
  AnimatedSvg,
  AnimatedText,
  AnimatedTextPath,
  AnimatedTSpan,
  AnimatedView,
  AnimationResolver
};

import { Animated } from 'react-native'

import { IDragCloneProps } from '../../types'

export function DragClone({ clone, providerOffset }: IDragCloneProps) {
  if (clone) {
    console.log('clone', clone.position, providerOffset)
    return (
      <Animated.View
        testID={'DragCloneItem'}
        style={[
          {
            ...clone.style,
            transform: [
              { translateX: clone.pan!.x },
              { translateY: clone.pan!.y },
              // { translateX: Animated.divide(clone.pan!.x, clone.position!.scale)},
              // { translateY: Animated.divide(clone.pan!.y, clone.position!.scale)},

              { scale: clone.position!.scale || 1 },
            ],
          },
          {
            position: 'absolute',
            // width: clone.style.width,
            // height: clone.style.height,
            // zIndex: 1,
            // left: (clone.position!.x + providerOffset.x),
            // top: (clone.position!.y + providerOffset.y),
            left: clone.position!.x + providerOffset.x * (clone.position ? clone.position.scale || 1 : 1),
            top: clone.position!.y + providerOffset.y * (clone.position ? clone.position.scale || 1 : 1),
            opacity: clone.opacity,
            zIndex: 9,
          },
        ]}
      >
        {clone.children}
      </Animated.View>
    )
  } else {
    return null
  }
}

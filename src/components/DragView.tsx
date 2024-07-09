import { Animated, MeasureOnSuccessCallback, PanResponder, Vibration, View, ViewStyle } from 'react-native'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { DragCloneContext, DragContext, DragViewOffsetContext } from '../DragContext'
import { IDraggable, IDragViewProps, ILayoutData, IPosition, MoveMode, zeroPoint/*, zeroViewport*/ } from '../types'
import { DragViewWithHandleAndMeasure } from './internal/DragViewWithHandleAndMeasue'

const empty = {}
const animEndOptions = { overshootClamping: true }

/* offsets:
1) provider: between clone and provider only
2) movable:
  - sets on dragEnd as pan change
4) parent: should be set for children via ctx as parent + movable
  - sets on dragEnd and ctx change*/
export function DragView(props: IDragViewProps) {
  const cloned = useContext(DragCloneContext)
  if (cloned) {
    return (
      <View
        style={{
          ...props.style,
          transform: [
            { translateX: props.movableOffset ? props.movableOffset.x : 0 },
            { translateY: props.movableOffset ? props.movableOffset.y : 0 },
          ],
        }}
      >
        {props.children}
      </View>
    )
  }
  return <DragViewActual {...props} />
}

function DragViewActual({
  slots,
  proxy = true,
  viewportLayout,
  mode = MoveMode.FREE,
  useBounce = true,
  useFadeout = true,

  children,
  payload,
  style: styleProp = empty,
  dragStyle,
  overStyle,
  copyDragStyle,
  copyOverStyle,
  disabled = false,
  longPressDelay = 0,
  vibroDuration = 0,
  movable = false,
  movableOffset = zeroPoint,

  onDragStart: onDragStartProp,
  onDrag,
  onEnter: onEnterProp,
  onOver,
  onExit: onExitProp,
  onDragEnd: onDragEndProp,
  onDrop: onDropProp,
  animationEndOptions = animEndOptions,
  animationDropOptions = empty,
  // viewClassName='',
  ...restProps
}: IDragViewProps) {
  const { dndEventManager, setClone: ctxSetClone } = useContext(DragContext)
  // console.log('[DragView] viewClassName', restProps.viewClassName)
  // console.log('[DragView] windowLayout', windowLayout)
  // console.log('[DragView] viewportLayout', restProps.name, viewportLayout.current)

  // useEffect(() => {
  //   console.log('[DragView] movableOffset changed', movableOffset, restProps.name)
  // }, [movableOffset])

  const moveX = useRef(false)
  const moveY = useRef(false)
  if (!proxy) {
    movable = true
  }
  if (mode == MoveMode.X || mode == MoveMode.FREE) {
    moveX.current = true
  }
  if (mode == MoveMode.Y || mode == MoveMode.FREE) {
    moveY.current = true
  }
  const parentOffset = useContext(DragViewOffsetContext)
  // console.log('[DragView] parentOffset', restProps.name, parentOffset)
  const [style, setStyle] = useState(styleProp)
  const [panResponder, setPanResponder] = useState(PanResponder.create({}))
  const [fadeAnim] = useState(new Animated.Value(1))

  const pan = useRef(new Animated.ValueXY()).current
  const defaultStyleRef = useRef(styleProp)
  // keep the drag element abs position relative to provider
  const absPositionRef = useRef<ILayoutData>({ x: 0, y: 0, width: 0, height: 0 })
  // const viewportCoordinateRef = useRef<ICoordinate>(viewportCoordinate)
  /** unlike pan updates only on movable dragend */
  const movedOffsetRef = useRef<IPosition>(movableOffset)
  const [movedOffset, setMovedOffset] = useState<IPosition>(movableOffset)
  /** id from IDndEventManager */
  const dndId = useRef<number | undefined>(undefined)
  /** initial absolutePos * * (if you wondered why append and then distract parentOffset ?
   * Coz absolutePos updates only inside 'measure' and parentOffset may change while measure not triggered.
   * So it contains parent movedOffset) */
  const absolutePos = useRef<IPosition>(zeroPoint)
  const layoutRef = useRef<ILayoutData>({ x: -1, y: -1, width: 0, height: 0 })
  const pointerRef = useRef<IPosition>(zeroPoint)

  const setDefaultStyle = useCallback(() => {
    defaultStyleRef.current = {
      ...styleProp,
      transform: [{ translateX: movedOffsetRef.current.x }, { translateY: movedOffsetRef.current.y }],
    }
    setStyle(defaultStyleRef.current)
  }, [styleProp])

  // const getCloneOffset = useCallback((prop: string | number) => {
  //   // @ts-ignore
  //   const a = (viewportLayout[prop] - viewportLayout[prop] * viewportLayout.scale ) / 2
  //   // @ts-ignore
  //   const b = (layoutRef.current[prop] - layoutRef.current[prop] * viewportLayout.scale ) / 2
  //   return a - b
  // }, [viewportLayout])
  /** update clone
   *  @param exists bool  set or remove @default false
   * so setClone() sets undefined
   * setClone(true) sets clone with default style*/
  const setClone = useCallback(
    (exists = false, styleParam?: ViewStyle) => {
      console.log('setClone0', restProps.name)
      // window.viewportLayout = viewportLayout.current
      // console.log('setClone0', { exists, proxy, name: restProps.name}, viewportLayout)
      if (!exists) {
        if (proxy) {
          // ctxSetClone(undefined, dndId.current)
        }
      } else {
        // const cloneStyle = styleParam ? styleParam : copyDragStyle ? copyDragStyle : defaultStyleRef.current
        const cloneStyle = { ...defaultStyleRef.current, ...copyDragStyle, ...styleParam }
        // console.log('setClone1', cloneStyle, restProps.name )
        // console.log('setClone2', layoutRef.current, restProps.name)
        // console.log('setClone3', movedOffsetRef.current, restProps.name)
        // console.log('setClone4', absolutePos.current, restProps.name)
        // console.log('setClone5', parentOffset, restProps.name)
        const {
          // x: targetX, y: targetY,
          width: targetWidth,
          height: targetHeight,
        } = layoutRef.current
        let viewWidth = 0
        let viewHeight = 0
        let viewOffsetX = 0
        let viewOffsetY = 0
        let viewScale = 1
        if (viewportLayout && viewportLayout.current) {
          viewWidth = viewportLayout.current.width
          viewHeight = viewportLayout.current.height
          viewOffsetX = viewportLayout.current.x
          viewOffsetY = viewportLayout.current.y
          viewScale = viewportLayout.current.scale || 1
        }
        // let {
        //   width: viewWidth = 0,
        //   height: viewHeight = 0,
        //   x: viewOffsetX = 0,
        //   y: viewOffsetY = 0,
        //   scale: viewScale = 1,
        //   // pageX,
        //   // pageY,
        // } = viewportLayout!.current
        console.log('viewportLayout', viewportLayout?.current)
        const targetOffsetX = -(targetWidth - targetWidth * viewScale) / 2
        const targetOffsetY = -(targetHeight - targetHeight * viewScale) / 2
        console.log('targetOffset', { targetOffsetX, targetOffsetY })
        const viewX = (viewWidth - viewWidth * viewScale) / 2 + viewOffsetX
        const viewY = (viewHeight - viewHeight * viewScale) / 2 + viewOffsetY
        const moduleX = -parentOffset.x * viewScale
        const moduleY = -parentOffset.y * viewScale

        // console.log('setClone6', { viewX, viewY })
        // console.log('setClone7', { moduleX, moduleY })
        // console.log('setClone8', { targetOffsetX, targetOffsetY })
        // console.log('setClone9', parentOffset)
        // console.log('setClone10', absolutePos.current)

        absPositionRef.current = {
          x: viewX + moduleX + targetOffsetX,
          y: viewY + moduleY + targetOffsetY,
          width: layoutRef.current.width,
          height: layoutRef.current.height,
        }
        console.log('absPositionRef', absPositionRef.current)

        // console.log('setClone10', {
        //   x: (absolutePos.current.x - parentOffset.x),
        //   y: (absolutePos.current.y - parentOffset.y),
        //   ox:  targetOffsetX + viewX + moduleX,
        //   oy:  targetOffsetY + viewY + moduleY,
        //   x2: (absolutePos.current.x - parentOffset.x) * viewScale + viewX + moduleX,
        //   y2: (absolutePos.current.y - parentOffset.y) * viewScale + viewY + moduleY,
        // })

        // pan.setOffset({
        //   x: getCloneOffset('width') + viewportLayout.x + movedOffsetRef.current.x * viewportLayout?.scale ,
        //   y: getCloneOffset('height') + viewportLayout.y  + movedOffsetRef.current.y * viewportLayout?.scale,
        // })
        if (proxy) {
          console.log('setClone1', {
            x: (absolutePos.current.x - parentOffset.x) * viewScale + viewX + moduleX + targetOffsetX,
            y: (absolutePos.current.y - parentOffset.y) * viewScale + viewY + moduleY + targetOffsetY,
            width: layoutRef.current.width,
            height: layoutRef.current.height,
            scale: viewScale,
          })
          dndId.current !== undefined &&
            ctxSetClone({
              draggableDndId: dndId.current,
              style: { ...cloneStyle, width: layoutRef.current.width, height: layoutRef.current.height },
              // pan: new Animated.ValueXY({
              //   x: pan.x,
              //   y: pan.y,
              // }),
              pan: pan,
              // @ts-ignore
              position: {
                // x: absolutePos.current.x - parentOffset.x,
                // y: absolutePos.current.y - parentOffset.y,
                x: (absolutePos.current.x - parentOffset.x) * viewScale + viewX + moduleX + targetOffsetX,
                y: (absolutePos.current.y - parentOffset.y) * viewScale + viewY + moduleY + targetOffsetY,
                // x: (absolutePos.current.x - parentOffset.x + viewX + moduleX),
                // y: (absolutePos.current.y - parentOffset.y + viewY + moduleY),
                width: layoutRef.current.width,
                height: layoutRef.current.height,
                scale: viewScale,
              },
              opacity: fadeAnim,
              children: children,
            })
        } else {
          // const x = Number(JSON.stringify(pan.x)) - viewportLayout.x;
          // const y = Number(JSON.stringify(pan.y)) - viewportLayout.y;
          // pan.x.setOffset(viewportLayout.x)
          // pan.y.setOffset(viewportLayout.x)
          // console.log('setClone2' , viewportLayout)
          // console.log('setClone2' , {x: Number(JSON.stringify(pan.x)), y: Number(JSON.stringify(pan.y)) })
          setStyle((s: any) => {
            const a = {
              ...s,
              ...cloneStyle,
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                // { translateY: Animated.divide(pan.x, viewportLayout?.current?.scale||1)},
                // { translateY: Animated.divide(pan.y, viewportLayout?.current?.scale||1)}
              ],
            }
            return a
          })
        }
      }
    },
    [parentOffset, children, copyDragStyle, ctxSetClone, fadeAnim, pan],
  )
  // bounce means return back
  const bounce = useCallback(() => {
    if (!useBounce) {
      setClone()
      setDefaultStyle()
      return
    }
    console.log('bounce')
    Animated.spring(pan, {
      ...animationEndOptions,
      toValue: zeroPoint,
      useNativeDriver: true,
    }).start(() => {
      setClone()
      setDefaultStyle()
    })
  }, [setClone, setDefaultStyle, animationEndOptions, pan])

  const fadeOut = useCallback(() => {
    if (!useFadeout) {
      setDefaultStyle()
      return
    }
    console.log('fade out')
    Animated.timing(fadeAnim, {
      ...animationDropOptions,
      toValue: 0,
      useNativeDriver: true,
    }).start(() => {
      pan.setValue(zeroPoint) // remove flashing on second drag
      fadeAnim.setValue(1)
      setClone()
      setDefaultStyle()
    })
  }, [setClone, setDefaultStyle, animationDropOptions, fadeAnim, pan])

  const movableDragEnd = useCallback(() => {
    pan.extractOffset()

    movedOffsetRef.current = {
      x: Number(JSON.stringify(pan.x)),
      y: Number(JSON.stringify(pan.y)),
    }

    setMovedOffset(movedOffsetRef.current)
    setClone()
    setDefaultStyle()
  }, [setClone, setDefaultStyle, pan])

  const onEnter = useCallback(
    (position: IPosition, payload: any) => {
      console.log('onEnter')
      if (movable) {
        if (copyOverStyle || overStyle) {
          setClone(true, copyOverStyle ? copyOverStyle : overStyle)
        }
      } else {
        overStyle && setStyle(overStyle)
        copyOverStyle && setClone(true, copyOverStyle)
      }
      onEnterProp && onEnterProp(position, payload)
    },
    [onEnterProp, copyOverStyle, overStyle, setClone, movable],
  )

  const onExit = useCallback(
    (position: IPosition, payload: any, overCount?: number) => {
      console.log('onExit')
      if (!overCount) {
        //overCount: only if not over (0 or undefinded) to prevent style change
        if (movable) {
          if (copyOverStyle || overStyle) {
            setClone(true)
          }
        } else {
          overStyle && setStyle(dragStyle ? dragStyle : styleProp)
          copyOverStyle && setClone(true)
        }
      }
      onExitProp && onExitProp(position, payload, overCount)
    },
    [onExitProp, copyOverStyle, dragStyle, overStyle, setClone, styleProp, movable],
  )

  const onDragStart = useCallback(
    (position: IPosition, b?: IPosition) => {
      console.log('onDragStart', restProps.name, position, b)
      // setStyle({ ...styleProp, backgroundColor: 'red'})
      if (proxy && movable) {
        setStyle({ ...styleProp, opacity: 0 })
      } else {
        dragStyle && setStyle(dragStyle)
        fadeAnim.stopAnimation()
        pan.stopAnimation()
      }

      setClone(true)
      onDragStartProp && onDragStartProp(position, absPositionRef.current)
    },
    [onDragStartProp, dragStyle, fadeAnim, movable, pan, setClone, styleProp],
  )

  const onDragEnd = useCallback(
    (position: IPosition) => {
      console.log('onDragEnd')
      if (movable) {
        movableDragEnd()
      } else {
        bounce()
      }
      onDragEndProp && onDragEndProp(position, movedOffsetRef.current)
    },
    [onDragEndProp, bounce, movable, movableDragEnd],
  )

  const onDrop: (position: IPosition, _movedOffset: any, payload: any, overlapIndex?: number) => void = useCallback(
    (position: IPosition, _movedOffset: any, payload: any, overlapIndex?: number) => {
      // console.log('onDrop overlapIndex', {overlapIndex,movable, proxy} )
      if (!overlapIndex) {
        //overlapIndex: only first(0) or undefinded to prevent multiple animation call
        if (movable) {
          movableDragEnd()
        } else {
          fadeOut()
        }
      }
      onDropProp && onDropProp(position, movedOffsetRef.current, payload, overlapIndex)
    },
    [movable, movableDragEnd, onDropProp, fadeOut],
  )

  const setDndEventManagerDraggable = useCallback(() => {
    // console.log('setDndEventManagerDraggable', dndId.current, dndEventManager)
    if (!dndEventManager) {
      return
    }

    //  dnd handlers should contain uptodate context
    const draggable: IDraggable = {
      id: dndId.current,
      layout: layoutRef.current,
      onDragStart: onDragStart,
      onDrag: onDrag,
      onDragEnd: onDragEnd,
      onDrop: onDrop,
      onEnter: onEnter,
      onExit: onExit,
      onOver: onOver,
      payload: payload,
      slots: slots,
      // containerOffsetRef: containerOffsetRef,
    }
    if (dndId.current != undefined) {
      dndEventManager.updateDraggable(draggable)
    } else {
      dndId.current = dndEventManager.registerDraggable(draggable)
    }
  }, [payload, onDrag, onOver, dndEventManager, onDragEnd, onDragStart, onDrop, onEnter, onExit, slots])

  useEffect(() => {
    setDndEventManagerDraggable()
  }, [setDndEventManagerDraggable])

  useEffect(() => {
    setDefaultStyle()
  }, [setDefaultStyle])

  useEffect(() => {
    // console.log('setMovedOffset2', movableOffset, restProps.name)
    movedOffsetRef.current = movableOffset
    setMovedOffset(movableOffset)
    pan.setOffset(movableOffset)
    setDefaultStyle()
  }, [movableOffset, pan, setDefaultStyle])

  useEffect(() => {
    if (!dndEventManager || !dndEventManager) {
      return
    }
    return () => {
      dndId.current !== undefined && dndEventManager.unregisterDraggable(dndId.current)
    }
  }, [dndEventManager])

  /* create and refresh panHandlers */
  useEffect(() => {
    let onLongPressTimeout: NodeJS.Timeout
    let shouldDrag = false
    setPanResponder(
      PanResponder.create({
        // onStartShouldSetPanResponderCapture: () => {
        //   console.log('[PanResponder] onStartShouldSetPanResponderCapture', restProps.name)
        //   return false;
        // },

        onStartShouldSetPanResponder: () => {
          // console.log('[PanResponder] onStartShouldSetPanResponder', restProps.name)
          return true
        },
        // onMoveShouldSetPanResponderCapture: () => {
        //   console.log('[PanResponder] onMoveShouldSetPanResponderCapture', restProps.name)
        //   return false
        // },
        onMoveShouldSetPanResponder: () => {
          // console.log('[PanResponder] onMoveShouldSetPanResponder', restProps.name)
          return false
        },
        onPanResponderGrant: (_evt, gestureState) => {
          pointerRef.current = {
            x: _evt.nativeEvent.locationX,
            y: _evt.nativeEvent.locationY,
          }
          if (longPressDelay > 0) {
            onLongPressTimeout = setTimeout(() => {
              console.log('[PanResponder] onPanResponderGrant', restProps.name, layoutRef.current)
              dndId.current !== undefined &&
                dndEventManager.handleDragStart(
                  dndId.current,
                  {
                    x: gestureState.moveX,
                    y: gestureState.moveY,
                  },
                  pointerRef.current,
                )
              shouldDrag = true
              vibroDuration > 0 && Vibration.vibrate(vibroDuration)
            }, longPressDelay)
          } else {
            console.log('[PanResponder] onPanResponderGrant', restProps.name, layoutRef.current)
            dndId.current !== undefined &&
              dndEventManager.handleDragStart(
                dndId.current,
                {
                  x: gestureState.moveX,
                  y: gestureState.moveY,
                },
                pointerRef.current,
              )
            shouldDrag = true
          }
        },
        onPanResponderMove: (_evt, gestureState) => {
          // console.log('[PanResponder] onPanResponderMove', restProps.name)
          if (shouldDrag) {
            dndId.current !== undefined &&
              dndEventManager.handleDragMove(dndId.current, {
                x: gestureState.moveX,
                y: gestureState.moveY,
              })

            // console.log('pan 1', JSON.stringify({
            //   x: gestureState.moveX,
            //   y: gestureState.moveY
            // }))

            // console.log('pan ', proxy )
            // console.log(1, {x: gestureState.moveX, y: gestureState.moveY})

            // // Animated.divide(pan.y, viewportLayout?.current?.scale||1)

            if (moveX.current) {
              if (!proxy) {
                // move self
                // @ts-ignore
                pan.x.setValue(gestureState.dx / (viewportLayout?.current?.scale || 1))
              } else {
                pan.x.setValue(gestureState.dx)
              }
            }

            if (moveY.current) {
              if (!proxy) {
                // move self
                // @ts-ignore
                pan.y.setValue(gestureState.dy / (viewportLayout?.current?.scale || 1))
              } else {
                pan.y.setValue(gestureState.dy)
              }
            }

            // console.log('pan 2', JSON.stringify({
            //   x: pan.x,
            //   y: pan.y
            // }))

            // const xy:{dx?:any, dy?: any} = {}
            // if (moveX.current) {
            //   xy.dx= pan.x
            // }
            // if (moveY.current) {
            //   xy.dy= pan.y
            // }

            // console.log('viewportLayout?.current?.scale', (viewportLayout?.current?.scale || 1))
            // pan.setValue({
            //   x: gestureState.dx / (viewportLayout?.current?.scale || 1),
            //   y: gestureState.dy / (viewportLayout?.current?.scale || 1),
            // });

            // Animated.event([null, xy,/*{
            //   dx: pan.x,
            //   dy: pan.y
            // }*/], { useNativeDriver: false })(evt, gestureState)
          } else {
            Math.abs(gestureState.dx) + Math.abs(gestureState.dy) > 10 && clearTimeout(onLongPressTimeout)
          }
        },
        onPanResponderRelease: (_evt, gestureState) => {
          shouldDrag &&
            dndId.current !== undefined &&
            dndEventManager.handleDragEnd(dndId.current, { x: gestureState.moveX, y: gestureState.moveY }, pointerRef.current)
          shouldDrag = false
          clearTimeout(onLongPressTimeout)
        },
        onPanResponderTerminate: (_evt, gestureState) => {
          shouldDrag &&
            dndId.current !== undefined &&
            dndEventManager.handleDragEnd(dndId.current, { x: gestureState.moveX, y: gestureState.moveY }, pointerRef.current)
          shouldDrag = false
          clearTimeout(onLongPressTimeout)
        },
        onShouldBlockNativeResponder: () => false,
        onPanResponderTerminationRequest: () => true,
      }),
    )
  }, [longPressDelay, vibroDuration, pan, dndEventManager])

  const offsetContext: IPosition = useMemo(() => {
    // console.log('offsetContext',parentOffset,movedOffset, {
    //   x: parentOffset.x - movedOffset.x ,
    //   y: parentOffset.y - movedOffset.y ,
    // },  {
    //   x: parentOffset.x - movedOffset.x - viewportLayout.current.x,
    //   y: parentOffset.y - movedOffset.y - viewportLayout.current.y,
    // })
    return {
      x: parentOffset.x - movedOffset.x, //  - viewportLayout.x,
      y: parentOffset.y - movedOffset.y, //  - viewportLayout.y,
    }
  }, [parentOffset, movedOffset])

  const panHandlers = useMemo(() => (disabled ? {} : panResponder.panHandlers), [panResponder, disabled])

  // console.log('movedOffsetRef', movedOffsetRef.current)
  const measureCallback = useCallback<MeasureOnSuccessCallback>(
    (_x, _y, width, height, pageX, pageY) => {
      if (width == 0 || height == 0) {
        return
      }

      // console.log('measureCallback in drag', restProps.name, {_x, _y, width, height, pageX, pageY})
      // console.log('measureCallback in parentOffset', restProps.name, parentOffset)
      // console.log('measureCallback in movedOffsetRef', restProps.name, movedOffsetRef.current)
      // console.log('measureCallback in abs', restProps.name,  {
      //   x: pageX + parentOffset.x - movedOffsetRef.current.x,
      //   y: pageY + parentOffset.y - movedOffsetRef.current.y,
      // })

      layoutRef.current = { x: pageX, y: pageY, width: width, height: height }
      absolutePos.current = {
        x: pageX + parentOffset.x - movedOffsetRef.current.x,
        y: pageY + parentOffset.y - movedOffsetRef.current.y,
      }
      setDndEventManagerDraggable()
    },
    [parentOffset, setDndEventManagerDraggable],
  )

  const viewWithHandleAndMeasureProps = useMemo(
    () => ({ ...restProps, panHandlers: panHandlers, measureCallback: measureCallback, style: style }),
    [restProps, measureCallback, style, panHandlers],
  )

  // console.log('[drag][props] DragView.tsx', viewWithHandleAndMeasureProps)

  return (
    <DragViewOffsetContext.Provider value={offsetContext}>
      <DragViewWithHandleAndMeasure {...viewWithHandleAndMeasureProps}>{children}</DragViewWithHandleAndMeasure>
    </DragViewOffsetContext.Provider>
  )
}

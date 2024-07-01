import { View, StyleSheet } from 'react-native'
import React, { useRef, useState, PropsWithChildren, useMemo, Ref, ReactNode } from 'react'

import { IDragContext, IDragClone, IPosition, IDragProviderProps, zeroPoint, ILayoutData, zeroLayout } from '../types'
import { DragContext, DragCloneContext } from '../DragContext'
import { DndEventManager } from '../EventManager'
import { DragClone } from './internal/DragClone'

export function DragProvider({ children, mockEventManager, overlapMode, onLayout }: PropsWithChildren<IDragProviderProps>) {
  const eventManager = useRef(mockEventManager ? mockEventManager : new DndEventManager(overlapMode)).current
  // const eventManager = useRef<IDndEventManager>()
  const [clone, setClone] = useState<IDragClone>()
  const [windowOffset, setWindowOffset] = useState<IPosition>(zeroPoint)
  const [windowLayout, setWindowLayout] = useState<ILayoutData>(zeroLayout)

  const setCloneContainer = (nodeRef: Ref<ReactNode>) => {
    console.log('setCloneContainer', nodeRef)
  }

  // useEffect(() => {
  //   eventManager.current = mockEventManager ? mockEventManager : new DndEventManager(overlapMode)
  // }, [])

  const lastCloneIdRef = useRef<number | undefined>()
  /** avoid disable clone when new drag have been started */
  const setCloneState = (c: IDragClone | undefined, dndId?: number) => {
    if (c) {
      // console.log('setCloneState', c)
      lastCloneIdRef.current = c.draggableDndId
      setClone(c)
    } else if (lastCloneIdRef.current == dndId) {
      setClone(undefined)
    } //don't disable if new drag started
  }
  // @ts-ignore
  const context: IDragContext = useMemo(() => {
    return {
      dndEventManager: eventManager,
      setClone: setCloneState,
      windowLayout,
      setCloneContainer,
    }
  }, [eventManager, windowLayout])

  // measure provider offset
  const offsetMeasureView = useRef<View>(null)

  const onLayoutEvent = (layoutChangeEvent: any) => {
    console.log('DragProvider.tsx ', layoutChangeEvent)
    // const {target, layout} = layoutChangeEvent.nativeEvent;
    // target.measure((_x: number, _y: number, _width: number, _height: number, pageX: number, pageY: number) => {
    //   if (pageX != -windowOffset.x || pageY != -windowOffset.y) {
    //     setWindowOffset({ x: -pageX, y: -pageY})
    //     console.log(1111111, { x: pageX, y: pageY, width: _width, height: _height })
    //     setWindowLayout({x: pageX, y: pageY, width: _width, height: _height})
    //   }
    // })
    offsetMeasureView.current &&
      offsetMeasureView.current.measure((_x, _y, _width, _height, pageX, pageY) => {
        if (pageX != -windowOffset.x || pageY != -windowOffset.y) {
          setWindowOffset({ x: -pageX, y: -pageY })
          // console.log(1111111, { x: pageX, y: pageY, width: _width, height: _height })
          setWindowLayout({ x: pageX, y: pageY, width: _width, height: _height })
          onLayout && onLayout({ x: 0, y: 0, pageX: pageX, pageY: pageY, width: _width, height: _height })
        }
      })
  }
  return (
    <DragContext.Provider
      value={context}
      // @ts-ignore
      // value={{
      //   dndEventManager: eventManager.current,
      //   setClone: setCloneState,
      //   windowLayout,
      //   }}
    >
      <View ref={offsetMeasureView} onLayout={onLayoutEvent} testID={'DragContext-Provider'} style={styles.container}>
        {children}
        <DragCloneContext.Provider value={true}>
          <DragClone clone={clone} providerOffset={windowOffset} />
        </DragCloneContext.Provider>
      </View>
    </DragContext.Provider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
})

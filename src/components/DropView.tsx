import { View, MeasureOnSuccessCallback } from 'react-native'
import React, { useRef, useState, useContext, useEffect, useCallback, useMemo } from 'react'

import { IDroppable, IDropViewProps, IPosition, ILayoutData } from '../types'
import { DragContext, DragCloneContext } from '../DragContext'
import { ViewWithLayoutSubscription } from './internal/ViewWithLayoutSubscription'
const empty = {}

export function DropView(props: IDropViewProps) {
  const cloned = useContext(DragCloneContext)
  if (cloned) return <View style={props.style}>{props.children}</View>
  return <DropViewActual {...props} />
}

function DropViewActual({
  slots,
  slotActiveStyle,
  onSlotActive: onSlotActiveProp,
  onSlotDeactivate: onSlotDeactivateProp,
  children,
  payload,
  disabled = false,
  style: styleProp = empty,
  overStyle,
  onDrop: onDropProp,
  onEnter: onEnterProp,
  onExit: onExitProp,
  onOver,
  ...restProps
}: IDropViewProps) {

  // console.log('Droppable DropViewActual')
  // useEffect(() => {
  //   console.log('DropView onOver changed')
  // }, [onOver])
  // useEffect(() => {
  //   console.log('DropView onExitProp changed')
  // }, [onExitProp])
  // useEffect(() => {
  //   console.log('DropView onEnterProp changed')
  // }, [onEnterProp])
  // useEffect(() => {
  //   console.log('DropView onDropProp changed')
  // }, [onDropProp])
  // useEffect(() => {
  //   console.log('DropView overStyle changed')
  // }, [overStyle])
  // useEffect(() => {
  //   console.log('DropView payload changed')
  // }, [payload])
  // useEffect(() => {
  //   console.log('DropView disabled changed')
  // }, [disabled])
  // useEffect(() => {
  //   console.log('DropView children changed')
  // }, [children])
  // useEffect(() => {
  //   console.log('DropView onSlotDeactivateProp changed')
  // }, [onSlotDeactivateProp])
  // useEffect(() => {
  //   console.log('DropView onSlotActiveProp changed')
  // }, [onSlotActiveProp])
  // useEffect(() => {
  //   console.log('DropView slotActiveStyle changed')
  // }, [slotActiveStyle])
  // useEffect(() => {
  //   console.log('DropView slots changed')
  // }, [slots])

  const { dndEventManager } = useContext(DragContext)
  // console.log('dropview dndEventManager', dndEventManager)
  /** id from IDndEventManager */
  const dndId = useRef<number | undefined>(undefined)
  const [style, setStyle] = useState(styleProp)
  const layoutRef = useRef<ILayoutData>({ x: -1, y: -1, width: 0, height: 0 })
  const slotActive = useRef(false)


  const onEnter = useCallback(
    (position: IPosition, payload?: any) => {
      overStyle && setStyle(overStyle)
      onEnterProp && onEnterProp(position, payload)
    },
    [overStyle, onEnterProp],
  )

  const onExit = useCallback(
    (position: IPosition, payload?: any) => {
      const styles = [styleProp]
      if (slotActive.current && slotActiveStyle) {
        styles.push(slotActiveStyle)
      }
      overStyle && setStyle(styles)
      onExitProp && onExitProp(position, payload)
    },
    [styleProp, overStyle, onExitProp],
  )


  const onDrop = useCallback(
    (position: IPosition, payload?: any, triggerNextDroppable?: () => void) => {
      overStyle && setStyle(styleProp)
      onDropProp && onDropProp(position, payload, triggerNextDroppable)
    },
    [styleProp, overStyle, onDropProp],
  )


  const onSlotActive = useCallback(
    (position: IPosition, payload?: any) => {
      slotActive.current = true
      slotActiveStyle && setStyle([styleProp,slotActiveStyle])
      onSlotActiveProp && onSlotActiveProp(position, payload)
    },
    [styleProp, slotActiveStyle, onSlotActiveProp],
  )
  const onSlotDeactivate = useCallback(
    (position: IPosition, payload?: any) => {
      slotActive.current = false;
      styleProp && setStyle(styleProp)
      onSlotDeactivateProp && onSlotDeactivateProp(position, payload)
    },
    [styleProp, onSlotActiveProp],
  )

  const calcDroppable = useCallback<() => IDroppable>(() => {
    // console.log('calcDroppable')
    return {
      id: dndId.current,
      layout: layoutRef.current,
      onDrop: onDrop,
      onEnter: onEnter,
      onExit: onExit,
      onOver: onOver,
      payload: payload,
      // added
      slots: slots,
      onSlotActive: onSlotActive,
      onSlotDeactivate: onSlotDeactivate,
    }
  }, [onOver, onDrop, onEnter, onExit, payload, slots,onSlotActive, onSlotDeactivate])

  useEffect(() => {
    setStyle(styleProp)
  }, [styleProp])

  useEffect(() => {
    // console.log('dndEventManager1', dndEventManager)
    if (!dndEventManager) {
      return
    }
    if (disabled) {
      dndId.current !== undefined && dndEventManager.unregisterDroppable(dndId.current)
      dndId.current = undefined
    } else {
      if (dndId.current === undefined) {
        dndId.current = dndEventManager.registerDroppable(calcDroppable())
      } else {
        dndEventManager.updateDroppable(calcDroppable())
      }
    }
  }, [disabled, calcDroppable, dndEventManager])

  useEffect(() => {
    return () => {
      dndId.current !== undefined && dndEventManager.unregisterDroppable(dndId.current)
    }
  }, [dndEventManager])

  const measureCallback = useCallback<MeasureOnSuccessCallback>(
    (_x, _y, width, height, pageX, pageY) => {
      // console.log('measureCallback in drop', dndEventManager, {_x, _y, width, height, pageX, pageY});
      // console.log('dndEventManager2', dndEventManager)
      if (!dndEventManager) {
        return
      }
      layoutRef.current = { x: pageX, y: pageY, width: width, height: height }
      dndEventManager.updateDroppable(calcDroppable())
    },
    [calcDroppable, dndEventManager],
  )
  const viewWithLayoutSubscriptionProps = useMemo(
    () => ({ ...restProps, measureCallback: measureCallback, style: style }),
    [restProps, measureCallback, style],
  )
  return <ViewWithLayoutSubscription {...viewWithLayoutSubscriptionProps}>{children}</ViewWithLayoutSubscription>
}

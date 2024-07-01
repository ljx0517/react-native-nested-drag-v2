import { ViewStyle, MeasureOnSuccessCallback, GestureResponderHandlers } from 'react-native'
import React, { useState, useMemo, useCallback, useEffect } from 'react'

import { DragHandleContext } from '../../DragContext'
import { IDragHandleContext, ViewWithoutPanHandlersProps } from '../../types'
import { ViewWithLayoutSubscription } from './ViewWithLayoutSubscription'

export interface IDragViewWithHandleAndMeasueProps extends ViewWithoutPanHandlersProps {
  measureCallback: MeasureOnSuccessCallback
  style: ViewStyle
  panHandlers: GestureResponderHandlers
}

export function DragViewWithHandleAndMeasure({ children, style, panHandlers, measureCallback, ...restProps }: IDragViewWithHandleAndMeasueProps) {
  const [handleExists, setHandleExists] = useState(false)

  const ownPanHandlers = useMemo(
    // do not listen gests when there is a handle for it
    () => (handleExists ? {} : panHandlers),
    [handleExists, panHandlers],
  )

  useEffect(() => {
    // console.log('ownPanHandlers', ownPanHandlers)
  }, [ownPanHandlers])

  const setHandle = useCallback(() => {
    setHandleExists(true)
  }, [])

  const enableDraggable = useCallback(() => {
    setHandleExists(false)
  }, [])
  const disableDraggable = useCallback(() => {
    setHandleExists(true)
  }, [])

  /** context for nested elements */
  const handleContext: IDragHandleContext = useMemo(() => {
    return {
      enableDraggable,
      disableDraggable,
      panHandlers: panHandlers,
      setHandleExists: setHandle,
    }
  }, [panHandlers, setHandle])

  const viewWithLayoutSubscriptionProps = useMemo(
    () => ({ ...restProps, ...ownPanHandlers, measureCallback: measureCallback, style: style }),
    [restProps, measureCallback, style, ownPanHandlers],
  )

  // console.log('[Drag][props] DragViewWithHandleAndMeasure.tsx',viewWithLayoutSubscriptionProps)
  return (
    <DragHandleContext.Provider value={handleContext}>
      <ViewWithLayoutSubscription {...viewWithLayoutSubscriptionProps}>{children}</ViewWithLayoutSubscription>
    </DragHandleContext.Provider>
  )
}

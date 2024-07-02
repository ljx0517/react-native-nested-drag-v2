import { Animated, View, MeasureOnSuccessCallback, ViewProps, LayoutChangeEvent } from 'react-native'
import { useRef, useContext, useEffect, useCallback, useMemo } from 'react'

import { DragViewLayoutContext } from '../../DragContext'
import { SimplePubSub } from '../../SimplePubSub'

export interface IViewWithLayoutSubscriptionProps extends ViewProps {
  measureCallback: MeasureOnSuccessCallback
}

/** 'ref' and 'onLayout' props will be overwriten */
export function ViewWithLayoutSubscription({ measureCallback, onLayout: onLayoutProp, ...props }: IViewWithLayoutSubscriptionProps) {
  /** viewRef to measure */
  const viewRef = useRef<View>(null)
  const onLayoutPubSub = useRef(new SimplePubSub())
  // const onLayoutPubSub = useRef<SimplePubSub>()

  const parentOnLayout = useContext(DragViewLayoutContext)

  // useEffect(() => {
  //   onLayoutPubSub.current = new SimplePubSub()
  //   // console.log('ViewWithLayoutSubscription', onLayoutProp, props)
  // }, [])

  const onLayout = useCallback(
    (evt?: LayoutChangeEvent) => {
      // console.log('ViewWithLayoutSubscription onLayout', onLayoutPubSub.current)
      // need re-measure the viewRef to get the correct position
      // so move it to useEffect
      // console.log('viewRef?.current', viewRef?.current)
      if (viewRef?.current) {
        viewRef.current.measure(measureCallback)
      }
      onLayoutPubSub.current.publish()
      onLayoutProp && evt && onLayoutProp(evt)
    },
    [onLayoutPubSub, measureCallback, onLayoutProp],
  )
  // useEffect(() => {
  //   console.log('onLayoutPubSub changed')
  // }, [onLayoutPubSub])
  // useEffect(() => {
  //   console.log('measureCallback changed')
  // }, [measureCallback])
  // useEffect(() => {
  //   console.log('onLayoutProp changed')
  // }, [onLayoutProp])

  useEffect(() => {
    if (viewRef?.current) {
      // console.log('do measureCallback', viewRef?.current)
      viewRef.current.measure(measureCallback)
    }
  }, [measureCallback])

  useEffect(() => {
    parentOnLayout && parentOnLayout.subscribe(onLayout)
    return () => {
      parentOnLayout && parentOnLayout.unsubscribe(onLayout)
    }
  }, [parentOnLayout, onLayout])

  // useEffect(() => {
  //   parentOnLayout &&  parentOnLayout.subscribe(onLayout)
  //   return () => {
  //     parentOnLayout && parentOnLayout.unsubscribe(onLayout)
  //   }
  // }, [parentOnLayout, onLayout])

  const viewProps = useMemo(() => ({ ...props, onLayout: onLayout }), [props, onLayout])
  // console.log('[drag][props] ViewWithLayoutSubscription.tsx', viewProps)
  return (
    <DragViewLayoutContext.Provider value={onLayoutPubSub.current}>
      <Animated.View {...viewProps} ref={viewRef}>
        {props.children}
      </Animated.View>
    </DragViewLayoutContext.Provider>
  )
}

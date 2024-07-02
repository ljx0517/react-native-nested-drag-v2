import { createContext } from 'react'
import { IDragContext, IDragHandleContext, ISimplePubSub, IPosition, zeroPoint, zeroLayout } from './types'
import { DndEventManager } from './EventManager'

//reason to split context: dndEventManager is singleton but parents need to recreate contect and dependencies from dndEventManager trigger.

export const DragContext = createContext<IDragContext>({
  // @ts-ignore
  dndEventManager: new DndEventManager(),
  // dndEventManager: createRef(new DndEventManager()), // new DndEventManager(),
  // dndEventManager: new DndEventManager(),
  setClone: () => undefined,
  windowLayout: zeroLayout,
  // setDragCloneContainer: (node: ReactNode) => undefined,
  // setWindowOffset: () => undefined,
})

export const DragCloneContext = createContext<boolean>(false)

export const DragHandleContext = createContext<IDragHandleContext>({
  setHandleExists: () => undefined,
  enableDraggable: () => undefined,
  disableDraggable: () => undefined,
  panHandlers: {},
})

export const DragViewLayoutContext = createContext<ISimplePubSub | undefined>(undefined)

export const DragViewOffsetContext = createContext<IPosition>(zeroPoint)

import { IDroppable, IDraggable, IPosition, IDndEventManager, OverlapMode, IViewportLayout } from './types'

// const DndEventManagerInstance: DndEventManager | null = null
export class DndEventManager implements IDndEventManager {
  constructor(overlapMode?: OverlapMode) {
    console.log('new DndEventManager', Date.now(), overlapMode)
    // @ts-ignore
    this.uniqueId = Date.now()
    this.overlapMode = overlapMode ? overlapMode : 'last'
    // test make this singleton
    // if (!DndEventManagerInstance) {
    //   DndEventManagerInstance = this
    // }
    // return DndEventManagerInstance
  }
  uniqueId: any
  overlapMode: OverlapMode
  droppables: IDroppable[] = []
  draggables: IDraggable[] = []
  currentDroppables: IDroppable[] = []

  // groupedDroppables: { [key: string]: IDroppable[] } = {default:[]}

  activateSlots = (slots: string[], payload: any) => {
    console.log('activateSlots', slots, payload)
  }

  matchSlot = (draggable: IDraggable, droppable: IDroppable) => {
    if (draggable.slots && droppable.slots) {
      return draggable.slots?.find((dragSlotName) => {
        return droppable.slots?.includes(dragSlotName)
      })
    }
    return true
  }
  getDroppable = (id?: number): IDroppable | undefined => this.droppables.find((d) => d.id === id)

  getDroppableBySlot = (slots?: string[]): IDroppable[] => {
    if (!slots || slots.length == 0) {
      return []
    }
    return this.droppables.filter((d) => {
      if (d.slots && slots) {
        const slotIndex = d.slots.findIndex((dropSlot) => {
          return slots.includes(dropSlot)
        })

        return slotIndex > -1
      }
      return false
    })
  }

  registerDroppable(droppable: IDroppable): number {
    console.log('registerDroppable', droppable)
    const lastDroppable = this.droppables.length ? this.droppables[this.droppables.length - 1] : undefined
    const newId = lastDroppable?.id !== undefined ? lastDroppable.id + 1 : 0
    this.droppables.push({ ...droppable, id: newId })
    return newId
  }

  updateDroppable(droppable: IDroppable): void {
    // console.log('updateDroppable', droppable)
    const actualDroppable = this.getDroppable(droppable.id)
    if (actualDroppable) {
      this.droppables = this.droppables.map((d) => (d.id == droppable.id ? droppable : d))
    } else {
      /*if (__DEV__) {
        console.warn("No such droppable: "+droppable.id+" all: "+JSON.stringify(this.droppables.map(d=>d.id)));
        this.registerDroppable(droppable);
      }*/
    }
  }

  unregisterDroppable(id: number): void {
    this.droppables = this.droppables.filter((d) => id !== d.id)
  }

  getDraggable = (id?: number): IDraggable | undefined => this.draggables.find((d) => d.id === id)

  registerDraggable(draggable: IDraggable): number {
    const lastDraggable = this.draggables.length ? this.draggables[this.draggables.length - 1] : undefined
    const newId = lastDraggable?.id !== undefined ? lastDraggable.id + 1 : 0
    this.draggables.push({ ...draggable, id: newId })
    return newId
  }

  updateDraggable(draggable: IDraggable): void {
    if (this.getDraggable(draggable.id)) {
      this.draggables = this.draggables.map((d) => (d.id == draggable.id ? draggable : d))
    } else {
      /*if (__DEV__) {
        console.warn("No such draggable: "+draggable.id+" all draggables: "+JSON.stringify(this.draggables.map(d=>d.id)));
        this.registerDraggable(draggable);
      }*/
    }
  }

  unregisterDraggable(id: number): void {
    this.draggables = this.draggables.filter((d) => id !== d.id)
  }

  handleDragStart = (draggableId: number, position: IPosition, location: IPosition) => {
    const draggable = this.getDraggable(draggableId)
    const drops = this.getDroppableBySlot(draggable?.slots)
    console.log('handleDragStart', position, drops)
    if (drops.length) {
      drops.forEach((d) => {
        d.onSlotActive && d.onSlotActive(position, draggable?.payload)
      })
    }
    draggable?.onDragStart && draggable.onDragStart(position, location)
  }

  handleDragEnd = (draggableId: number, position: IPosition, pointer: IPosition) => {
    const draggable = this.getDraggable(draggableId)

    if (!draggable) {
      return
    }

    const drops = this.getDroppableBySlot(draggable?.slots)
    if (drops.length) {
      drops.forEach((d) => {
        d.onSlotDeactivate && d.onSlotDeactivate(position, draggable?.payload)
      })
    }

    const currentDroppables = this.sortDroppables(this.getDroppablesInArea(position))
    // console.log('handleDragEnd', this.overlapMode, currentDroppables)
    if (currentDroppables.length > 0) {
      if (this.overlapMode == 'all') {
        currentDroppables.forEach((droppable, index) => {
          const matchSlotName = this.matchSlot(draggable, droppable)
          if (matchSlotName) {
            droppable.onDrop && droppable.onDrop(position, draggable.payload)
            draggable.onDrop && draggable.onDrop(position, pointer, undefined, droppable.payload, index)
          }
        })
      } else {
        this.callDropWithNextParameter(currentDroppables, position, pointer, draggable)
        // draggable.onDrop && draggable.onDrop(position, pointer, undefined, currentDroppables[currentDroppables.length - 1].payload)
      }
    } else {
      // fix: should always call onDragEnd
      // draggable.onDragEnd && draggable.onDragEnd(position)
    }
    draggable.onDragEnd && draggable.onDragEnd(position, pointer)
    // single mode
    this.currentDroppables = []
  }

  handleDragMove = (draggableId: number, position: IPosition, location: IViewportLayout) => {
    const draggable = this.getDraggable(draggableId)
    if (!draggable) {
      return
    }
    console.log('draggable', draggable)
    const currentDroppables = this.getDroppablesInArea(position)

    if (this.overlapMode == 'all') {
      const newDroppables = currentDroppables.filter((x) => !this.currentDroppables.includes(x))
      const leavedDroppables = this.currentDroppables.filter((x) => !currentDroppables.includes(x))
      newDroppables.forEach((d) => {
        d.onEnter && d.onEnter(position, draggable.payload)
        draggable.onEnter && draggable.onEnter(position, d.payload)
      })
      leavedDroppables.forEach((d) => {
        d.onExit && d.onExit(position, draggable.payload)
        draggable.onExit && draggable.onExit(position, d.payload, currentDroppables.length)
      })
      currentDroppables.forEach((d) => {
        d.onOver && d.onOver(position, draggable.payload)
        draggable.onOver && draggable.onOver(position, d.payload)
      })
      if (!currentDroppables.length) {
        // draggable.onDrag && draggable.onDrag(position)
        // console.warn('watch why here 1')
      }
      // always
      draggable.onDrag && draggable.onDrag(position, location)
      // console.log('currentDroppables1', currentDroppables)
      this.currentDroppables = currentDroppables
    } else {
      // single mode
      const currentDroppable = currentDroppables.length ? this.sortDroppables(currentDroppables)[currentDroppables.length - 1] : undefined
      const previousDroppable = this.currentDroppables?.length ? this.currentDroppables[0] : undefined
      // console.log('handleDragMove', currentDroppable, previousDroppable )
      // if (previousDroppable && currentDroppable && previousDroppable.id != currentDroppable.id) {
      if (previousDroppable != currentDroppable) {
        // droppable changed
        if (previousDroppable) {
          previousDroppable.onExit && previousDroppable.onExit(position, draggable.payload)
          draggable.onExit && draggable.onExit(position, previousDroppable.payload)
        }
        if (currentDroppable) {
          // console.log('currentDroppable', currentDroppable.slots)
          // console.log('draggable', draggable.slots)
          const matchSlotName = this.matchSlot(draggable, currentDroppable)
          if (matchSlotName) {
            currentDroppable.onEnter && currentDroppable.onEnter(position, draggable.payload)
            draggable.onEnter && draggable.onEnter(position, currentDroppable.payload)
          }
        }
      }

      if (currentDroppable) {
        // over
        this.callOverWithNextParameter(currentDroppables, position, location, draggable.payload)
        // draggable.onOver && draggable.onOver(position, currentDroppable.payload)
      } else {
        // not over
        // draggable.onDrag && draggable.onDrag(position)
        // console.warn('watch why here 2')
      }
      // always
      draggable.onDrag && draggable.onDrag(position, location)
      // console.log('currentDroppables2', draggable)
      this.currentDroppables = currentDroppable ? [currentDroppable] : []
    }
  }

  getDroppablesInArea = (position: IPosition) => {
    // console.log('getDroppablesInArea', position, this.droppables)
    return this.droppables.filter(
      (droppable) =>
        position.x >= droppable.layout.x &&
        position.y >= droppable.layout.y &&
        position.x <= droppable.layout.x + droppable.layout.width &&
        position.y <= droppable.layout.y + droppable.layout.height,
    )
  }

  sortDroppables = (droppables: IDroppable[]) => {
    const result = droppables.slice() // const result = [...droppables] https://github.com/microsoft/tslib/issues/149
    if (this.overlapMode == 'first') {
      result.reverse()
    } else if (this.overlapMode != 'last' && this.overlapMode != 'all') {
      result.sort(this.overlapMode)
    }
    return result
  }

  callDropWithNextParameter = (droppables: IDroppable[], position: IPosition, pointer: IPosition, draggable: IDraggable) => {
    this._drop(droppables, droppables.length - 1, position, pointer, draggable)
  }

  _drop = (droppables: IDroppable[], index: number, position: IPosition, pointer: IPosition, draggable: IDraggable) => {
    if (droppables.length > index) {
      const droppable = droppables[index]
      const nextDrop =
        index > 0
          ? () => {
              this._drop(droppables, index - 1, position, pointer, draggable)
            }
          : undefined
      const matchSlotName = this.matchSlot(draggable, droppable)
      if (matchSlotName) {
        droppable.onDrop && droppable.onDrop(position, pointer, draggable.payload, nextDrop)
        draggable.onDrop && draggable.onDrop(position, pointer, undefined, droppable.payload)
      } else if (nextDrop) {
        nextDrop()
      }
    }
  }

  callOverWithNextParameter = (droppables: IDroppable[], position: IPosition, layout: IViewportLayout, payload: any) => {
    this._over(droppables, droppables.length - 1, position, layout, payload)
  }

  _over = (droppables: IDroppable[], index: number, position: IPosition, layout: IViewportLayout, payload: any) => {
    if (droppables.length > index) {
      const droppable = droppables[index]
      const nextOver =
        index > 0
          ? () => {
              this._over(droppables, index - 1, position, layout, payload)
            }
          : undefined
      droppable.onOver && droppable.onOver(position, payload, nextOver)
    }
  }
}

import { StyleSheet, Text, View } from 'react-native'
import React, { PropsWithChildren } from 'react'
import { DragView, DragHandleView } from 'react-native-nested-drag-v2'

export function Nested() {
  return (
    <View style={styles.container}>
      <Text>Nested.tsx</Text>
      <Draggable>
        <Draggable>
          <Draggable />
        </Draggable>
        <Draggable />
      </Draggable>
    </View>
  )
}

function Draggable({ children }: PropsWithChildren) {
  return (
    <View style={styles.dragContainer}>
      <DragView style={styles.draggable} dragStyle={styles.draggableDrag} copyDragStyle={styles.draggableClone}>
        <DragHandleView style={styles.handle}>
          <Text>drag gere!</Text>
        </DragHandleView>
        <View style={styles.child}>{children}</View>
      </DragView>
    </View>
  )
}
const styles = StyleSheet.create({
  container: {
    padding: 10,
    width: '100%',
    justifyContent: 'flex-start',
    transform:[
      // {translateX: 100},
      // {translateY: 30},
    ]
  },
  dragContainer: {
    padding: 10,
  },
  draggable: {
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: 'white',
    width: '100%'
  },
  draggableDrag: {
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: '#dfd',
    opacity: 0.2,
  },
  draggableClone: {
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: '#dfd',
  },
  child: {
    paddingLeft: 10,
  },
  handle: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

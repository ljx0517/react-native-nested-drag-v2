import { StyleSheet, Text, View, ViewStyle } from 'react-native'
import React from 'react'

import { DragView, DropView } from 'react-native-nested-drag-v2'

export function Styles() {
  return (
    <>
      <Text>Styles.tsx</Text>
      <DropView
        slots={['a']}
        payload={'1111111'}
        style={styles.drop}
        onSlotActive={() => console.log('slot active')}
        slotActiveStyle={{ borderColor: 'red', borderWidth: 2 }}
        overStyle={styles.dropOver}
      >
        <Text>drop here!</Text>
      </DropView>
      <View style={styles.container} testID={'draggables'}>
        <DragView
          payload={'222222'}
          style={styles.item}
          dragStyle={styles.itemDragStyle}
          overStyle={styles.itemOverStyle}
          copyDragStyle={styles.itemCopyDragStyle}
          copyOverStyle={styles.itemCopyOverStyle}
        >
          <Text>aaa</Text>
        </DragView>
        <DragView
          movable
          payload={'3333333'}
          slots={['a']}
          style={styles.item}
          dragStyle={styles.itemDragStyle}
          overStyle={styles.itemOverStyle}
          copyDragStyle={styles.itemCopyDragStyle}
          copyOverStyle={styles.itemCopyOverStyle}
        />
        <DragView
          movable
          payload={'444444'}
          slots={['b']}
          style={styles.item}
          dragStyle={styles.itemDragStyle}
          overStyle={styles.itemOverStyle}
          copyDragStyle={styles.itemCopyDragStyle}
          copyOverStyle={styles.itemCopyOverStyle}
        />
      </View>
    </>
  )
}

const dropStyle: ViewStyle = {
  marginHorizontal: '5%',
  marginVertical: 10,
  padding: 10,
  width: '90%',
  height: 100,
  alignItems: 'center',
  justifyContent: 'space-between',
}
const dragStyle: ViewStyle = {
  width: 100,
  height: 100,
  borderWidth: 1,
  borderRadius: 50,
}

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  drop: {
    ...dropStyle,
    backgroundColor: '#ddd',
  },
  dropOver: {
    ...dropStyle,
    backgroundColor: '#dfd',
  },
  item: {
    ...dragStyle,
  },
  itemDragStyle: {
    ...dragStyle,
    backgroundColor: '#cfd',
  },
  itemOverStyle: {
    ...dragStyle,
    backgroundColor: '#6f6',
  },
  itemCopyDragStyle: {
    ...dragStyle,
    backgroundColor: '#c6d',
  },
  itemCopyOverStyle: {
    ...dragStyle,
    backgroundColor: '#6fd',
  },
})

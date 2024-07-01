import { ISimplePubSub } from './types'

export class SimplePubSub implements ISimplePubSub {
  constructor() {
    // console.log('new SimplePubSub', Date.now())
  }
  handlers: (() => void)[] = []

  subscribe(onLayout: () => void) {
    this.handlers.push(onLayout)
  }

  unsubscribe(onLayout: () => void) {
    this.handlers = this.handlers.filter((h) => h !== onLayout)
  }

  publish() {
    this.handlers.forEach((h) => h())
  }
}

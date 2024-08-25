const TRANSITION: Transition = {
  type: "DISSOLVE",
  easing: { type: "EASE_OUT" },
  duration: 0.2
}

export default async function() {
  const selection = figma.currentPage.selection
  let frames: FrameNode[] = []

  if (selection.length > 0) frames = getFrames(selection)
  else figma.closePlugin('Please select a few frames to create a slideshow')

  try {
    if (frames.length > 0) {
      if (frames.length > 1) {
        frames.sort((a, b) => a.y === b.y ? a.x - b.x : a.y - b.y)
        await addSlideshowInteractions(frames)
      }
      setFlowStartingPointIfNotSet(frames[0])
      figma.closePlugin('Slideshow created  🎉')
    } else {
      figma.closePlugin('Please select a few frames to create a slideshow')
    }
  }
  catch (e) {
    figma.closePlugin('An error occurred: ' + e)
  }
}

function getFrames(nodes: readonly SceneNode[]): FrameNode[] {
  return nodes.filter((node) => node.type === 'FRAME') as FrameNode[]
}

function createMatrix(frames: FrameNode[]): FrameNode[][] {
  // sort frames from left to right, then top to bottom
  const matrix: FrameNode[][] = []
  frames = frames.sort((a, b) => a.y === b.y ? a.x - b.x : a.y - b.y )
  let yIndices = removeDuplicates(frames.map(frame => frame.y)).sort((a, b) => a - b)
  let xIndices = removeDuplicates(frames.map(frame => frame.x)).sort((a, b) => a - b)
  console.log(xIndices)
  console.log(yIndices)
  for (let y of yIndices) {
    const row = new Array(xIndices.length).fill(undefined)
    for (let frame of frames) {
      if (frame.y === y) {
        row[xIndices.indexOf(frame.x)] = frame
      }
    }
    matrix.push(row)
  }
  return matrix
}

function removeDuplicates<T>(array: Array<T>): Array<T> {
  return array.filter((value, index) => array.indexOf(value) === index)
}

async function addSlideshowInteractions(frames: FrameNode[]) {
  for (let i = 0; i < frames.length; i++) {
    const reactions: Reaction[] = clone(frames[i].reactions)
    if (i === 0) {
      reactions.push(...createNextReaction(frames[i + 1]))
    } else if (i === frames.length - 1) {
      reactions.push(...createPrevReaction(frames[i - 1]))
    } else {
      reactions.push(...createNextReaction(frames[i + 1]))
      reactions.push(...createPrevReaction(frames[i - 1]))
    }
    await frames[i].setReactionsAsync(reactions)
  }
}

function setFlowStartingPointIfNotSet(frame: FrameNode) {
  let isFlowStartingPointSet = figma.currentPage.flowStartingPoints.filter((flow) => (flow.nodeId === frame.id)).length > 0
  if (!isFlowStartingPointSet) {
    let flows: { nodeId: string, name: string }[] = clone(figma.currentPage.flowStartingPoints)
    flows.push(
      {
        nodeId: frame.id,
        name: 'Slideshow ' + (flows.length + 1)
      }
    );
    figma.currentPage.flowStartingPoints = flows;
  }
}
 
function createNextReaction(target: FrameNode): Reaction[] {
  const action: Action = {
    type: "NODE",
    destinationId: target.id,
    navigation: "NAVIGATE",
    transition: TRANSITION,
    preserveScrollPosition: false
  }
  return [
    {
      actions: [action],
      trigger: {
        type: "ON_KEY_DOWN",
        device: "KEYBOARD",
        keyCodes: [39],
      }
    }
  ]
}

function createPrevReaction(target: FrameNode): Reaction[] {
  const action: Action = {
    type: "NODE",
    destinationId: target.id,
    navigation: "NAVIGATE",
    transition: TRANSITION,
    preserveScrollPosition: false,
  }
  return [
    {
      actions: [action],
      trigger: {
        type: "ON_KEY_DOWN",
        device: "KEYBOARD",
        keyCodes: [37],
      }
    }
  ]
}

function clone(val: any): any {
  const type = typeof val
  if (val === null) {
    return null
  } else if (type === 'undefined' || type === 'number' ||
    type === 'string' || type === 'boolean') {
    return val
  } else if (type === 'object') {
    if (val instanceof Array) {
      return val.map(x => clone(x))
    } else if (val instanceof Uint8Array) {
      return new Uint8Array(val)
    } else {
      let o = {}
      for (const key in val) {
        o[key] = clone(val[key])
      }
      return o
    }
  }
  throw 'unknown'
}
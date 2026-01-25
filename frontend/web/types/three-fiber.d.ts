/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from 'three';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      points: any;
      bufferGeometry: any;
      bufferAttribute: any;
      pointsMaterial: any;
      ambientLight: any;
      directionalLight: any;
      mesh: any;
      group: any;
    }
  }
}

export {};
